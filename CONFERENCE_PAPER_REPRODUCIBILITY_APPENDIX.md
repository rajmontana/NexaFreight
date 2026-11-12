# Reproducibility Appendix & Computational Benchmark Protocols
## Companion to: *"An Experimental Evaluation of Exact Multiobjective Shortest-Path Algorithms for Scheduled Multimodal Freight Networks"*

**Authors:** Raj Kumar Merugu, Shanmukh Dhyaneshwar Peela, R Rahul, Sanat Kumar Maurya  
**Faculty Guide:** Er. Mandeep Dhanda, Assistant Professor, Department of Mechanical Engineering (MED)  
**Institution:** Motilal Nehru National Institute of Technology (MNNIT) Allahabad  
**Public Repository:** [`https://github.com/rajmontana/NexaFreight`](https://github.com/rajmontana/NexaFreight)  
**Production Control Tower:** [`https://nexafreight.vercel.app/`](https://nexafreight.vercel.app/)  
**Audited Release Branch:** `main` / `hardening-final` (Commit: `2e05a2b` / `a9477f1`)  
**Companion Documents:** [**REPRODUCIBILITY_AND_DEPLOYMENT_GUIDE.md**](REPRODUCIBILITY_AND_DEPLOYMENT_GUIDE.md) · [**README.md**](README.md) · [**DEPLOYMENT.md**](DEPLOYMENT.md)

---

## 📌 Abstract & Purpose of this Appendix

This reproducibility appendix establishes the complete computational protocol required to independently execute, verify, and reproduce the experimental findings reported in the conference research paper:
> **"An Experimental Evaluation of Exact Multiobjective Shortest-Path Algorithms for Scheduled Multimodal Freight Networks"**  
> *(Presented at the Department of Mechanical Engineering, MNNIT Allahabad, November 12, 2026).*

The paper presents a controlled empirical comparison of three exact label-setting algorithms—**Martins (1984)**, **MDA (Maristany de las Casas et al. 2021)**, and **T-MDA (Maristany de las Casas et al. 2023)**—applied to a three-objective scheduled freight routing problem (minimizing financial cost, transit time, and $\text{CO}_2$ emissions).

Every runtime measurement, memory trace, pruning fraction, and Pareto frontier reported across the 90 benchmark instances (1,890 timed solver trials) can be reproduced exactly using the open-source NexaFreight repository.

---

## 🔬 Benchmark Methodology & Experimental Setup

### 1. Synthetic Network Topologies (90 Instances)
The benchmark suite evaluates three structurally distinct network families across multiple service scales $N$:
- **Family A (Sparse Layered):** Sequential transit corridors with predominantly forward timetable connections and moderate parallelism ($N \in \{12, 24, 48, 72, 96, 144\}$).
- **Family B (Dense Hub):** High-connectivity hub-and-spoke networks with multiple parallel services per corridor ($N \in \{12, 24, 48, 72, 96, 144\}$).
- **Family C (High Conflict):** Networks engineered with antagonistic modal trade-offs to maximize Pareto frontier width ($N \in \{12, 24, 48, 72, 96, 144\}$).
- **Instance Count:** 72 primary instances (3 families × 4 scales {12, 24, 48, 72} × 6 seeds) + 18 scale-extension instances (3 families × 2 scales {96, 144} × 3 seeds) = **90 instances total**.

### 2. Experimental Measurement Protocol
- **Process Isolation:** Each solver-instance trial is timed in a dedicated Python execution context with explicit garbage collection (`gc.collect()`).
- **Timing Protocol:** 2 discarded warm-up runs followed by 7 measured repetitions per solver per instance ($90 \times 7 \times 3 = \mathbf{1,890\text{ timed solver trials}}$).
- **High-Resolution Timer:** `time.perf_counter_ns` ($10^{-7}\text{ s}$ resolution).
- **Memory Tracing:** Peak heap memory tracked using Python's standard `tracemalloc` module in isolated execution passes (270 memory measurements).
- **Statistics:** Geometric means for grouped metrics; 95% bootstrap confidence intervals computed via 10,000 deterministic resamples.

---

## 🛠️ Step-by-Step Reproduction Guide

To run the exact research paper benchmark suite on your local desktop:

### 1. Clone & Environment Setup
Follow the standard reproduction setup detailed in [**DEPLOYMENT.md**](DEPLOYMENT.md):

```bash
# Clone the repository
git clone https://github.com/rajmontana/NexaFreight.git
cd NexaFreight
git checkout hardening-final

# Setup Backend Virtual Environment
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

---

### 2. Running Correctness Validation (Tier 1, Tier 2, Tier 3)

The paper enforces a three-tier correctness validation protocol:
- **Tier 1 (Ground Truth):** Exhaustive DFS path enumeration oracle (exact tolerance $\varepsilon = 0$) on 36 small instances ($N \le 24$).
- **Tier 2 (Cross-Solver):** Pairwise Pareto frontier cross-agreement among all three solvers (Martins, MDA, T-MDA) across all 90 instances.
- **Tier 3 (Structural Invariants):** Physical time invariant ($c_2(p) = \tau^{\text{arr}} - \tau_0$) and dwell feasibility ($d^{\min} \le \Delta\tau \le d^{\max}$) validation on all reconstructed itineraries.

Execute the automated verification:
```bash
# Run unit and oracle tests for route planners
pytest tests/unit/test_planner.py tests/unit/test_planner_oracle.py -v
```
*Expected Outcome:* 100% agreement across all instances, confirming zero-tolerance componentwise Pareto dominance.

---

### 3. Running the Comprehensive 90-Instance Benchmark Suite

Execute the automated multi-objective benchmark runner:

```bash
# Execute benchmark harness across synthetic families A, B, and C
python scripts/30_benchmark_planner_baselines.py --repetitions 7 --scales 12,24,48,72,96,144

# Alternatively, benchmark graph caching & preprocessing amortization:
python scripts/28_benchmark_graph_cache.py
```

#### Benchmark Output Files:
The harness saves raw execution telemetry to:
- `evidence_v2/runs/mosp_benchmark_raw.csv` (1,890 trial rows: solver, family, N, seed, prep_ms, search_ms, total_ms, labels_explored, peak_queue)
- `evidence_v2/runs/mosp_memory_trace.csv` (270 peak heap allocations via `tracemalloc`)
- `evidence_v2/runs/mosp_pareto_frontiers.json` (Bit-for-bit Pareto frontier coordinates for all 90 instances)

---

### 4. Reproducing the Pareto Frontier Visualizations

To reproduce Figure 7 from the paper (the 3D Pareto frontier and 2D projections for instance `SYN_FAMA_N72_S821` with $|\mathcal{P}^*| = 29$ non-dominated solutions):

```bash
# Generate 3D scatter and 2D projection plots
python scripts/generate_pareto_figures.py --instance SYN_FAMA_N72_S821
```
The figures will be output as high-resolution PNGs in `evidence_v2/figures/pareto_frontier_SYN_FAMA_N72_S821.png`.

---

### 5. Numerical Stability & Floating-Point Non-Monotonicity Verification

T-MDA's theoretical invariant (Lemma 3 of Maristany de las Casas et al. 2021) guarantees that queue extractions are non-decreasing in reweighted cost $\bar{\mathbf{c}}(p)$. Under IEEE-754 binary64 floating-point arithmetic, non-associativity of addition produces $\pm 1$ Units in the Last Place (ULP) discrepancies:

```bash
# Verify the 331 floating-point inversions via Python's exact fractions.Fraction
python scripts/verify_tmda_numerical_stability.py
```
*Key Measurements Verified:*
- Total queue extractions: 7,463
- Tolerated inversions: 331 (4.44%)
- Maximum absolute inversion: $1.137 \times 10^{-13}$ ($\approx 2 \times \text{ULP}$)
- Maximum relative inversion: $2.501 \times 10^{-16}$ ($\approx \varepsilon_{\text{mach}}$)
- Impact on final Pareto frontier: **Zero** in all 90 instances.

---

## 🔗 Cross-References & Full-Stack Deployment

The exact MOSP algorithms evaluated in this paper form the core algorithmic foundation of the **NexaFreight Autonomous Logistics Control Tower**. While the research paper focuses on controlled benchmark comparisons over synthetic timetable networks, the production platform deploys these mathematical principles into a real-time, interactive decision-support system:

- **For Full Technical Systems Architecture & Audit Report:**  
  See [**Detailed_Project_Report_NexaFreight.pdf**](Detailed_Project_Report_NexaFreight.pdf) (51-page master engineering report).
- **For Step-by-Step Desktop Reproduction & Production Cloud Deployment:**  
  See [**DEPLOYMENT.md**](DEPLOYMENT.md) (Complete runbook for local and cloud deployment on Vercel + Render + Neon PostgreSQL).
- **For Project Repository & Source Code:**  
  See [**README.md**](README.md) and [`https://github.com/rajmontana/NexaFreight`](https://github.com/rajmontana/NexaFreight).
- **For Live Cloud System Demonstration:**  
  Visit [`https://nexafreight.vercel.app/`](https://nexafreight.vercel.app/).

---
*MNNIT Allahabad · Department of Mechanical Engineering · Capstone Defense & Research Benchmark · November 12, 2026*
