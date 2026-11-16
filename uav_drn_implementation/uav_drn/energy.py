"""Rotary-wing UAV energy model and fleet-rotation (battery-swap) simulation.

Propulsion power from Y. Zeng, J. Xu, R. Zhang, "Energy minimization for
wireless communication with rotary-wing UAV," IEEE Trans. Wireless Commun., 2019:

  P(V) = P0 (1 + 3V^2/U_tip^2) + Pi ( sqrt(1 + V^4/(4 v0^4)) - V^2/(2 v0^2) )^(1/2)
         + 1/2 d0 rho s A V^3
"""
from __future__ import annotations

import heapq
from dataclasses import dataclass

import numpy as np


@dataclass
class RotaryWing:
    P0: float = 79.86      # blade profile power in hover (W)
    Pi: float = 88.63      # induced power in hover (W)
    U_tip: float = 120.0   # rotor tip speed (m/s)
    v0: float = 4.03       # mean induced velocity in hover (m/s)
    d0: float = 0.6        # fuselage drag ratio
    rho: float = 1.225     # air density (kg/m^3)
    s: float = 0.05        # rotor solidity
    A: float = 0.503       # rotor disc area (m^2)


def propulsion_power(V, p: RotaryWing = RotaryWing()):
    V = np.asarray(V, float)
    blade = p.P0 * (1 + 3 * V ** 2 / p.U_tip ** 2)
    induced = p.Pi * np.sqrt(np.sqrt(1 + V ** 4 / (4 * p.v0 ** 4)) - V ** 2 / (2 * p.v0 ** 2))
    parasite = 0.5 * p.d0 * p.rho * p.s * p.A * V ** 3
    return blade + induced + parasite


@dataclass
class Mission:
    battery_wh: float = 200.0      # pack energy
    usable: float = 0.8            # usable fraction (20 % reserve)
    payload_w: float = 40.0        # small-cell radio + backhaul modem
    transit_min: float = 4.0       # depot <-> station, one way
    cruise_ms: float = 10.0        # transit speed

    def on_station_min(self, p: RotaryWing = RotaryWing()):
        e = self.battery_wh * self.usable * 60.0                      # W·min
        e_transit = 2 * self.transit_min * float(propulsion_power(self.cruise_ms, p))
        p_hover = float(propulsion_power(0.0, p)) + self.payload_w
        return max(e - e_transit, 0.0) / p_hover


def simulate_rotation(K: int, fleet: int, mission: Mission, turnaround_min: float,
                      horizon_h: float = 24.0):
    """Event-driven simulation of K coverage slots served by `fleet` drones.

    A relief drone departs `transit` minutes before the on-station drone must
    leave, so hand-over is seamless when a charged drone is waiting. Returning
    drones are ready again after transit + turnaround (battery swap or recharge).
    Returns availability = fraction of slot-time with a drone on station.
    """
    if fleet < K:
        return 0.0
    T_on = mission.on_station_min()
    tr = mission.transit_min
    H = horizon_h * 60.0
    ready = [0.0] * (fleet - K)                 # depot drones, time they are ready
    heapq.heapify(ready)
    # staggered launch: slot k's first drone leaves after (k+1)/K of a sortie,
    # so reliefs are spread out instead of all being due at the same moment
    leave = [(T_on * (k + 1) / K, k) for k in range(K)]
    heapq.heapify(leave)
    gap = 0.0
    while leave:
        t_leave, k = heapq.heappop(leave)
        if t_leave >= H:
            continue
        heapq.heappush(ready, t_leave + tr + turnaround_min)   # outgoing drone recycles
        r = heapq.heappop(ready)
        arrive = max(r, t_leave - tr) + tr
        gap += max(0.0, min(arrive, H) - t_leave)
        heapq.heappush(leave, (arrive + T_on, k))
    return 1.0 - gap / (K * H)


def required_fleet(K: int, mission: Mission, turnaround_min: float):
    """Analytic fleet size for continuous coverage: K * ceil-ish(cycle / T_on)."""
    T_on = mission.on_station_min()
    cycle = T_on + 2 * mission.transit_min + turnaround_min
    return int(np.ceil(K * cycle / T_on))
