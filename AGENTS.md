# AGENTS.md — Pedoman Kerja AI Coding Assistant (v1.2)

Dokumen ini berisi aturan teknis ketat (*invariants*), struktur repositori, dan batas tanggung jawab tiap anggota tim. **AI Agent wajib membaca `PRD.md` lalu mematuhi seluruh aturan di bawah ini saat membuat atau mengubah kode, apa pun tool/LLM yang dipakai.** Jika sebuah permintaan bertentangan dengan `PRD.md` atau dokumen ini, agent harus memberi tahu pengguna alih-alih diam-diam melanggarnya.

## 1. Struktur Repositori & Kepemilikan File
```text
real-estate-avm/
├── .github/
│   ├── workflows/ci.yml          # Owner: Role 5 (cek notebook + pytest)
│   └── pull_request_template.md  # Owner: Role 5 (checklist PR)
├── .gitignore                    # Owner: Role 1 (.venv, .env, __pycache__, .ipynb_checkpoints, node_modules, .next)
├── .env.example                  # Owner: Role 5 (nama variabel saja: MODEL_PATH, META_PATH, ALLOWED_ORIGINS)
├── CLAUDE.md                     # Owner: Role 1 (satu baris: "@AGENTS.md")
├── GEMINI.md                     # Owner: Role 1 (opsional, satu baris: "@AGENTS.md", untuk Gemini CLI)
├── Dockerfile                    # Owner: Role 5 (HF Spaces/Render; CMD memakai ${PORT:-7860})
├── data/raw/train.csv            # Owner: Role 2 (data mentah, tidak diubah)
├── reports/
│   ├── figures/                  # Owner: Role 2 (grafik 300 DPI)
│   └── feature_candidates.csv    # Owner: Role 2 (bahan Role 1 memilih 10 fitur)
├── notebooks/
│   ├── 01_eda.ipynb              # Owner: Role 2
│   ├── 02_preprocessing.ipynb    # Owner: Role 3
│   └── 03_modeling.ipynb         # Owner: Role 4
├── src/
│   ├── __init__.py
│   ├── config.py                 # Owner: Role 3 (isi fitur diputuskan Role 1): sumber kebenaran fitur
│   ├── features.py               # Owner: Role 3 (custom transformer)
│   ├── preprocessing.py          # Owner: Role 3 (build_preprocessor)
│   ├── evaluation.py             # Owner: Role 4 (metrik, kuantil residual OOF, rentang harga)
│   └── explainer.py              # Owner: Role 4 (SHAP/ablation -> USD); dipanggil oleh Role 5
├── scripts/
│   ├── make_stub.py              # Owner: Role 4 (model stub Minggu 1)
│   ├── export_config.py          # Owner: Role 3 (config -> frontend/public/features.json)
│   └── check_notebooks.py        # Owner: Role 5 (CI: tolak class kustom di notebook)
├── api/
│   ├── main.py                   # Owner: Role 5 (FastAPI, CORS, endpoint)
│   └── schemas.py                # Owner: Role 5 (Pydantic; dibangun dari src/config.py)
├── frontend/                     # Owner: Role 5
│   ├── public/features.json      # Output: Role 3 (jangan diedit manual)
│   └── components/FactorChart.*  # Owner: Role 2 (grafik top_factors; sisanya Role 5)
├── models/
│   ├── model_pipeline_stub.joblib   # Output: Role 4 (make_stub.py)
│   ├── model_meta_stub.json         # Output: Role 4 (make_stub.py)
│   ├── model_pipeline_v1.joblib     # Output: Role 4
│   └── model_meta_v1.json           # Output: Role 4
├── tests/
│   ├── test_preprocessing.py     # Owner: Role 3
│   ├── test_schema_sync.py       # Owner: Role 2 (field schemas.py == FEATURES di config.py)
│   ├── test_artifact.py          # Owner: Role 4 (load joblib di proses bersih + predict contoh)
│   └── test_api.py               # Owner: Role 2 & 5
├── requirements.txt              # Owner: Role 3 (runtime/API, versi == dikunci)
├── requirements-dev.txt          # Owner: Role 3 (jupyter, matplotlib, seaborn, pytest, httpx)
├── PRD.md                        # Owner: Role 1
└── AGENTS.md                     # Shared
```
**Aturan kepemilikan:** hanya owner yang mengedit file-nya. Perubahan di file milik orang lain dilakukan lewat Pull Request atau permintaan ke owner, bukan edit langsung.

## 2. Aturan Teknis Ketat (JANGAN DILANGGAR)
1. **Anti Serialization Error (`joblib`):**
   - DILARANG mendefinisikan kelas *custom transformer* atau fungsi preprocessing di dalam sel notebook.
   - DILARANG memakai `lambda` pada `FunctionTransformer` (tidak bisa di-*pickle*, `joblib.dump` gagal). Gunakan fungsi bernama di `src/features.py` atau `np.log1p`.
   - Semua transformer ditulis di `src/features.py` dan diimpor dengan path identik (`from src.features import ...`) oleh notebook, skrip, tes, dan `api/main.py`.
   - Jalankan notebook dan API dari **root repo** agar path `src.` konsisten. Di Colab: clone repo, `pip install -r requirements.txt`, restart runtime.
2. **Sumber Kebenaran Fitur:**
   - Nama fitur, tipe, rentang, kategori, dan label hanya didefinisikan di `src/config.py`. Dilarang menulis ulang daftar fitur manual di `schemas.py`, pipeline, atau frontend. Frontend membaca `frontend/public/features.json` (hasil `scripts/export_config.py`).
   - Pipeline menerima `DataFrame` mentah dengan **tepat** kolom di `FEATURES`; pilih kolom berdasarkan nama, jangan asumsikan urutan.
3. **Builder Preprocessing:**
   - `build_preprocessor(feature_set="ui10" | "full", for_linear=False | True)`.
   - `StandardScaler` dan `log1p` pada fitur miring (`GrLivArea`, `TotalBsmtSF`, `TotalSF`, `LotArea`) hanya aktif jika `for_linear=True`.
   - Pada `feature_set="full"`: kolom `Id` dibuang; `NA` bermakna "fasilitas tidak ada" diisi kategori `"None"` (atau 0 untuk numerik) sesuai tabel pemetaan Role 2; missing murni diimputasi di dalam pipeline.
4. **Fitur Rekayasa & Waktu:**
   - `HouseAge = REF_YEAR − YearBuilt` dengan `REF_YEAR = 2010` dari config, BUKAN `datetime.now().year`.
   - `TotalSF = GrLivArea + TotalBsmtSF`.
   - Setelah `HouseAge` dibuat, buang `YearBuilt` dari matriks model (kolinear sempurna).
5. **Anti Data Leakage:**
   - Split dilakukan **di awal** dengan `random_state=RANDOM_STATE` dari config. **Seluruh EDA, ranking importance, dan keputusan outlier hanya memakai data latih.** Kedua skenario (fitur penuh & 10 fitur) memakai split yang sama.
   - Pembuangan outlier (mis. `GrLivArea > 4000` dengan `SalePrice < 300000`) HANYA pada `X_train`/`y_train`.
   - Semua `Imputer`, `Encoder`, `Scaler` berada di dalam `sklearn.pipeline.Pipeline` dan hanya di-`fit` pada data latih (atau lipatan latih saat CV).
   - **Model final dipilih berdasarkan skor CV pada Skenario 2**, bukan skor test. Test set dievaluasi **sekali** pada model terpilih.
6. **Penanganan `NA` Ames:** Pada fitur UI tidak ada `null`. Pisahkan `NA` bermakna "tidak ada" dari missing murni.
7. **Batasan Memori, Versi, & Konfigurasi:**
   - Random Forest: `n_estimators <= 100`, `max_depth <= 12`; `joblib.dump(pipeline, path, compress=3)`; ukuran < 25 MB.
   - `requirements.txt` mengunci versi exact (`==`) untuk `scikit-learn`, `pandas`, `numpy`, `joblib`, `shap`, `fastapi`, `pydantic`, `uvicorn`, dan **sama dengan versi di Colab**. Versi Python Colab = versi Python di `Dockerfile`. Semua versi dicatat ke `model_meta_v1.json`.
   - Lokasi model dibaca dari env `MODEL_PATH` dan `META_PATH` (bukan hardcode). Di Step 1 menunjuk ke stub, di Step 5 ke model asli.
   - Jika `shap` terlalu berat/bermasalah di free tier, gunakan metode *ablation* (lihat PRD Bagian 4) tanpa mengubah bentuk response.
