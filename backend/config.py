"""Application settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    binance_api_key: str = ""
    binance_secret: str = ""

    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    database_url: str = "sqlite:///./data/atlas.db"

    # Comma-separated list, or "*" for any origin (dev only). Production: https://your-app.vercel.app
    cors_origins: str = "*"

    candle_lookback: int = 200
    max_candles_cache: int = 500
    active_timeframes: tuple[str, ...] = ("1m", "3m", "5m", "15m", "1h", "4h", "1d")
    signal_dedup_hours: int = 4
    signal_ttl_hours: int = 4

    top_pairs: tuple[str, ...] = (
        "BTCUSDT",
        "ETHUSDT",
        "BNBUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "ADAUSDT",
        "DOGEUSDT",
        "AVAXUSDT",
        "DOTUSDT",
        "MATICUSDT",
        "LINKUSDT",
        "UNIUSDT",
        "ATOMUSDT",
        "LTCUSDT",
        "ETCUSDT",
        "FILUSDT",
        "APTUSDT",
        "ARBUSDT",
        "OPUSDT",
        "NEARUSDT",
    )


settings = Settings()


def cors_list() -> list[str]:
    """Parse CORS_ORIGINS / settings.cors_origins for FastAPI."""
    raw = (settings.cors_origins or "*").strip()
    if raw == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]
