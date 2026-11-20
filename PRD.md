# PRD v1.2: Real Estate Automated Valuation Model (AVM) — Kelompok 4

> Dokumen ini adalah **sumber kebenaran** untuk konteks produk, arsitektur, dan kontrak API.
> Perubahan pada kontrak API atau daftar fitur HARUS diperbarui di dokumen ini terlebih dahulu (via Pull Request yang disetujui Role 1 dan Role 5), baru kemudian di kode.

## 1. Ringkasan Proyek & Batasan Cakupan
- **Konteks Akademik:** Tugas Proyek Akhir Mata Kuliah Machine Learning (SI-5203), Program Studi Sistem Informasi, Universitas Tanjungpura.
- **Tujuan Bisnis:** Prototipe *Automated Valuation Model* (AVM) berbasis web untuk membantu agen dan investor properti menaksir **rentang harga jual/beli** rumah secara objektif berdasarkan karakteristik fisik dan lokasi.
- **Batasan & Disclaimer Wajib:** Dataset berasal dari **Ames, Iowa (2006–2010)**. Model ini adalah prototipe akademik dan **tidak berlaku** untuk kota lain maupun kondisi pasar saat ini. Teks disclaimer wajib tampil di UI, laporan, dan slide.
  - Teks baku: *"Estimasi akademik berbasis data pasar Ames, Iowa (2006–2010). Tidak mencerminkan harga pasar saat ini."*

## 2. Arsitektur Sistem (Decoupled ML)
1. **Offline Training (`notebooks/` + `src/`):** EDA, cleaning, dan pelatihan Scikit-Learn `Pipeline` di Google Colab/Jupyter dengan modul bersama `src/`. Keluaran: `models/model_pipeline_v1.joblib` **dan** `models/model_meta_v1.json` (lihat Bagian 5).
2. **Online Inference API (`api/`, FastAPI di Hugging Face Spaces / Render):** REST API *stateless*; memuat artefak sekali saat *startup* (`lifespan`). Lokasi artefak dibaca dari variabel lingkungan `MODEL_PATH` dan `META_PATH`.
3. **Frontend Web UI (`frontend/`, Next.js/React di Vercel):** Form 10 fitur dengan validasi klien (label/rentang dari `features.json`); menampilkan estimasi harga (USD), rentang prediksi, grafik faktor penentu, dan disclaimer.
4. **Bonus (Opsional, Supabase PostgreSQL):** Hanya dikerjakan jika jalur 1–3 lulus uji end-to-end (lihat Bagian 10).

## 3. Sumber Kebenaran Fitur: `src/config.py`
Daftar fitur UI, tipe, rentang, dan label **hanya didefinisikan sekali** di `src/config.py`. Modul lain (pipeline, `api/schemas.py`, tes) membaca dari sana. Frontend membaca `frontend/public/features.json` yang **dihasilkan otomatis** oleh `scripts/export_config.py` (jangan diedit manual). Dengan begitu fitur di training, API, dan UI tidak bisa saling menyimpang.

Isi minimal `src/config.py`:
- `FEATURES`: daftar tepat **10 fitur UI** (nama kolom Ames, tipe `int`/`float`/`category`, `min`/`max` untuk numerik, daftar kategori untuk kategorikal, label tampilan bahasa Indonesia, petunjuk pengisian singkat).
- `TARGET = "SalePrice"`, `REF_YEAR = 2010`, `RANDOM_STATE = 42`, `TEST_SIZE = 0.2`, `MODEL_VERSION = "v1"`.
- `ENGINEERED_FEATURES = ["TotalSF", "HouseAge"]`.

**Kandidat awal 10 fitur (BELUM FINAL):** `OverallQual`, `GrLivArea`, `TotalBsmtSF`, `YearBuilt`, `Neighborhood`, `GarageCars`, `FullBath`, `KitchenQual`, `LotArea`, `Fireplaces`.

