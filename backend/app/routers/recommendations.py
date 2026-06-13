"""
app/routers/recommendations.py
─────────────────────────────────────────────────────────────────────────────
Hybrid Recommendation System — 4 signals combined:

  Final Score = (Location × 40%) + (Collaborative × 35%) + (Recency × 15%) + (Popularity × 10%)

  1. LOCATION (40%)
     Jaccard token similarity between customer location and product/farmer location.
     Exact city → 1.0, same region → 0.5, national fallback → 0.1

  2. COLLABORATIVE FILTERING (35%)
     Item-item collaborative filtering using view history:
     - Find users who viewed the same products as the current user
     - Surface products those similar users also viewed
     - Score = overlap of viewing patterns (normalised 0-1)
     - Cold start safe: weight scales from 0 → 35% as view data grows (min 10 events)

  3. RECENCY (15%)
     Products listed today = 1.0, 30+ days old = 0.0. Linear decay.

  4. POPULARITY (10%)
     Based on total view count from view_events table.
     Normalised across all products (most viewed = 1.0).

Endpoints:
  GET  /api/recommendations/products?limit=10  → scored product list
  GET  /api/recommendations/farmers?limit=6    → location-scored farmer list
  POST /api/recommendations/view               → { "product_id": "uuid" }
  GET  /api/recommendations/history            → what this user has viewed
"""

from collections import defaultdict
from datetime    import datetime, timezone, timedelta
from typing      import List, Optional

from fastapi        import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy     import func, desc

from app.core.database  import get_db
from app.core.security  import get_current_user
from app.models.user    import User
from app.models.product import Product

# ViewEvent is optional — if it doesn't exist yet, collaborative filtering
# is skipped gracefully and only location + recency + popularity are used
try:
    from app.models.view_event import ViewEvent
    HAS_VIEW_EVENTS = True
except ImportError:
    HAS_VIEW_EVENTS = False

recommendations_router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# ── Minimum view events before collaborative filtering kicks in ───────────────
MIN_EVENTS_FOR_CF = 10


# ── Location scoring ──────────────────────────────────────────────────────────

def _tokens(loc: str) -> set:
    """Tokenise 'Buea, South West Region' → {'buea','south','west','region'}"""
    if not loc: return set()
    return set(loc.lower().replace(",", " ").replace("-", " ").split())

def _location_score(user_loc: str, item_loc: str) -> float:
    """
    Returns 0.0 – 1.0 based on token overlap between two location strings.
    1.0 = strong local match, 0.5 = same region, 0.1 = national fallback
    """
    if not user_loc or not item_loc: return 0.0
    u = _tokens(user_loc)
    i = _tokens(item_loc)
    if not u or not i: return 0.0
    overlap = u & i
    if not overlap: return 0.1                           # national fallback
    ratio = len(overlap) / min(len(u), len(i))
    return 1.0 if ratio >= 0.5 else 0.5                 # exact city vs region

def _match_label(score: float) -> str:
    if score >= 1.0: return "Nearby"
    if score >= 0.5: return "Your Region"
    return "Explore"


# ── Collaborative filtering ───────────────────────────────────────────────────

def _build_cf_scores(
    db:         Session,
    user_id:    str,
    candidate_ids: List[str],
) -> dict:
    """
    Item-item collaborative filtering using view history.

    Steps:
    1. Get the current user's viewed product IDs
    2. Find other users who viewed those same products (similar users)
    3. Get what those similar users also viewed
    4. Score each candidate product by how many similar users viewed it
    5. Normalise to 0-1

    Returns: { product_id: cf_score (0.0-1.0) }
    Cold start: returns all zeros if not enough data.
    """
    if not HAS_VIEW_EVENTS:
        return {}

    # Total view events in DB — check cold start
    total_events = db.query(func.count(ViewEvent.id)).scalar() or 0
    if total_events < MIN_EVENTS_FOR_CF:
        return {}

    # Step 1: What has the current user viewed?
    my_views = db.query(ViewEvent.product_id)\
        .filter(ViewEvent.user_id == user_id)\
        .distinct().all()
    my_product_ids = {r[0] for r in my_views}

    if not my_product_ids:
        return {}

    # Step 2: Find similar users (who viewed at least 1 same product)
    similar_user_rows = db.query(ViewEvent.user_id)\
        .filter(
            ViewEvent.product_id.in_(my_product_ids),
            ViewEvent.user_id != user_id,
        )\
        .distinct().all()
    similar_user_ids = [r[0] for r in similar_user_rows]

    if not similar_user_ids:
        return {}

    # Step 3: What did similar users view? (only candidate products)
    similar_views = db.query(ViewEvent.product_id, func.count(ViewEvent.user_id).label("cnt"))\
        .filter(
            ViewEvent.user_id.in_(similar_user_ids),
            ViewEvent.product_id.in_(candidate_ids),
            ViewEvent.product_id.notin_(my_product_ids),  # exclude already seen
        )\
        .group_by(ViewEvent.product_id)\
        .all()

    if not similar_views:
        return {}

    # Step 4: Normalise — most viewed among similar users = 1.0
    max_cnt = max(r.cnt for r in similar_views) or 1
    return {r.product_id: r.cnt / max_cnt for r in similar_views}


