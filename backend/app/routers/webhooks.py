from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Capability
from app.dependencies import require_capability
from app.models.user import User
from app.models.webhook import WebhookDelivery, WebhookEndpoint
from app.schemas.webhook import (
    WebhookDeliveryOut,
    WebhookEndpointCreate,
    WebhookEndpointOut,
    WebhookEndpointUpdate,
)
from app.services.webhook_delivery import attempt_delivery, retry_pending_deliveries
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.get("", response_model=list[WebhookEndpointOut])
def list_webhooks(db: Session = Depends(get_db), _: User = Depends(require_capability(Capability.DEPLOYMENT_MANAGE))):
    return db.query(WebhookEndpoint).order_by(WebhookEndpoint.created_at.desc()).all()


@router.post("", response_model=WebhookEndpointOut, status_code=status.HTTP_201_CREATED)
def create_webhook(
    body: WebhookEndpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability(Capability.DEPLOYMENT_MANAGE)),
):
    endpoint = WebhookEndpoint(
        name=body.name,
        url=str(body.url),
        secret=body.secret,
        event_type=body.event_type,
        is_active=body.is_active,
        created_by=current_user.user_id,
    )
    db.add(endpoint)
    db.flush()
    record_audit_event(
        db,
        event_type="webhook_endpoint.changed",
        target_type="webhook_endpoint",
        target_id=endpoint.webhook_id,
        actor_id=current_user.user_id,
        payload={"name": body.name, "is_active": body.is_active},
    )
    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.patch("/{webhook_id}", response_model=WebhookEndpointOut)
def update_webhook(
    webhook_id: UUID,
    body: WebhookEndpointUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability(Capability.DEPLOYMENT_MANAGE)),
):
    endpoint = db.query(WebhookEndpoint).filter(WebhookEndpoint.webhook_id == webhook_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(endpoint, field, str(value) if field == "url" else value)
    record_audit_event(
        db,
        event_type="webhook_endpoint.changed",
        target_type="webhook_endpoint",
        target_id=endpoint.webhook_id,
        actor_id=_.user_id,
        payload=body.model_dump(exclude_none=True),
    )
    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.get("/deliveries", response_model=list[WebhookDeliveryOut])
def list_deliveries(db: Session = Depends(get_db), _: User = Depends(require_capability(Capability.DEPLOYMENT_MANAGE))):
    return db.query(WebhookDelivery).order_by(WebhookDelivery.created_at.desc()).limit(100).all()


@router.post("/deliveries/{delivery_id}/retry", response_model=WebhookDeliveryOut)
def retry_delivery(delivery_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_capability(Capability.DEPLOYMENT_MANAGE))):
    delivery = db.query(WebhookDelivery).filter(WebhookDelivery.delivery_id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Webhook delivery not found")
    if delivery.status == "Delivered":
        raise HTTPException(status_code=400, detail="Delivery already succeeded")
    result = attempt_delivery(db, delivery)
    record_audit_event(
        db,
        event_type="webhook_delivery.retried",
        target_type="webhook_delivery",
        target_id=delivery.delivery_id,
        actor_id=_.user_id,
    )
    db.commit()
    return result


@router.post("/retry-pending", response_model=list[WebhookDeliveryOut])
def retry_pending(db: Session = Depends(get_db), _: User = Depends(require_capability(Capability.DEPLOYMENT_MANAGE))):
    return retry_pending_deliveries(db)
