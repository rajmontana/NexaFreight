"""Model registry + per-shipment ETA predictions (auditable ML, AGENTS.md §9)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.ml import eta_model
from backend.app.models.entities import ModelRun, Shipment

router = APIRouter(prefix="/api", tags=["models"])


@router.get("/models")
def list_models(_u: dict = Depends(get_current_user),
                db: Session = Depends(get_db)) -> dict[str, Any]:
    runs = db.query(ModelRun).order_by(ModelRun.trained_at.desc()).all()
    return {"total": len(runs), "provenance": "PROJECTED (scores on held-out, time-split)",
            "data": [{"model": r.model, "version": r.version, "target": r.target,
                      "data_n": r.data_n, "metrics": r.metrics, "params": r.params,
                      "trained_at": r.trained_at.isoformat()} for r in runs]}


@router.get("/eta/{ref}")
def eta(ref: str, _u: dict = Depends(get_current_user),
        db: Session = Depends(get_db)) -> dict[str, Any]:
    s = db.query(Shipment).filter(Shipment.ref == ref).one_or_none()
    if not s:
        raise HTTPException(404, f"shipment {ref} not found")
    pred = eta_model.predict_for_shipment(s)
    if pred is None:
        return {"ref": ref, "available": False,
                "note": "model not trained yet (trains during bootstrap)",
                "provenance": "EMPTY:HONEST"}
    return {"ref": ref, "available": True, **pred,
            "model_scores": eta_model.latest_scores(db)}
