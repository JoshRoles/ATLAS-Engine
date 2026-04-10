# Run & deploy guide — Atlas Engine

## Local development

1. **Start the API first** (port 8000): see `CURSOR_BRIEF.md` (`uvicorn` from `backend/`).  
2. **Start the UI** (`frontend/` → `npm run dev`). Vite prints URLs — use **`http://127.0.0.1:5173`** if `localhost` does not resolve on your machine.  
3. Add at least one pair from the top-20 list so the Binance WebSocket subscribes to streams.

If the page does not load: confirm nothing else is using ports **8000** and **5173**, and that the backend is running before the frontend (API calls and WS proxy will fail otherwise).

## Production (outline)

- **Backend:** Railway/Render — `uvicorn main:app --host 0.0.0.0 --port $PORT`, persist `./data` on a volume.  
- **Frontend:** Vercel — `npm run build`, output `dist`, set `VITE_API_URL` / `VITE_WS_URL` to the public API and `wss://` URLs.
