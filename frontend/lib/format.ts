/**
 * Utilitas pemformat angka, mata uang, dan satuan untuk AVM.
 * Mengikuti spesifikasi Sims UI ($ bukan §, format US locale).
 */

/**
 * Format angka ke USD standar bulat (contoh: $215,000 atau -$15,000).
 */
export function formatUSD(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const rounded = Math.round(amount);
  const prefix = rounded < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(rounded).toLocaleString("en-US")}`;
}

/**
 * Format angka ke USD singkat/kompak (contoh: $215K, $1.2M, $950).
 */
export function formatUSDCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-$" : "$";

  if (abs >= 1_000_000) {
    const millions = (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2);
    return `${sign}${parseFloat(millions)}M`;
  }
  if (abs >= 1_000) {
    const thousands = (abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1);
    return `${sign}${parseFloat(thousands)}K`;
  }
  return `${sign}${Math.round(abs)}`;
}

/**
 * Format selisih harga dengan tanda eksplisit +/- (contoh: +$12,500 atau -$4,500).
 */
export function formatUSDSigned(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const rounded = Math.round(amount);
  if (rounded === 0) return "$0";
  const sign = rounded > 0 ? "+$" : "-$";
  return `${sign}${Math.abs(rounded).toLocaleString("en-US")}`;
}

/**
 * Format luas dalam satuan square feet (contoh: 1,500 sq ft).
 */
export function formatSqFt(sqft: number): string {
  if (!Number.isFinite(sqft)) return "—";
  return `${Math.round(sqft).toLocaleString("en-US")} sq ft`;
}

/**
 * Format harga per square feet (contoh: $143/sq ft).
 */
export function formatPricePerSqFt(price: number, sqft: number): string {
  if (!Number.isFinite(price) || !Number.isFinite(sqft) || sqft <= 0) return "—";
  const perSqFt = Math.round(price / sqft);
  return `${formatUSD(perSqFt)}/sq ft`;
}

/**
 * Format bilangan standar dengan pemisah ribuan (contoh: 1,500).
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Format bilangan bulat tanpa pemisah ribuan opsional.
 * Dipakai untuk tahun (contoh: 2000, bukan 2,000) dan batas slider.
 */
export function formatInteger(value: number, groupThousands = true): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return groupThousands ? rounded.toLocaleString("en-US") : String(rounded);
}
