import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def gen_uuid():
    return str(uuid.uuid4())


#  User 
class User(Base):
    __tablename__ = "users"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    full_name       = Column(String(120), nullable=False)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone           = Column(String(20), nullable=True)
    role            = Column(Enum("farmer", "customer"), nullable=False)
    location        = Column(String(255), nullable=True)   # farmers only
    avatar_url = Column(String, nullable=True, default="https://via.placeholder.com/150")
    is_active       = Column(Boolean, default=False)       # activated via email
    is_verified     = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), default=utcnow)
    updated_at      = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    products      = relationship("Product", back_populates="farmer")
    refresh_tokens  = relationship("RefreshToken", back_populates="user", cascade="all, delete")


#  Refresh Token 
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id         = Column(String(36), primary_key=True, default=gen_uuid)
    token      = Column(String(512), unique=True, nullable=False, index=True)
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="refresh_tokens")



