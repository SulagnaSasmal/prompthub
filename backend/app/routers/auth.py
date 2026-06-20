import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordOut,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserOut,
)
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_attempts: dict[str, list[datetime]] = {}


def _rate_limit(key: str) -> None:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=1)
    recent = [ts for ts in _attempts.get(key, []) if ts > window_start]
    if len(recent) >= settings.auth_rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again shortly.")
    recent.append(now)
    _attempts[key] = recent


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        roles=body.roles,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    _rate_limit(f"login:{body.username.lower()}")
    user = db.query(User).filter(User.username == body.username, User.is_active.is_(True)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.user_id), "roles": user.roles})
    return Token(access_token=token)


@router.post("/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    _rate_limit(f"reset:{body.email.lower()}")
    user = db.query(User).filter(User.email == body.email, User.is_active.is_(True)).first()
    message = "If an account exists for that email, a password reset link has been created."
    if not user:
        record_audit_event(db, event_type="password_reset.requested", target_type="user", payload={"email": body.email, "matched": False})
        db.commit()
        return ForgotPasswordOut(message=message)

    raw_token = secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        user_id=user.user_id,
        token_hash=_hash_reset_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(reset)
    record_audit_event(db, event_type="password_reset.requested", target_type="user", target_id=user.user_id, payload={"email": body.email, "matched": True})
    db.commit()
    return ForgotPasswordOut(message=message, reset_token=raw_token if settings.expose_reset_token else None)


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    reset = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == _hash_reset_token(body.token),
            PasswordResetToken.used_at.is_(None),
        )
        .first()
    )
    if not reset or _as_aware(reset.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")
    user = db.query(User).filter(User.user_id == reset.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")
    user.hashed_password = hash_password(body.new_password)
    reset.used_at = datetime.now(timezone.utc)
    record_audit_event(db, event_type="password_reset.completed", target_type="user", target_id=user.user_id)
    db.commit()
    return {"message": "Password updated. You can sign in with the new password."}


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
