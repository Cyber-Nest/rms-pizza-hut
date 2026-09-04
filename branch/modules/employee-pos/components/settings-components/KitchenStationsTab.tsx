"use client";
import React, { useState } from "react";
import {
  KitchenSettings,
  StationConfig,
  StationId,
  DEFAULT_KITCHEN_SETTINGS,
} from "./settingsTypes";
import {
  ChefHat,
  Printer,
  Layers,
  SlidersHorizontal,
  Check,
  Edit2,
  Lock,
  Unlock,
  X,
  RotateCcw,
} from "lucide-react";

interface KitchenStationsTabProps {
  kitchenSettings: KitchenSettings;
  setKitchenSettings: React.Dispatch<React.SetStateAction<KitchenSettings>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}

// ── Preset Configs ──────────────────────────────────────────────
const PRESET_3_STATION: StationConfig[] = [
  {
    id: "make_table",
    label: "Make Station",
    isEnabled: true,
    handlesItemTypes: ["pizza"],
    nextStation: "cut_station",
    autoPrint: { pizza: false, wings: false },
  },
  {
    id: "cut_station",
    label: "Cut Station",
    isEnabled: true,
    handlesItemTypes: ["pizza"],
    nextStation: null,
    autoPrint: { pizza: true, wings: false },
  },
  {
    id: "wings_station",
    label: "Wings Station",
    isEnabled: true,
    handlesItemTypes: ["wings"],
    nextStation: null,
    autoPrint: { pizza: false, wings: true },
  },
];

const PRESET_2_STATION: StationConfig[] = [
  {
    id: "make_table",
    label: "Make Station",
    isEnabled: true,
    handlesItemTypes: ["pizza"],
    nextStation: null,
    autoPrint: { pizza: true, wings: false },
  },
  {
    id: "cut_station",
    label: "Cut Station",
    isEnabled: false,
    handlesItemTypes: ["pizza"],
    nextStation: null,
    autoPrint: { pizza: false, wings: false },
  },
  {
    id: "wings_station",
    label: "Wings Station",
    isEnabled: true,
    handlesItemTypes: ["wings"],
    nextStation: null,
    autoPrint: { pizza: false, wings: true },
  },
];

const PRESET_1_STATION: StationConfig[] = [
  {
    id: "make_table",
    label: "Make Station",
    isEnabled: true,
    handlesItemTypes: ["pizza", "wings"],
    nextStation: null,
    autoPrint: { pizza: true, wings: true },
  },
  {
    id: "cut_station",
    label: "Cut Station",
    isEnabled: false,
    handlesItemTypes: ["pizza"],
    nextStation: null,
    autoPrint: { pizza: false, wings: false },
  },
  {
    id: "wings_station",
    label: "Wings Station",
    isEnabled: false,
    handlesItemTypes: ["wings"],
    nextStation: null,
    autoPrint: { pizza: false, wings: false },
  },
];

const PRESETS = [
  {
    id: "3_station" as const,
    title: "3 Stations",
    subtitle: "Standard Setup",
    desc: "Make Station → Cut Station (Pizza) + Wings Station (Wings)",
    stations: PRESET_3_STATION,
  },
  {
    id: "2_station" as const,
    title: "2 Stations",
    subtitle: "No Cut Station",
    desc: "Make Station handles Pizza, Wings Station handles Wings",
    stations: PRESET_2_STATION,
  },
  {
    id: "1_station" as const,
    title: "1 Station",
    subtitle: "Combined",
    desc: "A single station handles both Pizza & Wings items",
    stations: PRESET_1_STATION,
  },
];

// Station accent colors
const STATION_COLORS: Record<
  StationId,
  { bg: string; border: string; dot: string; tag: string }
