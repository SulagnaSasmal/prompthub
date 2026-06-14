import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class WorkflowLog(Base):
    __tablename__ = "workflow_log"

    log_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(Uuid(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    actor_id = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    comment = Column(Text, nullable=True)
    logged_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("Version", back_populates="workflow_logs")
    actor = relationship("User", foreign_keys=[actor_id])
