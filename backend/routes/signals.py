"""Signal records."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import SignalRecord

router = APIRouter(prefix="/api/signals", tags=["signals"])


def _serialize(rec: SignalRecord) -> dict[str, Any]:
    try:
        cond = json.loads(rec.conditions_json or "[]")
    except json.JSONDecodeError:
        cond = []
    return {
        "id": rec.id,
        "pair": rec.pair,
        "timeframe": rec.timeframe,
        "direction": rec.direction,
        "strategy_name": rec.strategy_name,
        "entry_price": rec.entry_price,
        "stop_loss": rec.stop_loss,
        "take_profit": rec.take_profit,
        "rr_ratio": rec.rr_ratio,
        "conditions": cond,
        "confidence": rec.confidence,
        "created_at": rec.created_at.isoformat(timespec="seconds"),
        "expires_at": rec.expires_at.isoformat(timespec="seconds"),
        "acted_on": rec.acted_on,
    }


@router.get("/")
def list_signals(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    now = datetime.utcnow()
    rows = (
        db.query(SignalRecord)
        .filter(SignalRecord.expires_at > now)
        .order_by(SignalRecord.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in rows]


@router.get("/{signal_id}")
def get_signal(signal_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    r = db.query(SignalRecord).filter(SignalRecord.id == signal_id).first()
    if not r:
        raise HTTPException(404, "Signal not found")
    return _serialize(r)
