"""Horizontal placement strategies for K UAV base stations.

All strategies return an array of shape (K, 2) of UAV ground positions (m).
R is the per-UAV coverage radius from the channel model at the chosen altitude.
"""
from __future__ import annotations

import numpy as np
from sklearn.cluster import KMeans


def covered_count(users, uavs, R):
    d = np.linalg.norm(users[:, None, :] - uavs[None, :, :], axis=2)
    return int((d.min(axis=1) <= R).sum())


def random_placement(users, K, R, area, rng):
    """Baseline 1 — uniform random positions."""
    return rng.uniform(0, area, size=(K, 2))


def grid_placement(users, K, R, area, rng=None):
    """Baseline 2 — demand-blind regular grid (what a planner does with no user data)."""
    cols = int(np.ceil(np.sqrt(K)))
    rows = int(np.ceil(K / cols))
    xs = (np.arange(cols) + 0.5) * area / cols
    ys = (np.arange(rows) + 0.5) * area / rows
    pts = np.array([(x, y) for y in ys for x in xs])
    return pts[:K]


def kmeans_placement(users, K, R, area=None, rng=None, seed=0):
    """Baseline 3 — k-means centroids of user positions (minimises squared distance)."""
    return KMeans(n_clusters=K, n_init=10, random_state=seed).fit(users).cluster_centers_


def greedy_mcp(users, K, R, area, rng=None, step: float = 100.0, refine: bool = True):
    """Greedy Maximum-Coverage Placement on a candidate grid, with local refinement.

    Each step places a UAV at the candidate that covers the most still-uncovered
    users — the classic (1 - 1/e)-approximation for maximum coverage. Each UAV is
    then nudged to the centroid of its own covered users while coverage does not drop.
    """
    g = np.arange(step / 2, area, step)
    cand = np.array([(x, y) for x in g for y in g])
    within = np.linalg.norm(users[:, None, :] - cand[None, :, :], axis=2) <= R  # N x C
    uncovered = np.ones(len(users), bool)
    chosen = []
    for _ in range(K):
        gain = (within & uncovered[:, None]).sum(axis=0)
        j = int(gain.argmax())
        chosen.append(cand[j])
        uncovered &= ~within[:, j]
    uavs = np.array(chosen, float)
    if refine:
        for _ in range(5):
            for k in range(K):
                d = np.linalg.norm(users - uavs[k], axis=1)
                mine = d <= R
                if mine.sum() == 0:
                    continue
                trial = uavs.copy()
                trial[k] = users[mine].mean(axis=0)
                if covered_count(users, trial, R) >= covered_count(users, uavs, R):
                    uavs = trial
    return uavs


def pso_placement(users, K, R, area, rng, seeds=(), n_particles: int = 40,
                  iters: int = 100, w: float = 0.72, c1: float = 1.49, c2: float = 1.49,
                  fitness=None):
    """Particle Swarm Optimisation of all K positions jointly.

    Fitness = number of covered users + a small smooth tie-breaker that rewards
    users sitting closer to their nearest UAV (helps SINR and escapes plateaus).
    `seeds` are full solutions (K x 2) injected into the initial swarm.
    """
    N = len(users)
    X = rng.uniform(0, area, size=(n_particles, K, 2))
    for i, s in enumerate(seeds):
        X[i] = s
    V = rng.normal(0, area * 0.02, size=X.shape)

    def geometric_fitness(P):
        d = np.linalg.norm(users[None, :, None, :] - P[:, None, :, :], axis=3).min(axis=2)  # P x N
        return (d <= R).sum(axis=1) + 0.5 * np.exp(-d / max(R, 1.0)).sum(axis=1) / N

    fitness = fitness or geometric_fitness

    f = fitness(X)
    pbest, pbest_f = X.copy(), f.copy()
    g = int(f.argmax())
    gbest, gbest_f = X[g].copy(), f[g]
    for _ in range(iters):
        r1, r2 = rng.random(X.shape), rng.random(X.shape)
        V = w * V + c1 * r1 * (pbest - X) + c2 * r2 * (gbest[None] - X)
        V = np.clip(V, -0.1 * area, 0.1 * area)
        X = np.clip(X + V, 0, area)
        f = fitness(X)
        better = f > pbest_f
        pbest[better], pbest_f[better] = X[better], f[better]
        g = int(pbest_f.argmax())
        if pbest_f[g] > gbest_f:
            gbest, gbest_f = pbest[g].copy(), pbest_f[g]
    return gbest


def sinr_fitness(users, h, env, cfg):
    """Interference-aware fitness: users actually served (PL and SINR both OK),
    plus a small tie-breaker on mean SINR. Evaluated for a whole swarm at once."""
    from .channel import mean_path_loss
    from .network import assign_channels
    bw = cfg.total_bw_hz / max(cfg.reuse, 1)
    noise_mw = 10 ** ((-174 + 10 * np.log10(bw) + cfg.noise_figure_db) / 10)

    def f(P):                                                       # P: (n, K, 2)
        r = np.linalg.norm(users[None, :, None, :] - P[:, None, :, :], axis=3)   # n x N x K
        pl = mean_path_loss(h, r, env, cfg.fc)
        prx = 10 ** ((cfg.eirp_dbm - pl) / 10)
        s = prx.argmax(axis=2)
        sig = np.take_along_axis(prx, s[..., None], 2)[..., 0]
        pls = np.take_along_axis(pl, s[..., None], 2)[..., 0]
        if cfg.reuse <= 1:
            interf = prx.sum(axis=2) - sig
        else:
            chs = np.stack([assign_channels(p, cfg.reuse) for p in P])                # n x K
            same = chs[:, None, :] == np.take_along_axis(chs, s, 1)[..., None]       # n x N x K
            interf = (prx * same).sum(axis=2) - sig
        sinr_db = 10 * np.log10(sig / (interf + noise_mw))
        served = (pls <= cfg.pl_max_db) & (sinr_db >= cfg.sinr_th_db)
        return served.sum(axis=1) + 0.5 * np.clip(sinr_db, -10, 30).mean(axis=1) / 30
    return f


def hybrid_greedy_pso(users, K, R, area, rng, ctx=None):
    """Proposed — interference-aware PSO, warm-started with greedy-MCP and k-means.

    The swarm starts from the greedy and k-means solutions (plus random particles)
    and PSO keeps its global best, so the result is never worse than either seed
    on the objective. With ctx = (h, env, LinkConfig) the objective is the number
    of users whose SINR clears the service threshold, so the optimiser spreads
    co-channel UAVs apart instead of only chasing geometric coverage.
    """
    seeds = [greedy_mcp(users, K, R, area), kmeans_placement(users, K, R)]
    fit = sinr_fitness(users, *ctx) if ctx is not None else None
    return pso_placement(users, K, R, area, rng, seeds=seeds, fitness=fit)


ALGORITHMS = {
    "Random": random_placement,
    "Grid": grid_placement,
    "K-means": kmeans_placement,
    "Greedy-MCP": greedy_mcp,
    "Hybrid Greedy-PSO": hybrid_greedy_pso,
}
