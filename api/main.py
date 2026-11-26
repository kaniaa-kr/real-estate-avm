"""FastAPI inference service untuk AVM (stateless).

Jalankan dari ROOT repo:
    uvicorn api.main:app --reload --port 8000

Variabel lingkungan (lihat .env.example):
    MODEL_PATH, META_PATH    lokasi artefak (default: model v1)
    ALLOWED_ORIGINS          daftar origin dipisah koma
    ALLOWED_ORIGIN_REGEX     (opsional) regex origin tambahan, default: semua *.vercel.app
"""

from __future__ import annotations

import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

# Root repo harus ada di sys.path SEBELUM `api.*` / `src.*` diimpor. Di Vercel
# fungsi dijalankan dari root project, tetapi menambahkannya eksplisit membuat
# `uvicorn api.main:app`, Vercel, dan pytest berperilaku sama.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import joblib  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from api.schemas import (  # noqa: E402
    Factor,
    HealthResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
    PriceRange,
)
from src.config import FEATURE_NAMES, MODEL_VERSION  # noqa: E402
from src.evaluation import apply_interval  # noqa: E402
from src.explainer import explain  # noqa: E402

logger = logging.getLogger("avm.api")

DEFAULT_MODEL_PATH = "models/model_pipeline_v1.joblib"
DEFAULT_META_PATH = "models/model_meta_v1.json"
DEFAULT_ORIGIN_REGEX = r"^https://.*\.vercel\.app$"

DISCLAIMER = (
    "Estimasi akademik berbasis data pasar Ames, Iowa (2006–2010). "
    "Tidak mencerminkan harga pasar saat ini."
)


def _resolve(path_str: str) -> Path:
    """Path relatif dihitung dari root repo, bukan dari working directory."""
    path = Path(path_str)
    return path if path.is_absolute() else ROOT / path


def _warn_on_version_mismatch(meta: dict[str, Any]) -> None:
    """Catat peringatan jika versi library runtime berbeda dari saat training."""
    import sklearn

    runtime = {
        "python": ".".join(sys.version.split()[0].split(".")[:2]),
        "scikit-learn": sklearn.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "joblib": joblib.__version__,
    }
    trained = meta.get("library_versions", {})
    for lib, runtime_version in runtime.items():
        trained_version = trained.get(lib)
        if lib == "python" and trained_version:
            trained_version = ".".join(trained_version.split(".")[:2])  # bandingkan mayor.minor
        if trained_version and trained_version != runtime_version:
            logger.warning(
                "Versi %s berbeda: training=%s, runtime=%s (model bisa gagal/berperilaku beda)",
                lib,
                trained_version,
                runtime_version,
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Muat model dan metadata sekali saat startup."""
    app.state.model = None
    app.state.meta = None

    model_path = _resolve(os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH))
    meta_path = _resolve(os.getenv("META_PATH", DEFAULT_META_PATH))
    try:
        # Impor modul pipeline lebih dulu agar kelas kustom (HouseFeatureEngineer)
        # sudah terdaftar di sys.modules sebelum joblib.load() melakukan unpickle.
        import src.features  # noqa: F401
        import src.preprocessing  # noqa: F401

        app.state.meta = json.loads(meta_path.read_text(encoding="utf-8"))
        app.state.model = joblib.load(model_path)
        _warn_on_version_mismatch(app.state.meta)
        logger.info("Model dimuat: %s", model_path)
    except Exception:
        # Server tetap hidup; /predict akan membalas 503 dan /health melaporkan model_loaded=false
        logger.exception("Gagal memuat model dari %s / %s", model_path, meta_path)
        app.state.model = None
        app.state.meta = None
    yield


app = FastAPI(
    title="AVM Real Estate API",
    description="Prototipe akademik, data Ames, Iowa (2006–2010).",
    version=MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ],
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", DEFAULT_ORIGIN_REGEX),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def _require_ready() -> tuple[Any, dict[str, Any]]:
    model, meta = app.state.model, app.state.meta
    if model is None or meta is None:
        raise HTTPException(status_code=503, detail="Model belum siap")
    return model, meta


def _placeholder_factors() -> list[Factor]:
    """Faktor contoh untuk model stub yang tidak punya `explain_background_`.

    Hanya dipakai sebagai fallback Step 1; model v1 selalu memakai explainer asli.
    """
    fake = [
        ("OverallQual", 24000),
        ("GrLivArea", 15000),
        ("Neighborhood", 8000),
        ("HouseAge", -4500),
        ("TotalSF", 3000),
    ]
    return [
        Factor(feature=name, impact_usd=value, direction="up" if value >= 0 else "down")
        for name, value in fake
    ]


def _build_top_factors(model: Any, row: pd.DataFrame) -> list[Factor]:
    """Hitung 5 faktor penentu harga dengan `src.explainer.explain()`.

    `explain()` memilih metode otomatis: SHAP untuk tree, kontribusi koefisien
    untuk Ridge/Lasso, dan ablation sebagai cadangan. Model stub tidak punya
    `explain_background_`, jadi placeholder hanya dipakai untuk stub.
    """
    try:
        return [Factor(**item) for item in explain(model, row, top_n=5)]
    except Exception:
        if getattr(model, "explain_background_", None) is None:
            logger.warning(
                "Model tanpa explain_background_ (stub); memakai placeholder faktor."
            )
            return _placeholder_factors()
        logger.exception("Gagal menghitung faktor penentu; top_factors dikosongkan.")
        return []


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Untuk warm-up/cek status. Selalu 200 selama server hidup; lihat model_loaded."""
    meta = app.state.meta or {}
    return HealthResponse(
        status="ok",
        model_loaded=app.state.model is not None,
        model_version=meta.get("model_version", MODEL_VERSION),
    )


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    _, meta = _require_ready()
    return ModelInfoResponse(
        model_version=meta["model_version"],
        algorithm=meta["algorithm"],
        trained_at=meta["trained_at"],
        features_used=meta["features_used"],
        metrics=meta["metrics"],
        interval=meta["interval"],
        explanation_method=meta["explanation_method"],
    )


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest) -> PredictResponse:  # type: ignore[valid-type]
    """Endpoint sinkron: FastAPI menjalankannya di threadpool (sklearn bersifat CPU-bound)."""
    model, meta = _require_ready()
    try:
        row = pd.DataFrame([payload.model_dump()], columns=FEATURE_NAMES)
        pred_log = float(model.predict(row)[0])  # model menghasilkan skala log1p

        interval = meta["interval"]
        low, pred, high = apply_interval(
            pred_log, interval["q_low"], interval["q_high"]
        )
        price = int(round(float(pred)))
        low_usd = int(round(float(low)))
        high_usd = int(round(float(high)))

        # apply_interval sudah menjamin 0 <= low <= pred <= high; clamp sekali
        # lagi setelah pembulatan agar invarian PredictResponse tetap terjaga.
        low_usd = max(0, min(low_usd, price))
        high_usd = max(high_usd, price)

        return PredictResponse(
            predicted_price=price,
            price_range=PriceRange(low=low_usd, high=high_usd),
            top_factors=_build_top_factors(model, row),
            explanation_method=meta.get("explanation_method", "placeholder"),
            model_version=meta.get("model_version", MODEL_VERSION),
            disclaimer=DISCLAIMER,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Prediksi gagal")
        raise HTTPException(status_code=500, detail="Terjadi kesalahan pada server")
