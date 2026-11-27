"use client";

import React, { useId } from "react";

import { playBuildSound } from "@/lib/sound";

export interface SliderCardProps {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  help?: string;
  error?: string;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
}

export function SliderCard({
  name,
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  help,
  error,
  onChange,
  formatValue,
}: SliderCardProps) {
  const inputId = useId();
  const displayValue = formatValue ? formatValue(value) : value.toLocaleString("en-US");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = Number(e.target.value);
    onChange(nextVal);
    playBuildSound();
  };

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div
      className={`sims-card p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 ${
        error ? "border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.45)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <label
          htmlFor={inputId}
          className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide select-none"
        >
          {label}
        </label>
        <span className="sims-hud-pill px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          {displayValue} {unit && <span className="text-[10px] text-slate-400 font-sans">{unit}</span>}
        </span>
      </div>

      <div className="my-2">
        <div className="relative flex items-center h-8">
          <input
            id={inputId}
            name={name}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            aria-label={`${label}: ${displayValue} ${unit}`}
            aria-invalid={Boolean(error)}
            className="w-full h-2.5 bg-slate-900/80 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            style={{
              background: `linear-gradient(to right, #00d66c 0%, #00d66c ${pct}%, #0c2033 ${pct}%, #0c2033 100%)`,
            }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>{min.toLocaleString("en-US")}</span>
          <span>{max.toLocaleString("en-US")}</span>
        </div>
      </div>

      {help && !error && (
        <p className="text-[11px] text-slate-300 mt-1 line-clamp-1 leading-snug">{help}</p>
      )}

      {error && (
        <p className="text-[11px] text-red-400 font-semibold mt-1 animate-pulse" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
