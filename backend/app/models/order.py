import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    customer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    farmer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    total_amount = Column(Float, nullable=False)
    status = Column(Enum("processing", "confirmed", "shipped", "delivered", "cancelled"), default="processing")
    delivery_address = Column(String(500), nullable=True)
    
    # Store items as JSON for simplicity, or create an OrderItem table for more detail
    items = Column(JSON, nullable=False) 
    
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    farmer = relationship("User", foreign_keys=[farmer_id])