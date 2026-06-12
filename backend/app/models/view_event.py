from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class ViewEvent(Base):
    __tablename__ = "view_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)

    viewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    dwell_seconds = Column(Integer, default=0)

    user = relationship("User", lazy="select")
    product = relationship("Product", lazy="select")