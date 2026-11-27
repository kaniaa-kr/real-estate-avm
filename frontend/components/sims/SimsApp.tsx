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
import { playBuildSound, playSuccessSound } from "@/lib/sound";
import { useModelInfo } from "@/lib/use-model-info";
import { usePrediction } from "@/lib/use-prediction";
import { type FeatureValues, initialValues } from "@/lib/validation";

export function SimsApp() {
  const { phase, warming, retry: retryServer } = useServerStatus();

  // 1. Single Source of Truth untuk state 10 fitur:
  // Nilai awal diambil langsung dari default features.json via initialValues()
  const [values, setValues] = useState<FeatureValues>(() =>
    initialValues(featuresConfig.features),
  );

  // 2. State Modal & Toast
  const [activeModal, setActiveModal] = useState<
    "analysis" | "model-info" | "presets" | "scenarios" | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "success" | "warning" | "error">("info");
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  // 3. Efek partikel selebrasi saat prediksi sukses
  const [showParticles, setShowParticles] = useState(false);

  // 4. Metadata model & hook prediksi reaktif
  const { modelInfo } = useModelInfo();
  const isServerReady = phase === "ready";

  const { status, isStale, result, error, fieldErrors, retry: retryPrediction } = usePrediction(
    values,
    { enabled: isServerReady },
  );

  // Bunyikan suara sukses dan picu partikel perayaan saat kalkulasi prediksi selesai
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

  // Toast aktif (notifikasi tindakan pengguna atau pesan error server otomatis)
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

  // 4. Handler perubahan fitur
  const handleFeatureChange = useCallback((name: string, val: string) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  }, []);

  // 5. Handler tombol Preset
  const handleApplyPreset = useCallback(
    (preset: Preset) => {
      setValues(preset.values);
      setActiveModal(null);
      playSuccessSound();
      showToast(`Preset "${preset.name}" diterapkan!`, "success");
    },
    [showToast],
  );

  // 6. Handler tombol Acak (Randomize)
  const handleRandomize = useCallback(() => {
    const randomized: FeatureValues = {};
    for (const feat of featuresConfig.features) {
      if (feat.type === "category" && feat.categories && feat.categories.length > 0) {
        const randIdx = Math.floor(Math.random() * feat.categories.length);
        randomized[feat.name] = feat.categories[randIdx];
      } else if (feat.min !== undefined && feat.max !== undefined) {
        let randVal = Math.round(feat.min + Math.random() * (feat.max - feat.min));
        if (feat.name === "GrLivArea") {
          randVal = Math.round(randVal / 50) * 50; // bulatkan ke kelipatan 50
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
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-slate-950 flex flex-col justify-between select-none">
      {/* ========================================================
          A. BANNER SERVER WARM-UP (COLD START)
          ======================================================== */}
      {phase !== "ready" && (
        <div
          role="alert"
          aria-live="polite"
          className={`w-full py-2 px-4 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 z-40 transition-colors ${
            phase === "loading"
              ? "bg-amber-500/90 text-slate-950 animate-pulse"
              : "bg-red-600/95 text-white"
          }`}
        >
          {phase === "loading" ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
              <span>
                {warming
                  ? "Server sedang memuat model machine learning..."
                  : "Server sedang bangun dari mode tidur (bisa 30–60 detik). Harap tunggu sebentar..."}
              </span>
            </>
          ) : (
            <>
              <span>⚠️ Server backend belum dapat dihubungi.</span>
              <button
                type="button"
                onClick={retryServer}
                className="underline font-extrabold ml-2 hover:opacity-80"
              >
                Coba hubungkan lagi
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
        overallQual={Number(values.OverallQual || 6)}
        modelInfo={modelInfo}
        isStale={isStale}
        isLoading={status === "loading"}
        onOpenAnalysis={() => setActiveModal("analysis")}
        onOpenModelInfo={() => setActiveModal("model-info")}
        onOpenPresets={() => setActiveModal("presets")}
        onOpenScenarios={() => setActiveModal("scenarios")}
        onRandomize={handleRandomize}
      />

      {/* ========================================================
          C. AREA DUNIA (WORLD SCENE SVG) & QUALITY SELECTOR
          ======================================================== */}
      <main className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden">
        {/* World Scene Denah Rumah Top-Down */}
        <WorldScene values={values} className="w-full h-full" />

        {/* Partikel Efek Selebrasi saat Sukses Menghitung Nilai */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
            {[
              { dx: "-65px", dy: "-70px", color: "#00d66c" },
              { dx: "65px", dy: "-65px", color: "#39e67d" },
              { dx: "-85px", dy: "-20px", color: "#ffcb05" },
              { dx: "80px", dy: "-15px", color: "#76ff9d" },
              { dx: "-45px", dy: "-95px", color: "#52ffa8" },
              { dx: "50px", dy: "-90px", color: "#ffcb05" },
              { dx: "-25px", dy: "-115px", color: "#00d66c" },
              { dx: "25px", dy: "-110px", color: "#ffffff" },
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

        {/* Vertical Quality Selector (Kanan Layar) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
          <QualitySelector
            value={Number(values.OverallQual || 6)}
            error={fieldErrors.OverallQual}
            onChange={(val) => handleFeatureChange("OverallQual", String(val))}
          />
        </div>

        {/* Tombol Coba Lagi jika galat server / jaringan */}
        {status === "error" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={retryPrediction}
              className="sims-btn-shiny bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-xs font-bold rounded-full shadow-2xl flex items-center gap-1.5 animate-bounce"
            >
              <span>🔄</span>
              <span>Prediksi gagal. Coba lagi</span>
            </button>
          </div>
        )}
      </main>

      {/* ========================================================
          D. BOTTOM BUILD DOCK (4 TAB KONTROL)
          ======================================================== */}
      <footer className="w-full z-20 flex flex-col justify-end">
        <BuildDock
          values={values}
          fieldErrors={fieldErrors}
          onChange={handleFeatureChange}
        />

        {/* Banner Disclaimer Permanen Sesuai Kontrak PRD */}
        <div
          role="note"
          aria-label="Academic Disclaimer"
          className="w-full bg-slate-950/95 py-1 px-3 text-center border-t border-cyan-500/10"
        >
          <p className="text-[10px] text-slate-400 font-sans tracking-wide">
            <strong className="text-emerald-400 uppercase mr-1">Disclaimer:</strong>
            {DISCLAIMER_TEXT}
          </p>
        </div>
      </footer>

      {/* ========================================================
          E. TOAST NOTIFIKASI
          ======================================================== */}
      <Toast
        message={activeToast}
        type={activeToastType}
        onClose={handleCloseToast}
      />

      {/* ========================================================
          F. MODAL ANALISIS FAKTOR (ANALYTICS MODAL LENGKAP)
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
          G. MODAL SKENARIO TERSIMPAN (SAVED SCENARIOS)
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
          G. MODAL INFO MODEL (METADATA & AKURASI)
          ======================================================== */}
      {activeModal === "model-info" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-model-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="sims-glass p-5 sm:p-6 rounded-2xl max-w-md w-full border border-cyan-400/30 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">ℹ️</span>
                <h2 id="modal-model-title" className="text-lg font-bold text-white font-display">
                  Informasi Model AVM
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white text-base px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/10">
                <span className="text-slate-400 block text-[10px] uppercase">Algoritma</span>
                <span className="text-white font-bold">{modelInfo?.algorithm || "—"}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/10">
                <span className="text-slate-400 block text-[10px] uppercase">Versi Model</span>
                <span className="text-white font-bold">{modelInfo?.model_version || "—"}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/10">
                <span className="text-slate-400 block text-[10px] uppercase">Akurasi R²</span>
                <span className="text-emerald-400 font-extrabold font-mono text-sm">
                  {modelInfo?.r2 ? `${(modelInfo.r2 * 100).toFixed(2)}%` : "—"}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/10">
                <span className="text-slate-400 block text-[10px] uppercase">RMSLE Uji</span>
                <span className="text-cyan-300 font-bold font-mono">
                  {modelInfo?.rmsle ? modelInfo.rmsle.toFixed(4) : "—"}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/10">
                <span className="text-slate-400 block text-[10px] uppercase">MAE (USD)</span>
                <span className="text-slate-200 font-bold font-mono">
                  {modelInfo?.mae ? `$${modelInfo.mae.toLocaleString("en-US")}` : "—"}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/10">
                <span className="text-slate-400 block text-[10px] uppercase">Metode Penjelas</span>
                <span className="text-slate-200 font-bold truncate">
                  {modelInfo?.explanation_method || "—"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Model dilatih dengan data historis perumahan kota Ames, Iowa (2006–2010). Fitur dan parameter
              dijaga stateless untuk performa tinggi.
            </p>

            <div className="flex justify-end pt-2 border-t border-cyan-500/10">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="sims-btn-shiny sims-btn-blue px-4 py-2 text-xs font-bold rounded-lg text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          H. MODAL PRESET RUMAH
          ======================================================== */}
      {activeModal === "presets" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-presets-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="sims-glass p-5 sm:p-6 rounded-2xl max-w-lg w-full border border-cyan-400/30 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏷️</span>
                <h2 id="modal-presets-title" className="text-lg font-bold text-white font-display">
                  Pilih Preset Rumah Ames
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white text-base px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-3 sm:p-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 hover:bg-slate-800/80 hover:border-emerald-400 transition-all text-left flex items-start justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-300">
                        {p.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{p.description}</p>
                    <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-2">
                      <span>Luas: {p.values.GrLivArea} sq ft</span>
                      <span>·</span>
                      <span>Kualitas: {p.values.OverallQual}/10</span>
                      <span>·</span>
                      <span>Tahun: {p.values.YearBuilt}</span>
                    </div>
                  </div>
                  <span className="text-slate-500 group-hover:text-emerald-400 text-lg transition-colors">
                    →
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-cyan-500/10">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="sims-btn-shiny bg-slate-800 text-slate-300 px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-700"
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
