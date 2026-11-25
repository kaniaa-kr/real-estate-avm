"use client";

import { useServerStatus } from "@/components/server-status-provider";

export function HealthStatus() {
  const { phase, modelVersion, warming, retry } = useServerStatus();

  const message =
    phase === "loading"
      ? "Server sedang memuat..."
      : phase === "ready"
        ? modelVersion
          ? `Server siap · model ${modelVersion}`
          : "Server siap"
        : warming
          ? "Model belum termuat"
          : "Server belum merespons";

  return (
    <div
      className={`health health-${phase}`}
      role="status"
      aria-live="polite"
    >
      <span className="health-dot" aria-hidden="true" />
      <span className="health-copy">
        <span>{message}</span>
        {phase === "loading" ? (
          <span className="health-note">
            {warming
              ? "Model belum termuat, mencoba lagi..."
              : "Cold start bisa memakan waktu."}
          </span>
        ) : null}
      </span>
      {phase === "offline" ? (
        <button type="button" className="link-button" onClick={retry}>
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}
