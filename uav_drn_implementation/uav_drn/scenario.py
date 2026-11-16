"""Synthetic post-disaster user distributions."""
from __future__ import annotations

import numpy as np


def relief_camp_scenario(seed: int, area: float = 4000.0, n_camps: int = 6,
                         camp_size=(70, 160), sigma: float = 190.0,
                         n_scattered: int = 160, min_sep: float = 700.0):
    """Users clustered around relief camps plus uniformly scattered stragglers.

    Returns (users[N,2], camps[n_camps,2]) in metres inside [0, area]^2.
    Camp centres are drawn with a minimum separation so clusters stay distinct.
    """
    rng = np.random.default_rng(seed)
    camps = []
    while len(camps) < n_camps:
        c = rng.uniform(400, area - 400, size=2)
        if all(np.linalg.norm(c - q) >= min_sep for q in camps):
            camps.append(c)
    camps = np.array(camps)
    sizes = rng.integers(camp_size[0], camp_size[1] + 1, size=n_camps)
    clusters = [rng.normal(c, sigma, size=(n, 2)) for c, n in zip(camps, sizes)]
    scattered = rng.uniform(0, area, size=(n_scattered, 2))
    users = np.clip(np.vstack(clusters + [scattered]), 0, area)
    return users, camps
