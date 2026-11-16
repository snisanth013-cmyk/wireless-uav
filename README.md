# UAV-Assisted Cellular Networks for Disaster Recovery (UAV-DRN)

An interactive, research-grade web simulation platform for deploying unmanned aerial vehicles (UAVs) as temporary flying cellular base stations in disaster-affected areas where terrestrial telecom infrastructure is damaged or destroyed.

Developed for the **Wireless and Mobile Communication** case study at **SRM Institute of Science and Technology**, Kattankulathur.

- **Student Researchers:** Sriram R, Sharvesha B, Aravind Srinivasan, Dharunesh V

---

## Architecture Overview

```
                                      ┌────────────────────────────────────────────────┐
                                      │   React 18 + Vite + Tailwind CSS + Recharts    │
                                      │  (Overview, Map, Deployment, Energy, Defense)  │
                                      └───────────────────────┬────────────────────────┘
                                                              │ JSON REST API
                                                              ▼
                                      ┌────────────────────────────────────────────────┐
                                      │        Flask REST API Backend (:5000)          │
                                      │             (backend/app.py)                   │
                                      └───────────────────────┬────────────────────────┘
                                                              │
                                      ┌───────────────────────┴────────────────────────┐
                                      │      UAV-DRN Core Python Simulation Engine     │
                                      ├────────────────────────────────────────────────┤
                                      │ • channel.py    : Al-Hourani A2G LoS/Path Loss │
                                      │ • scenario.py   : Relief Camps & Survivors     │
                                      │ • placement.py  : 5 Alg Swarm Optimizations    │
                                      │ • network.py    : SINR, Shannon Rates, Jain    │
                                      │ • energy.py     : Zeng Propulsion & 24h Fleet  │
                                      │ • experiments.py: 20-Seed Monte-Carlo E1-E6    │
                                      └────────────────────────────────────────────────┘
```

---

## Key Modules & Implementation Details

### Module 1: Disaster Area Simulation
- Generates a configurable geographical disaster recovery zone ($4 \times 4\text{ km} = 16\text{ km}^2$).
- Synthesizes 6 distinct relief camps (minimum separation distance $\ge 700\text{ m}$) with Gaussian population clustering ($\sigma = 190\text{ m}$).
- Simulates ~850 target survivors (clustered survivors + scattered stragglers).
- Dual visualization: High-performance 2D Canvas with real-time drag-and-drop and Leaflet GIS satellite map view.

### Module 2: UAV Deployment Strategies
Implements and benchmarks 5 placement algorithms:
1. **Random Placement:** Baseline uniform random distribution.
2. **Grid Placement:** Demand-blind geometric grid partitioning.
3. **K-Means Clustering:** Minimizes Euclidean squared distance to survivor clusters.
4. **Greedy Maximum Coverage Placement (Greedy-MCP):** $(1 - 1/e)$ approximation maximizing covered users with centroid refinement.
5. **Proposed Hybrid Greedy-PSO Algorithm:** Seeds particle swarm optimization with Greedy-MCP and K-Means, running an interference-aware SINR fitness function to prevent co-channel clustering.

### Module 3: Wireless Communication Analysis
- Implements the **Al-Hourani et al. (IEEE WCL 2014)** Air-to-Ground (A2G) channel model:
  $$P_{\text{LoS}}(\theta) = \frac{1}{1 + a \exp(-b(\theta - a))}$$
  $$\text{PL}(h, r) = \text{FSPL}(d) + P_{\text{LoS}} \eta_{\text{LoS}} + (1 - P_{\text{LoS}}) \eta_{\text{NLoS}}$$
- Interactive ITU-R environment profiles: Suburban ($a=4.88, b=0.43$), Urban ($a=9.61, b=0.16$), Dense Urban ($a=12.08, b=0.11$), and High-Rise Urban ($a=27.23, b=0.08$).
- Optimal altitude derivation ($h^* = 646\text{ m}, R^* = 707\text{ m}, \theta^* = 42.44^\circ$ for Urban).
- 120m regulatory cap evaluation (quantifies an 82.9% coverage area penalty).

### Module 4: Coverage Analysis & Color Legend
- Dual-condition verification: $\text{PL} \le 100\text{ dB}$ **AND** $\text{SINR} \ge 0\text{ dB}$.
- Map color schema:
  - **Green:** Covered users meeting link budget and SINR thresholds.
  - **Red:** Uncovered users / out of service.
  - **Blue:** UAV base stations with dashed coverage radius rings ($R$).
  - **Yellow:** Relief camps with population capacity badges.
- Individual user-to-UAV association rays and per-drone load balancing tables.
- Jain's Fairness Index computation:
  $$J = \frac{(\sum_{i=1}^N R_i)^2}{N \sum_{i=1}^N R_i^2}$$

### Module 5: Interference Management
- **Frequency Reuse 1:** Universal reuse ($15\text{ MHz}$ per UAV).
- **Frequency Reuse 3:** Orthogonal 3-channel coloring ($5\text{ MHz}$ per UAV).
- Demonstrates how Reuse 3 increases median SINR by $+12.3\text{ dB}$ (from $8.8\text{ dB}$ to $21.2\text{ dB}$) and elevates 5th-percentile edge user connection quality.

### Module 6: Energy Management & 24-Hour Fleet Rotation
- Rotary-wing aerodynamic propulsion model (**Y. Zeng et al., IEEE TWC 2019**):
  $$P(V) = P_0\left(1 + \frac{3V^2}{U_{\text{tip}}^2}\right) + P_i\left(\sqrt{1 + \frac{V^4}{4v_0^4}} - \frac{V^2}{2v_0^2}\right)^{1/2} + \frac{1}{2} d_0 \rho s A V^3$$
- Hover propulsion power $P_0 + P_i = 79.86\text{ W} + 88.63\text{ W} = 168.49\text{ W}$.
- With $40\text{ W}$ communications payload, total power is $208.49\text{ W}$.
- Standard $200\text{ Wh}$ battery pack ($80\%$ usable) yields $41.2\text{ min}$ on station.
- 24-hour continuous fleet availability:
  - **Battery Swap (10 min turnaround):** 9 UAVs required for 6 active stations.
  - **Battery Recharge (60 min turnaround):** 16 UAVs required for 6 active stations.
  - **Tethered UAVs:** 6 UAVs required (unlimited continuous ground power).

---

## How to Run

### Method 1: One-Click Launch (Recommended)
Double-click `run_project.bat` or run:
```bat
run_project.bat
```
This automatically starts the Flask simulation server and opens `http://127.0.0.1:5000` in your web browser.

### Method 2: Development Mode (Hot-Reload)
Run:
```bat
run_dev.bat
```
- Backend API runs on: `http://127.0.0.1:5000`
- Frontend Vite Dev Server runs on: `http://localhost:5173`

### Method 3: Manual Execution
```bash
# Terminal 1: Run Flask Backend
set PYTHONPATH=%cd%\uav_drn_implementation;%PYTHONPATH%
python backend/app.py

# Terminal 2 (Optional for frontend dev):
cd frontend
npm run dev
```

---

## Unit Testing
To run the automated mathematical test suite (10 test cases):
```bash
set PYTHONPATH=%cd%\uav_drn_implementation;%PYTHONPATH%
python -m pytest -q uav_drn_implementation/tests
```
All 10 tests verify LoS monotonicity, Al-Hourani elevation angle convergence, hover aerodynamics, hybrid PSO monotonicity, network evaluation metrics, and Markov fleet rotations.