> = {
  make_table: {
    bg: "bg-orange-50/70",
    border: "border-orange-200/90",
    dot: "bg-orange-500",
    tag: "bg-orange-100/80 text-orange-800 border-orange-200",
  },
  cut_station: {
    bg: "bg-blue-50/70",
    border: "border-blue-200/90",
    dot: "bg-blue-500",
    tag: "bg-blue-100/80 text-blue-800 border-blue-200",
  },
  wings_station: {
    bg: "bg-amber-50/70",
    border: "border-amber-200/90",
    dot: "bg-amber-500",
    tag: "bg-amber-100/80 text-amber-800 border-amber-200",
  },
};

export default function KitchenStationsTab({
  kitchenSettings,
  setKitchenSettings,
  onSubmit,
  saving,
}: KitchenStationsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [initialSettingsSnapshot, setInitialSettingsSnapshot] =
    useState<KitchenSettings | null>(null);

  // Enable edit mode
  const handleStartEdit = () => {
    setInitialSettingsSnapshot(JSON.parse(JSON.stringify(kitchenSettings)));
    setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (initialSettingsSnapshot) {
      setKitchenSettings(initialSettingsSnapshot);
    }
    setIsEditing(false);
  };

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    onSubmit(e);
    setIsEditing(false);
  };

  // ── Apply a preset ──
  const applyPreset = (presetId: "3_station" | "2_station" | "1_station") => {
    if (!isEditing) return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setKitchenSettings({
      presetMode: presetId,
      stations: JSON.parse(JSON.stringify(preset.stations)),
    });
  };

  // ── Toggle station isEnabled ──
  const handleToggleEnabled = (id: StationId, value: boolean) => {
    if (!isEditing) return;
    setKitchenSettings((prev) => ({
      ...prev,
      presetMode: "custom",
      stations: prev.stations.map((s) =>
        s.id === id ? { ...s, isEnabled: value } : s,
      ),
    }));
  };

  // ── Toggle item type handled ──
  const handleToggleItemType = (id: StationId, type: "pizza" | "wings") => {
    if (!isEditing) return;
    setKitchenSettings((prev) => ({
      ...prev,
      presetMode: "custom",
      stations: prev.stations.map((s) => {
        if (s.id !== id) return s;
        const has = s.handlesItemTypes.includes(type);
        return {
          ...s,
          handlesItemTypes: has
            ? s.handlesItemTypes.filter((t) => t !== type)
            : [...s.handlesItemTypes, type],
        };
      }),
    }));
  };

  // ── Change next station ──
  const handleNextStation = (id: StationId, value: string) => {
    if (!isEditing) return;
    setKitchenSettings((prev) => ({
      ...prev,
      presetMode: "custom",
      stations: prev.stations.map((s) =>
        s.id === id ? { ...s, nextStation: value || null } : s,
      ),
    }));
  };

  // ── Toggle auto-print ──
  const handleToggleAutoPrint = (id: StationId, type: "pizza" | "wings") => {
    if (!isEditing) return;
    setKitchenSettings((prev) => ({
      ...prev,
      presetMode: "custom",
      stations: prev.stations.map((s) =>
        s.id === id
          ? { ...s, autoPrint: { ...s.autoPrint, [type]: !s.autoPrint[type] } }
          : s,
      ),
    }));
  };

  const stations =
    kitchenSettings.stations || DEFAULT_KITCHEN_SETTINGS.stations;

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-6 select-none animate-fade-in"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-primary flex items-center justify-center shadow-xs flex-shrink-0">
              <ChefHat size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-900 text-neutral-900 tracking-tight flex flex-wrap items-center gap-2">
                Kitchen Station &amp; Printing Setup
              </h2>
              <p className="text-[11.5px] text-neutral-500 font-500 mt-0.5">
                Configure station routing, item assignments, and auto-print
                triggers per branch.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {kitchenSettings.presetMode === "custom" && (
            <span className="text-[10.5px] px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-800 uppercase tracking-wider whitespace-nowrap shrink-0">
              Custom Overrides
            </span>
          )}

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover font-800 text-[12px] shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Edit2 size={14} />
              <span>Edit Settings</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[11.5px] font-800 animate-pulse whitespace-nowrap">
              <Unlock size={13} className="text-amber-600" />
              <span>Editing Unlocked</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Section A: Presets ── */}
      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-neutral-600">
          <Layers size={13} className="text-neutral-400" />
          Quick Configuration Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PRESETS.map((preset) => {
            const isActive = kitchenSettings.presetMode === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!isEditing}
                onClick={() => applyPreset(preset.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 space-y-2 relative overflow-hidden ${
                  !isEditing
                    ? "cursor-not-allowed opacity-90"
                    : "cursor-pointer"
                } ${
                  isActive
                    ? "bg-orange-50/90 border-brand-primary ring-2 ring-brand-primary/20 shadow-sm"
                    : "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className={`text-[13px] font-900 block ${isActive ? "text-brand-primary" : "text-neutral-850"}`}
                    >
                      {preset.title}
                    </span>
                    <span
                      className={`text-[10.5px] font-700 ${isActive ? "text-brand-primary/70" : "text-neutral-500"}`}
                    >
                      {preset.subtitle}
                    </span>
                  </div>
                  {isActive && (
                    <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 font-500 leading-snug">
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section B: Per-Station Cards ── */}
      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-neutral-600">
          <SlidersHorizontal size={13} className="text-neutral-400" />
          Station Details &amp; Custom Overrides
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => {
            const colors =
              STATION_COLORS[station.id] || STATION_COLORS.make_table;
            const isEnabled = station.isEnabled;
            const handlesPizza = station.handlesItemTypes.includes("pizza");
            const handlesWings = station.handlesItemTypes.includes("wings");

            return (
              <div
                key={station.id}
                className={`rounded-2xl border p-4 flex flex-col gap-4 transition-all duration-200 shadow-2xs ${
                  isEnabled
                    ? `${colors.bg} ${colors.border}`
                    : "bg-neutral-50/80 border-neutral-200 opacity-60"
                } ${!isEditing ? "pointer-events-none select-none" : ""}`}
              >
                {/* ─ Station header: name + enable toggle ─ */}
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${isEnabled ? colors.dot : "bg-neutral-300"}`}
                    />
                    <span className="font-900 text-[14px] text-neutral-900 truncate">
                      {station.label}
                    </span>
                    <span
                      className={`text-[9.5px] font-800 uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${colors.tag}`}
                    >
                      {station.id.replace("_", " ")}
                    </span>
                  </div>

                  {/* Enable / Disable toggle */}
                  <label
                    className={`relative inline-flex items-center shrink-0 ${isEditing ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={!isEditing}
                      onChange={(e) =>
                        handleToggleEnabled(station.id, e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-neutral-250 rounded-full peer peer-checked:bg-brand-primary after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
                  </label>
                </div>

                {/* ─ Handles Item Types ─ */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-800 uppercase tracking-wider text-neutral-500">
                    HANDLES:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-750 transition-all flex-1 min-w-[100px] justify-center ${
                        isEditing ? "cursor-pointer" : "cursor-not-allowed"
                      } ${
                        handlesPizza
                          ? "bg-orange-100/90 border-brand-primary text-brand-primary shadow-xs"
                          : "bg-white border-neutral-200 text-neutral-450"
                      } ${!isEnabled ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={handlesPizza}
                        disabled={!isEnabled || !isEditing}
                        onChange={() =>
                          handleToggleItemType(station.id, "pizza")
                        }
                        className="sr-only"
                      />
                      <span>🍕 Pizza</span>
                      {handlesPizza && <Check size={11} strokeWidth={3} className="shrink-0" />}
                    </label>

                    <label
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-750 transition-all flex-1 min-w-[100px] justify-center ${
                        isEditing ? "cursor-pointer" : "cursor-not-allowed"
                      } ${
                        handlesWings
                          ? "bg-amber-100/90 border-amber-500 text-amber-800 shadow-xs"
                          : "bg-white border-neutral-200 text-neutral-450"
                      } ${!isEnabled ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={handlesWings}
                        disabled={!isEnabled || !isEditing}
                        onChange={() =>
                          handleToggleItemType(station.id, "wings")
                        }
                        className="sr-only"
                      />
                      <span>🍗 Wings</span>
                      {handlesWings && <Check size={11} strokeWidth={3} className="shrink-0" />}
                    </label>
                  </div>
                </div>

                {/* ─ Next Station Flow (only for make_table) ─ */}
                {station.id === "make_table" && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-800 uppercase tracking-wider text-neutral-500">
                      PIZZA FLOW — NEXT STATION:
                    </p>
                    <select
                      value={station.nextStation || ""}
                      disabled={!isEnabled || !isEditing}
                      onChange={(e) =>
                        handleNextStation(station.id, e.target.value)
                      }
                      className="w-full text-[11.5px] font-750 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none focus:border-brand-primary disabled:opacity-50 shadow-xs truncate"
                    >
                      <option value="cut_station">
                        → Cut Station (3-station flow)
                      </option>
                      <option value="">None — Complete at Make Station</option>
                    </select>
                  </div>
                )}

                {/* ─ Auto-Print ─ */}
                <div className="border-t border-neutral-200/80 pt-3.5 space-y-2">
                  <p className="text-[10px] font-800 uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <Printer size={12} className="text-brand-primary shrink-0" />
                    AUTO-PRINT WHEN COMPLETED:
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <label
                      className={`flex items-center gap-2.5 text-[12px] font-600 select-none ${
                        isEditing ? "cursor-pointer" : "cursor-not-allowed"
                      } ${!isEnabled ? "opacity-50" : "text-neutral-750"}`}
                    >
                      <span
                        className={`w-4.5 h-4.5 shrink-0 rounded-md border flex items-center justify-center transition-all ${
                          station.autoPrint.pizza
                            ? "bg-brand-primary border-brand-primary shadow-xs"
                            : "bg-white border-neutral-300"
                        }`}
                      >
                        {station.autoPrint.pizza && (
                          <Check
                            size={10}
                            strokeWidth={3}
                            className="text-white"
                          />
                        )}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={station.autoPrint.pizza}
                        disabled={!isEnabled || !isEditing}
                        onChange={() =>
                          handleToggleAutoPrint(station.id, "pizza")
                        }
                      />
                      <span className="truncate">Print Pizza items</span>
                    </label>

                    <label
                      className={`flex items-center gap-2.5 text-[12px] font-600 select-none ${
                        isEditing ? "cursor-pointer" : "cursor-not-allowed"
                      } ${!isEnabled ? "opacity-50" : "text-neutral-750"}`}
                    >
                      <span
                        className={`w-4.5 h-4.5 shrink-0 rounded-md border flex items-center justify-center transition-all ${
                          station.autoPrint.wings
                            ? "bg-brand-primary border-brand-primary shadow-xs"
                            : "bg-white border-neutral-300"
                        }`}
                      >
                        {station.autoPrint.wings && (
                          <Check
                            size={10}
                            strokeWidth={3}
                            className="text-white"
                          />
                        )}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={station.autoPrint.wings}
                        disabled={!isEnabled || !isEditing}
                        onChange={() =>
                          handleToggleAutoPrint(station.id, "wings")
                        }
                      />
                      <span className="truncate">Print Wings / Sides items</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200">
        <div className="w-full sm:w-auto">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-[11.5px] font-800 uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              Cancel Edits
            </button>
          )}
        </div>

        <div className="w-full sm:w-auto">
          {isEditing ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-[11.5px] font-800 uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-2 active:scale-95"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Printer size={14} />
                  Save Kitchen Settings
                </>
              )}
            </button>
          ) : (
            <></>
          )}
        </div>
      </div>
    </form>
  );
}
