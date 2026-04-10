# Atlas Engine — Cursor build brief

Personal 24/7 crypto trading intelligence web app: Binance **read-only** data, TA engine on a watchlist (≤20 pairs), entry signals, and live trade tracking. **No execution** — Binance is the execution layer.

## Stack

- **Backend:** Python 3.11+, FastAPI, SQLite + SQLAlchemy, pandas/numpy, APScheduler  
- **Frontend:** React + Vite, Zustand, TradingView Lightweight Charts v4, Tailwind CSS, Web Notifications  

## Layout

- **Fold breakpoint:** `600px` — below: bottom tabs; above: 64px icon sidebar, split Watch list/chart.

## Run locally

**Backend** (from `backend/`):

```bash
py -3 -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

Open **`http://127.0.0.1:5173`** or **`http://localhost:5173`** — Vite listens on all interfaces (`host: true`). The dev server proxies `/api`, `/health`, and `/ws` to port **8000** (start the API first).

## Env (optional)

- `BINANCE_API_KEY` / `BINANCE_SECRET` — not required for public REST/WS.  
- Production frontend: `VITE_API_URL`, `VITE_WS_URL` if the API is on another origin.

## Data

SQLite file: `data/atlas.db` (created on first run). If you still have `velocity.db` from an older build, rename it to `atlas.db` or copy it to migrate.
