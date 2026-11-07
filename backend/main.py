from fastapi import FastAPI

from backend.agent.chat import router as chat_router

app = FastAPI(title="Personal Agentic Toolkit API")
app.include_router(chat_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Return a lightweight readiness response for the desktop application."""
    return {"status": "ok"}
