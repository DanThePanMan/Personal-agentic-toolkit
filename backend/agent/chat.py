import os

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter

from backend.agent.schemas import ChatRequest, ChatResponse

load_dotenv()

router = APIRouter(prefix="/api/v1", tags=["chat"])
ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
ollama_model = os.getenv("OLLAMA_MODEL", "qwen3.5:9b")

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    messages = [
        {"role": "system", "content": "You are a helpful personal assistant."},
        *[item.model_dump() for item in request.history],
        {"role": "user", "content": request.message},
    ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{ollama_base_url}/api/chat",
            json={
                "model": ollama_model,
                "messages": messages,
                "stream": False,
            },
        )
        response.raise_for_status()

    data = response.json()
    return ChatResponse(message=data["message"]["content"], model=data["model"])
