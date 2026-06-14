import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, JSON, String, Text, TIMESTAMP, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Prompt(Base):
    __tablename__ = "prompts"

    prompt_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    subcategory = Column(String(50), nullable=False)
    owner_id = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    status = Column(String(20), nullable=False, default="Draft")
    current_version = Column(String(10), nullable=True)
    target_model = Column(String(50), nullable=False)
    risk_level = Column(String(10), nullable=False, default="Medium")
    tags = Column(JSON().with_variant(JSONB, "postgresql"), default=list)
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    view_count = Column(String(10), nullable=False, default="0")

    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_prompts")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_prompts")
    versions = relationship("Version", back_populates="prompt", cascade="all, delete-orphan")
