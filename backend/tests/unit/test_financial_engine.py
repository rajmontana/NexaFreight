"""Unit tests for financial impact calculation engine.

Tests use exact known numeric values, not just structural assertions,
to establish baseline correctness that later ML/rerouting tasks will
trust without re-verifying the math.

Definitive Plan Phase 1 rules:
- SLA penalty: revenue × rate × days, capped at 10% of revenue
- Demurrage: tiered after free days (tier-1 flat, tier-2 doubled)
"""

from __future__ import annotations

import pytest

from nexafreight.services.financial_engine import (
    CARBON_COST_PER_KG,
    OrderFinancialInput,
    assess_order_margin,
    calculate_carbon_cost,
    calculate_co2_cost,
    calculate_co2_kg,
    calculate_demurrage,
    calculate_freight_cost,
    calculate_order_financial_impact,
    calculate_shipment_financial_impact,
    calculate_sla_penalty,
    generate_pnl_snapshot,
)


def test_calculate_sla_penalty_zero_days_late() -> None:
    """No penalty when delivery is on time or early."""
    result = calculate_sla_penalty(revenue=10000.0, penalty_pct=0.05, days_late=0)
    assert result == 0.0

    result_early = calculate_sla_penalty(revenue=10000.0, penalty_pct=0.05, days_late=-3)
    assert result_early == 0.0


def test_calculate_sla_penalty_positive_days_late() -> None:
    """Penalty = revenue × rate × day, under the 10% cap (1 day late = 5%)."""
    # Arithmetic: 20000 * 0.05 * 1 = 1000.0 (below the 10% cap of 2000)
    result = calculate_sla_penalty(revenue=20000.0, penalty_pct=0.05, days_late=1)
    assert result == 1000.0


def test_calculate_sla_penalty_capped_at_10pct() -> None:
    """SLA penalty is capped at 10% of revenue (Plan Phase 1)."""
    # Uncapped would be 50000 * 0.10 * 7 = 35000; cap is 50000 * 0.10 = 5000
    result = calculate_sla_penalty(revenue=50000.0, penalty_pct=0.10, days_late=7)
    assert result == 5000.0


def test_calculate_sla_penalty_cap_boundary() -> None:
    """One day below the cap stays uncapped; one day past hits the cap."""
    # 20000 * 0.05 * 2 = 2000 == cap exactly at 10%
    assert calculate_sla_penalty(20000.0, 0.05, 2) == 2000.0
    # 20000 * 0.05 * 3 = 3000 > 2000 cap
    assert calculate_sla_penalty(20000.0, 0.05, 3) == 2000.0


def test_calculate_demurrage_within_free_days() -> None:
    """No demurrage when within free days."""
    result = calculate_demurrage(extra_days=2, free_days=5, daily_rate=100.0)
    assert result == 0.0

    result_boundary = calculate_demurrage(extra_days=5, free_days=5, daily_rate=100.0)
    assert result_boundary == 0.0


def test_calculate_demurrage_beyond_free_days() -> None:
    """Tier-1 rate applies for the first 7 billable days."""
    # Arithmetic: (10 - 3) * 50.0 = 350.0
    result = calculate_demurrage(extra_days=10, free_days=3, daily_rate=50.0)
    assert result == 350.0

    # Arithmetic: (8 - 5) * 200.0 = 600.0
    result_higher_rate = calculate_demurrage(extra_days=8, free_days=5, daily_rate=200.0)
    assert result_higher_rate == 600.0


def test_calculate_demurrage_tier2_steepening() -> None:
    """Beyond 7 billable days the rate doubles (tiered per the plan)."""
    # billable = 9 → 7 * 150 + 2 * 150 * 2 = 1050 + 600 = 1650
    result = calculate_demurrage(extra_days=13, free_days=4, daily_rate=150.0)
    assert result == 1650.0


def test_calculate_carbon_cost_positive_delta() -> None:
    """Positive CO2 delta produces positive cost (increase)."""
    result = calculate_carbon_cost(co2_delta_kg=1000.0, cost_per_kg=0.08)
    assert result == 80.0


def test_calculate_carbon_cost_custom_rate() -> None:
    """Custom cost_per_kg scales result correctly."""
    result = calculate_carbon_cost(co2_delta_kg=500.0, cost_per_kg=0.12)
    assert result == 60.0


