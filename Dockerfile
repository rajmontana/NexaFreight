# NexaFreight API — deployable image (Render / any Docker host)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY alembic.ini pyproject.toml ./
COPY alembic ./alembic
COPY scripts ./scripts
COPY data ./data
COPY portal ./portal

EXPOSE 8000
CMD ["sh", "scripts/boot.sh"]
