"""
chat_router.py
─────────────────────────────────────────────────────────────────────────────
Real-time WebSocket chat + REST fallback.
Messages older than 3 days are auto-deleted on every conversation fetch.

Add to your main.py:
  from app.routers.chat_router import chat_router
  app.include_router(chat_router, prefix="/api")

Required User model fields:
  push_token = Column(String(500), nullable=True)  # for offline push delivery
"""

import json
import uuid
from datetime  import datetime, timedelta
from typing    import Dict, List, Optional

from fastapi   import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic  import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config   import settings
from app.models.models import User, Message, Conversation

chat_router = APIRouter(prefix="/chat", tags=["chat"])

THREE_DAYS = timedelta(days=3)


# ── Connection manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(user_id, [])
        try: conns.remove(ws)
        except ValueError: pass
        if not conns:
            self.active.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))

    async def send_to(self, user_id: str, data: dict) -> bool:
        delivered = False
        dead      = []
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(data)
                delivered = True
            except Exception:
                dead.append(ws)
        for ws in dead:
            try: self.active.get(user_id, []).remove(ws)
            except ValueError: pass
        return delivered


manager = ConnectionManager()


# ── Helper: get or create conversation ───────────────────────────────────────

def _get_or_create_convo(
    db:          Session,
    user_id:     str,
    receiver_id: str,
    convo_id:    Optional[str],
) -> Conversation:
    if convo_id:
        c = db.query(Conversation).filter(Conversation.id == convo_id).first()
        if c: return c

    c = db.query(Conversation).filter(
        ((Conversation.participant_one == user_id)    & (Conversation.participant_two == receiver_id)) |
        ((Conversation.participant_one == receiver_id) & (Conversation.participant_two == user_id))
    ).first()

    if not c:
        c = Conversation(
            id              = str(uuid.uuid4()),
            participant_one = user_id,
            participant_two = receiver_id,
        )
        db.add(c)
        db.commit()
        db.refresh(c)

    return c


# ── Helper: auto-delete messages older than 3 days ───────────────────────────

def _purge_old_messages(db: Session):
    cutoff = datetime.utcnow() - THREE_DAYS
    db.query(Message).filter(Message.created_at < cutoff).delete()
    db.commit()


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@chat_router.websocket("/ws/{token}")
async def websocket_endpoint(
    ws:    WebSocket,
    token: str,
    db:    Session = Depends(get_db),
):
    """
    Connect:   ws(s)://your-api/api/chat/ws/<access_token>

    Client sends:
      { "type":"message", "receiver_id":"uuid", "text":"...",
        "conversation_id":"uuid|null", "local_id":"client-uuid" }

    Server sends to sender:
      { "type":"delivered", "local_id":"...", "message_id":"...", "conversation_id":"..." }

    Server sends to receiver:
      { "type":"message", "id":"...", "conversation_id":"...", "sender_id":"...",
        "sender_name":"...", "receiver_id":"...", "text":"...", "created_at":"..." }
    """
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        user    = db.query(User).filter(User.id == user_id).first()
        if not user:
            await ws.close(code=4001); return
    except JWTError:
        await ws.close(code=4001); return

    await manager.connect(user_id, ws)
    await _broadcast_status(user_id, True, db)

    try:
        while True:
            raw  = await ws.receive_text()
            data = json.loads(raw)

            if data.get("type") != "message":
                continue

            receiver_id = (data.get("receiver_id") or "").strip()
            text        = (data.get("text")        or "").strip()
            local_id    = data.get("local_id", "")
            convo_id    = data.get("conversation_id")

            if not text or not receiver_id:
                continue

            receiver = db.query(User).filter(User.id == receiver_id).first()
            if not receiver:
                await ws.send_json({"type":"error","detail":"Receiver not found"})
                continue

            convo = _get_or_create_convo(db, user_id, receiver_id, convo_id)

            msg = Message(
                id              = str(uuid.uuid4()),
                conversation_id = convo.id,
                sender_id       = user_id,
                receiver_id     = receiver_id,
                text            = text,
                read            = False,
            )
            db.add(msg)
            convo.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(msg)

            # Confirm to sender with real server ID
            await ws.send_json({
                "type":            "delivered",
                "local_id":        local_id,
                "message_id":      msg.id,
                "conversation_id": convo.id,
            })

            # Deliver to receiver if online
            delivered = await manager.send_to(receiver_id, {
                "type":            "message",
                "id":              msg.id,
                "conversation_id": convo.id,
                "sender_id":       user_id,
                "sender_name":     user.full_name,
                "receiver_id":     receiver_id,
                "text":            text,
                "created_at":      msg.created_at.isoformat(),
                "read":            False,
            })

            # Push notification if receiver is offline
            if not delivered and receiver.push_token:
                try:
                    from app.services.notification_service import send_push
                    import asyncio
                    asyncio.create_task(send_push(
                        token = receiver.push_token,
                        title = user.full_name,
                        body  = text[:100],
                        data  = {
                            "type":            "chat_message",
                            "conversation_id": convo.id,
                            "sender_id":       user_id,
                            "sender_name":     user.full_name,
                        },
                    ))
                except Exception:
                    pass

    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)
        await _broadcast_status(user_id, False, db)


