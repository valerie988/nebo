from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone # <-- Make sure timezone is imported
from app.core.database import Base

# ADD THIS HELPER FUNCTION AT THE TOP:
def utcnow():
    return datetime.now(timezone.utc)

class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title      = Column(String(150), nullable=False)
    message    = Column(String(500), nullable=False)
    type       = Column(String(50), default="order")
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user       = relationship("User", back_populates="notifications")