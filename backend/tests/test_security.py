"""Auth primitive tests: password hashing + JWT issue/verify/expire/tamper."""

from __future__ import annotations

import pytest

from backend.app.core.security import (
    TokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("SmartTrack2025!")
    assert h != "SmartTrack2025!"
    assert verify_password("SmartTrack2025!", h)
    assert not verify_password("wrong-password", h)


def test_jwt_roundtrip():
    tok = create_access_token("manager@nexafreight.com", role="manager")
    payload = decode_access_token(tok)
    assert payload["sub"] == "manager@nexafreight.com"
    assert payload["role"] == "manager"
    assert "exp" in payload


def test_jwt_expired_rejected():
    tok = create_access_token("a@b.c", expires_minutes=-1)
    with pytest.raises(TokenError, match="expired"):
        decode_access_token(tok)


def test_jwt_tampered_rejected():
    tok = create_access_token("a@b.c")
    head, body, sig = tok.split(".")
    with pytest.raises(TokenError, match="invalid"):
        decode_access_token(f"{head}.{body}.deadbeef")
