"""Auth dependency: Bearer JWT required on protected endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request

from backend.app.core.security import TokenError, decode_access_token


def get_current_user(request: Request) -> dict[str, Any]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = decode_access_token(auth.removeprefix("Bearer ").strip())
    except TokenError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    return payload
