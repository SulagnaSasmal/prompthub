from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.test_case import TestCase
from app.models.user import User
from app.models.version import Version
from app.schemas.test_case import TestCaseCreate, TestCaseOut, TestResultUpdate

router = APIRouter(prefix="/api/v1", tags=["tests"])


@router.post("/versions/{version_id}/tests", response_model=TestCaseOut, status_code=status.HTTP_201_CREATED)
def add_test_case(
    version_id: UUID,
    body: TestCaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "approver")),
):
    version = db.query(Version).filter(Version.version_id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    tc = TestCase(version_id=version_id, **body.model_dump())
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


@router.get("/versions/{version_id}/tests", response_model=List[TestCaseOut])
def list_test_cases(version_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(TestCase).filter(TestCase.version_id == version_id).all()


@router.patch("/tests/{test_case_id}", response_model=TestCaseOut)
def record_test_result(
    test_case_id: UUID,
    body: TestResultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "approver")),
):
    tc = db.query(TestCase).filter(TestCase.test_case_id == test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    if body.result not in ("Pass", "Fail"):
        raise HTTPException(status_code=400, detail="result must be Pass or Fail")
    tc.result = body.result
    tc.evidence = body.evidence
    tc.tested_by = current_user.user_id
    tc.tested_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tc)
    return tc
