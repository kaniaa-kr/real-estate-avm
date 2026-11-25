"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchHealth } from "@/lib/api";

export type ServerPhase = "loading" | "ready" | "offline";

interface ServerStatusValue {
  /** loading = cold start / model belum termuat; ready = /predict siap dipakai. */
  phase: ServerPhase;
  modelVersion: string;
  /** true bila server menjawab tetapi model belum selesai dimuat. */
  warming: boolean;
  retry: () => void;
}

const POLL_INTERVAL_MS = 3000;
// ±60 detik: cukup untuk cold start free tier (HF Spaces / Render).
const MAX_ATTEMPTS = 20;

const ServerStatusContext = createContext<ServerStatusValue | null>(null);

/**
 * Cek GET /health sekali saat halaman dibuka, lalu ulangi berkala sampai model
 * termuat. Status dibagi ke komponen lain lewat context agar tombol submit bisa
 * menunggu server siap tanpa request yang pasti gagal.
 */
export function ServerStatusProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<ServerPhase>("loading");
  const [modelVersion, setModelVersion] = useState("");
  const [warming, setWarming] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      controller = new AbortController();
      let loaded = false;

      try {
        const health = await fetchHealth(controller.signal);
        if (cancelled) {
          return;
        }
        setModelVersion(health.model_version);
        setWarming(!health.model_loaded);
        loaded = health.model_loaded;
      } catch {
        if (cancelled) {
          return;
        }
        setWarming(false);
      }

      if (cancelled) {
        return;
      }
      if (loaded) {
        setPhase("ready");
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        setPhase("offline");
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    void poll();

    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setPhase("loading");
    setWarming(false);
    setAttempt((current) => current + 1);
  }, []);

  const value = useMemo<ServerStatusValue>(
    () => ({ phase, modelVersion, warming, retry }),
    [phase, modelVersion, warming, retry],
  );

  return (
    <ServerStatusContext.Provider value={value}>
      {children}
    </ServerStatusContext.Provider>
  );
}

export function useServerStatus(): ServerStatusValue {
  const value = useContext(ServerStatusContext);
  if (!value) {
    throw new Error("useServerStatus harus dipakai di dalam ServerStatusProvider.");
  }
  return value;
}
