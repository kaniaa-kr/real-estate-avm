import type { FeatureValues } from "@/lib/validation";

/**
 * Spesifikasi Preset Rumah Ames untuk AVM.
 * Seluruh preset diverifikasi valid terhadap public/features.json.
 */
export interface Preset {
  id: string;
  name: string;
  badge: string;
  description: string;
  values: FeatureValues;
}

export const PRESETS: Preset[] = [
  {
    id: "starter",
    name: "Rumah Pemula",
    badge: "Terjangkau",
    description: "Hunian mungil dan praktis untuk pembeli pertama atau keluarga muda.",
    values: {
      OverallQual: "5",
      GrLivArea: "1050",
      TotalBsmtSF: "750",
      YearBuilt: "1965",
      Neighborhood: "OldTown",
      GarageCars: "1",
      FullBath: "1",
      LotArea: "6000",
      Fireplaces: "0",
      KitchenQual: "TA",
    },
  },
  {
    id: "suburban",
    name: "Keluarga Suburb",
    badge: "Populer",
    description: "Rumah keluarga modern 2 lantai di lingkungan asri dan nyaman.",
    values: {
      OverallQual: "7",
      GrLivArea: "1850",
      TotalBsmtSF: "1150",
      YearBuilt: "2004",
      Neighborhood: "CollgCr",
      GarageCars: "2",
      FullBath: "2",
      LotArea: "9800",
      Fireplaces: "1",
      KitchenQual: "Gd",
    },
  },
  {
    id: "luxury",
    name: "Vila Mewah",
    badge: "Premium",
    description: "Hunian eksekutif luas dengan arsitektur elegan dan material istimewa.",
    values: {
      OverallQual: "9",
      GrLivArea: "2850",
      TotalBsmtSF: "1750",
      YearBuilt: "2008",
      Neighborhood: "NridgHt",
      GarageCars: "3",
      FullBath: "3",
      LotArea: "14500",
      Fireplaces: "2",
      KitchenQual: "Ex",
    },
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
