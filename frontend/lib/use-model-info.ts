"use client";

import { useCallback, useEffect, useState } from "react";

import { API_URL, ApiError } from "@/lib/api";

export interface ModelMetrics {
  rmsle?: number;
  mae_usd?: number;
  rmse_usd?: number;
  r2?: number;
}

export interface ModelInfoResponse {
  model_version: string;
  algorithm: string;
  trained_at: string;
  features_used: string[];
  metrics: Record<string, Record<string, number | null | undefined>>;
  interval: Record<string, unknown>;
  explanation_method: string;
}

export interface ParsedModelInfo {
  model_version: string;
  algorithm: string;
  trained_at: string;
  features_used: string[];
  explanation_method: string;
  /** R² pada test_10_features; undefined jika null, kosong, atau 0 */
  r2?: number;
  /** RMSLE pada test_10_features; undefined jika null, kosong, atau 0 */
  rmsle?: number;
  /** MAE (USD) pada test_10_features; undefined jika null, kosong, atau 0 */
  mae?: number;
  /** RMSE (USD) pada test_10_features; undefined jika null, kosong, atau 0 */
  rmse?: number;
  raw: ModelInfoResponse;
}

/** Ambil nilai metrik numerik positif (> 0). Jika null, 0, atau kosong, kembalikan undefined. */
function sanitizeMetric(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export async function fetchModelInfo(
  signal?: AbortSignal,
): Promise<ParsedModelInfo> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/model-info`, {
      cache: "no-store",
      signal,
    });
  } catch (err: unknown) {
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw err;
    }
    throw new ApiError(
      "Tidak dapat memuat info model. Periksa koneksi backend.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `Gagal memuat info model (HTTP ${response.status}).`,
      response.status,
    );
  }

  const raw: unknown = await response.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    throw new ApiError("Respons /model-info tidak valid.", response.status);
  }

  const data = raw as ModelInfoResponse;
  const testMetrics = data.metrics?.test_10_features ?? {};

  return {
    model_version: data.model_version ?? "v1",
    algorithm: data.algorithm ?? "—",
    trained_at: data.trained_at ?? "",
    features_used: Array.isArray(data.features_used) ? data.features_used : [],
    explanation_method: data.explanation_method ?? "placeholder",
    r2: sanitizeMetric(testMetrics.r2),
    rmsle: sanitizeMetric(testMetrics.rmsle),
    mae: sanitizeMetric(testMetrics.mae_usd),
    rmse: sanitizeMetric(testMetrics.rmse_usd),
    raw: data,
  };
}

export interface UseModelInfoResult {
  modelInfo: ParsedModelInfo | null;
  loading: boolean;
  error: ApiError | Error | null;
  reload: () => void;
}

/**
 * Hook untuk memuat metadata model (/model-info) sekali saat komponen dipasang.
 * Metrik yang bernilai 0/null/kosong (misal pada model stub) dibiarkan undefined
 * agar UI dapat menampilkan tanda strip ("—").
 */
export function useModelInfo(): UseModelInfoResult {
  const [modelInfo, setModelInfo] = useState<ParsedModelInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | Error | null>(null);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function run() {
      try {
        const info = await fetchModelInfo(controller.signal);
        if (!ignore) {
          setModelInfo(info);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (
            (err instanceof DOMException && err.name === "AbortError") ||
            (err instanceof Error && err.name === "AbortError")
          ) {
            return;
          }
          setError(
            err instanceof Error
              ? err
              : new ApiError("Gagal memuat info model.", 0),
          );
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    void fetchModelInfo().then(
      (info) => {
        setModelInfo(info);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(
          err instanceof Error
            ? err
            : new ApiError("Gagal memuat info model.", 0),
        );
        setLoading(false);
      },
    );
  }, []);

  return {
    modelInfo,
    loading,
    error,
    reload,
  };
}
