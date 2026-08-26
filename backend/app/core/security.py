"""Authentication primitives: password hashing + JWT issue/verify.

Phase 0 scope: primitives with tests. The users table / login endpoint lands in
Phase 1 (domain core). JWT is HS256 via PyJWT — signature + expiry always
verified; tokens carry `sub` (email), `role` and `exp`.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from backend.app.core.config import get_settings

# pbkdf2_sha256: pure-Python, no native-backend version quirks, NIST-approved.
_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class TokenError(Exception):
    """Raised when a token is malformed, tampered, or expired."""


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def create_access_token(subject: str, role: str = "operator", extra: dict[str, Any] | None = None,
                        expires_minutes: int | None = None) -> str:
    cfg = get_settings()
    minutes = expires_minutes if expires_minutes is not None else cfg.access_token_expire_minutes
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, cfg.jwt_secret, algorithm=cfg.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Verify signature + expiry; raise TokenError with the reason otherwise."""
    cfg = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token, cfg.jwt_secret, algorithms=[cfg.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as e:
        raise TokenError("token expired") from e
    except jwt.InvalidTokenError as e:
        raise TokenError(f"invalid token: {e}") from e
    if payload.get("exp", 0) < time.time():
        raise TokenError("token expired")  # defensive; PyJWT already enforces
    return payload
