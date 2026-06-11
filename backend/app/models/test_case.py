import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class TestCase(Base):
    __tablename__ = "test_cases"

    test_case_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    name = Column(String(255), nullable=False)
    input = Column(Text, nullable=False)
    expected_behavior = Column(Text, nullable=False)
    result = Column(String(10), nullable=False, default="Not Run")  # Pass / Fail / Not Run
    evidence = Column(Text, nullable=True)
    tested_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    tested_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("Version", back_populates="test_cases")
    tester = relationship("User", foreign_keys=[tested_by])
