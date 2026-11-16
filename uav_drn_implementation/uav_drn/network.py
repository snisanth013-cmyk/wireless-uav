"""Link budget, association, frequency reuse, SINR and throughput."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .channel import mean_path_loss


@dataclass
class LinkConfig:
    fc: float = 2e9               # carrier frequency (Hz)
    pt_dbm: float = 20.0          # UAV small-cell transmit power
    g_tx_dbi: float = 3.0
    g_rx_dbi: float = 0.0
    losses_db: float = 3.0        # cable + body losses
    total_bw_hz: float = 15e6     # spectrum available to the aerial tier
    noise_figure_db: float = 7.0
    sinr_th_db: float = 0.0       # minimum SINR for service
    pl_max_db: float = 100.0      # max allowable path loss (incl. 15 dB fade margin)
    reuse: int = 1                # frequency-reuse factor (1 or 3)

    @property
    def eirp_dbm(self):
        return self.pt_dbm + self.g_tx_dbi + self.g_rx_dbi - self.losses_db


def assign_channels(uavs, reuse: int):
    """Greedy channel colouring: each UAV takes the channel whose nearest
    co-channel neighbour is farthest away."""
    K = len(uavs)
    if reuse <= 1:
        return np.zeros(K, int)
    ch = -np.ones(K, int)
    D = np.linalg.norm(uavs[:, None] - uavs[None], axis=2)
    for k in np.argsort(-D.sum(axis=1)):
        best, best_d = 0, -1.0
        for c in range(reuse):
            same = np.where(ch == c)[0]
            dmin = D[k, same].min() if len(same) else np.inf
            if dmin > best_d:
                best, best_d = c, dmin
        ch[k] = best
    return ch


def evaluate(users, uavs, h, env, cfg: LinkConfig = LinkConfig()):
    """Evaluate a placement. Returns per-user arrays and summary metrics."""
    r = np.linalg.norm(users[:, None, :] - uavs[None, :, :], axis=2)       # N x K
    pl = mean_path_loss(h, r, env, cfg.fc)
    prx_mw = 10 ** ((cfg.eirp_dbm - pl) / 10)
    serving = prx_mw.argmax(axis=1)
    idx = np.arange(len(users))
    ch = assign_channels(uavs, cfg.reuse)
    bw = cfg.total_bw_hz / max(cfg.reuse, 1)
    noise_mw = 10 ** ((-174 + 10 * np.log10(bw) + cfg.noise_figure_db) / 10)
    same_ch = ch[None, :] == ch[serving][:, None]                        # N x K
    signal = prx_mw[idx, serving]
    interf = (prx_mw * same_ch).sum(axis=1) - signal
    sinr = signal / (interf + noise_mw)
    sinr_db = 10 * np.log10(sinr)
    covered = (pl[idx, serving] <= cfg.pl_max_db) & (sinr_db >= cfg.sinr_th_db)
    load = np.bincount(serving[covered], minlength=len(uavs))
    rate = np.zeros(len(users))
    share = bw / np.maximum(load[serving[covered]], 1)
    rate[covered] = share * np.log2(1 + sinr[covered])                   # bit/s
    rc = rate[covered] / 1e6
    jain = (rc.sum() ** 2) / (len(rc) * (rc ** 2).sum()) if len(rc) else 0.0
    return {
        "sinr_db": sinr_db, "rate_mbps": rate / 1e6, "covered": covered, "serving": serving,
        "coverage_pct": 100 * covered.mean(),
        "mean_rate_mbps": float(rc.mean()) if len(rc) else 0.0,
        "edge_rate_mbps": float(np.percentile(rc, 5)) if len(rc) else 0.0,
        "sum_rate_mbps": float(rc.sum()),
        "jain": float(jain),
        "median_sinr_db": float(np.median(sinr_db)),
    }


def sinr_map(uavs, h, env, area, cfg: LinkConfig = LinkConfig(), n: int = 220):
    """Best-server SINR (dB) on an n x n grid, for heat-map plotting."""
    g = np.linspace(0, area, n)
    X, Y = np.meshgrid(g, g)
    pts = np.c_[X.ravel(), Y.ravel()]
    out = evaluate(pts, uavs, h, env, cfg)
    return g, out["sinr_db"].reshape(n, n), out["covered"].reshape(n, n)
