"""Flask REST API Backend for UAV-Assisted Cellular Networks for Disaster Recovery (UAV-DRN).
Wraps and expands the core mathematical models in uav_drn.
"""
from __future__ import annotations

import os
import sys
import json
import time
from pathlib import Path
from dataclasses import asdict

# Ensure uav_drn_implementation is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
UAV_IMPL_DIR = BASE_DIR / "uav_drn_implementation"
if str(UAV_IMPL_DIR) not in sys.path:
    sys.path.insert(0, str(UAV_IMPL_DIR))

import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from uav_drn import channel as ch
from uav_drn.scenario import relief_camp_scenario
from uav_drn.placement import ALGORITHMS, covered_count, sinr_fitness
from uav_drn.network import LinkConfig, assign_channels, evaluate
from uav_drn.energy import Mission, RotaryWing, propulsion_power, simulate_rotation, required_fleet

FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"
app = Flask(__name__, static_folder=str(FRONTEND_DIST_DIR), static_url_path="")
CORS(app)

# Load existing benchmark summary for instant access
SUMMARY_JSON_PATH = UAV_IMPL_DIR / "results" / "summary.json"
BENCHMARK_DATA = {}
if SUMMARY_JSON_PATH.exists():
    try:
        with open(SUMMARY_JSON_PATH, "r") as f:
            BENCHMARK_DATA = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load summary.json: {e}")

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "UAV-DRN Simulation Engine",
        "version": "2.0.0",
        "algorithms": list(ALGORITHMS.keys()),
        "environments": list(ch.ENVIRONMENTS.keys()),
    })

@app.route("/api/config", methods=["GET"])
def get_config():
    default_cfg = LinkConfig()
    rotary = RotaryWing()
    mission = Mission()
    return jsonify({
        "link_config": {
            "fc": default_cfg.fc,
            "pt_dbm": default_cfg.pt_dbm,
            "g_tx_dbi": default_cfg.g_tx_dbi,
            "g_rx_dbi": default_cfg.g_rx_dbi,
            "losses_db": default_cfg.losses_db,
            "total_bw_hz": default_cfg.total_bw_hz,
            "noise_figure_db": default_cfg.noise_figure_db,
            "sinr_th_db": default_cfg.sinr_th_db,
            "pl_max_db": default_cfg.pl_max_db,
            "reuse": default_cfg.reuse,
            "eirp_dbm": default_cfg.eirp_dbm
        },
        "environments": {
            k: {
                "name": ch.LABELS.get(k, k),
                **v
            } for k, v in ch.ENVIRONMENTS.items()
        },
        "rotary_wing": asdict(rotary),
        "mission_defaults": {
            "battery_wh": mission.battery_wh,
            "usable": mission.usable,
            "payload_w": mission.payload_w,
            "transit_min": mission.transit_min,
            "cruise_ms": mission.cruise_ms
        },
        "area_size_m": 4000.0
    })

@app.route("/api/scenario/generate", methods=["POST"])
def generate_scenario():
    data = request.get_json() or {}
    seed = int(data.get("seed", 3))
    area = float(data.get("area", 4000.0))
    n_camps = int(data.get("n_camps", 6))
    camp_min = int(data.get("camp_min", 70))
    camp_max = int(data.get("camp_max", 160))
    sigma = float(data.get("sigma", 190.0))
    n_scattered = int(data.get("n_scattered", 160))
    min_sep = float(data.get("min_sep", 700.0))

    rng = np.random.default_rng(seed)
    camps = []
    # Generation with collision rejection
    attempts = 0
    while len(camps) < n_camps and attempts < 1000:
        attempts += 1
        c = rng.uniform(400, max(area - 400, 500), size=2)
        if all(np.linalg.norm(c - q) >= min_sep for q in camps):
            camps.append(c)
    if len(camps) < n_camps:
        # Fallback if too constrained
        for _ in range(n_camps - len(camps)):
            camps.append(rng.uniform(400, max(area - 400, 500), size=2))

    camps = np.array(camps)
    sizes = rng.integers(camp_min, camp_max + 1, size=n_camps)
    
    users = []
    user_metadata = []
    for camp_id, (c, n) in enumerate(zip(camps, sizes)):
        cluster = rng.normal(c, sigma, size=(n, 2))
        cluster = np.clip(cluster, 0, area)
        for u in cluster:
            users.append(u.tolist())
            user_metadata.append({"camp_id": camp_id, "is_scattered": False})

    scattered = rng.uniform(0, area, size=(n_scattered, 2))
    for u in scattered:
        users.append(u.tolist())
        user_metadata.append({"camp_id": -1, "is_scattered": True})

    camp_list = []
    for i, (c, n) in enumerate(zip(camps, sizes)):
        camp_list.append({
            "id": i + 1,
            "x": float(c[0]),
            "y": float(c[1]),
            "user_count": int(n)
        })

    return jsonify({
        "seed": seed,
        "area": area,
        "n_users": len(users),
        "n_camps": len(camp_list),
        "camps": camp_list,
        "users": users,
        "user_metadata": user_metadata
    })

