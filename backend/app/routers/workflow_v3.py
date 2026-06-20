import csv
import difflib
import io
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.workflow_v2 import Run
from app.models.workflow_v3 import (
    AuditEvent,
    EnterpriseAuthConfig,
    ExportEvent,
    IntegrationConnection,
    ModelProvider,
    RetentionPolicy,
    SourceReference,
    WorkflowPack,
)
from app.schemas.workflow_v3 import (
    AuditEventOut,
    EnterpriseAuthConfigIn,
    EnterpriseAuthConfigOut,
    ExportEventOut,
    IntegrationConnectionIn,
    IntegrationConnectionOut,
    ModelProviderIn,
    ModelProviderOut,
    ModelProviderTestOut,
    PublishRequest,
    RetentionPolicyIn,
    RetentionPolicyOut,
    RunComparisonOut,
    SourceReferenceOut,
    WorkflowPackIn,
    WorkflowPackOut,
)
from app.services.audit_service import export_audit_events_csv, record_audit_event
from app.services.model_gateway import run_configured_provider
from app.services.secret_store import encrypt_secret, mask_secret

router = APIRouter(prefix="/api/v1", tags=["workflows-v3"])


@router.post("/integrations", response_model=IntegrationConnectionOut, status_code=status.HTTP_201_CREATED)
def create_integration_connection(
    body: IntegrationConnectionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("approver")),
):
    connection = IntegrationConnection(
        provider=body.provider,
        name=body.name,
        status=body.status,
        created_by=current_user.user_id,
        config_json=body.config_json,
        encrypted_secret=encrypt_secret(body.secret),
    )
    db.add(connection)
    db.flush()
    record_audit_event(
        db,
        event_type="integration.connection_changed",
        target_type="integration_connection",
        target_id=connection.connection_id,
        actor_id=current_user.user_id,
        payload={"provider": body.provider, "status": body.status},
    )
    db.commit()
    db.refresh(connection)
    return _connection_out(connection)


