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
  fieldErrors?: FieldErrors;
  className?: string;
}

const TABS: Array<{ id: BuildDockTab; label: string; icon: string }> = [
  { id: "structure", label: "Luas & Struktur", icon: "📐" },
  { id: "quality", label: "Kualitas & Usia", icon: "✨" },
  { id: "location", label: "Lokasi", icon: "📍" },
  { id: "facilities", label: "Fasilitas", icon: "🚗" },
];

const KITCHEN_OPTIONS = [
  { value: "Fa", label: "Cukup (Fa)", desc: "Standar fungsional" },
  { value: "TA", label: "Rata-rata (TA)", desc: "Granit klasik" },
  { value: "Gd", label: "Baik (Gd)", desc: "Modern & pulau bar" },
  { value: "Ex", label: "Istimewa (Ex)", desc: "Marmer chef premium" },
];

export function BuildDock({
  values,
  onChange,
  fieldErrors = {},
  className = "",
}: BuildDockProps) {
  const [activeTab, setActiveTab] = useState<BuildDockTab>("structure");

  // Lookup fitur dari config features.json
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

  // Hitung jumlah error per tab untuk indikator visual dot merah
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

  return (
    <section
      aria-label="Panel Pengaturan Bangunan (Build Mode)"
      className={`sims-glass-dock w-full rounded-t-2xl sm:rounded-t-3xl border-t border-cyan-400/30 p-2 sm:p-4 shadow-2xl ${className}`}
    >
      {/* Tab Header Selector */}
      <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const hasError = tabErrors[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`relative px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 select-none min-h-[44px] ${
                isActive
                  ? "sims-btn-shiny sims-btn-green text-slate-950 scale-105 shadow-[0_0_14px_rgba(0,214,108,0.5)]"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-cyan-900/30"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {hasError && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Cards */}
      <div className="mt-2 sm:mt-3">
        {/* Tab 1: LUAS & STRUKTUR */}
        {activeTab === "structure" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 animate-fadeIn">
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
        )}

        {/* Tab 2: KUALITAS & USIA */}
        {activeTab === "quality" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 animate-fadeIn">
            <ChoiceCard
              name="KitchenQual"
              label={fKitchenQual.label}
              value={String(values.KitchenQual ?? fKitchenQual.default)}
              options={KITCHEN_OPTIONS}
              help={fKitchenQual.help}
              error={fieldErrors.KitchenQual}
              onChange={(val) => onChange("KitchenQual", val)}
            />
            <SliderCard
              name="YearBuilt"
              label={fYearBuilt.label}
              value={Number(values.YearBuilt ?? fYearBuilt.default)}
              min={fYearBuilt.min ?? 1872}
              max={fYearBuilt.max ?? 2010}
              unit={fYearBuilt.unit}
              help={fYearBuilt.help}
              error={fieldErrors.YearBuilt}
              onChange={(val) => onChange("YearBuilt", String(val))}
            />
          </div>
        )}

        {/* Tab 3: LOKASI */}
        {activeTab === "location" && (
          <div className="animate-fadeIn">
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

        {/* Tab 4: FASILITAS */}
        {activeTab === "facilities" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 animate-fadeIn">
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
        )}
      </div>
    </section>
  );
}
