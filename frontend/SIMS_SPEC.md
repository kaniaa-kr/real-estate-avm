# SPESIFIKASI UI SIMS-STYLE (ROLE 5 — FULL-STACK)

## 1. Sumber Desain & Aset

- **Referensi:** `the_sims_property_predictor.html` (struktur utama: full-screen viewport, top HUD, vertical selector kanan, bottom build-mode dock, toast, modal) + `the_sims_property_predictor__1_.html` (judul "PREDIKSI PROPERTI", animasi rolling angka, efek partikel sukses, daftar skenario tersimpan).
- **Styling:** Tiru palet warna, panel kaca biru, pil gelap HUD, tombol bulat mengilap, dan state kartu hijau dari referensi. Gunakan Tailwind & CSS proyek (tanpa CDN Tailwind/Font Awesome).
- **Font & Ikon:** Muat `Fredoka` (judul/angka) & `Nunito` (teks) via `next/font/google` (fallback `next/font/local` di `public/fonts/` jika offline). Ikon pakai `lucide-react`.
- **Branding & Mata Uang:** Grafis buatan sendiri (SVG/CSS). Dilarang menyebut "The Sims"/"Plumbob" di teks UI (ganti "penanda hijau"). Mata uang pakai `$` (bukan `§`).

## 2. Kontrak Data & API (KERAS)

- **Single Source of Truth:** Baca daftar 10 fitur, tipe, min/max, kategori, dan label dari `public/features.json` via `lib/features.ts`. Dilarang hardcode rentang/opsi atau menyalin rumus harga/ROI/R² palsu dari HTML referensi.
- **10 Fitur Wajib (kirim sebagai `number`/string valid):** `OverallQual` (1-10), `GrLivArea`, `TotalBsmtSF`, `YearBuilt` (maks 2010), `Neighborhood` (25 kategori), `GarageCars` (0-4), `FullBath` (0-3), `KitchenQual` (`Po|Fa|TA|Gd|Ex`), `LotArea`, `Fireplaces` (0-3). Hapus fitur fiktif (kamar tidur, kolam renang, lantai, Rupiah, ROI).
- **Endpoint & Env:** Ambil URL dari `NEXT_PUBLIC_API_URL` (tampilkan error jelas jika undefined, jangan fallback localhost diam-diam). Pakai ulang `lib/api.ts`, `lib/validation.ts`, `lib/features.ts`, `components/health-status.tsx`, `server-status-provider.tsx`. Jangan edit `components/FactorChart.tsx` dan jangan hapus `components/valuation-form.tsx`.
- **Respons `/predict`:** `{ predicted_price, price_range: { low, high }, top_factors: [{ feature, impact_usd, direction }], explanation_method, model_version, disclaimer }`. Jika `explanation_method === "placeholder"`, tampilkan catatan `"Faktor penentu masih contoh (model uji)"`. Labeli `HouseAge` & `TotalSF` ke bahasa Indonesia.
- **Respons `/model-info`:** Untuk badge R² & modal (algorithm, model_version, r2, rmsle, MAE jika ada). Tampilkan `"—"` jika null/0/tidak ada.
- **Disclaimer:** Ekspor `DISCLAIMER_TEXT` dari `lib/disclaimer.ts`: `"Estimasi akademik berbasis data pasar Ames, Iowa (2006–2010). Tidak mencerminkan harga pasar saat ini."` — tampil permanen.

## 3. Pemetaan Kontrol & Perilaku

- **Tab Dock:**
  - `LUAS & STRUKTUR`: `GrLivArea` (slider), `TotalBsmtSF` (slider), `LotArea` (slider), `FullBath` (stepper).
  - `KUALITAS & USIA`: `KitchenQual` (5 kartu), `YearBuilt` (slider).
  - `LOKASI`: `Neighborhood` (25 kartu horizontal scroll, label dari `lib/neighborhoods.ts`).
  - `FASILITAS`: `GarageCars` (stepper), `Fireplaces` (stepper).
- **Kanan Layar:** `OverallQual` (1-10) vertical selector + label skala (1=Sangat Buruk s.d. 10=Sangat Istimewa). Keyboard: `ArrowUp/Down`, `Home/End`.
- **Aksi Cepat:** Tombol Preset (3 preset valid) & Tombol Acak (nilai acak valid sesuai `features.json`).
- **Siklus Prediksi:**
  1. Cek `/health` saat mount; tahan prediksi & tampilkan banner `"Server sedang bangun, bisa 30-60 detik"` jika belum siap.
  2. Validasi client via `lib/validation.ts` sebelum fetch; gagal = tandai kartu merah + pesan lokal (tanpa panggil API).
  3. Debounce 600 ms + `AbortController`. Pertahankan hasil lama (`isStale = true`, redup) saat loading. Abort tidak mengubah hasil/status error.
  4. Error 422 petakan ke field terkait (`detail[i].loc` terakhir); 503/network error tampilkan tombol `"Coba lagi"`.

## 4. Responsivitas (Laptop & Mobile) & Aksesibilitas

- **Laptop (≥1024px):** Full viewport `100dvh` tanpa scroll halaman, HUD 1 baris penuh, selector kualitas melayang di kanan tengah, dock bawah melayang proporsional.
- **Mobile (360px–767px):** Gunakan `100dvh`, HUD ringkas (sembunyikan badge sekunder/per-sqft ke dalam modal atau baris kedua kompak), selector `OverallQual` adaptif agar tidak menutupi denah rumah, tab dock bisa horizontal-scroll dengan touch target min `44px`, dan modal full-sheet nyaman digulir.
- **A11y & Performa:** Elemen `<button>`/`<input>` asli dengan `aria-label` & focus ring. Matikan animasi melayang/partikel saat `prefers-reduced-motion`. Efek suara Web Audio default **MATI**, toggle disimpan di `localStorage` (`try/catch`).

## 5. Protokol Akhir Tiap Sesi

1. Jelaskan ringkas perubahan, daftar file tersentuh, dan cara uji.
2. Laporkan jika ada konflik dengan `PRD.md` atau `AGENTS.md` (jangan ubah kontrak diam-diam).
3. Pastikan `npm run build` dan `npm run lint` bersih, lalu commit ke branch `feat/sims-ui-sesi-N`.
