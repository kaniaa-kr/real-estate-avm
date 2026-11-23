"""Tes dasar API (Step 1, memakai model stub). Tes lengkap: tests/test_api.py (Role 2)."""

import pytest
from fastapi.testclient import TestClient

from api.main import app
from src.config import FEATURES


def valid_payload() -> dict:
    return {name: spec["default"] for name, spec in FEATURES.items()}


@pytest.fixture()
def client():
    # `with` memicu lifespan sehingga model termuat
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True


def test_model_info(client):
    response = client.get("/model-info")
    assert response.status_code == 200
    body = response.json()
    assert set(body["features_used"]) == set(FEATURES)
    assert {"q_low", "q_high"} <= set(body["interval"])


def test_predict_valid(client):
    response = client.post("/predict", json=valid_payload())
    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["price_range"]["low"] <= body["predicted_price"] <= body["price_range"]["high"]
    assert 0 < len(body["top_factors"]) <= 5
    for factor in body["top_factors"]:
        assert factor["direction"] == ("up" if factor["impact_usd"] >= 0 else "down")
    assert "Ames" in body["disclaimer"]


@pytest.mark.parametrize(
    "field, value",
    [
        ("OverallQual", 11),          # di atas batas
        ("OverallQual", 0),           # di bawah batas
        ("YearBuilt", 2011),          # melewati cakupan data (maks 2010)
        ("OverallQual", 7.5),         # bukan bilangan bulat
        ("Neighborhood", "Jakarta"),  # kategori tidak dikenal
        ("KitchenQual", "XX"),        # kategori tidak dikenal
        ("GrLivArea", "besar"),       # tipe salah
    ],
)
def test_predict_rejects_invalid_values(client, field, value):
    payload = valid_payload()
    payload[field] = value
    assert client.post("/predict", json=payload).status_code == 422


def test_predict_rejects_extra_field(client):
    payload = valid_payload() | {"PoolArea": 100}
    assert client.post("/predict", json=payload).status_code == 422


def test_predict_rejects_missing_field(client):
    payload = valid_payload()
    payload.pop("Neighborhood")
    assert client.post("/predict", json=payload).status_code == 422


def test_predict_returns_503_when_model_not_loaded(client, monkeypatch):
    monkeypatch.setattr(client.app.state, "model", None)
    response = client.post("/predict", json=valid_payload())
    assert response.status_code == 503
    assert response.json() == {"detail": "Model belum siap"}
