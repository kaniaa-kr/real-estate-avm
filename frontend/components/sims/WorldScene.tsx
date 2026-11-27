"use client";

import React, { useId, useMemo } from "react";

import { getNeighborhoodName } from "@/lib/neighborhoods";
import type { FeatureValues } from "@/lib/validation";

export interface WorldSceneProps {
  /** Nilai 10 fitur dari form atau dock Sims. */
  values?: FeatureValues | Record<string, string | number>;
  /** Atribut kelas CSS pembungkus (misal untuk penataan ukuran). */
  className?: string;
}

/**
 * Komponen Denah Interaktif Rumah Ames (Sims World Scene).
 *
 * Komponen SVG murni presentasional yang bereaksi dinamis terhadap seluruh 10 fitur input:
 * - GrLivArea: skala ukuran bangunan rumah (aman dalam rentang 334 - 5642 sq ft).
 * - LotArea: ukuran halaman kavling, kerapatan taman, dan pepohonan (1300 - 215245 sq ft).
 * - TotalBsmtSF: garis kontur fondasi dan indikator tangga basement jika > 0.
 * - FullBath: jumlah kamar mandi fisik dengan perlengkapan sanitasi (0 - 3).
 * - KitchenQual: material kabinet, pulau dapur (kitchen island), dan perlengkapan chef (Fa, TA, Gd, Ex).
 * - OverallQual: material lantai (papan sederhana, kayu ek, walnut herringbone, hingga marmer mewah).
 * - YearBuilt: patina visual era konstruksi (klasik bersejarah vs kontemporer cerah).
 * - GarageCars: bangunan sayap garasi beserta mobil terparkir (0 - 4 mobil).
 * - Fireplaces: perapian batu bata dengan tungku api hangat (0 - 3 perapian).
 * - Neighborhood: nuansa lanskap dan plang papan nama area Ames resmi.
 *
 * Dilengkapi penanda berlian hijau (plumbob) melayang di tengah rumah dengan animasi CSS halus.
 */
