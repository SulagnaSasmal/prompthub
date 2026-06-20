import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, ForeignKey, Integer, JSON, String, Text, TIMESTAMP, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    audit_event_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    event_type = Column(String(80), nullable=False)
    target_type = Column(String(40), nullable=False)
    target_id = Column(Uuid(as_uuid=True), nullable=True)
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    actor = relationship("User", foreign_keys=[actor_id])


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    connection_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(30), nullable=False)
    name = Column(String(120), nullable=False)
    status = Column(String(20), nullable=False, default="Draft")
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    config_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    encrypted_secret = Column(Text, nullable=True)

    creator = relationship("User", foreign_keys=[created_by])


class SourceReference(Base):
    __tablename__ = "source_references"

    source_reference_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(30), nullable=False)
    locator = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))


class ExportEvent(Base):
    __tablename__ = "export_events"

    export_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(Uuid(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    target_type = Column(String(30), nullable=False)
    target_reference = Column(Text, nullable=True)
    exported_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), nullable=False, default="Exported")

    run = relationship("Run", foreign_keys=[run_id])
    exporter = relationship("User", foreign_keys=[exported_by])


class WorkflowPack(Base):
    __tablename__ = "workflow_packs"

    pack_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    source_url = Column(Text, nullable=True)
    license = Column(String(80), nullable=False, default="Internal")
    imported_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), nullable=False, default="Draft")
    manifest_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)

    importer = relationship("User", foreign_keys=[imported_by])


class ModelProvider(Base):
    __tablename__ = "model_providers"

    provider_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    provider_type = Column(String(30), nullable=False)
    model_name = Column(String(120), nullable=False)
    status = Column(String(20), nullable=False, default="Draft")
    config_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    encrypted_credentials = Column(Text, nullable=True)
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[created_by])


class RetentionPolicy(Base):
    __tablename__ = "retention_policies"

    retention_policy_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    applies_to = Column(String(40), nullable=False, default="runs")
    retention_days = Column(Integer, nullable=False, default=365)
    redact_sensitive_inputs = Column(Boolean, nullable=False, default=True)
    private_source_storage = Column(String(20), nullable=False, default="reference_only")
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[created_by])


class EnterpriseAuthConfig(Base):
    __tablename__ = "enterprise_auth_configs"

    auth_config_id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_type = Column(String(20), nullable=False, default="oidc")
    name = Column(String(120), nullable=False)
    issuer_url = Column(Text, nullable=True)
    client_id = Column(Text, nullable=True)
    encrypted_client_secret = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="Draft")
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", foreign_keys=[created_by])
