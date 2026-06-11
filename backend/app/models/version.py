import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Version(Base):
    __tablename__ = "versions"

    version_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_id = Column(UUID(as_uuid=True), ForeignKey("prompts.prompt_id"), nullable=False)
    version_number = Column(String(10), nullable=False)
    prompt_text = Column(Text, nullable=False)
    change_summary = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="Draft")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    # Lock prompt_text once submitted (status != Draft)
    submitted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    prompt = relationship("Prompt", back_populates="versions")
    creator = relationship("User", foreign_keys=[created_by])
    evaluations = relationship("Evaluation", back_populates="version", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="version", cascade="all, delete-orphan")
    governance_checks = relationship("GovernanceCheck", back_populates="version", cascade="all, delete-orphan")
    workflow_logs = relationship("WorkflowLog", back_populates="version", cascade="all, delete-orphan")
