# uav_drn: UAV-Assisted Cellular Networks for Disaster Recovery

Implementation for the *Wireless and Mobile Communication* case study, SRM Institute of Science and Technology, Kattankulathur.

**Team:** Sriram R, Sharvesha B, Aravind Srinivasan, Dharunesh V

## What it does

| Module | Contents |
|---|---|
| `uav_drn/channel.py` | Al-Hourani air-to-ground model (P_LoS, mean path loss), coverage radius R(h), optimal altitude h* |
| `uav_drn/scenario.py` | Seeded relief-camp user layouts (6 camps + scattered users, ~850 users in 4 × 4 km) |
| `uav_drn/placement.py` | Random, Grid, K-means, Greedy-MCP and the proposed **interference-aware Hybrid Greedy-PSO** |
| `uav_drn/network.py` | Link budget, best-server association, channel colouring (reuse 1/3), SINR, Shannon rate, Jain fairness |
| `uav_drn/energy.py` | Rotary-wing propulsion power (Zeng et al. 2019), on-station time, event-driven 24 h fleet rotation |
| `uav_drn/experiments.py` | Experiments E1–E6; writes CSV/JSON results and all figures |
| `simulator/index.html` | Interactive browser version: drag drones and watch coverage and SINR update |

## Run

```bash
pip install -r requirements.txt
python -m pytest -q tests                                  # 10 passed
python -m uav_drn.experiments --seeds 20 --out results     # ~11 min on one core
```

Open `simulator/index.html` in any browser for the live demo; it needs no installation.

## Headline results (20 scenarios, urban, 2 GHz, PL_max = 100 dB)

- Optimal elevation angles 20.34°, 42.44°, 54.62°, 75.52°: these match Al-Hourani et al. (2014). Urban h* = 646 m, R* = 707 m.
- With K = 6 UAVs (reuse 1), users served: Random 39.3%, Grid 68.4%, K-means 89.6%, Greedy-MCP 86.8%, **Hybrid 92.1%**.
- On a shared channel, Greedy-MCP falls from 86.8% (K = 6) to 78.8% (K = 10) because of interference. The hybrid rises to 96.0%.
- Capping the altitude at 120 m shrinks the urban radius to 292 m. Six drones then serve 60% of users instead of 91%.
- One sortie gives 41 min on station. Keeping 6 stations on air for 24 h needs 6 tethered drones, or 9 (battery swap) to 16 (recharge) battery drones.
