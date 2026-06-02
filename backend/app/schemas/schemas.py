from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum  # Clean import statement


# ── Enums ─────────────────────────────────────────────────────────────────────

# FIXED: Changed from enum.Enum to Enum to match your import statement
class UserRole(str, Enum):
    FARMER = "farmer"
    CUSTOMER = "customer"
    ADMIN = "admin" 


class OrderStatus(str, Enum):
    processing = "processing"
    confirmed  = "confirmed"
    in_transit = "in_transit"
    delivered  = "delivered"
    cancelled  = "cancelled"


# ── Auth schemas ──────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=8, max_length=72)
    phone: Optional[str] = None
    role: UserRole  # FIXED: Changed from 'Role' to 'UserRole'
    location: Optional[str] = None  

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("location")
    @classmethod
    def location_required_for_farmer(cls, v, info):
        if info.data.get("role") == "farmer" and not v:
            raise ValueError("Location is required for farmers")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str
    role: UserRole  # FIXED: Changed from 'Role' to 'UserRole'


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole  # FIXED: Changed from 'Role' to 'UserRole'
    user_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# 1. Define the Base Class FIRST
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

# 2. Define the Subclass SECOND
class UserOutWithStats(UserOut):
    total_products: int = 0
    total_orders: int = 0
    
    model_config = {"from_attributes": True}

# ── User schemas ──────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str]
    role: UserRole  # FIXED: Changed from 'Role' to 'UserRole'
    location: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None # Add this!

    model_config = {"extra": "ignore"}


class UserOutWithStats(UserOut):
    total_products: int
    total_orders: int


# ── Product schemas ───────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: str
    farmer_id: str
    name: str
    category: str
    description: Optional[str]
    price: float
    unit: str
    quantity: float
    location: str
    photos: List[str]
    in_stock: bool
    is_active: bool
    created_at: datetime
    farmer: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    location: Optional[str] = None
    in_stock: Optional[bool] = None


# ── Order schemas ─────────────────────────────────────────────────────────────

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    price: float


class OrderCreate(BaseModel):
    farmer_id: str
    items: List[OrderItem]
    total_amount: float
    delivery_address: Optional[str] = None


class OrderOut(BaseModel):
    id: str
    customer_id: str
    farmer_id: str
    total_amount: float
    status: str
    items: List[OrderItem]
    created_at: datetime

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str


# ── Chat schemas ──────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    receiver_id: str
    text: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    receiver_id: str
    text: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    participant_one: str
    participant_two: str
    updated_at: datetime
    messages: List[MessageOut] = []

    model_config = {"from_attributes": True}