from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class VariableIn(BaseModel):
    name: str
    label: str
    help_text: str = ""
    var_type: str = "long-text"
    required: bool = True
    default_value: str | None = None
    example_value: str | None = None
    options: list[str] = Field(default_factory=list)


class VariableOut(VariableIn):
    variable_id: UUID
    version_id: UUID

    model_config = {"from_attributes": True}


class ExampleIn(BaseModel):
    input_payload: dict[str, Any]
    output_text: str
    note: str = ""


class ExampleOut(ExampleIn):
    example_id: UUID
    version_id: UUID
    source_run_id: UUID | None = None
    is_stale: bool

    model_config = {"from_attributes": True}


class RunRequest(BaseModel):
    input_payload: dict[str, Any]
    apply_style_profile: bool = True


class RunOut(BaseModel):
    run_id: UUID
    version_id: UUID
    run_by: UUID
    input_payload: dict[str, Any]
    output_text: str | None
    model: str
    latency_ms: int
    style_profile_applied: UUID | None
    governance_result: str
    blocked_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RatingIn(BaseModel):
    tags: list[str]
    comment: str | None = None


class RatingOut(BaseModel):
    rating_id: UUID
    run_id: UUID
    rated_by: UUID
    tags: list[str]
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FieldQualityOut(BaseModel):
    version_id: UUID
    total_ratings: int
    positive_count: int
    negative_count: int
    useful_rate: float
    risk_tags: dict[str, int]


class PromoteRequest(BaseModel):
    note: str = ""


class StyleRuleIn(BaseModel):
    rule_type: str
    pattern: str
    message: str
    severity: str = "warning"


class StyleRuleOut(StyleRuleIn):
    rule_id: UUID
    style_profile_id: UUID

    model_config = {"from_attributes": True}


class StyleProfileIn(BaseModel):
    name: str
    owner_id: UUID | None = None
    status: str = "Approved"
    version_number: str = "1.0"
    rules: list[StyleRuleIn] = Field(default_factory=list)


class StyleProfileOut(BaseModel):
    style_profile_id: UUID
    name: str
    owner_id: UUID
    status: str
    version_number: str
    created_at: datetime
    rules: list[StyleRuleOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class StyleCheckRequest(BaseModel):
    text: str
    style_profile_id: UUID


class StyleFlag(BaseModel):
    rule_id: UUID
    rule_type: str
    pattern: str
    message: str
    severity: str
    start: int
    end: int
    matched_text: str


class StyleCheckOut(BaseModel):
    style_profile_id: UUID
    flags: list[StyleFlag]


class IntegrationFetchRequest(BaseModel):
    locator: str | None = None
    content: str | None = None


class IntegrationFetchOut(BaseModel):
    source: str
    reference: str
    content: str


class CommentIn(BaseModel):
    target_type: str
    target_id: UUID
    body: str


class CommentOut(CommentIn):
    comment_id: UUID
    author_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
