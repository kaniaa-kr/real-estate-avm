"""
Sumber kebenaran (Single Source of Truth) untuk konfigurasi proyek & fitur UI.
Owner: Role 3 (Data Engineer) — keputusan daftar fitur final oleh Role 1.
"""

from typing import Any

TARGET: str = "SalePrice"
REF_YEAR: int = 2010
RANDOM_STATE: int = 42
TEST_SIZE: float = 0.2
MODEL_VERSION: str = "v1"
ENGINEERED_FEATURES: list[str] = ["TotalSF", "HouseAge"]

# Kandidat awal 10 fitur UI (PRD Bagian 3) — rentang & kategori dari Ames train.csv
FEATURES: dict[str, dict[str, Any]] = {
    "OverallQual": {
        "type": "int",
        "min": 1,
        "max": 10,
        "default": 6,
        "label": "Kualitas Material & Finishing Keseluruhan",
        "help": "Skala 1 (sangat buruk) hingga 10 (sangat istimewa).",
    },
    "GrLivArea": {
        "type": "float",
        "min": 334.0,
        "max": 5642.0,
        "default": 1500.0,
        "label": "Luas Area Tinggal di Atas Tanah (sq ft)",
        "help": "Total luas lantai utama di atas permukaan tanah (tidak termasuk basement).",
    },
    "TotalBsmtSF": {
        "type": "float",
        "min": 0.0,
        "max": 6110.0,
        "default": 1000.0,
        "label": "Total Luas Basement (sq ft)",
        "help": "Isi 0 jika rumah tidak memiliki basement.",
    },
    "YearBuilt": {
        "type": "int",
        "min": 1872,
        "max": 2010,
        "default": 2000,
        "label": "Tahun Dibangun",
        "help": "Tahun pembangunan asli rumah (maksimal 2010 sesuai cakupan data Ames).",
    },
    "Neighborhood": {
        "type": "category",
        "categories": [
            "Blmngtn",
            "Blueste",
            "BrDale",
            "BrkSide",
            "ClearCr",
            "CollgCr",
            "Crawfor",
            "Edwards",
            "Gilbert",
            "IDOTRR",
            "MeadowV",
            "Mitchel",
            "NAmes",
            "NPkVill",
            "NWAmes",
            "NoRidge",
            "NridgHt",
            "OldTown",
            "SWISU",
            "Sawyer",
            "SawyerW",
            "Somerst",
            "StoneBr",
            "Timber",
            "Veenker",
        ],
        "default": "CollgCr",
        "label": "Lokasi Lingkungan (Neighborhood)",
        "help": "Pilih kawasan lingkungan perumahan di kota Ames, Iowa.",
    },
    "GarageCars": {
        "type": "int",
        "min": 0,
        "max": 4,
        "default": 2,
        "label": "Kapasitas Garasi (Jumlah Mobil)",
        "help": "Jumlah mobil yang dapat ditampung garasi (isi 0 jika tidak ada garasi).",
    },
    "FullBath": {
        "type": "int",
        "min": 0,
        "max": 3,
        "default": 2,
        "label": "Jumlah Kamar Mandi Utama (Full Bath)",
        "help": "Jumlah kamar mandi lengkap di atas lantai basement.",
    },
    "KitchenQual": {
        "type": "category",
        "categories": ["Po", "Fa", "TA", "Gd", "Ex"],
        "default": "TA",
        "label": "Kualitas Dapur",
        "help": "Po: Kurang, Fa: Cukup, TA: Rata-rata/Standar, Gd: Baik, Ex: Istimewa.",
    },
    "LotArea": {
        "type": "float",
        "min": 1300.0,
        "max": 215245.0,
        "default": 9500.0,
        "label": "Luas Tanah / Kavling (sq ft)",
        "help": "Total luas lahan properti dalam satuan square feet.",
    },
    "Fireplaces": {
        "type": "int",
        "min": 0,
        "max": 3,
        "default": 1,
        "label": "Jumlah Perapian (Fireplaces)",
        "help": "Jumlah perapian di dalam rumah (isi 0 jika tidak ada).",
    },
}

FEATURE_NAMES: list[str] = list(FEATURES.keys())