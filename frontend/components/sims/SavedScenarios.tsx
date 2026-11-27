"use client";

import React, { useCallback, useId, useState } from "react";

import { featuresConfig } from "@/lib/features";
import { formatUSD } from "@/lib/format";
import { getNeighborhoodName } from "@/lib/neighborhoods";
import { playBuildSound, playClickSound } from "@/lib/sound";
import { type FeatureValues, validateAll } from "@/lib/validation";

export interface SavedScenario {
  id: string;
  name: string;
  timestamp: number;
  values: FeatureValues;
  predictedPrice?: number;
}

const STORAGE_KEY = "scenarios:v1";
const MAX_SCENARIOS = 5;

function loadStoredScenarios(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validasi ulang setiap skenario terhadap features.json
    const validScenarios: SavedScenario[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        item.values &&
        typeof item.values === "object"
      ) {
        const errors = validateAll(featuresConfig.features, item.values);
        if (Object.keys(errors).length === 0) {
          validScenarios.push({
            id: item.id,
            name: typeof item.name === "string" ? item.name : "Skenario Tersimpan",
            timestamp: typeof item.timestamp === "number" ? item.timestamp : Date.now(),
            values: item.values,
            predictedPrice:
              typeof item.predictedPrice === "number" ? item.predictedPrice : undefined,
          });
        }
      }
    }
    return validScenarios.slice(0, MAX_SCENARIOS);
  } catch {
    return [];
  }
}

export interface SavedScenariosProps {
  isOpen: boolean;
  onClose: () => void;
  currentValues: FeatureValues;
  currentPrice?: number;
  onRestore: (values: FeatureValues) => void;
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export function SavedScenarios({
  isOpen,
  onClose,
  currentValues,
  currentPrice,
  onRestore,
  onToast,
}: SavedScenariosProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadStoredScenarios());
  const modalTitleId = useId();

  // Simpan skenario ke localStorage saat state scenarios berubah
  const persistScenarios = useCallback((items: SavedScenario[]) => {
    setScenarios(items);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Abaikan jika quota penuh / disabled
    }
  }, []);

  // Simpan skenario saat ini
  const handleSaveCurrent = () => {
    playClickSound();

    if (scenarios.length >= MAX_SCENARIOS) {
      onToast(
        `Batas maksimal ${MAX_SCENARIOS} skenario tercapai. Hapus salah satu untuk menyimpan baru.`,
        "warning",
      );
      return;
    }

    const nhName = getNeighborhoodName(String(currentValues.Neighborhood ?? "CollgCr"));
    const newScenario: SavedScenario = {
      id: `scen-${Date.now()}`,
      name: `${nhName} (${currentValues.OverallQual}★, ${currentValues.GrLivArea} sqft)`,
      timestamp: Date.now(),
      values: { ...currentValues },
      predictedPrice: currentPrice && currentPrice > 0 ? currentPrice : undefined,
    };

    const next = [newScenario, ...scenarios].slice(0, MAX_SCENARIOS);
    persistScenarios(next);
    playBuildSound();
    onToast(`Skenario "${newScenario.name}" berhasil disimpan!`, "success");
  };

  // Hapus satu skenario
  const handleDelete = (id: string, name: string) => {
    playClickSound();
    const next = scenarios.filter((s) => s.id !== id);
    persistScenarios(next);
    onToast(`Skenario "${name}" dihapus.`, "info");
  };

  // Pulihkan skenario
  const handleRestore = (scenario: SavedScenario) => {
    playBuildSound();
    onRestore(scenario.values);
    onToast(`Skenario "${scenario.name}" berhasil dipulihkan!`, "success");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div className="sims-glass-elevated w-full max-w-lg rounded-2xl sm:rounded-3xl border border-cyan-400/40 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden="true">
              💾
            </span>
            <div>
              <h2
                id={modalTitleId}
                className="text-lg sm:text-xl font-bold text-white font-display tracking-wide"
              >
                Skenario Properti Tersimpan
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {scenarios.length} / {MAX_SCENARIOS} slot terpakai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-base"
          >
            ✕
          </button>
        </div>

        {/* Tombol Simpan Konfigurasi Saat Ini */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-white block">Konfigurasi Saat Ini</span>
            <span className="text-[11px] text-slate-300 font-mono block">
              {getNeighborhoodName(String(currentValues.Neighborhood ?? "CollgCr"))} ·{" "}
              {currentValues.OverallQual}/10 · {currentValues.GrLivArea} sq ft
              {currentPrice && currentPrice > 0 ? ` · ${formatUSD(currentPrice)}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveCurrent}
            disabled={scenarios.length >= MAX_SCENARIOS}
            className="sims-btn-shiny sims-btn-green w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-lg text-slate-950 whitespace-nowrap disabled:opacity-40"
          >
            <span>+ Simpan Skenario</span>
          </button>
        </div>

        {/* Daftar Skenario */}
        <div className="flex flex-col gap-2.5 my-1">
          {scenarios.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs sm:text-sm bg-slate-950/40 rounded-xl border border-slate-800 p-4">
              Belum ada skenario tersimpan. Klik tombol <strong>+ Simpan Skenario</strong> di atas untuk
              menyimpan konfigurasi rumah saat ini ke browser.
            </div>
          ) : (
            scenarios.map((scen) => (
              <div
                key={scen.id}
                className="sims-card p-3 rounded-xl border border-cyan-500/20 bg-slate-900/60 flex items-center justify-between gap-3 hover:border-emerald-400/60 transition-all group"
              >
                <button
                  type="button"
                  onClick={() => handleRestore(scen)}
                  className="flex-1 text-left select-none"
                  title="Klik untuk memulihkan skenario ini"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                      {scen.name}
                    </span>
                    {scen.predictedPrice && (
                      <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {formatUSD(scen.predictedPrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block mt-1">
                    Disimpan: {new Date(scen.timestamp).toLocaleDateString("id-ID")} · Garasi:{" "}
                    {scen.values.GarageCars} · Mandi: {scen.values.FullBath}
                  </span>
                </button>

                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    type="button"
                    onClick={() => handleRestore(scen)}
                    title="Terapkan skenario ini"
                    className="sims-btn-shiny sims-btn-blue px-2.5 py-1.5 text-xs font-bold rounded-lg text-white"
                  >
                    Terapkan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(scen.id, scen.name)}
                    title="Hapus skenario ini"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/30 border border-red-500/30 text-xs transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-cyan-500/10">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="sims-btn-shiny bg-slate-800 text-slate-300 px-4 py-2 text-xs font-bold rounded-lg hover:bg-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
