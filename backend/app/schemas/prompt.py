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


class PromptUpdate(BaseModel):
    description: str | None = None
    category: str | None = None
    subcategory: str | None = None
    owner_id: UUID | None = None
    target_model: str | None = None
    risk_level: str | None = None
    tags: List[str] | None = None


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
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    view_count: str

    model_config = {"from_attributes": True}
