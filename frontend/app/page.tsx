import { HealthStatus } from "@/components/health-status";
import { ServerStatusProvider } from "@/components/server-status-provider";
import { ValuationForm } from "@/components/valuation-form";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { featuresConfig } from "@/lib/features";

export default function Home() {
  return (
    <ServerStatusProvider>
      <main className="app-shell">
        <header className="masthead">
          <div className="masthead-copy">
            <p className="wordmark">
              AVM <span>Ames</span>
            </p>
            <h1>Estimasi harga rumah dari karakteristik fisiknya.</h1>
            <p className="lede">
              Prototipe penilaian otomatis untuk agen dan investor properti. Isi
              data properti, lalu baca estimasi beserta rentang dan faktor
              penentunya.
            </p>
          </div>
          <HealthStatus />
        </header>

        <div className="disclaimer" role="note" aria-label="Disclaimer">
          <strong>Disclaimer</strong>
          <span>{DISCLAIMER_TEXT}</span>
        </div>

        <ValuationForm config={featuresConfig} />

        <footer className="page-footer">
          <p>
            Model {featuresConfig.model_version}.{" "}
            {featuresConfig.features.length} fitur input. Tahun acuan usia
            bangunan: {featuresConfig.ref_year}.
          </p>
          <p>Data: Ames Housing. Prototipe akademik, bukan penilaian resmi.</p>
        </footer>
      </main>
    </ServerStatusProvider>
  );
}
