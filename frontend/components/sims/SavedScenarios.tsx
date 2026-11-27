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

  const persistScenarios = useCallback((items: SavedScenario[]) => {
    setScenarios(items);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Abaikan jika kuota penuh / localStorage dimatikan
    }
  }, []);

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

  const handleDelete = (id: string, name: string) => {
    playClickSound();
    const next = scenarios.filter((s) => s.id !== id);
    persistScenarios(next);
    onToast(`Skenario "${name}" dihapus.`, "info");
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClickSound();
          onClose();
        }
      }}
    >
      <div className="sims-modal-sheet w-full max-w-lg max-h-[90dvh] flex flex-col animate-pop">
        {/* Header */}
        <div className="sims-modal-header shrink-0 px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center text-lg shadow shrink-0"
            >
              💾
            </span>
            <div className="min-w-0">
              <h2 id={modalTitleId} className="text-base sm:text-lg font-black font-display leading-tight truncate">
                Skenario Properti Tersimpan
              </h2>
              <p className="text-[11px] text-sky-100 font-semibold">
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
            aria-label="Tutup skenario"
            className="sims-btn-round sims-btn-red w-8 h-8 min-w-8 text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="bg-slate-50 text-slate-800 p-3 sm:p-5 overflow-y-auto flex-1 space-y-3">
          <div className="bg-white p-3 rounded-xl border-2 border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="min-w-0">
              <span className="text-[11px] font-black text-slate-800 block">Konfigurasi Saat Ini</span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                {getNeighborhoodName(String(currentValues.Neighborhood ?? "CollgCr"))} ·{" "}
                {currentValues.OverallQual}/10 · {currentValues.GrLivArea} sq ft
                {currentPrice && currentPrice > 0 ? ` · ${formatUSD(currentPrice)}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={scenarios.length >= MAX_SCENARIOS}
              className="sims-btn-shiny sims-btn-green w-full sm:w-auto px-3.5 py-2 text-[11px] font-black whitespace-nowrap"
            >
              + Simpan Skenario
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {scenarios.length === 0 ? (
              <div className="text-center py-7 text-slate-500 text-[11px] bg-white rounded-xl border-2 border-sky-100 p-4">
                Belum ada skenario tersimpan. Klik tombol <strong className="text-slate-700">+ Simpan Skenario</strong>{" "}
                di atas untuk menyimpan konfigurasi rumah saat ini ke browser.
              </div>
            ) : (
              scenarios.map((scen) => (
                <div
                  key={scen.id}
                  className="bg-white p-2.5 rounded-xl border-2 border-sky-100 hover:border-lime-400 transition-colors flex items-center justify-between gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleRestore(scen)}
                    className="flex-1 min-w-0 text-left select-none"
                    title="Klik untuk memulihkan skenario ini"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] sm:text-xs font-black text-slate-800">
                        {scen.name}
                      </span>
                      {scen.predictedPrice && (
                        <span className="text-[10px] font-black font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">
                          {formatUSD(scen.predictedPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                      Disimpan: {new Date(scen.timestamp).toLocaleDateString("id-ID")} · Garasi:{" "}
                      {scen.values.GarageCars} · Mandi: {scen.values.FullBath}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      type="button"
                      onClick={() => handleRestore(scen)}
                      title="Terapkan skenario ini"
                      className="sims-btn-shiny sims-btn-blue px-2.5 py-1.5 text-[10px] font-black"
                    >
                      Terapkan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(scen.id, scen.name)}
                      title="Hapus skenario ini"
                      aria-label={`Hapus skenario ${scen.name}`}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 border-2 border-white shadow text-[11px] transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-sky-100 border-t border-sky-200 px-3 sm:px-5 py-2.5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="sims-btn-shiny sims-btn-silver px-4 py-2 text-[11px] font-black"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default SavedScenarios;
