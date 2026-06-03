from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="processing")
    created_at = Column(DateTime, default=datetime.utcnow)

    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    farmer_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    customer = relationship("User", foreign_keys=[customer_id])
    farmer = relationship("User", foreign_keys=[farmer_id])

    order_items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    product = relationship("Product")
    order = relationship("Order", back_populates="order_items")