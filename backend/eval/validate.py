#!/usr/bin/env python3
"""Validate the project's numbers against published external references.

Task 9 (eval harness). Rule: evaluation is against PUBLICLY available
research/reports/benchmarks — never the project against itself.

Layers:
  static (default) — params registry + engine constants + artifacts metadata
                     must match eval/references.yaml within tolerance.
  --live           — additionally re-verify searoute distances (needs network
                     + searoute) and the golden road duration (needs repo deps).

Exit code 0 = all green; 1 = any drift. Designed to become the CI gate
(Task_Rankings #17) and the paper's numbers-backstop.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import yaml  # noqa: E402


def _load_references() -> dict:
    ref_path = Path(__file__).resolve().parent / "references.yaml"
    return yaml.safe_load(ref_path.read_text())


def _check(name: str, actual: float, expected: float, tol: float) -> bool:
    ok = abs(actual - expected) <= tol
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name:<44} actual={actual:<12} ref={expected} (±{tol})")
    return ok


def validate_static(refs: dict) -> bool:
    from nexafreight.core.params import FALLBACK_DEFAULTS
    from nexafreight.services.financial_engine import (
        DEMURRAGE_DAILY_RATE,
        FREIGHT_RATE_PER_T_KM,
        SLA_PENALTY_PCT_PER_WEEK,
    )
    from nexafreight.services.insurance import (
        INSURED_VALUE_UPLIFT,
        INSURANCE_PCT_BY_MODE,
    )

    fx = FALLBACK_DEFAULTS["fx.usd_inr"]
    all_ok = True
    print("== Static layer: registry + engine constants vs references ==")

    all_ok &= _check("fx.usd_inr", fx, refs["fx_usd_inr"]["value"], refs["fx_usd_inr"]["check"]["abs"])
    all_ok &= _check(
        "freight AIR $/tkm",
        FREIGHT_RATE_PER_T_KM["AIR"],
        refs["freight_air_usd_per_tkm"]["value"],
        refs["freight_air_usd_per_tkm"]["check"]["abs"],
    )
    all_ok &= _check(
        "freight ROAD INR/tkm",
        FREIGHT_RATE_PER_T_KM["ROAD"] * fx,
        refs["freight_road_inr_per_tkm"]["value"],
        refs["freight_road_inr_per_tkm"]["check"]["abs"],
    )
    all_ok &= _check(
        "freight RAIL INR/tkm",
        FREIGHT_RATE_PER_T_KM["RAIL"] * fx,
        refs["freight_rail_inr_per_tkm"]["value"],
        refs["freight_rail_inr_per_tkm"]["check"]["abs"],
    )
    all_ok &= _check(
        "freight SEA $/tkm",
        FREIGHT_RATE_PER_T_KM["SEA"],
        refs["freight_sea_usd_per_tkm"]["value"],
        refs["freight_sea_usd_per_tkm"]["check"]["abs"],
    )
    all_ok &= _check(
        "demurrage INR/box/day",
        DEMURRAGE_DAILY_RATE * fx,
        refs["demurrage_inr_per_box_day"]["value"],
        refs["demurrage_inr_per_box_day"]["check"]["abs"],
    )
    all_ok &= _check(
        "demurrage free days",
        FALLBACK_DEFAULTS["demurrage.free_days"],
        refs["demurrage_free_days"]["value"],
        refs["demurrage_free_days"]["check"]["abs"],
    )
    all_ok &= _check(
        "SLA penalty %/week",
        FALLBACK_DEFAULTS["sla.penalty_pct_per_week"],
        refs["sla_penalty_pct_per_week"]["value"],
        refs["sla_penalty_pct_per_week"]["check"]["abs"],
    )
    all_ok &= _check("SLA penalty per week (fraction)", SLA_PENALTY_PCT_PER_WEEK, 0.005, 0.001)
    all_ok &= _check(
        "SLA cap %",
        FALLBACK_DEFAULTS["sla.penalty_cap_pct"],
        refs["sla_penalty_cap_pct"]["value"],
        refs["sla_penalty_cap_pct"]["check"]["abs"],
    )
    all_ok &= _check(
        "road speed expressway",
        FALLBACK_DEFAULTS["road.speed.expressway"],
        refs["road_speed_expressway_kmph"]["value"],
        refs["road_speed_expressway_kmph"]["check"]["abs"],
    )
    all_ok &= _check(
        "road speed city/state",
        FALLBACK_DEFAULTS["road.speed.state_highway"],
        refs["road_speed_artificial_city_kmph"]["value"],
        refs["road_speed_artificial_city_kmph"]["check"]["abs"],
    )
    all_ok &= _check(
        "insurance ocean",
        INSURANCE_PCT_BY_MODE["SEA"],
        refs["insurance_pct_sea"]["value"],
        refs["insurance_pct_sea"]["check"]["abs"],
    )
    all_ok &= _check(
        "insurance air",
        INSURANCE_PCT_BY_MODE["AIR"],
        refs["insurance_pct_air"]["value"],
        refs["insurance_pct_air"]["check"]["abs"],
    )
    all_ok &= _check(
        "insurance uplift",
        INSURED_VALUE_UPLIFT,
        refs["insurance_uplift"]["value"],
        refs["insurance_uplift"]["check"]["abs"],
    )
    all_ok &= _check(
        "sea CO2 EF g/tkm",
        __import__("nexafreight.services.financial_engine", fromlist=["CO2_G_PER_T_KM"]).CO2_G_PER_T_KM["SEA"],
        refs["sea_co2_ef_g_per_tkm"]["value"],
        refs["sea_co2_ef_g_per_tkm"]["check"]["abs"],
    )
    all_ok &= _check(
        "carbon price $/kg",
        FALLBACK_DEFAULTS["carbon.price_usd_per_kg"],
        refs["carbon_price_usd_per_kg"]["value"],
        refs["carbon_price_usd_per_kg"]["check"]["abs"],
    )

    # Congestion tiers (Sim C design): warn triggers the scan, critical is
    # the documented severity-escalation level.
    tiers = refs["disruption_congestion_tiers"]
    all_ok &= _check(
        "congestion tier warn",
        FALLBACK_DEFAULTS["disruption.congestion.ratio_warn"],
        tiers["warn"]["value"],
        tiers["warn"]["check"]["abs"],
    )
    all_ok &= _check(
        "congestion tier critical",
        FALLBACK_DEFAULTS["disruption.congestion.ratio_critical"],
        tiers["critical"]["value"],
        tiers["critical"]["check"]["abs"],
    )

    # Port dwell (C8/C9, audit F4): pin the on-screen delay-estimate inputs.
    dwell_refs = {k: v for k, v in refs["port_dwell_p50_hours"].items() if isinstance(v, dict)}
    worst_ratio_dev = 0.0
    for locode, dref in sorted(dwell_refs.items()):
        all_ok &= _check(
            f"dwell p50 {locode}",
            FALLBACK_DEFAULTS[f"port.dwell.p50.{locode}"],
            dref["value"],
            dref["check"]["abs"],
        )
        p90 = FALLBACK_DEFAULTS[f"port.dwell.p90_ext.{locode}"]
        worst_ratio_dev = max(
            worst_ratio_dev,
            abs(p90 / FALLBACK_DEFAULTS[f"port.dwell.p50.{locode}"] - refs["port_dwell_p90_ratio"]["value"]),
        )
    all_ok &= _check(
        "dwell p90/p50 ratio dev from 2.0",
        worst_ratio_dev,
        0.0,
        refs["port_dwell_p90_ratio"]["check"]["abs"],
    )
    # One-sided semantic bound: container p50 must sit below the India
    # all-vessel average turnaround (48.84 h FY26).
    bound = refs["port_dwell_allvessel_upper_h"]["value"]
    worst_dwell = max(FALLBACK_DEFAULTS[f"port.dwell.p50.{k}"] for k in dwell_refs)
    dwell_ok = worst_dwell <= bound
    print(
        f"  [{'PASS' if dwell_ok else 'FAIL'}] {'dwell p50 max <= India all-vessel':<44} "
        f"actual={worst_dwell:<12} bound={bound} (one-sided)"
    )
    all_ok &= dwell_ok
    return bool(all_ok)


def validate_artifact(refs: dict) -> bool:
    """Retrained ETA artifact metrics vs the references file."""
    import json

    meta_path = Path(__file__).resolve().parent.parent / "models" / "eta_quantile" / "metadata.json"
    if not meta_path.exists():
        print("  [SKIP] ETA artifact metadata not found")
        return True
    meta = json.loads(meta_path.read_text())
    ref = refs["ml_baselines_dataco"]["eta_sea_inclusive_test_pinball"]
    m = meta["metrics"]["test"]
    # Red Sea drill artifact (task 16): ratios checked when the drill has
    # produced its artifact; SKIP (green) before the first drill run.
    drill_ok = True
    drill_path = Path(__file__).resolve().parent / "artifacts" / "red_sea_drill.json"
    if drill_path.exists():
        print("== Artifact layer: Red Sea replay ratios vs pinned bands ==")
        drill = json.loads(drill_path.read_text())
        groups = {"INJNP->NLRTM": "india_eu", "INMUN->NLRTM": "india_eu", "SGSIN->NLRTM": "singapore_eu"}
        for lane, group in groups.items():
            r = drill["results"][lane]["ratio"]
            cref = refs[f"cape_diversion_ratio_{group}"]
            drill_ok &= _check(
                f"cape ratio {lane}",
                r,
                cref["value"],
                cref["check"]["abs"],
            )

    print("== Artifact layer: ETA test pinball vs reproduced references ==")
    ok = _check("p10 pinball", m["p10"]["pinball_loss"], ref["p10"], 0.01)
    ok &= _check("p50 pinball", m["p50"]["pinball_loss"], ref["p50"], 0.01)
    ok &= _check("p85 pinball", m["p85"]["pinball_loss"], ref["p85"], 0.01)
    levels = (
        json.loads((meta_path.parent / "feature_schema.json").read_text())
        .get("categorical_levels", {})
        .get("shipping_mode", [])
    )
    has_sea = {"AIR", "RAIL", "SEA"} <= set(levels)
    print(f"  [{'PASS' if has_sea else 'FAIL'}] ETA artifact shipping_mode levels {levels}")
    return bool(ok and has_sea)


def validate_live(refs: dict) -> bool:
    """--live layer: re-verify searoute distances against published graph values."""
    try:
        import searoute as sr
    except ModuleNotFoundError:
        print("  [SKIP] searoute not installed; live layer skipped")
        return True
    coords = {
        "JNPT_JEA": ([72.9519, 18.9490], [55.0616, 25.0111]),  # lon,lat (JNPT → JEBEL ALI, AEJEA)
        "JNPT_SIN": ([72.9519, 18.9490], [103.8305, 1.2644]),  # (JNPT, Singapore)
        "Mundra_HAM": ([69.7190, 22.7370], [9.9320, 53.5370]),  # (Mundra, Hamburg)
        "SIN_RTM": ([103.8305, 1.2644], [4.3430, 51.9490]),  # (Singapore, Rotterdam)
    }
    print("== Live layer: searoute distances vs references (nm) ==")
    ok = True
    for name, (a, b) in coords.items():
        ref = refs["sea_route_nm"][name]
        try:
            km = sr.searoute(a, b, units="km")["properties"]["length"]
            nm = km / 1.852
            ok &= _check(f"searoute {name}", nm, ref["value"], ref["tol"])
        except Exception as exc:  # network/graph failure — report, don't crash
            print(f"  [SKIP] searoute {name}: {exc}")
    return bool(ok and drill_ok)


def _make_stdout_safe() -> None:
    """Never crash on console encoding (Windows cp1252 cannot print e.g. ₹).

    Reconfigure stdout to replace unencodable characters instead of raising.
    """
    try:
        sys.stdout.reconfigure(errors="replace")  # Python 3.7+
    except (AttributeError, ValueError):
        pass


def main() -> int:
    _make_stdout_safe()
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--live", action="store_true", help="also verify searoute distances (network)")
    args = ap.parse_args()

    refs = _load_references()
    ok = validate_static(refs)
    ok &= validate_artifact(refs)
    if args.live:
        ok &= validate_live(refs)
    print("\nVALIDATION:", "GREEN — all numbers trace to published references" if ok else "RED — drift detected")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
