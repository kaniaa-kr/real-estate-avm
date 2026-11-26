# Deploy Dua Project Vercel — Backend FastAPI + Frontend Next.js

Panduan ini menjelaskan cara menjalankan dan men-deploy **satu repo** menjadi **dua
project Vercel**:

| Project | Root Directory | Framework | Isi |
| :--- | :--- | :--- | :--- |
| `avm-api` | `./` (root repo) | FastAPI (otomatis dari `requirements.txt`) | `api/`, `src/`, `models/` |
| `avm-web` | `frontend/` | Next.js | UI form, hasil, `FactorChart` |

> Urutan deploy mengikuti `PRD.md` Bagian 9: **API dulu → frontend → kunci CORS →
> redeploy API**.

---

## 1. Verifikasi lokal

### 1.1 Backend API

Dari **root repo** (bukan `api/`), agar import `src.*` konsisten:

```bash
cp .env.example .env          # sekali saja; .env tidak di-commit
# Pastikan MODEL_PATH dan META_PATH menunjuk ke model v1
uvicorn api.main:app --reload --port 8000
```

Cek endpoint:

```bash
curl -s http://localhost:8000/health | jq
# {"status":"ok","model_loaded":true,"model_version":"v1"}

curl -s http://localhost:8000/model-info | jq
curl -s -X POST http://localhost:8000/predict \
  -H 'Content-Type: application/json' \
  -d '{"OverallQual":7,"GrLivArea":1800,"TotalBsmtSF":900,"YearBuilt":2001,
       "Neighborhood":"CollgCr","GarageCars":2,"FullBath":2,
       "KitchenQual":"Gd","LotArea":8450,"Fireplaces":1}' | jq
```

Dokumentasi interaktif: <http://localhost:8000/docs>.

Tes otomatis:

```bash
pytest -v
```

### 1.2 Frontend

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                   # http://localhost:3000
```

Pastikan status server berubah menjadi siap, lalu submit form dan lihat harga,
rentang, serta grafik `FactorChart`.

```bash
npm run lint
npx tsc --noEmit
npm run build
```

---

## 2. Deploy Project 1 — Backend API

1. **Add New Project** → import repo `real-estate-avm`.
2. **Root Directory**: biarkan `./` (root repo).
3. **Framework Preset**: `FastAPI` (biasanya terdeteksi otomatis karena
   `requirements.txt` memuat `fastapi`). `vercel.json` juga menetapkan
   `"framework": "fastapi"`.
4. **Environment Variables** (Production + Preview):
   - `MODEL_PATH` = `models/model_pipeline_v1.joblib`
   - `META_PATH` = `models/model_meta_v1.json`
   - `ALLOWED_ORIGINS` = `http://localhost:3000` (sementara; dikunci di langkah 4)
   - `ALLOWED_ORIGIN_REGEX` = `^https://.*\.vercel\.app$` (opsional, default sudah ini)
5. **Deploy**, lalu verifikasi:
   - `GET https://<api>.vercel.app/health` → `{"status":"ok","model_loaded":true,...}`
   - `GET https://<api>.vercel.app/model-info` → `200`
   - `POST https://<api>.vercel.app/predict` → `200` + `top_factors` asli
   - `GET https://<api>.vercel.app/docs` → halaman Swagger

Jika `/health` mengembalikan `model_loaded:false`, buka **Runtime Logs** dan cek
apakah `MODEL_PATH`/`META_PATH` salah atau artefak tidak ikut ter-bundle.

---

## 3. Deploy Project 2 — Frontend

1. **Add New Project** → import repo yang sama.
2. **Root Directory**: `frontend` (wajib; jangan `./`).
3. **Framework Preset**: `Next.js`. `frontend/vercel.json` juga menetapkan
   `"framework": "nextjs"` agar tidak pernah memakai preset FastAPI.
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = domain Project 1, mis. `https://avm-api.vercel.app`
     (tanpa slash di akhir)
5. **Deploy**, lalu buka domain frontend. Halaman harus memanggil `/health`,
   menampilkan status siap, dan `POST /predict` harus berhasil.

---

## 4. Kunci CORS

Setelah domain frontend produksi diketahui:

1. Di Project 1 (backend), ubah `ALLOWED_ORIGINS` menjadi domain frontend
   produksi, mis. `https://avm-web.vercel.app` (boleh beberapa, pisahkan koma).
2. **Redeploy** backend.
3. Buka frontend, jalankan prediksi sekali lagi. Tidak boleh ada galat CORS di
   console browser. Preview `*.vercel.app` tetap diizinkan oleh
   `ALLOWED_ORIGIN_REGEX`.

---

## 5. Catatan konfigurasi

