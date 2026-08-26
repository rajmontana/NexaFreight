"""FastAPI application factory. Phase 0: config validation, health, landing."""

from __future__ import annotations

import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.router import router as api_router
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

    if cfg.cors_origins == "*" and cfg.environment == "prod":
        raise RuntimeError("CORS '*' not allowed in prod; set explicit origins")

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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cfg.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
