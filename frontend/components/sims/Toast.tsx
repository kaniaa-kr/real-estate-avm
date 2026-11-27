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
    info: "bg-gradient-to-b from-sky-400 to-blue-600",
    success: "bg-gradient-to-b from-lime-400 to-green-600",
    warning: "bg-gradient-to-b from-amber-300 to-orange-500",
    error: "bg-gradient-to-b from-rose-400 to-red-600",
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
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-fadeIn max-w-[92vw]"
    >
      <div
        className={`${typeStyles} px-3.5 py-2 flex items-center gap-2 text-[11px] sm:text-sm font-black text-white border-[2.5px] border-white rounded-full shadow-[0_6px_18px_rgba(10,52,99,0.4),inset_0_3px_4px_rgba(255,255,255,0.45)]`}
      >
        <span className="text-base select-none" aria-hidden="true">
          {icon}
        </span>
        <span className="tracking-wide select-none">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="ml-1 w-5 h-5 rounded-full bg-white/25 hover:bg-white/40 text-white text-[10px] flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Toast;
