"use client";

import React, { useId, useState } from "react";

import { formatInteger } from "@/lib/format";
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
  /** Tampilkan pemisah ribuan pada batas & nilai (matikan untuk tahun). */
  groupThousands?: boolean;
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
  groupThousands = true,
  onChange,
  formatValue,
}: SliderCardProps) {
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [draftState, setDraftState] = useState(() => ({
    text: String(value),
    source: value,
  }));
  const [localError, setLocalError] = useState<string | null>(null);

  // Draf selalu diturunkan dari nilai terakhir; perubahan eksternal
  // (slider, preset, tombol acak) otomatis membatalkan draf lama.
  const draft = draftState.source === value ? draftState.text : String(value);
  const activeLocalError = localError && draftState.source === value ? localError : null;
  const shownError = error ?? activeLocalError;
  const displayValue = formatValue ? formatValue(value) : formatInteger(value, groupThousands);
  const displayDraft = editing || activeLocalError ? draft : String(value);
  const minLabel = formatInteger(min, groupThousands);
  const maxLabel = formatInteger(max, groupThousands);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditing(false);
    setLocalError(null);
    onChange(Number(e.target.value));
    playBuildSound();
  };

  const commitDraft = () => {
    const raw = draft.trim();

    if (raw === "") {
      setLocalError(`Wajib diisi (${minLabel}–${maxLabel}).`);
      return;
    }

    const numeric = Number(raw);

    if (!Number.isFinite(numeric)) {
      setLocalError("Isi dengan angka.");
      return;
    }
    if (step >= 1 && !Number.isInteger(numeric)) {
      setLocalError("Isi dengan bilangan bulat.");
      return;
    }
    if (numeric < min) {
      setLocalError(`Nilai minimal ${minLabel}.`);
      return;
    }
    if (numeric > max) {
      setLocalError(`Nilai maksimal ${maxLabel}.`);
      return;
    }

    setLocalError(null);
    setEditing(false);
    setDraftState({ text: String(numeric), source: numeric });

    if (numeric !== value) {
      onChange(numeric);
      playBuildSound();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Escape") {
      setDraftState({ text: String(value), source: value });
      setLocalError(null);
      setEditing(false);
    }
  };

  return (
    <div
      className={`sims-item-card w-full h-full p-3 flex flex-col justify-between ${
        shownError ? "is-error" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <label
          htmlFor={inputId}
          className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-tight select-none"
        >
          {label}
        </label>
        <div className="flex items-center gap-1 shrink-0">
          <input
            id={inputId}
            name={name}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={displayDraft}
            onFocus={(e) => {
              setEditing(true);
              setLocalError(null);
              setDraftState({ text: String(value), source: value });
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setDraftState({ text: e.target.value, source: value });
              setLocalError(null);
            }}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
            aria-label={`${label}, ketik nilai ${minLabel} sampai ${maxLabel}`}
            aria-invalid={Boolean(shownError)}
            title={`Ketik nilai ${minLabel}–${maxLabel}, lalu tekan Enter atau klik di luar`}
            className={`sims-number-input w-[68px] ${shownError ? "is-invalid" : ""}`}
          />
          {unit && <span className="text-[9px] font-bold text-sky-700 leading-none">{unit}</span>}
        </div>
      </div>

      <div className="my-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleRangeChange}
          aria-label={`${label}: ${displayValue} ${unit}`}
          aria-valuetext={`${displayValue} ${unit}`}
          className="sims-slider w-full"
        />
        <div className="flex justify-between text-[9px] font-bold text-slate-500 tabular-nums">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>

      <div className="min-h-[26px]">
        {shownError ? (
          <p className="text-[10px] text-red-600 font-bold leading-snug line-clamp-2" role="alert">
            {shownError}
          </p>
        ) : (
          help && (
            <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{help}</p>
          )
        )}
      </div>
    </div>
  );
}

export default SliderCard;
