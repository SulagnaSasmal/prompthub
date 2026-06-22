from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Capability, allowed_roles_for, has_capability, parse_roles
from app.core.security import decode_token
from app.models.user import User
from app.services.audit_service import record_audit_event

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.user_id == user_uuid, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: str):
    def checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        user_roles = parse_roles(current_user.roles)
        if not user_roles.intersection(roles):
            _record_permission_denied(db, current_user, "role", {"required_roles": list(roles)})
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(sorted(roles))}",
            )
        return current_user
    return checker


def require_capability(capability: Capability):
    def checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if not has_capability(current_user.roles, capability):
            required_roles = sorted(allowed_roles_for(capability))
            _record_permission_denied(
                db,
                current_user,
                str(capability),
                {"required_roles": required_roles},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required capability: {capability}. Roles: {', '.join(required_roles)}",
            )
        return current_user
    return checker


def _record_permission_denied(db: Session, user: User, action: str, payload: dict) -> None:
    record_audit_event(
        db,
        event_type="permission.denied",
        target_type="access_control",
        actor_id=user.user_id,
        payload={"action": action, **payload},
    )
    db.commit()