export function WorldScene({ values = {}, className = "" }: WorldSceneProps) {
  const titleId = useId();
  const descId = useId();

  // 1. Ekstraksi dan sanitasi 10 nilai fitur dengan batas ekstrem yang aman
  const overallQual = Math.max(1, Math.min(10, Number(values.OverallQual ?? 6) || 6));
  const grLivArea = Math.max(334, Math.min(5642, Number(values.GrLivArea ?? 1500) || 1500));
  const totalBsmtSF = Math.max(0, Math.min(6110, Number(values.TotalBsmtSF ?? 1000) || 0));
  const yearBuilt = Math.max(1872, Math.min(2010, Number(values.YearBuilt ?? 2000) || 2000));
  const neighborhood = String(values.Neighborhood ?? "CollgCr");
  const garageCars = Math.max(0, Math.min(4, Math.round(Number(values.GarageCars ?? 2) || 0)));
  const fullBath = Math.max(0, Math.min(3, Math.round(Number(values.FullBath ?? 2) || 0)));
  const lotArea = Math.max(1300, Math.min(215245, Number(values.LotArea ?? 9500) || 9500));
  const fireplaces = Math.max(0, Math.min(3, Math.round(Number(values.Fireplaces ?? 1) || 0)));
  const kitchenQual = String(values.KitchenQual ?? "TA").toUpperCase();

  const neighborhoodName = getNeighborhoodName(neighborhood);

  // 2. Kalkulasi Dimensi Responsif & Proporsional
  // Kanvas SVG: 960 x 680
  const normLiv = (grLivArea - 334) / (5642 - 334); // 0.0 s.d. 1.0
  const houseW = Math.round(330 + normLiv * 150); // 330px - 480px
  const houseH = Math.round(230 + normLiv * 120); // 230px - 350px

  // Posisi rumah di kanvas tengah
  const houseX = Math.round(180 - (houseW - 380) * 0.35);
  const houseY = Math.round(180 - (houseH - 280) * 0.4);

  // Lebar Garasi sesuai GarageCars (0-4)
  const garageW =
    garageCars === 0 ? 0 : garageCars === 1 ? 84 : garageCars === 2 ? 144 : garageCars === 3 ? 198 : 240;
  const garageH = Math.round(houseH * 0.78);
  const garageX = houseX + houseW + 8;
  const garageY = houseY + (houseH - garageH);

  // Ukuran halaman kavling (skala logaritmik halus)
  const normLot = (Math.log10(lotArea) - Math.log10(1300)) / (Math.log10(215245) - Math.log10(1300));
  const lotInsetX = Math.round(30 - normLot * 18);
  const lotInsetY = Math.round(26 - normLot * 14);

  // 3. Tema Material Lantai & Dinding berdasarkan OverallQual (1-10)
  const floorTheme = useMemo(() => {
    if (overallQual <= 3) {
      return {
        fill: "#d4cbbe",
        pattern: "simple-planks",
        border: "#8a8175",
        accent: "#aba193",
        wallWidth: 5,
        wallColor: "#3d3b37",
      };
    }
    if (overallQual <= 6) {
      return {
        fill: "#dfb887",
        pattern: "oak-hardwood",
        border: "#b88a53",
        accent: "#f4dbba",
        wallWidth: 6,
        wallColor: "#2b2a27",
      };
    }
    if (overallQual <= 8) {
      return {
        fill: "#b87333",
        pattern: "walnut-parquet",
        border: "#854917",
        accent: "#d49a62",
        wallWidth: 7,
        wallColor: "#1a1917",
      };
    }
    // 9 - 10: Marmer Mewah & Kayu Premium
    return {
      fill: "#f5f0e8",
      pattern: "royal-marble",
      border: "#c9b69b",
      accent: "#ffffff",
      wallWidth: 8,
      wallColor: "#121110",
    };
  }, [overallQual]);

  // 4. Nuansa Patina berdasarkan YearBuilt
  const vintageFilter = useMemo(() => {
    if (yearBuilt < 1950) {
      return "sepia(0.28) contrast(0.96) brightness(0.94)";
    }
    if (yearBuilt < 1985) {
      return "sepia(0.12) contrast(0.98)";
    }
    return "none";
  }, [yearBuilt]);

  // 5. Nuansa Lingkungan (Neighborhood Vibes)
  const isUpscale = ["NridgHt", "NoRidge", "StoneBr", "Somerst"].includes(neighborhood);
  const isNature = ["Timber", "ClearCr", "Veenker", "Gilbert"].includes(neighborhood);

  // Titik tengah rumah untuk penanda Plumbob
  const plumbobX = houseX + houseW / 2;
  const plumbobY = houseY + houseH / 2 - 18;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ minHeight: "360px" }}
    >
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        viewBox="0 0 960 680"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-[88dvh] transition-all duration-500 ease-out"
        style={{ filter: vintageFilter }}
      >
        <title id={titleId}>Denah Rumah Interaktif Ames (Gaya Top-Down Sims)</title>
        <desc id={descId}>
          Visualisasi denah 2D top-down properti di {neighborhoodName}. Kualitas {overallQual}/10, luas{" "}
          {grLivArea} sq ft, {garageCars} mobil di garasi, {fullBath} kamar mandi, {fireplaces} perapian,
          tahun {yearBuilt}.
        </desc>

        <defs>
          {/* Pola Rumput Halaman */}
          <pattern id="lawn-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={isNature ? "#355e3b" : isUpscale ? "#2d6a4f" : "#3b7a57"} />
            <circle cx="5" cy="5" r="1.2" fill="#52b788" opacity="0.3" />
            <circle cx="15" cy="15" r="1.5" fill="#1b4332" opacity="0.25" />
          </pattern>

          {/* Pola Lantai Kayu Oak */}
          <pattern id="oak-pattern" width="24" height="12" patternUnits="userSpaceOnUse">
            <rect width="24" height="12" fill={floorTheme.fill} />
            <line x1="0" y1="12" x2="24" y2="12" stroke={floorTheme.border} strokeWidth="1" opacity="0.6" />
            <line x1="12" y1="0" x2="12" y2="12" stroke={floorTheme.border} strokeWidth="0.8" opacity="0.5" />
          </pattern>

          {/* Pola Ubin Kamar Mandi */}
          <pattern id="tile-pattern" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="#e8f4f8" />
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#b0cddb" strokeWidth="1" />
          </pattern>

          {/* Pola Aspal Garasi / Jalan Masuk */}
          <pattern id="driveway-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#3c4048" />
            <circle cx="8" cy="8" r="1" fill="#2b2d31" opacity="0.4" />
          </pattern>

          {/* Gradien Plumbob Berlian Hijau */}
          <linearGradient id="plumbob-top-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#76ff9d" />
            <stop offset="100%" stopColor="#00d66c" />
          </linearGradient>
          <linearGradient id="plumbob-top-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#39e67d" />
            <stop offset="100%" stopColor="#00ab52" />
          </linearGradient>
          <linearGradient id="plumbob-bottom-left" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00803d" />
            <stop offset="100%" stopColor="#00c763" />
          </linearGradient>
          <linearGradient id="plumbob-bottom-right" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#005929" />
            <stop offset="100%" stopColor="#00994a" />
          </linearGradient>

          {/* Filter Efek Glow Hijau Plumbob */}
          <filter id="plumbob-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ========================================================
            1. HALAMAN KAVLING (LOT AREA & LINGKUNGAN)
            ======================================================== */}
        <g id="scene-ground">
          {/* Latar Belakang Lingkungan Luar */}
          <rect width="960" height="680" fill={isNature ? "#28442c" : isUpscale ? "#1e382b" : "#243e30"} />

          {/* Area Kavling Tanah (Lot Area) */}
          <rect
            x={lotInsetX}
            y={lotInsetY}
            width={960 - lotInsetX * 2}
            height={680 - lotInsetY * 2}
            rx="16"
            fill="url(#lawn-pattern)"
            stroke={isUpscale ? "#52b788" : "#2d6a4f"}
            strokeWidth="3"
            className="transition-all duration-500 ease-out"
          />

          {/* Elemen Lanskap Alam Berdasarkan Karakter Area */}
          {isNature && (
            <g id="nature-trees" opacity="0.9">
              {/* Pohon Cemara Khas Hutan Ames */}
              <circle cx="80" cy="90" r="32" fill="#1b4332" />
              <circle cx="80" cy="90" r="22" fill="#2d6a4f" />
              <circle cx="880" cy="110" r="36" fill="#1b4332" />
              <circle cx="880" cy="110" r="26" fill="#2d6a4f" />
              <circle cx="95" cy="560" r="34" fill="#1b4332" />
            </g>
          )}

          {isUpscale && (
            <g id="upscale-amenities">
              {/* Kolam Hias / Air Mancur Kawasan Elit */}
              <ellipse cx="860" cy="130" rx="42" ry="26" fill="#4ea8de" stroke="#ffffff" strokeWidth="2" />
              <ellipse cx="860" cy="130" rx="30" ry="18" fill="#56cfe1" opacity="0.75" />
              <circle cx="860" cy="130" r="6" fill="#ffffff" />
              {/* Jalur Paving Elegan */}
              <path
                d="M 860 156 L 860 210"
                stroke="#d8e2dc"
                strokeWidth="8"
                strokeDasharray="4,2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Paving Jalan Setapak Menuju Pintu Utama */}
          <path
            d={`M ${houseX + 110} ${houseY + houseH} L ${houseX + 110} ${680 - lotInsetY}`}
            stroke="#c4b5a0"
            strokeWidth="24"
            strokeLinecap="square"
            strokeDasharray="10,2"
            opacity="0.85"
          />

          {/* Papan Nama Kawasan Ames (Sims Wooden Signpost) */}
          <g id="neighborhood-sign" transform="translate(48, 48)">
            <rect
              x="0"
              y="0"
              width="210"
              height="44"
              rx="6"
              fill="#2e1f13"
              stroke="#593c20"
              strokeWidth="2.5"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.45))"
            />
            <rect x="4" y="4" width="202" height="36" rx="4" fill="#422c19" />
            <text x="14" y="20" fill="#ffcb05" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              AMES, IOWA
            </text>
            <text
              x="14"
              y="34"
              fill="#ffffff"
              fontSize="12"
              fontFamily="sans-serif"
              fontWeight="bold"
              letterSpacing="0.02em"
            >
              {neighborhoodName.length > 20 ? `${neighborhoodName.slice(0, 18)}...` : neighborhoodName}
            </text>
          </g>
        </g>

        {/* ========================================================
            2. GARIS BASEMENT (TOTAL BSMT SF)
            ======================================================== */}
        {totalBsmtSF > 0 && (
          <g id="scene-basement" className="transition-all duration-500 ease-out">
            <rect
              x={houseX - 10}
              y={houseY - 10}
              width={houseW + 20}
              height={houseH + 20}
              rx="6"
              fill="rgba(43, 90, 133, 0.12)"
              stroke="#4ea1ed"
              strokeWidth="2"
              strokeDasharray="8,5"
            />
            <text
              x={houseX}
              y={houseY - 16}
              fill="#64b5f6"
              fontSize="11"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              Basement: {totalBsmtSF.toLocaleString("en-US")} sq ft
            </text>
          </g>
        )}

        {/* ========================================================
            3. GARASI & MOBIL (GARAGE CARS: 0-4)
            ======================================================== */}
        {garageCars > 0 && (
          <g id="scene-garage" className="transition-all duration-500 ease-out">
            {/* Aspal Jalan Masuk Mobil (Driveway) */}
            <rect
              x={garageX}
              y={garageY + garageH}
              width={garageW}
              height={680 - (garageY + garageH) - lotInsetY}
              fill="url(#driveway-pattern)"
              stroke="#22252a"
              strokeWidth="2"
            />

            {/* Bangunan Garasi */}
            <rect
              x={garageX}
              y={garageY}
              width={garageW}
              height={garageH}
              rx="4"
              fill="#525866"
              stroke={floorTheme.wallColor}
              strokeWidth={floorTheme.wallWidth}
            />

            {/* Pintu Garasi Geser */}
            <line
              x1={garageX + 6}
              y1={garageY + garageH}
              x2={garageX + garageW - 6}
              y2={garageY + garageH}
              stroke="#ffd166"
              strokeWidth="4"
            />

            {/* Mobil-mobil yang Terparkir di Garasi (1 s.d. 4) */}
            {Array.from({ length: garageCars }).map((_, idx) => {
              const carW = 38;
              const carH = Math.min(84, garageH - 24);
              const carSpacing = garageW / (garageCars + 1);
              const carX = garageX + carSpacing * (idx + 1) - carW / 2;
              const carY = garageY + 12;
              const carColors = ["#06d6a0", "#ef476f", "#118ab2", "#ffd166"];
              const carColor = carColors[idx % carColors.length];

              return (
                <g key={`car-${idx}`} id={`car-${idx}`}>
                  {/* Badan Mobil */}
                  <rect x={carX} y={carY} width={carW} height={carH} rx="8" fill={carColor} />
                  {/* Kaca Depan */}
                  <rect
                    x={carX + 4}
                    y={carY + carH * 0.52}
                    width={carW - 8}
                    height={carH * 0.22}
                    rx="3"
                    fill="#1e293b"
                    opacity="0.85"
                  />
                  {/* Kaca Belakang */}
                  <rect
                    x={carX + 5}
                    y={carY + 8}
                    width={carW - 10}
                    height={carH * 0.16}
                    rx="2"
                    fill="#1e293b"
                    opacity="0.75"
                  />
                  {/* Atap Mobil */}
                  <rect
                    x={carX + 6}
                    y={carY + carH * 0.28}
                    width={carW - 12}
                    height={carH * 0.22}
                    rx="2"
                    fill={carColor}
                    filter="brightness(0.85)"
                  />
                  {/* Lampu Depan */}
                  <circle cx={carX + 7} cy={carY + carH - 3} r="3" fill="#fff9db" />
                  <circle cx={carX + carW - 7} cy={carY + carH - 3} r="3" fill="#fff9db" />
                </g>
              );
            })}
          </g>
        )}

        {/* ========================================================
            4. BANGUNAN UTAMA & DENAH RUANGAN (GRLIVAREA & DETAIL)
            ======================================================== */}
        <g id="scene-house-foundation" className="transition-all duration-500 ease-out">
          {/* Pondasi & Lantai Keseluruhan */}
          <rect
            x={houseX}
            y={houseY}
            width={houseW}
            height={houseH}
            rx="4"
            fill="url(#oak-pattern)"
            stroke={floorTheme.wallColor}
            strokeWidth={floorTheme.wallWidth}
            filter="drop-shadow(0 12px 20px rgba(0,0,0,0.5))"
          />

          {/* Dinding Pembatas Ruangan Internal */}
          {/* 4.1 Ruang Tamu / Keluarga (Kiri Bawah) */}
          <rect
            x={houseX + 16}
            y={houseY + Math.round(houseH * 0.44)}
            width={Math.round(houseW * 0.52)}
            height={Math.round(houseH * 0.52)}
            fill="none"
            stroke={floorTheme.wallColor}
            strokeWidth="3"
          />
          {/* Karpet Mewah Ruang Tamu */}
          <rect
            x={houseX + 32}
            y={houseY + Math.round(houseH * 0.54)}
            width={Math.round(houseW * 0.38)}
            height={Math.round(houseH * 0.32)}
            rx="6"
            fill={overallQual >= 7 ? "#800e13" : "#457b9d"}
            opacity="0.8"
          />
          {/* Sofa Ruang Tamu */}
          <rect
            x={houseX + 44}
            y={houseY + Math.round(houseH * 0.58)}
            width={Math.round(houseW * 0.24)}
            height="18"
            rx="4"
            fill="#e9ecef"
            stroke="#adb5bd"
          />

          {/* 4.2 Dapur & Area Makan (Kanan / KitchenQual: Fa-Ex) */}
          <g id="kitchen-zone">
            <rect
              x={houseX + Math.round(houseW * 0.58)}
              y={houseY + 14}
              width={Math.round(houseW * 0.38)}
              height={Math.round(houseH * 0.42)}
              fill="rgba(255, 255, 255, 0.08)"
              stroke={floorTheme.wallColor}
              strokeWidth="3"
            />
            {/* Meja Dapur / Kitchen Counter */}
            <rect
              x={houseX + Math.round(houseW * 0.62)}
              y={houseY + 22}
              width={Math.round(houseW * 0.32)}
              height="22"
              rx="2"
              fill={
                kitchenQual === "EX"
                  ? "#1b263b"
                  : kitchenQual === "GD"
                    ? "#415a77"
                    : kitchenQual === "TA"
                      ? "#778da9"
                      : "#a39b8b"
              }
              stroke={kitchenQual === "EX" ? "#ffd166" : "#e0e1dd"}
              strokeWidth={kitchenQual === "EX" ? "2" : "1"}
            />
            {/* Kompor 4 Tungku */}
            <circle cx={houseX + Math.round(houseW * 0.68)} cy={houseY + 33} r="4" fill="#000000" />
            <circle cx={houseX + Math.round(houseW * 0.74)} cy={houseY + 33} r="4" fill="#000000" />
            {/* Bak Cuci Piring Logam (Sink) */}
            <rect
              x={houseX + Math.round(houseW * 0.82)}
              y={houseY + 26}
              width="24"
              height="14"
              rx="2"
              fill="#dcdcdc"
              stroke="#808080"
            />

            {/* Kitchen Island Mewah khusus KitchenQual = Gd atau Ex */}
            {["GD", "EX"].includes(kitchenQual) && (
              <g id="kitchen-island">
                <rect
                  x={houseX + Math.round(houseW * 0.66)}
                  y={houseY + 60}
                  width={Math.round(houseW * 0.24)}
                  height="24"
                  rx="4"
                  fill={kitchenQual === "EX" ? "#0d1b2a" : "#2a4365"}
                  stroke={kitchenQual === "EX" ? "#ffcb05" : "#cbd5e1"}
                  strokeWidth="1.5"
                />
                {/* Kursi Bar (Stools) */}
                <circle cx={houseX + Math.round(houseW * 0.70)} cy={houseY + 90} r="4.5" fill="#f59e0b" />
                <circle cx={houseX + Math.round(houseW * 0.78)} cy={houseY + 90} r="4.5" fill="#f59e0b" />
                <circle cx={houseX + Math.round(houseW * 0.86)} cy={houseY + 90} r="4.5" fill="#f59e0b" />
              </g>
            )}
          </g>

          {/* 4.3 Kamar Mandi (FullBath: 0 - 3) */}
          <g id="bathrooms-zone">
            {fullBath >= 1 && (
              /* Kamar Mandi Utama 1 */
              <g id="bath-1">
                <rect
                  x={houseX + 16}
                  y={houseY + 16}
                  width="74"
                  height="64"
                  fill="url(#tile-pattern)"
                  stroke={floorTheme.wallColor}
                  strokeWidth="3"
                />
                {/* Bathtub Putih */}
                <rect
                  x={houseX + 22}
                  y={houseY + 22}
                  width="30"
                  height="48"
                  rx="8"
                  fill="#ffffff"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                {/* Kloset Duduk */}
                <ellipse cx={houseX + 70} cy={houseY + 34} rx="7" ry="9" fill="#ffffff" stroke="#94a3b8" />
                <rect x={houseX + 63} y={houseY + 20} width="14" height="6" rx="2" fill="#e2e8f0" />
              </g>
            )}

            {fullBath >= 2 && (
              /* Kamar Mandi 2 */
              <g id="bath-2">
                <rect
                  x={houseX + 96}
                  y={houseY + 16}
                  width="68"
                  height="64"
                  fill="url(#tile-pattern)"
                  stroke={floorTheme.wallColor}
                  strokeWidth="3"
                />
                {/* Shower Walk-in Kaca */}
                <rect
                  x={houseX + 102}
                  y={houseY + 22}
                  width="28"
                  height="28"
                  fill="#cffafe"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                {/* Kloset */}
                <ellipse cx={houseX + 146} cy={houseY + 44} rx="6" ry="8" fill="#ffffff" stroke="#94a3b8" />
              </g>
            )}

            {fullBath >= 3 && (
              /* Kamar Mandi 3 */
              <g id="bath-3">
                <rect
                  x={houseX + Math.round(houseW * 0.62)}
                  y={houseY + Math.round(houseH * 0.58)}
                  width="60"
                  height="54"
                  fill="url(#tile-pattern)"
                  stroke={floorTheme.wallColor}
                  strokeWidth="3"
                />
                <rect
                  x={houseX + Math.round(houseW * 0.62) + 6}
                  y={houseY + Math.round(houseH * 0.58) + 6}
                  width="22"
                  height="22"
                  fill="#cffafe"
                  stroke="#38bdf8"
                />
                <ellipse
                  cx={houseX + Math.round(houseW * 0.62) + 44}
                  cy={houseY + Math.round(houseH * 0.58) + 32}
                  rx="6"
                  ry="8"
                  fill="#ffffff"
                  stroke="#94a3b8"
                />
              </g>
            )}
          </g>

          {/* 4.4 Tangga Basement jika TotalBsmtSF > 0 */}
          {totalBsmtSF > 0 && (
            <g id="basement-stairs" transform={`translate(${houseX + 172}, ${houseY + 20})`}>
              <rect x="0" y="0" width="38" height="58" fill="#2d3748" stroke="#718096" strokeWidth="1.5" />
              <line x1="0" y1="10" x2="38" y2="10" stroke="#cbd5e0" strokeWidth="1.5" />
              <line x1="0" y1="20" x2="38" y2="20" stroke="#cbd5e0" strokeWidth="1.5" />
              <line x1="0" y1="30" x2="38" y2="30" stroke="#cbd5e0" strokeWidth="1.5" />
              <line x1="0" y1="40" x2="38" y2="40" stroke="#cbd5e0" strokeWidth="1.5" />
              <line x1="0" y1="50" x2="38" y2="50" stroke="#cbd5e0" strokeWidth="1.5" />
              <polygon points="19,54 13,44 25,44" fill="#63b3ed" />
            </g>
          )}

          {/* 4.5 Perapian / Fireplaces (0 s.d. 3) */}
          {fireplaces >= 1 && (
            /* Perapian 1: Ruang Tamu Utama */
            <g id="fireplace-1" transform={`translate(${houseX - 8}, ${houseY + Math.round(houseH * 0.62)})`}>
              <rect x="0" y="0" width="16" height="36" fill="#78350f" stroke="#451a03" strokeWidth="2" />
              <circle cx="8" cy="18" r="5" fill="#f97316" />
              <circle cx="8" cy="18" r="3" fill="#fef08a" />
            </g>
          )}

          {fireplaces >= 2 && (
            /* Perapian 2: Kamar Tidur / Suite */
            <g id="fireplace-2" transform={`translate(${houseX + Math.round(houseW * 0.42)}, ${houseY - 8})`}>
              <rect x="0" y="0" width="36" height="16" fill="#78350f" stroke="#451a03" strokeWidth="2" />
              <circle cx="18" cy="8" r="5" fill="#f97316" />
              <circle cx="18" cy="8" r="3" fill="#fef08a" />
            </g>
          )}

          {fireplaces >= 3 && (
            /* Perapian 3: Patio Belakang / Dining Area */
            <g
              id="fireplace-3"
              transform={`translate(${houseX + houseW - 8}, ${houseY + Math.round(houseH * 0.22)})`}
            >
              <rect x="0" y="0" width="16" height="32" fill="#78350f" stroke="#451a03" strokeWidth="2" />
              <circle cx="8" cy="16" r="4.5" fill="#f97316" />
              <circle cx="8" cy="16" r="2.5" fill="#fef08a" />
            </g>
          )}

          {/* Kusen & Pintu Utama Masuk */}
          <rect
            x={houseX + 96}
            y={houseY + houseH - 4}
            width="28"
            height="8"
            fill="#8b5a2b"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>

        {/* ========================================================
            5. PENANDA BERLIAN HIJAU (PLUMBOB) MELAYANG
            ======================================================== */}
        <g id="scene-plumbob" transform={`translate(${plumbobX}, ${plumbobY})`}>
          {/* Bayangan di Lantai */}
          <ellipse cx="0" cy="52" rx="14" ry="5" fill="rgba(0, 0, 0, 0.35)" />

          {/* Berlian Hijau Melayang dengan Animasi */}
          <g
            className="sims-animate-plumbob origin-center"
            style={{
              filter: "url(#plumbob-glow)",
              transition: "transform 0.4s ease-out",
            }}
          >
            {/* Segi Atas Kiri */}
            <polygon points="0,-36 -14,0 0,0" fill="url(#plumbob-top-left)" />
            {/* Segi Atas Kanan */}
            <polygon points="0,-36 0,0 14,0" fill="url(#plumbob-top-right)" />
            {/* Segi Bawah Kiri */}
            <polygon points="0,36 -14,0 0,0" fill="url(#plumbob-bottom-left)" />
            {/* Segi Bawah Kanan */}
            <polygon points="0,36 0,0 14,0" fill="url(#plumbob-bottom-right)" />

            {/* Garis Kilau Tepi Tengah */}
            <line x1="-14" y1="0" x2="14" y2="0" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
            <line x1="0" y1="-36" x2="0" y2="36" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
export default WorldScene;
