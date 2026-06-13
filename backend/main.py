import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.database import Base, engine
from app.core.config import settings

from app.routers.auth import router as auth_router
from app.routers.api import users_router, products_router
from app.routers.notifications import router as notification_router
from app.routers.admin import admin_router
from app.routers.orders import router as orders_router
from app.routers.chat import chat_router
from app.routers.recommendations import recommendations_router

app = FastAPI(
    title="NEBO API",
    description="Backend for NEBO — connecting farmers with customers",
    version="1.0.0",
    redirect_slashes=False
)


# =========================
# 2. STARTUP EVENT
# =========================
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


# =========================
# 3. CREATE UPLOAD DIR
# =========================
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


# =========================
# 4. CORS MIDDLEWARE
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# 5. STATIC FILES
# =========================
app.mount(
    "/uploads",
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="uploads"
)


# =========================
# 6. GLOBAL ERROR HANDLER
# =========================
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    safe_errors = [
        {str(k): str(v) for k, v in error.items()}
        for error in exc.errors()
    ]

    print("--- VALIDATION ERROR ---")
    print("URL:", request.url)
    print("ERRORS:", safe_errors)
    print("------------------------")

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation Error",
            "errors": safe_errors
        },
    )


# =========================
# 7. ROUTERS
# =========================
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(orders_router, prefix="/api/orders", tags=["orders"])
app.include_router(notification_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")

@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "app": "NEBO API"}


@app.get("/", tags=["health"])
def root():
    return {"message": "Welcome to the NEBO API"}