import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
from app.core.config import settings  # Loads the settings class we just updated

# 🚀 CONFIGURING ENGINE DIRECTLY VIA APP ENVIRONMENT SETTINGS
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def upload_product_image(file: UploadFile) -> str:
    """
    Uploads a FastAPI UploadFile stream directly to Cloudinary
    and returns its secure HTTPS URL string.
    """
    try:
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="nebo_products"
        )
        return upload_result.get("secure_url")
    except Exception as e:
        raise Exception(f"Cloudinary Upload Engine Failed: {str(e)}")