"""
Sumber kebenaran tunggal (Single Source of Truth) untuk konfigurasi proyek & 10 fitur UI final.
Owner: Role 3 (Data Engineer) — daftar fitur dikunci bersama Role 1 di Step 2.
"""

from typing import Any

TARGET: str = "SalePrice"
REF_YEAR: int = 2010
RANDOM_STATE: int = 42
TEST_SIZE: float = 0.2
MODEL_VERSION: str = "v1"
ENGINEERED_FEATURES: list[str] = ["TotalSF", "HouseAge"]

# 10 Fitur Final UI (sesuai keputusan Role 1 di Step 2)
FEATURES: dict[str, dict[str, Any]] = {
    "OverallQual": {
        "type": "int",
        "min": 1,
        "max": 10,
        "default": 6,
        "unit": "skala 1-10",
        "label": "Kualitas Material & Finishing",
        "help": "1 = sangat buruk, 5 = rata-rata, 10 = sangat baik",
    },
    "GrLivArea": {
        "type": "int",
        "min": 334,
        "max": 5642,
        "default": 1500,
        "unit": "sq ft",
        "label": "Luas Area Hunian di Atas Tanah",
        "help": "Total luas semua lantai di atas tanah, tanpa basement (1 m² ≈ 10,76 sq ft)",
    },
    "TotalBsmtSF": {
        "type": "int",
        "min": 0,
        "max": 6110,
        "default": 1000,
        "unit": "sq ft",
        "label": "Luas Basement",
        "help": "Isi 0 jika tidak ada basement",
    },
    "YearBuilt": {
        "type": "int",
        "min": 1872,
        "max": 2010,  # Dibatasi <= 2010 agar HouseAge >= 0 (PRD Bagian 3)
        "default": 2000,
        "unit": "tahun",
        "label": "Tahun Dibangun",
        "help": "Tahun konstruksi asli, maksimal 2010",
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
        "unit": "",
        "label": "Lingkungan / Area",
        "help": "Pilih area properti di kota Ames",
    },
    "GarageCars": {
        "type": "int",
        "min": 0,
        "max": 4,
        "default": 2,
        "unit": "mobil",
        "label": "Kapasitas Garasi",
        "help": "Jumlah mobil yang muat; isi 0 jika tidak ada garasi",
    },
    "FullBath": {
        "type": "int",
        "min": 0,
        "max": 3,
        "default": 2,
        "unit": "unit",
        "label": "Jumlah Kamar Mandi Lengkap",
        "help": "Kamar mandi dengan toilet, wastafel, dan shower/bak mandi di atas tanah",
    },
    "LotArea": {
        "type": "int",
        "min": 1300,
        "max": 215245,
        "default": 9500,
        "unit": "sq ft",
        "label": "Luas Tanah",
        "help": "Luas seluruh kavling, bukan hanya bangunan",
    },
    "Fireplaces": {
        "type": "int",
        "min": 0,
        "max": 3,
        "default": 1,
        "unit": "unit",
        "label": "Jumlah Perapian",
        "help": "Isi 0 jika tidak ada",
    },
    "KitchenQual": {
        "type": "category",
        "categories": ["Fa", "TA", "Gd", "Ex"],
        "ordinal": True,
        "default": "TA",
        "unit": "",
        "label": "Kualitas Dapur",
        "help": "Ex = istimewa, Gd = baik, TA = rata-rata, Fa = cukup/kurang",
    },
}

FEATURE_NAMES: list[str] = list(FEATURES.keys())