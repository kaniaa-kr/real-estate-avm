"""
Mengekspor konfigurasi 10 fitur UI dari src/config.py ke frontend/public/features.json.
Owner: Role 3 (Data Engineer).
"""

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.config import ENGINEERED_FEATURES, FEATURES, MODEL_VERSION, REF_YEAR, TARGET


def export_features_json(output_path: Path) -> None:
    """Bangun payload JSON terstruktur untuk frontend dari src/config.py."""
    features_list = []
    for name, spec in FEATURES.items():
        item = {
            "name": name,
            "label": spec["label"],
            "type": spec["type"],
            "unit": spec.get("unit", ""),
            "default": spec.get("default"),
            "help": spec.get("help", ""),
        }
        if spec["type"] in ("int", "float"):
            item["min"] = spec["min"]
            item["max"] = spec["max"]
        elif spec["type"] == "category":
            item["categories"] = spec["categories"]
            if spec.get("ordinal"):
                item["ordinal"] = True
        features_list.append(item)

    payload = {
        "model_version": MODEL_VERSION,
        "target": TARGET,
        "ref_year": REF_YEAR,
        "engineered_features": ENGINEERED_FEATURES,
        "features": features_list,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    target_file = ROOT_DIR / "frontend" / "public" / "features.json"
    export_features_json(target_file)
    print(f"Berhasil mengekspor {len(FEATURES)} fitur ke {target_file}")