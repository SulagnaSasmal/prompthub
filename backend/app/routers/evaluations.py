from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.evaluation import Evaluation
from app.models.user import User
from app.models.version import Version
from app.schemas.evaluation import EvaluationCreate, EvaluationOut

router = APIRouter(prefix="/api/v1/versions", tags=["evaluations"])

WEIGHTS = {
    "accuracy_score": 0.30,
    "completeness_score": 0.25,
    "tone_score": 0.15,
    "hallucination_score": 0.20,
    "formatting_score": 0.10,
}


def _compute_overall(data: EvaluationCreate) -> float:
    return sum(getattr(data, field) * 10 * w for field, w in WEIGHTS.items())


@router.post("/{version_id}/evaluations", response_model=EvaluationOut, status_code=status.HTTP_201_CREATED)
def record_evaluation(
    version_id: UUID,
    body: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reviewer", "approver")),
):
    version = db.query(Version).filter(Version.version_id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    if version.status not in ("Testing", "In Review"):
        raise HTTPException(status_code=400, detail="Evaluations can only be recorded during In Review or Testing")
    run_number = db.query(func.count(Evaluation.evaluation_id)).filter(
        Evaluation.version_id == version_id
    ).scalar() + 1
    overall = _compute_overall(body)
    ev = Evaluation(
        version_id=version_id,
        run_number=run_number,
        overall_score=overall,
        evaluated_by=current_user.user_id,
        **body.model_dump(),
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.get("/{version_id}/evaluations", response_model=List[EvaluationOut])
def list_evaluations(version_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Evaluation).filter(Evaluation.version_id == version_id).order_by(Evaluation.run_number).all()
