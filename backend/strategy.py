"""Strategy classes — extend BaseStrategy and register in STRATEGIES."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

import pandas as pd

from indicators import atr, ema, is_bullish_engulfing, rsi, volume_sma


@dataclass
class Signal:
    pair: str
    timeframe: str
    direction: str
    strategy_name: str
    entry_price: float
    stop_loss: float
    take_profit: float
    rr_ratio: float
    conditions: list[str] = field(default_factory=list)
    confidence: str = "MED"
    id: int | None = None


@dataclass
class ExitSignal:
    reason: str
    level: str = "info"  # "info" | "urgent"


class BaseStrategy:
    name: str = "Base"

    def check(
        self, df: pd.DataFrame, pair: str, tf: str
    ) -> Optional[Signal]:
        return None

    def check_exit(
        self,
        df: pd.DataFrame,
        setup: Any,
    ) -> Optional[ExitSignal]:
        """Default: warn if price near SL (within 0.5 ATR)."""
        if len(df) < 15:
            return None
        last = df.iloc[-1]
        price = float(last["close"])
        a = float(atr(df, 14).iloc[-1])
        direction = getattr(setup, "direction", None) or setup.get("direction")
        sl = getattr(setup, "stop_loss", None) or setup.get("stop_loss")
        tp = getattr(setup, "take_profit", None) or setup.get("take_profit")
        pair_label = getattr(setup, "pair", None) or setup.get("pair", "")
        if not sl or not direction:
            return None
        dist_sl = abs(price - float(sl))
        if dist_sl < 0.5 * a:
            return ExitSignal(
                reason=f"{pair_label} within 0.5 ATR of stop loss",
                level="urgent",
            )
        if tp and direction == "LONG" and price >= float(tp) * 0.998:
            return ExitSignal(
                reason=f"{pair_label} approaching take profit zone",
                level="info",
            )
        if tp and direction == "SHORT" and price <= float(tp) * 1.002:
            return ExitSignal(
                reason=f"{pair_label} approaching take profit zone",
                level="info",
            )
        return None


class EmaCrossStrategy(BaseStrategy):
    name = "EMA 9/21 Cross"

    def check(self, df: pd.DataFrame, pair: str, tf: str) -> Optional[Signal]:
        if len(df) < 30:
            return None
        e9 = ema(df, 9)
        e21 = ema(df, 21)
        if len(e9) < 3 or len(e21) < 3:
            return None
        prev_bull = e9.iloc[-2] <= e21.iloc[-2]
        now_bull = e9.iloc[-1] > e21.iloc[-1]
        prev_bear = e9.iloc[-2] >= e21.iloc[-2]
        now_bear = e9.iloc[-1] < e21.iloc[-1]
        last = df.iloc[-1]
        close = float(last["close"])
        a = float(atr(df, 14).iloc[-1])
        conditions: list[str] = []

        if prev_bull and now_bull and not (e9.iloc[-3] > e21.iloc[-3]):
            direction = "LONG"
            sl = close - 2 * a
            tp = close + 2.5 * a
            conditions.append("EMA9 crossed above EMA21")
            r = abs(tp - close) / max(close - sl, 1e-8)
            return Signal(
                pair=pair,
                timeframe=tf,
                direction=direction,
                strategy_name=self.name,
                entry_price=close,
                stop_loss=sl,
                take_profit=tp,
                rr_ratio=round(r, 2),
                conditions=conditions,
                confidence="HIGH",
            )

        if prev_bear and now_bear and not (e9.iloc[-3] < e21.iloc[-3]):
            direction = "SHORT"
            sl = close + 2 * a
            tp = close - 2.5 * a
            conditions.append("EMA9 crossed below EMA21")
            r = abs(close - tp) / max(sl - close, 1e-8)
            return Signal(
                pair=pair,
                timeframe=tf,
                direction=direction,
                strategy_name=self.name,
                entry_price=close,
                stop_loss=sl,
                take_profit=tp,
                rr_ratio=round(r, 2),
                conditions=conditions,
                confidence="HIGH",
            )
        return None


class RsiMeanReversionStrategy(BaseStrategy):
    name = "RSI Mean Reversion"

    def check(self, df: pd.DataFrame, pair: str, tf: str) -> Optional[Signal]:
        if len(df) < 40:
            return None
        r = rsi(df, 14)
        vs = volume_sma(df, 20)
        last = df.iloc[-1]
        rv = float(r.iloc[-1])
        vol_ratio = float(last["volume"]) / max(float(vs.iloc[-1]), 1e-8)
        close = float(last["close"])
        a = float(atr(df, 14).iloc[-1])
        conditions: list[str] = []

        if rv < 32 and is_bullish_engulfing(df):
            sl = float(last["low"]) - 0.5 * a
            tp = close + 2 * a
            conditions.append(f"RSI {rv:.0f} (oversold recovery)")
            conditions.append(f"Vol {vol_ratio:.1f}× avg")
            conditions.append("Bullish engulfing")
            rr = abs(tp - close) / max(close - sl, 1e-8)
            return Signal(
                pair=pair,
                timeframe=tf,
                direction="LONG",
                strategy_name=self.name,
                entry_price=close,
                stop_loss=sl,
                take_profit=tp,
                rr_ratio=round(rr, 2),
                conditions=conditions,
                confidence="MED" if vol_ratio > 1.0 else "LOW",
            )

        if rv > 68 and is_bearish_engulfing(df):
            sl = float(last["high"]) + 0.5 * a
            tp = close - 2 * a
            conditions.append(f"RSI {rv:.0f} (overbought)")
            conditions.append(f"Vol {vol_ratio:.1f}× avg")
            conditions.append("Bearish engulfing")
            rr = abs(close - tp) / max(sl - close, 1e-8)
            return Signal(
                pair=pair,
                timeframe=tf,
                direction="SHORT",
                strategy_name=self.name,
                entry_price=close,
                stop_loss=sl,
                take_profit=tp,
                rr_ratio=round(rr, 2),
                conditions=conditions,
                confidence="MED" if vol_ratio > 1.0 else "LOW",
            )
        return None


STRATEGIES: list[BaseStrategy] = [
    EmaCrossStrategy(),
    RsiMeanReversionStrategy(),
]
