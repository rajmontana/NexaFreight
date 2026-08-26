"""Seed operator accounts (roles per the SOP escalation matrix).

CALIBRATED master data: these are NexaFreight's staff accounts. The initial
password comes from the environment (SEED_USER_PASSWORD) — never hardcoded,
never committed (AGENTS.md §9). Fails loud when unset.
"""

from __future__ import annotations

import logging
import os

from sqlalchemy.orm import Session

from backend.app.core.db import SessionLocal
from backend.app.core.security import hash_password
from backend.app.models.entities import User

log = logging.getLogger(__name__)

ROLE_USERS = [  # caps mirror calibrated_params escalation.approval_caps_usd
    ("dispatcher@nexafreight.com", "Control Tower Dispatcher", "dispatcher", 2_500),
    ("manager@nexafreight.com", "Logistics Manager", "manager", 25_000),
    ("director@nexafreight.com", "Regional Logistics Director", "director", 100_000),
    ("vp@nexafreight.com", "VP Global Operations", "vp", 1_000_000_000),  # effectively unlimited
    ("finance@nexafreight.com", "Finance Controller", "finance", 0),
]


def seed(db: Session) -> int:
    password = os.environ.get("SEED_USER_PASSWORD", "")
    if not password or len(password) < 8:
        raise RuntimeError("SEED_USER_PASSWORD env var required (min 8 chars) — fail loud, "
                           "no default credentials (AGENTS.md §3/§9)")
    pwd_hash = hash_password(password)
    for email, name, role, cap in ROLE_USERS:
        if not db.query(User).filter(User.email == email).one_or_none():
            db.add(User(email=email, name=name, role=role, approval_limit_usd=cap,
                        password_hash=pwd_hash))
    db.commit()
    n = db.query(User).count()
    log.info("users ready: %d accounts", n)
    return n


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
