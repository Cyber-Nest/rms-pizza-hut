import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Plus, Minus, Check, MessageSquare, ChefHat, Pizza } from "lucide-react";
import toast from "react-hot-toast";
import {
  MenuItem,
  ModifierGroup,
  ModifierOption,
  SelectedModifier,
  ProductVariant,
  CartItem,
} from "../types";
import { usePosStore } from "../store/pos.store";

interface Props {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  // Edit mode — pass existing cart item to pre-fill
  editCartItem?: CartItem | null;
}

export default function ModifierDrawer({ item, isOpen, onClose, editCartItem }: Props) {
  const { addToCart, updateCartItem } = usePosStore();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<
    Record<string, ModifierOption[]>
  >({});
  const [removedIncluded, setRemovedIncluded] = useState<
    Record<string, string[]>
  >({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [note, setNote] = useState("");
  const [selectedSize, setSelectedSize] = useState<ProductVariant | null>(null);
  const isInitialMount = useRef(true);

  // Check if an option is available for the current size
  const isOptionAvailableForSize = (opt: ModifierOption, sizeCode: string | undefined) => {
    if (!opt.availableForSizes || opt.availableForSizes.length === 0) return true;
    if (!sizeCode) return true;
    return opt.availableForSizes.includes(sizeCode);
  };

  // Check if an option is an included topping for this product OR for any active selected deal option
  const isIncludedTopping = (
    groupId: string,
    optionId: string,
    currentSelections?: Record<string, ModifierOption[]>
  ) => {
    // 1. Check root product level
    if (item?.includedToppings && item.includedToppings.length > 0) {
      if (
        item.includedToppings.some(
          (it) => it.groupId === groupId && it.optionId === optionId
        )
      ) {
        return true;
      }
    }

    // 2. Check active parent deal selections
    const selSource = currentSelections || selections;
    for (const gId of Object.keys(selSource)) {
      const selectedOpts = selSource[gId] || [];
      for (const opt of selectedOpts) {
        if (opt.includedToppings && opt.includedToppings.length > 0) {
          if (
            opt.includedToppings.some(
              (it) =>
                (it.groupId === groupId || (it.groupId as any)?._id === groupId) &&
                (it.optionId === optionId || (it.optionId as any)?._id === optionId)
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Recursively initialize default selections for groups and default size
  useEffect(() => {
    if (!item) return;
    isInitialMount.current = true;
    setActiveIdx(0);
    setRemovedIncluded({});

    let defaultSize: ProductVariant | null = null;
    if (item.hasVariants && item.variants && item.variants.length > 0) {
      defaultSize = item.variants.find((v) => v.isDefault) || item.variants[0];
      setSelectedSize(defaultSize);
    } else {
      setSelectedSize(null);
    }

    // Edit mode: restore previous selections
    if (editCartItem) {
      setQuantity(editCartItem.quantity);
      setNote(editCartItem.note || "");

      // Rebuild selections from saved modifiers + default included items
      const restoredSelections: Record<string, ModifierOption[]> = {};
      const restoredRemoved: Record<string, string[]> = {};

      const restoreGroup = (g: ModifierGroup) => {
        if (!g?.options) return;
        const sizeCode = defaultSize?.sizeCode;
        const availableOpts = g.options.filter((o) => isOptionAvailableForSize(o, sizeCode));
        const defs = availableOpts.filter((o) => o.isDefault);
        const includedOpts = availableOpts.filter(
          (o) => !o.isDefault && isIncludedTopping(g.id, o.id, restoredSelections)
        );
        const baseSelections = [...defs, ...includedOpts];

        const savedForGroup = editCartItem.selectedModifiers.filter(
          (m) => m.groupId === g.id
        );
        const removedOptIds = savedForGroup
          .filter((m) => m.optionName.startsWith("- NO "))
          .map((m) => m.optionId || g.options.find((o) => `- NO ${o.name}` === m.optionName)?.id)
          .filter(Boolean) as string[];

        const extraOptObjs = savedForGroup
          .filter((m) => !m.optionName.startsWith("- NO "))
          .map((m) => g.options.find((o) => o.id === m.optionId))
          .filter(Boolean) as ModifierOption[];

        const activeSelections = baseSelections
          .filter((o) => !removedOptIds.includes(o.id))
          .concat(extraOptObjs.filter((e) => !baseSelections.some((b) => b.id === e.id)));

        restoredSelections[g.id] = activeSelections;
        restoredRemoved[g.id] = removedOptIds;

        // Recurse into child groups
        restoredSelections[g.id].forEach((opt) => {
          opt.modifierGroups?.forEach(restoreGroup);
        });
      };

      item.modifierGroups?.forEach(restoreGroup);
      setSelections(restoredSelections);
      setRemovedIncluded(restoredRemoved);

      // Restore size from name
      if (item.hasVariants && item.variants && item.variants.length > 0) {
        const sizeName = editCartItem.name.match(/\(([^)]+)\)/);
        if (sizeName) {
          const matched = item.variants.find((v) => v.sizeName === sizeName[1]);
          if (matched) setSelectedSize(matched);
        }
      }
    } else {
      setQuantity(1);
      setNote("");
      const init: Record<string, ModifierOption[]> = {};
      const initGroup = (g: ModifierGroup) => {
        if (!g || !g.options) return;
        const sizeCode = defaultSize?.sizeCode;
        const availableOpts = g.options.filter((o) => isOptionAvailableForSize(o, sizeCode));
        const defs = availableOpts.filter((o) => o.isDefault);
        const includedOpts = availableOpts.filter(
          (o) => !o.isDefault && isIncludedTopping(g.id, o.id, init)
        );
        let selected = [...defs, ...includedOpts];
        if (selected.length === 0 && g.required && g.maxSelection === 1 && availableOpts.length > 0) {
          selected = [availableOpts[0]];
        }
        if (selected.length > g.maxSelection) {
          selected = selected.slice(0, g.maxSelection);
        }
        init[g.id] = selected;
        selected.forEach((opt) => {
          if (opt.modifierGroups) {
            opt.modifierGroups.forEach(initGroup);
          }
        });
      };
      item.modifierGroups?.forEach(initGroup);
      setSelections(init);
    }

    setTimeout(() => { isInitialMount.current = false; }, 100);
  }, [item, isOpen]);

  // Auto-deselect incompatible options when size changes
  useEffect(() => {
    if (!item || !selectedSize || isInitialMount.current) return;

    const newSelections = { ...selections };
    let deselected = false;

    Object.keys(newSelections).forEach((gid) => {
      const opts = newSelections[gid] ?? [];
      const filtered = opts.filter((o) => isOptionAvailableForSize(o, selectedSize.sizeCode));
      if (filtered.length !== opts.length) {
        deselected = true;
        newSelections[gid] = filtered;
      }
    });

    if (deselected) {
      setSelections(newSelections);
      toast("Some options were removed (unavailable for this size)", {
        icon: "⚠️",
        duration: 2500,
      });
    }
  }, [selectedSize]);

  const activeGroup = useMemo(
    () => item?.modifierGroups?.[activeIdx] ?? null,
    [item, activeIdx],
  );

  const isLargeGroup = useMemo(() => {
    if (!activeGroup || !activeGroup.options) return false;
    const count = activeGroup.options.filter((opt) =>
      isOptionAvailableForSize(opt, selectedSize?.sizeCode),
    ).length;
    return count > 6;
  }, [activeGroup, selectedSize]);

  // Helper to resolve option price based on active size (free for included toppings)
  const getOptionPrice = (opt: ModifierOption, groupId?: string) => {
    // If this option is an included topping, it's free
    if (groupId && isIncludedTopping(groupId, opt.id)) {
      return 0;
    }
    if (selectedSize && opt.pricesPerSize && opt.pricesPerSize.length > 0) {
      const pObj = opt.pricesPerSize.find((p) => p.sizeCode === selectedSize.sizeCode);
      if (pObj && typeof pObj.price === "number") {
        return pObj.price;
      }
    }
    return opt.price;
  };

  // Base price for current selection
  const basePrice = selectedSize ? selectedSize.price : (item?.price || 0);

  // Recursive memo to get all active groups based on selections
  const allActiveGroups = useMemo(() => {
    if (!item || !item.modifierGroups) return [];
    const result: ModifierGroup[] = [];
    const visited = new Set<string>();

    const collect = (groups: ModifierGroup[]) => {
      groups.forEach((g) => {
        if (!g || visited.has(g.id)) return;
        visited.add(g.id);
        result.push(g);

        const selectedOpts = selections[g.id] ?? [];
        selectedOpts.forEach((opt) => {
          if (opt.modifierGroups && opt.modifierGroups.length > 0) {
            collect(opt.modifierGroups);
          }
        });
      });
    };

    collect(item.modifierGroups);
    return result;
  }, [item, selections]);

  if (!isOpen || !item) return null;

  const toggle = (g: ModifierGroup, opt: ModifierOption) => {
    const cur = selections[g.id] ?? [];
    const curRemoved = removedIncluded[g.id] ?? [];
    const has = cur.some((o) => o.id === opt.id);
    const isInc = isIncludedTopping(g.id, opt.id);
    const isRemoved = curRemoved.includes(opt.id);

    let next: ModifierOption[];
    let nextRemoved = [...curRemoved];

    if (isInc) {
      if (has) {
        // Deselect/Remove this pre-included topping
        next = cur.filter((o) => o.id !== opt.id);
        if (!nextRemoved.includes(opt.id)) {
          nextRemoved.push(opt.id);
        }
      } else {
        // Re-select/Re-include this pre-included topping
        next = [...cur, opt];
        nextRemoved = nextRemoved.filter((id) => id !== opt.id);
      }
    } else if (g.maxSelection === 1) {
      next = has && !g.required ? [] : [opt];
    } else if (has) {
      next = cur.filter((o) => o.id !== opt.id);
    } else if (cur.length < g.maxSelection) {
      next = [...cur, opt];
    } else return;

    const newSelections = { ...selections, [g.id]: next };
    const newRemoved = { ...removedIncluded, [g.id]: nextRemoved };

    // Recursively initialize default sub-groups and included recipe toppings for new selections
    const initNested = (o: ModifierOption) => {
      if (o.modifierGroups) {
        o.modifierGroups.forEach((subG) => {
          if (newSelections[subG.id] === undefined) {
            const defs = subG.options.filter((so) => so.isDefault);
            const includedOpts = subG.options.filter(
              (so) => !so.isDefault && isIncludedTopping(subG.id, so.id, newSelections)
            );
            let selected = [...defs, ...includedOpts];
            if (selected.length === 0 && subG.required && subG.maxSelection === 1 && subG.options.length > 0) {
              selected = [subG.options[0]];
            }
            if (selected.length > subG.maxSelection) {
              selected = selected.slice(0, subG.maxSelection);
            }
            newSelections[subG.id] = selected;
            newSelections[subG.id].forEach(initNested);
          }
        });
      }
    };

    next.forEach(initNested);
    setSelections(newSelections);
    setRemovedIncluded(newRemoved);
  };

  const valid = () =>
    allActiveGroups.every((g) => {
      const n = (selections[g.id] ?? []).length;
      const rN = (removedIncluded[g.id] ?? []).length;
      if (rN > 0) return true;
      return n >= g.minSelection && n <= g.maxSelection;
    });

  const livePrice = () => {
    let modSum = 0;
    allActiveGroups.forEach((g) => {
      const selectedOpts = selections[g.id] ?? [];
      selectedOpts.forEach((o) => {
        modSum += getOptionPrice(o, g.id);
      });
    });
    return (basePrice + modSum) * quantity;
  };

  const handleAdd = () => {
    if (!valid()) return;
    const mods: SelectedModifier[] = [];
    allActiveGroups.forEach((g) => {
      const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id) ?? false;
      const opts = selections[g.id] ?? [];
      opts.forEach((o) => {
        const isInc = isIncludedTopping(g.id, o.id);
        const isDef = o.isDefault && getOptionPrice(o, g.id) === 0;
        // Only save custom additions (not default included recipe toppings)
        if (!isInc && !isDef) {
          mods.push({
            groupId: g.id,
            groupName: g.name,
            optionId: o.id,
            optionName: o.name,
            price: getOptionPrice(o, g.id),
            isRoot,
          });
        }
      });

      // Explicitly removed included toppings
      const removedOptIds = removedIncluded[g.id] ?? [];
      removedOptIds.forEach((rId) => {
        const optObj = g.options.find((o) => o.id === rId);
        if (optObj) {
          mods.push({
            groupId: g.id,
            groupName: g.name,
            optionId: optObj.id,
            optionName: `- NO ${optObj.name}`,
            price: 0,
            isRoot,
          });
        }
      });
    });

    const itemToAdd: MenuItem = selectedSize
      ? {
          ...item,
          name: `${item.name} (${selectedSize.sizeName})`,
          price: selectedSize.price,
        }
      : item;

    if (editCartItem) {
      updateCartItem(editCartItem.id, itemToAdd, mods, quantity, note);
    } else {
      addToCart(itemToAdd, mods, quantity, note);
    }
    onClose();
  };

  const isSelected = (gid: string, oid: string) =>
    (selections[gid] ?? []).some((o) => o.id === oid);

  //modifier groups (including child groups)
  const renderModifierGroup = (g: ModifierGroup, pathName: string = "") => {
    const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id);
    const displayName = pathName ? `${pathName} › ${g.name}` : g.name;
    const selectedCount = (selections[g.id] ?? []).length;

    return (
      <div
        key={g.id}
        className={`space-y-3 ${
          !isRoot
            ? "mt-4 p-4 rounded-xl border border-dashed border-orange-200 bg-orange-50/20 pl-4 border-l-4 border-l-brand-primary"
            : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
          <div>
            <h4
              className={`font-700 uppercase tracking-wide ${
                isRoot ? "text-[10px] text-neutral-700" : "text-[9.5px] text-brand-primary"
              }`}
            >
              {displayName}
              {g.required && <span className="text-red-500 ml-1 font-bold">*</span>}
            </h4>
            {!isRoot && (
              <p className="text-[8px] text-neutral-400 font-medium">
                Nested Modifier Choice
              </p>
            )}
          </div>
          <span className="text-[9px] font-600 text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
            {selectedCount} / {g.maxSelection === 1 ? "1" : g.maxSelection} Selected
          </span>
        </div>

        {/* Options Grid */}
        <div
          className={`grid gap-2.5 ${
            g.options.filter((opt) => isOptionAvailableForSize(opt, selectedSize?.sizeCode)).length > 10
              ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
              : g.options.filter((opt) => isOptionAvailableForSize(opt, selectedSize?.sizeCode)).length > 4
              ? "grid-cols-2 sm:grid-cols-3"
              : "grid-cols-2"
          }`}
        >
          {g.options
            .filter((opt) => isOptionAvailableForSize(opt, selectedSize?.sizeCode))
            .map((opt) => {
              const sel = isSelected(g.id, opt.id);
              const isCard = g.displayType === "card";
              const optPrice = getOptionPrice(opt, g.id);
              const included = isIncludedTopping(g.id, opt.id);
              const isRemoved = (removedIncluded[g.id] ?? []).includes(opt.id);

              return (
                <div key={opt.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggle(g, opt)}
                    className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] w-full ${
                      isRemoved
                        ? "border-red-300 bg-red-50/60 ring-1 ring-red-300"
                        : sel
                        ? included
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                          : "border-brand-primary bg-orange-50 ring-1 ring-brand-primary"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    {/* Left selection circle/square for list types */}
                    {!isCard && (
                      <div
                        className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-all ${
                          g.displayType === "radio" || g.maxSelection === 1 ? "rounded-full" : "rounded"
                        } ${
                          isRemoved
                            ? "bg-red-500 border-red-500 text-white"
                            : sel
                            ? included
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-brand-primary border-brand-primary text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isRemoved ? (
                          <Minus size={9} strokeWidth={3} />
                        ) : sel ? (
                          <Check size={9} strokeWidth={3} />
                        ) : null}
                      </div>
                    )}

                    {/* Thumbnail Image for Cards Grid or if option has an image */}
                    {(isCard || !!opt.image) && (
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                        <img
                          src={
                            opt.image ||
                            item.image ||
                            "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60"
                          }
                          alt={opt.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60";
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 pr-4">
                      <p
                        className={`text-[10px] font-600 truncate ${
                          isRemoved ? "text-red-700 line-through opacity-80" : "text-neutral-800"
                        }`}
                      >
                        {opt.name}
                      </p>
                      {isRemoved ? (
                        <p className="text-[8.5px] font-700 text-red-600 flex items-center gap-0.5">
                          <span>- NO {opt.name}</span>
                        </p>
                      ) : included ? (
                        <p className="text-[8.5px] font-700 text-emerald-600">
                          ✓ Included
                        </p>
                      ) : optPrice > 0 ? (
                        <p className="text-[9px] font-700 text-brand-primary">
                          +${optPrice.toFixed(2)}
                        </p>
                      ) : null}
                    </div>

                    {/* Right selection indicator for Cards Grid */}
                    {isCard && (
                      <div
                        className={`absolute top-2.5 right-2.5 w-4 h-4 border flex items-center justify-center transition-all ${
                          g.maxSelection === 1 ? "rounded-full" : "rounded"
                        } ${
                          isRemoved
                            ? "bg-red-500 border-red-500 text-white"
                            : sel
                            ? "bg-brand-primary border-brand-primary text-white"
                            : "border-neutral-300"
                        }`}
                      >
                        {isRemoved ? (
                          <Minus size={9} strokeWidth={3} />
                        ) : sel ? (
                          <Check size={9} strokeWidth={3} />
                        ) : null}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
        </div>

        {/*child groups for selected options in this group */}
        {g.options.map((opt) => {
          const sel = isSelected(g.id, opt.id);
          if (sel && opt.modifierGroups && opt.modifierGroups.length > 0) {
            return (
              <div key={`child-of-${opt.id}`} className="space-y-3">
                {opt.modifierGroups.map((childG) =>
                  renderModifierGroup(
                    childG,
                    isRoot ? opt.name : `${pathName} › ${opt.name}`
                  )
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
      />

      {/* Drawer */}
      <div
        className={`relative w-full bg-white rounded-l-2xl overflow-hidden shadow-2xl flex z-10 animate-drawer-slide-in transition-all duration-300 ${
          isLargeGroup ? "max-w-[95vw] lg:max-w-6xl" : "max-w-3xl"
        }`}
      >
        {/* ── LEFT */}
        <div
          className={`${
            isLargeGroup ? "flex-1 min-w-0" : "w-[63%]"
          } flex flex-col bg-white border-r border-neutral-100`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                <ChefHat size={14} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-[10px] font-600 text-neutral-400 uppercase tracking-widest">
                  Customise
                </p>
                <h3 className="text-[13px] font-700 text-neutral-900 leading-tight">
                  {editCartItem ? `Edit: ${item.name}` : item.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-500 text-neutral-400">
                Step {activeIdx + 1} / {item.modifierGroups?.length}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Pizza Size Selector */}
          {item.hasVariants && item.variants && item.variants.length > 0 && (
            <div className="px-5 pt-3.5 pb-2 border-b border-neutral-100 bg-orange-50/30 flex-shrink-0">
              <p className="text-[8.5px] font-800 text-brand-primary uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Pizza size={10} />
                Select Pizza Size
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.variants.map((variant) => {
                  const isSelected = selectedSize?.sizeCode === variant.sizeCode;
                  return (
                    <button
                      key={variant.sizeCode}
                      type="button"
                      onClick={() => setSelectedSize(variant)}
                      className={`flex-1 min-w-[100px] flex items-center justify-between px-3 py-2 rounded-xl border text-[10.5px] font-700 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-brand-primary border-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="truncate">{variant.sizeName}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-800 ${
                          isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-brand-primary"
                        }`}
                      >
                        ${variant.price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group Tabs */}
          <div className="flex flex-wrap gap-1.5 px-5 pt-3 pb-2 flex-shrink-0">
            {item.modifierGroups?.map((g, i) => {
              const active = i === activeIdx;
              const count = (selections[g.id] ?? []).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-600 transition-all cursor-pointer active:scale-95 ${
                    active
                      ? "bg-brand-primary border-brand-primary text-white"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {g.name}
                  {count > 0 ? (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full font-700 ${
                        active ? "bg-white/25 text-white" : "bg-brand-primary/10 text-brand-primary"
                      }`}
                    >
                      {count}
                    </span>
                  ) : (
                    g.required && (
                      <span className="text-brand-primary text-[10px] ml-0.5">
                        *
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* Option Grid */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
            {activeGroup && renderModifierGroup(activeGroup)}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-[10px] font-600 hover:bg-neutral-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
                disabled={activeIdx === 0}
                className={`px-3 py-2 rounded-lg border text-[10px] font-600 transition-all cursor-pointer ${
                  activeIdx === 0
                    ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Back
              </button>
              <button
                onClick={() =>
                  setActiveIdx(
                    Math.min((item.modifierGroups?.length ?? 1) - 1, activeIdx + 1)
                  )
                }
                disabled={activeIdx === (item.modifierGroups?.length ?? 1) - 1}
                className={`px-3 py-2 rounded-lg border text-[10px] font-600 transition-all cursor-pointer ${
                  activeIdx === (item.modifierGroups?.length ?? 1) - 1
                    ? "border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div
          className={`${
            isLargeGroup ? "w-[300px] lg:w-[330px] flex-shrink-0" : "w-[37%]"
          } flex flex-col bg-neutral-50 px-5 py-5 justify-between overflow-hidden border-l border-neutral-100`}
        >
          <div className="flex-1 flex flex-col min-h-0 space-y-4 mb-4">
            {/* Item info */}
            <div className="pb-3 border-b border-neutral-200 flex-shrink-0">
              <p className="text-[9px] font-600 text-neutral-400 uppercase tracking-widest">
                Base Price {selectedSize ? `(${selectedSize.sizeName})` : ""}
              </p>
              <p className="text-[15px] font-800 text-neutral-900 leading-tight mt-0.5">
                ${basePrice.toFixed(2)}
              </p>
            </div>

            {/* Selected choices */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-1">
              <p className="text-[9px] font-700 text-neutral-400 uppercase tracking-widest sticky top-0 bg-neutral-50 pb-1 flex items-center justify-between">
                <span>Selected Choices</span>
                <span className="bg-brand-primary-light text-brand-primary px-1.5 py-0.5 rounded-full text-[8px] font-800 ml-2">
                  {allActiveGroups.reduce(
                    (acc, g) =>
                      acc +
                      (selections[g.id] ?? []).length +
                      (removedIncluded[g.id] ?? []).length,
                    0
                  )}
                </span>
              </p>
              {allActiveGroups.map((g) => {
                const opts = selections[g.id] ?? [];
                const removedOpts = removedIncluded[g.id] ?? [];
                if (!opts.length && !removedOpts.length) return null;
                return (
                  <div key={g.id}>
                    {/* <p className="text-[8.5px] font-600 text-neutral-400 uppercase tracking-wide mb-1">
                      {g.name}
                    </p> */}
                    {opts.map((o) => {
                      const optPrice = getOptionPrice(o, g.id);
                      const included = isIncludedTopping(g.id, o.id);
                      return (
                        <div
                          key={o.id}
                          className={`flex items-center gap-1 ${included ? "text-emerald-600" : "text-brand-primary"}`}
                        >
                          <span className="text-[10px] font-600">{o.name}</span>
                          {included ? (
                            <span className="text-[8px] text-emerald-500 ml-auto font-700">
                              Included
                            </span>
                          ) : optPrice > 0 ? (
                            <span className="text-[9px] text-neutral-400 ml-auto">
                              +${optPrice.toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                    {removedOpts.map((rId) => {
                      const optObj = g.options.find((o) => o.id === rId);
                      if (!optObj) return null;
                      return (
                        <div
                          key={`removed-${rId}`}
                          className="flex items-center justify-between text-red-600 bg-red-50/80 px-1.5 py-1 rounded-md border border-red-200 mt-1"
                        >
                          <span className="text-[9.5px] font-700 flex items-center gap-1">
                            <span>- NO {optObj.name}</span>
                          </span>
                          <span className="text-[8px] text-red-500 font-800 uppercase bg-white px-1 py-0.2 rounded border border-red-200">
                            Removed
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {allActiveGroups.reduce(
                (acc, g) =>
                  acc +
                  (selections[g.id] ?? []).length +
                  (removedIncluded[g.id] ?? []).length,
                0
              ) === 0 && (
                <p className="text-[9.5px] text-neutral-400 italic">
                  No choices selected yet.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Note */}
            <div>
              <label className="flex items-center gap-1 text-[9px] font-600 text-neutral-400 uppercase tracking-wider mb-1">
                <MessageSquare size={9} />
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Special instructions..."
                rows={2}
                className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-[10px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 resize-none transition-all"
              />
            </div>

            {/* Qty */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-600 text-neutral-700">Qty</span>
              <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-lg px-2 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <Minus size={11} />
                </button>
                <span className="text-[11px] font-700 text-neutral-800 w-4 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-neutral-500 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleAdd}
              disabled={!valid()}
              className={`w-full py-3 rounded-xl text-[11px] font-700 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${
                valid()
                  ? editCartItem
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20"
                    : "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-md shadow-brand-primary/20"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
              }`}
            >
              {editCartItem ? `Update Cart\u00a0·\u00a0$${livePrice().toFixed(2)}` : `Add to Cart\u00a0·\u00a0$${livePrice().toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
