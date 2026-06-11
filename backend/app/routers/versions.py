import difflib
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.prompt import Prompt
from app.models.user import User
from app.models.version import Version
from app.schemas.version import DiffOut, TransitionRequest, VersionCreate, VersionOut
from app.services import workflow

router = APIRouter(prefix="/api/v1", tags=["versions"])


@router.get("/prompts/{prompt_id}/versions", response_model=List[VersionOut])
def list_versions(prompt_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Version).filter(Version.prompt_id == prompt_id).order_by(Version.created_at.desc()).all()


@router.post("/prompts/{prompt_id}/versions", response_model=VersionOut, status_code=status.HTTP_201_CREATED)
def create_version(
    prompt_id: UUID,
    body: VersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author", "reviewer", "approver")),
):
    prompt = db.query(Prompt).filter(Prompt.prompt_id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    existing = db.query(Version).filter(
        Version.prompt_id == prompt_id,
        Version.version_number == body.version_number,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Version number already exists for this prompt")
    version = Version(
        prompt_id=prompt_id,
        version_number=body.version_number,
        prompt_text=body.prompt_text,
        change_summary=body.change_summary,
        created_by=current_user.user_id,
        status="Draft",
    )
    db.add(version)
    # Copy test cases from previous version if any
    prev = (
        db.query(Version)
        .filter(Version.prompt_id == prompt_id, Version.status != "Retired")
        .order_by(Version.created_at.desc())
        .first()
    )
    db.commit()
    db.refresh(version)
    if prev and prev.test_cases:
        from app.models.test_case import TestCase
        for tc in prev.test_cases:
            new_tc = TestCase(
                version_id=version.version_id,
                name=tc.name,
                input=tc.input,
                expected_behavior=tc.expected_behavior,
                result="Not Run",
            )
            db.add(new_tc)
        db.commit()
        db.refresh(version)
    return version


@router.get("/versions/{version_id}/diff/{other_id}", response_model=DiffOut)
def diff_versions(version_id: UUID, other_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    a = db.query(Version).filter(Version.version_id == version_id).first()
    b = db.query(Version).filter(Version.version_id == other_id).first()
    if not a or not b:
        raise HTTPException(status_code=404, detail="Version not found")
    diff = list(difflib.unified_diff(
        a.prompt_text.splitlines(keepends=True),
        b.prompt_text.splitlines(keepends=True),
        fromfile=f"v{a.version_number}",
        tofile=f"v{b.version_number}",
    ))
    return DiffOut(
        version_a=a.version_number,
        version_b=b.version_number,
        text_a=a.prompt_text,
        text_b=b.prompt_text,
        diff_lines=diff,
    )


@router.post("/versions/{version_id}/transition", response_model=VersionOut)
def transition_version(
    version_id: UUID,
    body: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = db.query(Version).filter(Version.version_id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    actor_roles = set(current_user.roles.split(","))
    return workflow.transition(
        version=version,
        to_status=body.to_status,
        actor_id=current_user.user_id,
        actor_roles=actor_roles,
        comment=body.comment,
        db=db,
    )
