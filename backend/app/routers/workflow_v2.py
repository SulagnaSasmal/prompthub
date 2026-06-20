import hashlib
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.prompt import Prompt
from app.models.test_case import TestCase
from app.models.user import User
from app.models.version import Version
from app.models.workflow_v3 import ExportEvent, ModelProvider, SourceReference
from app.models.workflow_v2 import Comment, Example, Run, RunRating, StyleProfile, StyleRule, Variable
from app.schemas.test_case import TestCaseOut
from app.schemas.workflow_v2 import (
    CommentIn,
    CommentOut,
    DeploymentSummaryOut,
    ExampleIn,
    ExampleOut,
    FieldQualityOut,
    IntegrationCapabilityOut,
    IntegrationFetchOut,
    IntegrationFetchRequest,
    PromoteRequest,
    RatingIn,
    ReviewQueueItemOut,
    RunExportOut,
    RatingOut,
    RunOut,
    RunRequest,
    StyleCheckOut,
    StyleCheckRequest,
    StyleFlag,
    StyleProfileIn,
    StyleProfileOut,
    VariableIn,
    VariableOut,
)
from app.services.audit_service import record_audit_event
from app.services.model_gateway import governance_block_reason, referenced_variables, run_configured_provider

router = APIRouter(prefix="/api/v1", tags=["workflows-v2"])

VALID_VAR_TYPES = {"text", "long-text", "select", "source-reference"}
RATING_TAGS = {"Useful", "Inaccurate", "Too verbose", "Wrong tone", "Missing details", "Hallucinated content"}
RISK_RATING_TAGS = {"Inaccurate", "Hallucinated content"}

INTEGRATION_CAPABILITIES = [
    IntegrationCapabilityOut(
        source="markdown",
        status="Working",
        capabilities=["Paste Markdown or plain text", "Use pasted content as runner source", "Export output as Markdown"],
        guidance="Paste .md, .txt, JSON, YAML, or copied documentation into the source box.",
    ),
    IntegrationCapabilityOut(
        source="github",
        status="Working for public GitHub URLs",
        capabilities=["Fetch issue text", "Fetch pull request summary and changed files", "Fetch commit metadata", "Fetch raw files"],
        guidance="Use public GitHub issue, pull request, commit, or raw file URLs. Set GITHUB_TOKEN for private repositories.",
    ),
    IntegrationCapabilityOut(
        source="jira",
        status="Simulated until Jira credentials are configured",
        capabilities=["Accept Jira key or filter locator", "Normalize content as read-only source data"],
        guidance="Paste Jira issue text today; connect Jira credentials before using private Jira fetch.",
    ),
    IntegrationCapabilityOut(
        source="openapi",
        status="Working for pasted specs",
        capabilities=["Paste OpenAPI JSON or YAML", "Use content in API summary workflows"],
        guidance="Paste a spec or diff into the source box; URL/repo pulls are a later step.",
    ),
]


