"""Database engine and session management (SQLAlchemy 2.x)."""

from __future__ import annotations

import logging
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.core.config import get_settings

log = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _make_engine(url: str):
    if url.startswith("sqlite"):
        # check_same_thread=False: FastAPI may hop threads per request.
        return create_engine(url, connect_args={"check_same_thread": False}, future=True)
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10, future=True)


settings = get_settings()
engine = _make_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
