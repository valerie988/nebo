
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base   # ← adjust if your Base import path is different


def gen_uuid():
    return str(uuid.uuid4())

def utcnow():
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id              = Column(String(36),  primary_key=True, default=gen_uuid)
    participant_one = Column(String(36),  ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    participant_two = Column(String(36),  ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    updated_at      = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    created_at      = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    messages        = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    user_one        = relationship("User", foreign_keys=[participant_one])
    user_two        = relationship("User", foreign_keys=[participant_two])


class Message(Base):
    __tablename__ = "messages"

    id              = Column(String(36),  primary_key=True, default=gen_uuid)
    conversation_id = Column(String(36),  ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id       = Column(String(36),  ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    receiver_id     = Column(String(36),  ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    text            = Column(Text,        nullable=False)
    read            = Column(Boolean,     default=False)
    created_at      = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    conversation    = relationship("Conversation", back_populates="messages")
    sender          = relationship("User", foreign_keys=[sender_id])
    receiver        = relationship("User", foreign_keys=[receiver_id])