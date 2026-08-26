"""HTTP API routers. Phase 0: health + honest landing page only."""

from __future__ import annotations

import datetime as dt
import logging
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.db import get_db

log = logging.getLogger(__name__)
router = APIRouter()




@router.get("/api/health")
def health() -> dict[str, Any]:
    """Liveness + build/config facts. Makes no external calls."""
    cfg = get_settings()
    return {
        "status": "ok",
        "app": cfg.app_name,
        "version": cfg.app_version,
        "environment": cfg.environment,
        "feed_mode": cfg.feed_mode,  # live | replay | mock (AGENTS.md §9)
        "server_time_utc": dt.datetime.now(dt.UTC).isoformat(),
    }


@router.get("/api/health/db")
def health_db(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Database connectivity. Fail loud: a broken DB returns an error, never fake data."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
