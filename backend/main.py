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

app = FastAPI(title="I Browse backend")

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
async def transform(req: TransformRequest, claims: dict[str, Any] = Depends(require_access_token)):
    snapshot_text = build_snapshot_text(req.snapshot)
    user_message = f"Instruction: {req.prompt}\n\nSnapshot:\n{snapshot_text}"

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

        return ops

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Gemini returned invalid JSON: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    async with httpx.AsyncClient(timeout=30) as http_client:
        r = await http_client.post(
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
