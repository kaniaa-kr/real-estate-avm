import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.explainer import attach_background, detect_method, explain  # noqa: E402

NUM = ["GrLivArea", "TotalBsmtSF", "OverallQual", "YearBuilt"]
CAT = ["Neighborhood"]


@pytest.fixture(scope="module")
def data():
    rng = np.random.default_rng(0)
    n = 300
    X = pd.DataFrame({
        "GrLivArea": rng.integers(800, 3000, n),
        "TotalBsmtSF": rng.integers(0, 1500, n),
        "OverallQual": rng.integers(1, 10, n),
        "YearBuilt": rng.integers(1900, 2010, n),
        "Neighborhood": rng.choice(["A", "B", "C"], n),
    })
    y = np.log1p(50000 + 60 * X["GrLivArea"] + 9000 * X["OverallQual"] + (X["Neighborhood"] == "A") * 20000)
    return X, y


def _pipeline(model, verbose=True):
    pre = ColumnTransformer([
        ("num", StandardScaler(), NUM),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT),
    ], verbose_feature_names_out=verbose)
    return Pipeline([("preprocess", pre), ("model", model)])


def _check_contract(factors, top_n=5):
    assert 1 <= len(factors) <= top_n
    for f in factors:
        assert set(f) == {"feature", "impact_usd", "direction"}
        assert isinstance(f["impact_usd"], int)
        assert f["direction"] == ("up" if f["impact_usd"] >= 0 else "down")
    abs_impacts = [abs(f["impact_usd"]) for f in factors]
    assert abs_impacts == sorted(abs_impacts, reverse=True)


@pytest.mark.parametrize("verbose", [True, False])  # False = nama kolom tanpa awalan (seperti preprocessing Role 3)
def test_linear_method_groups_onehot(data, verbose):
    X, y = data
    pipe = _pipeline(Ridge(alpha=1.0), verbose=verbose).fit(X, y)
    attach_background(pipe, X)
    assert detect_method(pipe) == "linear_coef"
    factors = explain(pipe, X.iloc[[0]])
    _check_contract(factors)
    names = [f["feature"] for f in factors]
    assert "Neighborhood" in names                      # one-hot dijumlah ke fitur asal
    assert not any(n.startswith("Neighborhood_") for n in names)
    assert factors[0]["feature"] == "GrLivArea"          # fitur paling berpengaruh


def test_tree_method(data):
    pytest.importorskip("shap")
    X, y = data
    pipe = _pipeline(RandomForestRegressor(n_estimators=30, max_depth=6, random_state=0)).fit(X, y)
    attach_background(pipe, X)
    assert detect_method(pipe) == "shap_tree"
    _check_contract(explain(pipe, X.iloc[[0]]))


def test_ablation_maps_engineered_features(data):
    X, y = data
    pipe = _pipeline(Ridge(alpha=1.0)).fit(X, y)
    attach_background(pipe, X)
    factors = explain(pipe, X.iloc[[0]], method="ablation", top_n=10)
    _check_contract(factors, top_n=10)
    names = {f["feature"] for f in factors}
    assert "TotalSF" in names and "GrLivArea" not in names


def test_linear_without_background_raises(data):
    X, y = data
    pipe = _pipeline(Ridge(alpha=1.0)).fit(X, y)
    with pytest.raises(ValueError):
        explain(pipe, X.iloc[[0]])