def _get_version(db: Session, version_id: UUID) -> Version:
    version = (
        db.query(Version)
        .options(selectinload(Version.prompt), selectinload(Version.variables), selectinload(Version.examples))
        .filter(Version.version_id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


def _validate_variable_contract(version: Version, incoming: list[VariableIn] | None = None) -> None:
    declared = {v.name for v in version.variables}
    if incoming is not None:
        declared = {v.name for v in incoming}
    referenced = referenced_variables(version.prompt_text)
    undeclared = sorted(referenced - declared)
    unused = sorted(declared - referenced)
    if undeclared or unused:
        detail: dict[str, list[str]] = {}
        if undeclared:
            detail["undeclared_variables"] = undeclared
        if unused:
            detail["unused_variables"] = unused
        raise HTTPException(status_code=400, detail=detail)


def _style_flags(profile: StyleProfile, text: str) -> list[StyleFlag]:
    flags: list[StyleFlag] = []
    lower_text = text.lower()
    for rule in profile.rules:
        pattern = rule.pattern
        start = lower_text.find(pattern.lower())
        while start >= 0:
            end = start + len(pattern)
            flags.append(
                StyleFlag(
                    rule_id=rule.rule_id,
                    rule_type=rule.rule_type,
                    pattern=pattern,
                    message=rule.message,
                    severity=rule.severity,
                    start=start,
                    end=end,
                    matched_text=text[start:end],
                )
            )
            start = lower_text.find(pattern.lower(), end)
    return flags


def _github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "PromptHub/3.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


def _github_api_get(path: str) -> dict:
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        response = client.get(f"https://api.github.com{path}", headers=_github_headers())
        response.raise_for_status()
        return response.json()


def _fetch_github_content(locator: str) -> tuple[str, str]:
    parsed = urlparse(locator)
    if parsed.netloc == "raw.githubusercontent.com":
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            response = client.get(locator, headers={"User-Agent": "PromptHub/3.0"})
            response.raise_for_status()
            return locator, response.text

    if parsed.netloc not in {"github.com", "www.github.com"}:
        raise HTTPException(status_code=400, detail="GitHub locator must be a github.com or raw.githubusercontent.com URL")

    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="GitHub URL must include owner and repository")

    owner, repo = parts[0], parts[1]
    reference = f"https://github.com/{owner}/{repo}"

    if len(parts) >= 4 and parts[2] in {"issues", "pull"}:
        number = parts[3]
        if parts[2] == "issues":
            issue = _github_api_get(f"/repos/{owner}/{repo}/issues/{number}")
            content = (
                f"GitHub issue {owner}/{repo}#{number}\n"
                f"Title: {issue.get('title', '')}\n"
                f"State: {issue.get('state', '')}\n"
                f"Labels: {', '.join(label.get('name', '') for label in issue.get('labels', []))}\n\n"
                f"{issue.get('body') or ''}"
            )
            return f"{reference}/issues/{number}", content

        pull = _github_api_get(f"/repos/{owner}/{repo}/pulls/{number}")
        files = _github_api_get(f"/repos/{owner}/{repo}/pulls/{number}/files")
        changed = "\n".join(
            f"- {file.get('filename')} ({file.get('status')}, +{file.get('additions')}/-{file.get('deletions')})"
            for file in files[:50]
        )
        content = (
            f"GitHub pull request {owner}/{repo}#{number}\n"
            f"Title: {pull.get('title', '')}\n"
            f"State: {pull.get('state', '')}\n"
            f"Base: {pull.get('base', {}).get('ref', '')}\n"
            f"Head: {pull.get('head', {}).get('ref', '')}\n\n"
            f"{pull.get('body') or ''}\n\nChanged files:\n{changed}"
        )
        return f"{reference}/pull/{number}", content

    if len(parts) >= 4 and parts[2] == "commit":
        sha = parts[3]
        commit = _github_api_get(f"/repos/{owner}/{repo}/commits/{sha}")
        files = commit.get("files", [])
        changed = "\n".join(
            f"- {file.get('filename')} ({file.get('status')}, +{file.get('additions')}/-{file.get('deletions')})"
            for file in files[:50]
        )
        content = (
            f"GitHub commit {owner}/{repo}@{sha}\n"
            f"Message: {commit.get('commit', {}).get('message', '')}\n\n"
            f"Changed files:\n{changed}"
        )
        return f"{reference}/commit/{sha}", content

    if len(parts) >= 5 and parts[2] == "blob":
        branch = parts[3]
        file_path = "/".join(parts[4:])
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            response = client.get(raw_url, headers={"User-Agent": "PromptHub/3.0"})
            response.raise_for_status()
            return f"{reference}/blob/{branch}/{file_path}", response.text

    repo_data = _github_api_get(f"/repos/{owner}/{repo}")
    content = (
        f"GitHub repository {owner}/{repo}\n"
        f"Description: {repo_data.get('description') or ''}\n"
        f"Default branch: {repo_data.get('default_branch') or ''}\n"
        f"Stars: {repo_data.get('stargazers_count', 0)}\n"
        f"Open issues: {repo_data.get('open_issues_count', 0)}"
    )
    return reference, content


def _review_requirements(version: Version) -> tuple[str, list[str], str]:
    missing: list[str] = []
    required_tests = 5 if version.prompt.risk_level == "High" else 3
    if version.status == "In Review":
        section = "Needs Review"
        action = "Advance to testing or return to draft"
    elif version.status == "Testing":
        section = "Needs Tests"
        action = "Complete tests and evaluations"
    elif version.status == "Approved":
        section = "Ready for Approval"
        action = "Promote to Production"
    else:
        section = "Needs Review"
        action = "Open workflow"

    if not version.variables:
        missing.append("Template variables")
    if not version.examples:
        missing.append("Good output example")
        section = "Needs Examples"
    if len(version.test_cases) < required_tests:
        missing.append(f"{required_tests} test cases")
        if version.status == "Testing":
            section = "Needs Tests"
    if any(test.result in {"Fail", "Not Run"} for test in version.test_cases):
        missing.append("Passing test results")
        if version.status == "Testing":
            section = "Needs Tests"
    if len(version.evaluations) < 3:
        missing.append("3 evaluation runs")
        if version.status == "Testing":
            section = "Low Formal Score"
    elif sum(float(e.overall_score) for e in version.evaluations) / len(version.evaluations) < 85:
        missing.append("Formal quality threshold")
        section = "Low Formal Score"
    if any(check.result == "Fail" for check in version.governance_checks):
        missing.append("Failed governance check")
        section = "Failed Governance"
    if version.prompt.risk_level == "High":
        section = "High-Risk Escalated" if missing else section

    return section, missing, action


@router.get("/versions/{version_id}/variables", response_model=list[VariableOut])
def list_variables(version_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Variable).filter(Variable.version_id == version_id).order_by(Variable.name).all()


@router.post("/versions/{version_id}/variables", response_model=list[VariableOut], status_code=status.HTTP_201_CREATED)
def define_variables(
    version_id: UUID,
    body: list[VariableIn],
    db: Session = Depends(get_db),
    _: User = Depends(require_role("author", "reviewer", "approver")),
):
    version = _get_version(db, version_id)
    for variable in body:
        if variable.var_type not in VALID_VAR_TYPES:
            raise HTTPException(status_code=400, detail=f"var_type must be one of {sorted(VALID_VAR_TYPES)}")
    _validate_variable_contract(version, body)
    db.query(Variable).filter(Variable.version_id == version_id).delete()
    created = [Variable(version_id=version_id, **variable.model_dump()) for variable in body]
    db.add_all(created)
    record_audit_event(db, event_type="variables.changed", target_type="version", target_id=version_id, actor_id=_.user_id)
    db.commit()
    return db.query(Variable).filter(Variable.version_id == version_id).order_by(Variable.name).all()


@router.get("/versions/{version_id}/examples", response_model=list[ExampleOut])
def list_examples(version_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Example).filter(Example.version_id == version_id).all()


@router.post("/versions/{version_id}/examples", response_model=ExampleOut, status_code=status.HTTP_201_CREATED)
def create_example(
    version_id: UUID,
    body: ExampleIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("author", "reviewer", "approver")),
):
    _get_version(db, version_id)
    example = Example(version_id=version_id, **body.model_dump())
    db.add(example)
    record_audit_event(db, event_type="examples.changed", target_type="version", target_id=version_id, actor_id=_.user_id)
    db.commit()
    db.refresh(example)
    return example


