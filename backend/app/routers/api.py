import os, shutil, uuid
from typing import List, Optional
from app.models.notification import Notification
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_farmer
from app.core.config import settings
from app.models.user import User
from app.models.product import Product 

from app.schemas.schemas import (
    ProductOut, ProductUpdate,
    UserOut, UserUpdate,
)
from app.services.email import send_order_notification_email

# Users
users_router = APIRouter(prefix="/users", tags=["users"])
notification_router = APIRouter(prefix="/notifications", tags=["notifications"])

@users_router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@users_router.patch("/me", response_model=UserOut)
def update_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@users_router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# Products 
products_router = APIRouter(prefix="/products", tags=["products"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@products_router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    name: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    unit: str = Form(...),
    quantity: float = Form(...),
    description: Optional[str] = Form(None),
    location: str = Form(...),
    photos: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    photo_urls = []
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    for photo in photos[:4]:  # max 4
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {photo.content_type}")

        ext = photo.filename.split(".")[-1] if photo.filename else "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        path = os.path.join(settings.UPLOAD_DIR, filename)

        with open(path, "wb") as f:
            shutil.copyfileobj(photo.file, f)

        photo_urls.append(f"{settings.APP_URL}/uploads/products/{filename}")

    product = Product(
        farmer_id=current_user.id,
        name=name,
        category=category,
        price=price,
        unit=unit,
        quantity=quantity,
        description=description,
        location=location,
        photos=photo_urls,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@products_router.get("", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Product).filter(Product.is_active == True, Product.in_stock == True)
    if category:
        q = q.filter(Product.category == category)
    if location:
        q = q.filter(Product.location.ilike(f"%{location}%"))
    if search:
        q = q.filter(
            Product.name.ilike(f"%{search}%") |
            Product.description.ilike(f"%{search}%")
        )
    return q.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()


@products_router.get("/my", response_model=List[ProductOut])
def my_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    return (
        db.query(Product)
        .filter(Product.farmer_id == current_user.id)
        .order_by(Product.created_at.desc())
        .all()
    )


@products_router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.farmer)).filter(
        Product.id == product_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@products_router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.farmer_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@products_router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.farmer_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()

@notification_router.get("/")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()

