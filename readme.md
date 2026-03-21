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
