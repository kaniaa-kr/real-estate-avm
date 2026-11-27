"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { useServerStatus } from "@/components/server-status-provider";
import { AnalyticsModal } from "@/components/sims/AnalyticsModal";
import { BuildDock } from "@/components/sims/BuildDock";
import { HudBar } from "@/components/sims/HudBar";
import { QualitySelector } from "@/components/sims/QualitySelector";
import { SavedScenarios } from "@/components/sims/SavedScenarios";
import { Toast } from "@/components/sims/Toast";
import { WorldScene } from "@/components/sims/WorldScene";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { featuresConfig } from "@/lib/features";
import { PRESETS, type Preset } from "@/lib/presets";
import {
  isSoundEnabled,
  playBuildSound,
  playClickSound,
  playSuccessSound,
  toggleSound,
} from "@/lib/sound";
import { useModelInfo } from "@/lib/use-model-info";
import { usePrediction } from "@/lib/use-prediction";
import { type FeatureValues, initialValues } from "@/lib/validation";

export function SimsApp() {
  const { phase, warming, retry: retryServer } = useServerStatus();

  // 1. Sumber kebenaran state 10 fitur
  const [values, setValues] = useState<FeatureValues>(() =>
    initialValues(featuresConfig.features),
  );

  // 2. Modal, toast, dan efek suara
  const [activeModal, setActiveModal] = useState<
    "analysis" | "model-info" | "presets" | "scenarios" | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "success" | "warning" | "error">("info");
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showParticles, setShowParticles] = useState(false);

  // 3. Metadata model & prediksi reaktif
  const { modelInfo } = useModelInfo();
  const isServerReady = phase === "ready";

  const { status, isStale, result, error, fieldErrors, retry: retryPrediction } = usePrediction(
    values,
    { enabled: isServerReady },
  );

  const prevResultRef = useRef(result);
  useEffect(() => {
    if (result && result !== prevResultRef.current && status === "success") {
      playSuccessSound();
      prevResultRef.current = result;
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 950);
      return () => clearTimeout(timer);
    }
  }, [result, status]);

  const activeErrorMessage =
    status === "error" && error && error.message !== dismissedError ? error.message : null;
  const activeToast = toastMessage ?? activeErrorMessage;
  const activeToastType = toastMessage ? toastType : "error";

  const handleCloseToast = useCallback(() => {
    if (toastMessage) setToastMessage(null);
    if (activeErrorMessage) setDismissedError(activeErrorMessage);
  }, [toastMessage, activeErrorMessage]);

  const showToast = useCallback(
    (msg: string, type: "info" | "success" | "warning" | "error" = "info") => {
      setToastMessage(msg);
      setToastType(type);
    },
    [],
  );

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playClickSound();
  };

  // 4. Handler perubahan fitur
  const handleFeatureChange = useCallback((name: string, val: string) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  }, []);

  // 5. Preset rumah
  const handleApplyPreset = useCallback(
    (preset: Preset) => {
      setValues(preset.values);
      setActiveModal(null);
      playSuccessSound();
      showToast(`Preset "${preset.name}" diterapkan!`, "success");
    },
    [showToast],
  );

  // 6. Acak karakteristik rumah
  const handleRandomize = useCallback(() => {
    const randomized: FeatureValues = {};
    for (const feat of featuresConfig.features) {
      if (feat.type === "category" && feat.categories && feat.categories.length > 0) {
        const randIdx = Math.floor(Math.random() * feat.categories.length);
        randomized[feat.name] = feat.categories[randIdx];
      } else if (feat.min !== undefined && feat.max !== undefined) {
        let randVal = Math.round(feat.min + Math.random() * (feat.max - feat.min));
        if (feat.name === "GrLivArea") {
          randVal = Math.round(randVal / 50) * 50;
        } else if (feat.name === "LotArea") {
          randVal = Math.round(randVal / 100) * 100;
        } else if (feat.name === "TotalBsmtSF") {
          randVal = Math.round(randVal / 50) * 50;
        }
        randomized[feat.name] = String(randVal);
      } else {
        randomized[feat.name] = String(feat.default);
      }
    }
    setValues(randomized);
    playBuildSound();
    showToast("Karakteristik rumah berhasil diacak!", "info");
  }, [showToast]);

  return (
    <div className="relative w-full h-dvh overflow-hidden overscroll-none flex flex-col justify-between select-none sims-font-body bg-[#589C34] text-slate-800">
      {/* ========================================================
          A. BANNER SERVER WARM-UP (COLD START)
          ======================================================== */}
      {phase !== "ready" && (
        <div
          role="alert"
          aria-live="polite"
          className={`w-full py-0.5 px-2 sm:px-3 text-center text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1.5 z-40 border-b-2 border-white ${
            phase === "loading"
              ? "bg-amber-200 text-amber-950"
              : "bg-rose-200 text-rose-950"
          }`}
        >
          {phase === "loading" ? (
            <>
              <span className="w-2 h-2 shrink-0 rounded-full bg-amber-600 animate-ping" />
              <span className="truncate">
                {warming ? "Memuat model ML…" : "Server bangun (30–60 dtk)…"}
              </span>
            </>
          ) : (
            <>
              <span className="truncate">⚠️ Server belum terhubung.</span>
              <button
                type="button"
                onClick={retryServer}
                className="shrink-0 underline font-extrabold hover:opacity-80"
              >
                Coba lagi
              </button>
            </>
          )}
        </div>
      )}

      {/* ========================================================
          B. TOP HUD BAR
          ======================================================== */}
      <HudBar
        predictedPrice={result?.predicted_price}
        priceRange={result?.price_range}
        grLivArea={Number(values.GrLivArea || 1500)}
        modelInfo={modelInfo}
        isStale={isStale}
        isLoading={status === "loading"}
        onOpenModelInfo={() => setActiveModal("model-info")}
      />

      {/* ========================================================
          C. DUNIA: DENAH, TOMBOL MELAYANG, SELECTOR KUALITAS
          ======================================================== */}
      <main className="relative flex-1 w-full min-h-0 overflow-hidden">
        <WorldScene values={values} className="w-full h-full" />

        {/* Partikel selebrasi */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
            {[
              { dx: "-65px", dy: "-70px", color: "#68C928" },
              { dx: "65px", dy: "-65px", color: "#A3F763" },
              { dx: "-85px", dy: "-20px", color: "#FFC107" },
              { dx: "80px", dy: "-15px", color: "#8CD3FF" },
              { dx: "-45px", dy: "-95px", color: "#68C928" },
              { dx: "50px", dy: "-90px", color: "#FFC107" },
              { dx: "-25px", dy: "-115px", color: "#A3F763" },
              { dx: "25px", dy: "-110px", color: "#FFFFFF" },
            ].map((p, i) => (
              <span
                key={i}
                className="sims-particle shadow-[0_0_8px_currentColor]"
                style={
                  {
                    backgroundColor: p.color,
                    color: p.color,
                    "--tx": p.dx,
                    "--ty": p.dy,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

        {/* Tombol suara — kiri atas */}
        <button
          type="button"
          onClick={handleSoundToggle}
          aria-label={soundOn ? "Matikan efek suara" : "Aktifkan efek suara"}
          title={soundOn ? "Suara aktif (klik untuk mematikan)" : "Suara bisu (klik untuk mengaktifkan)"}
          className={`sims-btn-round absolute left-2.5 sm:left-4 top-2.5 sm:top-3 z-30 w-10 h-10 sm:w-12 sm:h-12 text-lg ${
            soundOn ? "sims-btn-green" : "sims-btn-silver"
          }`}
        >
          <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
        </button>

        {/* Preset, Analisis ML, Skenario — kanan atas */}
        <div className="absolute right-2.5 sm:right-4 top-2.5 sm:top-3 z-30 flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveModal("presets");
            }}
            title="Pilih preset rumah cepat"
            aria-label="Pilih preset rumah"
            className="sims-btn-round sims-btn-purple w-10 h-10 sm:w-12 sm:h-12 text-lg"
          >
            <span aria-hidden="true">🏷️</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveModal("analysis");
            }}
            title="Analisis ML & faktor penentu harga"
            aria-label="Buka analisis ML"
            className="sims-btn-round sims-btn-silver w-10 h-10 sm:w-12 sm:h-12 text-lg"
          >
            <span aria-hidden="true">🔍</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveModal("scenarios");
            }}
            title="Skenario properti tersimpan"
            aria-label="Buka skenario tersimpan"
            className="sims-btn-round sims-btn-blue w-9 h-9 sm:w-10 sm:h-10 text-sm"
          >
            <span aria-hidden="true">💾</span>
          </button>
        </div>

        {/* Selector kualitas (desktop kanan tengah, mobile kiri bawah) */}
        <QualitySelector
          value={Number(values.OverallQual || 6)}
          error={fieldErrors.OverallQual}
          onChange={(val) => handleFeatureChange("OverallQual", String(val))}
        />

        {/* Tombol coba lagi */}
        {status === "error" && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={retryPrediction}
              className="sims-btn-shiny sims-btn-red px-4 py-2 text-[11px] font-black flex items-center gap-1.5 animate-bounce"
            >
              <span aria-hidden="true">🔄</span>
              <span>Prediksi gagal. Coba lagi</span>
            </button>
          </div>
        )}
      </main>

      {/* ========================================================
          D. BOTTOM BUILD DOCK + DISCLAIMER
          ======================================================== */}
      <footer className="w-full z-20 flex flex-col justify-end shrink-0">
        <BuildDock
          values={values}
          fieldErrors={fieldErrors}
          onChange={handleFeatureChange}
          onRandomize={handleRandomize}
        />

        <div
          role="note"
          aria-label="Academic disclaimer"
          className="w-full bg-white/95 pt-1 px-3 pb-safe text-center border-t border-sky-200"
        >
          <p className="text-[9px] sm:text-[10px] text-slate-600 sims-font-body tracking-wide leading-tight">
            <strong className="text-emerald-700 uppercase mr-1">Disclaimer:</strong>
            {DISCLAIMER_TEXT}
          </p>
        </div>
      </footer>

      {/* ========================================================
          E. TOAST
          ======================================================== */}
      <Toast message={activeToast} type={activeToastType} onClose={handleCloseToast} />

      {/* ========================================================
          F. MODAL ANALISIS
          ======================================================== */}
      <AnalyticsModal
        isOpen={activeModal === "analysis"}
        onClose={() => setActiveModal(null)}
        result={result}
        values={values}
        modelInfo={modelInfo}
        onCopyFeedback={(msg) => showToast(msg, "success")}
      />

      {/* ========================================================
          G. MODAL SKENARIO TERSIMPAN
          ======================================================== */}
      <SavedScenarios
        isOpen={activeModal === "scenarios"}
        onClose={() => setActiveModal(null)}
        currentValues={values}
        currentPrice={result?.predicted_price}
        onRestore={(vals) => setValues(vals)}
        onToast={showToast}
      />

      {/* ========================================================
          H. MODAL INFO MODEL
          ======================================================== */}
      {activeModal === "model-info" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-model-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn"
        >
          <div className="sims-modal-sheet w-full max-w-md max-h-[90dvh] flex flex-col animate-pop">
            <div className="sims-modal-header shrink-0 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg shadow"
                >
                  ℹ️
                </span>
                <h2 id="modal-model-title" className="text-base sm:text-lg font-black font-display">
                  Informasi Model AVM
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup info model"
                className="sims-btn-round sims-btn-red w-8 h-8 min-w-8 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 sm:p-5 overflow-y-auto flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  ["Algoritma", modelInfo?.algorithm || "—"],
                  ["Versi Model", modelInfo?.model_version || "—"],
                  ["Akurasi R²", modelInfo?.r2 ? `${(modelInfo.r2 * 100).toFixed(2)}%` : "—"],
                  ["RMSLE Uji", modelInfo?.rmsle ? modelInfo.rmsle.toFixed(4) : "—"],
                  ["MAE (USD)", modelInfo?.mae ? `$${modelInfo.mae.toLocaleString("en-US")}` : "—"],
                  ["Metode Penjelas", modelInfo?.explanation_method || "—"],
                ].map(([label, val]) => (
                  <div key={label} className="bg-sky-100 border border-sky-200 rounded-xl p-2.5">
                    <span className="text-sky-700 block text-[9px] font-extrabold uppercase">{label}</span>
                    <span className="text-slate-800 font-black truncate block" title={val}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed bg-white rounded-xl border border-slate-200 p-2.5">
                Model dilatih dengan data historis perumahan kota Ames, Iowa (2006–2010). Fitur dan parameter
                dijaga stateless untuk performa tinggi.
              </p>
            </div>

            <div className="bg-sky-100 border-t border-sky-200 px-3 sm:px-5 py-2.5 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="sims-btn-shiny sims-btn-blue px-4 py-2 text-[11px] font-black"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          I. MODAL PRESET RUMAH
          ======================================================== */}
      {activeModal === "presets" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-presets-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn"
        >
          <div className="sims-modal-sheet w-full max-w-lg max-h-[90dvh] flex flex-col animate-pop">
            <div className="sims-modal-header shrink-0 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg shadow"
                >
                  🏷️
                </span>
                <h2 id="modal-presets-title" className="text-base sm:text-lg font-black font-display">
                  Pilih Preset Rumah Ames
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup preset"
                className="sims-btn-round sims-btn-red w-8 h-8 min-w-8 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="bg-white p-3 rounded-xl border-2 border-sky-100 hover:border-lime-400 hover:bg-[#F3FFE8] transition-colors text-left flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[12px] sm:text-sm font-black text-slate-800 group-hover:text-emerald-800">
                        {p.name}
                      </h3>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-lime-100 text-emerald-800 border border-lime-300">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-500 font-mono mt-1.5">
                      <span className="bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
                        Luas: {p.values.GrLivArea} sq ft
                      </span>
                      <span className="bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
                        Kualitas: {p.values.OverallQual}/10
                      </span>
                      <span className="bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
                        Tahun: {p.values.YearBuilt}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:text-emerald-600 text-lg transition-colors shrink-0">
                    →
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-sky-100 border-t border-sky-200 px-3 sm:px-5 py-2.5 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="sims-btn-shiny sims-btn-silver px-4 py-2 text-[11px] font-black"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimsApp;
