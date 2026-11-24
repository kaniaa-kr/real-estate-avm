"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { API_URL } from "@/lib/api";

type Health =
  | { status: "checking" }
  | { status: "ready"; modelVersion: string }
  | { status: "warming"; modelVersion: string }
  | { status: "offline" };

interface HealthBody {
  model_loaded?: boolean;
  model_version?: string;
}

function healthCopy(health: Health): string {
  switch (health.status) {
    case "checking":
      return "Memeriksa koneksi API";
    case "ready":
      return health.modelVersion
        ? `API siap, model ${health.modelVersion} termuat`
        : "API siap, model termuat";
    case "warming":
      return "API hidup, model belum termuat";
    default:
      return "API tidak terjangkau";
  }
}

function toHealth(body: HealthBody): Health {
  const modelVersion = body.model_version ?? "";
  return body.model_loaded
    ? { status: "ready", modelVersion }
    : { status: "warming", modelVersion };
}

async function fetchHealth(): Promise<HealthBody> {
  const response = await fetch(`${API_URL}/health`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as HealthBody;
}

export function HealthStatus() {
  const [health, setHealth] = useState<Health>({ status: "checking" });
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    const current = ++requestId.current;

    fetchHealth().then(
      (body) => {
        if (active && current === requestId.current) {
          setHealth(toHealth(body));
        }
      },
      () => {
        if (active && current === requestId.current) {
          setHealth({ status: "offline" });
        }
      },
    );

    return () => {
      active = false;
      requestId.current += 1;
    };
  }, []);

  const retry = useCallback(() => {
    const current = ++requestId.current;
    setHealth({ status: "checking" });

    fetchHealth().then(
      (body) => {
        if (current === requestId.current) {
          setHealth(toHealth(body));
        }
      },
      () => {
        if (current === requestId.current) {
          setHealth({ status: "offline" });
        }
      },
    );
  }, []);

  const canRetry = health.status === "offline" || health.status === "warming";

  return (
    <div className={`health health-${health.status}`} role="status" aria-live="polite">
      <span className="health-dot" aria-hidden="true" />
      <span>{healthCopy(health)}</span>
      {canRetry ? (
        <button type="button" className="link-button" onClick={retry}>
          Periksa lagi
        </button>
      ) : null}
    </div>
  );
}