@app.route("/api/channel/analysis", methods=["POST"])
def channel_analysis():
    data = request.get_json() or {}
    env = data.get("env", "urban")
    pl_max = float(data.get("pl_max", 100.0))
    fc = float(data.get("fc", 2e9))

    h_opt, R_opt, theta_opt = ch.optimal_altitude(env, pl_max, fc)
    R_120 = ch.coverage_radius(120.0, env, pl_max, fc)
    area_loss_pct = 100.0 * (1.0 - (R_120 / max(R_opt, 1e-3)) ** 2)

    # R(h) curve: 10m to 1500m
    hs = np.linspace(10, 1500, 150)
    Rs = [ch.coverage_radius(float(h), env, pl_max, fc) for h in hs]
    rh_curve = [{"h": round(float(h), 1), "R": round(float(r), 1)} for h, r in zip(hs, Rs)]

    # P_LoS(theta) curve: 0 to 90 degrees
    thetas = np.linspace(0, 90, 91)
    plos_curve = []
    for e in ch.ENVIRONMENTS:
        plos_vals = ch.p_los(thetas, e)
        for th, val in zip(thetas, plos_vals):
            plos_curve.append({
                "theta": int(th),
                "env": e,
                "env_name": ch.LABELS.get(e, e),
                "p_los": round(float(val), 4)
            })

    # Comparative table across all 4 ITU environments
    comparative = []
    for e in ch.ENVIRONMENTS:
        eh, er, eth = ch.optimal_altitude(e, pl_max, fc)
        er120 = ch.coverage_radius(120.0, e, pl_max, fc)
        eloss = 100.0 * (1.0 - (er120 / max(er, 1e-3)) ** 2)
        comparative.append({
            "environment": e,
            "name": ch.LABELS.get(e, e),
            "h_opt": round(float(eh), 1),
            "R_opt": round(float(er), 1),
            "theta_opt": round(float(eth), 2),
            "R_120": round(float(er120), 1),
            "area_loss_pct": round(float(eloss), 1)
        })

    return jsonify({
        "environment": env,
        "name": ch.LABELS.get(env, env),
        "h_opt": round(float(h_opt), 1),
        "R_opt": round(float(R_opt), 1),
        "theta_opt": round(float(theta_opt), 2),
        "R_120": round(float(R_120), 1),
        "area_loss_pct": round(float(area_loss_pct), 1),
        "rh_curve": rh_curve,
        "plos_curve": plos_curve,
        "comparative": comparative
    })

