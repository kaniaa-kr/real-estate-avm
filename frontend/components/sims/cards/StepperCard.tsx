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
    <div className={`sims-item-card w-full h-full p-3 flex flex-col justify-between ${error ? "is-error" : ""}`}>
      <div className="flex items-start justify-between gap-1.5">
        <label className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-tight select-none">
          {label}
        </label>
        {unit && <span className="text-[9px] font-bold text-slate-500">{unit}</span>}
      </div>

      <div className="text-center my-0.5">
        <span className="text-2xl sm:text-3xl font-black font-display text-blue-700 tabular-nums leading-none">
          {value}
        </span>
        <div className="flex justify-center gap-1 mt-1">
          {Array.from({ length: max - min + 1 }).map((_, idx) => {
            const currentPip = min + idx;
            const isActive = currentPip <= value;
            return (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  isActive ? "bg-lime-500" : "bg-slate-300"
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 my-1">
        <button
          type="button"
          disabled={!canDec}
          onClick={handleDec}
          aria-label={`Kurangi ${label}`}
          className="sims-btn-round sims-btn-red w-8 h-8 min-w-8 text-base font-black"
        >
          −
        </button>
        <button
          type="button"
          disabled={!canInc}
          onClick={handleInc}
          aria-label={`Tambah ${label}`}
          className="sims-btn-round sims-btn-green w-8 h-8 min-w-8 text-base font-black"
        >
          +
        </button>
      </div>

      <input type="hidden" name={name} value={value} />

      {error ? (
        <p className="text-[10px] text-red-600 font-bold leading-snug" role="alert">
          {error}
        </p>
      ) : (
        help && <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{help}</p>
      )}
    </div>
  );
}

export default StepperCard;
