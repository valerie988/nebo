import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Enum, JSON, Integer
)
from sqlalchemy.orm import relationship
from app.core.database import Base

# --- Helper Functions ---
def utcnow():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())


# --- User Model ---
class User(Base):
    __tablename__ = "users"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    full_name       = Column(String(120), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone           = Column(String(20), nullable=True)
    role = Column(Enum("farmer", "customer", "admin"), nullable=False)
    location        = Column(String(255), nullable=True)   # farmers only
    avatar_url      = Column(String(500), nullable=True)
    is_active       = Column(Boolean, default=False)       # activated via email
    is_verified     = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), default=utcnow)
    updated_at      = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    is_banned       = Column(Boolean, default=False)
    badges          = Column(JSON, default=list)
    push_token      = Column(String(500), nullable=True)

    # Relationships
    products        = relationship("Product", back_populates="farmer", cascade="all, delete-orphan")
    refresh_tokens  = relationship("RefreshToken", back_populates="user", cascade="all, delete")
    notifications   = relationship("Notification", back_populates="user", cascade="all, delete")


# --- Refresh Token Model ---
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id         = Column(String(36), primary_key=True, default=gen_uuid)
    token      = Column(String(512), unique=True, nullable=False, index=True)
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    user       = relationship("User", back_populates="refresh_tokens")



