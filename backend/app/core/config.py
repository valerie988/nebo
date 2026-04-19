from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Email
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "NEBO App"

    # App
    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "exp://localhost:8081"
    UPLOAD_DIR: str = "uploads/products"
    MAX_UPLOAD_SIZE_MB: int = 5

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()