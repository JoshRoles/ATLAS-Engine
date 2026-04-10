"""Technical indicators — pure pandas functions."""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd


def ema(df: pd.DataFrame, period: int, col: str = "close") -> pd.Series:
    return df[col].ewm(span=period, adjust=False).mean()


def rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    delta = df["close"].diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high = df["high"]
    low = df["low"]
    close = df["close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [
            (high - low),
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return tr.ewm(alpha=1 / period, adjust=False).mean()


def vwap(df: pd.DataFrame) -> pd.Series:
    typical = (df["high"] + df["low"] + df["close"]) / 3.0
    vol = df["volume"].replace(0, np.nan)
    return (typical * df["volume"]).cumsum() / vol.cumsum()


def volume_sma(df: pd.DataFrame, period: int = 20) -> pd.Series:
    return df["volume"].rolling(period).mean()


def bollinger_bands(
    df: pd.DataFrame, period: int = 20, std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    mid = df["close"].rolling(period).mean()
    dev = df["close"].rolling(period).std()
    upper = mid + std * dev
    lower = mid - std * dev
    return lower, mid, upper


def macd(
    df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    exp1 = df["close"].ewm(span=fast, adjust=False).mean()
    exp2 = df["close"].ewm(span=slow, adjust=False).mean()
    m = exp1 - exp2
    s = m.ewm(span=signal, adjust=False).mean()
    hist = m - s
    return m, s, hist


def _swing_points(df: pd.DataFrame, lookback: int, kind: str) -> list[float]:
    """Rough swing highs/lows from last `lookback` bars."""
    if len(df) < lookback + 2:
        return []
    sub = df.tail(lookback).copy()
    levels: list[float] = []
    highs = sub["high"].values
    lows = sub["low"].values
    for i in range(2, len(sub) - 2):
        if kind == "resistance":
            if highs[i] > highs[i - 1] and highs[i] > highs[i - 2] and highs[i] > highs[i + 1] and highs[i] > highs[i + 2]:
                levels.append(float(highs[i]))
        else:
            if lows[i] < lows[i - 1] and lows[i] < lows[i - 2] and lows[i] < lows[i + 1] and lows[i] < lows[i + 2]:
                levels.append(float(lows[i]))
    return levels


def support_resistance(df: pd.DataFrame, lookback: int = 50) -> dict[str, list[float]]:
    sup = _swing_points(df, lookback, "support")
    res = _swing_points(df, lookback, "resistance")
    # cluster nearby levels
    def cluster(vals: list[float], tol_pct: float = 0.15) -> list[float]:
        if not vals:
            return []
        vals = sorted(vals)
        out: list[float] = [vals[0]]
        for v in vals[1:]:
            if abs(v - out[-1]) / out[-1] * 100 > tol_pct:
                out.append(v)
        return out[-3:]

    return {"support": cluster(sup)[-3:], "resistance": cluster(res)[-3:]}


def detect_order_blocks(df: pd.DataFrame, lookback: int = 30) -> list[dict[str, Any]]:
    """Simple order-block style zones from last impulsive move."""
    if len(df) < lookback:
        return []
    sub = df.tail(lookback)
    out: list[dict[str, Any]] = []
    # last strong bullish candle body
    bodies = (sub["close"] - sub["open"]).abs()
    i = int(bodies.idxmax()) if len(bodies) else 0
    row = sub.loc[i]
    if row["close"] > row["open"]:
        out.append(
            {
                "type": "bullish",
                "top": float(max(row["open"], row["close"])),
                "bottom": float(min(row["open"], row["close"])),
                "index": int(sub.index.get_loc(i)),
            }
        )
    else:
        out.append(
            {
                "type": "bearish",
                "top": float(max(row["open"], row["close"])),
                "bottom": float(min(row["open"], row["close"])),
                "index": int(sub.index.get_loc(i)),
            }
        )
    return out[:2]


def is_bullish_engulfing(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False
    a, b = df.iloc[-2], df.iloc[-1]
    return (
        a["close"] < a["open"]
        and b["close"] > b["open"]
        and b["open"] < a["close"]
        and b["close"] > a["open"]
        and (b["close"] - b["open"]) > (a["open"] - a["close"])
    )


def is_bearish_engulfing(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False
    a, b = df.iloc[-2], df.iloc[-1]
    return (
        a["close"] > a["open"]
        and b["close"] < b["open"]
        and b["open"] > a["close"]
        and b["close"] < a["open"]
        and (a["close"] - a["open"]) < (b["open"] - b["close"])
    )


def trend_direction(df: pd.DataFrame, period: int = 50) -> str:
    if len(df) < period:
        return "sideways"
    ma = df["close"].rolling(period).mean().iloc[-1]
    last = df["close"].iloc[-1]
    if last > ma * 1.002:
        return "up"
    if last < ma * 0.998:
        return "down"
    return "sideways"


def df_from_candles(rows: list[dict]) -> pd.DataFrame:
    """Build DataFrame from list of candle dicts (time in seconds)."""
    if not rows:
        return pd.DataFrame(columns=["time", "open", "high", "low", "close", "volume"])
    df = pd.DataFrame(rows)
    for c in ("open", "high", "low", "close", "volume"):
        df[c] = df[c].astype(float)
    df["time"] = df["time"].astype(int)
    return df.sort_values("time").reset_index(drop=True)


def conditions_to_json(conditions: list[str]) -> str:
    return json.dumps(conditions)