8. **Konversi `top_factors` ke USD (`src/explainer.py`):**
   - Antarmuka tetap: `explain(pipeline, input_df, top_n=5) -> list[dict]` dengan kunci `feature`, `impact_usd`, `direction`; `api/main.py` hanya memanggil fungsi ini. (Di Step 1, API boleh memakai placeholder berbentuk sama.)
   - Hitung kontribusi pada ruang fitur hasil transformasi, **jumlahkan kolom one-hot kembali ke fitur asal** (`get_feature_names_out()`), lalu konversi: `impact_usd = round(np.expm1(base_value + contrib) - np.expm1(base_value))`.
   - Hasilnya aproksimasi per-fitur (tidak menjumlah persis ke selisih harga); jangan menyajikannya sebagai penjumlahan eksak.
   - `shap.TreeExplainer` untuk Random Forest; `LinearExplainer`/koefisien × (x − mean) untuk Ridge/Lasso; ablation sebagai cadangan.
9. **Rentang Prediksi (`src/evaluation.py`):**
   - Kuantil dari residual **out-of-fold** skala log pada data latih (persentil ke-5 dan ke-95), disimpan di `model_meta_v1.json`. Dilarang memakai residual in-sample.
   - `low = expm1(pred_log + q_low)`, `high = expm1(pred_log + q_high)`; pastikan `0 ≤ low ≤ pred ≤ high`.
   - Laporkan cakupan empiris pada test set; target ≥ 80% (jika kurang, perlebar kuantil).
10. **Validasi Input & Kontrak:**
    - `api/schemas.py` memakai `Literal[...]` untuk kategorikal dan `Field(ge=..., le=...)` untuk numerik, dibangun dari `src/config.py`; `extra="forbid"`; `YearBuilt` maksimal 2010.
    - Bentuk request/response/error harus 100% sesuai `PRD.md` Bagian 6. Mengubah kontrak = ubah `PRD.md` dulu lewat PR.
11. **Keamanan & Konfigurasi:**
    - Dilarang meng-commit rahasia (API key, `service_role` Supabase, token GitHub, `.env`). Di Colab gunakan *Colab Secrets*.
    - Origin CORS dari `ALLOWED_ORIGINS` plus `allow_origin_regex` untuk preview Vercel; dilarang `allow_origins=["*"]` di produksi. URL API di frontend lewat `NEXT_PUBLIC_API_URL`.
    - Response error tidak membocorkan stack trace.
12. **Path:** gunakan `pathlib.Path` relatif terhadap root repo; dilarang hardcode path lokal (`C:\Users\...`, `/content/drive/...`).

## 3. Instruksi Konteks Spesifik Per Role
- **Role 1 (Project Lead & Business Strategist):**
  - Bootstrap repo (`PRD.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`), lalu aktifkan ruleset `main`. Mengunci 10 fitur UI (bersama Role 3) dari `feature_candidates.csv` memakai kriteria di PRD Bagian 3, menginterpretasikan `top_factors` untuk rekomendasi bisnis, menyusun slide sesuai ketentuan dosen, dan memastikan disclaimer tampil di UI/laporan/slide. Tidak mengubah logika `src/` atau `api/` tanpa koordinasi Role 3, 4, dan 5.
- **Role 2 (Data Analyst: EDA & QA):**
  - Di `01_eda.ipynb`: split dulu, lalu gunakan data latih saja; bedakan `NA` bermakna vs missing murni (simpan sebagai tabel untuk Role 3); tandai outlier (penghapusan dilakukan di pipeline training); hasilkan `reports/feature_candidates.csv`; ekspor grafik 300 DPI ke `reports/figures/`. Tulis `tests/test_schema_sync.py` dan `tests/test_api.py` (payload valid `200`, di luar batas/field extra `422`, model belum siap `503`, invarian response). Bangun `FactorChart` (hijau `"up"`, oranye/merah `"down"`) bersama Role 5.
- **Role 3 (Data Engineer: Preprocessing & Feature Engineering):**
  - Tulis `src/config.py`, `src/features.py`, `src/preprocessing.py`, `scripts/export_config.py`, `tests/test_preprocessing.py` (fit sampel kecil, kategori tak dikenal tidak error, dump/load joblib bolak-balik). Transformer kompatibel scikit-learn (`BaseEstimator, TransformerMixin`, `get_feature_names_out()`). `OrdinalEncoder` berurutan (`Po < Fa < TA < Gd < Ex`) untuk kualitas, `OneHotEncoder(handle_unknown="ignore")` untuk nominal. Kelola `requirements*.txt` dengan versi yang disamakan dengan Colab.
