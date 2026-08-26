#!/bin/sh
# NexaFreight container boot: migrate -> bootstrap real data -> serve.
# Idempotent: ingestion skips if data already present (set FORCE_INGEST=1 to rebuild).
set -e

echo "[boot] applying database migrations..."
python -m alembic upgrade head

echo "[boot] bootstrapping real data (skips if loaded)..."
FORCE_INGEST="${FORCE_INGEST:-0}" python -m backend.app.ingest.run_all

if [ -n "$SEED_USER_PASSWORD" ]; then
  echo "[boot] ensuring operator accounts..."
  python -m backend.app.ingest.seed_users
else
  echo "[boot] WARNING: SEED_USER_PASSWORD unset — no operator logins (fail loud, no default)."
fi

echo "[boot] starting API on port ${PORT:-8000} (FEED_MODE=${FEED_MODE:-mock})"
exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
