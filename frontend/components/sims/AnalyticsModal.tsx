"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";

import FactorChart from "@/components/FactorChart";
import type { PredictResponse } from "@/lib/api";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { formatPricePerSqFt, formatUSD } from "@/lib/format";
import { getNeighborhoodName } from "@/lib/neighborhoods";
import { playClickSound } from "@/lib/sound";
import type { ParsedModelInfo } from "@/lib/use-model-info";
import type { FeatureValues } from "@/lib/validation";

export interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: PredictResponse | null;
  values: FeatureValues;
  modelInfo: ParsedModelInfo | null;
  onCopyFeedback?: (msg: string) => void;
}

export function AnalyticsModal({
  isOpen,
  onClose,
  result,
  values,
  modelInfo,
  onCopyFeedback,
}: AnalyticsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const modalTitleId = useId();

  // Focus trap & Tutup via tombol Escape
  useEffect(() => {
    if (!isOpen) return;

    const modalEl = modalRef.current;
    if (!modalEl) return;

    // Simpan elemen yang aktif sebelumnya untuk dikembalikan setelah modal tutup
    const previousActive = document.activeElement as HTMLElement | null;

    // Cari elemen-elemen yang bisa difokus
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      modalEl.querySelectorAll<HTMLElement>(focusableSelector),
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus?.();
    };
  }, [isOpen, onClose]);

  // Salin Laporan Valuasi ke Clipboard
  const handleCopyReport = useCallback(async () => {
    playClickSound();
    const nhName = getNeighborhoodName(String(values.Neighborhood ?? "CollgCr"));
    const priceText = result ? formatUSD(result.predicted_price) : "Belum dihitung";
    const rangeText = result
      ? `${formatUSD(result.price_range.low)} – ${formatUSD(result.price_range.high)}`
      : "—";

    const factorsText =
      result?.top_factors && result.top_factors.length > 0
        ? result.top_factors
            .map(
              (f) =>
                `  • ${
                  f.feature === "HouseAge"
                    ? "Usia bangunan"
                    : f.feature === "TotalSF"
                      ? "Total luas bangunan"
                      : f.feature
                }: ${f.direction === "up" ? "+" : "-"}${formatUSD(Math.abs(f.impact_usd))}`,
            )
            .join("\n")
        : "  (Tidak ada data faktor)";

    const report = `=========================================
LAPORAN VALUASI PROPERTI AMES (AVM)
=========================================
Taksiran Harga   : ${priceText}
Rentang Wajar    : ${rangeText}
Harga / sq ft    : ${
      result && Number(values.GrLivArea) > 0
        ? formatPricePerSqFt(result.predicted_price, Number(values.GrLivArea))
        : "—"
    }

SPESIFIKASI PROPERTI:
-----------------------------------------
• Kawasan / Lingkungan : ${nhName} (${values.Neighborhood})
• Kualitas Material    : ${values.OverallQual}/10
• Luas Hunian          : ${Number(values.GrLivArea).toLocaleString("en-US")} sq ft
• Luas Basement        : ${Number(values.TotalBsmtSF).toLocaleString("en-US")} sq ft
• Luas Kavling Tanah   : ${Number(values.LotArea).toLocaleString("en-US")} sq ft
• Tahun Konstruksi     : ${values.YearBuilt}
• Kapasitas Garasi     : ${values.GarageCars} mobil
• Kamar Mandi Lengkap  : ${values.FullBath} unit
• Kualitas Dapur       : ${values.KitchenQual}
• Jumlah Perapian      : ${values.Fireplaces} unit

FAKTOR PENENTU HARGA:
-----------------------------------------
${factorsText}

INFORMASI MODEL:
-----------------------------------------
• Algoritma       : ${modelInfo?.algorithm || "—"} (${modelInfo?.model_version || "v1"})
• Akurasi R² Uji  : ${
      modelInfo?.r2 !== undefined && modelInfo.r2 > 0
        ? `${(modelInfo.r2 * 100).toFixed(2)}%`
        : "—"
    }
• RMSLE Uji       : ${modelInfo?.rmsle ? modelInfo.rmsle.toFixed(4) : "—"}
• MAE Uji         : ${modelInfo?.mae ? `$${modelInfo.mae.toLocaleString("en-US")}` : "—"}

DISCLAIMER:
${DISCLAIMER_TEXT}
=========================================`;

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      onCopyFeedback?.("Laporan valuasi berhasil disalin ke papan klip!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onCopyFeedback?.("Gagal menyalin otomatis. Silakan salin manual.");
    }
  }, [values, result, modelInfo, onCopyFeedback]);

  if (!isOpen) return null;

  const predictedPrice = result?.predicted_price ?? 0;
  const grLivArea = Number(values.GrLivArea || 1500);
  const nhName = getNeighborhoodName(String(values.Neighborhood ?? "CollgCr"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        // Tutup jika backdrop diklik langsung
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="sims-glass-elevated w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-cyan-400/40 p-4 sm:p-7 shadow-2xl flex flex-col max-h-[94dvh] overflow-y-auto no-scrollbar"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden="true">
              📊
            </span>
            <div>
              <h2
                id={modalTitleId}
                className="text-lg sm:text-2xl font-extrabold text-white font-display tracking-wide"
              >
                Analisis Valuasi & Laporan Properti
              </h2>
              <p className="text-xs text-cyan-300/80 font-mono">
                {nhName} · Model {modelInfo?.model_version || "v1"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            aria-label="Tutup Analisis"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 1. Banner Harga & Rentang Wajar */}
        <div className="sims-card p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0a233a] to-slate-950 border-2 border-emerald-400/60 shadow-[0_0_24px_rgba(0,214,108,0.25)] flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="text-center sm:text-left">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Estimasi Nilai Pasar
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(0,214,108,0.5)]">
              {predictedPrice > 0 ? formatUSD(predictedPrice) : "$..."}
            </span>
            {result?.price_range && (
              <p className="text-xs text-slate-300 font-mono mt-1">
                Rentang Wajar (90% CI):{" "}
                <span className="text-emerald-300 font-bold">
                  {formatUSD(result.price_range.low)}
                </span>{" "}
                –{" "}
                <span className="text-emerald-300 font-bold">
                  {formatUSD(result.price_range.high)}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 text-xs font-mono">
            {predictedPrice > 0 && grLivArea > 0 && (
              <span className="sims-hud-pill px-3 py-1.5 border border-cyan-400/30 text-cyan-200">
                {formatPricePerSqFt(predictedPrice, grLivArea)}
              </span>
            )}
            <span className="sims-hud-pill px-3 py-1.5 border border-slate-700 text-slate-300">
              Kualitas: {values.OverallQual}/10
            </span>
          </div>
        </div>

        {/* 2. Kartu Info Model AVM */}
        <div className="sims-card p-4 rounded-xl border border-cyan-500/20 mb-5 bg-slate-900/60">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>ℹ️</span> Spesifikasi Model Machine Learning
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-cyan-500/10">
              <span className="text-slate-400 block text-[10px] uppercase">Algoritma</span>
              <span className="text-white font-bold truncate block">
                {modelInfo?.algorithm || "—"}
              </span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-cyan-500/10">
              <span className="text-slate-400 block text-[10px] uppercase">Akurasi R² Uji</span>
              <span className="text-emerald-400 font-extrabold font-mono text-sm block">
                {modelInfo?.r2 !== undefined && modelInfo.r2 > 0
                  ? `${(modelInfo.r2 * 100).toFixed(2)}%`
                  : "—"}
              </span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-cyan-500/10">
              <span className="text-slate-400 block text-[10px] uppercase">RMSLE Uji</span>
              <span className="text-cyan-300 font-bold font-mono block">
                {modelInfo?.rmsle !== undefined && modelInfo.rmsle > 0
                  ? modelInfo.rmsle.toFixed(4)
                  : "—"}
              </span>
            </div>
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-cyan-500/10">
              <span className="text-slate-400 block text-[10px] uppercase">Rata-rata MAE</span>
              <span className="text-slate-200 font-bold font-mono block">
                {modelInfo?.mae !== undefined && modelInfo.mae > 0
                  ? `$${modelInfo.mae.toLocaleString("en-US")}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Grafik Faktor Penentu Harga (FactorChart) */}
        <div className="sims-card p-4 sm:p-5 rounded-xl border border-cyan-500/20 mb-5 bg-slate-900/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> Faktor Penentu Harga (Top Drivers)
            </h3>
            {result?.explanation_method && (
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                Metode: {result.explanation_method}
              </span>
            )}
          </div>

          {result?.explanation_method === "placeholder" && (
            <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs mb-3">
              ⚠️ <strong>Catatan:</strong> Faktor penentu masih contoh (model uji).
            </div>
          )}

          {result?.top_factors && result.top_factors.length > 0 ? (
            <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
              <FactorChart
                factors={result.top_factors}
                labels={{
                  HouseAge: "Usia bangunan",
                  TotalSF: "Total luas bangunan",
                }}
                maxItems={5}
              />
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs sm:text-sm bg-slate-950/40 rounded-xl border border-slate-800">
              Belum ada data faktor penentu. Jalankan prediksi dengan data lengkap untuk melihat pengaruh
              karakteristik properti terhadap harga.
            </div>
          )}
        </div>

        {/* 4. Ringkasan 10 Spesifikasi Properti */}
        <div className="sims-card p-4 rounded-xl border border-cyan-500/20 mb-5 bg-slate-900/60">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <span>📋</span> Ringkasan 10 Spesifikasi Properti
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Kawasan (Neighborhood)</span>
              <span className="font-bold text-white truncate" title={nhName}>
                {nhName}
              </span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Kualitas Material</span>
              <span className="font-bold text-emerald-400 font-mono">{values.OverallQual} / 10</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Luas Hunian (GrLivArea)</span>
              <span className="font-bold text-white font-mono">
                {Number(values.GrLivArea).toLocaleString("en-US")} sq ft
              </span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Luas Basement</span>
              <span className="font-bold text-white font-mono">
                {Number(values.TotalBsmtSF).toLocaleString("en-US")} sq ft
              </span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Luas Kavling Tanah</span>
              <span className="font-bold text-white font-mono">
                {Number(values.LotArea).toLocaleString("en-US")} sq ft
              </span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Tahun Konstruksi Asli</span>
              <span className="font-bold text-white font-mono">{values.YearBuilt}</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Kapasitas Garasi</span>
              <span className="font-bold text-white font-mono">{values.GarageCars} mobil</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Kamar Mandi Lengkap</span>
              <span className="font-bold text-white font-mono">{values.FullBath} unit</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Kualitas Dapur</span>
              <span className="font-bold text-white font-mono">{values.KitchenQual}</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[10px]">Jumlah Perapian</span>
              <span className="font-bold text-white font-mono">{values.Fireplaces} unit</span>
            </div>
          </div>
        </div>

        {/* 5. Disclaimer Permanen */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/10 text-[11px] text-slate-400 leading-relaxed mb-6">
          <strong className="text-emerald-400 uppercase mr-1">Disclaimer:</strong>
          {DISCLAIMER_TEXT}
        </div>

        {/* 6. Footer Actions: Salin Laporan & Kembali ke Denah */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cyan-500/20">
          <button
            type="button"
            onClick={handleCopyReport}
            className="sims-btn-shiny sims-btn-green px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-slate-950 flex items-center gap-2 shadow-lg"
          >
            <span>{copied ? "✅" : "📋"}</span>
            <span>{copied ? "Laporan Tersalin!" : "Salin Laporan Valuasi"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="sims-btn-shiny bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2"
          >
            <span>🏡</span>
            <span>Kembali ke Denah</span>
          </button>
        </div>
      </div>
    </div>
  );
}
