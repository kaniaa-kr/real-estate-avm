# Frontend AVM Ames (Next.js)

Halaman tunggal untuk prototipe **Automated Valuation Model** rumah Ames, Iowa
(2006–2010). Form 10 fitur dibangun otomatis dari
[`public/features.json`](./public/features.json) — berkas itu dihasilkan oleh
`scripts/export_config.py` dari `src/config.py` dan **tidak boleh diedit manual**.

## Menjalankan

Dari folder `frontend/`:

```bash
cp .env.example .env.local   # sekali saja
npm install
npm run dev                  # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` menunjuk ke API FastAPI (default `http://localhost:8000`
untuk pengembangan lokal). Di Vercel, isi variabel ini dengan URL API publik
(tanpa slash di akhir) sebelum deploy. Panduan lengkap dua project Vercel ada di
[`../DEPLOY.md`](../DEPLOY.md).

API lokal dijalankan dari **root repo**:

```bash
uvicorn api.main:app --reload --port 8000
```

## Perilaku halaman

- Saat dibuka, halaman memanggil `GET /health` dan menampilkan
  **"Server sedang memuat..."** sampai model termuat. Pengecekan diulang tiap
  3 detik (maksimal ±60 detik) untuk mengakomodasi cold start free tier, lalu
  tombol submit aktif. Jika gagal, tersedia tombol **Coba lagi**.
- Form memvalidasi setiap kolom di klien memakai label, rentang, dan kategori
  dari `features.json`; pesan galat tampil inline dan fokus berpindah ke kolom
  pertama yang salah.
- Submit memanggil `POST /predict` dan menampilkan harga, rentang prediksi,
  serta grafik `FactorChart` dari `top_factors` (label Indonesia untuk fitur
  turunan seperti `TotalSF` dan `HouseAge`; hijau menaikkan, merah menurunkan).
- Banner disclaimer dari PRD selalu tampil di halaman.

## Perintah lain

```bash
npm run lint     # ESLint
npx tsc --noEmit # cek tipe
npm run build    # build produksi
```

Struktur utama:

```text
app/page.tsx                        # halaman tunggal + banner disclaimer
components/server-status-provider.tsx  # polling /health (context warm-up)
components/health-status.tsx        # indikator status server
components/valuation-form.tsx       # form, validasi klien, hasil prediksi
components/FactorChart.tsx          # grafik batang top_factors (naik/turun)
lib/api.ts                          # tipe & pemanggilan /health dan /predict
lib/features.ts                     # pemuat features.json (satu sumber konfigurasi)
lib/validation.ts                   # validasi nilai form
lib/disclaimer.ts                   # teks disclaimer baku PRD
```
