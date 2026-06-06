import os, shutil, uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_farmer
from app.core.config import settings
from app.models.user import User
from app.models.product import Product 
from app.models.notification import Notification

from app.schemas.schemas import (
    ProductOut, ProductUpdate,
    UserOut, UserUpdate,
)
from pydantic import BaseModel, Field
from app.services.email import send_order_notification_email
from cloudinary_config import upload_product_image


class ProductCreateJSON(BaseModel):
    name: str
    category: str
    price: float
    unit: str
    quantity: float
    description: Optional[str] = ""
    location: str
    image: Optional[str] = None  # Receives the single Cloudinary string URL from Mobile

# Routers
users_router = APIRouter(prefix="/users", tags=["users"])
notification_router = APIRouter(prefix="/notifications", tags=["notifications"])
products_router = APIRouter(prefix="/products", tags=["products"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

# ──────────────────────────────────────────────────────────────────────────────
# USERS ROUTES
# ──────────────────────────────────────────────────────────────────────────────

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


# ──────────────────────────────────────────────────────────────────────────────
# PRODUCTS ROUTES
# ──────────────────────────────────────────────────────────────────────────────

# ✅ NEW STRATEGY: JSON Endpoint for Mobile App (Front-end uploads to Cloudinary)
@products_router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    payload: ProductCreateJSON,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    try:
        # Wrap the incoming string URL parameter inside a list to match your database JSON array setup
        photo_urls = [payload.image] if payload.image else []

        product = Product(
            farmer_id=current_user.id,
            name=payload.name,
            category=payload.category,
            price=payload.price,
            unit=payload.unit,
            quantity=payload.quantity,
            description=payload.description,
            location=payload.location,
            photos=photo_urls,  # Securely maps to your SQLAlchemy JSON list column
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Database instantiation transaction failed: {str(e)}"
        )


# 🔄 LEGACY STRATEGY: Kept for web dashboard multi-file form uploads
@products_router.post("/legacy-form-upload", response_model=ProductOut, status_code=201)
async def create_product_legacy_form(
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

    for photo in photos[:4]:  
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {photo.content_type}")

        try:
            cloudinary_url = upload_product_image(photo)
            photo_urls.append(cloudinary_url)
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed uploading image asset to Cloudinary: {str(e)}"
            )

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
async def update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    unit: Optional[str] = Form(None),
    quantity: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.farmer_id == current_user.id,
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    payload_data = {
        "name": name, "category": category, "price": price,
        "unit": unit, "quantity": quantity, "description": description,
        "location": location
    }
    
    for field, value in payload_data.items():
        if value is not None:
          setattr(product, field, value)

    if file:
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Invalid image file type extension")
        try:
            new_cloudinary_url = upload_product_image(file)
            product.photos = [new_cloudinary_url]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloudinary patch error: {str(e)}")

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


@users_router.get("", response_model=List[UserOut])
def get_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)

    return query.all()


@notification_router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )