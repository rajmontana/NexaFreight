"""AI copilot & automation (Definitive Plan — Phase 7).

Answers operators' natural-language questions about a shipment:

  rule path  — ETA, SLA status, demurrage; computed locally, deterministic.
  llm path   — "why / recommend / should we / explain / compare / trade-off…"
               — full node-A/B context is injected into the prompt.
  fallback   — any Gemini error degrades gracefully to the rule answer with
               source="rules_fallback" (never a 500).

All LLM interactions are recorded in audit_logs (action="llm_query") with
SHA-256 input/output hashes — a tamper-evident paper trail.
"""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.models import AuditLog, Shipment
from nexafreight.services.alert_engine import latest_planned_arrival
from nexafreight.services.financial_engine import (
    DEMURRAGE_DAILY_RATE,
    DEMURRAGE_FREE_DAYS,
    calculate_co2_kg,
    calculate_demurrage,
)

logger = logging.getLogger(__name__)

#: Routes to the LLM instead of rules when the question matches (Plan §Phase 7).
_LLM_PATTERN = re.compile(
    r"(why|recommend|should we|should i|explain|compare|trade.?off|pros and cons|"
    r"advantage|risk|suggestion|recommendation|tradeoff)",
    re.IGNORECASE,
)


def needs_llm(question: str) -> bool:
    """True when the question asks for judgment/explanation → LLM path."""
    return bool(_LLM_PATTERN.search(question or ""))


# ---------------------------------------------------------------------------
# Context assembly
# ---------------------------------------------------------------------------


def load_shipment_context(shipment: Shipment) -> dict:
    """Compact, JSON-safe context snapshot of a shipment for prompts/rules."""
    legs = sorted(shipment.legs, key=lambda l: l.sequence_number)
    orders = shipment.orders
    total_revenue = sum(o.revenue for o in orders)
    total_shipping = sum(o.shipping_cost for o in orders)
    eta = latest_planned_arrival(shipment)
    weight_t = max(1, shipment.container_count) * 14.0
    co2_kg = sum(
        calculate_co2_kg(leg.distance_km or 0.0, weight_t, str(leg.transport_mode))
        for leg in legs
        if leg.distance_km
    )
    return {
        "shipment_id": shipment.id,
        "status": str(shipment.status),
        "mode": str(shipment.primary_transport_mode),
        "origin": getattr(shipment.origin, "name", None) or str(shipment.origin_id),
        "destination": getattr(shipment.destination, "name", None)
        or str(shipment.destination_id),
        "container_count": shipment.container_count,
        "total_revenue_usd": total_revenue,
        "total_shipping_cost_usd": total_shipping,
        "planned_departure": shipment.planned_departure.isoformat()
        if shipment.planned_departure
        else None,
        "latest_eta": eta.isoformat() if eta else None,
        "est_co2_kg": round(co2_kg, 1),
        "orders": [
            {
                "order_number": o.order_number,
                "revenue_usd": o.revenue,
                "shipping_cost_usd": o.shipping_cost,
                "sla_status": str(o.sla_status),
                "sla_deadline": o.sla_deadline.isoformat(),
            }
            for o in orders
        ],
        "legs": [
            {
                "sequence": leg.sequence_number,
                "mode": str(leg.transport_mode),
                "status": str(leg.status),
                "planned_arrival": leg.planned_arrival.isoformat()
                if leg.planned_arrival
                else None,
            }
            for leg in legs
        ],
        "open_alerts": [
            {"severity": str(a.severity), "exposure_usd": a.financial_exposure}
            for a in shipment.alerts
            if str(a.status) != "RESOLVED"
        ],
    }


# ---------------------------------------------------------------------------
# Rule answers
# ---------------------------------------------------------------------------


def _demurrage_answer(shipment: Shipment) -> str:
    """Rules: quote live demurrage paper trail for the shipment."""
    eta = latest_planned_arrival(shipment)
    dwell_days = 0
    if eta is not None:
        if eta.tzinfo is None:
            eta = eta.replace(tzinfo=UTC)
        dwell_days = max(0, (datetime.now(UTC) - eta).days)
    per_container = calculate_demurrage(
        extra_days=dwell_days,
        free_days=DEMURRAGE_FREE_DAYS,
        daily_rate=DEMURRAGE_DAILY_RATE,
    )
    total = per_container * max(1, shipment.container_count)
    return (
        f"Demurrage exposure: ~${total:,.0f} "
        f"({shipment.container_count} container(s) × "
        f"${DEMURRAGE_DAILY_RATE:,.0f}/day after {DEMURRAGE_FREE_DAYS} free days; "
        f"current port dwell {dwell_days} day(s) past planned arrival)."
    )


