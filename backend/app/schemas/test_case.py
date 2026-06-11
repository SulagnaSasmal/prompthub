from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TestCaseCreate(BaseModel):
    name: str
    input: str
    expected_behavior: str


class TestResultUpdate(BaseModel):
    result: str  # Pass / Fail
    evidence: str | None = None


class TestCaseOut(BaseModel):
    test_case_id: UUID
    version_id: UUID
    name: str
    input: str
    expected_behavior: str
    result: str
    evidence: str | None
    tested_by: UUID | None
    tested_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
