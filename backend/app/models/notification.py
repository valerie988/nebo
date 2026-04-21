from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from app.core.database import Base # Or wherever your Base is defined
from datetime import datetime, timezone

class Notification(Base):
    __tablename__ = "notifications"
    
    # FIX: Add (36) or (255) to the String types
    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String(255))
    
    # Text usually doesn't need a length, but String/VARCHAR does
    message = Column(Text) 
    
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))