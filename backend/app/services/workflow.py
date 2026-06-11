from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.version import Version
from app.models.workflow_log import WorkflowLog

# Valid transitions: current_status -> allowed next statuses
TRANSITIONS = {
    "Draft": ["In Review"],
    "In Review": ["Testing", "Draft"],
    "Testing": ["Approved", "In Review"],
    "Approved": ["Production", "Testing"],
    "Production": ["Retired"],
    "Retired": [],
}

# Who can trigger each transition
TRANSITION_ROLES = {
    ("Draft", "In Review"): {"author", "reviewer", "approver"},
    ("In Review", "Testing"): {"reviewer", "approver"},
    ("In Review", "Draft"): {"reviewer", "approver"},
    ("Testing", "Approved"): {"reviewer", "approver"},
    ("Testing", "In Review"): {"reviewer", "approver"},
    ("Approved", "Production"): {"approver"},
    ("Approved", "Testing"): {"approver"},
    ("Production", "Retired"): {"approver"},
}

METADATA_REQUIRED = {"name", "description", "category", "subcategory", "target_model"}


def _check_metadata(version: Version) -> list[str]:
    prompt = version.prompt
    missing = []
    for field in METADATA_REQUIRED:
        if not getattr(prompt, field, None):
            missing.append(field)
    if not version.change_summary:
        missing.append("change_summary")
    return missing


def _check_test_cases(version: Version) -> list[str]:
    errors = []
    cases = version.test_cases
    required_min = 5 if version.prompt.risk_level == "High" else 3
    if len(cases) < required_min:
        errors.append(f"Minimum {required_min} test cases required (have {len(cases)})")
    if version.prompt.risk_level == "High":
        # Check at least one adversarial case (name must contain "adversarial" or tag it)
        adversarial = [c for c in cases if "adversarial" in c.name.lower()]
        if not adversarial:
            errors.append("High risk prompts require at least one adversarial test case")
    failed = [c for c in cases if c.result == "Fail"]
    if failed:
        errors.append(f"{len(failed)} test case(s) failed — fix before advancing")
    not_run = [c for c in cases if c.result == "Not Run"]
    if not_run:
        errors.append(f"{len(not_run)} test case(s) not yet executed")
    return errors


def _check_evaluation(version: Version) -> list[str]:
    errors = []
    evals = version.evaluations
    if len(evals) < 3:
        errors.append(f"Minimum 3 evaluation runs required (have {len(evals)})")
        return errors
    mean_score = sum(float(e.overall_score) for e in evals) / len(evals)
    threshold = 90.0 if version.prompt.risk_level == "High" else 85.0
    if mean_score < 70:
        errors.append(f"Mean evaluation score {mean_score:.1f}% is below 70% — rejected to Draft")
    elif mean_score < threshold:
        errors.append(
            f"Mean evaluation score {mean_score:.1f}% is below {threshold}% threshold "
            "(Approver may override for Low risk with rationale)"
        )
    return errors


def _check_governance(version: Version) -> list[str]:
    errors = []
    pii_fails = [c for c in version.governance_checks if c.check_type == "PII" and c.result == "Fail"]
    if pii_fails:
        errors.append("PII governance check has Fail status — hard block on promotion")
    compliance_fails = [
        c for c in version.governance_checks
        if c.check_type == "Compliance" and c.result == "Fail"
        and version.prompt.risk_level == "High"
    ]
    if compliance_fails:
        errors.append("Compliance check failed — hard block for High risk prompts")
    return errors


def transition(
    version: Version,
    to_status: str,
    actor_id: UUID,
    actor_roles: set,
    comment: str | None,
    db: Session,
) -> Version:
    from_status = version.status

    if to_status not in TRANSITIONS.get(from_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {from_status!r} to {to_status!r}",
        )

    allowed_roles = TRANSITION_ROLES.get((from_status, to_status), set())
    if not actor_roles.intersection(allowed_roles):
        raise HTTPException(status_code=403, detail=f"Role(s) required: {allowed_roles}")

    # Separation of duties: author cannot be sole reviewer/approver
    if to_status in ("Testing", "Production"):
        if str(version.created_by) == str(actor_id):
            raise HTTPException(
                status_code=403,
                detail="Separation of duties: the version author cannot approve their own version",
            )

    # Pre-transition checks
    if to_status == "In Review":
        missing = _check_metadata(version)
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required fields: {missing}")

    if to_status == "Approved":
        test_errors = _check_test_cases(version)
        if test_errors:
            raise HTTPException(status_code=400, detail={"test_errors": test_errors})
        eval_errors = _check_evaluation(version)
        # Hard block only below 70%; 70-84 is a warning (approver may override via comment)
        hard_fails = [e for e in eval_errors if "below 70%" in e]
        if hard_fails:
            raise HTTPException(status_code=400, detail={"evaluation_errors": hard_fails})

    if to_status == "Production":
        gov_errors = _check_governance(version)
        if gov_errors:
            raise HTTPException(status_code=400, detail={"governance_errors": gov_errors})
        # Auto-retire previous Production version
        from app.models.prompt import Prompt
        prompt = db.query(Prompt).filter(Prompt.prompt_id == version.prompt_id).first()
        prev_prod = (
            db.query(Version)
            .filter(
                Version.prompt_id == version.prompt_id,
                Version.status == "Production",
                Version.version_id != version.version_id,
            )
            .first()
        )
        if prev_prod:
            _log(prev_prod, "Production", "Retired", actor_id, "Auto-retired on promotion of successor", db)
            prev_prod.status = "Retired"
        prompt.current_version = version.version_number
        prompt.status = "Production"

    if to_status == "In Review" and version.submitted_at is None:
        version.submitted_at = datetime.now(timezone.utc)

    _log(version, from_status, to_status, actor_id, comment, db)
    version.status = to_status

    # Sync prompt status to highest-priority version status
    _sync_prompt_status(version, db)

    db.commit()
    db.refresh(version)
    return version


def _log(version: Version, from_status: str, to_status: str, actor_id: UUID, comment: str | None, db: Session):
    log = WorkflowLog(
        version_id=version.version_id,
        from_status=from_status,
        to_status=to_status,
        actor_id=actor_id,
        comment=comment,
    )
    db.add(log)


def _sync_prompt_status(version: Version, db: Session):
    from app.models.prompt import Prompt
    prompt = db.query(Prompt).filter(Prompt.prompt_id == version.prompt_id).first()
    if not prompt or version.status == "Production":
        return
    priority = ["Production", "Approved", "Testing", "In Review", "Draft", "Retired"]
    all_versions = prompt.versions
    for p in priority:
        if any(v.status == p for v in all_versions):
            prompt.status = p
            break