def test_calculate_carbon_cost_negative_delta() -> None:
    """Negative CO2 delta (improvement) produces negative cost (savings)."""
    result = calculate_carbon_cost(co2_delta_kg=-200.0, cost_per_kg=0.08)
    assert result == -16.0


def test_calculate_freight_cost_by_mode() -> None:
    """Nominal freight cost = rate × distance × weight, per mode."""
    # AIR: 1.8 × 5000 × 28 = 252000
    assert calculate_freight_cost(5000.0, 28.0, "AIR") == 252_000.0
    # SEA: 0.02 × 5000 × 28 = 2800
    assert calculate_freight_cost(5000.0, 28.0, "SEA") == 2_800.0
    # Unknown mode falls back to SEA rate
    assert calculate_freight_cost(5000.0, 28.0, "DRONE") == 2_800.0


def test_calculate_co2_kg_by_mode() -> None:
    """kg CO2 = g/t-km × km × t / 1000."""
    # AIR: 500 × 5000 × 28 / 1000 = 70000 kg
    assert calculate_co2_kg(5000.0, 28.0, "AIR") == 70_000.0
    # SEA: 6.5 × 5000 × 28 / 1000 = 910 kg
    assert calculate_co2_kg(5000.0, 28.0, "SEA") == 910.0


def test_calculate_co2_cost_uses_carbon_price() -> None:
    """Carbon price is $0.08/kg."""
    assert CARBON_COST_PER_KG == 0.08
    assert calculate_co2_cost(910.0) == pytest.approx(72.8)


def test_calculate_order_financial_impact_full_scenario() -> None:
    """Full order impact calculation with all components."""
    order_input = OrderFinancialInput(
        revenue=20000.0,
        penalty_pct=0.05,
        days_late=2,  # SLA penalty: 20000 * 0.05 * 2 = 2000.0 (== cap boundary)
        extra_days=7,
        free_days=3,
        daily_rate=100.0,  # Demurrage: (7-3) * 100 = 400.0
        co2_delta_kg=500.0,  # Carbon: 500 * 0.08 = 40.0
    )

    result = calculate_order_financial_impact(order_input)

    assert result.sla_penalty == 2000.0
    assert result.demurrage == 400.0
    assert result.carbon_cost == 40.0
    assert result.total_impact_usd == 2440.0


def test_calculate_shipment_financial_impact_multi_order() -> None:
    """Multi-order shipment aggregation, capped SLA penalties."""
    orders = [
        # Order 1: SLA 10000 * 0.05 * 3 = 1500 (under 1000 cap? no → cap=1000 → capped)
        OrderFinancialInput(
            revenue=10000.0,
            penalty_pct=0.05,
            days_late=3,  # SLA: min(1500, 1000) = 1000.0
            extra_days=5,
            free_days=2,
            daily_rate=50.0,  # Demurrage: (5-2) * 50 = 150.0
            co2_delta_kg=200.0,  # Carbon: 16.0
        ),  # Total: 1166.0
        # Order 2: On time, no demurrage
        OrderFinancialInput(
            revenue=5000.0,
            penalty_pct=0.05,
            days_late=0,  # SLA: 0.0
            extra_days=1,
            free_days=3,
            daily_rate=50.0,  # Demurrage: 0.0
            co2_delta_kg=100.0,  # Carbon: 8.0
        ),  # Total: 8.0
        # Order 3: Very late → SLA capped at 10%
        OrderFinancialInput(
            revenue=30000.0,
            penalty_pct=0.10,
            days_late=5,  # SLA: min(15000, 3000) = 3000.0
            extra_days=10,
            free_days=3,
            daily_rate=200.0,  # Demurrage: tier1 → (10-3) * 200 = 1400.0
            co2_delta_kg=1000.0,  # Carbon: 80.0
        ),  # Total: 4480.0
    ]

    result = calculate_shipment_financial_impact(orders)

    assert result.per_order_impacts[0].total_impact_usd == 1166.0
    assert result.per_order_impacts[1].total_impact_usd == 8.0
    assert result.per_order_impacts[2].total_impact_usd == 4480.0
    # Total: 1166 + 8 + 4480 = 5654.0
    assert result.total_impact_usd == 5654.0


