#!/bin/sh
# NexaFreight container boot: migrate -> serve immediately -> bootstrap data in background.
# (Render health checks must pass quickly; the data bootstrap can take minutes on a
#  shared free CPU. The API serves an honest empty state until ingestion completes.)
set -e

echo "[boot] applying database migrations..."
python -m alembic upgrade head

if [ "${BOOTSTRAPInBackground:-1}" = "1" ]; then
  echo "[boot] starting data bootstrap in background (log: /tmp/bootstrap.log)..."
  ( sleep 5; FORCE_INGEST="${FORCE_INGEST:-0}" python -m backend.app.ingest.run_all       > /tmp/bootstrap.log 2>&1; echo "bootstrap exit=$?" >> /tmp/bootstrap.log ) &
else
  echo "[boot] running data bootstrap synchronously..."
  FORCE_INGEST="${FORCE_INGEST:-0}" python -m backend.app.ingest.run_all
fi

if [ -n "$SEED_USER_PASSWORD" ]; then
  python -m backend.app.ingest.seed_users || echo "[boot] WARN user seed failed"
else
  echo "[boot] WARNING: SEED_USER_PASSWORD unset — operator logins unavailable (no default creds)."
fi

echo "[boot] starting API on port ${PORT:-8000} (FEED_MODE=${FEED_MODE:-mock})"
exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
