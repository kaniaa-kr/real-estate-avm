"""Generate a lightweight development stub for the AVM API.

The stub is trained on synthetic data only. It is NOT a production model and
must never be reported as a real estimate or used for model evaluation.
Run from the repository root:
    python scripts/make_stub.py
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import (  # noqa: E402
    ENGINEERED_FEATURES,
    FEATURES,
    FEATURE_NAMES,
    MODEL_VERSION,
    RANDOM_STATE,
)

def validate_feature_config() -> None:
    """Pastikan FEATURES final valid: tepat 10 fitur dan spesifikasinya lengkap."""
    if len(FEATURES) != 10:
        raise ValueError(f"FEATURES harus tepat 10, ditemukan {len(FEATURES)}.")

    for name, spec in FEATURES.items():
        feature_type = spec.get("type")

        if feature_type == "category":
            categories = spec.get("categories")
            if not categories:
                raise ValueError(f"Kategori belum didefinisikan untuk {name}.")
            if spec.get("default") not in categories:
                raise ValueError(f"Default kategori {name} tidak valid.")

        elif feature_type in {"int", "float"}:
            low = spec.get("min")
            high = spec.get("max")
            default = spec.get("default")
            if low is None or high is None:
                raise ValueError(f"Rentang min/max belum lengkap untuk {name}.")
            if low > high:
                raise ValueError(f"Rentang fitur {name} tidak valid.")
            if default is not None and not (low <= default <= high):
                raise ValueError(f"Default fitur {name} di luar rentang.")
            if feature_type == "int" and not (float(low).is_integer() and float(high).is_integer()):
                raise ValueError(f"Rentang fitur integer {name} harus bilangan bulat.")

        else:
            raise ValueError(f"Tipe fitur tidak didukung: {name} ({feature_type}).")

    print("Validasi 10 fitur final berhasil.")

def _library_versions() -> dict[str, str]:
    """Return the runtime versions recorded in the stub metadata."""
    try:
        import shap

        shap_version = shap.__version__
    except Exception:  # pragma: no cover - optional metadata fallback
        shap_version = "not-installed"

    return {
        "python": sys.version.split()[0],
        "scikit-learn": sklearn.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "joblib": joblib.__version__,
        "shap": shap_version,
    }


def _make_synthetic_features(n_rows: int = 600) -> tuple[pd.DataFrame, np.ndarray]:
    """Create deterministic rows within the ranges defined in src/config.py."""
    rng = np.random.default_rng(RANDOM_STATE)
    data: dict[str, Any] = {}

    for name, spec in FEATURES.items():
        feature_type = spec["type"]
        if feature_type == "category":
            categories = list(spec["categories"])
            data[name] = rng.choice(categories, size=n_rows)
        elif feature_type == "int":
            low = int(spec["min"])
            high = int(spec["max"])
            data[name] = rng.integers(low, high + 1, size=n_rows)
        elif feature_type == "float":
            low = float(spec["min"])
            high = float(spec["max"])
            data[name] = rng.uniform(low, high, size=n_rows)
        else:
            raise ValueError(f"Tipe fitur tidak didukung untuk {name}: {feature_type}")

    frame = pd.DataFrame(data, columns=FEATURE_NAMES)

    # Target sintetis hanya untuk memastikan kontrak input/output berjalan.
    kitchen_quality = {"Po": 0, "Fa": 1, "TA": 2, "Gd": 3, "Ex": 4}
    kitchen_score = (
        frame["KitchenQual"].map(kitchen_quality).astype(float)
        if "KitchenQual" in frame.columns
        else pd.Series(2.0, index=frame.index)
    )
    neighborhood_score = (
        pd.Series(pd.Categorical(frame["Neighborhood"]).codes, index=frame.index, dtype=float)
        if "Neighborhood" in frame.columns
        else pd.Series(0.0, index=frame.index)
    )

    synthetic_price = (
        35_000
        + frame.get("OverallQual", 6) * 11_000
        + frame.get("GrLivArea", 1_500) * 42
        + frame.get("TotalBsmtSF", 800) * 16
        + frame.get("GarageCars", 1) * 8_000
        + frame.get("FullBath", 1) * 5_000
        + kitchen_score * 4_000
        + frame.get("LotArea", 8_000) * 0.8
        + frame.get("Fireplaces", 0) * 5_000
        + neighborhood_score * 500
        + rng.normal(0, 12_000, size=n_rows)
    )
    synthetic_price = np.maximum(synthetic_price, 25_000)
    return frame, np.log1p(synthetic_price)


def build_stub_pipeline() -> Pipeline:
    """Build an sklearn-only Pipeline which returns log1p(price) predictions."""
    numeric_features = [
        name for name, spec in FEATURES.items() if spec["type"] in {"int", "float"}
    ]
    categorical_features = [
        name for name, spec in FEATURES.items() if spec["type"] == "category"
    ]

    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if numeric_features:
        numeric_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )
        transformers.append(("num", numeric_pipeline, numeric_features))

    if categorical_features:
        categorical_pipeline = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )
        transformers.append(("cat", categorical_pipeline, categorical_features))

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
        verbose_feature_names_out=True,
    )
    estimator = RandomForestRegressor(
        n_estimators=30,
        max_depth=6,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    return Pipeline(
        steps=[("preprocessor", preprocessor), ("model", estimator)]
    )


def build_stub_metadata() -> dict[str, Any]:
    """Create the same top-level metadata structure as PRD section 5."""
    return {
        "model_version": MODEL_VERSION,
        "algorithm": "RandomForestRegressor",
        "trained_at": date.today().isoformat(),
        "features_used": FEATURE_NAMES,
        "engineered_features": ENGINEERED_FEATURES,
        "metrics": {
            "test_10_features": {
                "rmsle": 0.0,
                "mae_usd": 0.0,
                "rmse_usd": 0.0,
                "r2": 0.0,
            },
            "benchmark_full_features": {
                "rmsle": 0.0,
                "mae_usd": 0.0,
                "rmse_usd": 0.0,
                "r2": 0.0,
            },
        },
        "interval": {
            "method": "oof_log_residual_quantile",
            "nominal_coverage": 0.90,
            "q_low": -0.17,
            "q_high": 0.16,
            "test_coverage": 0.0,
        },
        "explanation_method": "placeholder",
        "split": {"random_state": RANDOM_STATE, "test_size": 0.2},
        "library_versions": _library_versions(),
    }


def main() -> None:
    validate_feature_config()
    models_dir = ROOT / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    X_synthetic, y_synthetic_log = _make_synthetic_features()
    pipeline = build_stub_pipeline()
    pipeline.fit(X_synthetic, y_synthetic_log)

    model_path = models_dir / "model_pipeline_stub.joblib"
    metadata_path = models_dir / "model_meta_stub.json"
    joblib.dump(pipeline, model_path, compress=3)
    metadata_path.write_text(
        json.dumps(build_stub_metadata(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    # Smoke-check: the output must accept exactly the configured UI columns.
    sample_prediction = pipeline.predict(X_synthetic.loc[[0]])
    if sample_prediction.shape != (1,) or not np.isfinite(sample_prediction).all():
        raise RuntimeError("Stub pipeline gagal menghasilkan prediksi log1p yang valid.")

    print(f"Stub pipeline dibuat: {model_path.relative_to(ROOT)}")
    print(f"Metadata stub dibuat: {metadata_path.relative_to(ROOT)}")
    print(f"Ukuran pipeline: {model_path.stat().st_size / (1024 * 1024):.2f} MB")
    print("Catatan: model ini dilatih dengan data sintetis, bukan Ames Housing.")


if __name__ == "__main__":
    main()
