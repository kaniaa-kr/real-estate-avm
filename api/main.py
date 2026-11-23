"""FastAPI inference service untuk AVM (stateless).

Jalankan dari ROOT repo:
    uvicorn api.main:app --reload --port 8000

Variabel lingkungan (lihat .env.example):
    MODEL_PATH, META_PATH    lokasi artefak (default: stub)
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

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import (
    Factor,
    HealthResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
    PriceRange,
)
from src.config import FEATURE_NAMES, MODEL_VERSION

logger = logging.getLogger("avm.api")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = "models/model_pipeline_stub.joblib"
DEFAULT_META_PATH = "models/model_meta_stub.json"
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


def _build_top_factors(model: Any, row: pd.DataFrame) -> list[Factor]:
    """PLACEHOLDER (Step 1): nilai tetap berbentuk sama dengan hasil asli.

    TODO Step 4/5: ganti dengan `src.explainer.explain(model, row, top_n=5)`.
    Nilai di bawah BUKAN hasil perhitungan, hanya untuk menguji UI dan kontrak.
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
        price = int(round(float(np.expm1(pred_log))))
        low = int(round(float(np.expm1(pred_log + interval["q_low"]))))
        high = int(round(float(np.expm1(pred_log + interval["q_high"]))))

        # Jaga invarian 0 <= low <= price <= high
        low = max(0, min(low, price))
        high = max(high, price)

        return PredictResponse(
            predicted_price=price,
            price_range=PriceRange(low=low, high=high),
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
