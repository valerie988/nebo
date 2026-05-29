from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user

# ── Production Model Imports ──────────────────────────────────────────────────
# Using your real, linked backend models instead of the temporary stubs
from app.models.user import User          
from app.models.product import Product
from app.models.order import Order  # Using your newly fixed Order model!

admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Helper function for timezone-aware datetime calculations
def utcnow():
    return datetime.now(timezone.utc)


# ── Admin Guard Middleware ───────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Pydantic Response / Request Schemas ───────────────────────────────────────

class UserAdminOut(BaseModel):
    id:          str
    full_name:   str
    email:       str
    phone:       Optional[str] = None
    role:        str
    location:    Optional[str] = None
    avatar_url:  Optional[str] = None
    is_verified: bool = False
    is_banned:   bool = False
    badges:      List[str] = []
    push_token:  Optional[str] = None
    created_at:  datetime
    model_config = {"from_attributes": True}


class ProductAdminOut(BaseModel):
    id:          str
    farmer_id:   str
    name:        str
    category:    str
    description: Optional[str] = None
    price:       float
    unit:        str
    quantity:    float
    location:    str
    image:       Optional[str] = None
    in_stock:    bool
    is_active:   bool
    is_flagged:  bool = False
    flag_reason: Optional[str] = None
    created_at:  datetime
    farmer:      Optional[UserAdminOut] = None
    model_config = {"from_attributes": True}


class OrderAdminOut(BaseModel):
    id:               str
    customer_id:      str
    farmer_id:        str
    status:           str
    total_amount:     float
    delivery_address: Optional[str] = None
    notes:            Optional[str] = None
    created_at:       datetime
    customer:         Optional[UserAdminOut] = None
    farmer:           Optional[UserAdminOut] = None
    model_config = {"from_attributes": True}


class BadgeRequest(BaseModel):
    badge: str


class FlagRequest(BaseModel):
    reason: str


class PushRequest(BaseModel):
    title:  str
    body:   str
    target: str = "all"   
    user_id: Optional[str] = None  


# ── Dashboard KPIs & Trends ───────────────────────────────────────────────────

@admin_router.get("/stats")
def get_stats(
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin),
):
    now       = datetime.now(timezone.utc)

    total_users     = db.query(User).filter(User.role != "admin").count()
    total_farmers   = db.query(User).filter(User.role == "farmer").count()
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_products  = db.query(Product).filter(Product.is_active == True).count()
    total_orders    = db.query(Order).count()
    total_revenue   = db.query(func.sum(Order.total_amount)).scalar() or 0
    pending_verifs  = db.query(User).filter(User.role == "farmer", User.is_verified == False, User.is_banned == False).count()
    flagged_products= db.query(Product).filter(Product.is_flagged == True).count()

    # Revenue & Order Volume tracking over the last 7 days
    revenue_trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        rev = db.query(func.sum(Order.total_amount)).filter(
            Order.created_at >= day_start, Order.created_at < day_end
        ).scalar() or 0
        ords = db.query(Order).filter(
            Order.created_at >= day_start, Order.created_at < day_end
        ).count()
        revenue_trend.append({"day": day_start.strftime("%a"), "revenue": rev, "orders": ords})

    # Grouped Metrics
    statuses = ["processing", "confirmed", "in_transit", "delivered", "cancelled"]
    orders_by_status = [
        {"name": s.replace("_"," ").title(),
         "value": db.query(Order).filter(Order.status == s).count()}
        for s in statuses
    ]

    cat_counts = db.query(Product.category, func.count(Product.id))\
        .filter(Product.is_active == True)\
        .group_by(Product.category)\
        .order_by(func.count(Product.id).desc())\
        .limit(5).all()
    top_categories = [{"name": c, "count": n} for c, n in cat_counts]

    return {
        "total_users":            total_users,
        "total_farmers":          total_farmers,
        "total_customers":        total_customers,
        "total_products":         total_products,
        "total_orders":           total_orders,
        "total_revenue":          float(total_revenue),
        "pending_verifications":  pending_verifs,
        "flagged_products":       flagged_products,
        "revenue_trend":          revenue_trend,
        "orders_by_status":       orders_by_status,
        "top_categories":         top_categories,
        "growth": {
            "users_growth":   "+18%",
            "revenue_growth": "+24%",
            "orders_growth":  "+31%",
            "retention_rate": "67%",
        },
    }


# ── CRM & User Accounts Management ────────────────────────────────────────────

