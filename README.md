# Atlas Engine

Personal crypto **intelligence** app: Binance **read-only** data, TA scanner, signals, and trade tracking. **Does not execute trades.**

## Quick start (local)

See **`DEPLOY.md`** for GitHub + Vercel + Railway. For local only:

```powershell
# API — port 8000
cd backend
py -3 -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
# UI — port 5173
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**, add a pair under Watch, confirm the API is running first.

## Env templates

- `backend/.env.example` — Binance (optional), `CORS_ORIGINS`  
- `frontend/.env.example` — `VITE_API_URL`, `VITE_WS_URL` for production builds  

## Docs

- `CURSOR_BRIEF.md` — stack and schema summary  
- `RUN_GUIDE.md` — run / deploy outline  