@app.route("/api/deploy", methods=["POST"])
def deploy_uavs():
    data = request.get_json() or {}
    algorithm = data.get("algorithm", "Hybrid Greedy-PSO")
    K = int(data.get("K", 6))
    env = data.get("env", "urban")
    seed = int(data.get("seed", 3))
    area = float(data.get("area", 4000.0))
    custom_uavs = data.get("custom_uavs", None)
    
    # Link config params
    pt_dbm = float(data.get("pt_dbm", 20.0))
    reuse = int(data.get("reuse", 1))
    pl_max = float(data.get("pl_max", 100.0 + (pt_dbm - 20.0)))
    fc = float(data.get("fc", 2e9))
    
    cfg = LinkConfig(
        fc=fc,
        pt_dbm=pt_dbm,
        reuse=reuse,
        pl_max_db=pl_max
    )

    # Users array
    users_raw = data.get("users", None)
    if users_raw is None or len(users_raw) == 0:
        users, _ = relief_camp_scenario(seed, area=area)
    else:
        users = np.array(users_raw, dtype=float)

    # Optimal altitude & radius
    h_param = data.get("h", None)
    if h_param is not None:
        h = float(h_param)
        R = ch.coverage_radius(h, env, cfg.pl_max_db, cfg.fc)
    else:
        h, R, _ = ch.optimal_altitude(env, cfg.pl_max_db, cfg.fc)

    t0 = time.perf_counter()
    if custom_uavs is not None and len(custom_uavs) > 0:
        uavs = np.array(custom_uavs, dtype=float)
        K = len(uavs)
        runtime_s = 0.001
    else:
        rng = np.random.default_rng(1000 + seed)
        fn = ALGORITHMS.get(algorithm, ALGORITHMS["Hybrid Greedy-PSO"])
        if algorithm == "Hybrid Greedy-PSO":
            uavs = fn(users, K, R, area, rng, ctx=(h, env, cfg))
        elif algorithm in ("Random", "Grid", "K-means", "Greedy-MCP"):
            uavs = fn(users, K, R, area, rng)
        else:
            uavs = ALGORITHMS["Hybrid Greedy-PSO"](users, K, R, area, rng, ctx=(h, env, cfg))
        runtime_s = time.perf_counter() - t0

    # Evaluate network metrics
    eval_res = evaluate(users, uavs, h, env, cfg)
    chs = assign_channels(uavs, cfg.reuse)
    
    covered_mask = eval_res["covered"]
    serving_idx = eval_res["serving"]
    sinr_db = eval_res["sinr_db"]
    rate_mbps = eval_res["rate_mbps"]
    
    n_users = len(users)
    n_covered = int(covered_mask.sum())
    n_uncovered = n_users - n_covered

    # UAV details
    uav_list = []
    for k in range(K):
        mask_k = covered_mask & (serving_idx == k)
        served_count_k = int(mask_k.sum())
        mean_sinr_k = float(sinr_db[mask_k].mean()) if served_count_k > 0 else 0.0
        uav_list.append({
            "id": k + 1,
            "x": round(float(uavs[k, 0]), 1),
            "y": round(float(uavs[k, 1]), 1),
            "channel": int(chs[k]),
            "channel_label": f"f{chs[k] + 1}",
            "served_users": served_count_k,
            "mean_sinr_db": round(mean_sinr_k, 2)
        })

    # User details
    user_status = []
    for i in range(n_users):
        user_status.append({
            "is_covered": bool(covered_mask[i]),
            "serving_uav": int(serving_idx[i]) + 1,
            "sinr_db": round(float(sinr_db[i]), 2),
            "rate_mbps": round(float(rate_mbps[i]), 3)
        })

    return jsonify({
        "algorithm": algorithm,
        "K": K,
        "h": round(float(h), 1),
        "R": round(float(R), 1),
        "env": env,
        "reuse": reuse,
        "runtime_ms": round(runtime_s * 1000.0, 2),
        "metrics": {
            "n_users": n_users,
            "n_covered": n_covered,
            "n_uncovered": n_uncovered,
            "coverage_pct": round(float(eval_res["coverage_pct"]), 2),
            "mean_rate_mbps": round(float(eval_res["mean_rate_mbps"]), 3),
            "edge_rate_mbps": round(float(eval_res["edge_rate_mbps"]), 3),
            "sum_rate_mbps": round(float(eval_res["sum_rate_mbps"]), 2),
            "jain_fairness": round(float(eval_res["jain"]), 4),
            "median_sinr_db": round(float(eval_res["median_sinr_db"]), 2)
        },
        "uavs": uav_list,
        "user_status": user_status
    })