# ── Popularity scoring ────────────────────────────────────────────────────────

def _build_popularity_scores(db: Session, candidate_ids: List[str]) -> dict:
    """Returns { product_id: popularity_score (0.0-1.0) }"""
    if not HAS_VIEW_EVENTS or not candidate_ids:
        return {}

    rows = db.query(ViewEvent.product_id, func.count(ViewEvent.id).label("cnt"))\
        .filter(ViewEvent.product_id.in_(candidate_ids))\
        .group_by(ViewEvent.product_id)\
        .all()

    if not rows: return {}
    max_cnt = max(r.cnt for r in rows) or 1
    return {r.product_id: r.cnt / max_cnt for r in rows}


# ── Recency score ─────────────────────────────────────────────────────────────

def _recency_score(created_at) -> float:
    if not created_at: return 0.0
    try:
        age_days = (datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days
        return max(0.0, 1.0 - age_days / 30)
    except Exception:
        return 0.0


# ── CF weight — ramps up as data grows ───────────────────────────────────────

def _cf_weight(db: Session) -> float:
    """
    Returns 0.0 when fewer than MIN_EVENTS_FOR_CF events exist,
    scales up to 0.35 as events grow toward 500.
    Prevents collaborative filtering from dominating with sparse data.
    """
    if not HAS_VIEW_EVENTS: return 0.0
    total = db.query(func.count(ViewEvent.id)).scalar() or 0
    if total < MIN_EVENTS_FOR_CF: return 0.0
    return min(0.35, 0.35 * (total / 500))


# ── Products endpoint ─────────────────────────────────────────────────────────

@recommendations_router.get("/products")
def recommend_products(
    limit:        int     = Query(10, ge=1, le=50),
    offset:       int     = Query(0,  ge=0),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Hybrid scored product recommendations.
    Score = (Location × 40%) + (CF × 0-35%) + (Recency × 15%) + (Popularity × 10%)
    CF weight scales up from 0 as view data grows.
    """
    user_loc = current_user.location or ""

    # Fetch candidate pool — exclude own products, only active + in stock
    products = (
        db.query(Product)
        .options(joinedload(Product.farmer))
        .filter(
            Product.is_active == True,
            Product.in_stock  == True,
            Product.farmer_id != current_user.id,
        )
        .order_by(Product.created_at.desc())
        .limit(500)
        .all()
    )

    if not products:
        return []

    candidate_ids = [p.id for p in products]

    # Pre-compute CF and popularity scores (batch DB queries)
    cf_raw    = _build_cf_scores(db, current_user.id, candidate_ids)
    pop_raw   = _build_popularity_scores(db, candidate_ids)
    cf_w      = _cf_weight(db)

    # Adjusted weights — if CF is weak, redistribute to location + recency
    loc_w  = 0.40 + (0.35 - cf_w) * 0.57    # location absorbs most of CF deficit
    rec_w  = 0.15 + (0.35 - cf_w) * 0.29    # recency absorbs rest
    pop_w  = 0.10
    # loc_w + cf_w + rec_w + pop_w ≈ 1.0

    scored = []
    for p in products:
        farmer_loc = p.farmer.location if p.farmer else ""
        item_loc   = " ".join(filter(None, [p.location, farmer_loc]))
        loc_score  = _location_score(user_loc, item_loc)
        cf_score   = cf_raw.get(p.id, 0.0)
        rec_score  = _recency_score(p.created_at)
        pop_score  = pop_raw.get(p.id, 0.0)

        final = (loc_score * loc_w) + (cf_score * cf_w) + (rec_score * rec_w) + (pop_score * pop_w)

        # Build match label — CF takes priority for label if strong
        if cf_score > 0.5:
            label = "Recommended"
        else:
            label = _match_label(loc_score)

        scored.append({
            "id":          p.id,
            "name":        p.name,
            "category":    p.category,
            "description": p.description,
            "price":       p.price,
            "unit":        p.unit,
            "quantity":    p.quantity,
            "location":    p.location,
            "image":       p.image,
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
            "_score":      final,
        })

    scored.sort(key=lambda x: -x["_score"])
    for item in scored: item.pop("_score", None)
    return scored[offset: offset + limit]


# ── Farmers endpoint ──────────────────────────────────────────────────────────

@recommendations_router.get("/farmers")
def recommend_farmers(
    limit:        int     = Query(6, ge=1, le=20),
    offset:       int     = Query(0, ge=0),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Location-scored farmer recommendations.
    Also includes product_count and match_label.
    """
    user_loc = current_user.location or ""

    farmers = (
        db.query(User)
        .filter(
            User.role  == "farmer",
            User.id    != current_user.id,
        )
        .limit(300)
        .all()
    )

    # Product count per farmer
    product_counts = dict(
        db.query(Product.farmer_id, func.count(Product.id))
        .filter(Product.is_active == True, Product.in_stock == True)
        .group_by(Product.farmer_id)
        .all()
    )

    # View count per farmer's products (popularity signal)
    farmer_popularity = {}
    if HAS_VIEW_EVENTS:
        rows = db.query(Product.farmer_id, func.count(ViewEvent.id).label("views"))\
            .join(ViewEvent, ViewEvent.product_id == Product.id)\
            .filter(Product.is_active == True)\
            .group_by(Product.farmer_id)\
            .all()
        max_views = max((r.views for r in rows), default=1)
        farmer_popularity = {r.farmer_id: r.views / max_views for r in rows}

    scored = []
    for f in farmers:
        loc_score  = _location_score(user_loc, f.location or "")
        pop_score  = farmer_popularity.get(f.id, 0.0)
        prod_count = product_counts.get(f.id, 0)

        # Farmers with no products are deprioritised
        if prod_count == 0:
            final = loc_score * 0.3
        else:
            final = (loc_score * 0.6) + (pop_score * 0.4)

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
    """
    POST { "product_id": "uuid" }
    Call this every time a customer opens a product detail screen.
    Feeds the collaborative filtering engine.
    """
    if not HAS_VIEW_EVENTS:
        return

    product_id = (body.get("product_id") or "").strip()
    if not product_id:
        return

    try:
        # Avoid duplicate views within the same hour
        from app.models.view_event import ViewEvent
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        existing = db.query(ViewEvent).filter(
            ViewEvent.user_id    == current_user.id,
            ViewEvent.product_id == product_id,
            ViewEvent.viewed_at  >= one_hour_ago,
        ).first()

        if not existing:
            db.add(ViewEvent(user_id=current_user.id, product_id=product_id))
            db.commit()
    except Exception as e:
        db.rollback()
        pass   # never crash the app over a view event


# ── View history ──────────────────────────────────────────────────────────────

@recommendations_router.get("/history")
def view_history(
    limit:        int     = Query(20, ge=1, le=100),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Returns products the current user has recently viewed."""
    if not HAS_VIEW_EVENTS:
        return []

    try:
        from app.models.view_event import ViewEvent
        rows = (
            db.query(ViewEvent)
            .options(joinedload(ViewEvent.product))
            .filter(ViewEvent.user_id == current_user.id)
            .order_by(ViewEvent.viewed_at.desc())
            .limit(limit)
            .all()
        )
        return [{
            "product_id":  r.product_id,
            "name":        r.product.name      if r.product else None,
            "image":       r.product.image     if r.product else None,
            "price":       r.product.price     if r.product else None,
            "viewed_at":   r.viewed_at.isoformat(),
        } for r in rows if r.product]
    except Exception:
        return []