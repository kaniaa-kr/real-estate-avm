from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import sparse

METHOD_TREE = "shap_tree"
METHOD_LINEAR = "linear_coef"
METHOD_ABLATION = "ablation"

# Fitur rekayasa (src/features.py) dan kolom sumbernya.
_ENGINEERED_SOURCES = {
    "TotalSF": ("GrLivArea", "TotalBsmtSF"),
    "HouseAge": ("YearBuilt",),
}
_TREE_EXPLAINERS: dict = {}

# Helper

def attach_background(pipeline, X_train: pd.DataFrame, n: int = 200, random_state: int = 42):
    """Simpan sampel data latih (kolom UI) di pipeline agar ikut ter-pickle."""
    pipeline.explain_background_ = X_train.sample(
        n=min(n, len(X_train)), random_state=random_state
    ).reset_index(drop=True)
    return pipeline


def detect_method(pipeline) -> str:
    """Pilih metode penjelasan otomatis berdasarkan jenis model terakhir."""
    model = pipeline[-1]
    if hasattr(model, "estimators_") and hasattr(model, "feature_importances_"):
        return METHOD_TREE
    if hasattr(model, "coef_"):
        return METHOD_LINEAR
    return METHOD_ABLATION


def _dense(x) -> np.ndarray:
    return x.toarray() if sparse.issparse(x) else np.asarray(x, dtype=float)


def _origin(transformed_name: str, candidates: list[str]) -> str:
    """Petakan nama kolom hasil transformasi ('cat__Neighborhood_NAmes') ke fitur asal."""
    base = transformed_name.split("__", 1)[-1]
    best = None
    for c in candidates:
        if base == c or base.startswith(c + "_"):
            if best is None or len(c) > len(best):
                best = c
    return best or base


def _group(names, values, candidates) -> dict:
    out: dict = {}
    for n, v in zip(names, values):
        key = _origin(n, candidates)
        out[key] = out.get(key, 0.0) + float(v)
    return out


def _abs_impact(item: dict) -> int:
    return abs(item["impact_usd"])


def _finalize(items: list[dict], top_n: int) -> list[dict]:
    items = [i for i in items if i["impact_usd"] != 0]
    items.sort(key=_abs_impact, reverse=True)
    return items[:top_n]


def _from_log_contrib(contribs: dict, base: float, top_n: int) -> list[dict]:
    items = []
    for feat, c in contribs.items():
        impact = int(round(np.expm1(base + c) - np.expm1(base)))
        items.append(
            {"feature": feat, "impact_usd": impact, "direction": "up" if impact >= 0 else "down"}
        )
    return _finalize(items, top_n)


def _require_background(bg):
    if bg is None:
        raise ValueError(
            "Background tidak ada. Panggil attach_background(pipeline, X_train) "
            "sebelum joblib.dump, atau kirim argumen background=."
        )
    return bg


# --------------------------------------------------------------------------- #
# Tiga metode
# --------------------------------------------------------------------------- #
def _explain_tree(pipeline, row, top_n):
    import shap  # impor lambat: hanya saat dibutuhkan

    pre, model = pipeline[:-1], pipeline[-1]
    x = _dense(pre.transform(row))
    names = list(pre.get_feature_names_out())
    explainer = _TREE_EXPLAINERS.get(id(model))
    if explainer is None:
        explainer = shap.TreeExplainer(model)
        _TREE_EXPLAINERS[id(model)] = explainer
    sv = np.asarray(explainer.shap_values(x, check_additivity=False))[0]
    base = float(np.ravel(explainer.expected_value)[0])
    contribs = _group(names, sv, list(row.columns) + list(_ENGINEERED_SOURCES))
    return _from_log_contrib(contribs, base, top_n)


def _explain_linear(pipeline, row, bg, top_n):
    pre, model = pipeline[:-1], pipeline[-1]
    bg = _require_background(bg)
    x = _dense(pre.transform(row))[0]
    mean = _dense(pre.transform(bg)).mean(axis=0)
    names = list(pre.get_feature_names_out())
    coef = np.ravel(model.coef_)
    contrib = coef * (x - mean)
    base = float(model.predict(mean.reshape(1, -1))[0])
    contribs = _group(names, contrib, list(row.columns) + list(_ENGINEERED_SOURCES))
    return _from_log_contrib(contribs, base, top_n)


def _explain_ablation(pipeline, row, bg, top_n):
    bg = _require_background(bg)
    pred_full = float(pipeline.predict(row)[0])
    groups: dict = {}
    used: set = set()
    for eng, srcs in _ENGINEERED_SOURCES.items():
        present = [c for c in srcs if c in row.columns]
        if present:
            groups[eng] = present
            used.update(present)
    for c in row.columns:
        if c not in used:
            groups[c] = [c]
    items = []
    for feat, cols in groups.items():
        ablated = row.copy()
        for c in cols:
            if pd.api.types.is_numeric_dtype(bg[c]):
                ablated[c] = bg[c].median()
            else:
                ablated[c] = bg[c].mode().iloc[0]
        pred_ab = float(pipeline.predict(ablated)[0])
        impact = int(round(np.expm1(pred_full) - np.expm1(pred_ab)))
        items.append(
            {"feature": feat, "impact_usd": impact, "direction": "up" if impact >= 0 else "down"}
        )
    return _finalize(items, top_n)

# API publik

def explain(pipeline, input_df: pd.DataFrame, top_n: int = 5, method: str = "auto", background=None) -> list[dict]:
    """Top-N faktor penentu harga untuk SATU baris input (kolom UI)."""
    row = input_df.iloc[[0]]
    bg = background if background is not None else getattr(pipeline, "explain_background_", None)
    if method == "auto":
        method = detect_method(pipeline)
    if method == METHOD_TREE:
        return _explain_tree(pipeline, row, top_n)
    if method == METHOD_LINEAR:
        return _explain_linear(pipeline, row, bg, top_n)
    if method == METHOD_ABLATION:
        return _explain_ablation(pipeline, row, bg, top_n)
    raise ValueError(f"Metode tidak dikenal: {method}")