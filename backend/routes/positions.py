"""Active setups and closed trade history."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import ActiveSetup, SignalRecord

router = APIRouter(prefix="/api/positions", tags=["positions"])


class ConfirmBody(BaseModel):
    signal_id: int | None = None
    pair: str = Field(..., min_length=6)
    direction: str = Field(..., pattern="^(LONG|SHORT)$")
    entry_price: float = Field(..., gt=0)
    position_size_usdt: float = Field(..., gt=0)
    stop_loss: float | None = None
    take_profit: float | None = None
    strategy_name: str | None = None
    notes: str = ""


class CloseBody(BaseModel):
    exit_price: float = Field(..., gt=0)


def _setup_dict(r: ActiveSetup) -> dict[str, Any]:
    return {
        "id": r.id,
        "signal_id": r.signal_id,
        "pair": r.pair,
        "direction": r.direction,
        "entry_price": r.entry_price,
        "position_size_usdt": r.position_size_usdt,
        "stop_loss": r.stop_loss,
        "take_profit": r.take_profit,
        "strategy_name": r.strategy_name,
        "notes": r.notes or "",
        "created_at": r.created_at.isoformat(timespec="seconds"),
        "status": r.status,
        "current_price": r.current_price,
        "closed_at": r.closed_at.isoformat(timespec="seconds") if r.closed_at else None,
        "exit_price": r.exit_price,
        "pnl_usdt": r.pnl_usdt,
    }


@router.get("/active")
def active_positions(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(ActiveSetup)
        .filter(ActiveSetup.status == "open")
        .order_by(ActiveSetup.created_at.desc())
        .all()
    )
    return [_setup_dict(r) for r in rows]


@router.get("/history")
def history(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(ActiveSetup)
        .filter(ActiveSetup.status == "closed")
        .order_by(ActiveSetup.closed_at.desc().nullslast())
        .all()
    )
    return [_setup_dict(r) for r in rows]


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict[str, Any]:
    closed = db.query(ActiveSetup).filter(ActiveSetup.status == "closed").all()
    n = len(closed)
    wins = [p for p in closed if (p.pnl_usdt or 0) > 0]
    win_rate = (len(wins) / n * 100) if n else 0.0
    total_pnl = sum((p.pnl_usdt or 0) for p in closed)
    rr_vals = [p.take_profit for p in closed if p.entry_price and p.take_profit]
    avg_rr = sum(rr_vals) / len(rr_vals) if rr_vals else 0.0
    best_pct = 0.0
    for p in closed:
        if not p.exit_price or not p.entry_price:
            continue
        if p.direction == "LONG":
            pct = (p.exit_price - p.entry_price) / p.entry_price * 100
        else:
            pct = (p.entry_price - p.exit_price) / p.entry_price * 100
        best_pct = max(best_pct, pct)
    return {
        "total_trades": n,
        "win_rate": round(win_rate, 1),
        "avg_rr": round(avg_rr, 2),
        "total_pnl": round(total_pnl, 2),
        "best_trade_pct": round(best_pct, 2),
    }


@router.post("/confirm")
def confirm(body: ConfirmBody, db: Session = Depends(get_db)) -> dict[str, Any]:
    sym = body.pair.upper().replace("/", "")
    sl = body.stop_loss
    tp = body.take_profit
    strat = body.strategy_name
    sig_id = body.signal_id
    if sig_id is not None:
        sig = db.query(SignalRecord).filter(SignalRecord.id == sig_id).first()
        if not sig:
            raise HTTPException(404, "Signal not found")
        sl = sl or sig.stop_loss
        tp = tp or sig.take_profit
        strat = strat or sig.strategy_name
        sig.acted_on = True
    su = ActiveSetup(
        signal_id=sig_id,
        pair=sym,
        direction=body.direction,
        entry_price=body.entry_price,
        position_size_usdt=body.position_size_usdt,
        stop_loss=sl,
        take_profit=tp,
        strategy_name=strat,
        notes=body.notes or "",
        status="open",
        current_price=body.entry_price,
    )
    db.add(su)
    db.commit()
    db.refresh(su)
    return _setup_dict(su)


@router.post("/{setup_id}/close")
def close_position(setup_id: int, body: CloseBody, db: Session = Depends(get_db)) -> dict[str, Any]:
    r = db.query(ActiveSetup).filter(ActiveSetup.id == setup_id).first()
    if not r or r.status != "open":
        raise HTTPException(404, "Open setup not found")
    entry = r.entry_price
    exit_p = body.exit_price
    size = r.position_size_usdt
    if r.direction == "LONG":
        pnl_pct = (exit_p - entry) / entry
    else:
        pnl_pct = (entry - exit_p) / entry
    pnl_usdt = pnl_pct * size
    r.status = "closed"
    r.closed_at = datetime.utcnow()
    r.exit_price = exit_p
    r.pnl_usdt = round(pnl_usdt, 4)
    r.current_price = exit_p
    db.commit()
    db.refresh(r)
    return _setup_dict(r)
