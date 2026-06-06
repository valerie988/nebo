from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from typing import List
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone
import uuid
import asyncio

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import OrderOut, OrderCreate, OrderStatusUpdate
from app.models.order import Order, OrderItem
from app.core.ws_manager import manager

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


@router.get("/farmer", response_model=List[OrderOut])
async def get_farmer_orders(
    db: Session = Depends(get_db),
    current_farmer=Depends(get_current_user)
):
    # Print these to your terminal to compare them
    print(f"DEBUG: Querying orders for farmer_id: {current_farmer.id}")
    
    # Force conversion to string for comparison
    orders = db.query(Order).filter(Order.farmer_id == str(current_farmer.id)).all()
    
    return orders

@router.get("/{order_id}", response_model=OrderOut)
async def get_order_detail(order_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
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
    # Create the Order header without passing invalid fields
    new_order = Order(
        id=str(uuid.uuid4()),
        customer_id=current_user.id,
        farmer_id=payload.farmer_id,
        total_amount=payload.total_amount,
        status="processing",
        created_at=datetime.now(timezone.utc)
    )

    db.add(new_order)
    db.flush()  # Ensures new_order.id is generated for the OrderItem link

    # Create the related OrderItem
    new_item = OrderItem(
        id=str(uuid.uuid4()),
        order_id=new_order.id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        unit_price=payload.total_amount / payload.quantity
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_order)

    return new_order

@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    update_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_farmer=Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.farmer_id != current_farmer.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # FIX: Extract the string value if update_data.status is an Enum
    status_value = update_data.status.value if hasattr(update_data.status, "value") else update_data.status
    order.status = status_value

    db.commit()
    db.refresh(order)

    asyncio.create_task(manager.broadcast({
        "type": "order_updated",
        "order_id": order.id,
        "status": order.status,
        "customer_id": order.customer_id,
        "farmer_id": order.farmer_id
    }))
    return order

@router.delete("/{order_id}")
async def delete_order(order_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}
    
@router.websocket("/ws/orders")
async def orders_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)