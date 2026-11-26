"""Tes API lengkap (Role 2 · QA): GET /health, GET /model-info, POST /predict, CORS.

Kontrak: PRD.md Bagian 6 + api/schemas.py. Melengkapi tes dasar di tests/test_api_stub.py.
Payload valid dan batas nilai dibangun dari FEATURES di src/config.py, jadi tes ini tetap valid
saat Role 1 mengunci daftar 10 fitur final (tidak ada nama fitur yang ditulis ulang di sini).
"""

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from src.config import FEATURES, MODEL_VERSION

NUMERIC = {n: s for n, s in FEATURES.items() if s["type"] in ("int", "float")}
CATEGORICAL = {n: s for n, s in FEATURES.items() if s["type"] == "category"}
MAX_FACTORS = 5
ROOT = Path(__file__).resolve().parents[1]
MODEL_VARIANTS = {
    "stub": ("models/model_pipeline_stub.joblib", "models/model_meta_stub.json"),
    "v1": ("models/model_pipeline_v1.joblib", "models/model_meta_v1.json"),
}
UI_CORS_ORIGINS = ["http://localhost:3000", "https://real-estate-avm.vercel.app"]


def valid_payload() -> dict:
    return {name: spec["default"] for name, spec in FEATURES.items()}


@pytest.fixture()
def client():
    # `with` memicu lifespan sehingga model termuat; dibuat per tes agar state tidak bocor antar tes
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(params=list(MODEL_VARIANTS))
def any_model_client(request, monkeypatch):
    """Klien untuk tiap artefak model yang ada (stub dan v1), dipilih lewat MODEL_PATH/META_PATH seperti di produksi."""
    model_path, meta_path = (ROOT / p for p in MODEL_VARIANTS[request.param])
    if not (model_path.exists() and meta_path.exists()):
        pytest.skip(f"artefak model '{request.param}' belum ada")
    monkeypatch.setenv("MODEL_PATH", str(model_path))
    monkeypatch.setenv("META_PATH", str(meta_path))
    with TestClient(app) as test_client:
        assert test_client.get("/health").json()["model_loaded"] is True
        yield test_client


# ------------------------------------------------ /health & /model-info ------------------------------------------------
def test_health_contract(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"status", "model_loaded", "model_version"}
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert isinstance(body["model_version"], str) and body["model_version"]


def test_health_is_200_even_when_model_not_loaded(client, monkeypatch):
    monkeypatch.setattr(client.app.state, "model", None)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model_loaded"] is False


def test_model_info_contract(client):
    r = client.get("/model-info")
    assert r.status_code == 200
    body = r.json()
    for key in ("model_version", "algorithm", "trained_at", "features_used", "metrics", "interval", "explanation_method"):
        assert key in body, f"field '{key}' hilang dari /model-info"
    assert set(body["features_used"]) == set(FEATURES)


def test_model_info_returns_503_when_model_not_loaded(client, monkeypatch):
    monkeypatch.setattr(client.app.state, "model", None)
    r = client.get("/model-info")
    assert r.status_code == 503
    assert r.json() == {"detail": "Model belum siap"}


# ------------------------------------------------ /predict: kasus valid ------------------------------------------------
def test_predict_response_contract(any_model_client):
    r = any_model_client.post("/predict", json=valid_payload())
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"predicted_price", "price_range", "top_factors", "explanation_method", "model_version", "disclaimer"}
    assert set(body["price_range"]) == {"low", "high"}
    assert isinstance(body["predicted_price"], int) and not isinstance(body["predicted_price"], bool)
    assert isinstance(body["price_range"]["low"], int) and isinstance(body["price_range"]["high"], int)
    assert isinstance(body["explanation_method"], str) and body["explanation_method"]
    assert isinstance(body["model_version"], str) and body["model_version"]
    assert "Ames" in body["disclaimer"]


def test_predict_price_invariants(any_model_client):
    body = any_model_client.post("/predict", json=valid_payload()).json()
    assert 0 <= body["price_range"]["low"] <= body["predicted_price"] <= body["price_range"]["high"]


def test_predict_top_factors_contract(any_model_client):
    factors = any_model_client.post("/predict", json=valid_payload()).json()["top_factors"]
    assert 0 < len(factors) <= MAX_FACTORS
    for f in factors:
        assert set(f) == {"feature", "impact_usd", "direction"}
        assert isinstance(f["feature"], str) and f["feature"]
        assert isinstance(f["impact_usd"], int) and not isinstance(f["impact_usd"], bool)
        assert f["direction"] == ("up" if f["impact_usd"] >= 0 else "down")


def test_predict_top_factors_sorted_by_absolute_impact(any_model_client):
    impacts = [abs(f["impact_usd"]) for f in any_model_client.post("/predict", json=valid_payload()).json()["top_factors"]]
    assert impacts == sorted(impacts, reverse=True), "PRD 6: top_factors harus terurut menurun menurut |impact_usd|"


