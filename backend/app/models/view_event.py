
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid(): return str(uuid.uuid4())
def utcnow():   return datetime.now(timezone.utc)

class ViewEvent(Base):
    __tablename__ = "view_events"
    id         = Column(String(36), primary_key=True, default=gen_uuid)
    user_id    = Column(String(36), ForeignKey("users.id",    ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    viewed_at  = Column(DateTime(timezone=True), default=utcnow, index=True)
    user       = relationship("User",    foreign_keys=[user_id])
    product    = relationship("Product", foreign_keys=[product_id])