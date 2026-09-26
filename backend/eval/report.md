# Wave 3b: Frozen Metrics Report

## ETA Quantile Model (T-037)

```text
======================================================
  NexaFreight - ETA Quantile Model (T-037) Training Summary
======================================================
Quantile     Val Loss  Test Loss   Baseline       Lift
------------------------------------------------------
P10            0.1673     0.1685     0.1681      -0.3%
P50            0.5055     0.5060     0.5036      -0.5%
P85            0.2561     0.2598     0.2513      -3.4%
------------------------------------------------------
REPORT > ETA P10 coverage: 0.09940  (target 0.10)
REPORT > ETA P50 coverage: 0.52867  (target 0.50)
REPORT > ETA P85 coverage: 0.84770  (target 0.85)
REPORT > ETA NAIVE P10/P50/P85 coverage: 0.32852 / 0.66395 / 1.00000
REPORT > ETA P50 RMSE: 1.2974  (naive 1.2961)
  Test Coverage [P10..P85]:    74.8%  (nominal 75%)
  Baseline Coverage:           100.0%
  Raw Monotonicity:            95.5%
  Corrected Monotonicity:      100.0%
  P50 Test MAE:                1.01 days
  Runtime:                     19.2s
  Model SHA-256:               b3954a466dbd8bc2
======================================================
```

## Demand Forecast (T-038)

```text
===========================================================
  NexaFreight - Demand Forecast (T-038) Training Summary
===========================================================
  Qualified lanes: 79 / 675
  WAPE:            32.2%
REPORT > DEMAND MEDIAN MASE: 0.7285
REPORT > DEMAND MASE pooled: 0.6985
REPORT > DEMAND lanes MASE<=1: 63 of 79 (79.7%)
  Median MAPE:     52.5%
  Runtime:         120.4s
  Model SHA-256:   35cfd698ec45c6bd

  BEST 5 lanes:
    Indoor/Outdoor Games__Central America               19.2%
    Men's Footwear__South America                       20.1%
    Men's Footwear__Southern Europe                     23.1%
    Women's Apparel__South America                      26.4%
    Shop By Sport__Central America                      26.5%

  WORST 5 lanes:
    Women's Apparel__Western Europe                    149.3%
    Water Sports__Southern Europe                      164.4%
    Shop By Sport__South Asia                          164.9%
    Men's Footwear__South Asia                         172.1%
    Indoor/Outdoor Games__Western Europe               179.0%
===========================================================
```

## Planner Validation (wave 3c)
Commit: df46f446864339aadfa07c128a9b4f854a1f4ef5

```text
REPORT > PLANNER beats cheapest: 40/40 (100.0%)
REPORT > PLANNER beats fastest: 40/40 (100.0%)
REPORT > PLANNER beats greenest: 40/40 (100.0%)
REPORT > PLANNER mean composite: CRITICAL 0.9364 STANDARD 0.9364 ECONOMY 0.9364
REPORT > PLANNER VERDICT: OK
```
