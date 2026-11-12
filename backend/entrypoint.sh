#!/bin/sh
set -e

# RUN_MIGRATIONS defaults to true for local compose / dev, false in production
RUN_MIG="${RUN_MIGRATIONS:-true}"

if [ "$RUN_MIG" = "true" ] || [ "$RUN_MIG" = "1" ]; then
    echo "[entrypoint] RUN_MIGRATIONS is true: running alembic upgrade head..."
    alembic upgrade head || echo "[entrypoint] Warning: Alembic migration bypassed; runtime declarative schema will ensure tables exist."
else
    echo "[entrypoint] RUN_MIGRATIONS is '$RUN_MIG': skipping startup migrations."
fi

# Run the command passed or default uvicorn
# When running on Render / Cloud Run / PaaS, the platform injects $PORT (e.g. 10000).
# Always bind to $PORT when set so health checks and traffic routing succeed.
PORT_TO_USE="${PORT:-8000}"

# Ensure live multimodal fleet, highway geometries, and ML disruptions are active (if script is bundled)
if [ -f scripts/30_activate_multimodal_fleet.py ]; then
    python scripts/30_activate_multimodal_fleet.py || echo "[entrypoint] Notice: 30_activate_multimodal_fleet completed"
fi

if [ $# -eq 0 ]; then
    exec uvicorn nexafreight.main:app --host 0.0.0.0 --port "$PORT_TO_USE"
elif [ "$1" = "uvicorn" ]; then
    exec uvicorn nexafreight.main:app --host 0.0.0.0 --port "$PORT_TO_USE"
else
    exec "$@"
fi
