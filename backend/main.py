import os
import json
from pathlib import Path
from typing import Any

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from google import genai
from google.genai import types
from jwt import InvalidTokenError, PyJWKClient

load_dotenv(Path(__file__).resolve().parent / ".env")

import analytics
import time as _time
from collections import deque

# In-memory event store — last 200 transforms, shared across requests
_event_store: deque = deque(maxlen=200)

app = FastAPI(title="I Browse backend")

from routers.presets import router as presets_router
app.include_router(presets_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

AUTH0_DOMAIN = (os.environ.get("AUTH0_DOMAIN") or "").replace("https://", "").rstrip("/")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE") or ""
AUTH0_CLIENT_ID = os.environ.get("AUTH0_CLIENT_ID") or ""
AUTH0_ISSUER = f"https://{AUTH0_DOMAIN}/" if AUTH0_DOMAIN else ""
JWKS_CLIENT = (
    PyJWKClient(f"{AUTH0_ISSUER}.well-known/jwks.json")
    if AUTH0_DOMAIN
    else None
)
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY") or ""
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID") or ""

SYSTEM_PROMPT = """You are a DOM transformation engine for a browser extension.
Respond with ONLY a valid JSON object — no explanation, no markdown, no code fences:
{"remove":[],"hide":[],"restyle":{},"inject":[]}

Rules:
- All four keys must always be present.
- Prefer hide over remove unless user says delete/remove.
- Keep selectors short. Max 5 selectors per key.
- For YouTube video cards use: ytd-rich-item-renderer:has([href*="HANDLE"]) or ytd-rich-item-renderer:has([aria-label*="NAME"])
- For YouTube Shorts: always include ytd-guide-entry-renderer:has([title="Shorts"]) to remove the Shorts entry from the sidebar, in addition to any Shorts video cards (ytd-rich-section-renderer, ytd-reel-shelf-renderer).
- For high contrast or colorblind/accessibility requests: use restyle to set body background to #000000 and all text elements (body, p, h1, h2, h3, h4, h5, h6, a, span, li, td, th, label) to color #FFFFFF, and links (a) to #FFFF00. Also inject a global <style> tag with payload: "<style>*{outline:none!important} a{color:#FFFF00!important} body,p,h1,h2,h3,h4,h5,h6,span,li,td,th,label{color:#FFFFFF!important;background:#000000!important} img{filter:contrast(1.2)}</style>".
- Only use selectors you can confirm from the snapshot.
- For inject items, you may use either:
  - Simple: {"tag":"div","id":"x","text":"hello","css":"color:red"}
  - Rich HTML: {"tag":"div","payload":"<div style='...'>...full html...</div>","location":"body"}
  Use "payload" when you need to inject complex HTML like diagrams, overlays, or cards."""


class TransformRequest(BaseModel):
    prompt: str
    snapshot: list[dict[str, Any]]
    temporary_user_id: str | None = None
    client_instance_id: str | None = None
    session_id: str | None = None
    page_url: str | None = None
    preset_used: str | None = None
    browser_info: str | None = None


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


def require_access_token(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
        raise HTTPException(status_code=500, detail="Auth0 API is not configured on the backend")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        signing_key = JWKS_CLIENT.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=AUTH0_AUDIENCE,
            issuer=AUTH0_ISSUER,
        )
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc


@app.get("/auth/config")
async def auth_config():
    return {
        "configured": bool(AUTH0_DOMAIN and AUTH0_CLIENT_ID and AUTH0_AUDIENCE),
        "domain": AUTH0_DOMAIN,
        "clientId": AUTH0_CLIENT_ID,
        "audience": AUTH0_AUDIENCE,
    }


@app.post("/transform")
async def transform(
    req: TransformRequest,
    claims: dict[str, Any] = Depends(lambda authorization=Header(default=None): require_access_token(authorization) if authorization else {}),
):
    snapshot_text = build_snapshot_text(req.snapshot)
    user_message = f"Instruction: {req.prompt}\n\nSnapshot:\n{snapshot_text}"
    t_start = time.monotonic()

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
        ops["requestedBy"] = claims.get("sub", "")

        latency_ms = int((_time.monotonic() - t_start) * 1000)
        op_summary = analytics.summarize_ops(ops)
        token_count = analytics.extract_token_count(response)

        # Push to in-memory store for dashboard polling
        domain = analytics.parse_domain(req.page_url) if req.page_url else "unknown"
        _event_store.append({
            "id": str(__import__("uuid").uuid4()),
            "created_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "domain": domain,
            "prompt": req.prompt,
            "preset_used": req.preset_used,
            "status": "success",
            "latency_ms": latency_ms,
            "snapshot_node_count": len(req.snapshot),
            **op_summary,
        })

        if req.temporary_user_id and req.session_id:
            analytics.safe_record_transform_event(
                temporary_user_id=req.temporary_user_id,
                client_instance_id=req.client_instance_id or req.temporary_user_id,
                session_id=req.session_id,
                page_url=req.page_url,
                prompt=req.prompt,
                preset_used=req.preset_used,
                status="success",
                latency_ms=latency_ms,
                snapshot_node_count=len(req.snapshot),
                estimated_tokens=token_count,
                estimated_api_cost=analytics.estimate_api_cost(token_count),
                browser_info=req.browser_info,
                **op_summary,
            )

        return ops

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Gemini returned invalid JSON: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    page_context: str = ""


class TTSRequest(BaseModel):
    text: str


@app.post("/chat")
async def chat(req: ChatRequest):
    system = f"""You are the I Browse voice assistant — a smart companion built into the I Browse browser extension that helps users understand and interact with web pages.
Never mention Gemini, Google, or any underlying AI model. If asked who you are, say you are the I Browse assistant.
Be concise — 2-4 sentences max. Always finish your sentences completely, never cut off mid-thought. Speak naturally as if in a conversation.
Page content:
{req.page_context[:3000]}"""

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=2048,
            ),
        )
        text = response.text or ""
        return {"reply": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts")
async def tts(req: TTSRequest):
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs is not configured on the backend",
        )

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    async with httpx.AsyncClient(timeout=30) as http_client:
        r = await http_client.post(
            url,
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"},
            json={"text": req.text, "model_id": "eleven_turbo_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=500, detail=f"ElevenLabs error {r.status_code}: {r.text[:200]}")
    return Response(content=r.content, media_type="audio/mpeg")


class SessionStartRequest(BaseModel):
    temporary_user_id: str
    client_instance_id: str
    session_id: str
    browser_info: str | None = None


class TransformEventRequest(BaseModel):
    temporary_user_id: str
    client_instance_id: str
    session_id: str
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
    latency_ms: int | None = None
    error_message: str | None = None


@app.post("/analytics/session/start", status_code=204)
async def analytics_session_start(req: SessionStartRequest):
    analytics.safe_start_session(
        temporary_user_id=req.temporary_user_id,
        client_instance_id=req.client_instance_id,
        session_id=req.session_id,
        browser_info=req.browser_info,
    )


@app.post("/analytics/transform-event", status_code=204)
async def analytics_transform_event(req: TransformEventRequest):
    analytics.safe_record_transform_event(
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
        latency_ms=req.latency_ms,
        error_message=req.error_message,
        browser_info=req.browser_info,
    )


@app.get("/events")
async def get_events():
    return list(reversed(list(_event_store)))


@app.get("/health")
async def health():
    return {"status": "ok"}
