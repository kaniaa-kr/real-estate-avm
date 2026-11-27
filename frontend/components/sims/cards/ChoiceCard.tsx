"use client";

import React from "react";

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
  const handleSelect = (nextVal: string) => {
    onChange(nextVal);
    playBuildSound();
  };

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div
      className={`sims-item-card w-full h-full p-3 flex flex-col justify-between ${
        error ? "is-error" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <label className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-tight select-none">
          {label}
        </label>
        <span className="text-[10px] font-black text-sky-800 bg-sky-100 border border-sky-200 rounded-full px-2 py-0.5 max-w-[55%] truncate shrink-0">
          {selectedLabel}
        </span>
      </div>

      <input type="hidden" name={name} value={value} />

      {layout === "scroll" ? (
        <div
          role="radiogroup"
          aria-label={label}
          className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth snap-x"
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
                className={`snap-start flex-none min-w-[128px] max-w-[150px] min-h-[62px] p-2 rounded-xl border-2 text-left transition-all duration-150 select-none flex flex-col justify-between ${
                  isSelected
                    ? "border-[#68C928] bg-[#F3FFE8] shadow-[0_0_0_2px_#ffffff,0_4px_10px_rgba(59,142,13,0.3)]"
                    : "bg-white/85 border-sky-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className={`text-[11px] font-extrabold leading-tight ${isSelected ? "text-emerald-900" : "text-slate-700"}`}>
                    {opt.label}
                  </span>
                  {isSelected ? (
                    <span className="w-4 h-4 rounded-full bg-lime-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      ✓
                    </span>
                  ) : (
                    opt.badge && (
                      <span className="text-[9px] font-mono px-1 py-0.5 bg-sky-100 text-sky-700 rounded shrink-0">
                        {opt.badge}
                      </span>
                    )
                  )}
                </div>
                {opt.desc && <p className="text-[9px] text-slate-500 mt-1 line-clamp-1">{opt.desc}</p>}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label={label}
          className={`grid gap-1.5 my-0.5 ${
            options.length >= 5 ? "grid-cols-3" : "grid-cols-2"
          }`}
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
                className={`px-1.5 py-1 rounded-xl border-2 text-center transition-all duration-150 select-none flex flex-col items-center justify-center min-h-[44px] ${
                  isSelected
                    ? "border-[#68C928] bg-[#F3FFE8] text-emerald-900 shadow-[0_0_0_2px_#ffffff,0_4px_10px_rgba(59,142,13,0.3)]"
                    : "bg-white/85 border-sky-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700"
                }`}
              >
                <span className="text-[10px] sm:text-[11px] font-extrabold leading-tight">
                  {opt.label}
                </span>
                {opt.desc && (
                  <span
                    className={`text-[8px] sm:text-[9px] mt-0.5 leading-tight line-clamp-1 ${
                      isSelected ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {opt.desc}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-1 min-h-[26px]">
        {error ? (
          <p className="text-[10px] text-red-600 font-bold leading-snug line-clamp-2" role="alert">
            {error}
          </p>
        ) : (
          help && <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{help}</p>
        )}
      </div>
    </div>
  );
}

export default ChoiceCard;
