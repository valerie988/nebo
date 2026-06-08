from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import List
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone
import uuid
import asyncio
import secrets

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import OrderOut, OrderCreate, OrderStatusUpdate
from app.models.order import Order, OrderItem
from app.core.ws_manager import manager
from app.models.notification import Notification

router = APIRouter()

# -------------------------
# CUSTOMER ORDERS
# -------------------------
@router.get("", response_model=List[OrderOut])
async def get_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Order).options(
        joinedload(Order.farmer),
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).filter(Order.customer_id == current_user.id).all()


# -------------------------
# FARMER ORDERS
# -------------------------
@router.get("/farmer", response_model=List[OrderOut])
async def get_farmer_orders(
    db: Session = Depends(get_db),
    current_farmer=Depends(get_current_user)
):
    print(f"DEBUG: Querying orders for farmer_id: {current_farmer.id}")
    
    return db.query(Order).options(
        joinedload(Order.farmer),
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).filter(Order.farmer_id == str(current_farmer.id)).all()


# -------------------------
# ORDER DETAIL
# -------------------------
@router.get("/{order_id}", response_model=OrderOut)
async def get_order_detail(order_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).options(
        joinedload(Order.farmer),
        joinedload(Order.order_items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# -------------------------
# CREATE ORDER
# -------------------------
@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        # 1. Create the Order header record
        new_order = Order(
            id=str(uuid.uuid4()),
            customer_id=current_user.id,
            farmer_id=payload.farmer_id,
            total_amount=payload.total_amount,
            status="processing",
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_order)
        db.flush()  # Generates new_order.id securely for the item row

        # 2. Create the child OrderItem record
        new_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=new_order.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            unit_price=payload.total_amount / payload.quantity
        )
        db.add(new_item)

        # ✅ FIXED: Realigned to match function try/block indentation
        farmer_notification = Notification(
            user_id=payload.farmer_id, 
            title="New Order Received! 🌾",
            message=f"{current_user.full_name or 'A customer'} placed an order for {payload.quantity}x {payload.product_name}.",
            type="order",
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )
        db.add(farmer_notification)
        
        # 4. Commit transaction data atomically
        db.commit()

        # 5. Load relationships cleanly so Pydantic serializes response without crashing
        completed_order = db.query(Order).options(
            joinedload(Order.farmer),
            joinedload(Order.order_items).joinedload(OrderItem.product)
        ).filter(Order.id == new_order.id).first()

        # 6. Fire real-time WebSocket update task
        asyncio.create_task(manager.broadcast({
            "type": "new_order_created",
            "order_id": new_order.id,
            "farmer_id": payload.farmer_id
        }))

        return completed_order

    except Exception as e:
        db.rollback()
        print(f"❌ ORDER POST TRANSACTION FAILURE: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal database transaction failed: {str(e)}"
        )


# -------------------------
# UPDATE ORDER STATUS
# -------------------------
@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    update_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_farmer=Depends(get_current_user)
):
    try:
        order = db.query(Order).options(
            joinedload(Order.farmer),
            joinedload(Order.order_items).joinedload(OrderItem.product)
        ).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.farmer_id != current_farmer.id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Resolve enum vs raw string parameters
        status_value = update_data.status.value if hasattr(update_data.status, "value") else update_data.status
        order.status = status_value

        # Locate product descriptor context fields safely
        product_name = "Your ordered items"
        if order.order_items and order.order_items[0].product:
            product_name = order.order_items[0].product.name

        # Create persistent database history row for customer
        status_clean = status_value.replace("_", " ").title()
        
        # ✅ FIXED: Realigned to match function try/block indentation
        customer_notification = Notification(
            user_id=order.customer_id,
            title=f"Order Update: {status_clean}!",
            message=f"Your order for '{product_name}' has been marked as {status_value.replace('_', ' ')}.",
            type="order",
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )
        db.add(customer_notification)
        
        db.commit()
        db.refresh(order)

        # Broadcast optional socket message update context
        asyncio.create_task(manager.broadcast({
            "type": "order_updated",
            "order_id": order.id,
            "status": order.status,
            "customer_id": order.customer_id,
            "farmer_id": order.farmer_id
        }))
        
        return order

    except Exception as e:
        db.rollback()
        print(f"❌ ORDER PATCH TRANSACTION FAILURE: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal status transaction failed: {str(e)}"
        )


# -------------------------
# DELETE ORDER
# -------------------------
@router.delete("/{order_id}")
async def delete_order(order_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}
    

# -------------------------
# WEBSOCKETS
# -------------------------
@router.websocket("/ws/orders")
async def orders_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)