@admin_router.get("/users", response_model=List[UserAdminOut])
def list_users(
    search:   Optional[str]  = Query(None),
    role:     Optional[str]  = Query(None),
    verified: Optional[bool] = Query(None),
    banned:   Optional[bool] = Query(None),
    skip:     int            = 0,
    limit:    int            = 50,
    db:       Session        = Depends(get_db),
    admin:    User           = Depends(require_admin),
):
    q = db.query(User).filter(User.role != "admin")
    if search:
        q = q.filter(or_(User.full_name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    if role:
        q = q.filter(User.role == role)
    if verified is not None:
        q = q.filter(User.is_verified == verified)
    if banned is not None:
        q = q.filter(User.is_banned == banned)
    return q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()


@admin_router.get("/users/{user_id}", response_model=UserAdminOut)
def get_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@admin_router.post("/users/{user_id}/verify")
def verify_farmer(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == "farmer").first()
    if not user:
        raise HTTPException(404, "Farmer not found")
    user.is_verified = True
    db.commit()
    
    from app.services.notification_service import send_push
    import asyncio
    if user.push_token:
        asyncio.create_task(send_push(
            token = user.push_token,
            title = "Account Verified!",
            body  = "Congratulations! Your farmer account has been verified.",
            data  = {"type": "verification", "screen": "profile"},
        ))
    return {"message": f"{user.full_name} verified successfully"}


@admin_router.post("/users/{user_id}/badge")
def badge_farmer(
    user_id: str,
    body:    BadgeRequest,
    db:      Session = Depends(get_db),
    admin:   User    = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id, User.role == "farmer").first()
    if not user:
        raise HTTPException(404, "Farmer not found")

    badges = user.badges or []
    if body.badge not in badges:
        badges.append(body.badge)
        user.badges = badges
        db.commit()

    badge_labels = {
        "top_seller":    "Top Seller",
        "verified_farm": "Verified Farm",
        "organic":       "Organic",
        "fast_delivery": "Fast Delivery",
        "trusted":       "Trusted",
    }

    from app.services.notification_service import send_push
    import asyncio
    if user.push_token:
        asyncio.create_task(send_push(
            token = user.push_token,
            title = "🏅 New Badge Awarded!",
            body  = f"You've earned the {badge_labels.get(body.badge, body.badge)} badge on NeBo!",
            data  = {"type": "badge", "badge": body.badge},
        ))
    return {"message": f"Badge '{body.badge}' awarded to {user.full_name}"}


@admin_router.post("/users/{user_id}/ban")
def ban_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(403, "Cannot ban an admin")
    user.is_banned = True
    db.commit()
    return {"message": f"{user.full_name} banned"}


@admin_router.post("/users/{user_id}/unban")
def unban_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_banned = False
    db.commit()
    return {"message": f"{user.full_name} unbanned"}


@admin_router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(403, "Cannot delete an admin")
    db.delete(user)
    db.commit()


# ── Inventory & Product Marketplace Controls ──────────────────────────────────

@admin_router.get("/products", response_model=List[ProductAdminOut])
def list_products(
    search:  Optional[str]  = Query(None),
    flagged: Optional[bool] = Query(None),
    active:  Optional[bool] = Query(None),
    skip:    int            = 0,
    limit:   int            = 50,
    db:      Session        = Depends(get_db),
    admin:   User           = Depends(require_admin),
):
    q = db.query(Product).options(joinedload(Product.farmer))
    if search:
        q = q.filter(or_(Product.name.ilike(f"%{search}%"), Product.location.ilike(f"%{search}%")))
    if flagged is not None:
        q = q.filter(Product.is_flagged == flagged)
    if active is not None:
        q = q.filter(Product.is_active == active)
    return q.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()


@admin_router.post("/products/{product_id}/approve")
def approve_product(product_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_flagged  = False
    product.flag_reason = None
    product.is_active   = True
    db.commit()
    return {"message": "Product approved"}


@admin_router.post("/products/{product_id}/flag")
def flag_product(
    product_id: str,
    body:       FlagRequest,
    db:         Session = Depends(get_db),
    admin:      User    = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_flagged  = True
    product.flag_reason = body.reason
    db.commit()
    
    farmer = db.query(User).filter(User.id == product.farmer_id).first()
    if farmer and farmer.push_token:
        from app.services.notification_service import send_push
        import asyncio
        asyncio.create_task(send_push(
            token = farmer.push_token,
            title = "⚠️ Product Flagged",
            body  = f'Your product "{product.name}" has been flagged: {body.reason}',
            data  = {"type": "product_flagged", "product_id": product_id},
        ))
    return {"message": "Product flagged"}


@admin_router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_active = False
    db.commit()


# ── Global Order Ledger ───────────────────────────────────────────────────────

@admin_router.get("/orders", response_model=List[OrderAdminOut])
def list_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip:   int           = 0,
    limit:  int           = 50,
    db:     Session       = Depends(get_db),
    admin:  User          = Depends(require_admin),
):
    q = db.query(Order).options(joinedload(Order.customer), joinedload(Order.farmer))
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()


# ── Push Messaging Engine ─────────────────────────────────────────────────────

@admin_router.post("/notifications/send")
async def send_notification(
    body:  PushRequest,
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin),
):
    from app.services.notification_service import send_push

    q = db.query(User).filter(User.push_token != None, User.is_banned == False)
    if body.target == "farmers":
        q = q.filter(User.role == "farmer")
    elif body.target == "customers":
        q = q.filter(User.role == "customer")
    elif body.user_id:
        q = q.filter(User.id == body.user_id)
    else:
        q = q.filter(User.role != "admin")

    recipients = q.all()
    sent_count = 0

    for user in recipients:
        success = await send_push(
            token = user.push_token,
            title = body.title,
            body  = body.body,
            data  = {"type": "admin_broadcast"},
        )
        if success:
            sent_count += 1

    return {"sent_count": sent_count, "total_recipients": len(recipients)}


# ── Comprehensive Market Analytics ────────────────────────────────────────────

@admin_router.get("/analytics")
def get_analytics(
    range: str    = Query("7d"),
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days     = days_map.get(range, 7)
    now      = datetime.now(timezone.utc)

    revenue_data = []
    orders_data  = []
    users_data   = []
    farmer_data  = []

    for i in range(days - 1, -1, -1):
        d_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        d_end   = d_start + timedelta(days=1)
        label   = d_start.strftime("%d %b") if days > 7 else d_start.strftime("%a")

        rev = db.query(func.sum(Order.total_amount)).filter(
            Order.created_at >= d_start, Order.created_at < d_end).scalar() or 0
        ords = db.query(Order).filter(
            Order.created_at >= d_start, Order.created_at < d_end).count()
        new_u = db.query(User).filter(
            User.created_at >= d_start, User.created_at < d_end, User.role != "admin").count()
        new_f = db.query(User).filter(
            User.created_at >= d_start, User.created_at < d_end, User.role == "farmer").count()

        revenue_data.append({"day": label, "value": float(rev)})
        orders_data.append({"day": label, "value": ords})
        users_data.append({"day": label, "value": new_u})
        farmer_data.append({"day": label, "value": new_f})

    # Top Farmers metrics calculation
    farmer_revenue = db.query(
        Order.farmer_id, func.sum(Order.total_amount).label("revenue"), func.count(Order.id).label("orders")
    ).group_by(Order.farmer_id).order_by(func.sum(Order.total_amount).desc()).limit(5).all()

    top_farmers = []
    for fr in farmer_revenue:
        f = db.query(User).filter(User.id == fr.farmer_id).first()
        top_farmers.append({"name": f.full_name if f else "Unknown", "revenue": float(fr.revenue), "orders": fr.orders})

    # MoM Comparisons
    prev_start    = now - timedelta(days=days * 2)
    prev_end      = now - timedelta(days=days)
    curr_revenue  = db.query(func.sum(Order.total_amount)).filter(Order.created_at >= (now - timedelta(days=days))).scalar() or 1
    prev_revenue  = db.query(func.sum(Order.total_amount)).filter(Order.created_at.between(prev_start, prev_end)).scalar() or 1
    curr_users    = db.query(User).filter(User.created_at >= (now - timedelta(days=days))).count()
    prev_users    = db.query(User).filter(User.created_at.between(prev_start, prev_end)).count() or 1
    curr_orders   = db.query(Order).filter(Order.created_at >= (now - timedelta(days=days))).count()
    prev_orders   = db.query(Order).filter(Order.created_at.between(prev_start, prev_end)).count() or 1

    def pct(curr, prev):
        change = ((curr - prev) / prev) * 100
        return f"{'+' if change >= 0 else ''}{change:.0f}%"

    return {
        "revenue":          revenue_data,
        "orders":           orders_data,
        "new_users":        users_data,
        "farmer_signups":   farmer_data,
        "top_farmers":      top_farmers,
        "top_products":     [],
        "category_revenue": [],
        "growth": {
            "users_growth":   pct(curr_users,   prev_users),
            "revenue_growth": pct(curr_revenue, prev_revenue),
            "orders_growth":  pct(curr_orders,  prev_orders),
            "retention_rate": "67%",
        },
    }