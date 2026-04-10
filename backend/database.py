"""SQLAlchemy engine and session factory."""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from config import settings

settings.data_dir.mkdir(parents=True, exist_ok=True)

# SQLite: allow use across asyncio worker threads
connect_args = {"check_same_thread": False}
if settings.database_url.startswith("sqlite"):
    db_path = settings.data_dir / "atlas.db"
    database_url = f"sqlite:///{db_path.as_posix()}"
else:
    database_url = settings.database_url

engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
