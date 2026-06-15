
from collections import defaultdict
from datetime    import datetime, timezone, timedelta
from typing      import List, Optional

from fastapi        import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy     import func, desc

from app.core.database  import get_db
from app.routers.cameroon_location import location_match_score, REGIONS
from app.core.security  import get_current_user
from app.models.user    import User
from app.models.product import Product

try:
    from app.models.view_event import ViewEvent
    HAS_VIEW_EVENTS = True
except ImportError:
    HAS_VIEW_EVENTS = False

recommendations_router = APIRouter(prefix="/recommendations", tags=["recommendations"])

MIN_EVENTS_FOR_CF = 10


# ── Location helpers ──────────────────────────────────────────────────────────

def _tokens(loc: str) -> set:
    if not loc: return set()
    # Remove common words that add noise
    stop = {"region", "and", "the", "de", "du", "la", "le"}
    return set(loc.lower().replace(",", " ").replace("-", " ").split()) - stop

def _location_score(user_loc: str, item_loc: str) -> float:
    score, _ = location_match_score(user_loc, item_loc)
    return score

def _match_label(score: float) -> str:
    if score >= 1.0: return "Nearby"
    if score >= 0.7: return "Your Region"
    return "Explore"

def _location_score_and_label(user_loc: str, item_loc: str) -> tuple:
    return location_match_score(user_loc, item_loc)

def _recency_score(created_at) -> float:
    if not created_at: return 0.0
    try:
        age = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
        return max(0.0, 1.0 - age / 30)
    except: return 0.0

def _cf_weight(db: Session) -> float:
    if not HAS_VIEW_EVENTS: return 0.0
    total = db.query(func.count(ViewEvent.id)).scalar() or 0
    if total < MIN_EVENTS_FOR_CF: return 0.0
    return min(0.35, 0.35 * (total / 500))

def _product_out(p: Product, label: str = None) -> dict:
    return {
        "id":          p.id,
        "name":        p.name,
        "category":    p.category,
        "description": p.description,
        "price":       p.price,
        "unit":        p.unit,
        "quantity":    p.quantity,
        "location":    p.location,
        "image":       p.photos[0] if p.photos else None,
        "in_stock":    p.in_stock,
        "created_at":  p.created_at.isoformat() if p.created_at else None,
        "farmer_id":   p.farmer_id,
        "farmer": {
            "id":          p.farmer.id,
            "full_name":   p.farmer.full_name,
            "location":    p.farmer.location,
            "avatar_url":  getattr(p.farmer, "avatar_url",  None),
            "phone":       getattr(p.farmer, "phone",       None),
            "is_verified": getattr(p.farmer, "is_verified", False),
        } if p.farmer else None,
        "match_label": label,
    }


# ── Main products endpoint ────────────────────────────────────────────────────

@recommendations_router.get("/products")
def recommend_products(
    filter:       str    = Query("all", enum=["all", "nearby", "recommended", "popular"]),
    limit:        int    = Query(20, ge=1, le=50),
    offset:       int    = Query(0, ge=0),
    db:           Session = Depends(get_db),
    current_user: User   = Depends(get_current_user),
):
    user_loc = current_user.location or ""

    if filter == "all":
        return _filter_all(db, current_user, limit, offset)
    elif filter == "nearby":
        return _filter_nearby(db, current_user, user_loc, limit, offset)
    elif filter == "recommended":
        return _filter_recommended(db, current_user, user_loc, limit, offset)
    elif filter == "popular":
        return _filter_popular(db, current_user, limit, offset)


# ── ALL: recent products, no scoring ─────────────────────────────────────────

def _filter_all(db, current_user, limit, offset):
    products = (
        db.query(Product)
        .options(joinedload(Product.farmer))
        .filter(
            Product.is_active == True,
            Product.in_stock  == True,
            Product.farmer_id != current_user.id,
        )
        .order_by(Product.created_at.desc())
        .offset(offset).limit(limit).all()
    )
    return [_product_out(p) for p in products]


# ── NEARBY: STRICT location match only ───────────────────────────────────────

def _filter_nearby(db, current_user, user_loc, limit, offset):
    """
    Only returns products where location tokens actually overlap with the user.
    If user has no location, returns empty list (honest — not fake nearby).
    """
    if not user_loc.strip():
        return []   # no location = no nearby results — tell user to set location

    products = (
        db.query(Product)
        .options(joinedload(Product.farmer))
        .filter(
            Product.is_active == True,
            Product.in_stock  == True,
            Product.farmer_id != current_user.id,
        )
        .all()
    )

    scored = []
    for p in products:
        farmer_loc = p.farmer.location if p.farmer else ""
        item_loc   = " ".join(filter(None, [p.location, farmer_loc]))
        loc_score  = _location_score(user_loc, item_loc)

        if loc_score == 0.0:
            continue   # strictly exclude non-matching products

        scored.append((loc_score, _recency_score(p.created_at), p, _match_label(loc_score)))

    # Sort: exact match first, then regional, then by recency
    scored.sort(key=lambda x: (-x[0], -x[1]))

    results = [_product_out(p, label) for _, _, p, label in scored]
    return results[offset: offset + limit]


