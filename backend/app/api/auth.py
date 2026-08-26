"""Authentication endpoints — validated against the real users table."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.core.security import create_access_token, verify_password
from backend.app.models.entities import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(creds: LoginRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    user = db.query(User).filter(User.email == creds.email.strip().lower()).one_or_none()
    if not user or not user.is_active or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(subject=user.email, role=user.role,
                                extra={"name": user.name, "approval_limit_usd": user.approval_limit_usd})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "name": user.name}


@router.get("/me")
def me(current: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"email": current.get("sub"), "role": current.get("role"), "name": current.get("name"),
            "approval_limit_usd": current.get("approval_limit_usd")}
