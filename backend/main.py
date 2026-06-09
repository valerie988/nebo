import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.database import Base, engine
from app.core.config import settings
from app.routers.auth import router as auth_router
from app.routers.api import (
    users_router,
    products_router, 
)
from app.routers.notifications import router as notification_router
from app.routers.admin import admin_router
from app.routers import orders          

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# 2. Create local upload directory for product imagery
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="NEBO API",
    description="Backend for NEBO — connecting farmers with customers",
    version="1.0.0",
    redirect_slashes=False
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

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # This creates a safe, text-only version of the errors
    safe_errors = []
    for error in exc.errors():
        # We manually convert every value in the error dictionary to a string
        # This prevents the "bytes not JSON serializable" crash
        safe_error = {str(k): str(v) for k, v in error.items()}
        safe_errors.append(safe_error)
    
    print(f"--- VALIDATION ERROR DETECTED ---")
    print(f"Endpoint: {request.url}")
    print(f"Errors: {safe_errors}")
    print(f"---------------------------------")
    
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation Error", "errors": safe_errors},
    )

# 5. Centralized API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(notification_router, prefix="/api")  

# 6. Health check endpoints
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "app": "NEBO API"}


@app.get("/", tags=["health"])
def root():
    return {"message": "Welcome to the NEBO API"}