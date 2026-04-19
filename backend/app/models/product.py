import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

# --- Helpers ---
def gen_uuid():
    return str(uuid.uuid4())

def utcnow():
    return datetime.now(timezone.utc)

# --- Product Model ---
class Product(Base):
    __tablename__ = "products"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    farmer_id   = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(200), nullable=False)
    category    = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    price       = Column(Float, nullable=False)
    unit        = Column(String(20), nullable=False)
    quantity    = Column(Float, nullable=False)
    location    = Column(String(255), nullable=False)
    photos      = Column(JSON, default=list)    # list of URLs
    in_stock    = Column(Boolean, default=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), default=utcnow)
    updated_at  = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    farmer      = relationship("User", back_populates="products")
