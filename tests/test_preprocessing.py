
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from src.config import FEATURE_NAMES, REF_YEAR
from src.features import HouseFeatureEngineer
from src.preprocessing import build_preprocessor


def _make_sample_ui10() -> pd.DataFrame:
    """Membuat sampel kecil DataFrame mentah dengan tepat 10 kolom UI."""
    return pd.DataFrame(
        [
            {
                "OverallQual": 7,
                "GrLivArea": 1800,
                "TotalBsmtSF": 900,
                "YearBuilt": 2001,
                "Neighborhood": "CollgCr",
                "GarageCars": 2,
                "FullBath": 2,
                "LotArea": 8450,
                "Fireplaces": 1,
                "KitchenQual": "Gd",
            },
            {
                "OverallQual": 5,
                "GrLivArea": 1100,
                "TotalBsmtSF": 0,
                "YearBuilt": 1975,
                "Neighborhood": "NAmes",
                "GarageCars": 1,
                "FullBath": 1,
                "LotArea": 7200,
                "Fireplaces": 0,
                "KitchenQual": "TA",
            },
            {
                "OverallQual": 8,
                "GrLivArea": 2200,
                "TotalBsmtSF": 1200,
                "YearBuilt": 2008,
                "Neighborhood": "Somerst",
                "GarageCars": 3,
                "FullBath": 2,
                "LotArea": 11200,
                "Fireplaces": 2,
                "KitchenQual": "Ex",
            },
        ]
    )


def test_house_feature_engineer_creates_expected_columns() -> None:
    df = _make_sample_ui10()
    eng = HouseFeatureEngineer(ref_year=REF_YEAR)
    out = eng.fit_transform(df)

    assert "YearBuilt" not in out.columns
    assert "TotalSF" in out.columns
    assert "HouseAge" in out.columns
    assert out["TotalSF"].tolist() == [2700, 1100, 3400]
    assert out["HouseAge"].tolist() == [9, 35, 2]
    assert list(eng.get_feature_names_out()) == list(out.columns)


@pytest.mark.parametrize("for_linear", [False, True])
def test_ui10_preprocessor_fit_transform_and_feature_names(for_linear: bool) -> None:
    df = _make_sample_ui10()
    # Acak urutan kolom input untuk memastikan pemilihan berdasarkan nama, bukan urutan
    shuffled_df = df[list(reversed(FEATURE_NAMES))]

    pipe = build_preprocessor(feature_set="ui10", for_linear=for_linear)
    X_trans = pipe.fit_transform(shuffled_df)
    feat_names = pipe.get_feature_names_out()

    assert not np.isnan(X_trans).any()
    assert X_trans.shape[0] == len(df)
    assert X_trans.shape[1] == len(feat_names)


def test_ui10_handles_unseen_categories_without_error() -> None:
    train_df = _make_sample_ui10()
    pipe = build_preprocessor(feature_set="ui10", for_linear=True)
    pipe.fit(train_df)

    test_df = _make_sample_ui10().iloc[[0]].copy()
    test_df["Neighborhood"] = "KategoriBaruTidakDikenal"
    test_df["KitchenQual"] = "Po"

    X_test_trans = pipe.transform(test_df)
    assert not np.isnan(X_test_trans).any()
    assert X_test_trans.shape[1] == len(pipe.get_feature_names_out())


def test_ui10_joblib_roundtrip(tmp_path: Path) -> None:
    df = _make_sample_ui10()
    pipe = build_preprocessor(feature_set="ui10", for_linear=True)
    expected = pipe.fit_transform(df)

    artifact_path = tmp_path / "preprocessor_test.joblib"
    joblib.dump(pipe, artifact_path, compress=3)
    loaded_pipe = joblib.load(artifact_path)

    actual = loaded_pipe.transform(df)
    np.testing.assert_allclose(actual, expected)
    assert list(loaded_pipe.get_feature_names_out()) == list(pipe.get_feature_names_out())


def test_full_preprocessor_on_raw_dataset_if_available() -> None:
    raw_path = Path("data/raw/train.csv")
    if not raw_path.exists():
        pytest.skip("data/raw/train.csv belum tersedia di lokal.")

    df = pd.read_csv(raw_path).head(30)
    X = df.drop(columns=["SalePrice"])

    for for_linear in (False, True):
        pipe = build_preprocessor(feature_set="full", for_linear=for_linear)
        X_trans = pipe.fit_transform(X)
        feat_names = pipe.get_feature_names_out()

        assert not np.isnan(X_trans).any()
        assert X_trans.shape[0] == len(X)
        assert X_trans.shape[1] == len(feat_names)
        assert not any("Id" == name or "YearBuilt" == name for name in feat_names)