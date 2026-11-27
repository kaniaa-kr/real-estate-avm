"use client";

import React, { useEffect, useRef, useState } from "react";

import { formatPricePerSqFt, formatUSD, formatUSDCompact } from "@/lib/format";
import { isSoundEnabled, playClickSound, toggleSound } from "@/lib/sound";
import type { ParsedModelInfo } from "@/lib/use-model-info";

export interface HudBarProps {
  predictedPrice?: number;
  priceRange?: { low: number; high: number };
  grLivArea?: number;
  overallQual?: number;
  modelInfo?: ParsedModelInfo | null;
  isStale?: boolean;
  isLoading?: boolean;
  onOpenAnalysis?: () => void;
  onOpenModelInfo?: () => void;
  onOpenPresets?: () => void;
  onOpenScenarios?: () => void;
  onRandomize?: () => void;
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
      // easeOutCubic
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
  overallQual = 6,
  modelInfo,
  isStale = false,
  isLoading = false,
  onOpenAnalysis,
  onOpenModelInfo,
  onOpenPresets,
  onOpenScenarios,
  onRandomize,
}: HudBarProps) {
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const rollingPrice = useRollingNumber(predictedPrice, 420);

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  // Badge Kelas Kualitas (1-4 Standar, 5-7 Baik, 8-10 Premium)
  const qualityTier =
    overallQual >= 8
      ? { label: "Premium", color: "bg-amber-400/20 text-amber-300 border-amber-400/50" }
      : overallQual >= 5
        ? { label: "Baik", color: "bg-emerald-400/20 text-emerald-300 border-emerald-400/50" }
        : { label: "Standar", color: "bg-slate-400/20 text-slate-300 border-slate-400/40" };

  const r2Display =
    modelInfo?.r2 !== undefined && modelInfo.r2 > 0 ? `${(modelInfo.r2 * 100).toFixed(1)}%` : "—";

  return (
    <header
      role="banner"
      className="w-full sims-glass border-b border-cyan-400/25 px-2 sm:px-5 py-2 sm:py-3 shadow-xl select-none z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Kolom Kiri: Logo & Badge R² / Kualitas */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl" aria-hidden="true">
              💎
            </span>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide leading-none font-display">
                PREDIKSI PROPERTI
              </h1>
              <p className="text-[10px] text-cyan-300/80 font-mono">AVM Ames Housing</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Badge R² dari /model-info */}
            <button
              type="button"
              onClick={onOpenModelInfo}
              title="Akurasi model R² (klik untuk info model)"
              className="sims-hud-pill px-2.5 py-1 text-[11px] font-bold border border-cyan-400/30 hover:border-cyan-300 transition-colors flex items-center gap-1 text-slate-200"
            >
              <span className="text-cyan-400">R²</span>
              <span className="font-mono">{r2Display}</span>
            </button>

            {/* Badge Kelas Kualitas dengan Tooltip */}
            <div
              className={`relative group sims-hud-pill px-2.5 py-1 text-[11px] font-bold border cursor-help ${qualityTier.color}`}
            >
              <span>{qualityTier.label}</span>
              <span className="text-[10px] opacity-75 font-mono ml-0.5">({overallQual})</span>

              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-40 bg-slate-900/95 text-white text-[11px] p-2 rounded-lg border border-cyan-500/30 shadow-xl whitespace-nowrap pointer-events-none">
                <p className="font-bold text-emerald-400">Skala Kualitas Material ({overallQual}/10)</p>
                <p className="text-slate-300 text-[10px]">1-4: Standar · 5-7: Baik · 8-10: Premium</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Tengah: PIL HARGA UTAMA & RENTANG */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
          {/* Pil Harga Prediksi USD (Animasi Angka Bergulir ~420ms + Efek Shimmer saat Loading/Stale) */}
          <div
            className={`sims-hud-pill px-4 sm:px-6 py-1.5 sm:py-2 border-2 border-emerald-400/70 shadow-[0_0_20px_rgba(0,214,108,0.35)] flex items-center gap-2 transition-all ${
              isStale || isLoading ? "sims-shimmer opacity-85" : "opacity-100"
            }`}
          >
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
              Taksiran:
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight drop-shadow-[0_2px_8px_rgba(0,214,108,0.5)]">
              {predictedPrice > 0 ? formatUSD(rollingPrice) : "$..."}
            </span>
            {isLoading && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            )}
          </div>

          {/* Pil Tambahan: Harga/sq ft & Rentang */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-mono">
            {predictedPrice > 0 && grLivArea > 0 && (
              <span className="sims-hud-pill px-2.5 py-1 border border-slate-700">
                {formatPricePerSqFt(predictedPrice, grLivArea)}
              </span>
            )}
            {priceRange && (
              <span className="sims-hud-pill px-2.5 py-1 border border-slate-700 text-slate-400">
                Rentang: {formatUSDCompact(priceRange.low)} – {formatUSDCompact(priceRange.high)}
              </span>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Tombol Aksi (Preset, Acak, Analisis, Suara, Info) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Tombol Preset */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenPresets?.();
            }}
            title="Pilih Preset Rumah Cepat"
            className="sims-btn-shiny sims-btn-blue px-3 py-1.5 text-xs font-bold min-h-[38px] flex items-center gap-1 rounded-full"
          >
            <span>🏷️</span>
            <span className="hidden sm:inline">Preset</span>
          </button>

          {/* Tombol Skenario Tersimpan */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenScenarios?.();
            }}
            title="Buka Skenario Tersimpan"
            className="sims-btn-shiny bg-slate-900/80 text-cyan-200 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold min-h-[38px] flex items-center gap-1 rounded-full hover:bg-slate-800"
          >
            <span>💾</span>
            <span className="hidden sm:inline">Skenario</span>
          </button>

          {/* Tombol Acak */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onRandomize?.();
            }}
            title="Acak Karakteristik Rumah"
            className="sims-btn-shiny bg-slate-800 text-slate-200 border border-slate-600 px-3 py-1.5 text-xs font-bold min-h-[38px] flex items-center gap-1 rounded-full hover:bg-slate-700"
          >
            <span>🎲</span>
            <span className="hidden sm:inline">Acak</span>
          </button>

          {/* Tombol Analisis Faktor */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenAnalysis?.();
            }}
            title="Lihat Faktor Penentu Harga (Top Factors)"
            className="sims-btn-shiny sims-btn-green px-3 py-1.5 text-xs font-bold min-h-[38px] flex items-center gap-1 rounded-full text-slate-950"
          >
            <span>📊</span>
            <span>Faktor</span>
          </button>

          {/* Tombol Suara */}
          <button
            type="button"
            onClick={handleSoundToggle}
            aria-label={soundOn ? "Matikan Efek Suara" : "Aktifkan Efek Suara"}
            title={soundOn ? "Suara Aktif (klik untuk mematikan)" : "Suara Bisu (klik untuk mengaktifkan)"}
            className={`w-9 h-9 min-w-9 rounded-full flex items-center justify-center border transition-all text-sm ${
              soundOn
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(0,214,108,0.4)]"
                : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>

          {/* Tombol Modal Info Model */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenModelInfo?.();
            }}
            title="Informasi & Metrik Model AVM"
            aria-label="Informasi Model"
            className="w-9 h-9 min-w-9 rounded-full flex items-center justify-center border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white transition-all text-sm"
          >
            ℹ️
          </button>
        </div>
      </div>
    </header>
  );
}