@app.route("/api/deploy/compare-all", methods=["POST"])
def compare_all_algorithms():
    data = request.get_json() or {}
    K = int(data.get("K", 6))
    env = data.get("env", "urban")
    seed = int(data.get("seed", 3))
    area = float(data.get("area", 4000.0))
    pt_dbm = float(data.get("pt_dbm", 20.0))
    reuse = int(data.get("reuse", 1))
    pl_max = float(data.get("pl_max", 100.0 + (pt_dbm - 20.0)))
    fc = float(data.get("fc", 2e9))
    
    cfg = LinkConfig(fc=fc, pt_dbm=pt_dbm, reuse=reuse, pl_max_db=pl_max)
    h, R, _ = ch.optimal_altitude(env, cfg.pl_max_db, cfg.fc)

    users_raw = data.get("users", None)
    if users_raw is None or len(users_raw) == 0:
        users, _ = relief_camp_scenario(seed, area=area)
    else:
        users = np.array(users_raw, dtype=float)

    results = []
    for name in ["Random", "Grid", "K-means", "Greedy-MCP", "Hybrid Greedy-PSO"]:
        rng = np.random.default_rng(1000 + seed)
        fn = ALGORITHMS[name]
        t0 = time.perf_counter()
        if name == "Hybrid Greedy-PSO":
            uavs = fn(users, K, R, area, rng, ctx=(h, env, cfg))
        else:
            uavs = fn(users, K, R, area, rng)
        dt = time.perf_counter() - t0

        m = evaluate(users, uavs, h, env, cfg)
        covered_count_val = int(m["covered"].sum())
        
        results.append({
            "algorithm": name,
            "runtime_ms": round(dt * 1000.0, 2),
            "coverage_pct": round(float(m["coverage_pct"]), 2),
            "n_covered": covered_count_val,
            "n_uncovered": len(users) - covered_count_val,
            "mean_rate_mbps": round(float(m["mean_rate_mbps"]), 3),
            "edge_rate_mbps": round(float(m["edge_rate_mbps"]), 3),
            "sum_rate_mbps": round(float(m["sum_rate_mbps"]), 2),
            "jain_fairness": round(float(m["jain"]), 4),
            "median_sinr_db": round(float(m["median_sinr_db"]), 2),
            "uav_positions": [[round(float(x), 1), round(float(y), 1)] for x, y in uavs]
        })

    return jsonify({
        "K": K,
        "env": env,
        "h": round(float(h), 1),
        "R": round(float(R), 1),
        "reuse": reuse,
        "comparisons": results
    })

