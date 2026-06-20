import difflib
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models.version import Version
from app.models.webhook import WebhookDelivery, WebhookEndpoint

EVENT_PROMPT_PRODUCTION_DEPLOYED = "prompt.production_deployed"


def build_deployment_payload(version: Version, actor_id: UUID, previous_version: Version | None) -> dict:
    previous_text = previous_version.prompt_text if previous_version else ""
    current_text = version.prompt_text
    diff = list(
        difflib.unified_diff(
            previous_text.splitlines(keepends=True),
            current_text.splitlines(keepends=True),
            fromfile=f"previous-{previous_version.version_number}" if previous_version else "previous-none",
            tofile=f"current-{version.version_number}",
        )
    )
    prompt = version.prompt
    return {
        "event": EVENT_PROMPT_PRODUCTION_DEPLOYED,
        "prompt": {
            "prompt_id": str(prompt.prompt_id),
            "name": prompt.name,
            "description": prompt.description,
            "category": prompt.category,
            "subcategory": prompt.subcategory,
            "risk_level": prompt.risk_level,
            "target_model": prompt.target_model,
            "task_type": prompt.task_type,
            "tags": prompt.tags,
        },
        "version": {
            "version_id": str(version.version_id),
            "version_number": version.version_number,
            "status": "Production",
            "rendered_template": version.prompt_text,
            "change_summary": version.change_summary,
        },
        "previous_active_version": {
            "version_id": str(previous_version.version_id),
            "version_number": previous_version.version_number,
        }
        if previous_version
        else None,
        "diff": diff,
        "deployed_by": str(actor_id),
        "deployed_at": datetime.now(timezone.utc).isoformat(),
    }


def sign_payload(secret: str, payload_json: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()


def enqueue_deployment_webhooks(
    db: Session,
    version: Version,
    actor_id: UUID,
    previous_version: Version | None,
) -> list[WebhookDelivery]:
    endpoints = (
        db.query(WebhookEndpoint)
        .filter(
            WebhookEndpoint.is_active.is_(True),
            WebhookEndpoint.event_type == EVENT_PROMPT_PRODUCTION_DEPLOYED,
        )
        .all()
    )
    payload = build_deployment_payload(version, actor_id, previous_version)
    payload_json = json.dumps(payload, sort_keys=True)
    deliveries = [
        WebhookDelivery(
            webhook_id=endpoint.webhook_id,
            event_type=EVENT_PROMPT_PRODUCTION_DEPLOYED,
            payload_json=payload_json,
        )
        for endpoint in endpoints
    ]
    db.add_all(deliveries)
    db.commit()
    for delivery in deliveries:
        db.refresh(delivery)
        attempt_delivery(db, delivery)
    return deliveries


def attempt_delivery(db: Session, delivery: WebhookDelivery) -> WebhookDelivery:
    endpoint = delivery.endpoint
    signature = sign_payload(endpoint.secret, delivery.payload_json)
    headers = {
        "Content-Type": "application/json",
        "X-PromptHub-Event": delivery.event_type,
        "X-PromptHub-Delivery": str(delivery.delivery_id),
        "X-PromptHub-Signature-256": f"sha256={signature}",
    }
    delivery.attempt_count += 1
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(endpoint.url, content=delivery.payload_json, headers=headers)
        delivery.last_status_code = response.status_code
        if 200 <= response.status_code < 300:
            delivery.status = "Delivered"
            delivery.last_error = None
            delivery.next_retry_at = None
            delivery.delivered_at = datetime.now(timezone.utc)
        else:
            _mark_retry(delivery, f"HTTP {response.status_code}: {response.text[:500]}")
    except httpx.HTTPError as exc:
        _mark_retry(delivery, str(exc))
    db.commit()
    db.refresh(delivery)
    return delivery


def retry_pending_deliveries(db: Session) -> list[WebhookDelivery]:
    now = datetime.now(timezone.utc)
    deliveries = (
        db.query(WebhookDelivery)
        .filter(
            WebhookDelivery.status == "Pending",
            WebhookDelivery.next_retry_at <= now,
            WebhookDelivery.attempt_count < WebhookDelivery.max_attempts,
        )
        .all()
    )
    return [attempt_delivery(db, delivery) for delivery in deliveries]


def _mark_retry(delivery: WebhookDelivery, error: str):
    delivery.last_error = error
    if delivery.attempt_count >= delivery.max_attempts:
        delivery.status = "Failed"
        delivery.next_retry_at = None
        return
    delay_seconds = min(300, 2 ** delivery.attempt_count)
    delivery.status = "Pending"
    delivery.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
