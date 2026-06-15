import os
import httpx
from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User

ai_router = APIRouter(prefix="/ai", tags=["ai"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

@ai_router.post("/generate-description")
async def generate_description(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    name     = (body.get("name") or "").strip()
    category = (body.get("category") or "").strip()
    location = (body.get("location") or "").strip()

    if not name:
        return {"description": ""}

    prompt = f"""Write a short, warm, and honest product description for a Cameroonian farmer selling "{name}"{f" (category: {category})" if category else ""}{f" from {location}" if location else ""}.

Keep it 2-3 sentences. Focus on freshness, quality, and local origin.
Do NOT use marketing buzzwords. Write as if the farmer is speaking naturally.
Return only the description text, nothing else."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": 150, "temperature": 0.7},
            },
            timeout=20.0,
        )
        data = response.json()
        description = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return {"description": description}