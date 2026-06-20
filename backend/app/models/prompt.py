import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Integer, JSON, String, Text, TIMESTAMP, Uuid
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
    task_type = Column(String(40), nullable=False, default="General Writing")
    usage_notes = Column(Text, nullable=False, default="")
    style_profile_id = Column(Uuid(as_uuid=True), ForeignKey("style_profiles.style_profile_id"), nullable=True)
    run_count = Column(Integer, nullable=False, default=0)
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
    style_profile = relationship("StyleProfile", foreign_keys=[style_profile_id])

    @property
    def formal_quality_score(self):
        current = next((v for v in self.versions if v.version_number == self.current_version), None)
        if not current or not current.evaluations:
            return None
        return round(sum(float(e.overall_score) for e in current.evaluations) / len(current.evaluations), 1)