@router.get("/integration-connections", response_model=list[IntegrationConnectionOut])
def list_integration_connections(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    return [_connection_out(item) for item in db.query(IntegrationConnection).order_by(IntegrationConnection.created_at.desc()).all()]


@router.get("/source-references", response_model=list[SourceReferenceOut])
def list_source_references(db: Session = Depends(get_db), _: User = Depends(require_role("reviewer", "approver"))):
    return db.query(SourceReference).order_by(SourceReference.created_at.desc()).limit(200).all()


@router.get("/export-events", response_model=list[ExportEventOut])
def list_export_events(db: Session = Depends(get_db), _: User = Depends(require_role("reviewer", "approver"))):
    return db.query(ExportEvent).order_by(ExportEvent.created_at.desc()).limit(200).all()


@router.post("/runs/{run_id}/publish", response_model=ExportEventOut, status_code=status.HTTP_201_CREATED)
def publish_run(
    run_id: UUID,
    body: PublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author", "reviewer", "approver")),
):
    run = db.query(Run).filter(Run.run_id == run_id).first()
    if not run or not run.output_text:
        raise HTTPException(status_code=404, detail="Runnable output not found")

    status_value = "Drafted"
    target_reference = body.target_reference
    if body.target_type == "github_pr_comment" and body.target_reference:
        target_reference = _publish_github_pr_comment(body.target_reference, run.output_text)
        status_value = "Published"
    elif body.mode == "publish":
        status_value = "PendingWriteBack"

    event = ExportEvent(
        run_id=run_id,
        target_type=body.target_type,
        target_reference=target_reference,
        exported_by=current_user.user_id,
        status=status_value,
    )
    db.add(event)
    db.flush()
    record_audit_event(
        db,
        event_type="output.published",
        target_type="run",
        target_id=run_id,
        actor_id=current_user.user_id,
        payload={"target_type": body.target_type, "status": status_value},
    )
    db.commit()
    db.refresh(event)
    return event


@router.get("/runs/compare/{left_run_id}/{right_run_id}", response_model=RunComparisonOut)
def compare_runs(
    left_run_id: UUID,
    right_run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    left = db.query(Run).filter(Run.run_id == left_run_id).first()
    right = db.query(Run).filter(Run.run_id == right_run_id).first()
    if not left or not right:
        raise HTTPException(status_code=404, detail="Run not found")
    roles = set(current_user.roles.split(","))
    if not roles.intersection({"reviewer", "approver"}) and (left.run_by != current_user.user_id or right.run_by != current_user.user_id):
        raise HTTPException(status_code=403, detail="You can only compare your own runs")
    left_output = left.output_text or left.blocked_reason or ""
    right_output = right.output_text or right.blocked_reason or ""
    diff = list(difflib.unified_diff(
        left_output.splitlines(),
        right_output.splitlines(),
        fromfile=str(left_run_id),
        tofile=str(right_run_id),
        lineterm="",
    ))
    return RunComparisonOut(
        left_run_id=left_run_id,
        right_run_id=right_run_id,
        left_output=left_output,
        right_output=right_output,
        diff_lines=diff,
    )


@router.get("/workflow-packs", response_model=list[WorkflowPackOut])
def list_workflow_packs(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(WorkflowPack).order_by(WorkflowPack.created_at.desc()).all()


@router.post("/workflow-packs", response_model=WorkflowPackOut, status_code=status.HTTP_201_CREATED)
def create_workflow_pack(
    body: WorkflowPackIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author", "reviewer", "approver")),
):
    pack = WorkflowPack(
        name=body.name,
        source_url=body.source_url,
        license=body.license,
        imported_by=current_user.user_id,
        status=body.status,
        manifest_json=body.manifest_json,
    )
    db.add(pack)
    db.flush()
    record_audit_event(
        db,
        event_type="workflow_pack.created",
        target_type="workflow_pack",
        target_id=pack.pack_id,
        actor_id=current_user.user_id,
        payload={"source_url": body.source_url, "license": body.license},
    )
    db.commit()
    db.refresh(pack)
    return pack


@router.post("/workflow-packs/import", response_model=WorkflowPackOut, status_code=status.HTTP_201_CREATED)
def import_workflow_pack(
    body: WorkflowPackIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("approver")),
):
    manifest = {
        **body.manifest_json,
        "import_policy": "Admin review required before activation",
        "source_provenance": body.source_url,
        "license": body.license,
    }
    pack = WorkflowPack(
        name=body.name,
        source_url=body.source_url,
        license=body.license,
        imported_by=current_user.user_id,
        status="Draft",
        manifest_json=manifest,
    )
    db.add(pack)
    db.flush()
    record_audit_event(
        db,
        event_type="workflow_pack.imported",
        target_type="workflow_pack",
        target_id=pack.pack_id,
        actor_id=current_user.user_id,
        payload={"source_url": body.source_url, "license": body.license},
    )
    db.commit()
    db.refresh(pack)
    return pack


@router.get("/model-providers", response_model=list[ModelProviderOut])
def list_model_providers(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    return [_provider_out(item) for item in db.query(ModelProvider).order_by(ModelProvider.created_at.desc()).all()]


@router.post("/model-providers", response_model=ModelProviderOut, status_code=status.HTTP_201_CREATED)
def create_model_provider(
    body: ModelProviderIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("approver")),
):
    provider = ModelProvider(
        name=body.name,
        provider_type=body.provider_type,
        model_name=body.model_name,
        status=body.status,
        config_json=body.config_json,
        encrypted_credentials=encrypt_secret(body.credentials),
        created_by=current_user.user_id,
    )
    db.add(provider)
    db.flush()
    record_audit_event(
        db,
        event_type="model_provider.changed",
        target_type="model_provider",
        target_id=provider.provider_id,
        actor_id=current_user.user_id,
        payload={"provider_type": body.provider_type, "model_name": body.model_name, "status": body.status},
    )
    db.commit()
    db.refresh(provider)
    return _provider_out(provider)


@router.post("/model-providers/{provider_id}/test", response_model=ModelProviderTestOut)
def test_model_provider(provider_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    provider = db.query(ModelProvider).filter(ModelProvider.provider_id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")
    if provider.status != "Active":
        return ModelProviderTestOut(provider_id=provider_id, status="Draft", message="Provider is saved but not active.")
    return ModelProviderTestOut(
        provider_id=provider_id,
        status="Ready",
        message="Provider is configured and will be selected by the model gateway when its model matches a workflow.",
        sample_output=None,
    )


@router.get("/audit-events", response_model=list[AuditEventOut])
def list_audit_events(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    return db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(500).all()


@router.get("/audit-events/export", response_class=PlainTextResponse)
def export_audit_events(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    return PlainTextResponse(
        content=export_audit_events_csv(db),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_events.csv"},
    )


@router.get("/security/retention-policies", response_model=list[RetentionPolicyOut])
def list_retention_policies(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    return db.query(RetentionPolicy).order_by(RetentionPolicy.created_at.desc()).all()


@router.post("/security/retention-policies", response_model=RetentionPolicyOut, status_code=status.HTTP_201_CREATED)
def create_retention_policy(
    body: RetentionPolicyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("approver")),
):
    policy = RetentionPolicy(**body.model_dump(), created_by=current_user.user_id)
    db.add(policy)
    db.flush()
    record_audit_event(
        db,
        event_type="retention_policy.changed",
        target_type="retention_policy",
        target_id=policy.retention_policy_id,
        actor_id=current_user.user_id,
    )
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/security/auth-configs", response_model=list[EnterpriseAuthConfigOut])
def list_auth_configs(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    return [_auth_config_out(item) for item in db.query(EnterpriseAuthConfig).order_by(EnterpriseAuthConfig.created_at.desc()).all()]


@router.post("/security/auth-configs", response_model=EnterpriseAuthConfigOut, status_code=status.HTTP_201_CREATED)
def create_auth_config(
    body: EnterpriseAuthConfigIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("approver")),
):
    config = EnterpriseAuthConfig(
        provider_type=body.provider_type,
        name=body.name,
        issuer_url=body.issuer_url,
        client_id=body.client_id,
        encrypted_client_secret=encrypt_secret(body.client_secret),
        status=body.status,
        created_by=current_user.user_id,
    )
    db.add(config)
    db.flush()
    record_audit_event(
        db,
        event_type="enterprise_auth.changed",
        target_type="enterprise_auth_config",
        target_id=config.auth_config_id,
        actor_id=current_user.user_id,
        payload={"provider_type": body.provider_type, "status": body.status},
    )
    db.commit()
    db.refresh(config)
    return _auth_config_out(config)


def _connection_out(connection: IntegrationConnection) -> dict:
    return {
        "connection_id": connection.connection_id,
        "provider": connection.provider,
        "name": connection.name,
        "status": connection.status,
        "created_by": connection.created_by,
        "created_at": connection.created_at,
        "config_json": connection.config_json,
        "secret_status": mask_secret(connection.encrypted_secret),
    }


def _provider_out(provider: ModelProvider) -> dict:
    return {
        "provider_id": provider.provider_id,
        "name": provider.name,
        "provider_type": provider.provider_type,
        "model_name": provider.model_name,
        "status": provider.status,
        "config_json": provider.config_json,
        "credential_status": mask_secret(provider.encrypted_credentials),
        "created_by": provider.created_by,
        "created_at": provider.created_at,
    }


def _auth_config_out(config: EnterpriseAuthConfig) -> dict:
    return {
        "auth_config_id": config.auth_config_id,
        "provider_type": config.provider_type,
        "name": config.name,
        "issuer_url": config.issuer_url,
        "client_id": config.client_id,
        "secret_status": mask_secret(config.encrypted_client_secret),
        "status": config.status,
        "created_by": config.created_by,
        "created_at": config.created_at,
    }


def _publish_github_pr_comment(locator: str, content: str) -> str:
    if not settings.github_token:
        return f"{locator} (draft only: GITHUB_TOKEN not configured)"
    parsed = urlparse(locator)
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if parsed.netloc not in {"github.com", "www.github.com"} or len(parts) < 4 or parts[2] != "pull":
        raise HTTPException(status_code=400, detail="target_reference must be a GitHub pull request URL")
    owner, repo, number = parts[0], parts[1], parts[3]
    with httpx.Client(timeout=20.0) as client:
        response = client.post(
            f"https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments",
            headers={
                "Authorization": f"Bearer {settings.github_token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "PromptHub/3.0",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"body": content},
        )
        response.raise_for_status()
        data = response.json()
    return str(data.get("html_url") or locator)
