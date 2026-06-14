import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class GovernanceCheck(Base):
    __tablename__ = "governance_checks"

    check_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(Uuid(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    # PII / Compliance / Bias / Hallucination / Ownership
    check_type = Column(String(30), nullable=False)
    # Pass / Flag / Fail
    result = Column(String(10), nullable=False)
    notes = Column(Text, nullable=True)
    checked_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    checked_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("Version", back_populates="governance_checks")
    checker = relationship("User", foreign_keys=[checked_by])
