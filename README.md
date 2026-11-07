# Personal-agentic-toolkit

An ever growing agentic AI powered toolkit that helps with my daily activities.

## Backend

The first backend feature is a FastAPI chat endpoint that sends a system message,
the supplied chat history, and the new user message to a local Ollama model.

### Setup

1. Install [uv](https://docs.astral.sh/uv/).
2. Create the project environment and install its packages:

   ```powershell
   uv sync
   ```

3. Copy `.env.example` to `.env` and set `OLLAMA_MODEL` to an installed Ollama model.
4. Start Ollama and make sure the selected model is available.
5. Start the API from the repository root:

   ```powershell
   uv run uvicorn backend.main:app --reload
   ```

### Chat endpoint

```text
POST /api/v1/chat
```

```json
{
  "message": "Explain FastAPI.",
  "history": [
    {"role": "user", "content": "I am learning Python."},
    {"role": "assistant", "content": "Good. What do you want to build?"}
  ]
}
```

The response contains the assistant message and the Ollama model that generated it.


funcitonalities planned:
 - basic chat window + toggle ollama/hosted backend (plus compaction)
 - search assistant + notetaking (searxng)
 - sync with notion+obsidian
 - automatic calendar mcp call + push notificaiton

other funcitonalities for the future
 - daily brief pushed to phone, with my calendar event, to do, plan for the day, unread emails, etc.
 - integration with other mcp
 - assignment assistant (tracking + resource gather)
 - integrate push notification for assignment deadlines
 - voice activated something idk

 architecture planning:
  - fast api backend for llm chat, not sure what else is needed since mcp handles it
  - langchain for chain of thought and agentic execution loop (search, summarize results, etc)
