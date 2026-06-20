import csv
import io
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.workflow_v3 import AuditEvent
from app.models.workflow_log import WorkflowLog
from app.models.user import User
from app.models.version import Version
from app.models.prompt import Prompt


def record_audit_event(
    db: Session,
    *,
    event_type: str,
    target_type: str,
    actor_id: UUID | None = None,
    target_id: UUID | None = None,
    payload: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        actor_id=actor_id,
        event_type=event_type,
        target_type=target_type,
        target_id=target_id,
        payload=payload or {},
    )
    db.add(event)
    return event


def export_audit_csv(db: Session) -> str:
    logs = (
        db.query(WorkflowLog)
        .order_by(WorkflowLog.logged_at.asc())
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["log_id", "prompt_name", "version_number", "from_status", "to_status", "actor", "comment", "logged_at"])
    for log in logs:
        version = db.query(Version).filter(Version.version_id == log.version_id).first()
        prompt = db.query(Prompt).filter(Prompt.prompt_id == version.prompt_id).first() if version else None
        actor = db.query(User).filter(User.user_id == log.actor_id).first()
        writer.writerow([
            str(log.log_id),
            prompt.name if prompt else "",
            version.version_number if version else "",
            log.from_status or "",
            log.to_status,
            actor.username if actor else str(log.actor_id),
            log.comment or "",
            log.logged_at.isoformat() if log.logged_at else "",
        ])
    return output.getvalue()


def export_audit_events_csv(db: Session) -> str:
    events = db.query(AuditEvent).order_by(AuditEvent.created_at.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["audit_event_id", "event_type", "target_type", "target_id", "actor_id", "payload", "created_at"])
    for event in events:
        writer.writerow([
            str(event.audit_event_id),
            event.event_type,
            event.target_type,
            str(event.target_id or ""),
            str(event.actor_id or ""),
            event.payload,
            event.created_at.isoformat() if event.created_at else "",
        ])
    return output.getvalue()