**Kriteria pemilihan 10 fitur final (diputuskan Role 1 di Minggu 2, berdasarkan `reports/feature_candidates.csv`):**
1. Importance tinggi menurut data (dihitung hanya dari data latih).
2. Realistis dan mudah diisi pengguna di form.
3. Tidak redundan (mis. pilih salah satu dari `GarageCars` vs `GarageArea`).
4. **Bukan** fitur transaksi/penjualan (`SaleType`, `SaleCondition`, `MoSold`, `YrSold`) dan tidak membocorkan informasi target.
5. Memuat minimal satu fitur lokasi (`Neighborhood`).

Setelah dikunci (akhir Minggu 2), **daftar fitur tidak boleh berubah** kecuali lewat PR yang diumumkan ke seluruh tim, karena akan mengharuskan training ulang.

Aturan input:
- Semua fitur **wajib diisi** (tanpa `null`). Nilai "tidak ada" direpresentasikan eksplisit (mis. `TotalBsmtSF = 0`, `GarageCars = 0`).
- `YearBuilt` dibatasi `≤ 2010` agar `HouseAge ≥ 0` dan sesuai cakupan data.
- Request dengan field tambahan ditolak (`extra="forbid"`).

## 4. Spesifikasi Data & Pemodelan
- **Dataset:** Ames Housing (`data/raw/train.csv`, 1460 baris × 81 kolom, tidak boleh diubah); kolom `Id` dibuang. Target dilatih sebagai `np.log1p(SalePrice)` dan dikembalikan dengan `np.expm1()`.
- **Skenario Evaluasi Wajib (memakai split train/test yang sama):**
  1. **Skenario 1 (Upper-Bound Benchmark):** semua fitur dataset.
  2. **Skenario 2 (Production Model):** hanya 10 fitur UI + fitur rekayasa turunannya (`TotalSF`, `HouseAge`). **Dilarang** memakai default value mapper untuk mengisi fitur sisa.
- **Algoritma:** OLS, Ridge, Lasso (baseline) vs Random Forest (model utama). Jika Ridge/Lasso setara atau lebih baik pada Skenario 2, model yang lebih sederhana dipilih dan alasannya dijelaskan.
- **Fitur rekayasa:** `HouseAge = 2010 − YearBuilt` (tahun referensi tetap) dan `TotalSF = GrLivArea + TotalBsmtSF`. Karena `HouseAge` adalah turunan linear sempurna dari `YearBuilt`, **`YearBuilt` dibuang** dari matriks model setelah `HouseAge` dibuat (hindari kolinearitas dan atribusi ganda).
- **Protokol evaluasi & anti-leakage:**
  - Split dilakukan **di awal** (`random_state=42`). Seluruh analisis EDA, pemilihan fitur, dan penentuan outlier hanya memakai **data latih**.
  - Outlier dibuang **hanya dari data latih**.
  - Tuning memakai K-Fold CV pada data latih. **Model final dipilih berdasarkan skor CV pada Skenario 2.** Test set dievaluasi **satu kali** pada model terpilih.
  - Metrik pada dua skala: **RMSLE** (RMSE skala log), **MAE & RMSE dalam USD** (setelah `expm1`), dan **R²**.
- **Rentang Prediksi (`price_range`):**
  - Hitung residual skala log dari prediksi **out-of-fold** (`cross_val_predict`) pada data latih, **bukan** residual in-sample (Random Forest akan terlalu optimistis).
  - Ambil persentil ke-5 dan ke-95 residual (`q_low`, `q_high`; nominal cakupan 90%) sebagai margin keamanan terhadap target empiris ≥ 80%.
  - Saat inference: `low = expm1(pred_log + q_low)`, `high = expm1(pred_log + q_high)`.
  - Simpan `q_low`, `q_high`, dan **cakupan empiris pada test set** di `model_meta_v1.json`. Jika cakupan test < 80%, perlebar kuantil.