def test_predict_top_factors_have_no_duplicate_features(any_model_client):
    names = [f["feature"] for f in any_model_client.post("/predict", json=valid_payload()).json()["top_factors"]]
    assert len(names) == len(set(names))


def test_predict_is_deterministic(client):
    payload = valid_payload()
    first = client.post("/predict", json=payload).json()
    second = client.post("/predict", json=payload).json()
    assert first["predicted_price"] == second["predicted_price"]
    assert first["price_range"] == second["price_range"]


def test_predict_model_version_matches_health(client):
    assert client.post("/predict", json=valid_payload()).json()["model_version"] == client.get("/health").json()["model_version"]


def test_predict_responds_within_two_seconds(client):
    client.post("/predict", json=valid_payload())  # pemanasan
    start = time.perf_counter()
    assert client.post("/predict", json=valid_payload()).status_code == 200
    assert time.perf_counter() - start < 2.0, "PRD: POST /predict < 2 detik (di luar cold start)"


# ------------------------------------------------ kewajaran (sanity) ------------------------------------------------
def _price(client, **override) -> int:
    r = client.post("/predict", json=valid_payload() | override)
    assert r.status_code == 200, r.text
    return r.json()["predicted_price"]


@pytest.mark.parametrize("name", [n for n in ("OverallQual", "GrLivArea") if n in NUMERIC])
def test_price_increases_with_size_and_quality(any_model_client, name):
    """PRD Bagian 11: OverallQual naik -> harga naik; GrLivArea naik -> harga naik (ujung rentang)."""
    low = _price(any_model_client, **{name: NUMERIC[name]["min"]})
    high = _price(any_model_client, **{name: NUMERIC[name]["max"]})
    assert high > low, f"{name}: harga di batas atas ({high}) tidak lebih tinggi dari batas bawah ({low})"


def test_prices_are_plausible_for_ames(any_model_client):
    cheapest = {n: s["min"] for n, s in NUMERIC.items() if n in ("OverallQual", "GrLivArea", "TotalBsmtSF", "GarageCars")}
    priciest = {n: s["max"] for n, s in NUMERIC.items() if n in ("OverallQual", "GrLivArea", "TotalBsmtSF", "GarageCars")}
    assert 0 < _price(any_model_client, **cheapest)
    assert _price(any_model_client) < 1_500_000
    assert _price(any_model_client, **priciest) < 5_000_000


def test_price_range_is_not_degenerate(any_model_client):
    body = any_model_client.post("/predict", json=valid_payload()).json()
    assert body["price_range"]["low"] < body["predicted_price"] < body["price_range"]["high"]


def test_health_and_predict_report_same_model_version(any_model_client):
    assert any_model_client.post("/predict", json=valid_payload()).json()["model_version"] == any_model_client.get("/health").json()["model_version"]


@pytest.mark.xfail(
    reason="api/main.py::_build_top_factors masih PLACEHOLDER (nilai tetap). Akan lolos setelah memakai src.explainer.explain().",
    strict=False,
)
def test_top_factors_depend_on_input(any_model_client):
    """Faktor penentu harus berubah menurut input; jika tidak, itu bukan hasil penjelasan model."""
    a = any_model_client.post("/predict", json=valid_payload() | {"OverallQual": 2}).json()["top_factors"]
    b = any_model_client.post("/predict", json=valid_payload() | {"OverallQual": 10}).json()["top_factors"]
    assert a != b


@pytest.mark.xfail(
    reason="Placeholder: API melaporkan explanation_method asli padahal top_factors masih nilai tetap (lihat _build_top_factors).",
    strict=False,
)
def test_explanation_method_is_honest(any_model_client):
    body = any_model_client.post("/predict", json=valid_payload()).json()
    if body["explanation_method"] == "placeholder":
        pytest.skip("model stub mengaku placeholder, tidak ada klaim yang perlu dicek")
    fixed = {("OverallQual", 24000), ("GrLivArea", 15000), ("Neighborhood", 8000), ("HouseAge", -4500), ("TotalSF", 3000)}
    assert {(f["feature"], f["impact_usd"]) for f in body["top_factors"]} != fixed


@pytest.mark.parametrize("name", list(CATEGORICAL))
def test_predict_accepts_every_category(client, name):
    for category in CATEGORICAL[name]["categories"]:
        r = client.post("/predict", json=valid_payload() | {name: category})
        assert r.status_code == 200, f"{name}={category}: {r.text}"
        body = r.json()
        assert 0 <= body["price_range"]["low"] <= body["predicted_price"] <= body["price_range"]["high"]