- **`vercel.json` tidak memakai `rewrites` `/(.*)` → `/api/main`.** Rewrite seperti
  itu mengubah path yang diterima aplikasi menjadi `/api/main`, sehingga
  `/health`, `/model-info`, `/predict`, dan `/docs` justru 404. Dengan
  `"framework": "fastapi"`, Vercel mendeteksi `api/main.py` (salah satu lokasi
  entrypoint yang didukung) dan meneruskan **path asli** ke aplikasi. Itulah yang
  membuat semua route FastAPI bekerja.
- **Tidak ada `installCommand` kustom di `vercel.json`.** Ini disengaja. Dengan
  install command kustom, Vercel tidak boleh memakai *runtime dependency
  install* sehingga seluruh isi virtualenv ikut di-bundle dan melewati batas
  fungsi 225 MB (`LAMBDA_SIZE_EXCEEDED`). Tanpa install command kustom, Vercel
  mengoptimalkan sendiri: paket publik dipasang saat cold start ke `/tmp`,
  sehingga zip fungsi tetap kecil. `requirements.txt` tetap utuh (termasuk
  `shap` untuk Colab/CI); model produksi Ridge memakai `linear_coef`, jadi
  `shap` tidak diimpor saat inference. Cold start pertama bisa lebih lama —
  UI sudah menampilkan status "memuat...".
- **`.vercelignore`** membuang `frontend/`, `notebooks/`, `data/`, `tests/`,
  `reports/`, `.git/`, `.venv/`, dan `__pycache__/` dari bundle backend.
  `api/`, `src/`, `models/`, dan `requirements.txt` tetap ikut.
- **`.python-version`** mengunci Python `3.13`, sama dengan versi training
  (lihat `library_versions.python` di `models/model_meta_v1.json`).
- **`frontend/vercel.json`** menetapkan `"framework": "nextjs"` agar project
  frontend tidak pernah mencoba build FastAPI. Root Directory project frontend
  **wajib** `frontend`; kalau dibiarkan `./`, Vercel membaca `vercel.json` root
  (FastAPI) dan gagal dengan `FASTAPI_ENTRYPOINT_NOT_FOUND`.
- **`api/main.py`** menambahkan root repo ke `sys.path` sebelum import
  `api.*`/`src.*`, mengimpor `src.features`/`src.preprocessing` sebelum
  `joblib.load()`, memakai `src.explainer.explain()` untuk `top_factors`, dan
  `src.evaluation.apply_interval()` untuk rentang harga.

---

## 6. Troubleshooting

| Gejala | Penyebab umum | Solusi |
| :--- | :--- | :--- |
| `404 NOT_FOUND` di `/health` | Framework Preset bukan FastAPI, atau `vercel.json` lama masih memakai `builds`/`routes` | Pastikan `vercel.json` versi baru ter-commit dan Framework Preset = FastAPI |
| `FASTAPI_ENTRYPOINT_NOT_FOUND` di project frontend | Root Directory project frontend masih `./`, sehingga Vercel memakai `vercel.json` root | Set Root Directory = `frontend` lalu redeploy |
| `LAMBDA_SIZE_EXCEEDED` (260 MB > 225 MB) | Ada `installCommand` kustom yang mematikan optimizer Vercel | Hapus `installCommand` dari `vercel.json`; biarkan Vercel memakai runtime dependency install |
| `/health` → `model_loaded:false` | `MODEL_PATH`/`META_PATH` salah atau artefak tidak ter-upload | Cek env dan `.vercelignore`; lihat Runtime Logs |
| `503` di `/predict` | Model gagal dimuat (versi library/path) | Cek log `Gagal memuat model`; pastikan versi Python 3.13 dan artefak v1 |
| Galat CORS di browser | `ALLOWED_ORIGINS` belum memuat domain frontend | Set domain frontend lalu redeploy backend |
| Build gagal karena ukuran fungsi | Dependensi berat ikut ter-bundle karena `installCommand` kustom | Hapus `installCommand`; cek `excludeFiles` dan pastikan tidak ada paket training di `requirements.txt` |
| Cold start lama | Fungsi pertama kali dimuat | UI sudah menampilkan status "memuat..."; tunggu / coba lagi |

---

## 7. Checklist sebelum demo

- [ ] `GET /health` produksi → `model_loaded: true`
- [ ] `GET /model-info` produksi → `200`
- [ ] `POST /predict` produksi → `200`, `0 ≤ low ≤ price ≤ high`, `top_factors` ≤ 5
- [ ] `GET /docs` produksi dapat dibuka
- [ ] Frontend produksi menampilkan harga, rentang, dan `FactorChart`
- [ ] Tidak ada galat CORS di console
- [ ] Banner disclaimer tampil di UI
