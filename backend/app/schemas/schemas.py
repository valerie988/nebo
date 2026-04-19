from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums 
class Role(str, Enum):
    farmer   = "farmer"
    customer = "customer"


class OrderStatus(str, Enum):
    processing = "processing"
    confirmed  = "confirmed"
    in_transit = "in_transit"
    delivered  = "delivered"
    cancelled  = "cancelled"


# Auth schemas 
class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=8, max_length=72)
    phone: Optional[str] = None
    role: Role
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
    role: Role


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: Role
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


#  User schemas 
class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str]
    role: Role
    location: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


#  Product schemas 
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


#  Order schemas 
class OrderItemIn(BaseModel):
    product_id: str
    quantity: float


class OrderCreate(BaseModel):
    items: List[OrderItemIn]
    delivery_address: Optional[str] = None
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    product_id: str
    quantity: float
    unit_price: float
    product: Optional[ProductOut] = None

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: str
    customer_id: str
    farmer_id: str
    status: OrderStatus
    total_amount: float
    delivery_address: Optional[str]
    notes: Optional[str]
    created_at: datetime
    items: List[OrderItemOut] = []
    customer: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


#  Chat schemas 
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