"use client";

import React, { useRef } from "react";

import { playBuildSound } from "@/lib/sound";

export interface ChoiceOption {
  value: string;
  label: string;
  badge?: string;
  desc?: string;
}

export interface ChoiceCardProps {
  name: string;
  label: string;
  value: string;
  options: ChoiceOption[];
  layout?: "grid" | "scroll";
  help?: string;
  error?: string;
  onChange: (value: string) => void;
}

export function ChoiceCard({
  name,
  label,
  value,
  options,
  layout = "grid",
  help,
  error,
  onChange,
}: ChoiceCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelect = (nextVal: string) => {
    onChange(nextVal);
    playBuildSound();
  };

  return (
    <div
      className={`sims-card p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 ${
        error ? "border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.45)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <label className="text-xs sm:text-sm font-bold text-slate-100 tracking-wide select-none">
          {label}
        </label>
        <span className="sims-hud-pill px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
          {options.find((o) => o.value === value)?.label ?? value}
        </span>
      </div>

      <input type="hidden" name={name} value={value} />

      {layout === "scroll" ? (
        <div
          ref={scrollRef}
          role="radiogroup"
          aria-label={label}
          className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth snap-x"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`snap-start flex-none min-w-[130px] p-2.5 rounded-xl border text-left transition-all duration-150 select-none ${
                  isSelected
                    ? "sims-card-selected border-emerald-400"
                    : "bg-slate-900/60 border-cyan-900/40 hover:bg-slate-800/80 hover:border-cyan-500/40 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold ${isSelected ? "text-emerald-300" : "text-slate-200"}`}>
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded">
                      {opt.badge}
                    </span>
                  )}
                </div>
                {opt.desc && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{opt.desc}</p>}
              </button>
            );
          })}
        </div>
      ) : (
        <div role="radiogroup" aria-label={label} className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`p-2.5 rounded-xl border text-center transition-all duration-150 select-none flex flex-col items-center justify-center min-h-[48px] ${
                  isSelected
                    ? "sims-card-selected border-emerald-400"
                    : "bg-slate-900/60 border-cyan-900/40 hover:bg-slate-800/80 hover:border-cyan-500/40 text-slate-300"
                }`}
              >
                <span className={`text-xs font-bold ${isSelected ? "text-emerald-300" : "text-slate-200"}`}>
                  {opt.label}
                </span>
                {opt.desc && <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>}
              </button>
            );
          })}
        </div>
      )}

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
