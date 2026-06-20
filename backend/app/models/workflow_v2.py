import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, ForeignKey, Integer, JSON, String, Text, TIMESTAMP, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class Variable(Base):
    __tablename__ = "variables"

    variable_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(Uuid(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    name = Column(String(80), nullable=False)
    label = Column(String(120), nullable=False)
    help_text = Column(Text, nullable=False, default="")
    var_type = Column(String(20), nullable=False, default="long-text")
    required = Column(Boolean, nullable=False, default=True)
    default_value = Column(Text, nullable=True)
    example_value = Column(Text, nullable=True)
    options = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)

    version = relationship("Version", back_populates="variables")


class Run(Base):
    __tablename__ = "runs"

    run_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(Uuid(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    run_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    input_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    output_text = Column(Text, nullable=True)
    model = Column(String(50), nullable=False)
    latency_ms = Column(Integer, nullable=False, default=0)
    style_profile_applied = Column(Uuid(as_uuid=True), ForeignKey("style_profiles.style_profile_id"), nullable=True)
    governance_result = Column(String(10), nullable=False, default="Pass")
    blocked_reason = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    version = relationship("Version", back_populates="runs")
    runner = relationship("User", foreign_keys=[run_by])
    ratings = relationship("RunRating", back_populates="run", cascade="all, delete-orphan")


class RunRating(Base):
    __tablename__ = "run_ratings"

    rating_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(Uuid(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    rated_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    tags = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    comment = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    run = relationship("Run", back_populates="ratings")
    rater = relationship("User", foreign_keys=[rated_by])


class Example(Base):
    __tablename__ = "examples"

    example_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(Uuid(as_uuid=True), ForeignKey("versions.version_id"), nullable=False)
    input_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    output_text = Column(Text, nullable=False)
    note = Column(Text, nullable=False, default="")
    source_run_id = Column(Uuid(as_uuid=True), ForeignKey("runs.run_id"), nullable=True)
    is_stale = Column(Boolean, nullable=False, default=False)

    version = relationship("Version", back_populates="examples")
    source_run = relationship("Run", foreign_keys=[source_run_id])


class StyleProfile(Base):
    __tablename__ = "style_profiles"

    style_profile_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    owner_id = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    status = Column(String(20), nullable=False, default="Draft")
    version_number = Column(String(10), nullable=False, default="1.0")
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", foreign_keys=[owner_id])
    rules = relationship("StyleRule", back_populates="style_profile", cascade="all, delete-orphan")


class StyleRule(Base):
    __tablename__ = "style_rules"

    rule_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    style_profile_id = Column(Uuid(as_uuid=True), ForeignKey("style_profiles.style_profile_id"), nullable=False)
    rule_type = Column(String(20), nullable=False)
    pattern = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(10), nullable=False, default="warning")

    style_profile = relationship("StyleProfile", back_populates="rules")


class Comment(Base):
    __tablename__ = "comments"

    comment_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(String(20), nullable=False)
    target_id = Column(Uuid(as_uuid=True), nullable=False)
    author_id = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    author = relationship("User", foreign_keys=[author_id])
