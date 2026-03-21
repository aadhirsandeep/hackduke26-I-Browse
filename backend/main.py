import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
import anthropic

app = FastAPI(title="evolve(browser) backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a DOM transformation engine for a browser extension.
Respond with ONLY a valid JSON object matching this schema exactly — no explanation, no markdown, no code fences:
{ "remove": [], "hide": [], "restyle": {}, "inject": [] }
Use only selectors likely to match real elements from the snapshot.
Prefer "hide" over "remove" unless the user explicitly says delete.
All four keys must always be present."""


class SnapshotElement(BaseModel):
    tag: str
    id: str
    className: str
    text: str


class TransformRequest(BaseModel):
    prompt: str
    snapshot: list[dict[str, Any]]


@app.post("/transform")
async def transform(req: TransformRequest):
    snapshot_text = "\n".join(
        f"<{el.get('tag', '')} id=\"{el.get('id', '')}\" class=\"{el.get('className', '')}\">{el.get('text', '')}</{el.get('tag', '')}>"
        for el in req.snapshot[:200]
    )

    user_message = f"""User instruction: {req.prompt}

DOM snapshot (top 200 elements):
{snapshot_text}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = message.content[0].text.strip()

        # Strip markdown fences if Claude adds them despite instructions
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        ops = json.loads(raw)

        # Ensure all four keys present
        ops.setdefault("remove", [])
        ops.setdefault("hide", [])
        ops.setdefault("restyle", {})
        ops.setdefault("inject", [])

        return ops

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Claude returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
