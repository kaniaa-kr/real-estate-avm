/**
 * Akses API AVM. URL dibaca dari NEXT_PUBLIC_API_URL saat build.
 * Default hanya untuk pengembangan lokal; deploy wajib mengisi env ini.
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_version: string;
}

export interface PredictFactor {
  feature: string;
  impact_usd: number;
  direction: "up" | "down";
}

export interface PredictResponse {
  predicted_price: number;
  price_range: { low: number; high: number };
  top_factors: PredictFactor[];
  explanation_method: string;
  model_version: string;
  disclaimer: string;
}

/** Nilai form yang sudah dikonversi ke tipe yang diminta API. */
export type PredictPayload = Record<string, number | string>;

/** Galat API dengan pesan siap tampil di UI. `detail` hanya konteks tambahan. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toHealth(value: unknown): HealthResponse | null {
  if (!isRecord(value) || typeof value.model_loaded !== "boolean") {
    return null;
  }
  return {
    status: typeof value.status === "string" ? value.status : "",
    model_loaded: value.model_loaded,
    model_version:
      typeof value.model_version === "string" ? value.model_version : "",
  };
}

function isFactor(value: unknown): value is PredictFactor {
  return (
    isRecord(value) &&
    typeof value.feature === "string" &&
    typeof value.impact_usd === "number" &&
    (value.direction === "up" || value.direction === "down")
  );
}

function isPredictResponse(value: unknown): value is PredictResponse {
  if (!isRecord(value) || !isRecord(value.price_range)) {
    return false;
  }
  return (
    typeof value.predicted_price === "number" &&
    typeof value.price_range.low === "number" &&
    typeof value.price_range.high === "number" &&
    Array.isArray(value.top_factors) &&
    value.top_factors.every(isFactor) &&
    typeof value.explanation_method === "string" &&
    typeof value.model_version === "string" &&
    typeof value.disclaimer === "string"
  );
}

/** Ambil pesan galat FastAPI (`{"detail": ...}`) tanpa membocorkan stack trace. */
async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (!isRecord(body)) {
      return undefined;
    }
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      const first = body.detail[0];
      if (isRecord(first) && typeof first.msg === "string") {
        const location = Array.isArray(first.loc)
          ? first.loc.filter((part) => part !== "body").join(".")
          : "";
        return location ? `${location}: ${first.msg}` : first.msg;
      }
    }
  } catch {
    // Respons galat bukan JSON; pesan umum dari status tetap dipakai.
  }
  return undefined;
}

function messageForStatus(status: number): string {
  switch (status) {
    case 422:
      return "Input ditolak server. Periksa kembali nilai pada form.";
    case 503:
      return "Model belum siap. Tunggu beberapa saat lalu coba lagi.";
    case 500:
      return "Terjadi kesalahan pada server. Coba lagi.";
    default:
      return `Permintaan gagal (HTTP ${status}).`;
  }
}

/** GET /health — dipakai untuk indikator warm-up/cold start. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new ApiError(`Server membalas HTTP ${response.status}.`, response.status);
  }
  const health = toHealth(await response.json().catch(() => null));
  if (!health) {
    throw new ApiError("Respons /health tidak dikenali.", response.status);
  }
  return health;
}

/** POST /predict — melempar ApiError dengan pesan yang bisa langsung ditampilkan. */
export async function requestPrediction(
  payload: PredictPayload,
  signal?: AbortSignal,
): Promise<PredictResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      messageForStatus(response.status),
      response.status,
      await readErrorDetail(response),
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!isPredictResponse(body)) {
    throw new ApiError("Respons server tidak sesuai kontrak API.", response.status);
  }
  return body;
}
