import { HealthStatus } from "@/components/health-status";
import { ValuationForm } from "@/components/valuation-form";
import { featuresConfig } from "@/lib/features";

export default function Home() {
  return (
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

      <div className="disclaimer" role="note">
        <strong>Disclaimer</strong>
        <span>
          Estimasi akademik berbasis data pasar Ames, Iowa (2006–2010). Tidak
          mencerminkan harga pasar saat ini.
        </span>
      </div>

      <ValuationForm config={featuresConfig} />

      <footer className="page-footer">
        <p>
          Model {featuresConfig.model_version}. {featuresConfig.features.length}{" "}
          fitur input. Tahun acuan usia bangunan: {featuresConfig.ref_year}.
        </p>
        <p>Data: Ames Housing. Prototipe akademik, bukan penilaian resmi.</p>
      </footer>
    </main>
  );
}
