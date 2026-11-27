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
    onChange(Number(e.target.value));
    playBuildSound();
  };

  return (
    <div className={`sims-item-card w-full h-full p-3 flex flex-col justify-between ${error ? "is-error" : ""}`}>
      <div className="flex items-start justify-between gap-1.5">
        <label
          htmlFor={inputId}
          className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-tight select-none"
        >
          {label}
        </label>
        <span className="text-[11px] font-black font-display text-blue-700 bg-sky-100 border border-sky-200 rounded-full px-2 py-0.5 whitespace-nowrap">
          {displayValue}
          {unit && <span className="text-[9px] font-bold text-sky-700 ml-0.5">{unit}</span>}
        </span>
      </div>

      <div className="my-1.5">
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
          aria-valuetext={`${displayValue} ${unit}`}
          className="sims-slider w-full"
        />
        <div className="flex justify-between text-[9px] font-bold text-slate-500 tabular-nums">
          <span>{min.toLocaleString("en-US")}</span>
          <span>{max.toLocaleString("en-US")}</span>
        </div>
      </div>

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

export default SliderCard;
