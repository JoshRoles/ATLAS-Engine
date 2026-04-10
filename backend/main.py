"""Atlas Engine — FastAPI entrypoint."""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from binance_feed import TF_TO_STREAM, BinanceFeed, fetch_klines
from config import cors_list, settings
from database import Base, SessionLocal, engine
import models  # noqa: F401 — register ORM metadata
from models import SignalRecord, WatchedPair
from routes import pairs, positions, signals
from routes.ws import ConnectionManager
from scanner import Scanner

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

manager = ConnectionManager()
scanner: Scanner | None = None
feed: BinanceFeed | None = None


async def broadcast(payload: dict[str, Any]) -> None:
    await manager.broadcast_json(payload)


def _symbols_from_db() -> list[str]:
    db = SessionLocal()
    try:
        rows = db.query(WatchedPair).filter(WatchedPair.active.is_(True)).all()
        return [r.symbol for r in rows]
    finally:
        db.close()


async def preload_history() -> None:
    assert scanner is not None
    syms = _symbols_from_db()
    for i, sym in enumerate(syms):
        for tf in TF_TO_STREAM:
            try:
                rows = await fetch_klines(sym, tf, settings.candle_lookback)
                await scanner.bootstrap_history(sym, tf, rows)
            except Exception as e:
                logger.warning("preload %s %s: %s", sym, tf, e)
        await asyncio.sleep(0.12 * (i + 1))


def refresh_feed() -> None:
    global feed
    if feed is None:
        return
    syms = _symbols_from_db()
    feed.set_symbols(syms)
    feed.start()
    logger.info("Feed refreshed, symbols=%s", syms)


def cleanup_expired_signals() -> None:
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        db.query(SignalRecord).filter(SignalRecord.expires_at < now).delete()
        db.commit()
    except Exception as e:
        logger.warning("cleanup signals: %s", e)
        db.rollback()
    finally:
        db.close()


scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scanner, feed
    Base.metadata.create_all(bind=engine)
    scanner = Scanner(broadcast)
    feed = BinanceFeed(scanner.on_candle_update, _on_price)
    feed.set_symbols(_symbols_from_db())
    await preload_history()
    feed.start()
    scheduler.add_job(cleanup_expired_signals, "interval", hours=2)
    scheduler.start()
    app.state.refresh_feed = refresh_feed
    yield
    scheduler.shutdown(wait=False)
    if feed:
        await feed.stop()


async def _on_price(pair: str, price: float) -> None:
    assert scanner is not None
    await broadcast({"type": "price", "pair": pair, "price": price})
    await scanner.update_position_prices(pair, price)


app = FastAPI(title="Atlas Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pairs.router)
app.include_router(signals.router)
app.include_router(positions.router)


@app.get("/health")
def health() -> dict[str, Any]:
    n_pairs = len(_symbols_from_db())
    return {
        "status": "ok",
        "clients": manager.client_count,
        "pairs_scanning": n_pairs,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