def _rules_answer(shipment: Shipment) -> str:
    """Rules: ETA / SLA / demurrage from live data — deterministic."""
    orders = shipment.orders
    eta = latest_planned_arrival(shipment)
    now = datetime.now(UTC)
    if eta is not None and eta.tzinfo is None:
        eta = eta.replace(tzinfo=UTC)

    if orders:
        order = min(orders, key=lambda o: o.sla_deadline)
        deadline = order.sla_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=UTC)
        if eta and eta > deadline:
            days = max(1, (eta - deadline).days)
            return (
                f"SLA breach: order {order.order_number} misses its deadline "
                f"{deadline:%Y-%m-%d} by ~{days} day(s) "
                f"(latest planned arrival {eta:%Y-%m-%d})."
            )
        eta_text = f"{eta:%Y-%m-%d}" if eta else "unknown"
        return (
            f"On track: order {order.order_number} due {deadline:%Y-%m-%d}; "
            f"current ETA {eta_text} ({str(order.sla_status).lower()})."
        )
    if eta is None:
        return "No schedule data is available for this shipment yet."
    days_out = max(0, (eta - now).days)
    return (
        f"Shipment {shipment.id} is currently estimated to arrive {eta:%Y-%m-%d} "
        f"(~{days_out} day(s) out)."
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def answer_shipment_question(
    session: AsyncSession,
    *,
    shipment: Shipment,
    question: str,
    adapter=None,
    user=None,
) -> dict:
    """Answer an operator question. Router decides rules vs LLM.

    Returns ``{"answer": str, "source": "llm" | "rules" | "rules_fallback", "provenance": "DERIVED"}``.
    LLM failures fall back to the rule answer with ``rules_fallback``,
    never a 500 (Definitive Plan acceptance criterion).
    """
    # Eager loads inside the greenlet (no lazy access outside).
    await session.refresh(shipment, ["legs", "orders", "alerts", "origin", "destination"])

    context = load_shipment_context(shipment)
    source = "rules"

    if needs_llm(question):
        source = "rules_fallback"  # assume fallback until the LLM answers

        if adapter is None:
            # Build adapter chain from Settings so config values are respected.
            from nexafreight.adapters.llm.gemini import GeminiAdapter
            from nexafreight.adapters.llm.ollama import OllamaAdapter
            from nexafreight.config import get_settings

            _settings = get_settings()
            _gemini_key = (
                _settings.gemini_api_key.get_secret_value()
                if _settings.gemini_api_key
                else None
            )
            gemini = GeminiAdapter(
                model_name=_settings.gemini_model,
                api_key=_gemini_key,
            )
            ollama = OllamaAdapter(
                base_url=_settings.ollama_base_url,
                model=_settings.ollama_model,
            )
            # Prefer Gemini; fall through to Ollama if unavailable.
            adapter = gemini if gemini.available else ollama

        prompt = (
            "You are the NexaFreight shipment copilot. Answer the operator's "
            "question using only the context below.\n\n"
            f"CONTEXT (JSON):\n{context}\n\n"
            f"QUESTION: {question}\n\n"
            "Answer in 3 short paragraphs or fewer, concrete and financial."
        )

        if getattr(adapter, "available", False):
            answer = await adapter.complete(prompt)
            if answer:
                source = "llm"
                _record_llm_audit(
                    session,
                    shipment=shipment,
                    question=question,
                    answer=answer,
                    user=user,
                )
                await session.commit()
                return {"answer": answer, "source": source, "provenance": "DERIVED"}

        # All LLM adapters failed or unavailable — fall back to rule answer.
        answer = _rules_answer(shipment)
        _record_llm_audit(
            session,
            shipment=shipment,
            question=question,
            answer=answer,
            user=user,
            note="all_llm_unavailable_fallback",
        )
        await session.commit()
        return {"answer": answer, "source": source, "provenance": "DERIVED"}

    if "demurrage" in (question or "").lower():
        answer = _demurrage_answer(shipment)
    else:
        answer = _rules_answer(shipment)
    return {"answer": answer, "source": "rules", "provenance": "DERIVED"}


def _record_llm_audit(
    session: AsyncSession,
    *,
    shipment: Shipment,
    question: str,
    answer: str,
    user=None,
    note: str | None = None,
) -> None:
    """Paper trail: every LLM interaction gets SHA-256 input/output hashes."""
    session.add(
        AuditLog(
            actor_type="user" if user is not None else "system",
            actor_id=getattr(user, "id", None),
            actor_name=getattr(user, "full_name", None) or "copilot",
            action="llm_query",
            entity_type="shipment",
            entity_id=shipment.id,
            input_hash=hashlib.sha256(question.encode()).hexdigest(),
            output_hash=hashlib.sha256(answer.encode()).hexdigest(),
            details_json=f'{{"note": "{note or "ok"}"}}',
        )
    )
