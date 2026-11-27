"use client";

import React, { useId } from "react";

import { getNeighborhoodName } from "@/lib/neighborhoods";
import type { FeatureValues } from "@/lib/validation";

export interface WorldSceneProps {
  /** Nilai 10 fitur dari form atau dock Sims. */
  values?: FeatureValues | Record<string, string | number>;
  /** Atribut kelas CSS pembungkus (misal untuk penataan ukuran). */
  className?: string;
}

/**
 * Denah interaktif rumah Ames bergaya dunia simulasi kehidupan yang CERAH.
 *
 * Seluruh 10 fitur input memengaruhi gambar:
 * - GrLivArea: skala denah bangunan.
 * - LotArea: ukuran kavling dan kerapatan taman.
 * - TotalBsmtSF: garis fondasi basement + tangga.
 * - FullBath: jumlah kamar mandi.
 * - KitchenQual: material dapur, island, dan kursi bar.
 * - OverallQual: material lantai (keramik, kayu, marmer) + kualitas furnitur.
 * - YearBuilt: aksen era (pagar, taman, detail klasik).
 * - GarageCars: lebar garasi dan jumlah mobil.
 * - Fireplaces: perapian bata.
 * - Neighborhood: papan nama kawasan dan nuansa lanskap.
 *
 * Penanda berlian hijau mengilap melayang di atas rumah.
 */