@app.route("/api/interference/compare", methods=["POST"])
def interference_compare():
    data = request.get_json() or {}
    K = int(data.get("K", 6))
    env = data.get("env", "urban")
    seed = int(data.get("seed", 3))
    area = float(data.get("area", 4000.0))
    pt_dbm = float(data.get("pt_dbm", 20.0))
    algorithm = data.get("algorithm", "Hybrid Greedy-PSO")

    cfg1 = LinkConfig(pt_dbm=pt_dbm, reuse=1)
    cfg3 = LinkConfig(pt_dbm=pt_dbm, reuse=3)
    h, R, _ = ch.optimal_altitude(env, 100.0)

    users_raw = data.get("users", None)
    if users_raw is None or len(users_raw) == 0:
        users, _ = relief_camp_scenario(seed, area=area)
    else:
        users = np.array(users_raw, dtype=float)

    custom_uavs = data.get("custom_uavs", None)
    if custom_uavs is not None and len(custom_uavs) > 0:
        uavs = np.array(custom_uavs, dtype=float)
    else:
        rng = np.random.default_rng(1000 + seed)
        fn = ALGORITHMS.get(algorithm, ALGORITHMS["Hybrid Greedy-PSO"])
        if algorithm == "Hybrid Greedy-PSO":
            uavs = fn(users, K, R, area, rng, ctx=(h, env, cfg1))
        else:
            uavs = fn(users, K, R, area, rng)

    m1 = evaluate(users, uavs, h, env, cfg1)
    m3 = evaluate(users, uavs, h, env, cfg3)

    ch1 = assign_channels(uavs, 1)
    ch3 = assign_channels(uavs, 3)

    # Build histogram bins for SINR (-10 to +30 dB)
    bins = np.linspace(-10, 30, 21)
    hist1, _ = np.histogram(m1["sinr_db"], bins=bins)
    hist3, _ = np.histogram(m3["sinr_db"], bins=bins)
    
    sinr_dist = []
    for i in range(len(bins) - 1):
        mid = (bins[i] + bins[i+1]) / 2.0
        sinr_dist.append({
            "sinr_bin": f"{int(bins[i])} to {int(bins[i+1])} dB",
            "bin_center": round(float(mid), 1),
            "reuse1_count": int(hist1[i]),
            "reuse3_count": int(hist3[i])
        })

    # Inter-UAV distances
    D = np.linalg.norm(uavs[:, None] - uavs[None], axis=2)
    co_channel_dists_3 = []
    for i in range(len(uavs)):
        for j in range(i + 1, len(uavs)):
            if ch3[i] == ch3[j]:
                co_channel_dists_3.append({
                    "uav_a": i + 1,
                    "uav_b": j + 1,
                    "channel": int(ch3[i] + 1),
                    "distance_m": round(float(D[i, j]), 1)
                })

    return jsonify({
        "uavs": [
            {
                "id": i + 1,
                "x": round(float(uavs[i, 0]), 1),
                "y": round(float(uavs[i, 1]), 1),
                "channel_reuse1": int(ch1[i] + 1),
                "channel_reuse3": int(ch3[i] + 1)
            } for i in range(len(uavs))
        ],
        "reuse1": {
            "reuse": 1,
            "bandwidth_per_uav_mhz": 15.0,
            "coverage_pct": round(float(m1["coverage_pct"]), 2),
            "median_sinr_db": round(float(m1["median_sinr_db"]), 2),
            "mean_rate_mbps": round(float(m1["mean_rate_mbps"]), 3),
            "edge_rate_mbps": round(float(m1["edge_rate_mbps"]), 3),
            "sum_rate_mbps": round(float(m1["sum_rate_mbps"]), 2),
            "jain_fairness": round(float(m1["jain"]), 4)
        },
        "reuse3": {
            "reuse": 3,
            "bandwidth_per_uav_mhz": 5.0,
            "coverage_pct": round(float(m3["coverage_pct"]), 2),
            "median_sinr_db": round(float(m3["median_sinr_db"]), 2),
            "mean_rate_mbps": round(float(m3["mean_rate_mbps"]), 3),
            "edge_rate_mbps": round(float(m3["edge_rate_mbps"]), 3),
            "sum_rate_mbps": round(float(m3["sum_rate_mbps"]), 2),
            "jain_fairness": round(float(m3["jain"]), 4)
        },
        "sinr_distribution": sinr_dist,
        "co_channel_distances": co_channel_dists_3
    })