- **Role 4 (ML Modeler & Evaluator):**
  - Di `03_modeling.ipynb`, bandingkan OLS, Ridge, Lasso, Random Forest pada dua skenario dengan K-Fold CV; tuning hanya di data latih; pilih model via CV Skenario 2. Tulis `src/evaluation.py`, `src/explainer.py`, `scripts/make_stub.py` (Minggu 1; hanya kelas bawaan scikit-learn, keluaran skala `log1p`, antarmuka identik model asli), ekspor joblib + `model_meta_v1.json`, dan `tests/test_artifact.py` (path dari `MODEL_PATH`). Laporkan jujur jika Ridge/Lasso ≥ Random Forest.
- **Role 5 (MLOps & Full-Stack Developer):**
  - Bangun `api/main.py` (memuat artefak di `lifespan`; `/health`, `/model-info`, `/predict`; `503` bila model belum termuat), `Dockerfile`, CI, `.env.example`, `pull_request_template.md`, `scripts/check_notebooks.py`. Frontend: panggil `GET /health` saat halaman dibuka (indikator warm-up), form dari `features.json`, tampilkan harga, rentang, grafik faktor, dan banner disclaimer permanen. Gunakan stub sampai model asli tersedia. Urutan deploy: API → Vercel → kunci CORS → redeploy API.

## 4. Penggunaan AI Tools
- Anggota bebas memakai LLM/tool pilihan masing-masing (Claude, ChatGPT, Gemini, OpenCode, Cursor, Copilot, dll.), termasuk tier gratis. **Aturan di dokumen ini berlaku sama untuk semua tool.**
- Tool yang membaca `AGENTS.md` otomatis tidak perlu instruksi tambahan; Claude Code membaca `CLAUDE.md` dan Gemini CLI membaca `GEMINI.md` (keduanya berisi `@AGENTS.md`). Untuk tool lain, mulai sesi dengan: *"Baca PRD.md dan AGENTS.md, patuhi semua aturan, saya Role X, kerjakan file Y saja."*
- Minta **satu file per sesi** dan sebutkan file yang boleh diubah. Jangan menempelkan rahasia (token, `.env`) ke prompt.
- **Penulis PR bertanggung jawab penuh** atas kodenya: jalankan `pytest` dan *Restart & Run All* sebelum PR, dan pastikan bisa menjelaskan kode yang dikirim. Model gratis lebih sering melanggar aturan di Bagian 2 (lambda, kelas di notebook, leakage), jadi periksa itu secara khusus.
- Cantumkan alat AI yang dipakai di template PR; periksa ketentuan dosen soal pelaporan penggunaan AI.

## 5. Alur Git & Ruleset GitHub
- Alur per tugas: `git checkout main && git pull` → `git checkout -b roleX/nama-tugas` → commit → push → buka PR → minimal 1 reviewer → **Squash and merge**. Awalan commit: `feat`, `fix`, `data`, `docs`, `test`, `chore`.
- Ruleset `main`: target **Default branch saja** (bukan "All branches"); *Require a pull request* (1 approval, dismiss stale approvals, require conversation resolution, merge method Squash); *Block force pushes*; *Restrict deletions*; *Require status checks* (job CI) diaktifkan setelah CI pernah berjalan. Jangan aktifkan *Restrict updates/creations*.
- Role 1 mengaktifkan ruleset **setelah** push bootstrap pertama.
- Urutan merge Step 1: Role 1 → Role 3 → Role 4 → Role 5 (Role 2 paralel).
- Jangan commit output notebook yang membengkak (bersihkan gambar berat sebelum commit).

## 6. Checklist Sebelum Pull Request / Merge
- [ ] Notebook berjalan bersih dengan *Restart & Run All*.
- [ ] `pytest -v` hijau lokal dan di CI (termasuk `check_notebooks.py` dan `test_artifact.py`).
- [ ] Tidak ada kelas/`lambda` kustom di notebook; tidak ada hardcode path lokal; tidak ada rahasia di commit.
- [ ] Hanya mengedit file milik role sendiri (atau sudah izin owner).
- [ ] `schemas.py`, `src/config.py`, `features.json`, dan `frontend/` konsisten dengan `PRD.md`; `test_schema_sync.py` lulus.
- [ ] Ukuran `models/model_pipeline_v1.joblib` < 25 MB, `model_meta_v1.json` diperbarui, dan versi library di meta sama dengan `requirements.txt`.
- [ ] Alat AI yang dipakai dicantumkan di deskripsi PR.
