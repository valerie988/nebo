import os
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger("uvicorn.error")

ai_router = APIRouter(prefix="/ai", tags=["ai"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

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

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured.")

    prompt = f"""Write a short, warm, and honest product description for a Cameroonian farmer selling "{name}"{f" (category: {category})" if category else ""}{f" from {location}" if location else ""}.

Keep it 2-3 sentences. Focus on freshness, quality, and local origin.
Do NOT use marketing buzzwords. Write as if the farmer is speaking naturally.
Return only the description text, nothing else."""

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                    "temperature": 0.7,
                },
                timeout=20.0,
            )
            response.raise_for_status()
            data = response.json()
            description = data["choices"][0]["message"]["content"].strip()
            return {"description": description}

        except httpx.HTTPStatusError as exc:
            logger.error(f"Groq API error ({exc.response.status_code}): {exc.response.text}")
            raise HTTPException(status_code=502, detail="AI service returned an error.")
        except Exception as exc:
            logger.error(f"Groq error: {exc}")
            raise HTTPException(status_code=504, detail="Could not reach AI service.")