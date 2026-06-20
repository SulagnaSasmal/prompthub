from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, HttpUrl


class WebhookEndpointCreate(BaseModel):
    name: str
    url: HttpUrl
    secret: str
    event_type: str = "prompt.production_deployed"
    is_active: bool = True


class WebhookEndpointUpdate(BaseModel):
    name: str | None = None
    url: HttpUrl | None = None
    secret: str | None = None
    event_type: str | None = None
    is_active: bool | None = None


class WebhookEndpointOut(BaseModel):
    webhook_id: UUID
    name: str
    url: str
    event_type: str
    is_active: bool
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookDeliveryOut(BaseModel):
    delivery_id: UUID
    webhook_id: UUID
    event_type: str
    status: str
    attempt_count: int
    max_attempts: int
    next_retry_at: datetime | None
    last_status_code: int | None
    last_error: str | None
    created_at: datetime
    delivered_at: datetime | None

    model_config = {"from_attributes": True}
