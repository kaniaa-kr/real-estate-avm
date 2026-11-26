/**
 * Pemetaan 25 kode lingkungan (Neighborhood) dari features.json ke nama area kota Ames, Iowa.
 * Berdasarkan dokumentasi resmi Dean De Cock (Ames Housing Dataset).
 */

export const NEIGHBORHOOD_NAMES: Record<string, string> = {
  Blmngtn: "Bloomington Heights",
  Blueste: "Bluestem",
  BrDale: "Briardale",
  BrkSide: "Brookside",
  ClearCr: "Clear Creek",
  CollgCr: "College Creek",
  Crawfor: "Crawford",
  Edwards: "Edwards",
  Gilbert: "Gilbert",
  IDOTRR: "Iowa DOT & Rail Road",
  MeadowV: "Meadow Village",
  Mitchel: "Mitchell",
  NAmes: "North Ames",
  NPkVill: "Northpark Villa",
  NWAmes: "Northwest Ames",
  NoRidge: "Northridge",
  NridgHt: "Northridge Heights",
  OldTown: "Old Town",
  SWISU: "South & West of ISU",
  Sawyer: "Sawyer",
  SawyerW: "Sawyer West",
  Somerst: "Somerset",
  StoneBr: "Stone Brook",
  Timber: "Timberland",
  Veenker: "Veenker",
};

/**
 * Mengambil nama ramah pengguna untuk kode area Ames.
 * Mengembalikan kode jika tidak ditemukan dalam pemetaan.
 */
export function getNeighborhoodName(code: string): string {
  return NEIGHBORHOOD_NAMES[code] ?? code;
}

export interface NeighborhoodOption {
  code: string;
  name: string;
}

/**
 * Daftar terstruktur untuk pilihan dropdown/carousel area.
 */
export const NEIGHBORHOOD_OPTIONS: NeighborhoodOption[] = Object.entries(
  NEIGHBORHOOD_NAMES,
).map(([code, name]) => ({
  code,
  name,
}));
