"""Evaluasi model & rentang prediksi

Konvensi: semua target / prediksi model berada pada skala log1p.
Fungsi yang menghasilkan angka USD memakai np.expm1.
"""
from __future__ import annotations

import numpy as np
from sklearn.base import clone
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_predict


def ui_columns() -> list[str]:
    """Daftar nama kolom 10 fitur UI dari src/config.py (FEATURES).

    Mendukung FEATURES berupa dict {nama: spec}, list nama, atau list dict/objek.
    Jika struktur config berbeda, cukup sesuaikan fungsi ini.
    """
    from src import config

    feats = config.FEATURES
    if isinstance(feats, dict):
        return list(feats.keys())
    cols: list[str] = []
    for f in feats:
        if isinstance(f, str):
            cols.append(f)
        elif isinstance(f, dict):
            for key in ("name", "column", "col", "feature"):
                if key in f:
                    cols.append(f[key])
                    break
            else:
                raise KeyError(f"Tidak menemukan nama kolom pada spec fitur: {f}")
        else:
            cols.append(getattr(f, "name", None) or getattr(f, "column"))
    return cols


# Metrik
def rmsle(y_true_log, y_pred_log) -> float:
    """RMSLE. Karena target sudah log1p, RMSLE = RMSE pada skala log."""
    return float(np.sqrt(mean_squared_error(y_true_log, y_pred_log)))


def usd_metrics(y_true_log, y_pred_log) -> dict:
    """MAE, RMSE (USD, setelah expm1) dan R2 (skala USD; R2 skala log ikut dicatat)."""
    y_true = np.expm1(np.asarray(y_true_log, dtype=float))
    y_pred = np.clip(np.expm1(np.asarray(y_pred_log, dtype=float)), 0, None)
    return {
        "mae_usd": float(mean_absolute_error(y_true, y_pred)),
        "rmse_usd": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
        "r2_log": float(r2_score(y_true_log, y_pred_log)),
    }


def full_metrics(y_true_log, y_pred_log) -> dict:
    """Gabungan metrik dua skala."""
    return {"rmsle": rmsle(y_true_log, y_pred_log), **usd_metrics(y_true_log, y_pred_log)}


# Rentang prediksi (low-high)


def oof_residuals(pipeline, X, y_log, cv, n_jobs: int = -1) -> np.ndarray:
    """Residual out-of-fold (y - prediksi) pada skala log, via cross_val_predict."""
    oof_pred = cross_val_predict(clone(pipeline), X, y_log, cv=cv, n_jobs=n_jobs)
    return np.asarray(y_log, dtype=float) - oof_pred


def oof_residual_quantiles(
    pipeline, X, y_log, cv, lower: float = 5, upper: float = 95, n_jobs: int = -1
) -> tuple[float, float]:
    """Persentil ke-`lower` dan ke-`upper` residual OOF (skala log)."""
    res = oof_residuals(pipeline, X, y_log, cv, n_jobs=n_jobs)
    q_low, q_high = np.percentile(res, [lower, upper])
    return float(q_low), float(q_high)


def apply_interval(pred_log, q_low: float, q_high: float):
    """Ubah prediksi log menjadi (low, pred, high) dalam USD.

    Menjamin 0 <= low <= pred <= high. Menerima skalar maupun array.
    """
    pred_log = np.asarray(pred_log, dtype=float)
    pred = np.clip(np.expm1(pred_log), 0, None)
    low = np.clip(np.expm1(pred_log + q_low), 0, None)
    high = np.expm1(pred_log + q_high)
    low = np.minimum(low, pred)
    high = np.maximum(high, pred)
    return low, pred, high


def coverage(y_true_usd, low, high) -> float:
    """Proporsi harga asli (USD) yang jatuh di dalam [low, high]."""
    y = np.asarray(y_true_usd, dtype=float)
    low = np.asarray(low, dtype=float)
    high = np.asarray(high, dtype=float)
    return float(np.mean((y >= low) & (y <= high)))
