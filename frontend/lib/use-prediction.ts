"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, type PredictResponse, requestPrediction } from "@/lib/api";
import { featuresConfig } from "@/lib/features";
import {
  type FeatureValues,
  type FieldErrors,
  toPayload,
  validateAll,
} from "@/lib/validation";

export type PredictionStatus = "idle" | "loading" | "success" | "error";

export interface UsePredictionOptions {
  /** Nilai delay debounce dalam milidetik (default: 600 ms). */
  debounceMs?: number;
  /** Apakah prediksi otomatis aktif (misal menunggu backend siap/health ok). */
  enabled?: boolean;
}

export interface UsePredictionResult {
  status: PredictionStatus;
  /** True saat input berubah/sedang loading tetapi masih mempertahankan hasil sebelumnya. */
  isStale: boolean;
  result: PredictResponse | null;
  error: ApiError | Error | null;
  fieldErrors: FieldErrors;
  /** Fungsi untuk memicu ulang prediksi secara manual (misal tombol "Coba lagi"). */
  retry: () => void;
}

/**
 * Hook siklus hidup prediksi harga rumah AVM:
 * 1. Validasi input di sisi klien terlebih dulu via lib/validation.ts secara reaktif.
 * 2. Menahan eksekusi selama 600ms (debounce) agar tidak membanjiri API.
 * 3. Memakai AbortController untuk membatalkan permintaan lama jika input berubah.
 * 4. Menjaga hasil lama (isStale = true) selama proses kalkulasi baru berlangsung.
 * 5. Memetakan galat HTTP 422 ke kolom fieldErrors terkait.
 */
export function usePrediction(
  values: FeatureValues,
  options: UsePredictionOptions = {},
): UsePredictionResult {
  const { debounceMs = 600, enabled = true } = options;

  const [status, setStatus] = useState<PredictionStatus>("idle");
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestValuesRef = useRef(values);

  useEffect(() => {
    latestValuesRef.current = values;
  }, [values]);

  // Validasi klien langsung dihitung dari input (tanpa cascading setState dalam effect)
  const clientErrors = useMemo(
    () => validateAll(featuresConfig.features, values),
    [values],
  );
  const hasClientErrors = Object.keys(clientErrors).length > 0;

  // Gabungkan galat server (422) dengan galat validasi lokal
  const fieldErrors = useMemo(() => {
    return { ...serverFieldErrors, ...clientErrors };
  }, [serverFieldErrors, clientErrors]);

  const isStale = useMemo(() => {
    return result !== null && (status === "loading" || hasClientErrors);
  }, [result, status, hasClientErrors]);

  const executePrediction = useCallback(
    async (currentValues: FeatureValues) => {
      // Pastikan input valid secara lokal sebelum request dikirim
      const validation = validateAll(featuresConfig.features, currentValues);
      if (Object.keys(validation).length > 0) {
        setStatus("idle");
        setError(null);
        return;
      }

      // Batalkan request yang sedang aktif
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus("loading");
      setError(null);

      try {
        const payload = toPayload(featuresConfig.features, currentValues);
        const data = await requestPrediction(payload, controller.signal);

        setResult(data);
        setStatus("success");
        setError(null);
        setServerFieldErrors({});
      } catch (err: unknown) {
        // Jika request dibatalkan karena perubahan input baru, pertahankan state sebelumnya
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }

        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(
                err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.",
                0,
              );

        // Jika galat validasi server (422), petakan ke field terkait bila ada informasi lokasi
        if (apiError.status === 422 && apiError.detail) {
          const colonIndex = apiError.detail.indexOf(":");
          if (colonIndex > 0) {
            const fieldName = apiError.detail.slice(0, colonIndex).trim();
            const message = apiError.detail.slice(colonIndex + 1).trim();
            if (fieldName) {
              setServerFieldErrors((prev) => ({ ...prev, [fieldName]: message }));
            }
          }
        }

        setError(apiError);
        setStatus("error");
      }
    },
    [],
  );

  // Debounce 600ms memicu eksekusi jika input valid
  useEffect(() => {
    if (!enabled || hasClientErrors) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    const timer = setTimeout(() => {
      void executePrediction(values);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [values, debounceMs, enabled, executePrediction, hasClientErrors]);

  // Pembersihan saat unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const retry = useCallback(() => {
    void executePrediction(latestValuesRef.current);
  }, [executePrediction]);

  return {
    status,
    isStale,
    result,
    error,
    fieldErrors,
    retry,
  };
}
