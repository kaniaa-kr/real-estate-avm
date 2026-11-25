"use client";

import { useState, type FormEvent } from "react";

import { useServerStatus } from "@/components/server-status-provider";
import {
  ApiError,
  requestPrediction,
  type PredictResponse,
} from "@/lib/api";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import {
  featureLabel,
  type FeatureDefinition,
  type FeaturesConfig,
} from "@/lib/features";
import {
  initialValues,
  toPayload,
  validateAll,
  validateFeature,
  type FeatureValues,
  type FieldErrors,
} from "@/lib/validation";

type Submission =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string; detail?: string }
  | { status: "success"; result: PredictResponse };

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

function methodLabel(method: string): string {
  switch (method) {
    case "shap_tree":
      return "SHAP TreeExplainer";
    case "linear":
    case "linear_coef":
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
  result: PredictResponse;
  features: FeatureDefinition[];
}) {
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

      <div className="factors">
        <h3>Perkiraan pengaruh faktor</h3>
        {result.top_factors.length > 0 ? (
          <>
            {/* Daftar sederhana dulu; grafik top_factors dikerjakan Role 2
                di components/FactorChart.* dan akan menggantikan blok ini. */}
            <ul className="factor-list">
              {result.top_factors.map((factor) => (
                <li
                  key={factor.feature}
                  className={`factor-row factor-${factor.direction}`}
                >
                  <span className="factor-name">
                    {featureLabel(factor.feature, features)}
                  </span>
                  <span className="factor-value">
                    {SIGNED_USD.format(factor.impact_usd)}
                    <span className="factor-direction">
                      {factor.direction === "up" ? "naik" : "turun"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="factor-note">
              Nilai ini adalah aproksimasi per fitur dan tidak menjumlah persis
              ke selisih harga total.
            </p>
          </>
        ) : (
          <p className="empty-copy">
            Faktor penentu belum tersedia untuk estimasi ini.
          </p>
        )}
      </div>

      <p className="result-disclaimer">{DISCLAIMER_TEXT}</p>
    </div>
  );
}

export function ValuationForm({ config }: { config: FeaturesConfig }) {
  const features = config.features;
  const { phase } = useServerStatus();
  const serverReady = phase === "ready";

  const [values, setValues] = useState<FeatureValues>(() =>
    initialValues(features),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formMessage, setFormMessage] = useState("");
  const [submission, setSubmission] = useState<Submission>({ status: "idle" });

  const isSubmitting = submission.status === "submitting";

  function setFieldError(feature: FeatureDefinition, raw: string) {
    const message = validateFeature(feature, raw);
    setErrors((current) => {
      const next = { ...current };
      if (message) {
        next[feature.name] = message;
      } else {
        delete next[feature.name];
      }
      return next;
    });
  }

  function handleChange(feature: FeatureDefinition, raw: string) {
    setValues((current) => ({ ...current, [feature.name]: raw }));
    setFormMessage("");
    // Jangan berteriak saat pengguna baru mulai mengisi; validasi setelah
    // kolom disentuh atau setelah ada galat yang sedang tampil.
    if (touched[feature.name] || errors[feature.name]) {
      setFieldError(feature, raw);
    }
  }

  function handleBlur(feature: FeatureDefinition, raw: string) {
    setTouched((current) => ({ ...current, [feature.name]: true }));
    setFieldError(feature, raw);
  }

  function handleReset() {
    setValues(initialValues(features));
    setErrors({});
    setTouched({});
    setFormMessage("");
    setSubmission({ status: "idle" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !serverReady) {
      return;
    }

    const nextErrors = validateAll(features, values);
    const invalidCount = Object.keys(nextErrors).length;
    if (invalidCount > 0) {
      setErrors(nextErrors);
      setTouched(
        Object.fromEntries(features.map((feature) => [feature.name, true])),
      );
      setFormMessage(`Periksa ${invalidCount} kolom yang ditandai.`);
      const firstInvalid = features.find((feature) => nextErrors[feature.name]);
      if (firstInvalid) {
        document.getElementById(`feature-${firstInvalid.name}`)?.focus();
      }
      return;
    }

    setErrors({});
    setFormMessage("");
    setSubmission({ status: "submitting" });

    try {
      const result = await requestPrediction(toPayload(features, values));
      setSubmission({ status: "success", result });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmission({
          status: "error",
          message: error.message,
          detail: error.detail,
        });
      } else {
        setSubmission({
          status: "error",
          message: "Terjadi kesalahan tak terduga. Coba lagi.",
        });
      }
    }
  }

  return (
    <div className="workspace">
      <section className="panel form-panel" aria-labelledby="form-heading">
        <div className="panel-head">
          <h2 id="form-heading">Data properti</h2>
          <p>{features.length} fitur input</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-grid">
            {features.map((feature, index) => {
              const id = `feature-${feature.name}`;
              const helpId = `${id}-help`;
              const errorId = `${id}-error`;
              const error = errors[feature.name];
              const describedBy = error ? `${helpId} ${errorId}` : helpId;
              const value = values[feature.name] ?? "";

              return (
                <div
                  className={`field${error ? " field-invalid" : ""}`}
                  key={feature.name}
                >
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
                        value={value}
                        onChange={(event) =>
                          handleChange(feature, event.target.value)
                        }
                        onBlur={(event) =>
                          handleBlur(feature, event.target.value)
                        }
                        aria-describedby={describedBy}
                        aria-invalid={Boolean(error)}
                        disabled={isSubmitting}
                        required
                      >
                        <option value="" disabled>
                          Pilih {feature.label.toLowerCase()}
                        </option>
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
                        inputMode={
                          feature.type === "int" ? "numeric" : "decimal"
                        }
                        step={feature.type === "int" ? 1 : "any"}
                        min={feature.min}
                        max={feature.max}
                        value={value}
                        onChange={(event) =>
                          handleChange(feature, event.target.value)
                        }
                        onBlur={(event) =>
                          handleBlur(feature, event.target.value)
                        }
                        aria-describedby={describedBy}
                        aria-invalid={Boolean(error)}
                        disabled={isSubmitting}
                        required
                      />
                    )}
                    {feature.unit ? (
                      <span className="unit">{feature.unit}</span>
                    ) : null}
                  </div>

                  {error ? (
                    <p className="field-error" id={errorId}>
                      {error}
                    </p>
                  ) : null}
                  <p className="help" id={helpId}>
                    {feature.help}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="button-primary"
              disabled={isSubmitting || !serverReady}
            >
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

          {formMessage ? (
            <p className="form-error" role="alert">
              {formMessage}
            </p>
          ) : null}

          {!serverReady ? (
            <p className="form-hint">
              {phase === "loading"
                ? "Tombol aktif setelah server selesai memuat model."
                : 'Server belum merespons. Gunakan tombol "Coba lagi" pada status server di atas.'}
            </p>
          ) : null}
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
