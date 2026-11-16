"""Air-to-ground (A2G) channel model for low-altitude platforms.

Implements the probabilistic LoS/NLoS model of
  A. Al-Hourani, S. Kandeepan, S. Lardner, "Optimal LAP altitude for maximum
  coverage," IEEE Wireless Communications Letters, 3(6), 2014.

    P_LoS(theta) = 1 / (1 + a * exp(-b * (theta - a)))          theta in degrees
    PL(h, r)     = FSPL(d) + P_LoS * eta_LoS + (1 - P_LoS) * eta_NLoS
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import brentq, minimize_scalar

C = 299_792_458.0  # speed of light, m/s

# S-curve and excess-loss parameters (2 GHz) for the four ITU-R environments.
ENVIRONMENTS: dict[str, dict[str, float]] = {
    "suburban":       {"a": 4.88,  "b": 0.43, "eta_los": 0.1, "eta_nlos": 21.0},
    "urban":          {"a": 9.61,  "b": 0.16, "eta_los": 1.0, "eta_nlos": 20.0},
    "dense_urban":    {"a": 12.08, "b": 0.11, "eta_los": 1.6, "eta_nlos": 23.0},
    "highrise_urban": {"a": 27.23, "b": 0.08, "eta_los": 2.3, "eta_nlos": 34.0},
}
LABELS = {"suburban": "Suburban", "urban": "Urban",
          "dense_urban": "Dense urban", "highrise_urban": "High-rise urban"}


def elevation_deg(h, r):
    """Elevation angle (degrees) of a UAV at altitude h seen from ground distance r."""
    return np.degrees(np.arctan2(h, r))


def p_los(theta_deg, env: str):
    """Probability of line-of-sight for elevation angle theta (degrees)."""
    p = ENVIRONMENTS[env]
    return 1.0 / (1.0 + p["a"] * np.exp(-p["b"] * (np.asarray(theta_deg) - p["a"])))


def fspl_db(d, fc: float):
    """Free-space path loss (dB) over distance d (m) at carrier frequency fc (Hz)."""
    return 20.0 * np.log10(4.0 * np.pi * fc * np.maximum(d, 1e-3) / C)


def mean_path_loss(h, r, env: str, fc: float = 2e9):
    """Mean A2G path loss (dB) for altitude h and horizontal distance r (broadcastable)."""
    h = np.asarray(h, float)
    r = np.asarray(r, float)
    p = ENVIRONMENTS[env]
    d = np.sqrt(h ** 2 + r ** 2)
    pl = p_los(elevation_deg(h, r), env)
    return fspl_db(d, fc) + pl * p["eta_los"] + (1.0 - pl) * p["eta_nlos"]


def coverage_radius(h: float, env: str, pl_max: float, fc: float = 2e9) -> float:
    """Largest ground radius R with mean path loss <= pl_max (0 if even r=0 fails)."""
    f = lambda r: float(mean_path_loss(h, r, env, fc)) - pl_max
    if f(0.0) > 0:
        return 0.0
    hi = 10.0
    while f(hi) < 0 and hi < 1e6:
        hi *= 2.0
    return float(brentq(f, 0.0, hi, xtol=1e-3))


def optimal_altitude(env: str, pl_max: float, fc: float = 2e9, h_max: float = 5000.0):
    """Altitude h* maximising coverage radius. Returns (h*, R*, theta*).

    R(h) is zero above some altitude, so a coarse scan first brackets the peak
    and a bounded scalar search then refines it.
    """
    hs = np.geomspace(1.0, h_max, 400)
    Rs = np.array([coverage_radius(h, env, pl_max, fc) for h in hs])
    i = int(Rs.argmax())
    lo, hi = hs[max(i - 1, 0)], hs[min(i + 1, len(hs) - 1)]
    res = minimize_scalar(lambda h: -coverage_radius(h, env, pl_max, fc),
                          bounds=(lo, hi), method="bounded", options={"xatol": 0.01})
    h = float(res.x)
    R = coverage_radius(h, env, pl_max, fc)
    return h, R, float(elevation_deg(h, R))
