import featuresFile from "@/public/features.json";

/**
 * Satu-satunya sumber konfigurasi form: frontend/public/features.json.
 * Berkas itu dihasilkan oleh scripts/export_config.py dari src/config.py.
 * Jangan menyalin daftar fitur, rentang, atau kategori di komponen lain.
 */

export type FeatureType = "int" | "float" | "category";

export interface FeatureDefinition {
  name: string;
  label: string;
  type: FeatureType;
  unit: string;
  default: number | string;
  help: string;
  min?: number;
  max?: number;
  categories?: string[];
  ordinal?: boolean;
}

export interface FeaturesConfig {
  model_version: string;
  target: string;
  ref_year: number;
  engineered_features: string[];
  features: FeatureDefinition[];
}

const FEATURE_TYPES: FeatureType[] = ["int", "float", "category"];

/** Label tampilan untuk fitur turunan yang tidak ada di daftar input UI. */
const ENGINEERED_LABELS: Record<string, string> = {
  TotalSF: "Total luas bangunan",
  HouseAge: "Usia bangunan",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFeature(value: unknown, index: number): FeatureDefinition {
  if (!isRecord(value)) {
    throw new Error(`Fitur ke-${index + 1} di features.json bukan objek.`);
  }

  const type = value.type;
  if (typeof value.name !== "string" || typeof value.label !== "string") {
    throw new Error(`Fitur ke-${index + 1} di features.json tidak punya name/label.`);
  }
  if (typeof type !== "string" || !FEATURE_TYPES.includes(type as FeatureType)) {
    throw new Error(`Fitur ${value.name} punya tipe yang tidak didukung.`);
  }
  if (value.default === undefined) {
    throw new Error(`Fitur ${value.name} tidak punya nilai default.`);
  }

  if (type === "category") {
    if (!Array.isArray(value.categories) || value.categories.length === 0) {
      throw new Error(`Fitur kategori ${value.name} tidak punya daftar categories.`);
    }
  } else if (typeof value.min !== "number" || typeof value.max !== "number") {
    throw new Error(`Fitur numerik ${value.name} tidak punya min/max.`);
  }

  return value as unknown as FeatureDefinition;
}

function readConfig(value: unknown): FeaturesConfig {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new Error("features.json tidak punya array features.");
  }
  if (value.features.length === 0) {
    throw new Error("features.json tidak berisi fitur.");
  }

  const features = value.features.map(readFeature);
  return {
    model_version: String(value.model_version ?? ""),
    target: String(value.target ?? ""),
    ref_year: Number(value.ref_year ?? 0),
    engineered_features: Array.isArray(value.engineered_features)
      ? value.engineered_features.map(String)
      : [],
    features,
  };
}

export const featuresConfig: FeaturesConfig = readConfig(featuresFile);

export function featureLabel(name: string, features: FeatureDefinition[]): string {
  return (
    features.find((feature) => feature.name === name)?.label ??
    ENGINEERED_LABELS[name] ??
    name
  );
}
