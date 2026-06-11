from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator


class EvaluationCreate(BaseModel):
    accuracy_score: int
    completeness_score: int
    tone_score: int
    hallucination_score: int
    formatting_score: int

    @field_validator("accuracy_score", "completeness_score", "tone_score", "hallucination_score", "formatting_score")
    @classmethod
    def score_range(cls, v: int) -> int:
        if not 1 <= v <= 10:
            raise ValueError("Score must be between 1 and 10")
        return v


class EvaluationOut(BaseModel):
    evaluation_id: UUID
    version_id: UUID
    run_number: int
    accuracy_score: int
    completeness_score: int
    tone_score: int
    hallucination_score: int
    formatting_score: int
    overall_score: Decimal | None
    evaluated_by: UUID
    evaluated_at: datetime

    model_config = {"from_attributes": True}
