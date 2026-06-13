
import json
import uuid
from datetime  import datetime, timezone, timedelta
from typing    import Dict, List, Optional

from fastapi   import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic  import BaseModel
from sqlalchemy.orm import Session

# ── Match YOUR import style exactly ──────────────────────────────────────────
from app.core.database  import get_db          # adjust if different
from app.core.security  import get_current_user # adjust if different
from app.core.config    import settings         # adjust if different
from app.models.user    import User             # adjust to your user model path
from app.models.chat    import Conversation, Message   # ← new models file

chat_router = APIRouter(prefix="/chat", tags=["chat"])

THREE_DAYS = timedelta(days=3)

 
def utcnow():
    return datetime.now(timezone.utc)

def _get_or_create_convo(
    db: Session, user_id: str, receiver_id: str, convo_id: Optional[str]
) -> Conversation:
    if convo_id:
        c = db.query(Conversation).filter(Conversation.id == convo_id).first()
        if c: return c

    c = db.query(Conversation).filter(
        ((Conversation.participant_one == user_id)     & (Conversation.participant_two == receiver_id)) |
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

def _purge_old_messages(db: Session):
    cutoff = utcnow() - THREE_DAYS
    db.query(Message).filter(Message.created_at < cutoff).delete(synchronize_session=False)
    db.commit()


# ── WebSocket ─────────────────────────────────────────────────────────────────

@chat_router.websocket("/ws/{token}")
async def websocket_endpoint(ws: WebSocket, token: str, db: Session = Depends(get_db)):
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

    try:
        while True:
            raw  = await ws.receive_text()
            data = json.loads(raw)
            if data.get("type") != "message": continue

            receiver_id = (data.get("receiver_id") or "").strip()
            text        = (data.get("text")        or "").strip()
            local_id    = data.get("local_id", "")
            convo_id    = data.get("conversation_id")

            if not text or not receiver_id: continue

            receiver = db.query(User).filter(User.id == receiver_id).first()
            if not receiver:
                await ws.send_json({"type": "error", "detail": "Receiver not found"})
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
            convo.updated_at = utcnow()
            db.commit()
            db.refresh(msg)

            # Confirm to sender
            await ws.send_json({
                "type":            "delivered",
                "local_id":        local_id,
                "message_id":      msg.id,
                "conversation_id": convo.id,
            })

            # Deliver to receiver
            delivered = await manager.send_to(receiver_id, {
                "type":            "message",
                "id":              msg.id,
                "conversation_id": convo.id,
                "sender_id":       user_id,
                "sender_name":     user.full_name,
                "sender_role":     user.role,
                "receiver_id":     receiver_id,
                "receiver_name":   receiver.full_name,
                "text":            text,
                "created_at":      msg.created_at.isoformat(),
                "read":            False,
            })

            # Push notification if offline
            if not delivered and hasattr(receiver, "push_token") and receiver.push_token:
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
                except: pass

    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)
    finally:
        manager.disconnect(user_id, ws)


# ── REST: conversations list ──────────────────────────────────────────────────

@chat_router.get("/conversations")
def get_conversations(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
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
        # other_id is whoever is NOT the current user
        other_id   = c.participant_two if c.participant_one == current_user.id else c.participant_one
        other_user = db.query(User).filter(User.id == other_id).first()

        last_msg = (
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
            "updated_at":      c.updated_at.isoformat() if c.updated_at else None,
            "other_id":        other_id,                                    # ← mobile uses this
            "other_name":      other_user.full_name if other_user else "Unknown",  # ← mobile uses this
            "other_role":      other_user.role      if other_user else "customer", # ← mobile uses this
            "last_message":    last_msg.text         if last_msg   else "",
            "unread_count":    unread,
        })

    return result


# ── REST: create conversation ─────────────────────────────────────────────────

@chat_router.post("/conversations")
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
        "updated_at":      c.updated_at.isoformat() if c.updated_at else None,
        "other_id":        rid,
        "other_name":      other_user.full_name if other_user else None,
        "other_role":      other_user.role      if other_user else "customer",
        "last_message":    "",
        "unread_count":    0,
    }


# ── REST: messages for a conversation ────────────────────────────────────────

@chat_router.get("/conversations/{conversation_id}/messages")
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
        except: pass

    msgs = q.order_by(Message.created_at.asc()).all()

    return [{
        "id":              m.id,
        "conversation_id": m.conversation_id,
        "sender_id":       m.sender_id,
        "sender_name":     m.sender.full_name if m.sender else "",
        "receiver_id":     m.receiver_id,
        "text":            m.text,
        "read":            m.read,
        "created_at":      m.created_at.isoformat(),
    } for m in msgs]


# ── REST: mark as read ────────────────────────────────────────────────────────

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


# ── REST: offline sync ────────────────────────────────────────────────────────

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
    synced = []
    for item in body.messages:
        text        = (item.text        or "").strip()
        receiver_id = (item.receiver_id or "").strip()
        if not text or not receiver_id: continue

        existing = db.query(Message).filter(Message.id == item.id).first()
        if existing:
            synced.append({"local_id": item.id, "server_id": existing.id})
            continue

        convo = _get_or_create_convo(db, current_user.id, receiver_id, item.conversation_id)

        try:    ts = datetime.fromisoformat(item.created_at) if item.created_at else utcnow()
        except: ts = utcnow()

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
        convo.updated_at = utcnow()
        db.commit()
        db.refresh(msg)

        recv = db.query(User).filter(User.id == receiver_id).first()
        await manager.send_to(receiver_id, {
            "type":            "message",
            "id":              msg.id,
            "conversation_id": convo.id,
            "sender_id":       current_user.id,
            "sender_name":     current_user.full_name,
            "sender_role":     current_user.role,
            "receiver_id":     receiver_id,
            "receiver_name":   recv.full_name if recv else "",
            "text":            text,
            "created_at":      msg.created_at.isoformat(),
            "read":            False,
        })
        synced.append({"local_id": item.id, "server_id": msg.id})

    return {"synced": synced}