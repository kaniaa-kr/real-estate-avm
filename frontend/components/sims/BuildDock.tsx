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
  { id: "structure", label: "LUAS & STRUKTUR", icon: "📐" },
  { id: "quality", label: "KUALITAS & USIA", icon: "✨" },
  { id: "location", label: "LOKASI", icon: "📍" },
  { id: "facilities", label: "FASILITAS", icon: "🚗" },
];

const SIDE_TILES: Array<{
  id: BuildDockTab;
  label: string;
  icon: string;
  side: "left" | "right";
}> = [
  { id: "structure", label: "UKURAN", icon: "📏", side: "left" },
  { id: "location", label: "LOKASI", icon: "🏙️", side: "left" },
  { id: "quality", label: "KUALITAS", icon: "💎", side: "right" },
  { id: "facilities", label: "FASILITAS", icon: "🚙", side: "right" },
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

  return (
    <section
      aria-label="Panel pengaturan bangunan (build mode)"
      className={`relative w-full ${className}`}
    >
      {/* Baris tab kategori — menempel di atas garis dock */}
      <div className="relative z-10 flex items-end justify-center px-1 sm:px-4 -mb-[2px]">
        <div
          role="tablist"
          aria-label="Kategori karakteristik rumah"
          className="flex items-end gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full px-1"
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
                {hasError && <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-ping" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dock biru langit */}
      <div className="sims-dock-bg w-full px-2 sm:px-4 py-2 sm:py-2.5 flex items-stretch gap-2 sm:gap-3">
        {/* Tombol kotak kiri */}
        <div className="hidden sm:flex flex-col justify-between gap-2 w-20 lg:w-24 shrink-0">
          {SIDE_TILES.filter((tile) => tile.side === "left").map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleTabChange(tile.id)}
              aria-pressed={activeTab === tile.id}
              className={`sims-side-tile flex-1 flex flex-col items-center justify-center gap-0.5 p-1 ${
                activeTab === tile.id ? "active" : ""
              }`}
            >
              <span className="text-base lg:text-lg" aria-hidden="true">
                {tile.icon}
              </span>
              <span className="text-[9px] lg:text-[10px] font-black tracking-wide uppercase">{tile.label}</span>
            </button>
          ))}
        </div>

        {/* Katalog kartu kontrol */}
        <div className="flex-1 min-w-0 flex items-stretch gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {activeTab === "structure" && (
            <div className="flex items-stretch gap-2.5 sm:gap-3 animate-fadeIn">
              <div className="w-[178px] sm:w-[200px] lg:w-[218px] shrink-0 flex">
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
              <div className="w-[178px] sm:w-[200px] lg:w-[218px] shrink-0 flex">
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
              <div className="w-[178px] sm:w-[200px] lg:w-[218px] shrink-0 flex">
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
              <div className="w-[160px] sm:w-[176px] lg:w-[190px] shrink-0 flex">
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
            <div className="flex items-stretch gap-2.5 sm:gap-3 animate-fadeIn">
              <div className="w-[280px] sm:w-[340px] shrink-0 flex">
                <ChoiceCard
                  name="KitchenQual"
                  label={fKitchenQual.label}
                  value={String(values.KitchenQual ?? fKitchenQual.default)}
                  options={KITCHEN_OPTIONS}
                  help={fKitchenQual.help}
                  error={fieldErrors.KitchenQual}
                  onChange={(val) => onChange("KitchenQual", val)}
                />
              </div>
              <div className="w-[178px] sm:w-[200px] lg:w-[218px] shrink-0 flex">
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
            </div>
          )}

          {activeTab === "location" && (
            <div className="w-[86vw] max-w-[540px] sm:w-[560px] lg:w-full lg:max-w-[680px] shrink-0 flex animate-fadeIn">
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
            <div className="flex items-stretch gap-2.5 sm:gap-3 animate-fadeIn">
              <div className="w-[178px] sm:w-[200px] lg:w-[218px] shrink-0 flex">
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
              <div className="w-[178px] sm:w-[200px] lg:w-[218px] shrink-0 flex">
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

        {/* Tombol kotak kanan */}
        <div className="hidden sm:flex flex-col justify-between gap-2 w-20 lg:w-24 shrink-0">
          {SIDE_TILES.filter((tile) => tile.side === "right").map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleTabChange(tile.id)}
              aria-pressed={activeTab === tile.id}
              className={`sims-side-tile flex-1 flex flex-col items-center justify-center gap-0.5 p-1 ${
                activeTab === tile.id ? "active" : ""
              }`}
            >
              <span className="text-base lg:text-lg" aria-hidden="true">
                {tile.icon}
              </span>
              <span className="text-[9px] lg:text-[10px] font-black tracking-wide uppercase">{tile.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BuildDock;
