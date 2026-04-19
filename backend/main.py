from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.database import Base, engine
from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.api import (
    users_router,
    products_router,
)

# Create tables
Base.metadata.create_all(bind=engine)

# Create upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="NEBO API",
    description="Backend for NEBO — connecting farmers with customers",
    version="1.0.0",
)

#  CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Static files (uploaded product photos) 
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

#  Routers 
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(products_router)


#  Health check
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "app": "NEBO API"}


@app.get("/", tags=["health"])
def root():
    return {"message": "Welcome to the NEBO API 🌿"}