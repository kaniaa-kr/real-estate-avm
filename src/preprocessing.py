from __future__ import annotations

from typing import Literal

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, OrdinalEncoder, StandardScaler

from src.config import FEATURE_NAMES, REF_YEAR
from src.features import HouseFeatureEngineer

# Pemetaan NA bermakna dari reports/na_mapping.csv (Role 2)
MEANINGFUL_NA_CAT_COLS: list[str] = [
    "PoolQC",
    "MiscFeature",
    "Alley",
    "Fence",
    "FireplaceQu",
    "GarageType",
    "GarageFinish",
    "GarageQual",
    "GarageCond",
    "BsmtQual",
    "BsmtCond",
    "BsmtExposure",
    "BsmtFinType1",
    "BsmtFinType2",
]
MEANINGFUL_NA_NUM_COLS: list[str] = ["GarageYrBlt"]

# Kolom kualitas ordinal berurutan (Po < Fa < TA < Gd < Ex) + 'None' di paling bawah untuk full
ORDINAL_QUALITY_UI10: list[str] = ["KitchenQual"]
ORDINAL_QUALITY_FULL: list[str] = [
    "ExterQual",
    "ExterCond",
    "BsmtQual",
    "BsmtCond",
    "HeatingQC",
    "KitchenQual",
    "FireplaceQu",
    "GarageQual",
    "GarageCond",
    "PoolQC",
]

# Fitur numerik miring (skewed) yang di-log1p hanya jika for_linear=True
SKEWED_NUM_COLS: set[str] = {"GrLivArea", "TotalBsmtSF", "TotalSF", "LotArea"}


def _clip_non_negative_log1p(X: np.ndarray) -> np.ndarray:
    """Fungsi bernama (tanpa lambda) untuk log1p aman pada nilai >= 0."""
    return np.log1p(np.clip(X, a_min=0, a_max=None))


class AmesColumnSelector(BaseEstimator, TransformerMixin):
    """Memilih kolom berdasarkan nama (bukan urutan) serta membuang Id jika full."""

    def __init__(self, feature_set: Literal["ui10", "full"] = "ui10") -> None:
        self.feature_set = feature_set

    def fit(self, X: pd.DataFrame, y=None) -> "AmesColumnSelector":
        if not isinstance(X, pd.DataFrame):
            raise TypeError("Input X harus berupa pandas.DataFrame.")

        if self.feature_set == "ui10":
            missing = [c for c in FEATURE_NAMES if c not in X.columns]
            if missing:
                raise ValueError(f"Kolom UI wajib tidak ditemukan: {missing}")
            self.selected_cols_ = list(FEATURE_NAMES)
        elif self.feature_set == "full":
            self.selected_cols_ = [c for c in X.columns if c not in ("Id", "SalePrice")]
        else:
            raise ValueError("feature_set harus 'ui10' atau 'full'.")

        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            raise TypeError("Input X harus berupa pandas.DataFrame.")
        return X[self.selected_cols_].copy()

    def get_feature_names_out(self, input_features=None) -> np.ndarray:
        return np.asarray(self.selected_cols_, dtype=object)


def _build_num_branch(
    cols: list[str],
    fill_strategy: Literal["median", "constant"] = "median",
    fill_value: float | int = 0,
    use_log1p: bool = False,
    for_linear: bool = False,
) -> Pipeline:
    """Membuat sub-pipeline numerik dengan imputasi, opsional log1p, dan opsional scaler."""
    steps: list[tuple[str, BaseEstimator]] = []
    if fill_strategy == "constant":
        steps.append(("imputer", SimpleImputer(strategy="constant", fill_value=fill_value)))
    else:
        steps.append(("imputer", SimpleImputer(strategy="median")))

    if for_linear and use_log1p:
        steps.append(
            (
                "log1p",
                FunctionTransformer(
                    _clip_non_negative_log1p,
                    feature_names_out="one-to-one",
                ),
            )
        )

    if for_linear:
        steps.append(("scaler", StandardScaler()))

    return Pipeline(steps)


