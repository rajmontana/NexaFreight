"""Application configuration.

All keys, endpoints and tunables come from the environment (.env) — never inline
in source. See AGENTS.md §9 "Separate config from code".
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "NexaFreight Control Tower"
    app_version: str = "3.0.0-phase0"
    environment: Literal["dev", "staging", "prod"] = "dev"

    # --- Database -----------------------------------------------------------
    # Dev default is a local SQLite file for convenience; docker-compose, CI and
    # production set a PostgreSQL URL explicitly.
    database_url: str = "sqlite:///./nexafreight_dev.db"

    # --- Auth ---------------------------------------------------------------
    # No default on purpose: in staging/prod a missing JWT_SECRET must fail loud
    # (checked at startup in app.main). In dev, an ephemeral secret is generated
    # with a visible warning so sessions still boot.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # --- Telemetry feed mode (AGENTS.md §9: live vs fallback switchable) -----
    # live  = real external feeds (AISStream / OpenSky / Open-Meteo)   [Phase 2]
    # replay= recorded snapshots from data/replay (deterministic demos)[Phase 2]
    # mock  = no external calls at all; endpoints report honest status [now]
    feed_mode: Literal["live", "replay", "mock"] = "mock"

    # --- CORS ---------------------------------------------------------------
    # Same-origin in production; "*" only acceptable for local development.
    cors_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
