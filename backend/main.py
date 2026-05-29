import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine
from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.api import (
    users_router,
    products_router,
)
# FIXED: Changed 'router' to 'admin_router' to match your app/routers/admin.py variable!
from app.routers.admin import admin_router
from routers import orders
# 1. Automatically generate your MySQL database tables on startup
Base.metadata.create_all(bind=engine)

# 2. Create local upload directory for product imagery
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="NEBO API",
    description="Backend for NEBO — connecting farmers with customers",
    version="1.0.0",
)

# 3. CORS Middleware configuration so your apps can connect without security blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Static files hosting (for uploaded product photos) 
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 5. Centralized API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(products_router, prefix="/api")
# FIXED: Using the properly named admin_router variable here
app.include_router(admin_router, prefix="/api")
app.include_router(orders.router, prefix="/orders", tags=["orders"])

# 6. Health check endpoints
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "app": "NEBO API"}


@app.get("/", tags=["health"])
def root():
    return {"message": "Welcome to the NEBO API 🌿"}