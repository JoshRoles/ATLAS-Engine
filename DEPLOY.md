# Deploy Atlas Engine (Git + Vercel + API)

## What uses what

| Piece | What it is |
|--------|------------|
| **Charts** | [Lightweight Charts](https://github.com/tradingview/lightweight-charts) (open-source npm package). No TradingView.com login or API key. Your TradingView **premium** does not plug in here—it’s a different product. |
| **Market data** | Binance **public** REST + WebSocket. Works with **no keys**. Optional **read-only** API keys give higher rate limits (recommended for 24/7 VPS). |
| **This repo** | Monorepo: `backend/` (FastAPI), `frontend/` (Vite React). |

## 1. GitHub

```powershell
cd path\to\velocity-terminal
git init
git add .
git commit -m "Initial Atlas Engine monorepo"
```

Create an empty repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOU/atlas-engine.git
git branch -M main
git push -u origin main
```

## 2. Backend API (Railway recommended)

1. New project → **Deploy from GitHub** → select this repo.  
2. **Root directory / Watch paths:** `backend` (or add a Railway service with root `backend`).  
3. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`  
4. **Variables** (example):

   - `CORS_ORIGINS` = `https://YOUR-APP.vercel.app` (your exact Vercel URL, no trailing slash)  
   - Optional: `BINANCE_API_KEY`, `BINANCE_SECRET` (read-only keys)  

5. Add a **volume** mounted at `/app/data` (or your app’s `data` path) so SQLite survives restarts.  
6. Copy the public URL, e.g. `https://atlas-api-production.up.railway.app`.

Health check: `GET https://YOUR-API/health`

## 3. Frontend (Vercel)

1. **Import** the same GitHub repo.  
2. **Framework:** Vite  
3. **Root Directory:** `frontend`  
4. **Build:** `npm run build` · **Output:** `dist`  
5. **Environment variables:**

   - `VITE_API_URL` = `https://YOUR-API.up.railway.app` (no trailing slash)  
   - `VITE_WS_URL` = `wss://YOUR-API.up.railway.app/ws`  

Redeploy after changing env vars.

Open your Vercel URL: the app will call the API and WebSocket using those variables.

## 4. Local dev (unchanged)

- Terminal 1: `backend` → `uvicorn main:app --reload --host 127.0.0.1 --port 8000`  
- Terminal 2: `frontend` → `npm run dev`  
- Use `http://127.0.0.1:5173` — leave `VITE_*` unset so the Vite proxy talks to port 8000.

## Next: “Atlas Engine” pattern layer

After live data and flows are stable, we can add uploads (screenshots/PDFs/rules), pattern detection, and overlay rendering—that’s a separate feature pass on top of this baseline.
