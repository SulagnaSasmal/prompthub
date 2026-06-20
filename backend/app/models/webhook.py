import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, TIMESTAMP, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"

    webhook_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    url = Column(Text, nullable=False)
    secret = Column(Text, nullable=False)
    event_type = Column(String(80), nullable=False, default="prompt.production_deployed")
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[created_by])
    deliveries = relationship("WebhookDelivery", back_populates="endpoint", cascade="all, delete-orphan")


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    delivery_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(Uuid(as_uuid=True), ForeignKey("webhook_endpoints.webhook_id"), nullable=False)
    event_type = Column(String(80), nullable=False)
    payload_json = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="Pending")
    attempt_count = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=5)
    next_retry_at = Column(TIMESTAMP(timezone=True), nullable=True)
    last_status_code = Column(Integer, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(TIMESTAMP(timezone=True), nullable=True)

    endpoint = relationship("WebhookEndpoint", back_populates="deliveries")
