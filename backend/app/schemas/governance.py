from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class GovernanceCheckCreate(BaseModel):
    check_type: str  # PII / Compliance / Bias / Hallucination / Ownership
    result: str       # Pass / Flag / Fail
    notes: str | None = None


class GovernanceCheckOut(BaseModel):
    check_id: UUID
    version_id: UUID
    check_type: str
    result: str
    notes: str | None
    checked_by: UUID
    checked_at: datetime

    model_config = {"from_attributes": True}