def test_split_reroute_savings_scenario() -> None:
    """Comparing two routing scenarios produces correct net savings."""
    # Scenario A: Stay on current slow route (SLA penalties capped)
    current_route_orders = [
        OrderFinancialInput(
            revenue=10000.0,
            penalty_pct=0.05,
            days_late=5,  # SLA: min(2500, 1000) = 1000.0
            extra_days=8,
            free_days=3,
            daily_rate=100.0,  # tier1 → (8-3) * 100 = 500.0
            co2_delta_kg=0.0,
        ),  # Total: 1500.0
        OrderFinancialInput(
            revenue=15000.0,
            penalty_pct=0.05,
            days_late=5,  # SLA: min(3750, 1500) = 1500.0
            extra_days=8,
            free_days=3,
            daily_rate=100.0,  # 500.0
            co2_delta_kg=0.0,
        ),  # Total: 2000.0
    ]
    current_route_impact = calculate_shipment_financial_impact(current_route_orders)
    assert current_route_impact.total_impact_usd == 3500.0

    # Scenario B: Reroute high-priority order via air
    reroute_orders = [
        OrderFinancialInput(
            revenue=10000.0,
            penalty_pct=0.05,
            days_late=5,
            extra_days=8,
            free_days=3,
            daily_rate=100.0,
            co2_delta_kg=0.0,  # Total: 1500.0 (unchanged)
        ),
        OrderFinancialInput(
            revenue=15000.0,
            penalty_pct=0.05,
            days_late=0,  # SLA: 0.0 (on time via air)
            extra_days=0,
            free_days=3,
            daily_rate=100.0,
            co2_delta_kg=800.0,  # Carbon: 64.0
        ),  # Total: 64.0
    ]
    reroute_impact = calculate_shipment_financial_impact(reroute_orders)
    assert reroute_impact.total_impact_usd == 1564.0

    # Net savings: 3500 - 1564 = 1936.0
    net_savings = current_route_impact.total_impact_usd - reroute_impact.total_impact_usd
    assert net_savings == 1936.0


def test_generate_pnl_snapshot_margin_math() -> None:
    """PnL: total_costs sum, margin = revenue − costs, margin% normalised."""
    pnl = generate_pnl_snapshot(
        revenue_usd=10_000.0,
        shipping_cost_usd=1_000.0,
        sla_penalty_usd=500.0,
        demurrage_usd=250.0,
        freight_cost_usd=2_800.0,
        carbon_cost_usd=72.8,
    )
    assert pnl.total_costs_usd == pytest.approx(4622.8)
    assert pnl.margin_usd == pytest.approx(5377.2)
    assert pnl.margin_pct == pytest.approx(0.53772)
    assert any("penalties" in w for w in pnl.warnings)  # flags warn about penalties
    # No revenue → margin_pct undefined, warns
    pnl_no_rev = generate_pnl_snapshot(
        revenue_usd=0.0,
        shipping_cost_usd=100.0,
        sla_penalty_usd=0.0,
        demurrage_usd=0.0,
        freight_cost_usd=0.0,
        carbon_cost_usd=0.0,
    )
    assert pnl_no_rev.margin_pct is None
    assert pnl_no_rev.margin_usd == -100.0
    assert any("No revenue" in w for w in pnl_no_rev.warnings)


def test_generate_pnl_snapshot_negative_margin_warns() -> None:
    pnl = generate_pnl_snapshot(
        revenue_usd=1_000.0,
        shipping_cost_usd=2_000.0,
        sla_penalty_usd=0.0,
        demurrage_usd=0.0,
        freight_cost_usd=0.0,
        carbon_cost_usd=0.0,
    )
    assert pnl.margin_usd == -1000.0
    assert any("negative margin" in w for w in pnl.warnings)


def test_assess_order_margin_bands() -> None:
    go = assess_order_margin(
        revenue_usd=10_000.0,
        shipping_cost_usd=1_000.0,
        sla_penalty_usd=0.0,
        demurrage_usd=0.0,
        freight_cost_usd=1_000.0,
        carbon_cost_usd=50.0,
    )
    assert go.startswith("GO")
    nogo = assess_order_margin(
        revenue_usd=1_000.0,
        shipping_cost_usd=2_000.0,
        sla_penalty_usd=0.0,
        demurrage_usd=0.0,
        freight_cost_usd=0.0,
        carbon_cost_usd=0.0,
    )
    assert nogo.startswith("NO-GO")
