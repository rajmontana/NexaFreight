"""Test configuration: isolated env + throwaway SQLite DB per test session."""

from __future__ import annotations

import os
import tempfile

# Must happen BEFORE any app import so Settings picks these up.
# 32+ byte secret per RFC 7518 (avoids PyJWT InsecureKeyLengthWarning).
os.environ["JWT_SECRET"] = "ci-test-secret-0123456789abcdef0123456789abcdef"
os.environ.setdefault("APP_ENV", "dev")  # pydantic-settings alias: environment

_tmpdir = tempfile.mkdtemp(prefix="nxf_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.app.core.db import Base, SessionLocal, engine  # noqa: E402
from backend.app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    s = SessionLocal()
    try:
        yield s
        s.rollback()
    finally:
        s.close()
        Base.metadata.drop_all(bind=engine)
