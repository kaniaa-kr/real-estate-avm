"use client";

import { useState, type FormEvent } from "react";

import { API_URL } from "@/lib/api";
import {
  featureLabel,
  type FeatureDefinition,
  type FeaturesConfig,
} from "@/lib/features";

interface PredictFactor {
  feature: string;
  impact_usd: number;
  direction: "up" | "down";
}

interface PredictResult {
  predicted_price: number;
  price_range: { low: number; high: number };
  top_factors: PredictFactor[];
  explanation_method: string;
  model_version: string;
  disclaimer: string;
}

type Submission =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string; detail?: string }
  | { status: "success"; result: PredictResult };

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SIGNED_USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

function defaultValues(features: FeatureDefinition[]): Record<string, string> {
  return Object.fromEntries(
    features.map((feature) => [feature.name, String(feature.default)]),
  );
}

function buildPayload(
  features: FeatureDefinition[],
  values: Record<string, string>,
): { payload: Record<string, number | string> } | { error: string } {
  const payload: Record<string, number | string> = {};

  for (const feature of features) {
    const raw = values[feature.name] ?? "";

    if (feature.type === "category") {
      if (!feature.categories?.includes(raw)) {
        return { error: `Pilih ${feature.label} dari daftar yang tersedia.` };
      }
      payload[feature.name] = raw;
      continue;
    }

    const numeric = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(numeric)) {
      return { error: `${feature.label} harus berupa angka.` };
    }
    if (feature.type === "int" && !Number.isInteger(numeric)) {
      return { error: `${feature.label} harus berupa bilangan bulat.` };
    }
    if (feature.min !== undefined && numeric < feature.min) {
      return { error: `${feature.label} minimal ${feature.min}.` };
    }
    if (feature.max !== undefined && numeric > feature.max) {
      return { error: `${feature.label} maksimal ${feature.max}.` };
    }

    payload[feature.name] = numeric;
  }

  return { payload };
}

async function readApiError(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (Array.isArray(body.detail)) {
      const first = body.detail[0] as { loc?: unknown[]; msg?: string } | undefined;
      if (first?.msg) {
        const field = Array.isArray(first.loc)
          ? first.loc.filter((part) => part !== "body").join(".")
          : "";
        return field ? `${field}: ${first.msg}` : first.msg;
      }
    }
    if (typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // Respons galat bukan JSON; pesan umum di bawah tetap dipakai.
  }
  return undefined;
}

function isPredictResult(value: unknown): value is PredictResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const result = value as Partial<PredictResult>;
  return (
    typeof result.predicted_price === "number" &&
    typeof result.price_range?.low === "number" &&
    typeof result.price_range?.high === "number" &&
    Array.isArray(result.top_factors)
  );
}

function methodLabel(method: string): string {
  switch (method) {
    case "shap_tree":
      return "SHAP TreeExplainer";
    case "linear":
      return "Kontribusi linear";
    case "ablation":
      return "Ablation";
    case "placeholder":
      return "Placeholder model stub";
    default:
      return method;
  }
}

