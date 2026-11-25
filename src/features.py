
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

from src.config import REF_YEAR


class HouseFeatureEngineer(BaseEstimator, TransformerMixin):
    """Membuat fitur turunan TotalSF dan HouseAge, lalu membuang YearBuilt."""

    def __init__(self, ref_year: int = REF_YEAR) -> None:
        self.ref_year = ref_year

    def fit(self, X: pd.DataFrame, y=None) -> "HouseFeatureEngineer":
        if not isinstance(X, pd.DataFrame):
            raise TypeError("Input X harus berupa pandas.DataFrame.")
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not isinstance(X, pd.DataFrame):
            raise TypeError("Input X harus berupa pandas.DataFrame.")

        df = X.copy()
        df["TotalSF"] = df["GrLivArea"] + df["TotalBsmtSF"]
        df["HouseAge"] = self.ref_year - df["YearBuilt"]
        df = df.drop(columns=["YearBuilt"])
        return df

    def get_feature_names_out(self, input_features=None) -> np.ndarray:
        if input_features is None:
            if not hasattr(self, "feature_names_in_"):
                raise AttributeError("Transformer belum di-fit.")
            cols = list(self.feature_names_in_)
        else:
            cols = list(input_features)

        out_cols = [c for c in cols if c != "YearBuilt"] + ["TotalSF", "HouseAge"]
        return np.asarray(out_cols, dtype=object)