- **Faktor Penentu (`top_factors`):**
  - Metode utama: `shap.TreeExplainer` (Random Forest) atau kontribusi koefisien/`LinearExplainer` (Ridge/Lasso), dihitung pada ruang fitur hasil transformasi, lalu **kolom one-hot dijumlahkan kembali ke fitur asalnya** (mis. semua kolom `Neighborhood_*` menjadi `Neighborhood`).
  - Konversi ke USD: `impact_usd = round(expm1(base + shap) − expm1(base))`. Nilai ini adalah **aproksimasi per-fitur dan tidak menjumlah persis** ke selisih harga total; UI menyebutnya "perkiraan pengaruh".
  - Metode cadangan (jika SHAP terlalu berat untuk free tier atau dependensinya bermasalah): *ablation* model-agnostik, yaitu selisih prediksi dibanding prediksi saat fitur diganti nilai median/modus data latih.
  - Metode final dipilih di Minggu 3, dikunci di `model_meta_v1.json`, dan dilaporkan di response (`explanation_method`).
  - Tampilkan 5 faktor teratas berdasarkan `|impact_usd|`.

## 5. Artefak Keluaran
| Berkas | Pemilik | Isi |
| :--- | :--- | :--- |
| `models/model_pipeline_v1.joblib` | Role 4 | `Pipeline` lengkap (preprocessing + model); menerima `DataFrame` mentah berisi 10 kolom UI; `compress=3`; < 25 MB |
| `models/model_meta_v1.json` | Role 4 | Metadata untuk `/model-info` dan rentang prediksi |
| `models/model_pipeline_stub.joblib` + `models/model_meta_stub.json` | Role 4 | Model/metadata palsu (dari `scripts/make_stub.py`, memakai kelas bawaan scikit-learn saja) dengan antarmuka identik, untuk pengembangan paralel |
| `frontend/public/features.json` | Role 3 | Hasil `scripts/export_config.py`; daftar fitur, label, rentang, kategori untuk form UI |
| `reports/feature_candidates.csv` | Role 2 | Tabel kandidat fitur (tipe, min/maks, % missing, ranking importance) untuk keputusan Role 1 |

Variabel lingkungan API: `MODEL_PATH`, `META_PATH`, `ALLOWED_ORIGINS`. Di Step 1 menunjuk ke stub; di Step 5 diganti ke model asli tanpa mengubah kode.

Skema `model_meta_v1.json`:
```json
{
  "model_version": "v1",
  "algorithm": "RandomForestRegressor",
  "trained_at": "2026-12-01",
  "features_used": ["OverallQual", "GrLivArea", "..."],
  "engineered_features": ["TotalSF", "HouseAge"],
  "metrics": {
    "test_10_features": { "rmsle": 0.162, "mae_usd": 18500, "rmse_usd": 28000, "r2": 0.86 },
    "benchmark_full_features": { "rmsle": 0.135, "mae_usd": 15000, "rmse_usd": 24000, "r2": 0.90 }
  },
  "interval": {
    "method": "oof_log_residual_quantile",
    "nominal_coverage": 0.90,
    "q_low": -0.17,
    "q_high": 0.16,
    "test_coverage": 0.88
  },
  "explanation_method": "shap_tree",
  "split": { "random_state": 42, "test_size": 0.2 },
  "library_versions": { "python": "3.x.x", "scikit-learn": "x.y.z", "pandas": "x.y.z", "numpy": "x.y.z", "joblib": "x.y.z", "shap": "x.y.z" }
}
```
*(Semua angka hanya ilustrasi; nilai asli diisi otomatis oleh notebook modeling.)*

API memeriksa `library_versions` saat startup dan mencatat peringatan jika versi runtime berbeda dari versi training.

## 6. Kontrak API (Single Source of Truth)
CORS: mengizinkan `localhost` dan domain Vercel produksi (dari `ALLOWED_ORIGINS`) **serta** URL preview Vercel melalui `allow_origin_regex` (`^https://.*\.vercel\.app$`). Dilarang `allow_origins=["*"]` di produksi.

