"use client";

import React, { useMemo, useState } from "react";

import { ChoiceCard } from "@/components/sims/cards/ChoiceCard";
import { SliderCard } from "@/components/sims/cards/SliderCard";
import { StepperCard } from "@/components/sims/cards/StepperCard";
import { featuresConfig } from "@/lib/features";
import { NEIGHBORHOOD_OPTIONS } from "@/lib/neighborhoods";
import { playClickSound } from "@/lib/sound";
import type { FeatureValues, FieldErrors } from "@/lib/validation";

export type BuildDockTab = "structure" | "quality" | "location" | "facilities";

export interface BuildDockProps {
  values: FeatureValues;
  onChange: (name: string, value: string) => void;
  onRandomize?: () => void;
  fieldErrors?: FieldErrors;
  className?: string;
}

const TABS: Array<{ id: BuildDockTab; label: string; icon: string }> = [
  { id: "structure", label: "LUAS & STRUKTUR", icon: "📐" },
  { id: "quality", label: "MATERIAL & TAHUN", icon: "✨" },
  { id: "location", label: "LOKASI", icon: "📍" },
  { id: "facilities", label: "FASILITAS", icon: "🚗" },
];

/** Label tampilan kualitas dapur; urutan opsi tetap diambil dari features.json. */
const KITCHEN_QUALITY_META: Record<string, { label: string; desc: string }> = {
  Po: { label: "Kurang (Po)", desc: "Perlu renovasi total" },
  Fa: { label: "Cukup (Fa)", desc: "Fungsional sederhana" },
  TA: { label: "Rata-rata (TA)", desc: "Standar hunian" },
  Gd: { label: "Baik (Gd)", desc: "Modern & rapi" },
  Ex: { label: "Istimewa (Ex)", desc: "Premium penuh" },
};

