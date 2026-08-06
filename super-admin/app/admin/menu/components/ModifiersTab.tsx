import React, { useState } from "react";
import axios from "axios";
import {
  Layers,
  Check,
  Trash2,
  Edit,
  Trash,
  Image as ImageIcon,
  Loader2,
  Plus,
  SlidersHorizontal,
  Settings2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ModifierGroup, ModifierOption } from "../types";
import { API_URL, compressImage, getAuthConfig } from "../utils";

interface ModifiersTabProps {
  modifiers: ModifierGroup[];
  fetchModifiers: () => void;
  showToast: (text: string, type?: "success" | "error") => void;
}

export default function ModifiersTab({
  modifiers,
  fetchModifiers,
  showToast,
}: ModifiersTabProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingOptionIdx, setUploadingOptionIdx] = useState<number | null>(
    null,
  );
  const [expandedOptionIdx, setExpandedOptionIdx] = useState<number | null>(
    null,
  );
  const [expandedSizePricingIdx, setExpandedSizePricingIdx] = useState<number | null>(
    null,
  );
  const [editMod, setEditMod] = useState<ModifierGroup | null>(null);

  const SIZE_PRESETS = [
    { code: "personal", label: '6" Personal' },
    { code: "small", label: '9" Small' },
    { code: "medium", label: '12" Medium' },
    { code: "large", label: '14" Large' },
    { code: "xl", label: 'XL Panormous' },
  ];

  const [modForm, setModForm] = useState<{
    name: string;
    required: boolean;
    minSelection: number;
    maxSelection: number;
    displayType: "radio" | "checkbox" | "card";
    options: ModifierOption[];
  }>({
    name: "",
    required: false,
    minSelection: 0,
    maxSelection: 1,
    displayType: "radio",
    options: [
      { name: "", price: 0, isDefault: false, image: "", pricesPerSize: [], availableForSizes: [], modifierGroups: [] },
    ],
  });

  const handleOptionImageUpload = async (
    file: File | undefined,
    index: number,
  ) => {
    if (!file) return;

    const oldImage = modForm.options[index].image;
    setUploadingOptionIdx(index);

    try {
      const compressedFile = await compressImage(file, 800, 800, 0.8);

      if (compressedFile.size > 5 * 1024 * 1024) {
        showToast("File size too large. Max limit is 5MB.", "error");
        setUploadingOptionIdx(null);
        return;
      }

      const formData = new FormData();
      formData.append("image", compressedFile);

      const res = await axios.post(`${API_URL}/upload`, formData, {
        ...getAuthConfig(),
        headers: {
          ...getAuthConfig().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      if (res.data.success) {
        handleModOptionChange(index, "image", res.data.url);
        showToast(
          `Image uploaded for: ${modForm.options[index].name || "Option"}`,
        );

        if (oldImage) {
          try {
            await axios.post(`${API_URL}/upload/delete`, { url: oldImage }, getAuthConfig());
          } catch (delErr) {
            console.error("Failed to delete old option image:", delErr);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Option image upload failed.",
        "error",
      );
    } finally {
      setUploadingOptionIdx(null);
    }
  };

  const handleRemoveOptionImage = async (index: number) => {
    const url = modForm.options[index].image;
    if (!url) return;
    try {
      handleModOptionChange(index, "image", "");
      showToast("Option image removed locally.");
      await axios.post(`${API_URL}/upload/delete`, { url }, getAuthConfig());
      showToast("Option image deleted!");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete option image.", "error");
    }
  };

  const startEditModifier = (group: ModifierGroup) => {
    setEditMod(group);
    setModForm({
      name: group.name,
      required: group.required,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      displayType: group.displayType,
      options: group.options.map((o) => ({
        name: o.name,
        price: o.price,
        isDefault: o.isDefault,
        image: o.image || "",
        pricesPerSize: o.pricesPerSize || [],
        availableForSizes: o.availableForSizes || [],
        modifierGroups:
          o.modifierGroups?.map((g: any) =>
            typeof g === "string" ? g : g.id || g._id,
          ) || [],
      })),
    });
  };

  const cancelEditModifier = () => {
    setEditMod(null);
    setModForm({
      name: "",
      required: false,
      minSelection: 0,
      maxSelection: 1,
      displayType: "radio",
      options: [
        { name: "", price: 0, isDefault: false, image: "", availableForSizes: [], modifierGroups: [] },
      ],
    });
    setExpandedOptionIdx(null);
  };

  const handleAddModOption = () => {
    setModForm({
      ...modForm,
      options: [
        ...modForm.options,
        { name: "", price: 0, isDefault: false, image: "", availableForSizes: [], modifierGroups: [] },
      ],
    });
  };

  const handleRemoveModOption = async (index: number) => {
    if (modForm.options.length <= 1) return;
    const url = modForm.options[index].image;
    const newOptions = modForm.options.filter((_, i) => i !== index);
    setModForm({ ...modForm, options: newOptions });
    if (url) {
      try {
        await axios.post(`${API_URL}/upload/delete`, { url }, getAuthConfig());
      } catch (err) {
        console.error("Failed to delete option image:", err);
      }
    }
  };

  const handleModOptionChange = (
    index: number,
    field: keyof ModifierOption,
    value: any,
  ) => {
    const newOptions = modForm.options.map((opt, i) => {
      if (i !== index) return opt;
      return { ...opt, [field]: value };
    });

    if (
      field === "isDefault" &&
      value === true &&
      modForm.displayType === "radio"
    ) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isDefault = false;
      });
    }

    setModForm({ ...modForm, options: newOptions });
  };

  const handleModSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modForm.name) {
      showToast("Modifier Group name is required", "error");
      return;
    }

    const filteredOptions = modForm.options.filter((o) => o.name.trim() !== "");
    if (filteredOptions.length === 0) {
      showToast("Add at least one option", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...modForm,
        options: filteredOptions,
      };
      if (editMod) {
        const id = editMod.id || editMod._id;
        const res = await axios.put(`${API_URL}/modifiers/${id}`, payload, getAuthConfig());
        if (res.data.success) {
          showToast("Modifier Group updated!");
          cancelEditModifier();
          fetchModifiers();
        }
      } else {
        const res = await axios.post(`${API_URL}/modifiers`, payload, getAuthConfig());
        if (res.data.success) {
          showToast("Modifier Group created!");
          setModForm({
            name: "",
            required: false,
            minSelection: 0,
            maxSelection: 1,
            displayType: "radio",
            options: [{ name: "", price: 0, isDefault: false, image: "" }],
          });
          fetchModifiers();
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Error saving modifier group",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteModifier = async (id: string) => {
    const modToDelete = modifiers.find((m) => m.id === id || m._id === id);
    try {
      const res = await axios.delete(`${API_URL}/modifiers/${id}`, getAuthConfig());
      if (res.data.success) {
        showToast("Modifier group deleted!");
        if (editMod && (editMod.id === id || editMod._id === id))
          cancelEditModifier();
        fetchModifiers();

        if (modToDelete?.options) {
          for (const opt of modToDelete.options) {
            if (opt.image) {
              try {
                await axios.post(`${API_URL}/upload/delete`, {
                  url: opt.image,
                }, getAuthConfig());
              } catch (delErr) {
                console.error(
                  "Failed to delete modifier option image:",
                  delErr,
                );
              }
            }
          }
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Error deleting modifier group",
        "error",
      );
    }
  };

  const handleDeleteModifier = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this modifier group?</p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeDeleteModifier(id);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Modifier Group
          </button>
        </div>
      </div>
    ), { duration: 5000, position: "top-center" });
  };

  const isModifierButtonDisabled =
    loading ||
    uploadingOptionIdx !== null ||
    !modForm.name.trim() ||
    modForm.options.length === 0 ||
    modForm.options.some((opt) => !opt.name.trim());

  return (
    <>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4 h-fit">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-brand-primary" />
            <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
              {editMod ? "Edit Modifier Group" : "Add Modifier Group"}
            </h3>
          </div>
          {editMod && (
            <button
              onClick={cancelEditModifier}
              className="text-[9px] font-700 text-neutral-400 hover:text-neutral-600 uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
        <form onSubmit={handleModSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Select Soft Drink"
              value={modForm.name}
              onChange={(e) => setModForm({ ...modForm, name: e.target.value })}
              className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                Display UI
              </label>
              <select
                value={modForm.displayType}
                onChange={(e) =>
                  setModForm({
                    ...modForm,
                    displayType: e.target.value as any,
                  })
                }
                className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-2.5 py-2.5 text-[11px] focus:outline-none"
              >
                <option value="radio">Radio Button</option>
                <option value="checkbox">Checkbox</option>
                {/* <option value="card">Cards Grid</option> */}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-[10px] font-600 text-neutral-700 cursor-pointer h-10 select-none">
                <input
                  type="checkbox"
                  checked={modForm.required}
                  onChange={(e) =>
                    setModForm({
                      ...modForm,
                      required: e.target.checked,
                      minSelection: e.target.checked ? 1 : 0,
                    })
                  }
                  className="rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
                />
                Is Mandatory?
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                Min Selection
              </label>
              <input
                type="number"
                min={0}
                value={modForm.minSelection}
                onChange={(e) =>
                  setModForm({
                    ...modForm,
                    minSelection: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider mb-1.5">
                Max Selection
              </label>
              <input
                type="number"
                min={1}
                value={modForm.maxSelection}
                onChange={(e) =>
                  setModForm({
                    ...modForm,
                    maxSelection: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl px-3 py-2.5 text-[11px] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <label className="block text-[9px] font-700 text-neutral-400 uppercase tracking-wider">
                Group Options
              </label>
              <button
                type="button"
                onClick={handleAddModOption}
                className="text-[9px] text-brand-primary font-700 uppercase tracking-wider hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={10} /> Add Option
              </button>
            </div>

            {modForm.options.map((opt, index) => (
              <div
                key={index}
                className="p-3 border border-neutral-200 rounded-xl bg-white shadow-sm space-y-2.5"
              >
                <div className="flex gap-3 items-start">
                  {opt.image ? (
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 flex-shrink-0">
                      <img
                        src={opt.image}
                        alt="Opt"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionImage(index)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[7px] font-700 hover:bg-black/60 cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="w-9 h-9 rounded-lg border border-dashed border-neutral-300 hover:border-brand-primary flex flex-col items-center justify-center text-neutral-400 hover:text-brand-primary bg-neutral-50 cursor-pointer flex-shrink-0 select-none">
                      {uploadingOptionIdx === index ? (
                        <span className="text-[6px] font-700 animate-pulse text-brand-primary">
                          ...
                        </span>
                      ) : (
                        <ImageIcon size={11} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleOptionImageUpload(e.target.files?.[0], index)
                        }
                        disabled={uploadingOptionIdx !== null}
                      />
                    </label>
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      placeholder="Option name"
                      value={opt.name}
                      onChange={(e) =>
                        handleModOptionChange(index, "name", e.target.value)
                      }
                      className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:border-brand-primary"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-[10px] font-700 text-neutral-400">
                            $
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            value={opt.price || ""}
                            onChange={(e) =>
                              handleModOptionChange(
                                index,
                                "price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-18 bg-[#FAFAF9] border border-neutral-200 rounded-lg pl-5 pr-2 py-1.5 text-[11px] focus:outline-none text-left"
                          />
                        </div>

                        <label className="flex items-center gap-1.5 text-[10.5px] font-600 text-neutral-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={opt.isDefault}
                            onChange={(e) =>
                              handleModOptionChange(
                                index,
                                "isDefault",
                                e.target.checked,
                              )
                            }
                            className="rounded border-neutral-300 text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
                          />
                          <span>Default</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSizePricingIdx(
                              expandedSizePricingIdx === index ? null : index,
                            )
                          }
                          className={`h-7 px-2 flex items-center gap-1 rounded-lg border text-[9px] font-700 uppercase tracking-wider transition-all cursor-pointer ${
                            opt.pricesPerSize?.some((p) => p.price > 0)
                              ? "bg-blue-50 border-blue-500 text-blue-600"
                              : "border-neutral-200 bg-white text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                          }`}
                          title="Set size-based prices"
                        >
                          <SlidersHorizontal size={10} />
                          <span>Size Config</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOptionIdx(
                              expandedOptionIdx === index ? null : index,
                            )
                          }
                          className={`h-7 px-2.5 flex items-center gap-1.5 rounded-lg border text-[9px] font-700 uppercase tracking-wider transition-all cursor-pointer ${
                            opt.modifierGroups?.length
                              ? "bg-orange-50 border-brand-primary text-brand-primary"
                              : "border-neutral-200 bg-white text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                          }`}
                          title="Link nested modifier groups"
                        >
                          <Layers size={10} />
                          <span>
                            Groups ({opt.modifierGroups?.length || 0})
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveModOption(index)}
                          disabled={modForm.options.length <= 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-550 border border-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {expandedSizePricingIdx === index && (
                  <div className="pl-11 pr-2 py-2.5 border-t border-neutral-100 bg-[#FAFAF9] rounded-lg mt-1 space-y-1.5 animate-scale-up">
                    <p className="text-[8.5px] font-700 text-neutral-500 uppercase tracking-wider">
                      Size-Based Option Prices (Pizza Sizes)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SIZE_PRESETS.map((preset) => {
                        const curPriceObj = opt.pricesPerSize?.find(
                          (p) => p.sizeCode === preset.code,
                        );
                        const curPrice = curPriceObj ? curPriceObj.price : 0;
                        return (
                          <div
                            key={preset.code}
                            className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-neutral-200"
                          >
                            <span className="text-[9px] font-700 text-neutral-600 truncate flex-1">
                              {preset.label}:
                            </span>
                            <div className="relative w-16 flex items-center">
                              <span className="absolute left-1.5 text-[9px] font-700 text-neutral-400">
                                $
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={curPrice || ""}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const existingList = opt.pricesPerSize || [];
                                  const exists = existingList.some(
                                    (p) => p.sizeCode === preset.code,
                                  );
                                  const nextPrices = exists
                                    ? existingList.map((p) =>
                                        p.sizeCode === preset.code
                                          ? { ...p, price: val }
                                          : p,
                                      )
                                    : [
                                        ...existingList,
                                        { sizeCode: preset.code, price: val },
                                      ];
                                  handleModOptionChange(
                                    index,
                                    "pricesPerSize",
                                    nextPrices,
                                  );
                                }}
                                className="w-full bg-[#FAFAF9] border border-neutral-200 rounded pl-4 pr-1 py-0.5 text-[9.5px] focus:outline-none focus:border-brand-primary"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expandedSizePricingIdx === index && (
                  <div className="pl-11 pr-2 py-2.5 border-t border-neutral-100 bg-blue-50/30 rounded-lg mt-1 space-y-2 animate-scale-up">
                    <p className="text-[8.5px] font-700 text-neutral-500 uppercase tracking-wider">
                      Available For Sizes (leave empty = all sizes)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PRESETS.map((preset) => {
                        const isChecked = (opt.availableForSizes || []).includes(preset.code);
                        return (
                          <label
                            key={preset.code}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-700 cursor-pointer transition-all select-none ${
                              isChecked
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const curList = opt.availableForSizes || [];
                                const nextList = e.target.checked
                                  ? [...curList, preset.code]
                                  : curList.filter((c) => c !== preset.code);
                                handleModOptionChange(index, "availableForSizes" as any, nextList);
                              }}
                              className="rounded border-neutral-300 text-emerald-500 focus:ring-emerald-400 w-3 h-3"
                            />
                            {preset.label}
                          </label>
                        );
                      })}
                    </div>
                    {/* <p className="text-[8px] text-neutral-400 italic">
                      Example: Check only &quot;6&quot; Personal&quot; &amp; &quot;9&quot; Small&quot; for Gluten Free crust. Leave all unchecked = available for every size.
                    </p> */}
                  </div>
                )}

                {expandedOptionIdx === index && (
                  <div className="pl-11 pr-2 py-2.5 border-t border-neutral-100 bg-[#FAFAF9] rounded-lg mt-1 space-y-1.5 animate-scale-up">
                    <p className="text-[8.5px] font-700 text-neutral-400 uppercase tracking-wider">
                      Link Nested Modifier Groups
                    </p>
                    {modifiers.filter(
                      (m) => (m.id || m._id) !== (editMod?.id || editMod?._id),
                    ).length === 0 ? (
                      <p className="text-[9px] text-neutral-400 italic">
                        No other modifier groups available.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {modifiers
                          .filter(
                            (m) =>
                              (m.id || m._id) !== (editMod?.id || editMod?._id),
                          )
                          .map((m) => {
                            const mid = (m.id || m._id) as string;
                            const optGroups = opt.modifierGroups || [];
                            const linked = optGroups.includes(mid);
                            return (
                              <button
                                key={mid}
                                type="button"
                                onClick={() => {
                                  const nextGroups = linked
                                    ? optGroups.filter((id) => id !== mid)
                                    : [...optGroups, mid];
                                  handleModOptionChange(
                                    index,
                                    "modifierGroups",
                                    nextGroups,
                                  );
                                }}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[9.5px] font-600 transition-all text-left cursor-pointer ${
                                  linked
                                    ? "bg-orange-50 border-brand-primary text-brand-primary font-700"
                                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                    linked
                                      ? "bg-brand-primary border-brand-primary text-white"
                                      : "border-neutral-300 bg-white"
                                  }`}
                                >
                                  {linked && <Check size={8} strokeWidth={3} />}
                                </div>
                                <span className="truncate">{m.name}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {editMod && (
              <button
                type="button"
                onClick={cancelEditModifier}
                className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isModifierButtonDisabled}
              className="flex-2 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[10px] font-700 uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 disabled:bg-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading || uploadingOptionIdx !== null ? (
                <>
                  <Loader2
                    size={13}
                    className="animate-spin text-neutral-400"
                  />
                  {uploadingOptionIdx !== null
                    ? "Uploading Option Image..."
                    : "Saving..."}
                </>
              ) : editMod ? (
                "Save Changes"
              ) : (
                "Add Modifier Group"
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-brand-primary" />
            <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
              Modifier Groups
            </h3>
          </div>
          <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-700">
            {modifiers.length} Groups
          </span>
        </div>

        {modifiers.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 italic text-[11px]">
            No modifier groups configured.
          </div>
        ) : (
          <div className="space-y-3.5">
            {modifiers.map((group) => (
              <div
                key={group.id || group._id}
                className="p-4 border border-neutral-200 rounded-xl bg-[#FAFAF9] flex justify-between items-start"
              >
                <div className="space-y-1.5 flex-1 pr-6">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-[12px] font-700 text-neutral-900 leading-tight">
                      {group.name}
                    </h4>
                    <span className="bg-orange-50 text-brand-primary text-[8px] font-700 px-1.5 py-0.5 rounded">
                      UI: {group.displayType}
                    </span>
                    {group.required && (
                      <span className="bg-red-50 text-red-500 text-[8px] font-700 px-1.5 py-0.5 rounded">
                        Mandatory
                      </span>
                    )}
                    <span className="text-neutral-400 text-[9px]">
                      Limits: {group.minSelection}-{group.maxSelection}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {group.options.map((opt) => (
                      <span
                        key={opt.id || opt._id}
                        className={`text-[9.5px] pl-1.5 pr-2.5 py-1 rounded-xl border flex items-center gap-2 ${
                          opt.isDefault
                            ? "border-brand-primary bg-orange-50 text-brand-primary font-600"
                            : "border-neutral-200 bg-white text-neutral-600"
                        }`}
                      >
                        {opt.image && (
                          <img
                            src={opt.image}
                            alt={opt.name}
                            className="w-5.5 h-5.5 rounded object-cover border border-neutral-200"
                          />
                        )}
                        <span>{opt.name}</span>
                        {opt.price > 0 && (
                          <span className="font-700 text-[8px] opacity-75">
                            (+${opt.price.toFixed(2)})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditModifier(group)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-brand-primary hover:bg-orange-100 transition-all cursor-pointer mt-1"
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteModifier((group.id || group._id) as string)
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer mt-1"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
