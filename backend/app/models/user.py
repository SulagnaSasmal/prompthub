import uuid

from sqlalchemy import Boolean, Column, String, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120))
    # Comma-separated roles: author,reviewer,approver,consumer
    roles = Column(String(100), nullable=False, default="consumer")
    is_active = Column(Boolean, default=True)

    owned_prompts = relationship("Prompt", foreign_keys="Prompt.owner_id", back_populates="owner")
    created_prompts = relationship("Prompt", foreign_keys="Prompt.created_by", back_populates="creator")
