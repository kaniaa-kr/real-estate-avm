"""Model Pydantic untuk request dan response API.

Model request DIBANGUN OTOMATIS dari FEATURES di src/config.py, jadi daftar fitur,
rentang, dan kategori tidak pernah ditulis ulang di sini (lihat AGENTS.md Bagian 2).
Bentuk response mengikuti PRD Bagian 6.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, create_model, model_validator

from src.config import FEATURES


def _field_for(name: str, spec: dict[str, Any]) -> tuple[Any, Any]:
    """Ubah satu entri FEATURES menjadi pasangan (tipe, Field) Pydantic."""
    meta = {
        "title": spec.get("label", name),
        "description": spec.get("help"),
        "examples": [spec["default"]] if "default" in spec else None,
    }
    feature_type = spec["type"]

    if feature_type == "category":
        # Literal[("a", "b")] sama dengan Literal["a", "b"]: nilai di luar daftar -> 422
        return Literal[tuple(spec["categories"])], Field(..., **meta)
    if feature_type == "int":
        # strict=True: menolak "7", 7.5, atau true untuk field bilangan bulat
        return int, Field(..., strict=True, ge=int(spec["min"]), le=int(spec["max"]), **meta)
    if feature_type == "float":
        return float, Field(..., strict=True, ge=float(spec["min"]), le=float(spec["max"]), **meta)
    raise ValueError(f"Tipe fitur tidak didukung untuk {name}: {feature_type}")


def _build_request_model() -> type[BaseModel]:
    fields = {name: _field_for(name, spec) for name, spec in FEATURES.items()}
    example = {name: spec["default"] for name, spec in FEATURES.items() if "default" in spec}
    model = create_model(
        "PredictRequest",
        __config__=ConfigDict(extra="forbid", json_schema_extra={"examples": [example]}),
        **fields,
    )
    # Guard Step 2: daftar field harus persis FEATURES, tanpa tambahan manual.
    if list(model.model_fields) != list(FEATURES):
        raise RuntimeError("PredictRequest tidak sinkron dengan FEATURES di src/config.py")
    return model


# Semua fitur wajib diisi (tanpa null) dan field tambahan ditolak (extra="forbid").
PredictRequest = _build_request_model()


class PriceRange(BaseModel):
    low: int
    high: int


class Factor(BaseModel):
    feature: str
    impact_usd: int
    direction: Literal["up", "down"]


class PredictResponse(BaseModel):
    predicted_price: int
    price_range: PriceRange
    top_factors: list[Factor] = Field(max_length=5)
    explanation_method: str
    model_version: str
    disclaimer: str

    @model_validator(mode="after")
    def _check_invariants(self) -> "PredictResponse":
        if not 0 <= self.price_range.low <= self.predicted_price <= self.price_range.high:
            raise ValueError("Invarian dilanggar: harus 0 <= low <= predicted_price <= high")
        return self


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str


class ModelInfoResponse(BaseModel):
    model_version: str
    algorithm: str
    trained_at: str
    features_used: list[str]
    metrics: dict[str, Any]
    interval: dict[str, Any]
    explanation_method: str
