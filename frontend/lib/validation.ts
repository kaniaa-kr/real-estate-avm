import type { PredictPayload } from "@/lib/api";
import type { FeatureDefinition } from "@/lib/features";

/** Nilai form disimpan sebagai string agar input kosong bisa dibedakan dari 0. */
export type FeatureValues = Record<string, string>;
export type FieldErrors = Record<string, string>;

export function initialValues(features: FeatureDefinition[]): FeatureValues {
  return Object.fromEntries(
    features.map((feature) => [feature.name, String(feature.default)]),
  );
}

/**
 * Validasi satu fitur memakai label/rentang/kategori dari features.json.
 * Mengembalikan pesan galat bahasa Indonesia, atau undefined jika valid.
 */
export function validateFeature(
  feature: FeatureDefinition,
  raw: string | undefined,
): string | undefined {
  const value = (raw ?? "").trim();

  if (feature.type === "category") {
    if (!value || !feature.categories?.includes(value)) {
      return "Pilih salah satu opsi.";
    }
    return undefined;
  }

  if (value === "") {
    return "Wajib diisi.";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "Isi dengan angka.";
  }
  if (feature.type === "int" && !Number.isInteger(numeric)) {
    return "Isi dengan bilangan bulat.";
  }
  if (feature.min !== undefined && numeric < feature.min) {
    return `Nilai minimal ${feature.min}.`;
  }
  if (feature.max !== undefined && numeric > feature.max) {
    return `Nilai maksimal ${feature.max}.`;
  }

  return undefined;
}

export function validateAll(
  features: FeatureDefinition[],
  values: FeatureValues,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const feature of features) {
    const message = validateFeature(feature, values[feature.name]);
    if (message) {
      errors[feature.name] = message;
    }
  }
  return errors;
}

/** Panggil hanya setelah validateAll lolos. */
export function toPayload(
  features: FeatureDefinition[],
  values: FeatureValues,
): PredictPayload {
  const payload: PredictPayload = {};
  for (const feature of features) {
    const raw = values[feature.name] ?? "";
    payload[feature.name] = feature.type === "category" ? raw : Number(raw);
  }
  return payload;
}