# ── RECOMMENDED: hybrid score (location + CF + recency) ──────────────────────

def _filter_recommended(db, current_user, user_loc, limit, offset):
    products = (
        db.query(Product)
        .options(joinedload(Product.farmer))
        .filter(
            Product.is_active == True,
            Product.in_stock  == True,
            Product.farmer_id != current_user.id,
        )
        .limit(500).all()
    )

    if not products:
        return []

    candidate_ids = [p.id for p in products]
    cf_w   = _cf_weight(db)
    loc_w  = 0.40 + (0.35 - cf_w) * 0.57
    rec_w  = 0.15 + (0.35 - cf_w) * 0.29
    pop_w  = 0.10

    # CF scores
    cf_scores = {}
    if HAS_VIEW_EVENTS and cf_w > 0:
        my_views = {r[0] for r in db.query(ViewEvent.product_id)
            .filter(ViewEvent.user_id == current_user.id).distinct().all()}
        if my_views:
            sim_users = [r[0] for r in db.query(ViewEvent.user_id)
                .filter(ViewEvent.product_id.in_(my_views), ViewEvent.user_id != current_user.id)
                .distinct().all()]
            if sim_users:
                rows = db.query(ViewEvent.product_id, func.count(ViewEvent.user_id).label("cnt"))\
                    .filter(ViewEvent.user_id.in_(sim_users),
                            ViewEvent.product_id.in_(candidate_ids),
                            ViewEvent.product_id.notin_(my_views))\
                    .group_by(ViewEvent.product_id).all()
                if rows:
                    max_cnt = max(r.cnt for r in rows) or 1
                    cf_scores = {r.product_id: r.cnt / max_cnt for r in rows}

    # Popularity scores
    pop_scores = {}
    if HAS_VIEW_EVENTS:
        rows = db.query(ViewEvent.product_id, func.count(ViewEvent.id).label("cnt"))\
            .filter(ViewEvent.product_id.in_(candidate_ids))\
            .group_by(ViewEvent.product_id).all()
        if rows:
            max_cnt = max(r.cnt for r in rows) or 1
            pop_scores = {r.product_id: r.cnt / max_cnt for r in rows}

    scored = []
    for p in products:
        farmer_loc = p.farmer.location if p.farmer else ""
        item_loc   = " ".join(filter(None, [p.location, farmer_loc]))
        loc_score  = _location_score(user_loc, item_loc)
        cf_score   = cf_scores.get(p.id, 0.0)
        rec_score  = _recency_score(p.created_at)
        pop_score  = pop_scores.get(p.id, 0.0)

        final = (loc_score * loc_w) + (cf_score * cf_w) + (rec_score * rec_w) + (pop_score * pop_w)

        label = "Recommended" if cf_score > 0.4 else _match_label(loc_score)
        scored.append((final, _product_out(p, label)))

    scored.sort(key=lambda x: -x[0])
    return [item for _, item in scored][offset: offset + limit]


# ── POPULAR: most viewed in last 30 days ─────────────────────────────────────

def _filter_popular(db, current_user, limit, offset):
    """
    Returns the most viewed products in the last 30 days.
    Falls back to most recent if no view events exist yet.
    """
    if HAS_VIEW_EVENTS:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        rows = (
            db.query(ViewEvent.product_id, func.count(ViewEvent.id).label("views"))
            .filter(ViewEvent.viewed_at >= cutoff)
            .group_by(ViewEvent.product_id)
            .order_by(desc("views"))
            .limit(limit + offset + 20)
            .all()
        )

        if rows:
            product_ids = [r.product_id for r in rows]
            view_counts = {r.product_id: r.views for r in rows}

            products = (
                db.query(Product)
                .options(joinedload(Product.farmer))
                .filter(
                    Product.id.in_(product_ids),
                    Product.is_active == True,
                    Product.in_stock  == True,
                    Product.farmer_id != current_user.id,
                )
                .all()
            )

            # Sort by view count (preserving DB order)
            products.sort(key=lambda p: -view_counts.get(p.id, 0))
            results = [_product_out(p, "Popular") for p in products]
            return results[offset: offset + limit]

    # Fallback: no view data yet — return recent products
    products = (
        db.query(Product)
        .options(joinedload(Product.farmer))
        .filter(
            Product.is_active == True,
            Product.in_stock  == True,
            Product.farmer_id != current_user.id,
        )
        .order_by(Product.created_at.desc())
        .offset(offset).limit(limit).all()
    )
    return [_product_out(p, "New") for p in products]

