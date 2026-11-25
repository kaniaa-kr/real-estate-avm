"""Tes sinkronisasi (Role 2 · QA, Step 3): api/schemas.py harus sama persis dengan FEATURES di src/config.py.

PredictRequest dibangun otomatis dari FEATURES, jadi perbandingan naif "config == config" akan selalu lolos.
Karena itu tes ini membandingkan config dengan keluaran model Pydantic yang sebenarnya (JSON Schema dan perilaku validasi),
sehingga gagal bila schemas.py menyimpang dari config (nama, urutan, tipe, min/max, kategori, field wajib, field ekstra).
`test_checker_*` menjaga pemeriksa itu sendiri: model yang sengaja dirusak harus terdeteksi.
"""

import json
from pathlib import Path
from typing import Any, Literal

import pytest
from pydantic import BaseModel, ConfigDict, Field, ValidationError, create_model

from api.schemas import PredictRequest
from src.config import FEATURES

FEATURES_JSON = Path(__file__).resolve().parents[1] / "frontend" / "public" / "features.json"
JSON_TYPE = {"int": "integer", "float": "number", "category": "string"}
EXPECTED_FEATURE_COUNT = 10  # PRD Bagian 3: tepat 10 fitur UI


def schema_problems(model: type[BaseModel], features: dict[str, dict[str, Any]]) -> list[str]:
    """Bandingkan JSON Schema model dengan FEATURES; kembalikan daftar ketidaksesuaian (kosong = sinkron)."""
    js = model.model_json_schema()
    props, problems = js.get("properties", {}), []
    if list(props) != list(features):
        problems.append(f"nama/urutan field: schemas={list(props)} config={list(features)}")
    if js.get("additionalProperties") is not False:
        problems.append("field ekstra tidak ditolak (extra='forbid' hilang)")
    if list(js.get("required", [])) != list(features):
        problems.append("tidak semua field wajib diisi")
    for name, spec in features.items():
        prop = props.get(name)
        if prop is None:
            continue
        if prop.get("type") != JSON_TYPE[spec["type"]]:
            problems.append(f"{name}: tipe {prop.get('type')} != {JSON_TYPE[spec['type']]}")
        if spec["type"] in ("int", "float"):
            if prop.get("minimum") != spec["min"] or prop.get("maximum") != spec["max"]:
                problems.append(f"{name}: batas ({prop.get('minimum')}, {prop.get('maximum')}) != ({spec['min']}, {spec['max']})")
        elif prop.get("enum") != list(spec["categories"]):
            problems.append(f"{name}: kategori {prop.get('enum')} != {spec['categories']}")
    return problems


# ------------------------------------------------ config itu sendiri ------------------------------------------------
def test_config_has_exactly_ten_features():
    assert len(FEATURES) == EXPECTED_FEATURE_COUNT


@pytest.mark.parametrize("name,spec", FEATURES.items(), ids=list(FEATURES))
def test_config_spec_is_well_formed(name, spec):
    assert spec["type"] in JSON_TYPE, f"tipe tidak dikenal: {spec['type']}"
    assert spec.get("label") and spec.get("help"), "label dan petunjuk wajib ada untuk UI"
    if spec["type"] == "category":
        cats = spec["categories"]
        assert cats and len(cats) == len(set(cats)) and all(isinstance(c, str) and c for c in cats)
        assert spec["default"] in cats
    else:
        assert spec["min"] <= spec["default"] <= spec["max"]


# ------------------------------------------------ schemas.py vs config.py ------------------------------------------------
def test_schema_matches_config_exactly():
    assert schema_problems(PredictRequest, FEATURES) == []


@pytest.mark.parametrize("name,spec", [(n, s) for n, s in FEATURES.items() if s["type"] != "category"], ids=lambda v: v if isinstance(v, str) else "")
def test_numeric_bounds_enforced_by_validation(name, spec):
    base = {n: s["default"] for n, s in FEATURES.items()}
    cast = int if spec["type"] == "int" else float
    for ok in (cast(spec["min"]), cast(spec["max"])):
        PredictRequest.model_validate(base | {name: ok})
    for bad in (spec["min"] - 1, spec["max"] + 1):
        with pytest.raises(ValidationError):
            PredictRequest.model_validate(base | {name: cast(bad)})


@pytest.mark.parametrize("name,spec", [(n, s) for n, s in FEATURES.items() if s["type"] == "category"], ids=lambda v: v if isinstance(v, str) else "")
def test_categories_enforced_by_validation(name, spec):
    base = {n: s["default"] for n, s in FEATURES.items()}
    for cat in spec["categories"]:
        PredictRequest.model_validate(base | {name: cat})
    with pytest.raises(ValidationError):
        PredictRequest.model_validate(base | {name: "KATEGORI_TIDAK_ADA"})


