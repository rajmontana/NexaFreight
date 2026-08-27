"""SOP-grounded copilot (Groq Llama-3.3). Explains — never decides (§9.3)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.core.db import get_db
from backend.app.models.entities import Alert, DecisionOption, Shipment, SopRule

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/copilot", tags=["copilot"])


class Ask(BaseModel):
    question: str
    alert_id: int | None = None


SYSTEM = ("You are the NexaFreight control-tower copilot. Ground every answer in the "
          "provided SOP rules and alert facts. Cite rule codes. If the rules don't cover "
          "it, say so. You explain and recommend; a human operator always decides.")


def _context(db: Session, alert_id: int | None) -> str:
    rules = db.query(SopRule).filter(SopRule.is_active.is_(True)).all()
    parts = ["SOP RULEBOOK:"] + [
        f"- {r.code} v{r.version} [{r.severity}] {r.action_template}" for r in rules]
    if alert_id:
        a = db.get(Alert, alert_id)
        if a:
            s = db.get(Shipment, a.shipment_id)
            opts = db.query(DecisionOption).filter_by(alert_id=a.id).all()
            parts.append(f"ALERT {a.id}: {a.rule_code} on {s.ref if s else '?'} "
                         f"(mode={s.freight_mode if s else '?'}, value={s.value_usd if s else '?'}):")
            parts += [f"- option {o.option_type}: cost ${o.cost_usd}, p_on_time {o.p_on_time}" for o in opts]
    return "\n".join(parts)


@router.post("")
def ask(req: Ask, _u: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    cfg = get_settings()
    if not cfg.groq_api_key:
        return {"available": False, "provenance": "EMPTY:HONEST",
                "answer": "Copilot not configured (GROQ_API_KEY unset). Rules and option math "
                          "remain fully available — I only narrate them."}
    try:
        r = httpx.post("https://api.groq.com/openai/v1/chat/completions",
                       headers={"Authorization": f"Bearer {cfg.groq_api_key}"},
                       json={"model": "llama-3.3-70b-versatile", "temperature": 0.2,
                             "max_tokens": 350,
                             "messages": [{"role": "system", "content": SYSTEM},
                                          {"role": "user", "content": _context(db, req.alert_id)
                                           + "\n\nQUESTION: " + req.question}]},
                       timeout=12)
        r.raise_for_status()
        return {"available": True, "provenance": "REAL:GROQ + SOP context",
                "answer": r.json()["choices"][0]["message"]["content"]}
    except Exception as e:  # noqa: BLE001 — fail loud, never fabricate
        log.warning("copilot call failed: %s", e)
        return {"available": False, "provenance": "EMPTY:HONEST",
                "answer": f"Copilot unreachable ({type(e).__name__}). Decision data below is unaffected."}