@router.post("/versions/{version_id}/run", response_model=RunOut)
def run_version(
    version_id: UUID,
    body: RunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = _get_version(db, version_id)
    roles = set(current_user.roles.split(","))
    if version.status not in {"Approved", "Production"} and roles == {"consumer"}:
        raise HTTPException(status_code=403, detail="Consumers can only run Approved or Production versions")
    if not version.variables:
        raise HTTPException(status_code=400, detail="This workflow has no declared template variables yet")
    missing = [v.label for v in version.variables if v.required and not str(body.input_payload.get(v.name, "")).strip()]
    if missing:
        raise HTTPException(status_code=400, detail=f"Required variable(s) missing: {', '.join(missing)}")

    source_text = "\n".join(str(v) for v in body.input_payload.values())
    block_reason = governance_block_reason(source_text)
    style_profile = version.prompt.style_profile if body.apply_style_profile else None
    output_text = None
    latency_ms = 0
    result = "Blocked" if block_reason else "Pass"
    if not block_reason:
        provider = (
            db.query(ModelProvider)
            .filter(
                ModelProvider.status == "Active",
                ModelProvider.model_name == version.prompt.target_model,
            )
            .order_by(ModelProvider.created_at.desc())
            .first()
        )
        if not provider:
            provider = db.query(ModelProvider).filter(ModelProvider.status == "Active").order_by(ModelProvider.created_at.desc()).first()
        output_text, latency_ms = run_configured_provider(version, body.input_payload, style_profile, provider)
        block_reason = governance_block_reason(output_text)
        if block_reason:
            output_text = None
            result = "Blocked"

    run = Run(
        version_id=version_id,
        run_by=current_user.user_id,
        input_payload=body.input_payload,
        output_text=output_text,
        model=version.prompt.target_model,
        latency_ms=latency_ms,
        style_profile_applied=style_profile.style_profile_id if style_profile else None,
        governance_result=result,
        blocked_reason=block_reason,
    )
    version.prompt.run_count = int(version.prompt.run_count or 0) + 1
    db.add(run)
    db.flush()
    record_audit_event(
        db,
        event_type="run.executed",
        target_type="run",
        target_id=run.run_id,
        actor_id=current_user.user_id,
        payload={"version_id": str(version_id), "governance_result": result},
    )
    db.commit()
    db.refresh(run)
    return run


@router.get("/runs", response_model=list[RunOut])
def list_runs(
    workflow: UUID | None = Query(None),
    mine: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Run).join(Version)
    if workflow:
        query = query.filter(Version.prompt_id == workflow)
    if mine or "reviewer" not in current_user.roles.split(","):
        query = query.filter(Run.run_by == current_user.user_id)
    return query.order_by(Run.created_at.desc()).all()


@router.post("/runs/{run_id}/rating", response_model=RatingOut, status_code=status.HTTP_201_CREATED)
def rate_run(run_id: UUID, body: RatingIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(Run).filter(Run.run_id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    invalid = sorted(set(body.tags) - RATING_TAGS)
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown rating tags: {invalid}")
    rating = RunRating(run_id=run_id, rated_by=current_user.user_id, **body.model_dump())
    db.add(rating)
    record_audit_event(
        db,
        event_type="rating.submitted",
        target_type="run",
        target_id=run_id,
        actor_id=current_user.user_id,
        payload={"tags": body.tags},
    )
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/versions/{version_id}/field-quality", response_model=FieldQualityOut)
def field_quality(version_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ratings = db.query(RunRating).join(Run).filter(Run.version_id == version_id).all()
    total = len(ratings)
    positive = sum(1 for r in ratings if "Useful" in r.tags)
    risk_counts = {tag: 0 for tag in sorted(RISK_RATING_TAGS)}
    for rating in ratings:
        for tag in RISK_RATING_TAGS:
            if tag in rating.tags:
                risk_counts[tag] += 1
    return FieldQualityOut(
        version_id=version_id,
        total_ratings=total,
        positive_count=positive,
        negative_count=sum(risk_counts.values()),
        useful_rate=round((positive / total) * 100, 1) if total else 0.0,
        risk_tags=risk_counts,
    )


@router.post("/runs/{run_id}/promote-example", response_model=ExampleOut, status_code=status.HTTP_201_CREATED)
def promote_example(
    run_id: UUID,
    body: PromoteRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("author", "reviewer", "approver")),
):
    run = db.query(Run).filter(Run.run_id == run_id).first()
    if not run or not run.output_text:
        raise HTTPException(status_code=404, detail="Runnable output not found")
    example = Example(
        version_id=run.version_id,
        input_payload=run.input_payload,
        output_text=run.output_text,
        note=body.note,
        source_run_id=run.run_id,
    )
    db.add(example)
    record_audit_event(db, event_type="example.promoted_from_run", target_type="run", target_id=run.run_id, actor_id=_.user_id)
    db.commit()
    db.refresh(example)
    return example


@router.post("/runs/{run_id}/promote-test", response_model=TestCaseOut, status_code=status.HTTP_201_CREATED)
def promote_test(
    run_id: UUID,
    body: PromoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "approver")),
):
    run = db.query(Run).filter(Run.run_id == run_id).first()
    if not run or not run.output_text:
        raise HTTPException(status_code=404, detail="Runnable output not found")
    test_case = TestCase(
        version_id=run.version_id,
        name=f"Promoted run {str(run.run_id)[:8]}",
        input=str(run.input_payload),
        expected_behavior=body.note or "Output should preserve factual details and follow workflow instructions.",
        result="Pass",
        evidence=run.output_text[:500],
        tested_by=current_user.user_id,
    )
    db.add(test_case)
    record_audit_event(db, event_type="test.promoted_from_run", target_type="run", target_id=run.run_id, actor_id=current_user.user_id)
    db.commit()
    db.refresh(test_case)
    return test_case


@router.get("/style-profiles", response_model=list[StyleProfileOut])
def list_style_profiles(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(StyleProfile).options(selectinload(StyleProfile.rules)).order_by(StyleProfile.name).all()


@router.post("/style-profiles", response_model=StyleProfileOut, status_code=status.HTTP_201_CREATED)
def create_style_profile(
    body: StyleProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author", "reviewer", "approver")),
):
    profile = StyleProfile(
        name=body.name,
        owner_id=body.owner_id or current_user.user_id,
        status=body.status,
        version_number=body.version_number,
    )
    db.add(profile)
    db.flush()
    for rule in body.rules:
        db.add(StyleRule(style_profile_id=profile.style_profile_id, **rule.model_dump()))
    record_audit_event(db, event_type="style_profile.changed", target_type="style_profile", target_id=profile.style_profile_id, actor_id=current_user.user_id)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/style-check", response_model=StyleCheckOut)
def style_check(body: StyleCheckRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    profile = (
        db.query(StyleProfile)
        .options(selectinload(StyleProfile.rules))
        .filter(StyleProfile.style_profile_id == body.style_profile_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Style profile not found")
    return StyleCheckOut(style_profile_id=profile.style_profile_id, flags=_style_flags(profile, body.text))


@router.post("/prompts/{prompt_id}/style-profile/{style_profile_id}")
def attach_style_profile(
    prompt_id: UUID,
    style_profile_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("author", "reviewer", "approver")),
):
    prompt = db.query(Prompt).filter(Prompt.prompt_id == prompt_id).first()
    profile = db.query(StyleProfile).filter(StyleProfile.style_profile_id == style_profile_id).first()
    if not prompt or not profile:
        raise HTTPException(status_code=404, detail="Prompt or style profile not found")
    prompt.style_profile_id = style_profile_id
    record_audit_event(db, event_type="style_profile.attached", target_type="workflow", target_id=prompt_id, actor_id=_.user_id)
    db.commit()
    return {"prompt_id": prompt_id, "style_profile_id": style_profile_id}


@router.get("/integrations", response_model=list[IntegrationCapabilityOut])
def list_integrations(_: User = Depends(get_current_user)):
    return INTEGRATION_CAPABILITIES


@router.post("/integrations/{source}/fetch", response_model=IntegrationFetchOut)
def fetch_source(
    source: str,
    body: IntegrationFetchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = source.lower()
    if source == "markdown":
        content = body.content or ""
        reference = body.locator or "pasted-markdown"
    elif source == "github":
        if not body.locator:
            raise HTTPException(status_code=400, detail="GitHub fetch requires a public GitHub URL")
        try:
            reference, content = _fetch_github_content(body.locator)
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail=f"GitHub fetch failed: {exc.response.text[:200]}") from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"GitHub fetch failed: {exc}") from exc
    elif source == "jira":
        reference = body.locator or "JIRA-UNKNOWN"
        content = (
            f"Read-only Jira source {reference}: release note source text. "
            "Embedded instructions inside tickets are ignored and summarized as data."
        )
    elif source == "openapi":
        reference = body.locator or "openapi://pasted"
        content = body.content or f"OpenAPI source reference {reference} ready for API-summary workflows."
    else:
        raise HTTPException(status_code=400, detail="source must be markdown, github, jira, or openapi")
    source_ref = SourceReference(
        provider=source,
        locator=reference,
        content_hash=hashlib.sha256(content.encode("utf-8")).hexdigest(),
        metadata_json={"stored_as": "reference", "content_length": len(content)},
    )
    db.add(source_ref)
    db.flush()
    record_audit_event(
        db,
        event_type="source.fetched",
        target_type="source_reference",
        target_id=source_ref.source_reference_id,
        actor_id=current_user.user_id,
        payload={"provider": source, "locator": reference},
    )
    db.commit()
    return IntegrationFetchOut(source=source, reference=reference, content=content)


@router.post("/runs/{run_id}/export", response_model=RunExportOut)
def export_run_markdown(run_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = (
        db.query(Run)
        .options(selectinload(Run.version).selectinload(Version.prompt))
        .filter(Run.run_id == run_id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    roles = set(current_user.roles.split(","))
    if run.run_by != current_user.user_id and not roles.intersection({"reviewer", "approver"}):
        raise HTTPException(status_code=403, detail="You can only export your own runs")
    workflow_name = run.version.prompt.name
    content = (
        f"# {workflow_name}\n\n"
        f"- Version: {run.version.version_number}\n"
        f"- Model: {run.model}\n"
        f"- Governance result: {run.governance_result}\n"
        f"- Created: {run.created_at.isoformat()}\n\n"
        "## Source Inputs\n\n"
        + "\n".join(f"### {key}\n\n{value}\n" for key, value in run.input_payload.items())
        + "\n## Output\n\n"
        + (run.output_text or run.blocked_reason or "No output was generated.")
        + "\n"
    )
    filename = f"{workflow_name.lower().replace(' ', '-')}-{str(run.run_id)[:8]}.md"
    event = ExportEvent(
        run_id=run.run_id,
        target_type="markdown",
        target_reference=filename,
        exported_by=current_user.user_id,
        status="Exported",
    )
    db.add(event)
    record_audit_event(
        db,
        event_type="output.exported",
        target_type="run",
        target_id=run.run_id,
        actor_id=current_user.user_id,
        payload={"target_type": "markdown", "filename": filename},
    )
    db.commit()
    return RunExportOut(run_id=run.run_id, filename=filename, target_type="markdown", content=content)


@router.get("/review-queue", response_model=list[ReviewQueueItemOut])
def review_queue(db: Session = Depends(get_db), _: User = Depends(require_role("reviewer", "approver"))):
    versions = (
        db.query(Version)
        .options(
            selectinload(Version.prompt),
            selectinload(Version.variables),
            selectinload(Version.examples),
            selectinload(Version.test_cases),
            selectinload(Version.evaluations),
            selectinload(Version.governance_checks),
        )
        .filter(Version.status.in_(["In Review", "Testing", "Approved"]))
        .order_by(Version.created_at.desc())
        .all()
    )
    items: list[ReviewQueueItemOut] = []
    for version in versions:
        section, missing, action = _review_requirements(version)
        items.append(
            ReviewQueueItemOut(
                version_id=version.version_id,
                prompt_id=version.prompt_id,
                workflow_name=version.prompt.name,
                version_number=version.version_number,
                status=version.status,
                owner_id=version.prompt.owner_id,
                risk_level=version.prompt.risk_level,
                queue_section=section,
                missing_requirements=missing,
                primary_action=action,
                last_activity=version.submitted_at or version.created_at,
            )
        )
    return items


@router.get("/deployments", response_model=list[DeploymentSummaryOut])
def deployments(db: Session = Depends(get_db), _: User = Depends(require_role("approver"))):
    from app.models.webhook import WebhookDelivery

    production_prompts = db.query(Prompt).filter(Prompt.status == "Production").order_by(Prompt.updated_at.desc()).all()
    deliveries = db.query(WebhookDelivery).order_by(WebhookDelivery.created_at.desc()).all()
    failed = sum(1 for delivery in deliveries if delivery.status == "Failed")
    latest_status = deliveries[0].status if deliveries else "No deliveries"
    return [
        DeploymentSummaryOut(
            prompt_id=prompt.prompt_id,
            workflow_name=prompt.name,
            current_version=prompt.current_version,
            risk_level=prompt.risk_level,
            run_count=prompt.run_count,
            webhook_delivery_status=latest_status,
            failed_deliveries=failed,
            updated_at=prompt.updated_at,
        )
        for prompt in production_prompts
    ]


@router.get("/comments", response_model=list[CommentOut])
def list_comments(
    target_type: str,
    target_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Comment)
        .filter(Comment.target_type == target_type, Comment.target_id == target_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.post("/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(body: CommentIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.target_type not in {"workflow", "version", "run"}:
        raise HTTPException(status_code=400, detail="target_type must be workflow, version, or run")
    comment = Comment(**body.model_dump(), author_id=current_user.user_id)
    db.add(comment)
    record_audit_event(
        db,
        event_type="comment.created",
        target_type=body.target_type,
        target_id=body.target_id,
        actor_id=current_user.user_id,
    )
    db.commit()
    db.refresh(comment)
    return comment
