## Dashboard Local Setup

Install dashboard dependencies:

```bash
cd dashboard
npm install
```

Run the dashboard locally:

```bash
npm run dev -- --host 127.0.0.1
```

Local dashboard URL:

```text
http://127.0.0.1:4173/
```

Notes:
- The extension `Open Dashboard` button only works while the local dashboard server is running.
- After changing or rebuilding the extension sidepanel, reload the unpacked extension in `chrome://extensions`.

## Supabase Analytics Setup

1. Copy `.env.example` to `.env` in the repo root and fill in:
   - `GEMINI_API_KEY`
   - `GEMINI_ESTIMATED_COST_PER_1K_TOKENS_USD`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Apply the SQL in `supabase/schema.sql` using the Supabase SQL editor.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only. The extension and dashboard should never receive it.
4. The backend currently uses the model alias `gemini-flash-latest`, so `GEMINI_ESTIMATED_COST_PER_1K_TOKENS_USD` is intentionally a project-managed estimate for rough dashboard cost reporting.
5. The current dashboard reads analytics for the temporary local user id passed from the extension. This is a temporary dev-mode bridge until Auth0 user ids are wired in.

Start the backend:

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Start the dashboard:

```bash
cd dashboard
npm install
npm run dev -- --host 127.0.0.1
```

If you changed extension sidepanel source and need a rebuild:

```bash
cd extension/sidepanel
npm install
npm run build
```

Then reload the unpacked extension in `chrome://extensions`.

## Supabase Analytics Quick Test

1. Fill `.env` with real Supabase and Gemini values.
2. Run `supabase/schema.sql` in your Supabase project.
3. Restart the backend after setting env vars.
4. Restart the dashboard after setting env vars.
5. Open `http://127.0.0.1:4173/` or click `Open Dashboard` from the extension.
6. Reload the unpacked extension in `chrome://extensions` if you rebuilt the sidepanel.
7. On a normal webpage, open the extension and run one custom transform or one preset.
8. Confirm the transform still works even if analytics logging has an issue.
9. Refresh the dashboard and verify:
   - a `users` row exists for the temporary local identity
   - a `browser_sessions` row exists for the current session
   - one or more `transform_events` rows exist
   - Recent Transformations and the derived dashboard sections populate
10. If no rows appear, verify:
   - backend has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - dashboard has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - backend and dashboard were restarted after updating `.env`