async def _broadcast_status(user_id: str, online: bool, db: Session):
    convos = db.query(Conversation).filter(
        (Conversation.participant_one == user_id) |
        (Conversation.participant_two == user_id)
    ).all()
    for c in convos:
        contact = c.participant_two if c.participant_one == user_id else c.participant_one
        await manager.send_to(contact, {"type":"online_status","user_id":user_id,"online":online})


# ── Sync offline messages ─────────────────────────────────────────────────────

class SyncItem(BaseModel):
    id:              str
    receiver_id:     str
    text:            str
    conversation_id: Optional[str] = None
    created_at:      Optional[str] = None


class SyncRequest(BaseModel):
    messages: List[SyncItem]


@chat_router.post("/sync")
async def sync_offline(
    body:         SyncRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Mobile calls this on reconnect to flush messages composed offline."""
    synced = []

    for item in body.messages:
        text        = (item.text or "").strip()
        receiver_id = (item.receiver_id or "").strip()
        if not text or not receiver_id:
            continue

        # Idempotency — if this local ID was already synced, skip
        existing = db.query(Message).filter(Message.id == item.id).first()
        if existing:
            synced.append({"local_id": item.id, "server_id": existing.id})
            continue

        convo = _get_or_create_convo(db, current_user.id, receiver_id, item.conversation_id)

        try:
            ts = datetime.fromisoformat(item.created_at) if item.created_at else datetime.utcnow()
        except (ValueError, TypeError):
            ts = datetime.utcnow()

        msg = Message(
            id              = str(uuid.uuid4()),
            conversation_id = convo.id,
            sender_id       = current_user.id,
            receiver_id     = receiver_id,
            text            = text,
            read            = False,
            created_at      = ts,
        )
        db.add(msg)
        convo.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(msg)

        # Deliver via WS if receiver is online
        await manager.send_to(receiver_id, {
            "type":            "message",
            "id":              msg.id,
            "conversation_id": convo.id,
            "sender_id":       current_user.id,
            "sender_name":     current_user.full_name,
            "receiver_id":     receiver_id,
            "text":            text,
            "created_at":      msg.created_at.isoformat(),
            "read":            False,
        })

        synced.append({"local_id": item.id, "server_id": msg.id})

    return {"synced": synced}


# ── REST endpoints ────────────────────────────────────────────────────────────

class ConvoSchema(BaseModel):
    id:                   str
    participant_one:      str
    participant_two:      str
    updated_at:           datetime
    other_name:           Optional[str] = None
    last_message:         Optional[str] = None
    unread_count:         int           = 0
    model_config = {"from_attributes": True}


class MessageSchema(BaseModel):
    id:              str
    conversation_id: str
    sender_id:       str
    receiver_id:     str
    text:            str
    read:            bool
    created_at:      datetime
    model_config = {"from_attributes": True}


@chat_router.get("/conversations", response_model=List[ConvoSchema])
def get_conversations(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    # Purge old messages on every fetch
    _purge_old_messages(db)

    convos = (
        db.query(Conversation)
        .filter(
            (Conversation.participant_one == current_user.id) |
            (Conversation.participant_two == current_user.id)
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    result = []
    for c in convos:
        other_id   = c.participant_two if c.participant_one == current_user.id else c.participant_one
        other_user = db.query(User).filter(User.id == other_id).first()
        last_msg   = (
            db.query(Message)
            .filter(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread = db.query(Message).filter(
            Message.conversation_id == c.id,
            Message.receiver_id     == current_user.id,
            Message.read            == False,
        ).count()

        result.append({
            "id":              c.id,
            "participant_one": c.participant_one,
            "participant_two": c.participant_two,
            "updated_at":      c.updated_at,
            "other_name":      other_user.full_name if other_user else "Unknown",
            "last_message":    last_msg.text if last_msg else "",
            "unread_count":    unread,
        })

    return result


@chat_router.post("/conversations", response_model=ConvoSchema)
def create_conversation(
    body:         dict,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    rid = (body.get("receiver_id") or "").strip()
    if not rid:
        raise HTTPException(400, "receiver_id required")
    if rid == current_user.id:
        raise HTTPException(400, "Cannot chat with yourself")

    c          = _get_or_create_convo(db, current_user.id, rid, None)
    other_user = db.query(User).filter(User.id == rid).first()

    return {
        "id":              c.id,
        "participant_one": c.participant_one,
        "participant_two": c.participant_two,
        "updated_at":      c.updated_at,
        "other_name":      other_user.full_name if other_user else None,
        "last_message":    "",
        "unread_count":    0,
    }


@chat_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageSchema])
def get_messages(
    conversation_id: str,
    after:           Optional[str] = None,
    db:              Session       = Depends(get_db),
    current_user:    User          = Depends(get_current_user),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(404, "Conversation not found")
    if current_user.id not in [convo.participant_one, convo.participant_two]:
        raise HTTPException(403, "Not your conversation")

    # Mark as read
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id     == current_user.id,
        Message.read            == False,
    ).update({"read": True})
    db.commit()

    q = db.query(Message).filter(Message.conversation_id == conversation_id)
    if after:
        try:
            q = q.filter(Message.created_at > datetime.fromisoformat(after))
        except ValueError:
            pass

    return q.order_by(Message.created_at.asc()).all()


@chat_router.post("/conversations/{conversation_id}/read", status_code=204)
def mark_read(
    conversation_id: str,
    db:              Session = Depends(get_db),
    current_user:    User    = Depends(get_current_user),
):
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id     == current_user.id,
        Message.read            == False,
    ).update({"read": True})
    db.commit()
