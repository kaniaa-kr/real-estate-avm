import * as React from "react";

export type Direction = "up" | "down";
export interface TopFactor {
  feature: string;
  impact_usd: number;
  direction: Direction;
}
export interface FactorChartProps {
  factors: TopFactor[];
  /** Pemetaan nama kolom -> label UI, mis. dari public/features.json. Label manual untuk fitur rekayasa sudah tersedia. */
  labels?: Record<string, string>;
  maxItems?: number;
}

const ENGINEERED_LABELS: Record<string, string> = {
  TotalSF: "Total luas bangunan + basement",
  HouseAge: "Usia rumah",
};
const COLOR_UP = "#008300"; // hijau
const COLOR_DOWN = "#eb6834"; // jingga
const usd = (v: number) =>
  `${v < 0 ? "−" : "+"}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;

/** Batang horizontal berpusat di nol: kanan (hijau, ▲) menaikkan harga, kiri (jingga, ▼) menurunkan. Tanpa dependensi. */
export default function FactorChart({ factors, labels = {}, maxItems = 5 }: FactorChartProps) {
  const rows = [...factors]
    .sort((a, b) => Math.abs(b.impact_usd) - Math.abs(a.impact_usd))
    .slice(0, maxItems);
  if (rows.length === 0) return null;
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.impact_usd)), 1);
  const label = (f: string) => labels[f] ?? ENGINEERED_LABELS[f] ?? f;

  return (
    <figure style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#0b0b0b" }}>
      <figcaption style={{ fontWeight: 600, marginBottom: 2 }}>Faktor penentu harga</figcaption>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#52514e" }}>
        Perkiraan pengaruh tiap fitur terhadap taksiran ini, dalam USD.
      </p>
      <div role="list" aria-label="Faktor penentu harga">
        {rows.map((r) => {
          const up = r.direction === "up";
          const pct = (Math.abs(r.impact_usd) / maxAbs) * 100;
          return (
            <div
              key={r.feature}
              role="listitem"
              aria-label={`${label(r.feature)}: ${up ? "menaikkan" : "menurunkan"} harga ${usd(r.impact_usd)}`}
              style={{ display: "grid", gridTemplateColumns: "minmax(110px,32%) 1fr", alignItems: "center", gap: 10, margin: "8px 0" }}
            >
              <span style={{ fontSize: 14, textAlign: "right" }}>{label(r.feature)}</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", height: 26 }}>
                {/* sisi kiri = turun, sisi kanan = naik; garis nol di tengah */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", borderRight: "2px solid #8a8984", height: "100%" }}>
                  {!up && (
                    <>
                      <span style={{ fontSize: 12, marginRight: 6, whiteSpace: "nowrap" }}>▼ {usd(-Math.abs(r.impact_usd))}</span>
                      <div style={{ width: `${pct}%`, height: 16, background: COLOR_DOWN, borderRadius: "4px 0 0 4px" }} />
                    </>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
                  {up && (
                    <>
                      <div style={{ width: `${pct}%`, height: 16, background: COLOR_UP, borderRadius: "0 4px 4px 0" }} />
                      <span style={{ fontSize: 12, marginLeft: 6, whiteSpace: "nowrap" }}>▲ {usd(Math.abs(r.impact_usd))}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#52514e" }}>
        <span style={{ color: COLOR_DOWN }}>■</span> menurunkan harga · <span style={{ color: COLOR_UP }}>■</span> menaikkan harga
      </p>
    </figure>
  );
}
