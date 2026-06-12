from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.product import Product
from app.models.view_event import ViewEvent
from app.schemas.schemas import ViewBody

recommendations_router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"]
)

# ─────────────────────────────────────────────
# LOCATION SCORING
# ─────────────────────────────────────────────

def _tokens(loc: str) -> set:
    if not loc:
        return set()
    return set(loc.lower().replace(",", " ").split())


def _score(user_loc: str, item_loc: str) -> float:
    if not user_loc or not item_loc:
        return 0.0

    u, i = _tokens(user_loc), _tokens(item_loc)
    if not u or not i:
        return 0.0

    overlap = u & i
    if not overlap:
        return 0.1

    ratio = len(overlap) / min(len(u), len(i))
    return 1.0 if ratio >= 0.5 else 0.5


def _label(score: float) -> str:
    if score >= 1.0:
        return "Nearby"
    if score >= 0.5:
        return "Your Region"
    return "Recommended"


# ─────────────────────────────────────────────
# PRODUCTS RECOMMENDATION
# ─────────────────────────────────────────────

@recommendations_router.get("/products")
def recommend_products(
    limit: int = Query(6, ge=1, le=20),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_loc = current_user.location or ""

    products = (
        db.query(Product)
        .options(joinedload(Product.farmer))
        .filter(
            Product.is_active.is_(True),
            Product.in_stock.is_(True),
            Product.farmer_id != current_user.id,
        )
        .order_by(Product.created_at.desc())
        .limit(200)
        .all()
    )

    scored = []

    for p in products:
        farmer_loc = p.farmer.location if p.farmer else ""
        item_loc = " ".join(filter(None, [p.location, farmer_loc]))

        loc_score = _score(user_loc, item_loc)

        # SAFE recency handling
        recency = 0.0
        if p.created_at:
            created = p.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)

            age_days = (datetime.now(timezone.utc) - created).days
            recency = max(0.0, 1.0 - age_days / 30)

        final_score = (loc_score * 0.75) + (recency * 0.25)

        scored.append({
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "description": p.description,
            "price": p.price,
            "unit": p.unit,
            "quantity": p.quantity,
            "location": p.location,
            "image": (
        p.photos[0]
        if isinstance(p.photos, list) and len(p.photos) > 0
        else None
    ),
            "in_stock": p.in_stock,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "farmer_id": p.farmer_id,
            "farmer": {
                "id": p.farmer.id,
                "full_name": p.farmer.full_name,
                "location": p.farmer.location,
                "avatar_url": getattr(p.farmer, "avatar_url", None),
                "phone": getattr(p.farmer, "phone", None),
                "is_verified": getattr(p.farmer, "is_verified", False),
            } if p.farmer else None,
            "match_label": _label(loc_score),
            "_score": final_score,
        })

    scored.sort(key=lambda x: x["_score"], reverse=True)

    for item in scored:
        item.pop("_score", None)

    return scored[offset: offset + limit]


# ─────────────────────────────────────────────
# FARMERS RECOMMENDATION
# ─────────────────────────────────────────────

@recommendations_router.get("/farmers")
def recommend_farmers(
    limit: int = Query(4, ge=1, le=20),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_loc = current_user.location or ""

    farmers = (
        db.query(User)
        .filter(User.role == "farmer", User.id != current_user.id)
        .limit(200)
        .all()
    )

    product_counts = dict(
        db.query(Product.farmer_id, func.count(Product.id))
        .filter(Product.is_active.is_(True), Product.in_stock.is_(True))
        .group_by(Product.farmer_id)
        .all()
    )

    scored = []

    for f in farmers:
        loc_score = _score(user_loc, f.location or "")

        scored.append({
            "id": f.id,
            "full_name": f.full_name,
            "location": f.location,
            "avatar_url": getattr(f, "avatar_url", None),
            "phone": getattr(f, "phone", None),
            "is_verified": getattr(f, "is_verified", False),
            "badges": getattr(f, "badges", []),
            "product_count": product_counts.get(f.id, 0),
            "match_label": _label(loc_score),
            "_score": loc_score,
        })

    scored.sort(key=lambda x: (-x["_score"], -x["product_count"]))

    for item in scored:
        item.pop("_score", None)

    return scored[offset: offset + limit]


# ─────────────────────────────────────────────
# TRACK VIEW EVENT
# ─────────────────────────────────────────────

@recommendations_router.post("/view", status_code=204)
def track_view(
    body: ViewBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if body.product_id:
            event = ViewEvent(
                user_id=current_user.id,
                product_id=body.product_id,
                dwell_seconds=body.dwell_seconds or 0
            )
            db.add(event)
            db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to track view")