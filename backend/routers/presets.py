import json
import os

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel

router = APIRouter()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

PRESET_SYSTEM_PROMPTS = {
    "soundtrack": """You are a DOM injection engine. Read the page text and classify its emotional tone as one of: tense, calm, melancholy, uplifting, mysterious.
Return ONLY valid JSON: {"remove":[],"hide":[],"restyle":{},"inject":[]}

In inject, include exactly two items:
1. A script tag payload that creates a Web Audio API ambient drone matching the tone:
   - calm: 2 sine oscillators at 110Hz+165Hz, gain 0.04, slow LFO vibrato
   - uplifting: 3 sine oscillators at 261Hz+329Hz+392Hz (C major), gain 0.035
   - melancholy: 2 sine oscillators at 220Hz+261Hz (minor), gain 0.04, slow tremolo
   - tense: 2 sawtooth oscillators at 55Hz+58Hz (beating), gain 0.03, filter sweep
   - mysterious: filtered noise + sine at 87Hz, gain 0.04
   The script must auto-start on load and store the AudioContext on window.__ibrowseAudio.
2. A fixed bottom-left control pill (id="ibrowse-audio-ctrl", position:fixed, bottom:18px, left:18px, z-index:99999) showing the detected mood emoji + a mute toggle button. Style it dark glassy: background rgba(10,10,20,0.85), border 1px solid rgba(255,255,255,0.12), border-radius 24px, padding 8px 14px, font-family sans-serif, font-size 12px, color #e2e8f0. The button calls window.__ibrowseAudio.suspend()/resume().""",

    "worldbuilder": """You are a DOM injection engine. Read the page text and identify the single most specific visual subject (examples: "baseball stadium", "Amazon rainforest", "medieval castle", "coral reef", "Mars surface", "Tokyo skyline at night", "arctic tundra", "Roman Colosseum", "hurricane", "quantum computer lab").

Return ONLY valid JSON: {"remove":[],"hide":[],"restyle":{},"inject":[]}

Inject TWO items:

Item 1: location "body-start". A cinematic full-width header with id="ibrowse-worldbuilder", position:fixed, top:0, left:0, width:100%, height:220px, z-index:99990, overflow:hidden.

Use a real photograph as the background. Pick the most iconic, visually stunning Wikipedia image URL for the detected subject from upload.wikimedia.org. Apply it as: background-image:url('WIKIMEDIA_URL'), background-size:cover, background-position:center top.

Layer over it a gradient overlay div: position:absolute, inset:0, background:linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%).

Bottom-left title: position:absolute, bottom:18px, left:24px, font-size:26px, font-weight:800, color:#fff, text-shadow:0 2px 16px rgba(0,0,0,0.95), font-family:Georgia serif, letter-spacing:-0.3px — use the actual page h1 text.

Top-right pill: position:absolute, top:12px, right:14px, background:rgba(0,0,0,0.55), border:1px solid rgba(255,255,255,0.18), border-radius:20px, padding:4px 12px, font-size:11px, color:rgba(255,255,255,0.85), font-family:sans-serif — show a relevant emoji + subject label (e.g. "⚾ Baseball Stadium", "🌿 Amazon Rainforest").

Item 2: No location. Payload: "<style>body { padding-top: 220px !important; }</style>""",

    "conceptmap": """You are a DOM injection engine. Extract 8-12 key concepts/arguments from the page. Identify relationships between them (supports, contradicts, leads-to, part-of).
Return ONLY valid JSON: {"remove":[],"hide":[],"restyle":{},"inject":[]}

Inject a fixed right sidebar: width 300px, height 100vh, top 0, right 0, position fixed, z-index 99998, background #0d0d16, border-left 1px solid #1e1e30, overflow hidden.

Inside it inject:
1. A header bar: "Concept Map" label + a close button (onclick sets sidebar display:none)
2. A <canvas id="ibrowse-concept-canvas"> filling the remaining height
3. A <script> that draws a force-directed graph on the canvas using pure JS (no libraries):
   - Nodes: colored circles with concept labels, sized by importance (1-3 scale)
   - Edges: lines between related concepts, colored by relationship type (green=supports, red=contradicts, blue=leads-to, grey=part-of)
   - Simple force simulation: repulsion between nodes, spring attraction along edges, 60fps requestAnimationFrame loop
   - Click a node to highlight it and show its connections; clicking a highlighted node scrolls the page to the first paragraph containing that word
   - Legend in bottom-left corner of sidebar""",

    "datavis": """You are a DOM injection engine. Analyze the page text. Find up to 5 specific claims containing numbers, percentages, dollar amounts, or statistics. For each claim, assess whether it is: likely accurate, uncertain, or potentially misleading (based on context and common knowledge).
Return ONLY valid JSON: {"remove":[],"hide":[],"restyle":{},"inject":[]}

For each statistic found, inject a styled card immediately after the paragraph containing it. Each card must be self-contained HTML+CSS with no external dependencies:
- Dark card: background #0f0f1a, border 1px solid #1e1e30, border-radius 10px, padding 14px 16px, margin 12px 0, font-family sans-serif
- Top row: the extracted statistic in large bold text (color #67e8f9) + a credibility badge (✓ Plausible in green / ⚠ Uncertain in amber / ✗ Questionable in red)
- A simple inline SVG bar or donut visualization of the number (e.g. a percentage becomes a donut chart drawn with SVG stroke-dasharray)
- 1-2 sentence context note in small grey text explaining what the number means or why it may need verification
- Source suggestion in italic (e.g. "Verify at: Our World in Data, CDC, IMF")
Max 5 cards total. Make them visually impressive.""",

    "conversation": """You are a DOM injection engine. Read the page text and rewrite the core content as a Socratic dialogue between two characters: "Alex" (the advocate — presents and defends the page's main argument) and "Jamie" (the skeptic — questions assumptions, asks for evidence, raises counterpoints). Preserve all key facts. Make it intellectually engaging with 6-10 exchanges.
Return ONLY valid JSON: {"remove":[],"hide":[],"restyle":{},"inject":[]}

Use hide: ["article", "main", ".article-body", ".post-content", "#content"] to hide original content.

Inject the dialogue as a beautiful chat UI overlay:
- Outer container: max-width 760px, margin 40px auto, font-family system-ui, padding 0 20px
- Each message: display flex, gap 12px, margin-bottom 20px
- Alex (left): avatar circle #6366f1 with "A", bubble background #1e1b4b, border-radius 4px 18px 18px 18px, padding 14px 18px, color #e0e7ff, max-width 78%
- Jamie (right): avatar circle #db2777 with "J", justify-content flex-end, bubble background #1f1218, border-radius 18px 4px 18px 18px, padding 14px 18px, color #fce7f3, max-width 78%
- Character name above each bubble in small bold colored text
- Fade-in animation: @keyframes fadeUp {from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)}}
- Each bubble gets animation-delay staggered by 0.15s * index
- Add a "Show original" button fixed bottom-right that toggles the hidden content""",
}


class PresetRequest(BaseModel):
    preset_id: str
    pageText: str
    pageHTML: str
    choice: str | None = None


@router.post("/preset")
async def run_preset(req: PresetRequest):
    system_prompt_template = PRESET_SYSTEM_PROMPTS.get(req.preset_id)
    if system_prompt_template is None:
        raise HTTPException(status_code=404, detail=f"Unknown preset: {req.preset_id}")

    # Substitute {choice} placeholder if present
    choice_value = req.choice or ""
    system_prompt = system_prompt_template.replace("{choice}", choice_value)

    # Truncate inputs to stay within token limits
    page_text = req.pageText[:6000]
    page_html = req.pageHTML[:3000]

    user_message = f"Page Text:\n{page_text}\n\nPage HTML:\n{page_html}"

    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=8192,
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

        # Extract first complete JSON object if Gemini wrapped it
        if not raw.startswith("{"):
            start = raw.find("{")
            if start != -1:
                raw = raw[start:]

        # If JSON is truncated (common with large inject payloads), try to salvage it
        try:
            ops = json.loads(raw)
        except json.JSONDecodeError:
            # Try to find and parse just the top-level object up to where it breaks
            # Fall back to empty ops rather than crashing
            ops = {}

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