@recommendations_router.get("/farmers")
def recommend_farmers(
    limit:        int     = Query(6, ge=1, le=20),
    offset:       int     = Query(0, ge=0),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    user_loc = current_user.location or ""

    farmers = (
        db.query(User)
        .filter(User.role == "farmer", User.id != current_user.id)
        .limit(300).all()
    )

    product_counts = dict(
        db.query(Product.farmer_id, func.count(Product.id))
        .filter(Product.is_active == True, Product.in_stock == True)
        .group_by(Product.farmer_id).all()
    )

    farmer_popularity = {}
    if HAS_VIEW_EVENTS:
        rows = db.query(Product.farmer_id, func.count(ViewEvent.id).label("views"))\
            .join(ViewEvent, ViewEvent.product_id == Product.id)\
            .filter(Product.is_active == True)\
            .group_by(Product.farmer_id).all()
        max_v = max((r.views for r in rows), default=1)
        farmer_popularity = {r.farmer_id: r.views / max_v for r in rows}

    scored = []
    for f in farmers:
        loc_score  = _location_score(user_loc, f.location or "")
        pop_score  = farmer_popularity.get(f.id, 0.0)
        prod_count = product_counts.get(f.id, 0)

        # ── KEY FIX: exclude farmers with no location overlap when user has a location ──
        if user_loc.strip() and loc_score == 0.0:
            continue

        final = (loc_score * 0.6) + (pop_score * 0.25) + (min(prod_count, 10) / 10 * 0.15)

        scored.append({
            "id":            f.id,
            "full_name":     f.full_name,
            "location":      f.location,
            "avatar_url":    getattr(f, "avatar_url",  None),
            "phone":         getattr(f, "phone",       None),
            "is_verified":   getattr(f, "is_verified", False),
            "badges":        getattr(f, "badges",      []),
            "product_count": prod_count,
            "match_label":   _match_label(loc_score),
            "_score":        final,
        })

    # Fallback: if user has no location OR no local farmers found, return all sorted by popularity
    if not scored:
        for f in farmers:
            pop_score  = farmer_popularity.get(f.id, 0.0)
            prod_count = product_counts.get(f.id, 0)
            scored.append({
                "id":            f.id,
                "full_name":     f.full_name,
                "location":      f.location,
                "avatar_url":    getattr(f, "avatar_url",  None),
                "phone":         getattr(f, "phone",       None),
                "is_verified":   getattr(f, "is_verified", False),
                "badges":        getattr(f, "badges",      []),
                "product_count": prod_count,
                "match_label":   "Explore",
                "_score":        (pop_score * 0.7) + (min(prod_count, 10) / 10 * 0.3),
            })

    scored.sort(key=lambda x: (-x["_score"], -x["product_count"]))
    for item in scored: item.pop("_score", None)
    return scored[offset: offset + limit]
# ── Track view ────────────────────────────────────────────────────────────────

@recommendations_router.post("/view", status_code=204)
def track_view(
    body:         dict,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    if not HAS_VIEW_EVENTS: return
    product_id = (body.get("product_id") or "").strip()
    if not product_id: return
    try:
        from app.models.view_event import ViewEvent
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        exists = db.query(ViewEvent).filter(
            ViewEvent.user_id    == current_user.id,
            ViewEvent.product_id == product_id,
            ViewEvent.viewed_at  >= cutoff,
        ).first()
        if not exists:
            db.add(ViewEvent(user_id=current_user.id, product_id=product_id))
            db.commit()
    except Exception:
        db.rollback()


# ── History ───────────────────────────────────────────────────────────────────

@recommendations_router.get("/history")
def view_history(
    limit:        int     = Query(20),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    if not HAS_VIEW_EVENTS: return []
    try:
        from app.models.view_event import ViewEvent
        rows = (
            db.query(ViewEvent)
            .options(joinedload(ViewEvent.product))
            .filter(ViewEvent.user_id == current_user.id)
            .order_by(ViewEvent.viewed_at.desc())
            .limit(limit).all()
        )
        return [{
            "product_id": r.product_id,
            "name":       r.product.name  if r.product else None,
            "image":      r.product.photos[0] if r.product and r.product.photos else None,
            "price":      r.product.price if r.product else None,
            "viewed_at":  r.viewed_at.isoformat(),
        } for r in rows if r.product]
    except Exception:
        return []


# ── Debug ─────────────────────────────────────────────────────────────────────

@recommendations_router.get("/debug")
def debug_scores(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove before production. Shows raw scores."""
    user_loc  = current_user.location or ""
    products  = db.query(Product).options(joinedload(Product.farmer))\
        .filter(Product.is_active == True).limit(20).all()

    results = []
    for p in products:
        farmer_loc = p.farmer.location if p.farmer else ""
        item_loc   = " ".join(filter(None, [p.location, farmer_loc]))
        loc_score  = _location_score(user_loc, item_loc)
        results.append({
            "product":     p.name,
            "product_loc": p.location,
            "farmer_loc":  farmer_loc,
            "user_loc":    user_loc,
            "user_tokens": list(_tokens(user_loc)),
            "item_tokens": list(_tokens(item_loc)),
            "overlap":     list(_tokens(user_loc) & _tokens(item_loc)),
            "loc_score":   round(loc_score, 3),
            "match_label": _match_label(loc_score),
        })
    results.sort(key=lambda x: -x["loc_score"])
    return {"user": current_user.full_name, "user_location": user_loc, "products": results}