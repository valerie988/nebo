import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import User

# Set up a logger to see what's actually happening when things break
logger = logging.getLogger("uvicorn.error")

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

    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY environment variable is not set.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service configuration error."
        )

    prompt = f"""Write a short, warm, and honest product description for a Cameroonian farmer selling "{name}"{f" (category: {category})" if category else ""}{f" from {location}" if location else ""}.

Keep it 2-3 sentences. Focus on freshness, quality, and local origin.
Do NOT use marketing buzzwords. Write as if the farmer is speaking naturally.
Return only the description text, nothing else."""

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": 150, "temperature": 0.7},
                },
                timeout=20.0,
            )
            
            # This will raise an httpx.HTTPStatusError if the response is a 4xx or 5xx
            response.raise_for_status()
            
        except httpx.HTTPStatusError as exc:
            # Captures explicit Gemini API errors (Bad Key, Blocked Prompt, Over Limit)
            logger.error(f"Gemini API error ({exc.response.status_code}): {exc.response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service returned an error: {exc.response.reason_phrase}"
            )
        except httpx.RequestError as exc:
            # Captures network timeouts or connection drops
            logger.error(f"Network error contacting Gemini API: {exc}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Timed out connecting to the AI service."
            )

        data = response.json()
        
        # Safe extraction guarding against content safety blocks or structural surprises
        try:
            # Check if safety filters blocked the response entirely
            finish_reason = data["candidates"][0].get("finishReason")
            if finish_reason and finish_reason != "STOP":
                logger.warning(f"Gemini generation did not finish normally. Reason: {finish_reason}")
                if finish_reason == "SAFETY":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The request generated content that violated safety guidelines."
                    )

            description = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return {"description": description}
            
        except (KeyError, IndexError) as exc:
            logger.error(f"Failed to parse valid Gemini response. JSON payload was: {data} | Error: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Received an unparseable response payload from the AI service."
            )