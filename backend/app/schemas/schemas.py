from pydantic import BaseModel, Field, ValidationInfo, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ── Enums ─────────────────────────────────────────────────────────────────────
class UserRole(str, Enum):
    FARMER = "farmer"
    CUSTOMER = "customer"
    ADMIN = "admin"

# ── Schemas ───────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    role: UserRole
    location: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str]
    role: UserRole
    location: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class UserOutWithStats(UserOut):
    total_products: int
    total_orders: int