import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.core.database import get_db
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)
from app.core.config import settings
from app.models.user import User, RefreshToken
from app.schemas.schemas import (
    SignupRequest, LoginRequest, TokenResponse,
    RefreshRequest, VerifyEmailRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserOut
)

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def utcnow():
    return datetime.now(timezone.utc)


#  Signup 
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Check duplicate email
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=body.full_name,
        email=body.email,
        hashed_password=pwd_ctx.hash(body.password[:72]),
        phone=body.phone,
        role=body.role,
        location=body.location,
        is_active=True,  
        is_verified=False,
    )
    db.add(user)
    db.flush()  # get user.id before commit

    db.refresh(user)

    # Issue tokens immediately (user can use app but sees "verify" banner)
    access  = create_access_token({"sub": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.id})

    rt = RefreshToken(
        token=refresh,
        user_id=user.id,
        expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        role=user.role,
        user_id=user.id,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not pwd_ctx.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access  = create_access_token({"sub": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.id})

    rt = RefreshToken(
        token=refresh,
        user_id=user.id,
        expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        role=user.role, 
        user_id=user.id,
    )

#  Refresh Token 
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    rt = db.query(RefreshToken).filter(
        RefreshToken.token == body.refresh_token,
        RefreshToken.revoked == False,
    ).first()

    if not rt or rt.expires_at < utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: revoke old, issue new
    rt.revoked = True

    new_access  = create_access_token({"sub": user.id, "role": user.role})
    new_refresh = create_refresh_token({"sub": user.id})

    new_rt = RefreshToken(
        token=new_refresh,
        user_id=user.id,
        expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    db.commit()

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        role=user.role,
        user_id=user.id,
    )

# ─── Logout ───────────────────────────────────────────────────────────────────
@router.post("/logout")
def logout(
    body: RefreshRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(RefreshToken).filter(
        RefreshToken.token == body.refresh_token,
        RefreshToken.user_id == current_user.id,
    ).update({"revoked": True})
    db.commit()
    return {"message": "Logged out successfully"}


# ─── Me ───────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user