function ResultView({
  result,
  features,
}: {
  result: PredictResult;
  features: FeatureDefinition[];
}) {
  const maxImpact = Math.max(
    ...result.top_factors.map((factor) => Math.abs(factor.impact_usd)),
    0,
  );

  return (
    <div>
      <p className="result-kicker">Estimasi harga jual</p>
      <p className="price">{USD.format(result.predicted_price)}</p>
      <p className="range">
        Rentang {USD.format(result.price_range.low)} sampai{" "}
        {USD.format(result.price_range.high)}
      </p>

      <div className="result-meta">
        <span>Model {result.model_version}</span>
        <span>Metode faktor: {methodLabel(result.explanation_method)}</span>
      </div>

      {result.top_factors.length > 0 ? (
        <div className="factors">
          <h3>Perkiraan pengaruh faktor</h3>
          <ul className="factor-list">
            {result.top_factors.map((factor) => {
              const isUp = factor.direction === "up";
              const width =
                maxImpact > 0
                  ? Math.max(
                      4,
                      Math.round((Math.abs(factor.impact_usd) / maxImpact) * 100),
                    )
                  : 4;

              return (
                <li
                  key={factor.feature}
                  className={`factor-row ${isUp ? "factor-up" : "factor-down"}`}
                >
                  <span className="factor-name">
                    {featureLabel(factor.feature, features)}
                  </span>
                  <span className="factor-value">
                    {SIGNED_USD.format(factor.impact_usd)}
                  </span>
                  <span className="factor-track" aria-hidden="true">
                    <span className="factor-bar" style={{ width: `${width}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="factor-note">
            Nilai ini adalah aproksimasi per fitur dan tidak menjumlah persis ke
            selisih harga total.
          </p>
        </div>
      ) : null}

      <p className="result-disclaimer">{result.disclaimer}</p>
    </div>
  );
}

export function ValuationForm({ config }: { config: FeaturesConfig }) {
  const features = config.features;
  const [values, setValues] = useState<Record<string, string>>(() =>
    defaultValues(features),
  );
  const [submission, setSubmission] = useState<Submission>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const built = buildPayload(features, values);
    if ("error" in built) {
      setSubmission({ status: "error", message: built.error });
      return;
    }

    setSubmission({ status: "submitting" });

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.payload),
      });

      if (!response.ok) {
        const detail = await readApiError(response);
        setSubmission({
          status: "error",
          message:
            response.status === 503
              ? "Model belum siap. Tunggu beberapa saat lalu coba lagi."
              : "Permintaan ditolak API. Periksa kembali nilai pada form.",
          detail,
        });
        return;
      }

      const body: unknown = await response.json();
      if (!isPredictResult(body)) {
        setSubmission({
          status: "error",
          message: "Respons API tidak sesuai kontrak yang diharapkan.",
        });
        return;
      }

      setSubmission({ status: "success", result: body });
    } catch {
      setSubmission({
        status: "error",
        message:
          "Tidak dapat menghubungi API. Pastikan layanan berjalan lalu coba lagi.",
      });
    }
  }

  function handleReset() {
    setValues(defaultValues(features));
    setSubmission({ status: "idle" });
  }

  const isSubmitting = submission.status === "submitting";

  return (
    <div className="workspace">
      <section className="panel form-panel" aria-labelledby="form-heading">
        <div className="panel-head">
          <h2 id="form-heading">Data properti</h2>
          <p>{features.length} fitur input</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            {features.map((feature, index) => {
              const id = `feature-${feature.name}`;
              const helpId = `${id}-help`;

              return (
                <div className="field" key={feature.name}>
                  <div className="field-head">
                    <label htmlFor={id}>{feature.label}</label>
                    <span className="field-no" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="control">
                    {feature.type === "category" ? (
                      <select
                        id={id}
                        name={feature.name}
                        value={values[feature.name]}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [feature.name]: event.target.value,
                          }))
                        }
                        aria-describedby={helpId}
                        required
                      >
                        {feature.categories?.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        name={feature.name}
                        type="number"
                        inputMode={feature.type === "int" ? "numeric" : "decimal"}
                        step={feature.type === "int" ? 1 : "any"}
                        min={feature.min}
                        max={feature.max}
                        value={values[feature.name]}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [feature.name]: event.target.value,
                          }))
                        }
                        aria-describedby={helpId}
                        required
                      />
                    )}
                    {feature.unit ? (
                      <span className="unit">{feature.unit}</span>
                    ) : null}
                  </div>

                  <p className="help" id={helpId}>
                    {feature.help}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="form-actions">
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? "Menghitung estimasi..." : "Hitung estimasi harga"}
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Kembalikan nilai awal
            </button>
          </div>
        </form>
      </section>

      <aside
        className="panel result-panel"
        aria-labelledby="result-heading"
        aria-live="polite"
        aria-busy={isSubmitting}
      >
        <div className="panel-head">
          <h2 id="result-heading">Hasil</h2>
          <p>USD</p>
        </div>

        {submission.status === "idle" ? (
          <div className="result-empty">
            <p className="result-kicker">Estimasi harga jual</p>
            <p className="empty-title">Belum ada estimasi</p>
            <p className="empty-copy">
              Isi data properti, lalu jalankan perhitungan. Harga, rentang, dan
              faktor penentu akan muncul di sini.
            </p>
          </div>
        ) : null}

        {submission.status === "submitting" ? (
          <div className="result-loading">
            <p className="result-kicker">Menghitung</p>
            <p className="empty-title">Model sedang membaca data properti.</p>
            <div className="loading-bar" aria-hidden="true" />
            <p className="empty-copy">
              Permintaan dikirim ke API. Cold start dapat memakan beberapa detik.
            </p>
          </div>
        ) : null}

        {submission.status === "error" ? (
          <div className="result-error" role="alert">
            <h3>Estimasi gagal</h3>
            <p>{submission.message}</p>
            {submission.detail ? (
              <p className="error-detail">{submission.detail}</p>
            ) : null}
          </div>
        ) : null}

        {submission.status === "success" ? (
          <ResultView result={submission.result} features={features} />
        ) : null}
      </aside>
    </div>
  );
}
