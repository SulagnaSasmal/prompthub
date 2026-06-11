from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.services.audit_service import export_audit_csv

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("/export", response_class=PlainTextResponse)
def export_audit(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("approver")),
):
    csv_data = export_audit_csv(db)
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )
