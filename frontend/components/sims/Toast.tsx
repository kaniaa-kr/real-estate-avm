"use client";

import React, { useEffect } from "react";

export interface ToastProps {
  message: string | null;
  type?: "info" | "success" | "warning" | "error";
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  type = "info",
  onClose,
  durationMs = 3000,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  const typeStyles = {
    info: "border-cyan-400/40 text-cyan-200 bg-slate-950/90 shadow-[0_4px_20px_rgba(78,161,237,0.35)]",
    success: "border-emerald-400/50 text-emerald-200 bg-slate-950/90 shadow-[0_4px_20px_rgba(0,214,108,0.45)]",
    warning: "border-amber-400/50 text-amber-200 bg-slate-950/90 shadow-[0_4px_20px_rgba(255,203,5,0.4)]",
    error: "border-red-400/50 text-red-200 bg-slate-950/90 shadow-[0_4px_20px_rgba(239,68,68,0.45)]",
  }[type];

  const icon = {
    info: "💡",
    success: "✨",
    warning: "⚠️",
    error: "⛔",
  }[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all animate-bounce"
    >
      <div
        className={`sims-hud-pill px-4 py-2 flex items-center gap-2.5 text-xs sm:text-sm font-bold border rounded-full backdrop-blur-md ${typeStyles}`}
      >
        <span className="text-base select-none">{icon}</span>
        <span className="tracking-wide select-none">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="ml-2 text-slate-400 hover:text-white text-xs px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
