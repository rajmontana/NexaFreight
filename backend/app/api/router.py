"""HTTP API routers. Phase 0: health + honest landing page only."""

from __future__ import annotations

import datetime as dt
import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.db import get_db

log = logging.getLogger(__name__)
router = APIRouter()

_LANDING_HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NexaFreight Control Tower</title>
<style>
 body{font-family:system-ui,sans-serif;background:#0b1220;color:#e6edf3;
      display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
 .card{max-width:560px;padding:2.5rem;border:1px solid #1f2b3d;border-radius:14px;background:#0f172a}
 h1{margin:0 0 .25rem;font-size:1.35rem} p{color:#8b98ab;line-height:1.55}
 .tag{display:inline-block;background:#132a1a;color:#5dd39e;border:1px solid #1d4d2e;
      padding:.15rem .6rem;border-radius:99px;font-size:.8rem;margin-top:.5rem}
 code{background:#111a2c;padding:.1rem .35rem;border-radius:5px}
</style></head><body><div class="card">
 <h1>NexaFreight Control Tower — v3</h1>
 <span class="tag">Phase 0: foundation online</span>
 <p>The legacy portal was intentionally disconnected: it served fabricated
 telemetry and static numbers. It returns in Phase&nbsp;2 backed by the real
 ingestion layer — no fake data in the meantime.</p>
 <p>API docs: <code>/docs</code> &middot; Health: <code>/api/health</code></p>
</div></body></html>"""


@router.get("/", include_in_schema=False)
def landing() -> HTMLResponse:
    return HTMLResponse(_LANDING_HTML)


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
