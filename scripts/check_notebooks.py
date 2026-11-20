"""Cek aturan AGENTS.md pada notebook: tanpa class kustom, tanpa lambda di
FunctionTransformer, dan tanpa hardcode path lokal.

Dijalankan dari root repo:  python scripts/check_notebooks.py
Exit code 0 = lolos, 1 = ada pelanggaran.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTEBOOK_DIR = ROOT / "notebooks"

RULES = [
    (
        re.compile(r"^\s*class\s+\w+"),
        "definisi class di notebook (pindahkan ke src/features.py)",
    ),
    (
        re.compile(r"FunctionTransformer\s*\(\s*(func\s*=\s*)?lambda"),
        "lambda pada FunctionTransformer (tidak bisa di-pickle)",
    ),
    (
        re.compile(r"/content/drive|[A-Za-z]:\\\\?Users|/home/\w+/|/Users/\w+/"),
        "hardcode path lokal (gunakan pathlib relatif terhadap root repo)",
    ),
]


def cell_lines(cell):
    source = cell.get("source", "")
    if isinstance(source, list):
        source = "".join(source)
    return source.splitlines()


def check_notebook(path):
    problems = []
    try:
        notebook = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"{path.name}: tidak bisa dibaca sebagai notebook ({exc})"]

    for cell_no, cell in enumerate(notebook.get("cells", []), start=1):
        if cell.get("cell_type") != "code":
            continue
        for line_no, line in enumerate(cell_lines(cell), start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith(("#", "!", "%")):
                continue
            for pattern, message in RULES:
                if pattern.search(line):
                    problems.append(
                        f"{path.name} | sel kode #{cell_no}, baris {line_no}: {message}"
                    )
    return problems


def main():
    notebooks = sorted(NOTEBOOK_DIR.glob("*.ipynb")) if NOTEBOOK_DIR.exists() else []
    if not notebooks:
        print("Tidak ada notebook untuk diperiksa. Lolos.")
        return 0

    all_problems = []
    for path in notebooks:
        all_problems.extend(check_notebook(path))

    if all_problems:
        print("PELANGGARAN ditemukan:")
        for item in all_problems:
            print(f" - {item}")
        return 1

    print(f"{len(notebooks)} notebook diperiksa. Lolos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
