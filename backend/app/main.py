"""FastAPI application factory. Phase 0: config validation, health, landing."""

from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api.alerts import router as alerts_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.auth import router as auth_router
from backend.app.api.esg import router as esg_router
from backend.app.api.finance import router as finance_router
from backend.app.api.kpis import router as kpis_router
from backend.app.api.lanes import router as lanes_router
from backend.app.api.models import router as models_router
from backend.app.api.router import router as api_router
from backend.app.api.shipments import router as shipments_router
from backend.app.api.telemetry import router as telemetry_router
from backend.app.core.config import get_settings

log = logging.getLogger("nexafreight")


def _validate_startup_config() -> None:
    """Fail-loud startup checks (AGENTS.md §9)."""
    cfg = get_settings()

    if cfg.environment in ("staging", "prod"):
        problems = []
        if not cfg.jwt_secret or cfg.jwt_secret == "change-me":
            problems.append("JWT_SECRET must be set to a strong random value")
        if cfg.database_url.startswith("sqlite"):
            problems.append("sqlite is not allowed outside dev; set DATABASE_URL to Postgres")
        if problems:
            raise RuntimeError("startup config invalid: " + "; ".join(problems))

    # Dev convenience: ephemeral secret so the app still boots, loudly flagged.
    if not cfg.jwt_secret:
        cfg.jwt_secret = secrets.token_urlsafe(48)
        log.warning("JWT_SECRET not set — generated an EPHEMERAL dev secret "
                    "(sessions reset on restart). Set JWT_SECRET in .env.")

    # CORS only configured when explicit origins are set; same-origin SPA needs none.

    log.info("Startup ok — env=%s feed_mode=%s", cfg.environment, cfg.feed_mode)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_startup_config()
    yield
    log.info("Shutdown.")


def create_app() -> FastAPI:
    cfg = get_settings()
    app = FastAPI(
        title=cfg.app_name,
        version=cfg.app_version,
        description=(
            "Multi-modal logistics control tower. Phase 0 foundation: honest health "
            "endpoints, config validation, auth primitives. See docs/BLUEPRINT.md."
        ),
        lifespan=lifespan,
    )
    origins = [o.strip() for o in cfg.cors_origins.split(",") if o.strip() and o.strip() != "*"]
    if origins:
        app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    # Portal (SPA) registered FIRST so it owns "/" (route order matters).
    portal_dir = Path(__file__).resolve().parents[2] / "portal"
    if portal_dir.exists():
        app.mount("/static", StaticFiles(directory=portal_dir), name="static")

        @app.get("/", include_in_schema=False)
        def portal_index():
            return FileResponse(portal_dir / "index.html")

    app.include_router(api_router)
    app.include_router(kpis_router)
    app.include_router(auth_router)
    app.include_router(analytics_router)
    app.include_router(shipments_router)
    app.include_router(lanes_router)
    app.include_router(models_router)
    app.include_router(finance_router)
    app.include_router(esg_router)
    app.include_router(alerts_router)
    app.include_router(telemetry_router)

    @app.middleware("http")
    async def no_cache_dynamic(request, call_next):
        resp = await call_next(request)
        p = request.url.path
        if p == "/" or p.startswith("/static/"):
            resp.headers["Cache-Control"] = "no-cache"  # always revalidate (ETag 304 = fast)
        return resp
    return app


app = create_app()
