"use client";

import React from "react";

import { playBuildSound } from "@/lib/sound";

export interface StepperCardProps {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  help?: string;
  error?: string;
  onChange: (value: number) => void;
}

export function StepperCard({
  name,
  label,
  value,
  min,
  max,
  unit = "",
  help,
  error,
  onChange,
}: StepperCardProps) {
  const canDec = value > min;
  const canInc = value < max;

  const handleDec = () => {
    if (canDec) {
      onChange(value - 1);
      playBuildSound();
    }
  };

  const handleInc = () => {
    if (canInc) {
      onChange(value + 1);
      playBuildSound();
    }
  };

  return (
    <div
      className={`sims-card p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 ${
        error ? "border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.45)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <label className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide select-none">
          {label}
        </label>
        {unit && <span className="text-[11px] text-slate-400 font-sans">{unit}</span>}
      </div>

      <div className="flex items-center justify-between my-2 bg-slate-950/40 rounded-xl p-1.5 border border-cyan-500/10">
        <button
          type="button"
          disabled={!canDec}
          onClick={handleDec}
          aria-label={`Kurangi ${label}`}
          className="sims-btn-shiny sims-btn-blue w-10 h-10 min-w-10 text-xl font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>

        <div className="flex flex-col items-center justify-center px-4">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {value}
          </span>
          {/* Visual dots */}
          <div className="flex gap-1 mt-0.5">
            {Array.from({ length: max - min + 1 }).map((_, idx) => {
              const currentPip = min + idx;
              const isActive = currentPip <= value;
              return (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isActive ? "bg-emerald-400 shadow-[0_0_6px_#00d66c]" : "bg-slate-700"
                  }`}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={!canInc}
          onClick={handleInc}
          aria-label={`Tambah ${label}`}
          className="sims-btn-shiny sims-btn-blue w-10 h-10 min-w-10 text-xl font-bold rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      <input type="hidden" name={name} value={value} />

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
