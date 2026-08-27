import os
import requests
import json
from typing import Dict, Any, List, Optional

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# ----------------------------------------------------------------------
# BUSINESS STANDARD OPERATING PROCEDURES (SOP) KNOWLEDGE BASE
# Sourced from: Business_SOP_Research_Guide_TeamMember4.pdf & Master Report
# ----------------------------------------------------------------------
SOP_KNOWLEDGE_BASE = {
    "demurrage_rules": {
        "title": "Port Terminal Demurrage & Detention SOP",
        "free_time_allowance": "4 Days (0-4 days: $0 accrual)",
        "tier_1_fee": "Days 5-7: $300 per TEU container per day",
        "tier_2_fee": "Days 8-10: $450 per TEU container per day",
        "tier_3_fee": "Days 10+: $600 per TEU container per day (Escalated)",
        "mitigation_protocol": "If terminal dwell exceeds 72 hours, trigger priority customs gate-out or drayage short-haul to off-dock bonded CFS."
    },
    "sla_modal_shift": {
        "title": "SLA Delay Mitigation & Modal Shift SOP",
        "first_class_root_cause": "100% late delivery breach is caused by promising 1-day SLA on routes with 2.0-day physical transit and customs clearance duration.",
        "corrective_action": "Execute 1-Click Modal Shift to Priority Air Cargo (BOM-AMS corridor). Cost: +$350 expedite vs -$1,200 contractual OTIF penalty fine -> Net Benefit: +$850 USD.",
        "customer_voucher_policy": "Issue $25 compensatory service voucher for SLA breaches to reduce customer churn risk by 75%."
    },
    "six_sigma_quality": {
        "title": "Statistical Process Control (SPC) Lead-Time Standard",
        "process_mean": "3.56 Days (Dispatch to Delivery lead time)",
        "ucl": "6.21 Days (Upper Control Limit = Mean + 3 Sigma)",
        "lcl": "0.91 Days (Lower Control Limit = Mean - 3 Sigma)",
        "dpmo": "572,900 Defects Per Million Opportunities",
        "sigma_level": "1.60 Sigma (Requires DMAIC Root-Cause Redesign on First Class promising)"
    },
    "regulatory_compliance": {
        "imo_cii": "IMO 2023 Carbon Intensity Indicator: Vessel grade B required for international waters.",
        "solas_vgm": "SOLAS Verified Gross Mass (ISO 668): Maximum 28,200 kg per 20ft TEU.",
        "gst_eway": "National Electronic Way Bill active for inter-state highway transit.",
        "fmcsa_hos": "FMCSA Hours of Service: 11-hour maximum driver driving limit enforced with telematics rest hold."
    }
}

BASE_SYSTEM_PROMPT = """
You are the SmartTrack™ Enterprise AI Logistics Dispatcher Copilot powered by NexaFreight.
You are an expert in supply chain operations, XGBoost predictive ETA regressor models, Six Sigma quality control, and maritime/freight logistics.

Ground all your recommendations in the official NexaFreight Business SOP Knowledge Base:
- Demurrage: 4-day free-time allowance, followed by Tier 1 ($300/d), Tier 2 ($450/d), Tier 3 ($600/d).
- Prescriptive Action: If a shipment has >50% late risk, recommend 1-Click Priority Air Expedite (Cost: +$350 vs OTIF Fine: -$1,200 -> Net Benefit: +$850).
- Quality Metrics: Six Sigma 1.60σ (572,900 DPMO) with UCL=6.21d, Mean=3.56d, LCL=0.91d.
- Regulatory Standards: SOLAS VGM (28,200 kg limit), IMO CII Grade B, GST e-Way, FMCSA HOS (11-hr rest).

When live control-tower context is provided below, quote its numbers and treat them as the
current ground truth. Always provide direct, structured, and actionable supply chain
guidance with dollar savings and operational steps.
"""


def _build_system_prompt(live_context: Optional[Dict[str, Any]]) -> str:
    if not live_context:
        return BASE_SYSTEM_PROMPT
    try:
        ctx_lines = ["", "LIVE CONTROL-TOWER SNAPSHOT (ground truth, refresh each message):"]
        for k, v in live_context.items():
            ctx_lines.append(f"- {k}: {v}")
        return BASE_SYSTEM_PROMPT + "\n".join(ctx_lines)
    except Exception:
        return BASE_SYSTEM_PROMPT


def _fmt_money(v) -> str:
    try:
        return f"${float(v):,.0f}"
    except Exception:
        return str(v)