@pytest.mark.parametrize("name", list(NUMERIC))
def test_predict_accepts_boundary_values(client, name):
    spec = NUMERIC[name]
    cast = int if spec["type"] == "int" else float
    for value in (cast(spec["min"]), cast(spec["max"])):
        r = client.post("/predict", json=valid_payload() | {name: value})
        assert r.status_code == 200, f"{name}={value}: {r.text}"
        body = r.json()
        assert 0 <= body["price_range"]["low"] <= body["predicted_price"] <= body["price_range"]["high"]


# ------------------------------------------------ /predict: input tidak valid -> 422 ------------------------------------------------
@pytest.mark.parametrize("name", list(NUMERIC))
def test_predict_rejects_out_of_range_numeric(client, name):
    spec = NUMERIC[name]
    for value in (spec["min"] - 1, spec["max"] + 1):
        r = client.post("/predict", json=valid_payload() | {name: value})
        assert r.status_code == 422, f"{name}={value} seharusnya ditolak"


@pytest.mark.parametrize("name", list(NUMERIC))
@pytest.mark.parametrize("bad", ["abc", "7", None, True, [1], {"a": 1}])
def test_predict_rejects_wrong_type_for_numeric(client, name, bad):
    assert client.post("/predict", json=valid_payload() | {name: bad}).status_code == 422, f"{name}={bad!r}"


@pytest.mark.parametrize("name", [n for n, s in NUMERIC.items() if s["type"] == "int"])
def test_predict_rejects_fractional_value_for_int_field(client, name):
    spec = NUMERIC[name]
    assert client.post("/predict", json=valid_payload() | {name: spec["min"] + 0.5}).status_code == 422


@pytest.mark.parametrize("name", list(CATEGORICAL))
@pytest.mark.parametrize("bad", ["KATEGORI_TIDAK_ADA", "", 5, None])
def test_predict_rejects_invalid_category(client, name, bad):
    assert client.post("/predict", json=valid_payload() | {name: bad}).status_code == 422, f"{name}={bad!r}"


@pytest.mark.parametrize("name", list(FEATURES))
def test_predict_rejects_missing_field(client, name):
    payload = valid_payload()
    payload.pop(name)
    assert client.post("/predict", json=payload).status_code == 422


def test_predict_rejects_extra_field(client):
    assert client.post("/predict", json=valid_payload() | {"PoolArea": 100}).status_code == 422


def test_predict_rejects_empty_and_malformed_body(client):
    assert client.post("/predict", json={}).status_code == 422
    assert client.post("/predict", json=[valid_payload()]).status_code == 422
    r = client.post("/predict", content="bukan json", headers={"Content-Type": "application/json"})
    assert r.status_code == 422


def test_validation_error_uses_default_fastapi_format(client):
    r = client.post("/predict", json=valid_payload() | {"OverallQual": 99})
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], list) and r.json()["detail"]


# ------------------------------------------------ 503 ------------------------------------------------
def test_predict_returns_503_when_model_not_loaded(client, monkeypatch):
    monkeypatch.setattr(client.app.state, "model", None)
    r = client.post("/predict", json=valid_payload())
    assert r.status_code == 503
    assert r.json() == {"detail": "Model belum siap"}


def test_predict_returns_503_when_meta_missing(client, monkeypatch):
    monkeypatch.setattr(client.app.state, "meta", None)
    assert client.post("/predict", json=valid_payload()).status_code == 503


def test_invalid_input_is_checked_before_model_state(client, monkeypatch):
    """Input salah tetap 422 walau model belum siap? Dokumentasikan perilaku aktual: validasi dulu, lalu 503."""
    monkeypatch.setattr(client.app.state, "model", None)
    assert client.post("/predict", json=valid_payload() | {"OverallQual": 99}).status_code == 422


def test_unexpected_model_error_returns_generic_500(client, monkeypatch):
    class Boom:
        def predict(self, _):
            raise RuntimeError("rahasia internal: /path/ke/server")

    monkeypatch.setattr(client.app.state, "model", Boom())
    r = client.post("/predict", json=valid_payload())
    assert r.status_code == 500
    assert r.json() == {"detail": "Terjadi kesalahan pada server"}
    assert "rahasia" not in r.text  # detail internal tidak boleh bocor ke klien


# ------------------------------------------------ CORS ------------------------------------------------
@pytest.mark.parametrize("origin", UI_CORS_ORIGINS)
def test_cors_preflight_allows_ui_origins(client, origin):
    r = client.options(
        "/predict",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == origin


def test_cors_blocks_unknown_origin(client):
    r = client.options(
        "/predict",
        headers={"Origin": "https://situs-jahat.example.com", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in r.headers


def test_cors_header_present_on_actual_response(client):
    r = client.post("/predict", json=valid_payload(), headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_config_model_version_is_consistent():
    assert isinstance(MODEL_VERSION, str) and MODEL_VERSION
