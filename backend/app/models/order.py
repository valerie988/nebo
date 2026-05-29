from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, index=True)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="processing")
    created_at = Column(DateTime, default=datetime.utcnow)

    # 1. FIXED: You must explicitly define the ForeignKey columns so SQLAlchemy knows how to join
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    farmer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    customer = relationship("User", foreign_keys=[customer_id], backref="customer_orders")
    
    farmer = relationship("User", foreign_keys=[farmer_id], backref="farmer_orders")