export function WorldScene({ values = {}, className = "" }: WorldSceneProps) {
  const titleId = useId();
  const descId = useId();

  // 1. Sanitasi nilai fitur
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

  // 2. Dimensi denah
  const normLiv = (grLivArea - 334) / (5642 - 334);
  const houseW = Math.round(350 + normLiv * 110); // 350 - 460
  const houseH = Math.round(240 + normLiv * 100); // 240 - 340
  const verandaW = 62;
  const totalW = houseW + verandaW;
  const startX = Math.round(580 - totalW / 2);
  const houseX = startX + verandaW;
  const houseY = Math.round(226 + (300 - houseH) * 0.2);

  const lotX = 262;
  const lotY = 150;
  const lotW = 700;
  const lotH = 600;
  const lotBottom = lotY + lotH;
  const lotRight = lotX + lotW;

  // Garasi (0 - 4 mobil), dibatasi agar tetap di dalam kavling
  const garageRawW =
    garageCars === 0 ? 0 : garageCars === 1 ? 52 : garageCars === 2 ? 76 : garageCars === 3 ? 96 : 116;
  const garageX = houseX + houseW + 10;
  const garageW = Math.max(0, Math.min(garageRawW, lotRight - garageX - 12));
  const garageH = Math.round(houseH * 0.72);
  const garageY = houseY + houseH - garageH;

  // Skala taman mengikuti LotArea (logaritmik halus)
  const normLot = (Math.log10(lotArea) - Math.log10(1300)) / (Math.log10(215245) - Math.log10(1300));
  const gardenDensity = 0.35 + normLot * 0.65;

  // 3. Material lantai berdasarkan OverallQual
  const floorPattern =
    overallQual >= 9 ? "url(#marbleFloor)" : overallQual <= 3 ? "url(#tileFloor)" : "url(#woodFloor)";
  const rugColor = overallQual >= 7 ? "#8C6239" : "#2B4C7E";
  const sofaColor = overallQual >= 8 ? "#FFFFFF" : overallQual >= 5 ? "#E9EEF5" : "#D7DEE6";
  const carColors = ["#EF4444", "#E2E8F0", "#38BDF8", "#FACC15"];

  // Nuansa lingkungan
  const isUpscale = ["NridgHt", "NoRidge", "StoneBr", "Somerst"].includes(neighborhood);
  const isNature = ["Timber", "ClearCr", "Veenker", "Gilbert"].includes(neighborhood);
  const isHistoric = yearBuilt < 1950;

  // Titik penanda hijau
  const markerX = houseX + houseW / 2;
  const markerY = houseY + Math.round(houseH * 0.34);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden bg-[#589C34] ${className}`}
      style={{
        backgroundImage:
          "repeating-conic-gradient(#589C34 0% 25%, #5FA63A 0% 50%)",
        backgroundSize: "56px 56px",
      }}
    >
      <svg
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        viewBox="0 0 1200 820"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full transition-all duration-500 ease-out"
      >
        <title id={titleId}>Denah rumah interaktif Ames, Iowa</title>
        <desc id={descId}>
          Ilustrasi tampak atas properti di {neighborhoodName}. Kualitas {overallQual}/10, luas{" "}
          {grLivArea} sq ft, {garageCars} mobil di garasi, {fullBath} kamar mandi, {fireplaces}{" "}
          perapian, tahun {yearBuilt}.
        </desc>

        <defs>
          {/* Rumput kotak-kotak cerah */}
          <pattern id="grassPattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <rect width="32" height="32" fill="#589C34" />
            <rect x="0" y="0" width="16" height="16" fill="#5FA63A" opacity="0.75" />
            <rect x="16" y="16" width="16" height="16" fill="#5FA63A" opacity="0.75" />
          </pattern>

          {/* Aspal jalan */}
          <pattern id="asphalt" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#2B3034" />
            <circle cx="10" cy="12" r="0.8" fill="#3B4247" />
            <circle cx="28" cy="30" r="0.9" fill="#212529" />
            <circle cx="33" cy="8" r="0.7" fill="#3B4247" />
          </pattern>

          {/* Lantai kayu hangat */}
          <pattern id="woodFloor" width="48" height="16" patternUnits="userSpaceOnUse">
            <rect width="48" height="16" fill="#D5B895" />
            <line x1="0" y1="8" x2="48" y2="8" stroke="#BC9C76" strokeWidth="1" />
            <line x1="24" y1="0" x2="24" y2="8" stroke="#BC9C76" strokeWidth="1" />
            <line x1="10" y1="8" x2="10" y2="16" stroke="#BC9C76" strokeWidth="1" />
          </pattern>

          {/* Marmer cerah */}
          <pattern id="marbleFloor" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#F4F1EA" />
            <path d="M0 40 L40 0 M-10 10 L10 -10 M30 50 L50 30" stroke="#DFD9CE" strokeWidth="1.2" />
            <rect width="40" height="40" fill="none" stroke="#E5DFD5" strokeWidth="1" />
          </pattern>

          {/* Keramik terang */}
          <pattern id="tileFloor" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#E8E4DC" />
            <rect width="19" height="19" fill="none" stroke="#CFC9BD" strokeWidth="0.8" />
          </pattern>

          {/* Deck serambi */}
          <pattern id="deckWood" width="12" height="40" patternUnits="userSpaceOnUse">
            <rect width="12" height="40" fill="#9E6B43" />
            <line x1="12" y1="0" x2="12" y2="40" stroke="#754B2B" strokeWidth="1.5" />
          </pattern>

          {/* Trotoar bergaris halus */}
          <pattern id="sidewalk" width="26" height="26" patternUnits="userSpaceOnUse">
            <rect width="26" height="26" fill="#B8BEC2" />
            <path d="M26 0 L0 0 0 26" fill="none" stroke="#9AA1A6" strokeWidth="1.5" />
          </pattern>

          <filter id="houseShadow" x="-12%" y="-12%" width="130%" height="130%">
            <feDropShadow dx="8" dy="12" stdDeviation="8" floodColor="#000000" floodOpacity="0.38" />
          </filter>
          <filter id="objShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
          <filter id="markerGlow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ========================================================
            A. LINGKUNGAN: RUMPUT, JALAN, TROTOAR, TETANGGA
            ======================================================== */}
        <g id="environment">
          <rect width="1200" height="820" fill="url(#grassPattern)" />

          {/* Jalan vertikal kiri + horizontal atas + jalan kanan */}
          <rect x="0" y="0" width="215" height="820" fill="url(#asphalt)" />
          <rect x="0" y="0" width="1200" height="112" fill="url(#asphalt)" />
          <rect x="1000" y="0" width="200" height="820" fill="url(#asphalt)" />

          {/* Trotoar */}
          <rect x="215" y="112" width="28" height="708" fill="url(#sidewalk)" stroke="#8C9398" strokeWidth="2" />
          <rect x="215" y="112" width="757" height="24" fill="url(#sidewalk)" stroke="#8C9398" strokeWidth="2" />
          <rect x="972" y="136" width="28" height="684" fill="url(#sidewalk)" stroke="#8C9398" strokeWidth="2" />

          {/* Marka jalan kuning putus-putus */}
          <line x1="107" y1="150" x2="107" y2="820" stroke="#EAB308" strokeWidth="4" strokeDasharray="20,16" />
          <line x1="250" y1="56" x2="960" y2="56" stroke="#EAB308" strokeWidth="4" strokeDasharray="20,16" />

          {/* Zebra cross putih di simpang kiri */}
          <g fill="#E2E8F0" opacity="0.92">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={`zebra-${i}`} x={24 + i * 30} y="152" width="18" height="48" rx="2" />
            ))}
          </g>

          {/* Bangunan tetangga kiri */}
          <g transform="translate(-24, 236)" filter="url(#houseShadow)">
            <rect x="0" y="0" width="120" height="340" rx="4" fill="#D6D3CD" />
            <rect x="16" y="16" width="88" height="308" fill="#9E2A3B" />
            <rect x="30" y="32" width="60" height="276" fill="#CBD5E1" />
            <rect x="30" y="32" width="60" height="276" fill="none" stroke="#94A3B8" strokeWidth="2" />
          </g>

          {/* Bangunan tetangga kanan */}
          <g transform="translate(1036, 190)" filter="url(#houseShadow)">
            <rect x="0" y="0" width="140" height="300" rx="4" fill="#E7E2D8" />
            <rect x="16" y="16" width="108" height="268" fill="#3F6E8C" />
            <rect x="30" y="30" width="80" height="240" fill="#DCEEFB" />
            <rect x="30" y="30" width="80" height="240" fill="none" stroke="#94A3B8" strokeWidth="2" />
          </g>

          {/* Mobil sedan putih di jalan atas */}
          <g transform="translate(300, 22)" filter="url(#objShadow)">
            <rect x="0" y="4" width="128" height="54" rx="16" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
            <rect x="28" y="9" width="68" height="44" rx="10" fill="#334155" />
            <rect x="44" y="11" width="38" height="40" rx="6" fill="#F1F5F9" />
            <rect x="122" y="10" width="5" height="10" rx="2" fill="#FEF08A" />
            <rect x="122" y="38" width="5" height="10" rx="2" fill="#FEF08A" />
          </g>

          {/* Mobil patroli di jalan kiri */}
          <g transform="translate(150, 246)" filter="url(#objShadow)">
            <rect x="0" y="0" width="54" height="126" rx="15" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <rect x="5" y="36" width="44" height="52" rx="6" fill="#F8FAFC" />
            <rect x="9" y="24" width="36" height="16" rx="4" fill="#334155" />
            <rect x="9" y="84" width="36" height="14" rx="4" fill="#334155" />
            <rect x="12" y="56" width="14" height="7" rx="2" fill="#EF4444" />
            <rect x="28" y="56" width="14" height="7" rx="2" fill="#3B82F6" />
          </g>

          {/* Pohon pinggir jalan */}
          {[
            [252, 780],
            [972, 770],
            [1044, 560],
            [1060, 700],
            [258, 148],
          ].map(([cx, cy], i) => (
            <g key={`street-tree-${i}`} filter="url(#objShadow)">
              <circle cx={cx} cy={cy} r="22" fill="#2E7D32" />
              <circle cx={cx - 4} cy={cy - 4} r="14" fill="#43A047" />
            </g>
          ))}
        </g>

        {/* ========================================================
            B. KAVLING & TAMAN
            ======================================================== */}
        <g id="lot">
          <rect
            x={lotX}
            y={lotY}
            width={lotW}
            height={lotH}
            rx="10"
            fill="url(#grassPattern)"
            stroke="#48822A"
            strokeWidth="3"
          />

          {/* Pagar kayu klasik untuk rumah tua */}
          {isHistoric && (
            <g stroke="#F8FAFC" strokeWidth="3" opacity="0.85">
              <line x1={lotX + 8} y1={lotBottom - 10} x2={lotRight - 8} y2={lotBottom - 10} />
              {Array.from({ length: 22 }).map((_, i) => (
                <line
                  key={`fence-${i}`}
                  x1={lotX + 16 + i * 31}
                  y1={lotBottom - 18}
                  x2={lotX + 16 + i * 31}
                  y2={lotBottom - 2}
                />
              ))}
            </g>
          )}

          {/* Tanaman hias mengikuti kepadatan taman */}
          {[
            [lotX + 40, lotY + 40],
            [lotRight - 46, lotY + 52],
            [lotX + 54, lotBottom - 54],
            [lotRight - 58, lotBottom - 66],
          ]
            .slice(0, 2 + Math.round(gardenDensity * 2))
            .map(([cx, cy], i) => (
              <g key={`shrub-${i}`} filter="url(#objShadow)">
                <circle cx={cx} cy={cy} r="17" fill="#2E7D32" />
                <circle cx={cx - 3} cy={cy - 4} r="11" fill="#4ADE80" />
                <circle cx={cx + 5} cy={cy + 3} r="4" fill="#FDE68A" />
                <circle cx={cx - 6} cy={cy + 5} r="3.5" fill="#F472B6" />
              </g>
            ))}

          {/* Kolam hias kawasan elit */}
          {isUpscale && (
            <g id="upscale-pool" transform={`translate(${lotRight - 132}, ${lotY + 30})`}>
              <rect x="-8" y="-8" width="112" height="86" rx="12" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
              <rect x="0" y="0" width="96" height="70" rx="8" fill="#0EA5E9" stroke="#38BDF8" strokeWidth="4" />
              <rect x="9" y="9" width="78" height="52" rx="6" fill="#38BDF8" opacity="0.8" />
              <circle cx="62" cy="34" r="9" fill="none" stroke="#F43F5E" strokeWidth="5" />
            </g>
          )}

          {/* Jalur taman alami */}
          {isNature && (
            <g id="nature-garden" opacity="0.95">
              <circle cx={lotX + 42} cy={lotY + 130} r="26" fill="#2E7D32" />
              <circle cx={lotX + 42} cy={lotY + 130} r="17" fill="#43A047" />
              <circle cx={lotX + 58} cy={lotY + 470} r="30" fill="#2E7D32" />
              <circle cx={lotX + 58} cy={lotY + 470} r="20" fill="#66BB6A" />
              <rect x={lotX + 26} y={lotY + 200} width="64" height="30" rx="7" fill="#795548" />
              <circle cx={lotX + 42} cy={lotY + 215} r="5" fill="#FF4081" />
              <circle cx={lotX + 58} cy={lotY + 215} r="5" fill="#FFEB3B" />
              <circle cx={lotX + 74} cy={lotY + 215} r="5" fill="#40C4FF" />
            </g>
          )}

          {/* Papan nama kawasan */}
          <g id="neighborhood-sign" transform={`translate(${lotX + 22}, ${lotY + 18})`} filter="url(#objShadow)">
            <rect x="0" y="0" width="224" height="48" rx="7" fill="#5D4037" stroke="#F8FAFC" strokeWidth="2.5" />
            <rect x="5" y="5" width="214" height="38" rx="4" fill="#8C6239" />
            <text x="14" y="21" fill="#FDE68A" fontSize="10" fontFamily="Nunito, sans-serif" fontWeight="800" letterSpacing="1">
              AMES, IOWA
            </text>
            <text x="14" y="36" fill="#FFFFFF" fontSize="12" fontFamily="Nunito, sans-serif" fontWeight="800">
              {neighborhoodName.length > 22 ? `${neighborhoodName.slice(0, 20)}...` : neighborhoodName}
            </text>
          </g>

          {/* Jalur setapak dari pintu ke jalan */}
          <path
            d={`M ${houseX + Math.round(houseW * 0.36)} ${houseY + houseH} L ${houseX + Math.round(houseW * 0.36)} ${lotBottom - 6}`}
            stroke="#E7E2D8"
            strokeWidth="26"
            strokeLinecap="square"
            strokeDasharray="12,4"
            opacity="0.9"
          />
        </g>

        {/* ========================================================
            C. GARASI, DRIVEWAY & MOBIL
            ======================================================== */}
        {garageCars > 0 && garageW > 0 && (
          <g id="garage" className="transition-all duration-500 ease-out">
            {/* Driveway ke jalan */}
            <rect
              x={garageX + 6}
              y={garageY + garageH}
              width={Math.max(0, garageW - 12)}
              height={lotBottom - (garageY + garageH) - 4}
              fill="url(#asphalt)"
              stroke="#8C9398"
              strokeWidth="2"
            />
            <line
              x1={garageX + 10}
              y1={garageY + garageH + 6}
              x2={garageX + 10}
              y2={lotBottom - 8}
              stroke="#EAB308"
              strokeWidth="2"
              strokeDasharray="8,8"
              opacity="0.8"
            />

            {/* Bangunan garasi */}
            <rect
              x={garageX}
              y={garageY}
              width={garageW}
              height={garageH}
              rx="5"
              fill="#CBD5E1"
              stroke="#5C4033"
              strokeWidth="6"
              filter="url(#houseShadow)"
            />
            <rect x={garageX + 5} y={garageY + 5} width={garageW - 10} height={garageH - 10} fill="#E2E8F0" />
            <line
              x1={garageX + garageW / 2}
              y1={garageY + 8}
              x2={garageX + garageW / 2}
              y2={garageY + garageH - 8}
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="8,6"
            />

            {/* Mobil terparkir */}
            {Array.from({ length: garageCars }).map((_, idx) => {
              const carW = Math.max(16, Math.min(26, (garageW - 16) / (garageCars + 0.4)));
              const carH = Math.max(34, Math.min(72, garageH - 22));
              const spacing = garageW / (garageCars + 0.6);
              const carX = garageX + spacing * (idx + 0.8) - carW / 2;
              const carY = garageY + (garageH - carH) / 2;
              const carColor = carColors[idx % carColors.length];
              return (
                <g key={`garage-car-${idx}`} filter="url(#objShadow)">
                  <rect x={carX} y={carY} width={carW} height={carH} rx={carW / 2.6} fill={carColor} stroke="#64748B" strokeWidth="1.5" />
                  <rect x={carX + 4} y={carY + carH * 0.24} width={carW - 8} height={carH * 0.26} rx="4" fill="#1E293B" />
                  <rect x={carX + 4} y={carY + carH * 0.58} width={carW - 8} height={carH * 0.22} rx="4" fill="#1E293B" />
                  <rect x={carX + 5} y={carY + carH * 0.5} width={carW - 10} height={carH * 0.08} fill="#F8FAFC" opacity="0.8" />
                  <circle cx={carX + 4} cy={carY + carH - 4} r="2.5" fill="#FEF08A" />
                  <circle cx={carX + carW - 4} cy={carY + carH - 4} r="2.5" fill="#FEF08A" />
                </g>
              );
            })}
          </g>
        )}

        {/* ========================================================
            D. FONDASI BASEMENT
            ======================================================== */}
        {totalBsmtSF > 0 && (
          <g id="basement-outline" className="transition-all duration-500 ease-out">
            <rect
              x={houseX - 10}
              y={houseY - 10}
              width={houseW + 20}
              height={houseH + 20}
              rx="8"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#0EA5E9"
              strokeWidth="2.5"
              strokeDasharray="9,6"
            />
            <text
              x={houseX}
              y={houseY - 16}
              fill="#0D59A7"
              fontSize="11"
              fontFamily="Nunito, sans-serif"
              fontWeight="800"
            >
              Basement {totalBsmtSF.toLocaleString("en-US")} sq ft
            </text>
          </g>
        )}

        {/* ========================================================
            E. RUMAH UTAMA: SERAMBI + DENAH RUANGAN
            ======================================================== */}
        <g id="main-house" filter="url(#houseShadow)">
          {/* Serambi kayu di kiri */}
          <rect
            x={houseX - verandaW}
            y={houseY + 18}
            width={verandaW}
            height={houseH - 36}
            fill="url(#deckWood)"
            stroke="#5D4037"
            strokeWidth="4"
          />
          <line
            x1={houseX - verandaW + 10}
            y1={houseY + 26}
            x2={houseX - verandaW + 10}
            y2={houseY + houseH - 26}
            stroke="#F8FAFC"
            strokeWidth="2"
            opacity="0.5"
          />
          {/* Pagar serambi */}
          {Array.from({ length: Math.max(3, Math.floor((houseH - 40) / 34)) }).map((_, i) => (
            <circle
              key={`veranda-post-${i}`}
              cx={houseX - verandaW + 8}
              cy={houseY + 32 + i * 34}
              r="4"
              fill="#F8FAFC"
              stroke="#754B2B"
              strokeWidth="1.5"
            />
          ))}

          {/* Lantai keseluruhan */}
          <rect
            x={houseX}
            y={houseY}
            width={houseW}
            height={houseH}
            rx="5"
            fill={floorPattern}
            stroke="#5C4033"
            strokeWidth="8"
          />

          {/* Ruang 1: Kamar mandi utama (kiri atas) */}
          <rect
            x={houseX}
            y={houseY}
            width={Math.round(houseW * 0.34)}
            height={Math.round(houseH * 0.44)}
            fill="url(#tileFloor)"
            stroke="#5C4033"
            strokeWidth="6"
          />
          {fullBath >= 1 && (
            <g filter="url(#objShadow)">
              {/* Bathtub */}
              <rect
                x={houseX + 12}
                y={houseY + 14}
                width={Math.round(houseW * 0.16)}
                height={Math.round(houseH * 0.2)}
                rx="10"
                fill="#FFFFFF"
                stroke="#CBD5E1"
                strokeWidth="2"
              />
              <rect
                x={houseX + 16}
                y={houseY + 18}
                width={Math.round(houseW * 0.16) - 8}
                height={Math.round(houseH * 0.2) - 8}
                rx="7"
                fill="#E0F2FE"
              />
              {/* Vanity */}
              <rect
                x={houseX + Math.round(houseW * 0.19)}
                y={houseY + 12}
                width={Math.round(houseW * 0.13)}
                height="14"
                rx="3"
                fill="#F8FAFC"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />
              <circle cx={houseX + Math.round(houseW * 0.22)} cy={houseY + 19} r="4" fill="#E2E8F0" stroke="#64748B" />
              <circle cx={houseX + Math.round(houseW * 0.28)} cy={houseY + 19} r="4" fill="#E2E8F0" stroke="#64748B" />
              {/* Karpet mandala */}
              <circle
                cx={houseX + Math.round(houseW * 0.16)}
                cy={houseY + Math.round(houseH * 0.31)}
                r="16"
                fill="#FDE68A"
                stroke="#D97706"
                strokeWidth="2"
                strokeDasharray="5,3"
              />
            </g>
          )}

          {/* Ruang 2: Ruang keluarga + dapur (kanan atas) */}
          <rect
            x={houseX + Math.round(houseW * 0.34)}
            y={houseY}
            width={Math.round(houseW * 0.66)}
            height={Math.round(houseH * 0.44)}
            fill={floorPattern}
            stroke="#5C4033"
            strokeWidth="6"
          />
          <g filter="url(#objShadow)">
            {/* Karpet bergaris */}
            <rect
              x={houseX + Math.round(houseW * 0.39)}
              y={houseY + Math.round(houseH * 0.06)}
              width={Math.round(houseW * 0.28)}
              height={Math.round(houseH * 0.27)}
              rx="4"
              fill="#F5EFE6"
              stroke="#D6CCC2"
              strokeWidth="2"
            />
            {[0.44, 0.48, 0.52, 0.56, 0.6].map((p, i) => (
              <line
                key={`rug-stripe-${i}`}
                x1={houseX + Math.round(houseW * p)}
                y1={houseY + Math.round(houseH * 0.06)}
                x2={houseX + Math.round(houseW * p)}
                y2={houseY + Math.round(houseH * 0.33)}
                stroke="#D5BDAF"
                strokeWidth="3"
              />
            ))}
            {/* Sofa putih */}
            <rect
              x={houseX + Math.round(houseW * 0.4)}
              y={houseY + Math.round(houseH * 0.36)}
              width={Math.round(houseW * 0.24)}
              height="16"
              rx="6"
              fill={sofaColor}
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <rect
              x={houseX + Math.round(houseW * 0.41)}
              y={houseY + Math.round(houseH * 0.36) + 11}
              width={Math.round(houseW * 0.22)}
              height="5"
              rx="2"
              fill="#E2E8F0"
            />
            {/* Meja kopi */}
            <rect
              x={houseX + Math.round(houseW * 0.45)}
              y={houseY + Math.round(houseH * 0.24)}
              width={Math.round(houseW * 0.13)}
              height={Math.round(houseH * 0.06)}
              rx="3"
              fill="#8C6239"
              stroke="#5D4037"
              strokeWidth="1.5"
            />
            {/* Kitchen counter di tepi kanan atas */}
            <rect
              x={houseX + Math.round(houseW * 0.7)}
              y={houseY + 10}
              width={Math.round(houseW * 0.27)}
              height="18"
              rx="3"
              fill={kitchenQual === "EX" ? "#334155" : kitchenQual === "GD" ? "#64748B" : "#A8B4C2"}
              stroke="#F8FAFC"
              strokeWidth="1.5"
            />
            <circle cx={houseX + Math.round(houseW * 0.75)} cy={houseY + 19} r="4" fill="#0F172A" />
            <circle cx={houseX + Math.round(houseW * 0.79)} cy={houseY + 19} r="4" fill="#0F172A" />
            <rect
              x={houseX + Math.round(houseW * 0.84)}
              y={houseY + 14}
              width="18"
              height="10"
              rx="2"
              fill="#E2E8F0"
              stroke="#94A3B8"
            />
            {/* Kitchen island untuk Gd/Ex */}
            {["GD", "EX"].includes(kitchenQual) && (
              <g>
                <rect
                  x={houseX + Math.round(houseW * 0.7)}
                  y={houseY + Math.round(houseH * 0.14)}
                  width={Math.round(houseW * 0.2)}
                  height="20"
                  rx="4"
                  fill={kitchenQual === "EX" ? "#1E293B" : "#475569"}
                  stroke={kitchenQual === "EX" ? "#FACC15" : "#E2E8F0"}
                  strokeWidth="1.5"
                />
                <circle cx={houseX + Math.round(houseW * 0.73)} cy={houseY + Math.round(houseH * 0.14) + 28} r="4" fill="#F59E0B" />
                <circle cx={houseX + Math.round(houseW * 0.79)} cy={houseY + Math.round(houseH * 0.14) + 28} r="4" fill="#F59E0B" />
                <circle cx={houseX + Math.round(houseW * 0.85)} cy={houseY + Math.round(houseH * 0.14) + 28} r="4" fill="#F59E0B" />
              </g>
            )}
            {/* Rak buku */}
            <rect
              x={houseX + Math.round(houseW * 0.93)}
              y={houseY + Math.round(houseH * 0.07)}
              width="12"
              height={Math.round(houseH * 0.3)}
              fill="#FFFFFF"
              stroke="#94A3B8"
              strokeWidth="1.5"
            />
          </g>

          {/* Ruang 3: Ruang kerja (kiri bawah) */}
          <rect
            x={houseX}
            y={houseY + Math.round(houseH * 0.44)}
            width={Math.round(houseW * 0.3)}
            height={Math.round(houseH * 0.56)}
            fill={floorPattern}
            stroke="#5C4033"
            strokeWidth="6"
          />
          <g filter="url(#objShadow)">
            <rect
              x={houseX + 12}
              y={houseY + Math.round(houseH * 0.53)}
              width={Math.round(houseW * 0.18)}
              height={Math.round(houseH * 0.22)}
              rx="4"
              fill="#FAF8F5"
              stroke="#E2E8F0"
              strokeWidth="2"
            />
            <rect
              x={houseX + 16}
              y={houseY + Math.round(houseH * 0.8)}
              width={Math.round(houseW * 0.16)}
              height="12"
              rx="3"
              fill="#FFFFFF"
              stroke="#94A3B8"
              strokeWidth="1.5"
            />
            <circle
              cx={houseX + Math.round(houseW * 0.11)}
              cy={houseY + Math.round(houseH * 0.76)}
              r="7"
              fill="#E2E8F0"
              stroke="#94A3B8"
            />
          </g>

          {/* Ruang 4: Foyer (tengah bawah) */}
          <rect
            x={houseX + Math.round(houseW * 0.3)}
            y={houseY + Math.round(houseH * 0.44)}
            width={Math.round(houseW * 0.16)}
            height={Math.round(houseH * 0.56)}
            fill={overallQual >= 9 ? "#E7DCC8" : "#8C6239"}
            stroke="#5C4033"
            strokeWidth="6"
          />
          <rect
            x={houseX + Math.round(houseW * 0.32)}
            y={houseY + Math.round(houseH * 0.54)}
            width={Math.round(houseW * 0.12)}
            height={Math.round(houseH * 0.26)}
            rx="3"
            fill={rugColor}
            stroke="#EAB308"
            strokeWidth="2.5"
          />
          <rect
            x={houseX + Math.round(houseW * 0.335)}
            y={houseY + Math.round(houseH * 0.56)}
            width={Math.round(houseW * 0.09)}
            height={Math.round(houseH * 0.22)}
            fill="none"
            stroke="#93C5FD"
            strokeWidth="1"
            strokeDasharray="4,3"
          />

          {/* Ruang 5: Kamar tidur utama (kanan bawah) */}
          <rect
            x={houseX + Math.round(houseW * 0.46)}
            y={houseY + Math.round(houseH * 0.44)}
            width={Math.round(houseW * 0.54)}
            height={Math.round(houseH * 0.56)}
            fill={floorPattern}
            stroke="#5C4033"
            strokeWidth="6"
          />
          <g filter="url(#objShadow)">
            <rect
              x={houseX + Math.round(houseW * 0.56)}
              y={houseY + Math.round(houseH * 0.5)}
              width={Math.round(houseW * 0.2)}
              height={Math.round(houseH * 0.34)}
              rx="4"
              fill="#F8FAFC"
              opacity="0.9"
            />
            {/* Rangka tempat tidur */}
            <rect
              x={houseX + Math.round(houseW * 0.58)}
              y={houseY + Math.round(houseH * 0.46)}
              width={Math.round(houseW * 0.17)}
              height={Math.round(houseH * 0.4)}
              rx="5"
              fill="#5D4037"
            />
            <rect
              x={houseX + Math.round(houseW * 0.59)}
              y={houseY + Math.round(houseH * 0.53)}
              width={Math.round(houseW * 0.15)}
              height={Math.round(houseH * 0.31)}
              rx="4"
              fill="#FFFFFF"
            />
            <rect
              x={houseX + Math.round(houseW * 0.59)}
              y={houseY + Math.round(houseH * 0.53)}
              width={Math.round(houseW * 0.15)}
              height={Math.round(houseH * 0.07)}
              fill="#E2E8F0"
            />
            <rect
              x={houseX + Math.round(houseW * 0.6)}
              y={houseY + Math.round(houseH * 0.48)}
              width={Math.round(houseW * 0.05)}
              height="8"
              rx="3"
              fill="#F8FAFC"
              stroke="#CBD5E1"
            />
            <rect
              x={houseX + Math.round(houseW * 0.68)}
              y={houseY + Math.round(houseH * 0.48)}
              width={Math.round(houseW * 0.05)}
              height="8"
              rx="3"
              fill="#F8FAFC"
              stroke="#CBD5E1"
            />
            {/* Meja samping */}
            <circle cx={houseX + Math.round(houseW * 0.55)} cy={houseY + Math.round(houseH * 0.55)} r="8" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
            <circle cx={houseX + Math.round(houseW * 0.78)} cy={houseY + Math.round(houseH * 0.55)} r="8" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
            {/* Lemari */}
            <rect
              x={houseX + Math.round(houseW * 0.48)}
              y={houseY + Math.round(houseH * 0.5)}
              width="14"
              height={Math.round(houseH * 0.26)}
              rx="3"
              fill="#FFFFFF"
              stroke="#94A3B8"
              strokeWidth="1.5"
            />
          </g>

          {/* Kamar mandi tambahan (FullBath 2 & 3) */}
          {fullBath >= 2 && (
            <g filter="url(#objShadow)">
              <rect
                x={houseX + Math.round(houseW * 0.36)}
                y={houseY + Math.round(houseH * 0.02)}
                width={Math.round(houseW * 0.1)}
                height={Math.round(houseH * 0.13)}
                fill="#CFFAFE"
                stroke="#38BDF8"
                strokeWidth="1.5"
              />
            </g>
          )}
          {fullBath >= 3 && (
            <g filter="url(#objShadow)">
              <rect
                x={houseX + Math.round(houseW * 0.47)}
                y={houseY + Math.round(houseH * 0.68)}
                width="26"
                height="24"
                fill="#CFFAFE"
                stroke="#38BDF8"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Tangga basement */}
          {totalBsmtSF > 0 && (
            <g transform={`translate(${houseX + Math.round(houseW * 0.19)}, ${houseY + 8})`}>
              <rect x="0" y="0" width="26" height="44" fill="#D4A373" stroke="#7F5539" strokeWidth="1.5" />
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={`stair-${i}`} x1="0" y1={8 + i * 8} x2="26" y2={8 + i * 8} stroke="#7F5539" strokeWidth="1.5" />
              ))}
            </g>
          )}

          {/* Perapian bata */}
          {fireplaces >= 1 && (
            <g transform={`translate(${houseX + Math.round(houseW * 0.34) - 8}, ${houseY + Math.round(houseH * 0.58)})`} filter="url(#objShadow)">
              <rect x="0" y="0" width="16" height="30" fill="#B45309" stroke="#7C2D12" strokeWidth="2" />
              <circle cx="8" cy="15" r="5" fill="#F97316" />
              <circle cx="8" cy="15" r="2.5" fill="#FEF08A" />
            </g>
          )}
          {fireplaces >= 2 && (
            <g transform={`translate(${houseX + Math.round(houseW * 0.66)}, ${houseY + Math.round(houseH * 0.44) - 8})`} filter="url(#objShadow)">
              <rect x="0" y="0" width="30" height="14" fill="#B45309" stroke="#7C2D12" strokeWidth="2" />
              <circle cx="15" cy="7" r="4.5" fill="#F97316" />
              <circle cx="15" cy="7" r="2.5" fill="#FEF08A" />
            </g>
          )}
          {fireplaces >= 3 && (
            <g transform={`translate(${houseX + houseW - 14}, ${houseY + Math.round(houseH * 0.6)})`} filter="url(#objShadow)">
              <rect x="0" y="0" width="14" height="28" fill="#B45309" stroke="#7C2D12" strokeWidth="2" />
              <circle cx="7" cy="14" r="4.5" fill="#F97316" />
              <circle cx="7" cy="14" r="2.5" fill="#FEF08A" />
            </g>
          )}

          {/* Pintu utama */}
          <rect
            x={houseX + Math.round(houseW * 0.33)}
            y={houseY + houseH - 5}
            width="24"
            height="10"
            rx="2"
            fill="#8B5A2B"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />

          {/* Label lantai */}
          <g transform={`translate(${houseX + 10}, ${houseY + houseH - 32})`}>
            <rect x="0" y="0" width="118" height="22" rx="11" fill="rgba(15, 23, 42, 0.72)" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="59" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="Nunito, sans-serif">
              LANTAI 1 • DENAH
            </text>
          </g>
        </g>

        {/* ========================================================
            F. PENANDA BERLIAN HIJAU
            ======================================================== */}
        <g id="property-marker">
          {/* Bayangan lembut di lantai */}
          <ellipse cx={markerX} cy={markerY + 44} rx="16" ry="5" fill="rgba(0,0,0,0.22)" />
          <g transform={`translate(${markerX}, ${markerY})`} style={{ filter: "url(#markerGlow)" }}>
            <g className="sims-animate-marker">
              <polygon points="0,-34 15,0 0,34 -15,0" fill="#68C928" stroke="#FFFFFF" strokeWidth="2.5" />
              <polygon points="0,-34 0,0 -15,0" fill="#A3F763" />
              <polygon points="0,34 0,0 -15,0" fill="#3B8E0D" />
              <polygon points="0,-34 15,0 0,0" fill="#7EDD3F" />
              <line x1="-15" y1="0" x2="15" y2="0" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.7" />
              <line x1="0" y1="-34" x2="0" y2="34" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.45" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default WorldScene;
