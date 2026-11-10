# ---- Build stage ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for psycopg2-binary, numpy, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Runtime stage ----
FROM python:3.11-slim

WORKDIR /app

# Runtime dependency for psycopg2 and LightGBM
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Security: Create non-root system group and user (fixed UID 10001)
RUN groupadd --system --gid 10001 nexafreight && \
    useradd --system --uid 10001 --gid nexafreight --create-home --home-dir /home/nexafreight nexafreight

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Ensure nexafreight ownership of application and runtime directories
RUN mkdir -p /app/data /app/models /app/logs && \
    chown -R nexafreight:nexafreight /app /home/nexafreight

USER nexafreight

# Expose the port Render expects
EXPOSE 10000

# Run migrations then start the server.
# Render sets PORT=10000 by default.
CMD ["sh", "-c", "cd /app && python -m alembic upgrade head && (python scripts/30_activate_multimodal_fleet.py || true) && uvicorn nexafreight.main:app --host 0.0.0.0 --port ${PORT:-10000} --app-dir src"]
