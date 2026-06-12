from sqlalchemy import func
from app.models.view_event import ViewEvent
from app.models.product import Product


class RecommendationService:
    def __init__(self, db):
        self.db = db

    def get_user_interest_score(self, user_id: str):
        result = (
            self.db.query(Product.category, func.count(ViewEvent.id))
            .join(ViewEvent, Product.id == ViewEvent.product_id)
            .filter(ViewEvent.user_id == user_id)
            .group_by(Product.category)
            .all()
        )
        return dict(result)

    def rank_products(self, user, products, loc_scores: dict):
        user_interests = self.get_user_interest_score(user.id)

        ranked = []

        for p in products:
            loc_score = loc_scores.get(p.id, 0.0)

            category_bonus = 0.2 if user_interests.get(p.category, 0) > 0 else 0.0

            hybrid_score = (loc_score * 0.6) + (category_bonus * 0.4)

            p._hybrid_score = hybrid_score
            ranked.append(p)

        return sorted(ranked, key=lambda x: x._hybrid_score, reverse=True)