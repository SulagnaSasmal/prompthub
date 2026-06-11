from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class VersionCreate(BaseModel):
    version_number: str
    prompt_text: str
    change_summary: str


class TransitionRequest(BaseModel):
    to_status: str
    comment: str | None = None


class VersionOut(BaseModel):
    version_id: UUID
    prompt_id: UUID
    version_number: str
    prompt_text: str
    change_summary: str
    status: str
    created_by: UUID
    created_at: datetime
    submitted_at: datetime | None

    model_config = {"from_attributes": True}


class DiffOut(BaseModel):
    version_a: str
    version_b: str
    text_a: str
    text_b: str
    diff_lines: list[str]
