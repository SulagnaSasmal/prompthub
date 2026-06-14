from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.prompt import PromptCreate, PromptOut, PromptUpdate

router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])


@router.get("", response_model=List[PromptOut])
def list_prompts(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    owner_id: Optional[UUID] = Query(None),
    tag: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Prompt)
    if category:
        q = q.filter(Prompt.category == category)
    if status:
        q = q.filter(Prompt.status == status)
    if owner_id:
        q = q.filter(Prompt.owner_id == owner_id)
    if risk_level:
        q = q.filter(Prompt.risk_level == risk_level)
    if tag:
        q = q.filter(Prompt.tags.contains([tag]))
    return q.order_by(Prompt.updated_at.desc()).all()


@router.post("", response_model=PromptOut, status_code=status.HTTP_201_CREATED)
def create_prompt(
    body: PromptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author", "reviewer", "approver")),
):
    if db.query(Prompt).filter(Prompt.name.ilike(body.name)).first():
        raise HTTPException(status_code=400, detail="Prompt name already exists")
    payload = body.model_dump()
    payload["owner_id"] = payload["owner_id"] or current_user.user_id
    prompt = Prompt(
        **payload,
        created_by=current_user.user_id,
        status="Draft",
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/{prompt_id}", response_model=PromptOut)
def get_prompt(prompt_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    prompt = db.query(Prompt).filter(Prompt.prompt_id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    # Increment view count
    prompt.view_count = str(int(prompt.view_count) + 1)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.patch("/{prompt_id}", response_model=PromptOut)
def update_prompt(
    prompt_id: UUID,
    body: PromptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("author", "reviewer", "approver")),
):
    prompt = db.query(Prompt).filter(Prompt.prompt_id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    if prompt.status != "Draft":
        raise HTTPException(status_code=400, detail="Only Draft prompts can be edited")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prompt, field, value)
    db.commit()
    db.refresh(prompt)
    return prompt
