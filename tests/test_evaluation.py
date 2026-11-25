import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.evaluation import apply_interval, coverage, full_metrics, rmsle  # noqa: E402


def test_rmsle_zero_when_perfect():
    y = np.log1p(np.array([100000.0, 200000.0]))
    assert rmsle(y, y) == 0.0


def test_full_metrics_keys():
    y = np.log1p(np.array([100000.0, 200000.0, 150000.0]))
    m = full_metrics(y, y + 0.05)
    assert {"rmsle", "mae_usd", "rmse_usd", "r2", "r2_log"} <= set(m)
    assert m["mae_usd"] > 0


def test_interval_invariant_array():
    pred = np.log1p(np.array([1000.0, 150000.0, 500000.0]))
    low, p, high = apply_interval(pred, -0.2, 0.2)
    assert (low >= 0).all() and (low <= p).all() and (p <= high).all()


def test_interval_invariant_odd_quantiles():
    # kuantil "aneh" (low positif / high negatif) tetap menjaga urutan
    low, p, high = apply_interval(np.log1p(150000.0), 0.1, -0.1)
    assert 0 <= low <= p <= high


def test_coverage():
    assert coverage([1, 5, 10], [0, 0, 0], [6, 6, 6]) == 2 / 3


def test_oof_residual_quantiles_order():
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import KFold

    rng = np.random.default_rng(0)
    X = rng.normal(size=(120, 3))
    y = X @ np.array([0.5, -0.2, 0.1]) + rng.normal(0, 0.1, 120) + 12.0
    from src.evaluation import oof_residual_quantiles

    q_low, q_high = oof_residual_quantiles(Ridge(), X, y, KFold(5, shuffle=True, random_state=42), n_jobs=1)
    assert q_low < 0 < q_high