def build_preprocessor(
    feature_set: Literal["ui10", "full"] = "ui10",
    for_linear: bool = False,
) -> Pipeline:
    """
    Membangun scikit-learn Pipeline lengkap untuk preprocessing.

    Parameters
    ----------
    feature_set : {'ui10', 'full'}
        'ui10' untuk Skenario 2 (10 fitur UI + rekayasa fitur),
        'full' untuk Skenario 1 (benchmark seluruh fitur dataset).
    for_linear : bool
        Jika True, mengaktifkan log1p pada fitur miring dan StandardScaler.
    """
    if feature_set not in ("ui10", "full"):
        raise ValueError("feature_set harus 'ui10' atau 'full'.")

    # Daftar kolom setelah HouseFeatureEngineer (YearBuilt dibuang, TotalSF & HouseAge ditambah)
    if feature_set == "ui10":
        base_cols = [c for c in FEATURE_NAMES if c != "YearBuilt"] + ["TotalSF", "HouseAge"]
        ordinal_cols = [c for c in ORDINAL_QUALITY_UI10 if c in base_cols]
        ordinal_categories = [["Po", "Fa", "TA", "Gd", "Ex"] for _ in ordinal_cols]
        nominal_cols = [c for c in base_cols if c in ("Neighborhood",)]
        num_cols = [c for c in base_cols if c not in ordinal_cols and c not in nominal_cols]

        skewed_cols = [c for c in num_cols if c in SKEWED_NUM_COLS]
        regular_num_cols = [c for c in num_cols if c not in SKEWED_NUM_COLS]

        transformers = [
            (
                "num_skewed",
                _build_num_branch(skewed_cols, "median", use_log1p=True, for_linear=for_linear),
                skewed_cols,
            ),
            (
                "num_regular",
                _build_num_branch(regular_num_cols, "median", use_log1p=False, for_linear=for_linear),
                regular_num_cols,
            ),
            (
                "ordinal_qual",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "encoder",
                            OrdinalEncoder(
                                categories=ordinal_categories,
                                handle_unknown="use_encoded_value",
                                unknown_value=-1,
                            ),
                        ),
                    ]
                ),
                ordinal_cols,
            ),
            (
                "nominal",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                nominal_cols,
            ),
        ]
    else:
        # Skenario 1 ('full'): memisahkan NA bermakna ('None' / 0) vs missing murni (median / modus)
        # Daftar kolom kategorikal & numerik standar Ames Housing (79 fitur - YearBuilt + TotalSF + HouseAge)
        all_full_cat = [
            "MSZoning", "Street", "Alley", "LotShape", "LandContour", "Utilities",
            "LotConfig", "LandSlope", "Neighborhood", "Condition1", "Condition2",
            "BldgType", "HouseStyle", "RoofStyle", "RoofMatl", "Exterior1st",
            "Exterior2nd", "MasVnrType", "ExterQual", "ExterCond", "Foundation",
            "BsmtQual", "BsmtCond", "BsmtExposure", "BsmtFinType1", "BsmtFinType2",
            "Heating", "HeatingQC", "CentralAir", "Electrical", "KitchenQual",
            "Functional", "FireplaceQu", "GarageType", "GarageFinish", "GarageQual",
            "GarageCond", "PavedDrive", "PoolQC", "Fence", "MiscFeature",
            "SaleType", "SaleCondition",
        ]
        all_full_num = [
            "MSSubClass", "LotFrontage", "LotArea", "OverallQual", "OverallCond",
            "YearRemodAdd", "MasVnrArea", "BsmtFinSF1", "BsmtFinSF2", "BsmtUnfSF",
            "TotalBsmtSF", "1stFlrSF", "2ndFlrSF", "LowQualFinSF", "GrLivArea",
            "BsmtFullBath", "BsmtHalfBath", "FullBath", "HalfBath", "BedroomAbvGr",
            "KitchenAbvGr", "TotRmsAbvGrd", "Fireplaces", "GarageYrBlt", "GarageCars",
            "GarageArea", "WoodDeckSF", "OpenPorchSF", "EnclosedPorch", "3SsnPorch",
            "ScreenPorch", "PoolArea", "MiscVal", "MoSold", "YrSold",
            "TotalSF", "HouseAge",
        ]

        ordinal_cols = [c for c in ORDINAL_QUALITY_FULL if c in all_full_cat]
        # Urutan kualitas dengan 'None' di level terendah (0) untuk NA bermakna
        ordinal_categories = [["None", "Po", "Fa", "TA", "Gd", "Ex"] for _ in ordinal_cols]

        meaningful_nom_cols = [
            c for c in all_full_cat if c in MEANINGFUL_NA_CAT_COLS and c not in ordinal_cols
        ]
        pure_missing_nom_cols = [
            c for c in all_full_cat if c not in MEANINGFUL_NA_CAT_COLS and c not in ordinal_cols
        ]

        meaningful_num_cols = [c for c in all_full_num if c in MEANINGFUL_NA_NUM_COLS]
        skewed_num_cols = [
            c for c in all_full_num if c not in MEANINGFUL_NA_NUM_COLS and c in SKEWED_NUM_COLS
        ]
        regular_num_cols = [
            c for c in all_full_num if c not in MEANINGFUL_NA_NUM_COLS and c not in SKEWED_NUM_COLS
        ]

        transformers = [
            (
                "num_skewed",
                _build_num_branch(skewed_num_cols, "median", use_log1p=True, for_linear=for_linear),
                skewed_num_cols,
            ),
            (
                "num_regular",
                _build_num_branch(regular_num_cols, "median", use_log1p=False, for_linear=for_linear),
                regular_num_cols,
            ),
            (
                "num_meaningful_na",
                _build_num_branch(
                    meaningful_num_cols, "constant", fill_value=0, use_log1p=False, for_linear=for_linear
                ),
                meaningful_num_cols,
            ),
            (
                "ordinal_qual",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="constant", fill_value="None")),
                        (
                            "encoder",
                            OrdinalEncoder(
                                categories=ordinal_categories,
                                handle_unknown="use_encoded_value",
                                unknown_value=-1,
                            ),
                        ),
                    ]
                ),
                ordinal_cols,
            ),
            (
                "nominal_meaningful_na",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="constant", fill_value="None")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                meaningful_nom_cols,
            ),
            (
                "nominal_pure_missing",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                pure_missing_nom_cols,
            ),
        ]

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
        verbose_feature_names_out=False,
    )

    return Pipeline(
        [
            ("selector", AmesColumnSelector(feature_set=feature_set)),
            ("feature_engineer", HouseFeatureEngineer(ref_year=REF_YEAR)),
            ("preprocessor", preprocessor),
        ]
    )