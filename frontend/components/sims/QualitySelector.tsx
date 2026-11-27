"use client";

import React, { useCallback, useId, useState } from "react";

import { playBuildSound } from "@/lib/sound";

export interface QualitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  className?: string;
}

const QUALITY_LEVELS: Array<{ level: number; label: string; tier: string }> = [
  { level: 10, label: "Sangat Istimewa", tier: "Premium" },
  { level: 9, label: "Istimewa", tier: "Premium" },
  { level: 8, label: "Sangat Baik", tier: "Premium" },
  { level: 7, label: "Baik", tier: "Baik" },
  { level: 6, label: "Cukup Baik", tier: "Baik" },
  { level: 5, label: "Rata-rata", tier: "Baik" },
  { level: 4, label: "Cukup", tier: "Standar" },
  { level: 3, label: "Kurang", tier: "Standar" },
  { level: 2, label: "Buruk", tier: "Standar" },
  { level: 1, label: "Sangat Buruk", tier: "Standar" },
];

export function QualitySelector({
  value,
  onChange,
  error,
  className = "",
}: QualitySelectorProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const selectorId = useId();

  const currentLevel = QUALITY_LEVELS.find((q) => q.level === value) ?? QUALITY_LEVELS[4];

  const handleSelect = useCallback(
    (lvl: number) => {
      const clamped = Math.max(1, Math.min(10, lvl));
      if (clamped !== value) {
        onChange(clamped);
        playBuildSound();
      }
    },
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        e.preventDefault();
        handleSelect(value + 1);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        e.preventDefault();
        handleSelect(value - 1);
        break;
      case "Home":
        e.preventDefault();
        handleSelect(1);
        break;
      case "End":
        e.preventDefault();
        handleSelect(10);
        break;
      case "PageUp":
        e.preventDefault();
        handleSelect(value + 2);
        break;
      case "PageDown":
        e.preventDefault();
        handleSelect(value - 2);
        break;
    }
  };

  return (
    <>
      {/* Desktop & Laptop Vertical Selector (>= 768px) */}
      <aside
        id={selectorId}
        aria-label="Kualitas Material & Finishing Bangunan"
        className={`hidden md:flex flex-col items-center p-2.5 rounded-2xl sims-glass border border-cyan-400/20 shadow-2xl ${className}`}
        style={{ width: "76px" }}
      >
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center mb-2 select-none">
          Kualitas
        </span>

        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={value}
          aria-valuetext={`${value}: ${currentLevel.label}`}
          onKeyDown={handleKeyDown}
          className="flex flex-col gap-1 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400/50 rounded-xl p-0.5"
        >
          {QUALITY_LEVELS.map(({ level, label, tier }) => {
            const isSelected = level === value;

            return (
              <button
                key={level}
                type="button"
                tabIndex={-1}
                onClick={() => handleSelect(level)}
                aria-label={`Tingkat ${level}: ${label} (${tier})`}
                className={`relative group w-full h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 select-none ${
                  isSelected
                    ? "sims-btn-shiny sims-btn-green text-slate-950 scale-105 z-10 shadow-[0_0_12px_#00d66c]"
                    : "bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-cyan-500/30"
                }`}
              >
                <span>{level}</span>

                {/* Floating tooltip on hover */}
                <div className="absolute right-full mr-2.5 px-2.5 py-1 rounded-md bg-slate-900/95 text-white text-[11px] whitespace-nowrap shadow-xl border border-cyan-500/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30">
                  <span className="font-extrabold text-emerald-400 mr-1.5">{level}</span>
                  <span>{label}</span>
                  <span className="text-[9px] text-slate-400 ml-1.5 uppercase font-mono">({tier})</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 text-center select-none">
          <span className="block text-[11px] font-extrabold text-emerald-400">{value}/10</span>
          <span className="block text-[9px] text-slate-400 truncate max-w-[64px]" title={currentLevel.label}>
            {currentLevel.label}
          </span>
        </div>

        {error && (
          <p className="text-[10px] text-red-400 font-bold mt-1 text-center" role="alert">
            {error}
          </p>
        )}
      </aside>

      {/* Mobile Compact Bar (< 768px) */}
      <div className="md:hidden fixed right-3 top-20 z-20 flex flex-col items-end">
        <button
          type="button"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          aria-expanded={isMobileExpanded}
          aria-label={`Pilih Kualitas Rumah: saat ini ${value} (${currentLevel.label})`}
          className="sims-hud-pill px-3 py-1.5 flex items-center gap-1.5 border border-emerald-400/50 shadow-lg text-xs font-bold text-white bg-slate-900/90"
        >
          <span className="text-[10px] text-slate-400 uppercase">Qual:</span>
          <span className="text-emerald-400 font-extrabold font-mono text-sm">{value}</span>
          <span className="text-[11px] text-slate-200">★</span>
        </button>

        {isMobileExpanded && (
          <div
            role="slider"
            tabIndex={0}
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={value}
            aria-valuetext={`${value}: ${currentLevel.label}`}
            onKeyDown={handleKeyDown}
            className="sims-glass mt-1 p-2 rounded-xl border border-cyan-400/30 shadow-2xl flex flex-col gap-1 w-36 max-h-[50dvh] overflow-y-auto"
          >
            <div className="flex justify-between items-center px-1 mb-1 border-b border-cyan-500/20 pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Kualitas (1-10)</span>
              <button
                type="button"
                onClick={() => setIsMobileExpanded(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            {QUALITY_LEVELS.map(({ level, label }) => {
              const isSelected = level === value;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    handleSelect(level);
                    setIsMobileExpanded(false);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-left text-xs font-bold flex items-center justify-between ${
                    isSelected
                      ? "sims-btn-shiny sims-btn-green text-slate-950 font-extrabold"
                      : "bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-mono text-xs opacity-80">{level}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
