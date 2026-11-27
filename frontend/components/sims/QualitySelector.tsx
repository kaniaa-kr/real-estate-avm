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

  return (
    <>
      {/* Desktop / laptop: kapsul vertikal melayang di kanan tengah */}
      <aside
        id={selectorId}
        aria-label="Kualitas material dan finishing bangunan"
        className={`hidden md:flex flex-col items-center gap-1.5 p-1 rounded-3xl bg-white/25 border-2 border-white/70 backdrop-blur-sm shadow-lg absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 ${className}`}
      >
        <button
          type="button"
          onClick={() => handleSelect(value + 1)}
          disabled={value >= 10}
          aria-label="Naikkan kualitas material"
          title="Naikkan kualitas"
          className="w-11 h-8 rounded-t-2xl bg-white/90 hover:bg-white border-2 border-white shadow-lg flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
        >
          <Chevron direction="up" />
        </button>

        <div className="relative group">
          <div
            role="slider"
            tabIndex={0}
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={value}
            aria-valuetext={`${value}: ${currentLevel.label}`}
            onKeyDown={handleKeyDown}
            className="w-12 h-12 rounded-full bg-slate-800/90 border-[2.5px] border-white shadow-lg flex items-center justify-center text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300/70"
          >
            <span className="font-display text-lg font-black leading-none">{value}</span>
          </div>

          {/* Tooltip label */}
          <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-2.5 py-1 rounded-lg bg-slate-800/95 text-white text-[10px] whitespace-nowrap shadow-xl border border-white/40">
              <span className="font-black text-lime-300 mr-1">{value}/10</span>
              {currentLevel.label}
              <span className="text-[9px] text-sky-200 ml-1.5 uppercase">({currentLevel.tier})</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSelect(value - 1)}
          disabled={value <= 1}
          aria-label="Turunkan kualitas material"
          title="Turunkan kualitas"
          className="w-11 h-8 rounded-b-2xl bg-white/90 hover:bg-white border-2 border-white shadow-lg flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
        >
          <Chevron direction="down" />
        </button>

        <span className="max-w-[64px] text-center text-[9px] font-extrabold text-white bg-slate-800/80 border border-white/70 rounded-full px-1.5 py-0.5 leading-tight">
          {currentLevel.label}
        </span>

        {error && (
          <p className="max-w-[70px] text-[9px] text-red-700 bg-white/90 font-bold text-center rounded px-1" role="alert">
            {error}
          </p>
        )}
      </aside>

      {/* Mobile: pil ringkas di kiri bawah, tidak menutupi denah */}
      <div className="md:hidden flex flex-col items-start gap-1 absolute left-2.5 bottom-2.5 z-20">
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/85 border-2 border-white shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={() => handleSelect(value - 1)}
            disabled={value <= 1}
            aria-label="Turunkan kualitas material"
            className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
          >
            <Chevron direction="down" />
          </button>
          <div
            role="slider"
            tabIndex={0}
            aria-valuemin={1}
            aria-valuemax={10}
            aria-valuenow={value}
            aria-valuetext={`${value}: ${currentLevel.label}`}
            onKeyDown={handleKeyDown}
            aria-label={`Kualitas rumah: ${value} dari 10, ${currentLevel.label}`}
            className="w-9 h-9 rounded-full bg-slate-800/90 border-2 border-white shadow flex items-center justify-center text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <span className="font-display text-sm font-black leading-none">{value}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSelect(value + 1)}
            disabled={value >= 10}
            aria-label="Naikkan kualitas material"
            className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow flex items-center justify-center text-slate-600 active:scale-90 transition disabled:opacity-40"
          >
            <Chevron direction="up" />
          </button>
          <span className="pr-1 text-[9px] font-extrabold text-slate-700 uppercase leading-tight">
            Kualitas
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
