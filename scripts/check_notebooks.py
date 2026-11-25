"""Cek aturan AGENTS.md pada notebook: tanpa class kustom, tanpa lambda di
FunctionTransformer, tanpa hardcode path lokal, dan tanpa token/placeholder di
URL clone.

Sumber kode **dan** output notebook diperiksa, karena path lokal paling sering
bocor lewat output (mis. `CWD: c:\\Users\\...`) dan baris magic `!git clone`
sering dilewati oleh pemeriksa yang hanya melihat source.

Dijalankan dari root repo:  python scripts/check_notebooks.py
Exit code 0 = lolos, 1 = ada pelanggaran.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTEBOOK_DIR = ROOT / "notebooks"

# Aturan yang hanya berlaku untuk source (bukan output, bukan baris magic).
SOURCE_RULES = [
    (
        re.compile(r"^\s*class\s+\w+"),
        "definisi class di notebook (pindahkan ke src/features.py)",
    ),
    (
        re.compile(r"FunctionTransformer\s*\(\s*(func\s*=\s*)?lambda"),
        "lambda pada FunctionTransformer (tidak bisa di-pickle)",
    ),
]

# Path milik mesin pengembang; berlaku untuk source (termasuk baris `!`) dan output.
PATH_RULE = (
    re.compile(r"/content/drive|[A-Za-z]:\\\\?Users|/home/[A-Za-z0-9_.-]+/|/Users/[A-Za-z0-9_.-]+/"),
    "hardcode path lokal (gunakan pathlib relatif terhadap root repo)",
)

# Token/placeholder pada URL clone; berlaku untuk source dan output.
SECRET_RULE = (
    re.compile(r"github\.com/<org>|https://\{[^}]+\}@github\.com|gh[pousr]_[A-Za-z0-9]{20,}"),
    "token atau placeholder pada URL clone (pakai URL repo publik / Colab Secrets)",
)


def cell_lines(cell):
    source = cell.get("source", "")
    if isinstance(source, list):
        source = "".join(source)
    return source.splitlines()


def _iter_strings(value):
    """Ambil semua string dari output nbformat (str, list, atau list bertingkat)."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from _iter_strings(item)


def output_lines(cell):
    """Teks yang tercetak di output: stream, traceback, dan data text/plain|html."""
    for output in cell.get("outputs", []):
        for key in ("text", "traceback"):
            yield from _iter_strings(output.get(key, []))
        data = output.get("data", {})
        for mime in ("text/plain", "text/html"):
            yield from _iter_strings(data.get(mime, []))


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
            if not stripped or stripped.startswith("#"):
                continue
            if not stripped.startswith(("!", "%")):
                for pattern, message in SOURCE_RULES:
                    if pattern.search(line):
                        problems.append(
                            f"{path.name} | sel kode #{cell_no}, baris {line_no}: {message}"
                        )
            for pattern, message in (PATH_RULE, SECRET_RULE):
                if pattern.search(line):
                    problems.append(
                        f"{path.name} | sel kode #{cell_no}, baris {line_no}: {message}"
                    )

        for text in output_lines(cell):
            for out_line_no, line in enumerate(text.splitlines(), start=1):
                for pattern, message in (PATH_RULE, SECRET_RULE):
                    if pattern.search(line):
                        problems.append(
                            f"{path.name} | sel kode #{cell_no}, output baris {out_line_no}: {message}"
                        )

    # Hilangkan duplikat sambil mempertahankan urutan.
    return list(dict.fromkeys(problems))


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
