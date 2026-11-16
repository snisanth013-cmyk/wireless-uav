import numpy as np
import pytest

from uav_drn import channel as ch
from uav_drn.energy import Mission, propulsion_power, simulate_rotation
from uav_drn.network import LinkConfig, evaluate
from uav_drn.placement import ALGORITHMS, covered_count
from uav_drn.scenario import relief_camp_scenario


def test_plos_increases_with_elevation():
    th = np.linspace(0, 90, 50)
    for env in ch.ENVIRONMENTS:
        assert np.all(np.diff(ch.p_los(th, env)) > 0)


@pytest.mark.parametrize("env,published", [("suburban", 20.34), ("urban", 42.44),
                                           ("dense_urban", 54.62), ("highrise_urban", 75.52)])
def test_optimal_angle_matches_al_hourani(env, published):
    # Al-Hourani et al. (2014) report these optimal elevation angles; allow 3 degrees.
    assert abs(ch.optimal_altitude(env, 100.0)[2] - published) < 3.5


def test_radius_zero_when_budget_too_small():
    assert ch.coverage_radius(100.0, "urban", 60.0) == 0.0


def test_hover_power_matches_paper():
    assert propulsion_power(0.0) == pytest.approx(79.86 + 88.63, rel=1e-6)


def test_hybrid_never_worse_than_greedy():
    users, _ = relief_camp_scenario(1)
    h, R, _ = ch.optimal_altitude("urban", 100.0)
    rng = np.random.default_rng(0)
    g = ALGORITHMS["Greedy-MCP"](users, 5, R, 4000.0, rng)
    hy = ALGORITHMS["Hybrid Greedy-PSO"](users, 5, R, 4000.0, rng)
    assert covered_count(users, hy, R) >= covered_count(users, g, R)


def test_evaluate_shapes_and_bounds():
    users, _ = relief_camp_scenario(2)
    uavs = ALGORITHMS["K-means"](users, 4, 700.0)
    m = evaluate(users, uavs, 600.0, "urban", LinkConfig())
    assert m["sinr_db"].shape == (len(users),)
    assert 0 <= m["coverage_pct"] <= 100 and 0 < m["jain"] <= 1


def test_rotation_full_availability_with_big_fleet():
    assert simulate_rotation(3, 30, Mission(), 10) == pytest.approx(1.0)
    assert simulate_rotation(3, 3, Mission(), 10) < 0.9
