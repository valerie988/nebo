import uuid
import datetime
import logging
from typing import Optional

from exponent_server_sdk import (
    PushClient,
    PushMessage,
    PushServerError,
    DeviceNotRegisteredError,
    PushTicketError,
)
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

# Singleton Expo push client
_client = PushClient()

def send_push(
    db: Session,
    recipient_user_id: str,
    nebo_token: Optional[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> None:
   
    if data is None:
        data = {}

    # ── 1. Persist to DB (inbox) ──────────────────────────────────────────
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=recipient_user_id,
        title=title,
        body=body,
        data=data,
        is_read=False,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # ── 2. Send Expo push ────────────────────────────────────────────────
    if not nebo_token or not nebo_token.startswith("ExponentPushToken"):
        logger.warning(
            f"No valid push token for user {recipient_user_id}. "
            "Notification saved to inbox only."
        )
        return

    try:
        response = _client.publish(
            PushMessage(
                to=nebo_token,
                title=title,
                body=body,
                data=data,
                sound="default",
                priority="high",
                channel_id="default",       # Android 8+ channel
            )
        )
        response.validate_response()
        logger.info(f"Push sent to {recipient_user_id}: {title}")

    except DeviceNotRegisteredError:
        # Token expired or revoked — clear it from the DB
        logger.warning(f"Token expired for user {recipient_user_id}. Clearing.")
        user = db.query(User).filter(User.id == recipient_user_id).first()
        if user:
            user.expo_push_token = None
            db.commit()

    except PushServerError as e:
        logger.error(f"Expo push server error for user {recipient_user_id}: {e}")

    except PushTicketError as e:
        logger.error(f"Push ticket error for user {recipient_user_id}: {e.push_response}")

    except Exception as e:
        logger.error(f"Unexpected push error for user {recipient_user_id}: {e}")


# ─────────────────────────────────────────────
#  High-level helpers (used by routers)
# ─────────────────────────────────────────────

def notify_farmer_new_order(
    db: Session,
    farmer: User,
    product_name: str,
    customer_name: str,
    order_id: str,
) -> None:
    """Notify a farmer that a customer placed a new order."""
    send_push(
        db=db,
        recipient_user_id=farmer.id,
        nebo_token=farmer.expo_push_token,
        title="New Order! 🛒",
        body=f"{customer_name} ordered {product_name}",
        data={
            "type": "new_order",
            "order_id": order_id,
            "product_name": product_name,
        },
    )


def notify_customer_status_update(
    db: Session,
    customer: User,
    product_name: str,
    new_status: str,
    order_id: str,
) -> None:
    """Notify a customer that their order status changed."""
    STATUS_LABELS = {
        "confirmed":  "confirmed ✅",
        "in_transit": "in transit 🚚",
        "delivered":  "delivered 🎉",
        "cancelled":  "cancelled ❌",
    }
    label = STATUS_LABELS.get(new_status, new_status)

    send_push(
        db=db,
        recipient_user_id=customer.id,
        nebo_token=customer.expo_push_token,
        title="Order Update 📦",
        body=f"Your order for {product_name} is now {label}",
        data={
            "type": "order_status",
            "order_id": order_id,
            "status": new_status,
            "product_name": product_name,
        },
    )
