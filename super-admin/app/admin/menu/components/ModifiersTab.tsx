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
  Search,
  X,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { ModifierGroup, ModifierOption, Product, Category } from "../types";
import { API_URL, compressImage, getAuthConfig } from "../utils";

interface ModifiersTabProps {
  modifiers: ModifierGroup[];
  products?: Product[];
  categories?: Category[];
  fetchModifiers: () => void;
  showToast: (text: string, type?: "success" | "error") => void;
}

export default function ModifiersTab({
  modifiers,
  products = [],
  categories = [],
  fetchModifiers,
  showToast,
}: ModifiersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [nestedSearchQuery, setNestedSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Link products modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkCatFilter, setLinkCatFilter] = useState("all");
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);

  // Group & sort modifiers so copies always appear directly underneath their original group
  const sortedModifiers = React.useMemo(() => {
    const list = [...modifiers];
    const getBase = (n: string) =>
      n
        .replace(/\s*\([^)]*copy[^)]*\)/gi, "")
        .trim()
        .toLowerCase();

    const result: ModifierGroup[] = [];
    const addedIds = new Set<string>();

    // 1st pass: Original items first, with their respective copies placed directly below them
    list.forEach((group) => {
      const gId = (group.id || group._id) as string;
      if (addedIds.has(gId)) return;

      const isCopy = /\([^)]*copy[^)]*\)/i.test(group.name);
      if (!isCopy) {
        result.push(group);
        addedIds.add(gId);

        // Find all copies of this specific original group
        const base = getBase(group.name);
        list.forEach((other) => {
          const oId = (other.id || other._id) as string;
          if (
            !addedIds.has(oId) &&
            /\([^)]*copy[^)]*\)/i.test(other.name) &&
            getBase(other.name) === base
          ) {
            result.push(other);
            addedIds.add(oId);
          }
        });
      }
    });

    // 2nd pass: Any remaining standalone copy groups (whose original was deleted)
    list.forEach((group) => {
      const gId = (group.id || group._id) as string;
      if (!addedIds.has(gId)) {
        result.push(group);
        addedIds.add(gId);
      }
    });

    return result;
  }, [modifiers]);

  const filteredModifiers = sortedModifiers.filter((group) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const groupNameMatch = group.name.toLowerCase().includes(q);
    const optionMatch = group.options.some((opt) =>
      opt.name.toLowerCase().includes(q),
    );
    return groupNameMatch || optionMatch;
  });
  const [uploadingOptionIdx, setUploadingOptionIdx] = useState<number | null>(
    null,
  );
  const [expandedOptionIdx, setExpandedOptionIdx] = useState<number | null>(
    null,
  );
  const [expandedSizePricingIdx, setExpandedSizePricingIdx] = useState<
    number | null
  >(null);
  const [editMod, setEditMod] = useState<ModifierGroup | null>(null);

  const SIZE_PRESETS = [
    { code: "personal", label: '6" Personal' },
    { code: "small", label: '9" Small' },
    { code: "medium", label: '12" Medium' },
    { code: "large", label: '14" Large' },
    { code: "xl", label: "XL Panormous" },
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
      {
        name: "",
        price: 0,
        isDefault: false,
        image: "",
        pricesPerSize: [],
        availableForSizes: [],
        modifierGroups: [],
      },
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
            await axios.post(
              `${API_URL}/upload/delete`,
              { url: oldImage },
              getAuthConfig(),
            );
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
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
        id: (o.id || o._id) as string,
        _id: (o.id || o._id) as string,
        name: o.name,
        price: o.price,
        isDefault: o.isDefault,
        image: o.image || "",
        pricesPerSize: o.pricesPerSize || [],
        availableForSizes: o.availableForSizes || [],
        productId: o.productId || (o as any).productId || undefined,
        includedToppings: o.includedToppings || [],
        modifierGroups:
          o.modifierGroups?.map((g: any) =>
            typeof g === "string" ? g : g.id || g._id,
          ) || [],
      })),
    });
    scrollToTop();
  };

  const duplicateModifierGroup = async (group: ModifierGroup) => {
    const groupId = (group.id || group._id) as string;
    setDuplicatingId(groupId);
    try {
      const payload = {
        name: `${group.name} (Copy)`,
        required: group.required,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        displayType: group.displayType,
        options: group.options.map((o) => ({
          name: o.name,
          price: o.price,
          isDefault: o.isDefault,
          image: o.image || "",
          pricesPerSize: o.pricesPerSize ? [...o.pricesPerSize] : [],
          availableForSizes: o.availableForSizes
            ? [...o.availableForSizes]
            : [],
          productId: o.productId || (o as any).productId || undefined,
          includedToppings: o.includedToppings ? [...o.includedToppings] : [],
          modifierGroups:
            o.modifierGroups?.map((g: any) =>
              typeof g === "string" ? g : g.id || g._id,
            ) || [],
        })),
      };

      const res = await axios.post(
        `${API_URL}/modifiers`,
        payload,
        getAuthConfig(),
      );
      if (res.data.success) {
        showToast(`Duplicated "${group.name}" as "${group.name} (Copy)"!`);
        fetchModifiers();
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Failed to duplicate modifier group",
        "error",
      );
    } finally {
      setDuplicatingId(null);
    }
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
        {
          name: "",
          price: 0,
          isDefault: false,
          image: "",
          availableForSizes: [],
          modifierGroups: [],
        },
      ],
    });
    setExpandedOptionIdx(null);
  };

  const handleAddModOption = () => {
    setModForm({
      ...modForm,
      options: [
        ...modForm.options,
        {
          name: "",
          price: 0,
          isDefault: false,
          image: "",
          availableForSizes: [],
          modifierGroups: [],
        },
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

  const handleImportProductsAsOptions = () => {
    if (selectedProdIds.length === 0) {
      showToast("Select at least one product to import", "error");
      return;
    }

    const newOptions = [...modForm.options];
    let importedCount = 0;

    selectedProdIds.forEach((pId) => {
      const prod = products.find((p) => (p.id || p._id) === pId);
      if (!prod) return;

      const exists = newOptions.some(
        (o) =>
          o.productId === pId ||
          o.name.toLowerCase().trim() === prod.name.toLowerCase().trim(),
      );
      if (exists) return;

      const optObj: ModifierOption = {
        name: prod.name,
        price: 0,
        isDefault: false,
        image: prod.image || "",
        productId: prod.id || prod._id,
        includedToppings: prod.includedToppings || [],
        modifierGroups: (prod.modifierGroups || []).map((g: any) =>
          typeof g === "string" ? g : g.id || g._id,
        ),
        availableForSizes: [],
        pricesPerSize: [],
      };

      if (newOptions.length === 1 && !newOptions[0].name.trim()) {
        newOptions[0] = optObj;
      } else {
        newOptions.push(optObj);
      }
      importedCount++;
    });

    setModForm({ ...modForm, options: newOptions });
    setIsLinkModalOpen(false);
    setSelectedProdIds([]);
    setLinkSearch("");
    showToast(`Imported ${importedCount} product(s) as options!`);
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
      const formattedOptions = filteredOptions.map((o: any) => {
        const optObj: any = {
          name: o.name,
          price: o.price,
          isDefault: o.isDefault,
          image: o.image || "",
          pricesPerSize: o.pricesPerSize || [],
          availableForSizes: o.availableForSizes || [],
          modifierGroups: o.modifierGroups || [],
          productId: o.productId || null,
          includedToppings: o.includedToppings || [],
        };
        const optId = o.id || o._id;
        if (optId) {
          optObj._id = optId;
        }
        return optObj;
      });

      const payload = {
        ...modForm,
        options: formattedOptions,
      };
      if (editMod) {
        const id = editMod.id || editMod._id;
        const res = await axios.put(
          `${API_URL}/modifiers/${id}`,
          payload,
          getAuthConfig(),
        );
        if (res.data.success) {
          showToast("Modifier Group updated!");
          cancelEditModifier();
          fetchModifiers();
        }
      } else {
        const res = await axios.post(
          `${API_URL}/modifiers`,
          payload,
          getAuthConfig(),
        );
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
      const res = await axios.delete(
        `${API_URL}/modifiers/${id}`,
        getAuthConfig(),
      );
      if (res.data.success) {
        showToast("Modifier group deleted!");
        if (editMod && (editMod.id === id || editMod._id === id))
          cancelEditModifier();
        fetchModifiers();

        if (modToDelete?.options) {
          for (const opt of modToDelete.options) {
            if (opt.image) {
              try {
                await axios.post(
                  `${API_URL}/upload/delete`,
                  {
                    url: opt.image,
                  },
                  getAuthConfig(),
                );
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
    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1 text-xs">
          <p className="font-700 text-neutral-900">
            Are you sure you want to delete this modifier group?
          </p>
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
      ),
      { duration: 5000, position: "top-center" },
    );
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProdIds([]);
                    setLinkSearch("");
                    setLinkCatFilter("all");
                    setIsLinkModalOpen(true);
                  }}
                  className="text-[9px] text-blue-600 font-700 uppercase tracking-wider hover:opacity-80 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm"
                >
                  <Plus size={10} /> Link Products
                </button>
                <button
                  type="button"
                  onClick={handleAddModOption}
                  className="text-[9px] text-brand-primary font-700 uppercase tracking-wider hover:opacity-80 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} /> Add Option
                </button>
              </div>
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
                        const isChecked = (
                          opt.availableForSizes || []
                        ).includes(preset.code);
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
                                handleModOptionChange(
                                  index,
                                  "availableForSizes" as any,
                                  nextList,
                                );
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
                  <div className="pl-11 pr-2 py-2.5 border-t border-neutral-100 bg-[#FAFAF9] rounded-lg mt-1 space-y-2 animate-scale-up">
                    <p className="text-[8.5px] font-700 text-neutral-400 uppercase tracking-wider">
                      Link Nested Modifier Groups
                    </p>
                    <div className="relative">
                      <Search
                        size={11}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        type="text"
                        value={nestedSearchQuery}
                        onChange={(e) => setNestedSearchQuery(e.target.value)}
                        placeholder="Search groups to link..."
                        className="w-full bg-white border border-neutral-200 rounded-lg py-1 pl-7 pr-6 text-[10px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary"
                      />
                      {nestedSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setNestedSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    {modifiers.filter(
                      (m) => (m.id || m._id) !== (editMod?.id || editMod?._id),
                    ).length === 0 ? (
                      <p className="text-[9px] text-neutral-400 italic">
                        No other modifier groups available.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {modifiers
                          .filter((m) => {
                            const isNotSelf =
                              (m.id || m._id) !== (editMod?.id || editMod?._id);
                            if (!isNotSelf) return false;
                            if (!nestedSearchQuery.trim()) return true;
                            const q = nestedSearchQuery.toLowerCase().trim();
                            return (
                              m.name.toLowerCase().includes(q) ||
                              m.options.some((opt) =>
                                opt.name.toLowerCase().includes(q),
                              )
                            );
                          })
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

      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-brand-primary" />
              <h3 className="text-[12px] font-800 text-neutral-800 uppercase tracking-wider">
                Modifier Groups
              </h3>
            </div>
            <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-700">
              {searchQuery
                ? `${filteredModifiers.length} / ${modifiers.length}`
                : `${modifiers.length}`}{" "}
              Groups
            </span>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modifier group or option..."
              className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl py-1.5 pl-8 pr-8 text-[11px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {modifiers.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 italic text-[11px]">
            No modifier groups configured.
          </div>
        ) : filteredModifiers.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 italic text-[11px]">
            No modifier groups matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredModifiers.map((group) => {
              const isCopyCard = /\([^)]*copy[^)]*\)/i.test(group.name);
              return (
                <div
                  key={group.id || group._id}
                  className={`p-4 border rounded-xl flex justify-between items-start transition-all ${
                    isCopyCard
                      ? "ml-3 sm:ml-5 border-blue-200 border-l-4 border-l-blue-500 bg-blue-50/20 shadow-xs"
                      : "border-neutral-200 bg-[#FAFAF9]"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 pr-6">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-[12px] font-700 text-neutral-900 leading-tight">
                        {group.name}
                      </h4>
                      {isCopyCard && (
                        <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[8px] font-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Copy size={9} /> Copy
                        </span>
                      )}
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
                      {group.options.map((opt) => {
                        const isMatchedOption =
                          searchQuery.trim() &&
                          opt.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase().trim());
                        return (
                          <span
                            key={opt.id || opt._id}
                            className={`text-[9.5px] pl-1.5 pr-2.5 py-1 rounded-xl border flex items-center gap-2 ${
                              isMatchedOption
                                ? "border-amber-400 bg-amber-50 text-amber-900 font-700 shadow-xs"
                                : opt.isDefault
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
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => duplicateModifierGroup(group)}
                      disabled={duplicatingId === (group.id || group._id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-all cursor-pointer mt-1"
                      title="Duplicate / Copy Modifier Group"
                    >
                      {duplicatingId === (group.id || group._id) ? (
                        <Loader2
                          size={12}
                          className="animate-spin text-blue-600"
                        />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => startEditModifier(group)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-brand-primary hover:bg-orange-100 transition-all cursor-pointer mt-1"
                      title="Edit Modifier Group"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteModifier((group.id || group._id) as string)
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all cursor-pointer mt-1"
                      title="Delete Modifier Group"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link Products Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 flex-shrink-0">
              <div>
                <h3 className="text-[13px] font-800 text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="text-brand-primary" size={16} />
                  Link Existing Products as Options
                </h3>
                <p className="text-[9.5px] text-neutral-400 font-500 mt-0.5">
                  Select products (Pizzas, Sides, Wings, Beverages, etc.) to
                  automatically import their names, images, crusts/toppings, and
                  included recipe toppings as modifier options!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center cursor-pointer transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2 flex-shrink-0">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full bg-[#FAFAF9] border border-neutral-200 rounded-xl py-2 pl-8 pr-8 text-[11px] focus:outline-none focus:border-brand-primary"
                />
                {linkSearch && (
                  <button
                    type="button"
                    onClick={() => setLinkSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1 overflow-x-auto pb-1 max-h-16">
                <button
                  type="button"
                  onClick={() => setLinkCatFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[9.5px] font-700 uppercase tracking-wider transition-all cursor-pointer border ${
                    linkCatFilter === "all"
                      ? "bg-brand-primary border-brand-primary text-white"
                      : "bg-[#FAFAF9] border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map((c) => {
                  const cid = (c.id || c._id) as string;
                  const count = products.filter((p) => {
                    const pCid =
                      typeof p.categoryId === "object"
                        ? p.categoryId?.id || p.categoryId?._id
                        : p.categoryId;
                    return pCid === cid;
                  }).length;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => setLinkCatFilter(cid)}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-700 uppercase tracking-wider transition-all cursor-pointer border ${
                        linkCatFilter === cid
                          ? "bg-brand-primary border-brand-primary text-white"
                          : "bg-[#FAFAF9] border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {c.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {products
                  .filter((p) => {
                    const pCid =
                      typeof p.categoryId === "object"
                        ? p.categoryId?.id || p.categoryId?._id
                        : p.categoryId;
                    if (linkCatFilter !== "all" && pCid !== linkCatFilter)
                      return false;
                    if (!linkSearch.trim()) return true;
                    const q = linkSearch.toLowerCase().trim();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.description && p.description.toLowerCase().includes(q))
                    );
                  })
                  .map((p) => {
                    const pid = (p.id || p._id) as string;
                    const isSelected = selectedProdIds.includes(pid);
                    const alreadyInForm = modForm.options.some(
                      (o) =>
                        o.productId === pid ||
                        o.name.toLowerCase().trim() ===
                          p.name.toLowerCase().trim(),
                    );

                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          if (alreadyInForm) return;
                          setSelectedProdIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== pid)
                              : [...prev, pid],
                          );
                        }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          alreadyInForm
                            ? "bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed"
                            : isSelected
                              ? "bg-orange-50 border-brand-primary ring-1 ring-brand-primary"
                              : "bg-white border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected || alreadyInForm
                              ? "bg-brand-primary border-brand-primary text-white"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {(isSelected || alreadyInForm) && (
                            <Check size={10} strokeWidth={3} />
                          )}
                        </div>

                        {p.image ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center text-neutral-400 flex-shrink-0">
                            <ImageIcon size={14} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-[10.5px] font-700 text-neutral-800 truncate">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {alreadyInForm ? (
                              <span className="text-[8px] font-700 text-neutral-500 uppercase bg-neutral-200 px-1.5 py-0.5 rounded">
                                Already Added
                              </span>
                            ) : (
                              <>
                                <span className="text-[8.5px] font-600 text-neutral-400">
                                  ${p.price ? p.price.toFixed(2) : "0.00"}
                                </span>
                                {p.includedToppings &&
                                  p.includedToppings.length > 0 && (
                                    <span className="text-[8px] font-700 text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                                      ✓ {p.includedToppings.length} Recipe
                                      Toppings
                                    </span>
                                  )}
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl text-[10px] font-700 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportProductsAsOptions}
                disabled={selectedProdIds.length === 0}
                className="px-5 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-800 uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-brand-primary/20 flex items-center gap-1.5"
              >
                <Plus size={12} />
                Import Selected Products ({selectedProdIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