@app.route("/api/energy/calculate", methods=["POST"])
def energy_calculate():
    data = request.get_json() or {}
    K = int(data.get("K", 6))
    battery_wh = float(data.get("battery_wh", 200.0))
    usable = float(data.get("usable", 0.8))
    payload_w = float(data.get("payload_w", 40.0))
    transit_min = float(data.get("transit_min", 4.0))
    cruise_ms = float(data.get("cruise_ms", 10.0))
    turnaround_swap_min = float(data.get("turnaround_swap_min", 10.0))
    turnaround_recharge_min = float(data.get("turnaround_recharge_min", 60.0))
    horizon_h = float(data.get("horizon_h", 24.0))

    mission = Mission(
        battery_wh=battery_wh,
        usable=usable,
        payload_w=payload_w,
        transit_min=transit_min,
        cruise_ms=cruise_ms
    )
    rotary = RotaryWing()

    # Aerodynamic power metrics
    p_hover = float(propulsion_power(0.0, rotary))
    p_cruise = float(propulsion_power(cruise_ms, rotary))
    total_hover_power = p_hover + payload_w

    # Propulsion curve: V from 0 to 30 m/s
    vs = np.linspace(0, 30, 61)
    p_vs = [float(propulsion_power(v, rotary)) for v in vs]
    min_idx = int(np.argmin(p_vs))
    v_optimal = float(vs[min_idx])
    p_min = float(p_vs[min_idx])

    power_curve = [
        {"speed_ms": round(float(v), 1), "power_w": round(float(p), 2), "total_w": round(float(p + payload_w), 2)}
        for v, p in zip(vs, p_vs)
    ]

    on_station_min = mission.on_station_min(rotary)
    total_sortie_min = on_station_min + 2 * transit_min

    # Fleet size calculations
    req_fleet_swap = required_fleet(K, mission, turnaround_swap_min)
    req_fleet_recharge = required_fleet(K, mission, turnaround_recharge_min)
    
    # 24h simulation sweep
    swap_sim_results = []
    for f in range(K, req_fleet_swap + 5):
        avail = simulate_rotation(K, f, mission, turnaround_swap_min, horizon_h=horizon_h)
        swap_sim_results.append({"fleet_size": f, "availability_pct": round(avail * 100.0, 1)})

    recharge_sim_results = []
    for f in range(K, req_fleet_recharge + 4):
        avail = simulate_rotation(K, f, mission, turnaround_recharge_min, horizon_h=horizon_h)
        recharge_sim_results.append({"fleet_size": f, "availability_pct": round(avail * 100.0, 1)})

    # Comparison matrix: Tethered vs Battery-Powered UAVs
    tethered_vs_battery = [
        {
            "metric": "Power Source",
            "battery_drone": "Onboard LiPo Battery (200 Wh pack)",
            "tethered_drone": "Continuous Ground Tether (High Voltage DC)"
        },
        {
            "metric": "Flight Duration / Endurance",
            "battery_drone": f"{round(on_station_min, 1)} min on station per sortie",
            "tethered_drone": "Unlimited (days/weeks continuously)"
        },
        {
            "metric": "Payload Capacity",
            "battery_drone": "Limited (Payload trades off flight time)",
            "tethered_drone": "High (No heavy battery pack needed)"
        },
        {
            "metric": "24h Continuous Fleet Size (K = 6)",
            "battery_drone": f"{req_fleet_swap} (Swap) to {req_fleet_recharge} (Recharge) UAVs",
            "tethered_drone": f"{K} UAVs (1:1 ratio, 100% on station)"
        },
        {
            "metric": "Mobility & Coverage Radius",
            "battery_drone": "Full 3D mobility anywhere in 4x4 km zone",
            "tethered_drone": "Tether length constrained (< 150m tether radius)"
        },
        {
            "metric": "Deployment Setup",
            "battery_drone": "Rapid aerial launch from central depot",
            "tethered_drone": "Requires ground vehicle/generator at each station"
        },
        {
            "metric": "Weather / Wind Resistance",
            "battery_drone": "Moderate (Wind increases hover power drain)",
            "tethered_drone": "High (Tether provides physical anchoring)"
        }
    ]

    return jsonify({
        "hover_propulsion_w": round(p_hover, 2),
        "cruise_propulsion_w": round(p_cruise, 2),
        "payload_w": payload_w,
        "total_hover_power_w": round(total_hover_power, 2),
        "optimal_airspeed_ms": round(v_optimal, 2),
        "min_propulsion_power_w": round(p_min, 2),
        "on_station_min": round(on_station_min, 2),
        "total_sortie_min": round(total_sortie_min, 2),
        "fleet_required": {
            "battery_swap": req_fleet_swap,
            "battery_recharge": req_fleet_recharge,
            "tethered": K
        },
        "power_curve": power_curve,
        "swap_availability_curve": swap_sim_results,
        "recharge_availability_curve": recharge_sim_results,
        "tethered_vs_battery": tethered_vs_battery
    })

@app.route("/api/benchmarks", methods=["GET"])
def get_benchmarks():
    return jsonify(BENCHMARK_DATA)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path != "" and (FRONTEND_DIST_DIR / path).exists():
        return send_from_directory(str(FRONTEND_DIST_DIR), path)
    if (FRONTEND_DIST_DIR / "index.html").exists():
        return send_from_directory(str(FRONTEND_DIST_DIR), "index.html")
    return jsonify({"message": "UAV-DRN API is active. Frontend is building or accessible on dev port 5173."})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
