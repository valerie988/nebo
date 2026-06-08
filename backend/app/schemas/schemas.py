from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ── Enums ─────────────────────────────────────────────────────────────────────

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

# ── 1. Helper/Nested Schemas (Must be defined first) ──────────────────────────

class OrderProductInfo(BaseModel):
    name: str
    image_url: Optional[str] = None 
    
    class Config:
        from_attributes = True

class OrderFarmerInfo(BaseModel):
    full_name: str
    location: Optional[str]

    class Config:
        from_attributes = True

# ── 2. Auth & User Schemas ─────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=8, max_length=72)
    phone: Optional[str] = None
    role: UserRole
    location: Optional[str] = None  

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8: raise ValueError("Password must be at least 8 characters")
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
    role: UserRole

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
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
        if len(v) < 8: raise ValueError("Password must be at least 8 characters")
        return v

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

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    model_config = {"extra": "ignore"}

# ── 3. Product Schemas ─────────────────────────────────────────────────────────

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

# ── 4. Order Schemas ──────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    quantity: int
    unit_price: float
    product: OrderProductInfo
    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: str
    customer_id: str
    farmer_id: str
    total_amount: float
    status: str
    created_at: datetime
    farmer: OrderFarmerInfo
    order_items: List[OrderItemOut] = [] 
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    product_id: str
    product_name: str
    farmer_id: str
    items: str
    total_amount: float
    quantity: int

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    reason: Optional[str] = None

# ── 5. Chat Schemas ───────────────────────────────────────────────────────────

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

# ── 6. Notification Schemas ───────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id:         int
    title:      str
    message:    str
    data:       dict
    is_read:    bool
    created_at: datetime  # Fixed: changed from datetime.datetime to datetime

    class Config:
        from_attributes = True

class UnreadCountResponse(BaseModel):
    count: int