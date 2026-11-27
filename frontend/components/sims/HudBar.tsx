"use client";

import React, { useEffect, useRef, useState } from "react";

import { formatPricePerSqFt, formatUSD, formatUSDCompact } from "@/lib/format";
import { playClickSound } from "@/lib/sound";
import type { ParsedModelInfo } from "@/lib/use-model-info";

export interface HudBarProps {
  predictedPrice?: number;
  priceRange?: { low: number; high: number };
  grLivArea?: number;
  modelInfo?: ParsedModelInfo | null;
  isStale?: boolean;
  isLoading?: boolean;
  onOpenModelInfo?: () => void;
}

/** Hook untuk animasi angka bergulir mulus selama ~420ms */
function useRollingNumber(target: number, duration: number = 420): number {
  const [current, setCurrent] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = target;
    if (startVal === endVal) {
      setCurrent(endVal);
      return;
    }

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startVal + (endVal - startVal) * ease);
      setCurrent(nextVal);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevRef.current = endVal;
        setCurrent(endVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return current;
}

export function HudBar({
  predictedPrice = 0,
  priceRange,
  grLivArea = 1500,
  modelInfo,
  isStale = false,
  isLoading = false,
  onOpenModelInfo,
}: HudBarProps) {
  const rollingPrice = useRollingNumber(predictedPrice, 420);

  const r2Display =
    modelInfo?.r2 !== undefined && modelInfo.r2 > 0 ? `${(modelInfo.r2 * 100).toFixed(1)}%` : "—";

  return (
    <header role="banner" className="relative z-30 w-full flex justify-center px-1.5 sm:px-4 pt-0 pointer-events-none">
      <div className="sims-hud-bar pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 md:gap-4 px-2 sm:px-5 py-1.5 sm:py-2 max-w-[calc(100vw-12px)]">
        {/* 1. Badge akurasi R² */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenModelInfo?.();
          }}
          title="Akurasi model R² (klik untuk info model)"
          aria-label={`Akurasi model R2 ${r2Display}. Buka info model`}
          className="sims-badge-round sims-badge-cyan w-9 h-9 sm:w-11 sm:h-11 flex-col leading-none shrink-0 transition-transform hover:scale-105"
        >
          <span className="text-[7px] sm:text-[8px] font-extrabold tracking-wider uppercase text-white/95">
            ML R²
          </span>
          <span className="text-[10px] sm:text-xs font-black font-display">{r2Display}</span>
        </button>

        {/* 2. Pil harga utama — prioritas ruang, tidak boleh terpotong */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center shrink-0">
            <span
              aria-hidden="true"
              className="sims-badge-round sims-badge-green w-8 h-8 sm:w-8 sm:h-8 text-white font-black text-sm sm:text-base z-10 shrink-0"
            >
              $
            </span>
            <div
              className={`sims-pill-dark -ml-3 pl-4 pr-3 sm:pr-3.5 py-1 rounded-r-full flex items-center gap-1.5 shrink-0 ${
                isStale || isLoading ? "sims-shimmer" : ""
              }`}
            >
              <span className="text-[15px] sm:text-xl md:text-2xl font-black font-display tracking-wide tabular-nums whitespace-nowrap">
                {predictedPrice > 0 ? formatUSD(rollingPrice) : "—"}
              </span>
              {isLoading && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping shrink-0" />}
            </div>
          </div>
          <span className="hidden sm:block text-[9px] font-extrabold text-slate-700 mt-0.5 leading-none">
            Prediksi Harga Pasar
          </span>
        </div>

        {/* 4. Harga per sq ft */}
        {predictedPrice > 0 && grLivArea > 0 && (
          <div className="hidden md:flex flex-col items-center shrink-0">
            <div className="flex items-center">
              <span
                aria-hidden="true"
                className="sims-badge-round sims-badge-gold w-7 h-7 text-white text-[11px] z-10 shrink-0"
              >
                ft²
              </span>
              <div className="sims-pill-dark -ml-3 pl-4 pr-2.5 py-0.5 rounded-r-full text-amber-200 font-bold text-[11px] whitespace-nowrap">
                {formatPricePerSqFt(predictedPrice, grLivArea)}
              </div>
            </div>
            <span className="text-[9px] font-extrabold text-slate-700 mt-0.5 leading-none">Nilai / sq ft</span>
          </div>
        )}

        {/* 5. Rentang prediksi */}
        {priceRange && (
          <div className="hidden lg:flex flex-col items-center shrink-0">
            <div className="sims-pill-dark px-3 py-1 rounded-full text-[11px] font-bold text-sky-100 whitespace-nowrap">
              Rentang {formatUSDCompact(priceRange.low)} – {formatUSDCompact(priceRange.high)}
            </div>
            <span className="text-[9px] font-extrabold text-slate-700 mt-0.5 leading-none">Rentang Wajar</span>
          </div>
        )}

        {/* 6. Tombol otak (info model) — disembunyikan di mobile agar HUD ringkas */}
        <div className="hidden sm:flex items-center">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenModelInfo?.();
            }}
            title="Informasi & metrik model AVM"
            aria-label="Informasi model AVM"
            className="sims-badge-round sims-badge-blue w-10 h-10 shrink-0 transition-transform hover:scale-105"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
              <path
                d="M9.5 4.5A2.5 2.5 0 0 0 7 7v.3A3 3 0 0 0 5 10a3 3 0 0 0 .6 1.8A3 3 0 0 0 5 14a3 3 0 0 0 2 2.8V17a2.5 2.5 0 0 0 5 0V5.5a1 1 0 0 0-1-1h-1.5Z"
                fill="currentColor"
                opacity="0.95"
              />
              <path
                d="M14.5 4.5A2.5 2.5 0 0 1 17 7v.3a3 3 0 0 1 2 2.7 3 3 0 0 1-.6 1.8A3 3 0 0 1 19 14a3 3 0 0 1-2 2.8V17a2.5 2.5 0 0 1-5 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default HudBar;