### `GET /health`
```json
{ "status": "ok", "model_loaded": true, "model_version": "v1" }
```

### `GET /model-info`
Mengembalikan sebagian isi `model_meta_v1.json`: `model_version`, `algorithm`, `trained_at`, `features_used`, `metrics`, `interval`, `explanation_method`.

### `POST /predict`
**Request (contoh memakai kandidat 10 fitur; daftar final dikunci Minggu 2):**
```json
{
  "OverallQual": 7,
  "GrLivArea": 1800,
  "TotalBsmtSF": 900,
  "YearBuilt": 2001,
  "Neighborhood": "CollgCr",
  "GarageCars": 2,
  "FullBath": 2,
  "KitchenQual": "Gd",
  "LotArea": 8450,
  "Fireplaces": 1
}
```

**Response 200:**
```json
{
  "predicted_price": 215000,
  "price_range": { "low": 192000, "high": 241000 },
  "top_factors": [
    { "feature": "OverallQual", "impact_usd": 24000, "direction": "up" },
    { "feature": "HouseAge", "impact_usd": -4500, "direction": "down" }
  ],
  "explanation_method": "shap_tree",
  "model_version": "v1",
  "disclaimer": "Estimasi akademik berbasis data pasar Ames, Iowa (2006–2010). Tidak mencerminkan harga pasar saat ini."
}
```
Invarian response: semua nilai harga bilangan bulat USD; `0 ≤ low ≤ predicted_price ≤ high`; `direction` ∈ {`"up"`, `"down"`} sesuai tanda `impact_usd`; `top_factors` berisi ≤ 5 item terurut menurun menurut `|impact_usd|`. Nama fitur pada `top_factors` memakai nama internal model (termasuk `TotalSF`, `HouseAge`); frontend memetakan ke label Indonesia dari `features.json`.

*Catatan Step 1:* sebelum `explain()` asli jadi (Step 4), API stub boleh mengembalikan `top_factors` placeholder dengan bentuk yang sama.

**Error:**
| Kode | Kondisi | Bentuk |
| :--- | :--- | :--- |
| `422` | Input di luar rentang/kategori, field kurang/lebih | Format default FastAPI (`{"detail": [...]}`) |
| `503` | Model belum termuat | `{"detail": "Model belum siap"}` |
| `500` | Galat internal | `{"detail": "Terjadi kesalahan pada server"}` (tanpa stack trace) |

## 7. Kriteria Sukses (Acceptance Criteria)
| Aspek | Target |
| :--- | :--- |
| Akurasi | RMSLE model 10 fitur ≈ 0,15–0,18 (benchmark fitur penuh ≈ 0,13–0,15). Jika di luar kisaran, dijelaskan di laporan |
| MAE (USD) | ≤ ±12% dari median harga data latih (≈ US$ 20.000); angka final ditetapkan setelah baseline Minggu 3 |
| Cakupan rentang | ≥ 80% harga aktual test set berada dalam `price_range` |
| API | `POST /predict` < 2 detik (di luar cold start); input tidak valid → `422` |
| End-to-End | Frontend Vercel memanggil API publik, menampilkan hasil + grafik `top_factors`, dan menangani status loading/cold start |
| Reprodusibilitas | Notebook berjalan *Restart & Run All*; CI (`pytest` + cek notebook) hijau di `main` |

## 8. Timeline & Milestone (6 minggu, selaras dengan Modul Praktikum 5 Step)
| Minggu | Step | Fokus | Checkpoint |
| :--- | :--- | :--- | :--- |
| 1 | Step 1 | Setup repo, config awal, versi dikunci, stub model, API stub | Stub API berjalan; CI aktif; ruleset `main` aktif |
| 2 | Step 2 | EDA (data latih saja), `feature_candidates.csv`, pemilihan 10 fitur | **10 fitur final dikunci** di `config.py`; `features.json` ter-generate |
| 3 | Step 3 (+ awal Step 4) | Transformer & `build_preprocessor` (ui10 & full), tes preprocessing, form frontend; mulai baseline | Pipeline lulus tes; hasil baseline dua skenario |
| 3–4 | Step 4 | Tuning, evaluasi akhir, `explain()`, rentang prediksi, ekspor artefak | Joblib + meta JSON ter-merge; `test_artifact.py` hijau |
| 5 | Step 5 | Ganti stub → model asli, deploy API lalu Vercel, kunci CORS, uji E2E | **Live app stabil** |
| 6 | Step 5 | Dokumentasi, slide, rekomendasi bisnis, gladi demo; *bonus Supabase hanya jika Minggu 5 stabil* | Laporan + presentasi final |

