"""Watchlist and market data routes."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from binance_feed import fetch_klines
from config import settings
from database import get_db
from models import WatchedPair

router = APIRouter(prefix="/api/pairs", tags=["pairs"])


def _display(symbol: str) -> str:
    if symbol.endswith("USDT"):
        return f"{symbol[:-4]}/USDT"
    return symbol


class PairCreate(BaseModel):
    symbol: str = Field(..., min_length=6, max_length=32)


@router.get("/")
def list_pairs(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.query(WatchedPair).filter(WatchedPair.active.is_(True)).order_by(WatchedPair.added_at).all()
    return [
        {
            "id": r.id,
            "symbol": r.symbol,
            "display_name": r.display_name,
            "added_at": r.added_at.isoformat(timespec="seconds"),
            "active": r.active,
        }
        for r in rows
    ]


@router.post("/")
def add_pair(
    body: PairCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    sym = body.symbol.upper().replace("/", "")
    if sym not in settings.top_pairs:
        raise HTTPException(400, "Symbol not in permitted list")
    existing = db.query(WatchedPair).filter(WatchedPair.symbol == sym).first()
    if existing:
        existing.active = True
        db.commit()
        db.refresh(existing)
        r = existing
    else:
        r = WatchedPair(symbol=sym, display_name=_display(sym), active=True)
        db.add(r)
        db.commit()
        db.refresh(r)
    rf = getattr(request.app.state, "refresh_feed", None)
    if callable(rf):
        rf()
    return {
        "id": r.id,
        "symbol": r.symbol,
        "display_name": r.display_name,
        "added_at": r.added_at.isoformat(timespec="seconds"),
        "active": r.active,
    }


@router.delete("/{symbol}")
def remove_pair(symbol: str, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    sym = symbol.upper().replace("/", "")
    row = db.query(WatchedPair).filter(WatchedPair.symbol == sym).first()
    if not row:
        raise HTTPException(404, "Pair not found")
    row.active = False
    db.commit()
    rf = getattr(request.app.state, "refresh_feed", None)
    if callable(rf):
        rf()
    return {"status": "ok"}


@router.get("/available")
def available_pairs() -> dict[str, list[str]]:
    return {"symbols": list(settings.top_pairs)}


@router.get("/{symbol}/stats")
async def pair_stats(symbol: str) -> dict[str, Any]:
    sym = symbol.upper().replace("/", "")
    url = "https://api.binance.com/api/v3/ticker/24hr"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url, params={"symbol": sym})
        if r.status_code == 400:
            raise HTTPException(400, "Invalid symbol")
        r.raise_for_status()
        t = r.json()
    last = float(t["lastPrice"])
    open_p = float(t["openPrice"])
    change_pct = ((last - open_p) / open_p * 100) if open_p else 0.0
    return {
        "symbol": sym,
        "last_price": last,
        "change_pct": round(change_pct, 2),
        "high": float(t["highPrice"]),
        "low": float(t["lowPrice"]),
        "volume": float(t["volume"]),
        "quote_volume": float(t["quoteVolume"]),
    }


@router.get("/{symbol}/candles")
async def pair_candles(
    symbol: str,
    tf: str = "15m",
    limit: int = 200,
) -> dict[str, Any]:
    sym = symbol.upper().replace("/", "")
    allowed = {"15m", "1h", "4h"}
    if tf not in allowed:
        raise HTTPException(400, "Invalid timeframe")
    lim = max(50, min(limit, 1000))
    # small stagger to respect rate limits when many clients hit at once
    await asyncio.sleep(0.05)
    rows = await fetch_klines(sym, tf, lim)
    return {"symbol": sym, "tf": tf, "candles": rows}