export function BuildDock({
  values,
  onChange,
  onRandomize,
  fieldErrors = {},
  className = "",
}: BuildDockProps) {
  const [activeTab, setActiveTab] = useState<BuildDockTab>("structure");

  const featMap = useMemo(() => {
    return new Map(featuresConfig.features.map((f) => [f.name, f]));
  }, []);

  const handleTabChange = (tabId: BuildDockTab) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      playClickSound();
    }
  };

  const getFeat = (name: string) => {
    return (
      featMap.get(name) ?? {
        name,
        label: name,
        type: "int" as const,
        min: 0,
        max: 100,
        unit: "",
        help: "",
        default: 0,
      }
    );
  };

  // Indikator titik merah per tab jika ada input tidak valid
  const tabErrors = useMemo(() => {
    const errorKeys = Object.keys(fieldErrors);
    return {
      structure: errorKeys.some((k) =>
        ["GrLivArea", "TotalBsmtSF", "LotArea", "FullBath"].includes(k),
      ),
      quality: errorKeys.some((k) => ["KitchenQual", "YearBuilt"].includes(k)),
      location: errorKeys.some((k) => k === "Neighborhood"),
      facilities: errorKeys.some((k) => ["GarageCars", "Fireplaces"].includes(k)),
    };
  }, [fieldErrors]);

  const fGrLivArea = getFeat("GrLivArea");
  const fTotalBsmtSF = getFeat("TotalBsmtSF");
  const fLotArea = getFeat("LotArea");
  const fFullBath = getFeat("FullBath");
  const fKitchenQual = getFeat("KitchenQual");
  const fYearBuilt = getFeat("YearBuilt");
  const fNeighborhood = getFeat("Neighborhood");
  const fGarageCars = getFeat("GarageCars");
  const fFireplaces = getFeat("Fireplaces");

  // Seluruh kategori dari features.json, dipertahankan urutannya (terendah → tertinggi).
  const kitchenOptions = (fKitchenQual.categories ?? []).map((code) => ({
    value: code,
    label: KITCHEN_QUALITY_META[code]?.label ?? code,
    desc: KITCHEN_QUALITY_META[code]?.desc ?? "",
  }));
  const kitchenOrder = (fKitchenQual.categories ?? []).join(" → ");

  const yearBuiltValue = Number(values.YearBuilt ?? fYearBuilt.default);
  const houseAge = Math.max(0, featuresConfig.ref_year - yearBuiltValue);

  return (
    <section
      aria-label="Panel pengaturan bangunan (build mode)"
      className={`relative w-full ${className}`}
    >
      {/* Baris tab kategori — menempel rata di garis putih atas dock */}
      <div className="relative z-10 flex w-full items-end gap-2 px-1 sm:px-4 -mb-[2.5px]">
        <div className="hidden sm:block sm:w-11 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
          <div
            role="tablist"
            aria-label="Kategori karakteristik rumah"
            className="flex min-w-max items-end justify-start gap-1 px-0.5 sm:justify-center sm:gap-1.5"
          >
            {TABS.map((tab, index) => {
              const isActive = tab.id === activeTab;
              const hasError = tabErrors[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`sims-tab ${index === 0 ? "event-tab" : ""} ${
                    isActive ? "active" : ""
                  } relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 min-h-[42px] text-[10px] sm:text-xs font-extrabold tracking-wide whitespace-nowrap`}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {hasError && (
                    <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {onRandomize ? (
          <button
            type="button"
            onClick={onRandomize}
            title="Acak Spesifikasi Rumah"
            aria-label="Acak Spesifikasi Rumah"
            className="sims-btn-round sims-btn-green shrink-0 w-10 h-10 sm:w-11 sm:h-11 text-lg"
          >
            <span aria-hidden="true">↺</span>
          </button>
        ) : (
          <div className="w-10 sm:w-11 shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* Dock biru langit */}
      <div className="sims-dock-bg w-full px-2 sm:px-4 py-2 sm:py-2.5">
        <div className="flex h-[168px] sm:h-[172px] lg:h-[176px] w-full items-stretch gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {activeTab === "structure" && (
            <div className="flex h-full w-full items-stretch gap-2.5 sm:gap-3 animate-fadeIn">
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[190px]">
                <SliderCard
                  name="GrLivArea"
                  label={fGrLivArea.label}
                  value={Number(values.GrLivArea ?? fGrLivArea.default)}
                  min={fGrLivArea.min ?? 334}
                  max={fGrLivArea.max ?? 5642}
                  unit={fGrLivArea.unit}
                  help={fGrLivArea.help}
                  error={fieldErrors.GrLivArea}
                  onChange={(val) => onChange("GrLivArea", String(val))}
                />
              </div>
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[190px]">
                <SliderCard
                  name="TotalBsmtSF"
                  label={fTotalBsmtSF.label}
                  value={Number(values.TotalBsmtSF ?? fTotalBsmtSF.default)}
                  min={fTotalBsmtSF.min ?? 0}
                  max={fTotalBsmtSF.max ?? 6110}
                  unit={fTotalBsmtSF.unit}
                  help={fTotalBsmtSF.help}
                  error={fieldErrors.TotalBsmtSF}
                  onChange={(val) => onChange("TotalBsmtSF", String(val))}
                />
              </div>
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[190px]">
                <SliderCard
                  name="LotArea"
                  label={fLotArea.label}
                  value={Number(values.LotArea ?? fLotArea.default)}
                  min={fLotArea.min ?? 1300}
                  max={fLotArea.max ?? 215245}
                  unit={fLotArea.unit}
                  help={fLotArea.help}
                  error={fieldErrors.LotArea}
                  onChange={(val) => onChange("LotArea", String(val))}
                />
              </div>
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[190px]">
                <StepperCard
                  name="FullBath"
                  label={fFullBath.label}
                  value={Number(values.FullBath ?? fFullBath.default)}
                  min={fFullBath.min ?? 0}
                  max={fFullBath.max ?? 3}
                  unit={fFullBath.unit}
                  help={fFullBath.help}
                  error={fieldErrors.FullBath}
                  onChange={(val) => onChange("FullBath", String(val))}
                />
              </div>
            </div>
          )}

          {activeTab === "quality" && (
            <div className="flex h-full w-full items-stretch gap-2.5 sm:gap-3 animate-fadeIn">
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-[1.6] sm:basis-0 sm:min-w-[340px]">
                <ChoiceCard
                  name="KitchenQual"
                  label={fKitchenQual.label}
                  value={String(values.KitchenQual ?? fKitchenQual.default)}
                  options={kitchenOptions}
                  help={`Urutan kualitas dari terendah ke tertinggi: ${kitchenOrder}.`}
                  error={fieldErrors.KitchenQual}
                  onChange={(val) => onChange("KitchenQual", val)}
                />
              </div>
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[210px]">
                <SliderCard
                  name="YearBuilt"
                  label={`${fYearBuilt.label} (Konstruksi)`}
                  value={yearBuiltValue}
                  min={fYearBuilt.min ?? 1872}
                  max={fYearBuilt.max ?? 2010}
                  unit={fYearBuilt.unit}
                  groupThousands={false}
                  help={`Usia bangunan: ${houseAge} tahun (${featuresConfig.ref_year}). Makin baru umumnya makin bernilai.`}
                  error={fieldErrors.YearBuilt}
                  onChange={(val) => onChange("YearBuilt", String(val))}
                />
              </div>
            </div>
          )}

          {activeTab === "location" && (
            <div className="flex h-full w-full animate-fadeIn">
              <ChoiceCard
                name="Neighborhood"
                label={fNeighborhood.label}
                value={String(values.Neighborhood ?? fNeighborhood.default)}
                options={NEIGHBORHOOD_OPTIONS.map((opt) => ({
                  value: opt.code,
                  label: opt.name,
                  badge: opt.code,
                }))}
                layout="scroll"
                help="Geser horizontal untuk memilih salah satu dari 25 kawasan di kota Ames, Iowa"
                error={fieldErrors.Neighborhood}
                onChange={(val) => onChange("Neighborhood", val)}
              />
            </div>
          )}

          {activeTab === "facilities" && (
            <div className="flex h-full w-full items-stretch gap-2.5 sm:gap-3 animate-fadeIn">
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[190px]">
                <StepperCard
                  name="GarageCars"
                  label={fGarageCars.label}
                  value={Number(values.GarageCars ?? fGarageCars.default)}
                  min={fGarageCars.min ?? 0}
                  max={fGarageCars.max ?? 4}
                  unit={fGarageCars.unit}
                  help={fGarageCars.help}
                  error={fieldErrors.GarageCars}
                  onChange={(val) => onChange("GarageCars", String(val))}
                />
              </div>
              <div className="flex w-full shrink-0 basis-full snap-center sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[190px]">
                <StepperCard
                  name="Fireplaces"
                  label={fFireplaces.label}
                  value={Number(values.Fireplaces ?? fFireplaces.default)}
                  min={fFireplaces.min ?? 0}
                  max={fFireplaces.max ?? 3}
                  unit={fFireplaces.unit}
                  help={fFireplaces.help}
                  error={fieldErrors.Fireplaces}
                  onChange={(val) => onChange("Fireplaces", String(val))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default BuildDock;