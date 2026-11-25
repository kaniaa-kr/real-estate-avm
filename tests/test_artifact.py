import json
import os
import subprocess
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.evaluation import ui_columns  # noqa: E402

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "models/model_pipeline_stub.joblib"))
if not MODEL_PATH.is_absolute():
    MODEL_PATH = ROOT / MODEL_PATH

RAW_CSV = ROOT / "data" / "raw" / "train.csv"

CHILD_SCRIPT = """
import json, sys
import joblib, numpy as np, pandas as pd
from src.evaluation import ui_columns
pipe = joblib.load(sys.argv[1])
X = pd.read_csv(sys.argv[2])[ui_columns()].head(3)
pred = pipe.predict(X)
print(json.dumps([float(p) for p in pred]))
"""


def test_model_file_exists_and_light():
    assert MODEL_PATH.exists(), f"Artefak tidak ditemukan: {MODEL_PATH}"
    assert MODEL_PATH.stat().st_size < 25 * 1024 ** 2, "Artefak harus < 25 MB"


def test_load_and_predict_in_fresh_process():
    """Muat joblib di proses Python BARU (tanpa state notebook) lalu prediksi 3 contoh."""
    env = {**os.environ, "PYTHONPATH": str(ROOT)}
    out = subprocess.run(
        [sys.executable, "-c", CHILD_SCRIPT, str(MODEL_PATH), str(RAW_CSV)],
        cwd=ROOT, env=env, capture_output=True, text=True, timeout=300,
    )
    assert out.returncode == 0, out.stderr
    pred_log = np.array(json.loads(out.stdout.strip().splitlines()[-1]))
    assert pred_log.shape == (3,)
    assert np.isfinite(pred_log).all()
    assert (np.expm1(pred_log) > 0).all()


def test_explain_contract():
    """explain() memenuhi kontrak: <= 5 item, field lengkap, direction sesuai tanda."""
    pipe = joblib.load(MODEL_PATH)
    if not hasattr(pipe, "explain_background_"):
        pytest.skip("Artefak tanpa background explainer (stub); hanya berlaku untuk model asli.")
    from src.explainer import explain

    X = pd.read_csv(RAW_CSV)[ui_columns()].head(1)
    factors = explain(pipe, X, top_n=5)
    assert 1 <= len(factors) <= 5
    for f in factors:
        assert set(f) == {"feature", "impact_usd", "direction"}
        assert isinstance(f["impact_usd"], int)
        assert f["direction"] == ("up" if f["impact_usd"] >= 0 else "down")


def test_meta_matches_requirements_versions():
    """Versi library di meta v1 harus sama dengan requirements.txt."""
    meta_path = ROOT / "models" / "model_meta_v1.json"
    if "v1" not in MODEL_PATH.name or not meta_path.exists():
        pytest.skip("Hanya untuk model asli v1.")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    pins = {}
    for line in (ROOT / "requirements.txt").read_text().splitlines():
        if "==" in line:
            name, ver = line.split("==", 1)
            pins[name.strip().lower()] = ver.strip()
    for lib, ver in meta["library_versions"].items():
        if lib.lower() in pins:
            assert pins[lib.lower()] == ver, f"{lib}: meta={ver} vs requirements={pins[lib.lower()]}"