@pytest.mark.parametrize("name", [n for n, s in FEATURES.items() if s["type"] == "int"])
def test_int_fields_are_strict(name):
    base = {n: s["default"] for n, s in FEATURES.items()}
    for bad in (FEATURES[name]["default"] + 0.5, str(FEATURES[name]["default"]), True):
        with pytest.raises(ValidationError):
            PredictRequest.model_validate(base | {name: bad})


def test_defaults_form_a_valid_request():
    PredictRequest.model_validate({n: s["default"] for n, s in FEATURES.items()})


# ------------------------------------------------ features.json (hasil export_config.py) ------------------------------------------------
def test_features_json_matches_config():
    exported = json.loads(FEATURES_JSON.read_text(encoding="utf-8"))["features"]
    assert [f["name"] for f in exported] == list(FEATURES), "features.json basi: jalankan `python scripts/export_config.py`"
    for item in exported:
        spec = FEATURES[item["name"]]
        assert item["type"] == spec["type"]
        assert item["label"] == spec["label"]
        if spec["type"] == "category":
            assert item["categories"] == spec["categories"]
        else:
            assert (item["min"], item["max"]) == (spec["min"], spec["max"])


# ------------------------------------------------ pemeriksa harus bisa mendeteksi penyimpangan ------------------------------------------------
def _drifted_model(**overrides) -> type[BaseModel]:
    """Salinan PredictRequest dengan satu penyimpangan buatan, untuk menguji schema_problems."""
    fields: dict[str, Any] = {}
    for name, spec in FEATURES.items():
        if spec["type"] == "category":
            fields[name] = (Literal[tuple(spec["categories"])], ...)
        elif spec["type"] == "int":
            fields[name] = (int, Field(..., strict=True, ge=spec["min"], le=spec["max"]))
        else:
            fields[name] = (float, Field(..., strict=True, ge=spec["min"], le=spec["max"]))
    config = overrides.pop("config", ConfigDict(extra="forbid"))
    fields.update(overrides)
    return create_model("Drifted", __config__=config, **fields)


def test_checker_accepts_faithful_copy():
    assert schema_problems(_drifted_model(), FEATURES) == []


@pytest.mark.parametrize(
    "mutation",
    [
        {"OverallQual": (int, Field(..., strict=True, ge=1, le=9))},  # max berubah
        {"OverallQual": (int, Field(..., strict=True, ge=0, le=10))},  # min berubah
        {"OverallQual": (float, Field(..., strict=True, ge=1, le=10))},  # tipe berubah
        {"KitchenQual": (Literal["TA", "Gd"], ...)},  # kategori berkurang
        {"KitchenQual": (Literal[tuple(reversed(FEATURES["KitchenQual"]["categories"]))], ...)},  # urutan kategori
        {"Fireplaces": (int, Field(1, strict=True, ge=0, le=3))},  # tidak lagi wajib
        {"EkstraManual": (int, ...)},  # field tambahan manual
        {"config": ConfigDict(extra="ignore")},  # field ekstra tidak ditolak
    ],
    ids=["max", "min", "tipe", "kategori-hilang", "kategori-urutan", "opsional", "field-tambahan", "extra-ignore"],
)
def test_checker_detects_drift(mutation):
    assert schema_problems(_drifted_model(**mutation), FEATURES), "penyimpangan tidak terdeteksi"


def test_checker_detects_config_changed_without_schema():
    changed = {**FEATURES, "OverallQual": {**FEATURES["OverallQual"], "max": 9}}
    assert schema_problems(PredictRequest, changed)
    removed = {k: v for k, v in FEATURES.items() if k != "Fireplaces"}
    assert schema_problems(PredictRequest, removed)


def test_checker_covers_float_features_even_if_config_has_none_today():
    synthetic = {"Luas": {"type": "float", "min": 1.5, "max": 9.5, "default": 5.0, "label": "L", "help": "h"}}
    faithful = create_model("F", __config__=ConfigDict(extra="forbid"), Luas=(float, Field(..., strict=True, ge=1.5, le=9.5)))
    as_int = create_model("I", __config__=ConfigDict(extra="forbid"), Luas=(int, Field(..., strict=True, ge=1, le=9)))
    assert schema_problems(faithful, synthetic) == []
    assert schema_problems(as_int, synthetic), "float yang berubah menjadi int harus terdeteksi"
