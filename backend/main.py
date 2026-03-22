import os
import json
import logging
from pathlib import Path
from threading import Thread
from time import perf_counter
from typing import Any
from dotenv import load_dotenv

# Load .env before any module that reads env vars at import time (e.g. analytics lru_cache)
ROOT_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ROOT_ENV_PATH)

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

try:
    from .analytics import (
        analytics_enabled,
        estimate_api_cost,
        extract_token_count,
        safe_record_transform_event,
        safe_start_session,
        summarize_ops,
    )
except ImportError:
    from analytics import (
        analytics_enabled,
        estimate_api_cost,
        extract_token_count,
        safe_record_transform_event,
        safe_start_session,
        summarize_ops,
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ibrowse.backend")
logger.info("loading env from %s", ROOT_ENV_PATH)

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
    temporary_user_id: str = Field(min_length=1)
    client_instance_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    page_url: str | None = None
    browser_info: str | None = None
    preset_used: str | None = None


class SessionStartRequest(BaseModel):
    temporary_user_id: str = Field(min_length=1)
    client_instance_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    browser_info: str | None = None


class TransformEventRequest(BaseModel):
    temporary_user_id: str = Field(min_length=1)
    client_instance_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    page_url: str | None = None
    browser_info: str | None = None
    prompt: str
    preset_used: str | None = None
    status: str
    hide_count: int = 0
    remove_count: int = 0
    restyle_count: int = 0
    inject_count: int = 0
    total_affected_count: int = 0
    snapshot_node_count: int | None = None
    estimated_tokens: int | None = None
    estimated_api_cost: float | None = None
    latency_ms: int | None = None
    error_message: str | None = None


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


def run_in_background(fn, **kwargs):
    Thread(target=fn, kwargs=kwargs, daemon=True).start()


@app.post("/transform")
async def transform(req: TransformRequest):
    logger.info(
        "transform start temporary_user_id=%s client_instance_id=%s session_id=%s prompt_len=%s snapshot_nodes=%s page_url=%s",
        req.temporary_user_id,
        req.client_instance_id,
        req.session_id,
        len(req.prompt),
        len(req.snapshot),
        req.page_url,
    )
    snapshot_text = build_snapshot_text(req.snapshot)
    user_message = f"Instruction: {req.prompt}\n\nSnapshot:\n{snapshot_text}"
    started_at = perf_counter()
    ops: dict[str, Any] = {"remove": [], "hide": [], "restyle": {}, "inject": []}
    token_count = None
    error_message = None
    status = "failed"

    try:
        client = get_client()
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
        token_count = extract_token_count(response)
        status = "success"
        logger.info("transform success session_id=%s", req.session_id)

        return ops

    except json.JSONDecodeError as e:
        error_message = f"Gemini returned invalid JSON: {e}"
        logger.exception("transform invalid json session_id=%s", req.session_id)
        raise HTTPException(status_code=500, detail=error_message)
    except HTTPException as exc:
        error_message = str(exc.detail)
        logger.warning("transform http error session_id=%s detail=%s", req.session_id, error_message)
        raise
    except Exception as e:
        error_message = str(e)
        logger.exception("transform unexpected error session_id=%s", req.session_id)
        raise HTTPException(status_code=500, detail=error_message)
    finally:
        analytics_counts = summarize_ops(ops)
        latency_ms = int((perf_counter() - started_at) * 1000)
        logger.info(
            "queue transform analytics session_id=%s status=%s latency_ms=%s",
            req.session_id,
            status,
            latency_ms,
        )
        run_in_background(
            safe_record_transform_event,
            temporary_user_id=req.temporary_user_id,
            client_instance_id=req.client_instance_id,
            session_id=req.session_id,
            page_url=req.page_url,
            prompt=req.prompt,
            preset_used=req.preset_used,
            status=status,
            snapshot_node_count=len(req.snapshot),
            estimated_tokens=token_count,
            estimated_api_cost=estimate_api_cost(token_count),
            latency_ms=latency_ms,
            error_message=error_message,
            browser_info=req.browser_info,
            **analytics_counts,
        )


@app.post("/analytics/session/start")
async def start_analytics_session(req: SessionStartRequest):
    logger.info("analytics session start session_id=%s", req.session_id)
    if not analytics_enabled():
        return {"status": "disabled"}

    run_in_background(
        safe_start_session,
        temporary_user_id=req.temporary_user_id,
        client_instance_id=req.client_instance_id,
        session_id=req.session_id,
        browser_info=req.browser_info,
    )
    return {"status": "ok", "session_id": req.session_id}


@app.post("/analytics/transform-event")
async def create_transform_event(req: TransformEventRequest):
    logger.info(
        "analytics event start temporary_user_id=%s client_instance_id=%s session_id=%s status=%s preset=%s",
        req.temporary_user_id,
        req.client_instance_id,
        req.session_id,
        req.status,
        req.preset_used,
    )
    if not analytics_enabled():
        return {"status": "disabled"}

    run_in_background(
        safe_record_transform_event,
        temporary_user_id=req.temporary_user_id,
        client_instance_id=req.client_instance_id,
        session_id=req.session_id,
        page_url=req.page_url,
        prompt=req.prompt,
        preset_used=req.preset_used,
        status=req.status,
        hide_count=req.hide_count,
        remove_count=req.remove_count,
        restyle_count=req.restyle_count,
        inject_count=req.inject_count,
        total_affected_count=req.total_affected_count,
        snapshot_node_count=req.snapshot_node_count,
        estimated_tokens=req.estimated_tokens,
        estimated_api_cost=req.estimated_api_cost,
        latency_ms=req.latency_ms,
        error_message=req.error_message,
        browser_info=req.browser_info,
    )
    return {"status": "ok"}


ELEVENLABS_API_KEY = "sk_ce781fbefe729976f84005e9b25c534e65081973bd176b39"
ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"


class ChatRequest(BaseModel):
    message: str
    page_context: str = ""


class TTSRequest(BaseModel):
    text: str


@app.post("/chat")
async def chat(req: ChatRequest):
    system = f"""You are a helpful assistant answering questions about a webpage the user is reading.
Be concise — 1-3 sentences max. Speak naturally as if in a conversation.
Page content:
{req.page_context[:3000]}"""

    try:
        client = get_client()
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=256,
            ),
        )
        text = response.text or ""
        return {"reply": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts")
async def tts(req: TTSRequest):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            url,
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
            json={"text": req.text, "model_id": "eleven_turbo_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"ElevenLabs error {r.status_code}: {r.text[:200]}")
    return Response(content=r.content, media_type="audio/mpeg")


@app.get("/health")
async def health():
    return {"status": "ok"}
