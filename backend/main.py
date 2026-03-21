import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="I Browse backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are a DOM transformation engine for a browser extension.
Respond with ONLY a valid JSON object — no explanation, no markdown, no code fences:
{"remove":[],"hide":[],"restyle":{},"inject":[]}

Rules:
- All four keys must always be present.
- Prefer hide over remove unless user says delete/remove.
- Keep selectors short. Max 5 selectors per key.
- For YouTube video cards use: ytd-rich-item-renderer:has([href*="HANDLE"]) or ytd-rich-item-renderer:has([aria-label*="NAME"])
- Only use selectors you can confirm from the snapshot.
- For inject items, you may use either:
  - Simple: {"tag":"div","id":"x","text":"hello","css":"color:red"}
  - Rich HTML: {"tag":"div","payload":"<div style='...'>...full html...</div>","location":"body"}
  Use "payload" when you need to inject complex HTML like diagrams, overlays, or cards."""


class TransformRequest(BaseModel):
    prompt: str
    snapshot: list[dict[str, Any]]


def get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not set. Presets still work, but AI transforms require a Gemini API key.",
        )
    return genai.Client(api_key=api_key)


def build_snapshot_text(snapshot: list[dict]) -> str:
    lines = []
    for el in snapshot[:150]:
        tag = el.get("tag", "")
        id_ = el.get("id", "")
        aria = el.get("ariaLabel", "")
        href = el.get("href", "")
        text = el.get("text", "").strip().replace("\n", " ")[:60]

        parts = [tag]
        if id_:
            parts.append(f'id="{id_}"')
        if aria:
            parts.append(f'aria-label="{aria[:60]}"')
        if href:
            parts.append(f'href="{href[:60]}"')
        if text:
            parts.append(f'>{text}')
        lines.append(" ".join(parts))
    return "\n".join(lines)


@app.post("/transform")
async def transform(req: TransformRequest):
    snapshot_text = build_snapshot_text(req.snapshot)
    user_message = f"Instruction: {req.prompt}\n\nSnapshot:\n{snapshot_text}"
    client = get_client()

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )

        raw = response.text
        if not raw or not raw.strip():
            raise HTTPException(status_code=500, detail="Gemini returned an empty response")

        raw = raw.strip()

        # Strip markdown fences just in case
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        ops = json.loads(raw)
        ops.setdefault("remove", [])
        ops.setdefault("hide", [])
        ops.setdefault("restyle", {})
        ops.setdefault("inject", [])

        return ops

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Gemini returned invalid JSON: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