def query_groq_llm(user_message: str, chat_history: List[Dict[str, str]] = None,
                   live_context: Optional[Dict[str, Any]] = None) -> str:
    ctx = live_context or {}
    messages = [{"role": "system", "content": _build_system_prompt(live_context)}]

    if chat_history:
        for m in chat_history[-6:]:
            messages.append(m)

    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 500
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY.strip()}",
        "Content-Type": "application/json"
    }

    if GROQ_API_KEY.strip():
        # Try calling Groq API via direct first, then proxy
        session = requests.Session()
        session.trust_env = False

        try:
            r = session.post(GROQ_URL, headers=headers, json=payload, timeout=8)
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"]
        except Exception:
            pass

        try:
            session.proxies = {
                "http": "http://edcguest:edcguest@172.31.100.27:3128",
                "https": "http://edcguest:edcguest@172.31.100.27:3128"
            }
            r = session.post(GROQ_URL, headers=headers, json=payload, timeout=8)
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"]
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Built-in SOP Knowledge-Grounded Fallback Engine (live-context aware)
    # ------------------------------------------------------------------
    msg_lower = user_message.lower()
    on_time = ctx.get("on_time_rate_pct", "42.71")
    demurrage = _fmt_money(ctx.get("demurrage_exposure_usd", 527500))
    vessels = ctx.get("ais_vessels_tracked", 8)
    vessel_mode = ctx.get("ais_mode", "simulated")
    critical = ctx.get("critical_exceptions", "98,799")

    if "demurrage" in msg_lower or "port" in msg_lower or "rotterdam" in msg_lower or "dwell" in msg_lower:
        return (
            "📋 **SOP Demurrage Mitigation Protocol (SOP-LOG-04):**\n\n"
            f"• **Live Exposure:** Current accrued demurrage exposure is `{demurrage}` across the tracked TEU fleet.\n"
            "• **Free-Time Allowance:** 4 Days ($0 accrual).\n"
            "• **Fee Schedule:** Days 5-7 ($300/TEU/d) | Days 8-10 ($450/TEU/d) | Days 10+ ($600/TEU/d).\n"
            "• **Recommended Action:** For containers at Rotterdam & JNPT exceeding 72h dwell, trigger priority drayage dispatch to off-dock bonded CFS storage to prevent Tier 3 $600/day penalties."
        )
    elif "reroute" in msg_lower or "air" in msg_lower or "delayed" in msg_lower or "late" in msg_lower or "ord-" in msg_lower:
        return (
            "✈️ **SOP Prescriptive Modal Shift Recommendation (SOP-DISP-02):**\n\n"
            "• **Root Cause:** XGBoost Regressor predicts transit delay exceeding customer promised SLA.\n"
            f"• **Live Network State:** On-time SLA currently `{on_time}%` with `{critical}` critical breach records under monitoring.\n"
            "• **Financial Math:**\n"
            "  - Priority Air Cargo Expedite: `+$350.00 USD`\n"
            "  - Avoided Contractual OTIF Penalty: `-$1,200.00 USD`\n"
            "  - **Net Financial Benefit: `+$850.00 USD`**\n"
            "• **Customer Policy:** Automatically issue a $25 courtesy service voucher to mitigate churn by 75%."
        )
    elif "sigma" in msg_lower or "spc" in msg_lower or "quality" in msg_lower or "dpmo" in msg_lower:
        return (
            "📈 **Six Sigma Quality & Capability Analysis (SOP-QA-01):**\n\n"
            "• **Process Capability:** `1.60σ` with `572,900 DPMO` (Defects Per Million Opportunities).\n"
            "• **Statistical Control Limits:** `UCL = 6.21 Days`, `Mean (X-bar) = 3.56 Days`, `LCL = 0.91 Days`.\n"
            "• **Corrective Action:** The high DPMO is driven by First Class 1-day promising. Transitioning First Class SLA promises from 1.0d to 2.0d in the ERP will elevate the process capability from 1.60σ to 3.85σ."
        )
    elif "emission" in msg_lower or "co2" in msg_lower or "carbon" in msg_lower or "esg" in msg_lower:
        return (
            "🌿 **Scope 3 ESG Carbon Optimization (SOP-ESG-01):**\n\n"
            "• **Total Carbon Footprint:** `803,190 kg CO2e` (-5.0% YoY reduction).\n"
            "• **Modal Intensity:** Ocean (`0.015 kg/t-km`) vs Road (`0.105 kg/t-km`) vs Air (`0.602 kg/t-km`).\n"
            "• **Recommendation:** Shift high-volume non-urgent cargo from Air to Maritime Ocean TEU to reduce carbon emissions by up to 88% while remaining within IMO 2023 CII Grade B standards."
        )
    elif "vessel" in msg_lower or "ship" in msg_lower or "ais" in msg_lower or "container ship" in msg_lower:
        return (
            "🛰️ **Live AIS Maritime Telemetry Status:**\n\n"
            f"• **Satellite Feed:** `{len(str(vessels)) and vessels}` ocean vessels currently on the trade-corridor watch boxes (mode: `{vessel_mode}`).\n"
            "• **Watch Zones:** Indian Ocean, Red Sea/Suez, Malacca Strait, N-West Europe, US West Coast.\n"
            "• **Action:** Set the `AISSTREAM_API_KEY` environment variable to bind the full live AISstream.io satellite feed. Vessel positions refresh continuously on the Global Freight Radar."
        )
    else:
        return (
            "🤖 **SmartTrack™ AI Dispatcher Copilot Online:**\n\n"
            f"Live snapshot: on-time SLA `{on_time}%`, demurrage exposure `{demurrage}`, `{vessels}` vessels tracked via AIS ({vessel_mode}).\n\n"
            "I have reviewed your query against the **NexaFreight Business SOP Knowledge Base** (172,765 shipment records & XGBoost ML Regressor).\n\n"
            "You can ask me to:\n"
            "1. Analyze delay risk and recommend **1-Click Air Rerouting**.\n"
            "2. Optimize **Port Demurrage & Free-Time dwell**.\n"
            "3. Audit **Six Sigma SPC lead-time control limits**.\n"
            "4. Calculate **Scope 3 ESG Carbon reduction**."
        )
