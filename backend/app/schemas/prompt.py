from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel


class PromptCreate(BaseModel):
    name: str
    description: str
    category: str
    subcategory: str
    owner_id: UUID | None = None
    target_model: str
    risk_level: str = "Medium"
    tags: List[str] = []
    task_type: str = "General Writing"
    usage_notes: str = ""
    style_profile_id: UUID | None = None


class PromptUpdate(BaseModel):
    description: str | None = None
    category: str | None = None
    subcategory: str | None = None
    owner_id: UUID | None = None
    target_model: str | None = None
    risk_level: str | None = None
    tags: List[str] | None = None
    task_type: str | None = None
    usage_notes: str | None = None
    style_profile_id: UUID | None = None


class PromptOut(BaseModel):
    prompt_id: UUID
    name: str
    description: str
    category: str
    subcategory: str
    owner_id: UUID
    status: str
    current_version: str | None
    target_model: str
    risk_level: str
    tags: List[str]
    task_type: str
    usage_notes: str
    style_profile_id: UUID | None
    run_count: int
    formal_quality_score: float | None = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    view_count: str

    model_config = {"from_attributes": True}
