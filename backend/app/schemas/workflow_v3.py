from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AuditEventOut(BaseModel):
    audit_event_id: UUID
    actor_id: UUID | None
    event_type: str
    target_type: str
    target_id: UUID | None
    payload: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class IntegrationConnectionIn(BaseModel):
    provider: str
    name: str
    status: str = "Active"
    config_json: dict[str, Any] = Field(default_factory=dict)
    secret: str | None = None


class IntegrationConnectionOut(BaseModel):
    connection_id: UUID
    provider: str
    name: str
    status: str
    created_by: UUID
    created_at: datetime
    config_json: dict[str, Any]
    secret_status: str | None = None

    model_config = {"from_attributes": True}


class SourceReferenceOut(BaseModel):
    source_reference_id: UUID
    provider: str
    locator: str
    content_hash: str
    metadata_json: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ExportEventOut(BaseModel):
    export_id: UUID
    run_id: UUID
    target_type: str
    target_reference: str | None
    exported_by: UUID
    created_at: datetime
    status: str

    model_config = {"from_attributes": True}


class PublishRequest(BaseModel):
    target_type: str
    target_reference: str | None = None
    mode: str = "draft"


class WorkflowPackIn(BaseModel):
    name: str
    source_url: str | None = None
    license: str = "Internal"
    status: str = "Draft"
    manifest_json: dict[str, Any] = Field(default_factory=dict)


class WorkflowPackOut(BaseModel):
    pack_id: UUID
    name: str
    source_url: str | None
    license: str
    imported_by: UUID
    created_at: datetime
    status: str
    manifest_json: dict[str, Any]

    model_config = {"from_attributes": True}


class ModelProviderIn(BaseModel):
    name: str
    provider_type: str
    model_name: str
    status: str = "Active"
    config_json: dict[str, Any] = Field(default_factory=dict)
    credentials: str | None = None


class ModelProviderOut(BaseModel):
    provider_id: UUID
    name: str
    provider_type: str
    model_name: str
    status: str
    config_json: dict[str, Any]
    credential_status: str | None = None
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ModelProviderTestOut(BaseModel):
    provider_id: UUID
    status: str
    message: str
    sample_output: str | None = None


class RetentionPolicyIn(BaseModel):
    name: str
    applies_to: str = "runs"
    retention_days: int = 365
    redact_sensitive_inputs: bool = True
    private_source_storage: str = "reference_only"


class RetentionPolicyOut(RetentionPolicyIn):
    retention_policy_id: UUID
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class EnterpriseAuthConfigIn(BaseModel):
    provider_type: str = "oidc"
    name: str
    issuer_url: str | None = None
    client_id: str | None = None
    client_secret: str | None = None
    status: str = "Draft"


class EnterpriseAuthConfigOut(BaseModel):
    auth_config_id: UUID
    provider_type: str
    name: str
    issuer_url: str | None
    client_id: str | None
    secret_status: str | None = None
    status: str
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class RunComparisonOut(BaseModel):
    left_run_id: UUID
    right_run_id: UUID
    left_output: str
    right_output: str
    diff_lines: list[str]
