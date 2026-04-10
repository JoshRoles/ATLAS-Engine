"""Orchestrates strategies, candle cache, deduplication, structure broadcasts."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable

import pandas as pd
from config import settings
from database import SessionLocal
from indicators import df_from_candles, detect_order_blocks, support_resistance
from models import ActiveSetup, SignalRecord
from strategy import STRATEGIES, BaseStrategy, Signal

logger = logging.getLogger(__name__)

Broadcast = Callable[[dict[str, Any]], Awaitable[None]]


class Scanner:
    def __init__(self, broadcast: Broadcast) -> None:
        self._broadcast = broadcast
        self._cache: dict[str, list[dict[str, Any]]] = {}
        self._dedup: dict[str, datetime] = {}
        self._structure_counter: dict[str, int] = {}
        self._lock = asyncio.Lock()

    def _key(self, pair: str, tf: str) -> str:
        return f"{pair}_{tf}"

    async def bootstrap_history(self, pair: str, tf: str, candles: list[dict[str, Any]]) -> None:
        async with self._lock:
            k = self._key(pair, tf)
            self._cache[k] = candles[-settings.max_candles_cache :]

    async def on_candle_update(
        self, pair: str, tf: str, candle: dict[str, Any], is_closed: bool
    ) -> None:
        """Merge live kline into cache; broadcast every update; engine on close."""
        async with self._lock:
            k = self._key(pair, tf)
            rows = self._cache.setdefault(k, [])
            if not rows:
                rows.append(candle.copy())
            elif rows[-1]["time"] == candle["time"]:
                rows[-1] = candle.copy()
            else:
                rows.append(candle.copy())
            if len(rows) > settings.max_candles_cache:
                del rows[: len(rows) - settings.max_candles_cache]
            last = dict(rows[-1])

        await self._broadcast({"type": "candle", "pair": pair, "tf": tf, "candle": last})

        if is_closed:
            await self._on_closed_candle(pair, tf)

    async def _on_closed_candle(self, pair: str, tf: str) -> None:
        k = self._key(pair, tf)
        async with self._lock:
            rows = [dict(r) for r in self._cache.get(k, [])]
        if not rows:
            return
        df = df_from_candles(rows)

        # New signals
        for strat in STRATEGIES:
            try:
                sig = strat.check(df, pair, tf)
            except Exception as e:
                logger.exception("strategy %s: %s", strat.name, e)
                continue
            if sig is None:
                continue
            if await self._is_deduped(sig):
                continue
            saved = await self._save_signal(sig)
            await self._mark_dedup(sig)
            await self._broadcast({"type": "signal", "data": saved})

        # Exit checks for open setups on this pair
        await self._check_exits(df, pair)

        # Structure broadcast every 5 closed candles
        cnt = self._structure_counter.get(k, 0) + 1
        self._structure_counter[k] = cnt
        if cnt % 5 == 0:
            await self._emit_structure(pair, tf, df)

    async def _check_exits(self, df: pd.DataFrame, pair: str) -> None:
        by_name = {s.name: s for s in STRATEGIES}
        base = BaseStrategy()
        db = SessionLocal()
        try:
            setups = (
                db.query(ActiveSetup)
                .filter(ActiveSetup.pair == pair, ActiveSetup.status == "open")
                .all()
            )
            for su in setups:
                strat = by_name.get(su.strategy_name or "") if su.strategy_name else None
                try:
                    ex = (
                        strat.check_exit(df, su)
                        if strat
                        else base.check_exit(df, su)
                    )
                except Exception:
                    ex = None
                if ex:
                    await self._broadcast(
                        {
                            "type": "alert",
                            "position_id": su.id,
                            "level": ex.level,
                            "message": ex.reason,
                        }
                    )
        finally:
            db.close()

    async def _emit_structure(self, pair: str, tf: str, df: pd.DataFrame) -> None:
        try:
            sr = support_resistance(df, lookback=min(50, len(df)))
            obs = detect_order_blocks(df, lookback=min(30, len(df)))
        except Exception as e:
            logger.warning("structure: %s", e)
            return
        lines: list[dict[str, Any]] = []
        for p in sr.get("support", []):
            lines.append(
                {
                    "kind": "horizontal",
                    "role": "support",
                    "price": p,
                    "label": "S",
                    "color": "#00e5a0",
                }
            )
        for p in sr.get("resistance", []):
            lines.append(
                {
                    "kind": "horizontal",
                    "role": "resistance",
                    "price": p,
                    "label": "R",
                    "color": "#ff3d6b",
                }
            )
        for ob in obs:
            lines.append(
                {
                    "kind": "box",
                    "role": ob.get("type", "bullish"),
                    "top": ob["top"],
                    "bottom": ob["bottom"],
                    "color": "#00e5a0" if ob.get("type") == "bullish" else "#ff3d6b",
                }
            )
        await self._broadcast(
            {
                "type": "structure",
                "pair": pair,
                "tf": tf,
                "lines": lines,
            }
        )

    def _dedup_key(self, sig: Signal) -> str:
        return f"{sig.strategy_name}|{sig.pair}|{sig.timeframe}|{sig.direction}"

    async def _is_deduped(self, sig: Signal) -> bool:
        key = self._dedup_key(sig)
        db = SessionLocal()
        try:
            since = datetime.utcnow() - timedelta(hours=settings.signal_dedup_hours)
            q = (
                db.query(SignalRecord)
                .filter(
                    SignalRecord.pair == sig.pair,
                    SignalRecord.timeframe == sig.timeframe,
                    SignalRecord.direction == sig.direction,
                    SignalRecord.strategy_name == sig.strategy_name,
                    SignalRecord.created_at >= since,
                )
                .first()
            )
            if q:
                return True
        finally:
            db.close()
        last = self._dedup.get(key)
        if last and datetime.utcnow() - last < timedelta(hours=settings.signal_dedup_hours):
            return True
        return False

    async def _mark_dedup(self, sig: Signal) -> None:
        self._dedup[self._dedup_key(sig)] = datetime.utcnow()

    async def _save_signal(self, sig: Signal) -> dict[str, Any]:
        expires = datetime.utcnow() + timedelta(hours=settings.signal_ttl_hours)
        db = SessionLocal()
        try:
            rec = SignalRecord(
                pair=sig.pair,
                timeframe=sig.timeframe,
                direction=sig.direction,
                strategy_name=sig.strategy_name,
                entry_price=sig.entry_price,
                stop_loss=sig.stop_loss,
                take_profit=sig.take_profit,
                rr_ratio=sig.rr_ratio,
                conditions_json=json.dumps(sig.conditions),
                confidence=sig.confidence,
                expires_at=expires,
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
            return {
                "id": rec.id,
                "pair": sig.pair,
                "timeframe": sig.timeframe,
                "direction": sig.direction,
                "strategy_name": sig.strategy_name,
                "entry_price": sig.entry_price,
                "stop_loss": sig.stop_loss,
                "take_profit": sig.take_profit,
                "rr_ratio": sig.rr_ratio,
                "conditions": sig.conditions,
                "confidence": sig.confidence,
                "created_at": rec.created_at.isoformat(timespec="seconds"),
                "expires_at": rec.expires_at.isoformat(timespec="seconds"),
            }
        finally:
            db.close()

    async def update_position_prices(self, pair: str, price: float) -> None:
        db = SessionLocal()
        try:
            q = (
                db.query(ActiveSetup)
                .filter(ActiveSetup.pair == pair, ActiveSetup.status == "open")
                .all()
            )
            for p in q:
                p.current_price = price
            db.commit()
        finally:
            db.close()
