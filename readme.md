# I Browse

A Chrome extension that lets users transform any webpage using natural language instructions, powered by Google Gemini and gated by Auth0 sign-in.

## What it does

The user types a prompt in the side panel (e.g. "hide all MrBeast videos" or "make this page easier to read") and the extension applies DOM transformations to the live page in real time — no page reload required.

## Architecture

```
Chrome Extension (MV3)
├── background.js         — opens side panel on icon click
├── content_script.js     — injected into all pages; collects DOM snapshot, applies ops
└── panel/                — built React side panel (Vite output)

sidepanel/ (React/Vite source)
└── App.jsx               — UI: prompt input, preset buttons, status/log display

backend/ (Python)
├── main.py               — FastAPI server, calls Gemini, returns ops JSON
└── requirements.txt
```

## Flow

1. User types a prompt in the side panel
2. Side panel sends `getSnapshot` to the content script — returns the top 300 meaningful DOM elements (tag, id, class, aria-label, href, text)
3. If needed, the side panel asks Auth0 to log the user in through Universal Login
4. Side panel POSTs `{ prompt, snapshot }` to `http://localhost:8000/transform` with an Auth0 bearer token
5. FastAPI validates the Auth0 access token, sends the prompt + snapshot to Gemini (`gemini-flash-latest`), and gets back a structured JSON instruction object
6. Side panel sends `{ type: "applyOps", ops }` to the content script
7. Content script executes ops in order: **restyle → inject → hide → remove**
8. Changed elements flash green (added/restyled) or red (hidden/removed) as visual diff feedback

## DOM Instruction Schema

Gemini always returns exactly this shape:

```json
{
  "remove": ["css selectors"],
  "hide": ["css selectors"],
  "restyle": { "selector": "css string" },
  "inject": [{ "tag": "div", "id": "id", "text": "text", "css": "inline css" }]
}
```

- `hide` — sets `display: none`, preferred over remove
- `remove` — calls `element.remove()`
- `restyle` — injects a `<style>` tag into the page head
- `inject` — creates and appends new DOM elements; supports a `payload` field for raw HTML

## Quick Presets

Four one-click presets that apply hardcoded ops with no API call:

| Preset | Effect | Best on |
|--------|--------|---------|
| Reader | Comfortable reading typography, max-width body | Wikipedia, Medium |
| Cinematic | Full dark mode via CSS color overrides | Wikipedia, news sites |
| Sensory | Warm muted palette, desaturated images | Any article page |
| Focus | Dark navy background, spotlight content area | Wikipedia, The Verge |

## Stack

- **Extension**: Manifest V3, vanilla JS content/background scripts
- **UI**: React 18 + Vite 5, built into `extension/panel/`
- **Backend**: Python FastAPI + `google-genai` SDK
- **AI**: `gemini-flash-latest` via Google Gemini API

## Setup

### Backend

```powershell
cd backend
pip install -r requirements.txt
$env:GEMINI_API_KEY="your_key_here"
$env:AUTH0_DOMAIN="your-tenant.us.auth0.com"
$env:AUTH0_CLIENT_ID="your_auth0_spa_or_native_client_id"
$env:AUTH0_AUDIENCE="https://ibrowse-api"
uvicorn main:app --reload --port 8000
```

You can also copy `backend/.env.example` to `backend/.env` and fill the values there.

### Auth0 Setup Notes

Use your existing Auth0 tenant, but configure it for this architecture instead of the Flask quickstart:

1. Create or reuse an Auth0 application for the Chrome extension login flow.
2. In that Auth0 application, add these Allowed Callback URLs:
   - `https://<your-extension-id>.chromiumapp.org/auth0`
   - `https://<your-extension-id>.chromiumapp.org/auth0-logout`
3. Add the same logout URL to Allowed Logout URLs.
4. Create or reuse an Auth0 API with an identifier such as `https://ibrowse-api`.
5. Set `AUTH0_AUDIENCE` in the backend to exactly that API identifier.
6. Enable the connections you want in Universal Login, such as Google, GitHub, and Username-Password-Authentication.

### Side Panel (build)

```powershell
cd extension/sidepanel
npm install
npm run build
# outputs to extension/panel/
```

### Load Extension

1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `extension/` folder
4. Click the I Browse icon in the toolbar to open the side panel

## Notes for LLMs

- The content script runs in the page context and communicates with the side panel via `chrome.tabs.sendMessage`
- The side panel is a Chrome side panel (not a popup) — it persists across navigation
- The extension now requires an Auth0 session before presets or prompts are usable
- Presets apply ops directly without hitting the backend
- `restyle` ops inject a `<style>` tag — they stack and are not reversible without a page reload
- The snapshot deliberately skips pure container divs to keep token usage low
- `gemini-flash-latest` is used because `gemini-2.0-flash` and `gemini-2.5-flash` are unavailable on the free tier API key in use
