import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Numeric, ForeignKey, TIMESTAMP, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    evaluation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    run_number = Column(Integer, nullable=False)
    accuracy_score = Column(Integer, nullable=False)
    completeness_score = Column(Integer, nullable=False)
    tone_score = Column(Integer, nullable=False)
    hallucination_score = Column(Integer, nullable=False)
    formatting_score = Column(Integer, nullable=False)
    overall_score = Column(Numeric(5, 2))
    evaluated_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    evaluated_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("accuracy_score BETWEEN 1 AND 10", name="ck_accuracy"),
        CheckConstraint("completeness_score BETWEEN 1 AND 10", name="ck_completeness"),
        CheckConstraint("tone_score BETWEEN 1 AND 10", name="ck_tone"),
        CheckConstraint("hallucination_score BETWEEN 1 AND 10", name="ck_hallucination"),
        CheckConstraint("formatting_score BETWEEN 1 AND 10", name="ck_formatting"),
    )

    version = relationship("Version", back_populates="evaluations")
    evaluator = relationship("User", foreign_keys=[evaluated_by])
