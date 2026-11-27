"use client";

import React, { useCallback, useId } from "react";

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

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d={direction === "up" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QualitySelector({
  value,
  onChange,
  error,
  className = "",
}: QualitySelectorProps) {
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

  const sliderAria = {
    role: "slider",
    tabIndex: 0,
    "aria-valuemin": 1,
    "aria-valuemax": 10,
    "aria-valuenow": value,
    "aria-valuetext": `${value}: ${currentLevel.label}`,
    onKeyDown: handleKeyDown,
  } as const;

  return (
    <>
      {/* Desktop / laptop: kapsul vertikal melayang di kanan tengah */}
      <aside
        id={selectorId}
        aria-label="Kualitas material dan finishing bangunan, skala 1 sampai 10"
        className={`hidden md:flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-white/35 border-2 border-white/80 backdrop-blur-sm shadow-lg absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 ${className}`}
      >
        <div className="w-full px-0.5 text-center leading-none pb-0.5">
          <span className="block text-[8px] font-black uppercase tracking-wide text-slate-700">
            Kualitas Material
          </span>
          <span className="block text-[8px] font-extrabold text-slate-600">(1–10)</span>
        </div>

        <button
          type="button"
          onClick={() => handleSelect(value + 1)}
          disabled={value >= 10}
          aria-label="Naikkan kualitas material"
          title="Naikkan kualitas material"
          className="w-12 h-7 rounded-t-2xl bg-white/90 hover:bg-white border-2 border-white shadow-lg flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
        >
          <Chevron direction="up" />
        </button>

        <div
          {...sliderAria}
          aria-label={`Kualitas material: ${value} dari 10, ${currentLevel.label}`}
          className="w-12 h-12 rounded-full bg-slate-800/90 border-[2.5px] border-white shadow-lg flex items-center justify-center text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300/70"
        >
          <span className="font-display text-lg font-black leading-none">{value}</span>
        </div>

        <button
          type="button"
          onClick={() => handleSelect(value - 1)}
          disabled={value <= 1}
          aria-label="Turunkan kualitas material"
          title="Turunkan kualitas material"
          className="w-12 h-7 rounded-b-2xl bg-white/90 hover:bg-white border-2 border-white shadow-lg flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
        >
          <Chevron direction="down" />
        </button>

        <span className="max-w-[82px] text-center text-[9px] font-extrabold text-white bg-slate-800/85 border border-white/70 rounded-full px-1.5 py-0.5 leading-tight">
          {value} • {currentLevel.label}
        </span>

        {error && (
          <p
            className="max-w-[82px] text-[9px] text-red-700 bg-white/90 font-bold text-center rounded px-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </aside>

      {/* Mobile: pil ringkas di kiri bawah, tidak menutupi denah */}
      <div className="md:hidden absolute left-2.5 bottom-2.5 z-20 flex flex-col items-start gap-1">
        <span className="ml-1 rounded-full bg-slate-800/85 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow">
          Kualitas Material (1–10)
        </span>
        <div className="flex items-center gap-1 p-1 pr-2 rounded-full bg-white/90 border-2 border-white shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={() => handleSelect(value - 1)}
            disabled={value <= 1}
            aria-label="Turunkan kualitas material"
            title="Turunkan kualitas material"
            className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
          >
            <Chevron direction="down" />
          </button>
          <div
            {...sliderAria}
            aria-label={`Kualitas material: ${value} dari 10, ${currentLevel.label}`}
            className="w-9 h-9 rounded-full bg-slate-800/90 border-2 border-white shadow flex items-center justify-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <span className="font-display text-sm font-black leading-none">{value}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(value + 1)}
            disabled={value >= 10}
            aria-label="Naikkan kualitas material"
            title="Naikkan kualitas material"
            className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
          >
            <Chevron direction="up" />
          </button>
          <span className="max-w-[112px] text-[9px] font-extrabold text-slate-700 leading-tight">
            {value} • {currentLevel.label}
          </span>
        </div>
        {error && (
          <p className="text-[9px] text-red-700 bg-white/90 font-bold rounded px-1.5 py-0.5" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  );
}

export default QualitySelector;