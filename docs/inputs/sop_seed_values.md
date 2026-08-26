# SOP Seed Values — extracted from Business_SOP_Research_Guide_TeamMember4.pdf
# (Drive folder "Nexa freight", extracted 2026-08-26. Original guide authored for
#  "Apex Global Logistics & Freight Corp" — adopted as NexaFreight's rulebook seed.)
#
# This file is the Phase-1 seed input for: sop_rules table, rate_cards/tariffs,
# and the approval-authority matrix. Values below are verbatim from the guide.

tariffs:
  ocean_dry_tier1:            # Maersk / MSC reference
    free_time: "5 days at port"
    penalty: {amount: 250, unit: "USD/day/container"}
    sla_breach_fine: {amount: 1000, type: flat}
  ocean_reefer_tier1:
    free_time: "2 days at port"
    penalty: {amount: 550, unit: "USD/day/container"}
    sla_breach_fine: {amount: 2500, type: flat, note: "+ inspection fee"}
  air_express:                # DHL / FedEx reference
    free_time: "24 hours at hub"
    penalty: {amount: 1200, unit: "USD/day"}
    sla_breach_fine: {amount: 5000, type: flat}
  inland_trucking_rail:       # intermodal express
    free_time: "12 hours at ramp"
    penalty: {amount: 150, unit: "USD/hour"}
    sla_breach_fine: {amount: 500, type: flat}

escalation_matrix:            # users.approval_limit_usd + authorized actions
  - level: 1, role: "Logistics Dispatcher",      cap_usd: 2500,    actions: ["port priority alert", "vessel speed advisory", "carrier alert"]
  - level: 2, role: "Supply Chain Manager",      cap_usd: 25000,   actions: ["feeder port reroute", "partial air freight expedite"]
  - level: 3, role: "Regional Logistics Director", cap_usd: 100000, actions: ["carrier contract override", "full cargo reshipment"]
  - level: 4, role: "VP of Global Operations",   cap_usd: null,    actions: ["insurance claim", "carrier contract termination", "C-suite alert"], cap_note: "unlimited ($100k+)"

iot_thresholds:               # cargo-environment alert rules (worksheet 3)
  vessel_speed_knots:   {normal: [14.0, 20.0], warning: [10.0, 13.9], critical: null}
  wave_height_m:        {normal: [0.5, 3.0],  warning: [3.1, 4.9],  critical: {min: 5.0, note: "storm / severe swell alert"}}
  cold_chain_temp_c:    {normal: [2.0, 8.0],  warning: {range: [8.1, 10.0], condition: ">1hr"}, critical: {min: 10.0, condition: ">4hrs = cargo spoilage claim"}}
  humidity_electronics: {normal: [30, 50],     warning: [51, 65],     critical: {min: 65, note: "moisture condensation damage"}}

sop_rules:
  - id: SOP-LOG-001
    title: "High-Risk Ocean Freight Delay Protocol"
    trigger:
      all_of:
        - ml_late_risk_pct: {">": 70}
        - delay_days: {">": 2.0}
        - cargo_value_usd: {">": 50000}
    recommended_action: "Divert vessel to secondary feeder port with lower queue congestion"
    action_cost: {flat: 2500, per_day: 300}
    emergency_alternative: "Partial air expedite: fly 25% urgent cargo; leave 75% on vessel"
    emergency_cost_est: 12500
    expected_outcome: "Reduces ETA delay by 3-4 days; avoids $20,000 SLA penalty"

# Industry reference anchors quoted in the guide:
#  - Ocean free time 3-5 days; demurrage $150-$350/day (Maersk/MSC/Hapag-Lloyd/Flexport)
#  - Air freight multiplier ~4x-6x ocean; 2-day delivery SLA (DHL/FedEx/UPS money-back)
#  - Cold chain: ambient 15-25C, cold 2-8C, breach >4h = spoilage (WHO / Pfizer / Sensitech)
#  - Rerouting threshold when ocean vessel delay exceeds 48 hours (McKinsey/Gartner)
