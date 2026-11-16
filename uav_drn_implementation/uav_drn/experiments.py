"""Run every experiment and write figures + CSV/JSON results.

    python -m uav_drn.experiments --seeds 20 --out results
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd

from . import channel as ch
from .energy import Mission, RotaryWing, propulsion_power, required_fleet, simulate_rotation
from .network import LinkConfig, evaluate, sinr_map
from .placement import ALGORITHMS
from .plotstyle import ALG_COLORS, ENV_COLORS, GREY, NAVY, ORANGE, RED, TEAL, plt
from .scenario import relief_camp_scenario

AREA = 4000.0
ENV = "urban"


def run_placement(name, users, K, R, seed, h=None, cfg=None):
    rng = np.random.default_rng(1000 + seed)
    fn = ALGORITHMS[name]
    t0 = time.perf_counter()
    if name == "Hybrid Greedy-PSO" and h is not None:
        uavs = fn(users, K, R, AREA, rng, ctx=(h, ENV, cfg))
    else:
        uavs = fn(users, K, R, AREA, rng)
    return np.asarray(uavs, float), time.perf_counter() - t0


def e1_altitude(out, cfg):
    rows = []
    for env in ch.ENVIRONMENTS:
        h, R, th = ch.optimal_altitude(env, cfg.pl_max_db, cfg.fc)
        R120 = ch.coverage_radius(120.0, env, cfg.pl_max_db, cfg.fc)
        rows.append(dict(environment=ch.LABELS[env], h_opt_m=h, R_opt_m=R, theta_opt_deg=th,
                         R_at_120m=R120, area_loss_pct=100 * (1 - (R120 / R) ** 2)))
    df = pd.DataFrame(rows)
    df.to_csv(out / "e1_optimal_altitude.csv", index=False)
    # sensitivity of theta* to PL_max (the "property of the city" claim)
    sens = []
    for pl in (95, 100, 105, 110, 115):
        for env in ch.ENVIRONMENTS:
            sens.append(dict(pl_max=pl, environment=ch.LABELS[env],
                             theta=ch.optimal_altitude(env, pl, cfg.fc)[2]))
    pd.DataFrame(sens).to_csv(out / "e1_theta_sensitivity.csv", index=False)

    hs = np.linspace(10, 1500, 300)
    fig, ax = plt.subplots(figsize=(7.2, 3.5))
    ax.axvspan(0, 120, color=GREY, alpha=0.15)
    ax.text(12, 0.05, "≤120 m\nregulated", fontsize=8.5, color="#52606D")
    for env in ch.ENVIRONMENTS:
        R = [ch.coverage_radius(h, env, cfg.pl_max_db, cfg.fc) / 1000 for h in hs]
        ax.plot(hs, R, lw=2.3, color=ENV_COLORS[env], label=ch.LABELS[env])
        r = df[df.environment == ch.LABELS[env]].iloc[0]
        ax.plot(r.h_opt_m, r.R_opt_m / 1000, "o", color=ENV_COLORS[env], mfc="white", mew=2, ms=7)
    ax.set_xlabel("UAV altitude h (m)"); ax.set_ylabel("Coverage radius R (km)")
    ax.set_title(f"E1 · Coverage radius vs altitude (2 GHz, PL_max = {cfg.pl_max_db:.0f} dB)")
    ax.legend(); ax.set_xlim(0, 1500); ax.set_ylim(0, None)
    fig.tight_layout(); fig.savefig(out / "fig_e1_radius_altitude.png"); plt.close(fig)
    return df


def e2_algorithms(out, cfg, seeds, h, R, K=6):
    rows = []
    for s in range(seeds):
        users, _ = relief_camp_scenario(s)
        for name in ALGORITHMS:
            uavs, dt = run_placement(name, users, K, R, s, h, cfg)
            m = evaluate(users, uavs, h, ENV, cfg)
            rows.append(dict(seed=s, algorithm=name, runtime_s=dt, n_users=len(users),
                             **{k: m[k] for k in ("coverage_pct", "mean_rate_mbps", "edge_rate_mbps",
                                                  "sum_rate_mbps", "jain", "median_sinr_db")}))
    df = pd.DataFrame(rows)
    df.to_csv(out / "e2_algorithms_raw.csv", index=False)
    summ = df.groupby("algorithm", sort=False).agg(["mean", "std"])
    summ.columns = [f"{a}_{b}" for a, b in summ.columns]
    summ = summ.drop(columns=[c for c in summ.columns if c.startswith("seed")]).reset_index()
    summ.to_csv(out / "e2_algorithms_summary.csv", index=False)
    plot_e2(out, summ, seeds, K)
    return summ


def plot_e2(out, summ, seeds, K=6):
    fig, axs = plt.subplots(1, 3, figsize=(10, 3.4))
    names = list(ALGORITHMS)
    for ax, (col, lab) in zip(axs, [("coverage_pct", "Users covered (%)"),
                                     ("sum_rate_mbps", "Sum throughput (Mbps)"),
                                     ("median_sinr_db", "Median SINR, all users (dB)")]):
        mu = [summ.loc[summ.algorithm == n, f"{col}_mean"].item() for n in names]
        sd = [summ.loc[summ.algorithm == n, f"{col}_std"].item() for n in names]
        ax.bar(range(len(names)), mu, yerr=sd, capsize=3, color=[ALG_COLORS[n] for n in names], width=0.7)
        for i, v in enumerate(mu):
            ax.text(i, v + (max(mu) * 0.03) + sd[i], f"{v:.1f}" if abs(v) < 100 else f"{v:.0f}",
                    ha="center", fontsize=8.5)
        ax.set_xticks(range(len(names)))
        ax.set_xticklabels([n.replace("Hybrid ", "Hybrid\n").replace("Greedy-MCP", "Greedy\nMCP") for n in names], fontsize=8.5)
        ax.set_title(lab, fontsize=11)
    fig.suptitle(f"E2 · Placement strategies, K = {K} UAVs, urban, {seeds} random scenarios (mean ± std)",
                 x=0.01, ha="left", fontsize=12, fontweight="bold", color=NAVY)
    fig.tight_layout(); fig.savefig(out / "fig_e2_algorithms.png"); plt.close(fig)


def e3_fleet(out, cfg, seeds, h, R, Ks=range(1, 11)):
    cfg3 = LinkConfig(reuse=3)
    rows = []
    for s in range(seeds):
        users, _ = relief_camp_scenario(s)
        for K in Ks:
            for name in ALGORITHMS:
                uavs, _ = run_placement(name, users, K, R, s, h, cfg3)
                rows.append(dict(seed=s, K=K, algorithm=name,
                                 coverage_pct=evaluate(users, uavs, h, ENV, cfg3)["coverage_pct"]))
            for name, lab in (("Hybrid Greedy-PSO", "Hybrid, reuse 1"), ("Greedy-MCP", "Greedy-MCP, reuse 1")):
                uavs, _ = run_placement(name, users, K, R, s, h, cfg)
                rows.append(dict(seed=s, K=K, algorithm=lab,
                                 coverage_pct=evaluate(users, uavs, h, ENV, cfg)["coverage_pct"]))
    df = pd.DataFrame(rows); df.to_csv(out / "e3_coverage_vs_K.csv", index=False)
    return plot_e3(out, df)


def plot_e3(out, df):
    g = df.groupby(["algorithm", "K"]).coverage_pct.agg(["mean", "std"]).reset_index()
    fig, ax = plt.subplots(figsize=(7.2, 3.8))
    for lab, col in (("Greedy-MCP, reuse 1", RED), ("Hybrid, reuse 1", "#9B2C2C")):
        d = g[g.algorithm == lab]
        ax.plot(d.K, d["mean"], ls="--" if "Greedy" in lab else ":", lw=2, color=col, label=lab)
    for name in ALGORITHMS:
        d = g[g.algorithm == name]
        ax.plot(d.K, d["mean"], marker="o", ms=4, lw=2.2, color=ALG_COLORS[name], label=name)
        ax.fill_between(d.K, d["mean"] - d["std"], d["mean"] + d["std"], color=ALG_COLORS[name], alpha=0.10)
    ax.axhline(90, color=RED, ls=":", lw=1.2); ax.text(1.05, 91.5, "90 % target", color=RED, fontsize=8.5)
    ax.set_xlabel("Number of UAV base stations K"); ax.set_ylabel("Users covered (%)")
    ax.set_title("E3 · Coverage vs fleet size (solid: reuse 3, mean ± std; dashed: reuse 1)"); ax.set_ylim(0, 102)
    ax.legend(fontsize=8, loc="lower right", ncol=2)
    fig.tight_layout(); fig.savefig(out / "fig_e3_coverage_vs_K.png"); plt.close(fig)
    return g


def e4_reuse(out, h, R, K=6, seeds=20):
    res = {}
    for reuse in (1, 3):
        cfg = LinkConfig(reuse=reuse)
        sinr, rate, cov = [], [], []
        for s in range(seeds):
            users, _ = relief_camp_scenario(s)
            uavs, _ = run_placement("Hybrid Greedy-PSO", users, K, R, s, h, cfg)
            m = evaluate(users, uavs, h, ENV, cfg)
            sinr.append(m["sinr_db"]); rate.append(m["rate_mbps"][m["covered"]]); cov.append(m["coverage_pct"])
        res[reuse] = (np.concatenate(sinr), np.concatenate(rate), np.mean(cov))
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9, 3.4))
    for reuse, col in ((1, ORANGE), (3, TEAL)):
        s, r, c = res[reuse]
        for ax, v in ((a1, s), (a2, r)):
            x = np.sort(v); ax.plot(x, np.linspace(0, 1, len(x)), lw=2.3, color=col,
                                    label=f"Reuse {reuse} (coverage {c:.1f}%)")
    a1.axvline(0, color=RED, ls=":", lw=1.2)
    a1.set_xlabel("SINR (dB)"); a1.set_ylabel("CDF"); a1.set_title("SINR distribution"); a1.legend(fontsize=8.5)
    a2.set_xlabel("User rate (Mbps), covered users"); a2.set_title("Rate distribution"); a2.set_xscale("log")
    fig.suptitle("E4 · Frequency reuse 1 vs 3 (15 MHz total, K = 6, hybrid placement)", x=0.01, ha="left",
                 fontsize=12, fontweight="bold", color=NAVY)
    fig.tight_layout(); fig.savefig(out / "fig_e4_reuse.png"); plt.close(fig)
    summ = {f"reuse{k}": dict(coverage_pct=float(v[2]), median_sinr_db=float(np.median(v[0])),
                              mean_rate_mbps=float(v[1].mean()), p5_rate_mbps=float(np.percentile(v[1], 5)),
                              p95_rate_mbps=float(np.percentile(v[1], 95)))
            for k, v in res.items()}
    json.dump(summ, open(out / "e4_reuse.json", "w"), indent=1)
    return summ


def e5_regulation(out, cfg, seeds, h_opt, R_opt, Ks=range(2, 25, 2)):
    cfg = LinkConfig(reuse=3)
    R120 = ch.coverage_radius(120.0, ENV, cfg.pl_max_db, cfg.fc)
    rows = []
    for s in range(seeds):
        users, _ = relief_camp_scenario(s)
        for K in Ks:
            for lab, h, R in (("Optimal altitude", h_opt, R_opt), ("120 m cap", 120.0, R120)):
                rng = np.random.default_rng(s)
                uavs = ALGORITHMS["Greedy-MCP"](users, K, R, AREA, rng)
                rows.append(dict(seed=s, K=K, case=lab, coverage_pct=evaluate(users, uavs, h, ENV, cfg)["coverage_pct"]))
    df = pd.DataFrame(rows); df.to_csv(out / "e5_altitude_cap.csv", index=False)
    g = df.groupby(["case", "K"]).coverage_pct.mean().reset_index()
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    for lab, col in (("Optimal altitude", NAVY), ("120 m cap", ORANGE)):
        d = g[g.case == lab]
        ax.plot(d.K, d.coverage_pct, marker="o", lw=2.3, color=col,
                label=f"{lab} (h = {h_opt:.0f} m, R = {R_opt:.0f} m)" if lab.startswith("Opt") else f"{lab} (R = {R120:.0f} m)")
    ax.axhline(90, color=RED, ls=":", lw=1.2)
    ax.set_xlabel("Number of UAVs K"); ax.set_ylabel("Users covered (%)"); ax.set_ylim(0, 102)
    ax.set_title("E5 · Cost of the 120 m altitude cap (urban, greedy-MCP, reuse 3)"); ax.legend(fontsize=9, loc="lower right")
    fig.tight_layout(); fig.savefig(out / "fig_e5_altitude_cap.png"); plt.close(fig)

    def k_for(lab, target=90):
        d = g[(g.case == lab) & (g.coverage_pct >= target)]
        return int(d.K.min()) if len(d) else None
    return dict(R120=R120, K90_opt=k_for("Optimal altitude"), K90_cap=k_for("120 m cap"))


def e6_energy(out, K=6):
    m = Mission()
    T_on = m.on_station_min()
    V = np.linspace(0, 30, 200)
    P = propulsion_power(V)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10, 3.5))
    a1.plot(V, P, lw=2.4, color=NAVY)
    vmr = V[np.argmin(P)]
    a1.plot(vmr, P.min(), "o", color=TEAL, mfc="white", mew=2)
    a1.annotate(f"min power {P.min():.0f} W\n@ {vmr:.1f} m/s", (vmr, P.min()), xytext=(vmr + 4, P.min() + 60),
                fontsize=8.5, arrowprops=dict(arrowstyle="-", color=GREY))
    a1.annotate(f"hover {P[0]:.0f} W", (0, P[0]), xytext=(2, P[0] + 70), fontsize=8.5,
                arrowprops=dict(arrowstyle="-", color=GREY))
    a1.set_xlabel("Flight speed V (m/s)"); a1.set_ylabel("Propulsion power (W)")
    a1.set_title("Rotary-wing propulsion power")
    rows = []
    fleets = range(K, 3 * K + 7)
    for lab, turn, col in (("Battery swap (10 min)", 10, TEAL), ("Recharge (60 min)", 60, ORANGE)):
        av = [100 * simulate_rotation(K, F, m, turn) for F in fleets]
        a2.plot(list(fleets), av, marker="o", ms=4, lw=2.3, color=col, label=lab)
        for F, a in zip(fleets, av):
            rows.append(dict(strategy=lab, fleet=F, availability_pct=a))
    a2.axhline(100, color=NAVY, ls="--", lw=1.3); a2.text(K + 0.2, 101.5, f"tethered: {K} drones, 100 %", fontsize=8.5, color=NAVY)
    a2.set_xlabel(f"Fleet size (drones) for K = {K} stations"); a2.set_ylabel("Coverage availability (%)")
    a2.set_title("24 h mission: availability vs fleet size"); a2.legend(fontsize=8.5, loc="lower right"); a2.set_ylim(0, 108)
    fig.suptitle(f"E6 · Energy: 200 Wh pack, 40 W payload → {T_on:.1f} min on station per sortie",
                 x=0.01, ha="left", fontsize=12, fontweight="bold", color=NAVY)
    fig.tight_layout(); fig.savefig(out / "fig_e6_energy.png"); plt.close(fig)
    df = pd.DataFrame(rows); df.to_csv(out / "e6_fleet_availability.csv", index=False)

    def first_full(lab):
        d = df[(df.strategy == lab) & (df.availability_pct >= 99.99)]
        return int(d.fleet.min()) if len(d) else None
    return dict(hover_w=float(P[0]), min_power_w=float(P.min()), v_min_power=float(vmr), T_on_min=T_on,
                fleet_swap_sim=first_full("Battery swap (10 min)"), fleet_recharge_sim=first_full("Recharge (60 min)"),
                fleet_swap_analytic=required_fleet(K, m, 10), fleet_recharge_analytic=required_fleet(K, m, 60))


def snapshot(out, cfg, h, R, K=6, seed=3):
    users, camps = relief_camp_scenario(seed)
    uavs, _ = run_placement("Hybrid Greedy-PSO", users, K, R, seed, h, cfg)
    g, S, _ = sinr_map(uavs, h, ENV, AREA, cfg)
    m = evaluate(users, uavs, h, ENV, cfg)
    fig, ax = plt.subplots(figsize=(6.4, 5.2)); ax.grid(False)
    im = ax.pcolormesh(g / 1000, g / 1000, np.clip(S, -10, 30), cmap="viridis", shading="auto", alpha=0.9)
    cb = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.03); cb.set_label("Best-server SINR (dB)")
    cov = m["covered"]
    ax.scatter(users[cov, 0] / 1000, users[cov, 1] / 1000, s=4, c="white", alpha=0.85, label="Served user")
    ax.scatter(users[~cov, 0] / 1000, users[~cov, 1] / 1000, s=9, c=RED, marker="x", label="Not served")
    for u in uavs:
        ax.add_patch(plt.Circle(u / 1000, R / 1000, fill=False, ec="white", lw=1.2, ls="--"))
    ax.scatter(uavs[:, 0] / 1000, uavs[:, 1] / 1000, marker="^", s=120, c=ORANGE, ec="black", zorder=5, label="UAV-BS")
    ax.set_xlim(0, 4); ax.set_ylim(0, 4); ax.set_aspect("equal")
    ax.set_xlabel("x (km)"); ax.set_ylabel("y (km)")
    ax.set_title(f"Hybrid placement, K = {K}: {m['coverage_pct']:.1f}% served, median SINR {m['median_sinr_db']:.1f} dB")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=3, fontsize=8.5)
    fig.tight_layout(); fig.savefig(out / "fig_snapshot_sinr.png"); plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=20)
    ap.add_argument("--out", default="results")
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    cfg = LinkConfig()
    t0 = time.time()
    e1 = e1_altitude(out, cfg)
    h, R, th = ch.optimal_altitude(ENV, cfg.pl_max_db, cfg.fc)
    print(f"[E1] urban optimum h*={h:.1f} m R*={R:.1f} m theta*={th:.1f}")
    e2 = e2_algorithms(out, cfg, a.seeds, h, R); print("[E2] done")
    e3 = e3_fleet(out, cfg, a.seeds, h, R); print("[E3] done")
    e4 = e4_reuse(out, h, R, seeds=a.seeds); print("[E4]", e4)
    e5 = e5_regulation(out, cfg, a.seeds, h, R); print("[E5]", e5)
    e6 = e6_energy(out); print("[E6]", e6)
    snapshot(out, cfg, h, R)
    summary = dict(config=cfg.__dict__, urban_opt=dict(h=h, R=R, theta=th),
                   e1=e1.to_dict("records"), e2=e2.to_dict("records"),
                   e3=e3.to_dict("records"), e4=e4, e5=e5, e6=e6,
                   seeds=a.seeds, runtime_s=time.time() - t0)
    json.dump(summary, open(out / "summary.json", "w"), indent=1, default=float)
    print(f"All experiments finished in {time.time() - t0:.1f} s -> {out}/")


if __name__ == "__main__":
    main()