## 9. Catatan Deployment
- **Urutan:** deploy API dulu (CORS sementara `http://localhost:3000`) → deploy frontend ke Vercel (`NEXT_PUBLIC_API_URL` = URL API, *Root Directory* = `frontend`) → ubah `ALLOWED_ORIGINS` ke domain Vercel final → redeploy API.
- **Hugging Face Spaces (SDK Docker):** README Space memakai *front matter* `sdk: docker` dan `app_port: 7860`. File > 10 MB (seperti `.joblib`) memerlukan Git LFS.
- **Render (Docker):** port diberikan lewat variabel `PORT`; `Dockerfile` memakai `CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-7860}` (bentuk shell agar variabel terbaca). Free tier ±512 MB RAM dan mengalami *cold start*.
- **Versi Python** di `Dockerfile` harus sama dengan Colab.

## 10. Bonus: Supabase `prediction_logs` (Opsional)
- Penulisan log dilakukan **oleh API (server-side)**, bukan langsung dari browser; kunci `service_role` hanya ada di variabel lingkungan server dan **tidak pernah** di kode/frontend/repo.
- Kolom: `id`, `created_at`, `inputs` (JSON, 10 fitur saja), `predicted_price`, `price_low`, `price_high`, `model_version`. Tanpa PII (tanpa IP, nama, atau email).
- Aktifkan Row Level Security; UI menyatakan bahwa simulasi dicatat secara anonim.
- Kegagalan logging **tidak boleh** menggagalkan `POST /predict`.

## 11. Risiko Utama
| Risiko | Mitigasi |
| :--- | :--- |
| `joblib.load` gagal (beda versi / class di notebook / `lambda`) | Versi dikunci (termasuk Python); transformer di `src/` tanpa `lambda`; peringatan versi saat startup; `test_artifact.py` di proses bersih |
| Memori terbatas (±512 MB) | Batasi `n_estimators`/`max_depth`; `compress=3`; pertimbangkan HF Spaces; siapkan metode faktor cadangan tanpa SHAP |
| File `.joblib` > 10 MB di Hugging Face Spaces | Gunakan Git LFS atau perkecil model |
| Cold start | UI memanggil `/health` saat halaman dibuka dan menampilkan status "memuat..."; siapkan rekaman demo cadangan |
| Model 10 fitur lebih lemah | Dilaporkan terbuka terhadap benchmark fitur penuh |
| Kualitas kode dari AI tools yang berbeda-beda | Aturan sama di `AGENTS.md`, cek otomatis di CI, template PR, dan review manusia |
| Klaim bisnis berlebihan | Disclaimer di UI, laporan, slide |

## 12. Riwayat Perubahan
- **v1.2:** Menyelaraskan dengan Modul Praktikum: timeline per Step; kriteria pemilihan 10 fitur; split di awal dan analisis hanya pada data latih; model dipilih via CV; `features.json` & `export_config.py`; artefak stub + meta; env `MODEL_PATH`/`META_PATH`; catatan deployment (urutan, HF LFS, `PORT`); risiko `lambda` dan kualitas kode AI.
- **v1.1:** `src/config.py`; `model_meta_v1.json`; rentang prediksi OOF; agregasi SHAP; format error; CORS preview Vercel; stub; spesifikasi Supabase; target MAE.
- **v1.0:** Versi awal.
