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

  // Focus trap & tutup via Escape
  useEffect(() => {
    if (!isOpen) return;

    const modalEl = modalRef.current;
    if (!modalEl) return;

    const previousActive = document.activeElement as HTMLElement | null;

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

  // Salin laporan valuasi
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
========================================`;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div ref={modalRef} className="sims-modal-sheet w-full max-w-3xl max-h-[94dvh] flex flex-col animate-pop">
        {/* Header gradien biru cerah */}
        <div className="sims-modal-header shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg shadow shrink-0"
            >
              📊
            </span>
            <div className="min-w-0">
              <h2 id={modalTitleId} className="text-sm sm:text-xl font-black font-display leading-tight line-clamp-2">
                Analisis Valuasi &amp; Laporan Properti
              </h2>
              <p className="text-[11px] text-sky-100 font-semibold truncate">
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
            aria-label="Tutup analisis"
            className="sims-btn-round sims-btn-red w-9 h-9 min-w-9 text-base shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Badan terang */}
        <div className="bg-slate-50 text-slate-800 p-3 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
          {/* Banner harga hijau zamrud */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-md border-2 border-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">
                Estimasi Nilai Pasar
              </div>
              <div className="font-display text-2xl sm:text-3xl font-black mt-0.5 tabular-nums">
                {predictedPrice > 0 ? formatUSD(predictedPrice) : "$..."}
              </div>
              {result?.price_range && (
                <p className="text-[11px] font-bold text-emerald-100 mt-1">
                  Rentang wajar: {formatUSD(result.price_range.low)} — {formatUSD(result.price_range.high)}
                </p>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-1.5 text-[10px] font-extrabold shrink-0">
              <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-xl text-center border border-white/50">
                <div className="text-[9px] uppercase text-emerald-50">Kualitas</div>
                <div className="font-display text-base font-black text-yellow-200">{values.OverallQual}/10</div>
              </div>
              {predictedPrice > 0 && grLivArea > 0 && (
                <span className="bg-white/20 px-2.5 py-1 rounded-full border border-white/40">
                  {formatPricePerSqFt(predictedPrice, grLivArea)}
                </span>
              )}
            </div>
          </div>

          {/* Kartu spesifikasi model */}
          <div className="bg-white rounded-2xl border-2 border-sky-100 p-3.5 shadow-sm">
            <h3 className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span aria-hidden="true">🤖</span> Spesifikasi Model Machine Learning
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-sky-100 border border-sky-200 rounded-xl p-2.5">
                <span className="text-sky-700 block text-[9px] font-extrabold uppercase">Algoritma</span>
                <span className="text-slate-800 font-black truncate block text-[11px]">
                  {modelInfo?.algorithm || "—"}
                </span>
              </div>
              <div className="bg-sky-100 border border-sky-200 rounded-xl p-2.5">
                <span className="text-sky-700 block text-[9px] font-extrabold uppercase">Akurasi R² Uji</span>
                <span className="text-emerald-700 font-black font-mono text-sm block">
                  {modelInfo?.r2 !== undefined && modelInfo.r2 > 0
                    ? `${(modelInfo.r2 * 100).toFixed(2)}%`
                    : "—"}
                </span>
              </div>
              <div className="bg-sky-100 border border-sky-200 rounded-xl p-2.5">
                <span className="text-sky-700 block text-[9px] font-extrabold uppercase">RMSLE Uji</span>
                <span className="text-blue-700 font-black font-mono text-sm block">
                  {modelInfo?.rmsle !== undefined && modelInfo.rmsle > 0
                    ? modelInfo.rmsle.toFixed(4)
                    : "—"}
                </span>
              </div>
              <div className="bg-sky-100 border border-sky-200 rounded-xl p-2.5">
                <span className="text-sky-700 block text-[9px] font-extrabold uppercase">Rata-rata MAE</span>
                <span className="text-slate-800 font-black font-mono text-sm block">
                  {modelInfo?.mae !== undefined && modelInfo.mae > 0
                    ? `$${modelInfo.mae.toLocaleString("en-US")}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Grafik faktor penentu */}
          <div className="bg-white rounded-2xl border-2 border-sky-100 p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <h3 className="text-[11px] sm:text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                <span aria-hidden="true">📈</span> Faktor Penentu Harga
              </h3>
              {result?.explanation_method && (
                <span className="text-[9px] text-sky-700 font-bold bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                  Metode: {result.explanation_method}
                </span>
              )}
            </div>

            {result?.explanation_method === "placeholder" && (
              <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-semibold mb-2.5">
                ⚠️ <strong>Catatan:</strong> Faktor penentu masih contoh (model uji).
              </div>
            )}

            {result?.top_factors && result.top_factors.length > 0 ? (
              <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
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
              <div className="text-center py-5 text-slate-500 text-[11px] bg-slate-50 rounded-xl border border-slate-200">
                Belum ada data faktor penentu. Jalankan prediksi dengan data lengkap untuk melihat pengaruh
                karakteristik properti terhadap harga.
              </div>
            )}
          </div>

          {/* Ringkasan 10 spesifikasi */}
          <div className="bg-white rounded-2xl border-2 border-sky-100 p-3.5 shadow-sm">
            <h3 className="text-[11px] font-black text-sky-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span aria-hidden="true">📋</span> Ringkasan 10 Spesifikasi Properti
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              {[
                ["Kawasan", nhName],
                ["Kualitas Material", `${values.OverallQual} / 10`],
                ["Luas Hunian", `${Number(values.GrLivArea).toLocaleString("en-US")} sq ft`],
                ["Luas Basement", `${Number(values.TotalBsmtSF).toLocaleString("en-US")} sq ft`],
                ["Luas Kavling", `${Number(values.LotArea).toLocaleString("en-US")} sq ft`],
                ["Tahun Konstruksi", String(values.YearBuilt)],
                ["Kapasitas Garasi", `${values.GarageCars} mobil`],
                ["Kamar Mandi", `${values.FullBath} unit`],
                ["Kualitas Dapur", String(values.KitchenQual)],
                ["Jumlah Perapian", `${values.Fireplaces} unit`],
              ].map(([label, val]) => (
                <div key={label} className="bg-sky-100 border border-sky-200 rounded-lg p-2">
                  <span className="text-sky-700 text-[9px] font-extrabold uppercase block">{label}</span>
                  <span className="font-black text-slate-800 truncate block" title={val}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
            <strong className="text-emerald-700 uppercase mr-1">Disclaimer:</strong>
            {DISCLAIMER_TEXT}
          </div>
        </div>

        {/* Footer biru muda */}
        <div className="bg-sky-100 border-t border-sky-200 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyReport}
            className="sims-btn-shiny sims-btn-blue px-4 py-2 text-[11px] sm:text-xs font-black flex items-center gap-1.5"
          >
            <span aria-hidden="true">{copied ? "✅" : "📋"}</span>
            <span>{copied ? "Laporan Tersalin!" : "Salin Laporan Valuasi"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="sims-btn-shiny sims-btn-green px-4 py-2 text-[11px] sm:text-xs font-black flex items-center gap-1.5"
          >
            <span aria-hidden="true">🏡</span>
            <span>Kembali ke Denah</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsModal;
