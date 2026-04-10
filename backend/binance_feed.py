"""Binance REST + combined WebSocket streams for klines and prices."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

logger = logging.getLogger(__name__)

TF_TO_STREAM = {"15m": "15m", "1h": "1h", "4h": "4h"}
STREAM_TO_TF = {v: k for k, v in TF_TO_STREAM.items()}
REST_BASES = (
    "https://data-api.binance.vision",
    "https://api.binance.com",
)

CandleHandler = Callable[[str, str, dict[str, Any], bool], Awaitable[None]]
PriceHandler = Callable[[str, float], Awaitable[None]]


async def fetch_klines(
    symbol: str,
    interval: str,
    limit: int = 200,
) -> list[dict[str, Any]]:
    """Public REST klines (no API key required)."""
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    last_error: Exception | None = None
    raw: list[Any] | None = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for base in REST_BASES:
            url = f"{base}/api/v3/klines"
            try:
                r = await client.get(url, params=params)
                r.raise_for_status()
                raw = r.json()
                break
            except Exception as e:
                last_error = e
                continue
    if raw is None:
        raise RuntimeError(f"binance klines unavailable for {symbol}/{interval}") from last_error
    out: list[dict[str, Any]] = []
    for row in raw:
        out.append(
            {
                "time": int(row[0] // 1000),
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": float(row[5]),
            }
        )
    return out


def _parse_kline_msg(data: dict[str, Any]) -> tuple[str | None, str | None, dict[str, Any] | None, bool]:
    if data.get("e") != "kline":
        return None, None, None, False
    k = data.get("k") or {}
    sym = k.get("s")
    interval = k.get("i")
    if not sym or not interval:
        return None, None, None, False
    tf = STREAM_TO_TF.get(interval)
    if not tf:
        return None, None, None, False
    closed = bool(k.get("x"))
    candle = {
        "time": int(k["t"] // 1000),
        "open": float(k["o"]),
        "high": float(k["h"]),
        "low": float(k["l"]),
        "close": float(k["c"]),
        "volume": float(k["v"]),
    }
    return sym, tf, candle, closed


def _parse_mini_ticker(data: dict[str, Any]) -> tuple[str | None, float | None]:
    if data.get("e") != "24hrMiniTicker":
        return None, None
    sym = data.get("s")
    price = data.get("c")
    if sym is None or price is None:
        return None, None
    return sym, float(price)


class BinanceFeed:
    def __init__(
        self,
        on_candle: CandleHandler,
        on_price: PriceHandler,
    ) -> None:
        self._on_candle = on_candle
        self._on_price = on_price
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()
        self._symbols: list[str] = []

    def set_symbols(self, symbols: list[str]) -> None:
        self._symbols = sorted({s.upper() for s in symbols})

    def start(self) -> None:
        self._stop.clear()
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self) -> None:
        import websockets

        while not self._stop.is_set():
            if not self._symbols:
                await asyncio.sleep(1.0)
                continue
            streams: list[str] = []
            for s in self._symbols:
                sl = s.lower()
                streams.append(f"{sl}@miniTicker")
                for iv in TF_TO_STREAM.values():
                    streams.append(f"{sl}@kline_{iv}")
            url = "wss://stream.binance.com:9443/stream?streams=" + "/".join(streams)
            try:
                async with websockets.connect(url, ping_interval=20, ping_timeout=60) as ws:
                    logger.info("Binance WS connected (%s streams)", len(streams))
                    while not self._stop.is_set():
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=120.0)
                        except asyncio.TimeoutError:
                            continue
                        msg = json.loads(raw)
                        payload = msg.get("data", msg)
                        if isinstance(payload, str):
                            continue
                        # combined wrapper
                        if "stream" in msg and "data" in msg:
                            payload = msg["data"]
                        p = payload
                        sym_p, price = _parse_mini_ticker(p)
                        if sym_p and price is not None:
                            await self._on_price(sym_p, price)
                            continue
                        sym_k, tf, candle, closed = _parse_kline_msg(p)
                        if sym_k and tf and candle:
                            await self._on_candle(sym_k, tf, candle, closed)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning("Binance WS error: %s — reconnecting…", e)
                await asyncio.sleep(2.0)
