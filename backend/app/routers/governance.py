from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.governance import GovernanceCheck
from app.models.user import User
from app.models.version import Version
from app.schemas.governance import GovernanceCheckCreate, GovernanceCheckOut

router = APIRouter(prefix="/api/v1/versions", tags=["governance"])

VALID_CHECK_TYPES = {"PII", "Compliance", "Bias", "Hallucination", "Ownership"}
VALID_RESULTS = {"Pass", "Flag", "Fail"}


@router.post("/{version_id}/governance-checks", response_model=GovernanceCheckOut, status_code=status.HTTP_201_CREATED)
def record_governance_check(
    version_id: UUID,
    body: GovernanceCheckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "approver")),
):
    if body.check_type not in VALID_CHECK_TYPES:
        raise HTTPException(status_code=400, detail=f"check_type must be one of {VALID_CHECK_TYPES}")
    if body.result not in VALID_RESULTS:
        raise HTTPException(status_code=400, detail=f"result must be one of {VALID_RESULTS}")
    version = db.query(Version).filter(Version.version_id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    check = GovernanceCheck(
        version_id=version_id,
        check_type=body.check_type,
        result=body.result,
        notes=body.notes,
        checked_by=current_user.user_id,
    )
    db.add(check)

    # Auto-escalate risk: two consecutive Hallucination flags → risk up
    if body.check_type == "Hallucination" and body.result in ("Flag", "Fail"):
        hallucination_flags = [
            c for c in version.governance_checks
            if c.check_type == "Hallucination" and c.result in ("Flag", "Fail")
        ]
        if len(hallucination_flags) >= 1:  # this one makes 2
            prompt = version.prompt
            levels = ["Low", "Medium", "High"]
            idx = levels.index(prompt.risk_level) if prompt.risk_level in levels else 1
            if idx < 2:
                prompt.risk_level = levels[idx + 1]

    db.commit()
    db.refresh(check)
    return check


@router.get("/{version_id}/governance-checks", response_model=List[GovernanceCheckOut])
def list_governance_checks(version_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(GovernanceCheck).filter(GovernanceCheck.version_id == version_id).all()
