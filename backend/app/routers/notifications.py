import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.notification import Notification
from app.core.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

# -----------------------------------------
# PYDANTIC RESPONSE SCHEMAS
# -----------------------------------------
class NotificationOut(BaseModel):
    id: int  
    user_id: str
    title: str
    message: str
    is_read: bool
    created_at: datetime.datetime  

    class Config:
        from_attributes = True  

class UnreadCountResponse(BaseModel):
    count: int


# -----------------------------------------
# ENDPOINTS
# -----------------------------------------

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all notifications for the current user, newest first."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Badge count calculation for unread notifications."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .count()
    )
    return {"count": count}


@router.patch("/read-all")
def mark_all_read(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark every notification in the current user's feed as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    
    db.commit()
    return {"ok": True}


@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,  
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single targeted notification item as read."""
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Notification not found"
        )

    notif.is_read = True
    db.commit()
    return {"ok": True}


@router.delete("")
def clear_all_notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Wipe out the entire inbox history for the active user session."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"ok": True}


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: int,  
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a single specific notification safely from the database feed."""
    # ✅ FIXED: Realigned indentation to remain inside function context scope
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Notification not found"
        )

    db.delete(notif)
    db.commit()
    return {"ok": True}