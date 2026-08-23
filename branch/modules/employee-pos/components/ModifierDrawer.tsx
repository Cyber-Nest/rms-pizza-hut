import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  MessageSquare,
  ChefHat,
  Pizza,
} from "lucide-react";
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

export default function ModifierDrawer({
  item,
  isOpen,
  onClose,
  editCartItem,
}: Props) {
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

  // Pre-index all available ModifierGroups (both root and nested populated groups) by ID
  const groupMap = useMemo(() => {
    const map = new Map<string, ModifierGroup>();

    const indexGroups = (groups?: (ModifierGroup | string)[]) => {
      if (!groups) return;
      groups.forEach((g) => {
        if (g && typeof g !== "string") {
          const gId = (g.id || (g as any)._id) as string;
          if (gId) map.set(gId.toString(), g);
          g.options?.forEach((o) => {
            if (o.modifierGroups) {
              indexGroups(o.modifierGroups);
            }
          });
        }
      });
    };

    indexGroups(item?.modifierGroups);
    return map;
  }, [item]);

  const resolveModifierGroup = (
    gOrId: ModifierGroup | string,
  ): ModifierGroup | undefined => {
    if (!gOrId) return undefined;
    if (typeof gOrId !== "string") {
      return gOrId;
    }
    return groupMap.get(gOrId.toString());
  };

  // Scope selection key: root groups use plain g.id; child groups under a deal pizza option
  // use "pizzaOptId__childGroupId" to prevent cross-slot contamination (Pizza 1 vs Pizza 2)
  const getGroupKey = (groupId: string, parentOpt?: ModifierOption): string =>
    parentOpt ? `${parentOpt.id}__${groupId}` : groupId;

  // Check if an option is available for the current size
  const isOptionAvailableForSize = (
    opt: ModifierOption,
    sizeCode: string | undefined,
  ) => {
    if (!opt.availableForSizes || opt.availableForSizes.length === 0)
      return true;
    if (!sizeCode) return true;
    return opt.availableForSizes.includes(sizeCode);
  };

  // Check if an option is a fixed recipe included topping (from product or parent deal opt)
  const isRecipeIncludedTopping = (
    groupId: string,
    optionId: string,
    currentSelections?: Record<string, ModifierOption[]>,
    parentOpt?: ModifierOption,
  ) => {
    // 1. If a specific parent option is provided (e.g. BBQ Chicken or Veggie Lovers), check its includedToppings ONLY
    if (parentOpt?.includedToppings && parentOpt.includedToppings.length > 0) {
      return parentOpt.includedToppings.some(
        (it) =>
          (it.groupId === groupId || (it.groupId as any)?._id === groupId) &&
          (it.optionId === optionId || (it.optionId as any)?._id === optionId),
      );
    }

    // 2. Check root product level
    if (item?.includedToppings && item.includedToppings.length > 0) {
      if (
        item.includedToppings.some(
          (it) =>
            (it.groupId === groupId || (it.groupId as any)?._id === groupId) &&
            (it.optionId === optionId ||
              (it.optionId as any)?._id === optionId),
        )
      ) {
        return true;
      }
    }

    // 3. Fallback: Check active parent deal selections
    const selSource = currentSelections || selections;
    for (const gId of Object.keys(selSource)) {
      const selectedOpts = selSource[gId] || [];
      for (const opt of selectedOpts) {
        if (opt.includedToppings && opt.includedToppings.length > 0) {
          if (
            opt.includedToppings.some(
              (it) =>
                (it.groupId === groupId ||
                  (it.groupId as any)?._id === groupId) &&
                (it.optionId === optionId ||
                  (it.optionId as any)?._id === optionId),
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  };

  // Check if an option is an included topping for this product OR for a specific parent option
  const isIncludedTopping = (
    groupId: string,
    optionId: string,
    currentSelections?: Record<string, ModifierOption[]>,
    parentOpt?: ModifierOption,
  ) => {
    if (
      isRecipeIncludedTopping(groupId, optionId, currentSelections, parentOpt)
    ) {
      return true;
    }

    // 4. Check freeSelectionLimit on the group (e.g. CYO Toppings with 2 free items limit)
    const activeSel = currentSelections || selections;
    // Use scoped key so deal slot child groups are read from the correct parent pizza option
    const fslKey = getGroupKey(groupId, parentOpt);
    const groupSelections = activeSel[fslKey] || [];
    const itemIndex = groupSelections.findIndex((o) => o.id === optionId);

    let targetGroup: ModifierGroup | undefined;
    const findGroup = (groups?: ModifierGroup[]) => {
      if (!groups) return;
      for (const g of groups) {
        if (
          g.id === groupId ||
          (g as any)._id === groupId ||
          ((g as any)._id && (g as any)._id.toString() === groupId)
        ) {
          targetGroup = g;
          return;
        }
        if (g.options) {
          for (const o of g.options) {
            if (o.modifierGroups) findGroup(o.modifierGroups);
            if (targetGroup) return;
          }
        }
      }
    };
    findGroup(item?.modifierGroups);
    if (!targetGroup && parentOpt?.modifierGroups) {
      findGroup(parentOpt.modifierGroups);
    }
    if (
      targetGroup &&
      typeof targetGroup.freeSelectionLimit === "number" &&
      targetGroup.freeSelectionLimit > 0
    ) {
      if (itemIndex !== -1) {
        return itemIndex < targetGroup.freeSelectionLimit;
      }
      return groupSelections.length < targetGroup.freeSelectionLimit;
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

      const restoreGroup = (g: ModifierGroup, parentOpt?: ModifierOption) => {
        if (!g?.options) return;
        const sizeCode = defaultSize?.sizeCode;
        const availableOpts = g.options.filter((o) =>
          isOptionAvailableForSize(o, sizeCode),
        );
        const defs = availableOpts.filter((o) => o.isDefault);
        const includedOpts = availableOpts.filter(
          (o) =>
            !o.isDefault &&
            isRecipeIncludedTopping(g.id, o.id, restoredSelections, parentOpt),
        );
        const baseSelections = [...defs, ...includedOpts];

        const savedForGroup = editCartItem.selectedModifiers.filter(
          (m) => m.groupId === g.id,
        );
        const removedOptIds = savedForGroup
          .filter((m) => m.optionName.startsWith("- NO "))
          .map(
            (m) =>
              m.optionId ||
              g.options.find((o) => `- NO ${o.name}` === m.optionName)?.id,
          )
          .filter(Boolean) as string[];

        const extraOptObjs = savedForGroup
          .filter((m) => !m.optionName.startsWith("- NO "))
          .map((m) => g.options.find((o) => o.id === m.optionId))
          .filter(Boolean) as ModifierOption[];

        const activeSelections = baseSelections
          .filter((o) => !removedOptIds.includes(o.id))
          .concat(
            extraOptObjs.filter(
              (e) => !baseSelections.some((b) => b.id === e.id),
            ),
          );

        const rKey = getGroupKey(g.id, parentOpt);
        restoredSelections[rKey] = activeSelections;
        restoredRemoved[rKey] = removedOptIds;

        // Recurse into child groups
        restoredSelections[rKey].forEach((opt) => {
          opt.modifierGroups?.forEach((subG) => restoreGroup(subG, opt));
        });
      };

      item.modifierGroups?.forEach((g) => restoreGroup(g));
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
      const initGroup = (g: ModifierGroup, parentOpt?: ModifierOption) => {
        if (!g || !g.options) return;
        const key = getGroupKey(g.id, parentOpt);
        if (init[key] !== undefined) return; // already initialized for this slot
        const sizeCode = defaultSize?.sizeCode;
        const availableOpts = g.options.filter((o) =>
          isOptionAvailableForSize(o, sizeCode),
        );
        const defs = availableOpts.filter((o) => o.isDefault);
        const includedOpts = availableOpts.filter(
          (o) =>
            !o.isDefault &&
            isRecipeIncludedTopping(g.id, o.id, init, parentOpt),
        );
        let selected = [...defs, ...includedOpts];
        // Disabled auto-selection fallback of 1st item (e.g. Veggie Lovers) when no option is explicitly marked default in super-admin
        // if (
        //   selected.length === 0 &&
        //   g.required &&
        //   g.maxSelection === 1 &&
        //   availableOpts.length > 0
        // ) {
        //   selected = [availableOpts[0]];
        // }
        if (selected.length > g.maxSelection) {
          selected = selected.slice(0, g.maxSelection);
        }
        init[key] = selected;
        selected.forEach((opt) => {
          if (opt.modifierGroups) {
            opt.modifierGroups.forEach((subG) => initGroup(subG, opt));
          }
        });
      };
      item.modifierGroups?.forEach((g) => initGroup(g));
      setSelections(init);
    }

    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
  }, [item, isOpen]);

  // Auto-deselect incompatible options when size changes
  useEffect(() => {
    if (!item || !selectedSize || isInitialMount.current) return;

    const newSelections = { ...selections };
    let deselected = false;

    Object.keys(newSelections).forEach((gid) => {
      const opts = newSelections[gid] ?? [];
      const filtered = opts.filter((o) =>
        isOptionAvailableForSize(o, selectedSize.sizeCode),
      );
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

  // Fixed wide drawer mode (no shrinking in x-direction)
  const isLargeGroup = true;

  const getDealPriceForModifierOption = (
    optionId: string,
    optionName?: string,
  ) => {
    if (!item) return null;
    const today = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][new Date().getDay()];
    const prodId = (item.id || (item as any)._id || item.productId) as string;

    const deals = (item as any).dealsOfTheDay || (item as any).deals || [];
    const matchedDeal = deals.find(
      (d: any) =>
        d.isActive &&
        d.dayOfWeek?.toLowerCase() === today &&
        (d.productId === prodId ||
          (d.productId as any)?._id === prodId ||
          (d.productId as any)?.id === prodId ||
          !d.productId),
    );

    if (matchedDeal && matchedDeal.sizes) {
      const optDeal = matchedDeal.sizes.find(
        (s: any) =>
          s.isEnabled &&
          typeof s.dealPrice === "number" &&
          (s.sizeCode === optionId ||
            s.sizeName === optionName ||
            s.sizeName?.endsWith(`: ${optionName}`)),
      );
      if (optDeal) {
        return optDeal.dealPrice;
      }
    }
    return null;
  };

  // Helper to resolve option price based on active size or deal slot size context (free for included toppings)
  const getOptionPrice = (
    opt: ModifierOption,
    groupId?: string,
    groupName?: string,
  ) => {
    // If this option is an included topping, it's free
    if (groupId && isIncludedTopping(groupId, opt.id)) {
      return 0;
    }

    const modDealPrice = getDealPriceForModifierOption(opt.id, opt.name);
    if (modDealPrice !== null) {
      return modDealPrice;
    }

    // 1. If explicit selectedSize is present on the main item
    if (selectedSize && opt.pricesPerSize && opt.pricesPerSize.length > 0) {
      const pObj = opt.pricesPerSize.find(
        (p) => p.sizeCode === selectedSize.sizeCode,
      );
      if (pObj && typeof pObj.price === "number" && pObj.price > 0) {
        return pObj.price;
      }
    }

    // 2. Detect size from explicit modifierSizeCodes mapping, item name/description, or group/slot name
    let detectedSize = "medium";

    if (groupId && item?.modifierSizeCodes) {
      const explicitSizeMapping = item.modifierSizeCodes.find(
        (m) => m.groupId === groupId,
      );
      if (explicitSizeMapping?.sizeCode) {
        detectedSize = explicitSizeMapping.sizeCode;
      }
    }

    if (detectedSize === "medium" && item) {
      const itemStr = (
        (item.name || "") +
        " " +
        (item.description || "")
      ).toLowerCase();
      if (itemStr.includes("panalicious")) detectedSize = "panalicious";
      else if (itemStr.includes("large") || itemStr.includes('14"'))
        detectedSize = "large";
      else if (itemStr.includes("small") || itemStr.includes('9"'))
        detectedSize = "small";
      else if (itemStr.includes("personal") || itemStr.includes('6"'))
        detectedSize = "personal";
      else if (itemStr.includes("xl") || itemStr.includes("panormous"))
        detectedSize = "xl";
      else if (itemStr.includes("med") || itemStr.includes('12"'))
        detectedSize = "medium";
    }

    if (groupName) {
      const gLower = groupName.toLowerCase();
      if (gLower.includes("panalicious")) detectedSize = "panalicious";
      else if (gLower.includes("large") || gLower.includes('14"'))
        detectedSize = "large";
      else if (gLower.includes("small") || gLower.includes('9"'))
        detectedSize = "small";
      else if (gLower.includes("personal") || gLower.includes('6"'))
        detectedSize = "personal";
      else if (gLower.includes("xl") || gLower.includes("panormous"))
        detectedSize = "xl";
      else if (gLower.includes("med") || gLower.includes('12"'))
        detectedSize = "medium";
    }

    if (opt.pricesPerSize && opt.pricesPerSize.length > 0) {
      const matched = opt.pricesPerSize.find(
        (p) => p.sizeCode === detectedSize,
      );
      if (matched && typeof matched.price === "number" && matched.price > 0) {
        return matched.price;
      }
      const anyNonZero = opt.pricesPerSize.find((p) => p.price > 0);
      if (anyNonZero) return anyNonZero.price;
    }

    return opt.price || 0;
  };

  // Base price for current selection
  const basePrice = selectedSize ? selectedSize.price : item?.price || 0;

  // Recursive memo to get all active groups (with scoped keys) based on selections
  const allActiveGroups = useMemo(() => {
    if (!item || !item.modifierGroups) return [];
    const result: { group: ModifierGroup; key: string }[] = [];
    const visited = new Set<string>();

    const collect = (groups: ModifierGroup[], parentOpt?: ModifierOption) => {
      groups.forEach((g) => {
        const key = getGroupKey(g.id, parentOpt);
        if (!g || visited.has(key)) return;
        visited.add(key);
        result.push({ group: g, key });

        const selectedOpts = selections[key] ?? [];
        selectedOpts.forEach((opt) => {
          if (opt.modifierGroups && opt.modifierGroups.length > 0) {
            const childGroups = opt.modifierGroups
              .map((cg) => resolveModifierGroup(cg))
              .filter(Boolean) as ModifierGroup[];
            collect(childGroups, opt);
          }
        });
      });
    };

    collect(item.modifierGroups);
    return result;
  }, [item, selections]);

  if (!isOpen || !item) return null;

  // Helper to recursively clear sub-group selections when a parent option is unselected
  const clearSubGroups = (
    o: ModifierOption,
    targetSelections: Record<string, ModifierOption[]>,
    targetRemoved?: Record<string, string[]>,
  ) => {
    if (o.modifierGroups) {
      o.modifierGroups.forEach((subG) => {
        // Use scoped key — child groups are keyed by their parent pizza option
        const key = getGroupKey(subG.id, o);
        delete targetSelections[key];
        if (targetRemoved) delete targetRemoved[key];
        subG.options.forEach((so) =>
          clearSubGroups(so, targetSelections, targetRemoved),
        );
      });
    }
  };

  const toggle = (g: ModifierGroup, opt: ModifierOption, parentOpt?: ModifierOption) => {
    const key = getGroupKey(g.id, parentOpt);
    const cur = selections[key] ?? [];
    const curRemoved = removedIncluded[key] ?? [];
    const has = cur.some((o) => o.id === opt.id);
    const isInc = isIncludedTopping(g.id, opt.id, selections, parentOpt);
    const isRemoved = curRemoved.includes(opt.id);

    let next: ModifierOption[];
    let nextRemoved = [...curRemoved];
    const newSelections = { ...selections };
    const newRemoved = { ...removedIncluded };

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
      // Clear sub-groups of previously selected option in single-choice radio group
      cur.forEach((prevOpt) => {
        if (prevOpt.id !== opt.id) {
          clearSubGroups(prevOpt, newSelections, newRemoved);
        }
      });
      next = has && !g.required ? [] : [opt];
    } else if (has) {
      clearSubGroups(opt, newSelections, newRemoved);
      next = cur.filter((o) => o.id !== opt.id);
    } else if (cur.length < g.maxSelection) {
      next = [...cur, opt];
    } else return;

    newSelections[key] = next;
    newRemoved[key] = nextRemoved;

    // Recursively initialize default sub-groups and included recipe toppings for new selections.
    // parentPizzaOpt = the deal pizza option (e.g. BBQ Chicken) that owns these sub-groups.
    // Child groups are scoped by their parent pizza option ID to prevent cross-slot leakage.
    const initNested = (o: ModifierOption, parentPizzaOpt?: ModifierOption) => {
      if (o.modifierGroups) {
        o.modifierGroups.forEach((subG) => {
          const scopedKey = getGroupKey(subG.id, parentPizzaOpt || o);
          if (newSelections[scopedKey] === undefined) {
            const defs = subG.options.filter((so) => so.isDefault);
            // Use the immediate parent option (o) as parentOpt so we only check
            // THIS pizza's includedToppings — no cross-slot leakage
            const parentForCheck = parentPizzaOpt || o;
            const includedOpts = subG.options.filter(
              (so) =>
                !so.isDefault &&
                isIncludedTopping(
                  subG.id,
                  so.id,
                  newSelections,
                  parentForCheck,
                ),
            );
            let selected = [...defs, ...includedOpts];
            // Disabled auto-selection fallback of 1st item when no option is explicitly marked default in super-admin
            // if (
            //   selected.length === 0 &&
            //   subG.required &&
            //   subG.maxSelection === 1 &&
            //   subG.options.length > 0
            // ) {
            //   selected = [subG.options[0]];
            // }
            if (selected.length > subG.maxSelection) {
              selected = selected.slice(0, subG.maxSelection);
            }
            newSelections[scopedKey] = selected;
            // Recurse deeper, keeping the same top-level pizza as parent
            newSelections[scopedKey].forEach((so) =>
              initNested(so, parentForCheck),
            );
          }
        });
      }
    };

    next.forEach((o) => initNested(o, o));
    setSelections(newSelections);
    setRemovedIncluded(newRemoved);
  };

  const valid = () =>
    allActiveGroups.every(({ group: g, key }) => {
      const n = (selections[key] ?? []).length;
      const rN = (removedIncluded[key] ?? []).length;
      if (rN > 0) return true;
      return n >= g.minSelection && n <= g.maxSelection;
    });

  // Helper to resolve deal of the day price for a given size variant or simple item
  const getDealPriceForVariant = (variantSizeCode?: string) => {
    if (!item) return null;
    const today = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][new Date().getDay()];
    const prodId = (item.id || (item as any)._id || item.productId) as string;

    const deals = (item as any).dealsOfTheDay || (item as any).deals || [];
    const matchedDeal = deals.find(
      (d: any) =>
        d.isActive &&
        d.dayOfWeek?.toLowerCase() === today &&
        (d.productId === prodId ||
          (d.productId as any)?._id === prodId ||
          (d.productId as any)?.id === prodId ||
          !d.productId),
    );

    if (matchedDeal && matchedDeal.sizes) {
      const szConfig = matchedDeal.sizes.find(
        (s: any) =>
          (!variantSizeCode ||
            s.sizeCode === variantSizeCode ||
            s.sizeCode === "regular") &&
          s.isEnabled &&
          typeof s.dealPrice === "number" &&
          s.dealPrice > 0,
      );
      if (szConfig) {
        return szConfig.dealPrice;
      }
    }
    return null;
  };

  const effectiveSizePrice = (variant: ProductVariant) => {
    const dPrice = getDealPriceForVariant(variant.sizeCode);
    return dPrice !== null ? dPrice : variant.price;
  };

  const getBaseProductPrice = () => {
    if (!item) return 0;
    if (selectedSize) {
      return effectiveSizePrice(selectedSize);
    }
    const simpleDealPrice = getDealPriceForVariant();
    return simpleDealPrice !== null ? simpleDealPrice : item.price;
  };

  const livePrice = () => {
    let base = getBaseProductPrice();
    let modSum = 0;
    allActiveGroups.forEach(({ group: g, key }) => {
      const selectedOpts = selections[key] ?? [];
      selectedOpts.forEach((o) => {
        modSum += getOptionPrice(o, g.id, g.name);
      });
    });
    return (base + modSum) * quantity;
  };

  const handleAdd = () => {
    if (!valid()) return;
    const mods: SelectedModifier[] = [];
    allActiveGroups.forEach(({ group: g, key }) => {
      const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id) ?? false;
      const opts = selections[key] ?? [];
      opts.forEach((o) => {
        const isRecipeInc = isRecipeIncludedTopping(g.id, o.id);
        const isDef = o.isDefault && getOptionPrice(o, g.id, g.name) === 0;
        // Only save custom additions (not default included recipe toppings)
        if (!isRecipeInc && !isDef) {
          mods.push({
            groupId: g.id,
            groupName: g.name,
            optionId: o.id,
            optionName: o.name,
            price: getOptionPrice(o, g.id, g.name),
            isRoot,
          });
        }
      });

      // Explicitly removed included toppings
      const removedOptIds = removedIncluded[key] ?? [];
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
          price: effectiveSizePrice(selectedSize),
        }
      : {
          ...item,
          price: getBaseProductPrice(),
        };

    if (editCartItem) {
      updateCartItem(editCartItem.id, itemToAdd, mods, quantity, note);
    } else {
      addToCart(itemToAdd, mods, quantity, note);
    }
    onClose();
  };

  const isSelected = (gid: string, oid: string, parentOpt?: ModifierOption) =>
    (selections[getGroupKey(gid, parentOpt)] ?? []).some((o) => o.id === oid);

  //modifier groups (including child groups)
  const renderModifierGroup = (
    g: ModifierGroup,
    pathName: string = "",
    parentOpt?: ModifierOption,
  ) => {
    const isRoot = item.modifierGroups?.some((rg) => rg.id === g.id);
    const displayName = pathName ? `${pathName} › ${g.name}` : g.name;
    const gKey = getGroupKey(g.id, parentOpt);
    const selectedCount = (selections[gKey] ?? []).length;
    // Detect slot size code (if selectedSize is not present e.g. for deals)
    let slotSize = selectedSize?.sizeCode;
    if (!slotSize) {
      const explicitMapping = item?.modifierSizeCodes?.find(
        (m) => m.groupId === g.id,
      );
      if (explicitMapping?.sizeCode) {
        slotSize = explicitMapping.sizeCode;
      } else {
        const itemStr = (
          (item?.name || "") +
          " " +
          (item?.description || "")
        ).toLowerCase();
        const gLower = displayName.toLowerCase();

        if (gLower.includes("panalicious") || itemStr.includes("panalicious"))
          slotSize = "panalicious";
        else if (
          gLower.includes("large") ||
          gLower.includes('14"') ||
          itemStr.includes("large") ||
          itemStr.includes('14"')
        )
          slotSize = "large";
        else if (
          gLower.includes("small") ||
          gLower.includes('9"') ||
          itemStr.includes("small") ||
          itemStr.includes('9"')
        )
          slotSize = "small";
        else if (
          gLower.includes("personal") ||
          gLower.includes('6"') ||
          itemStr.includes("personal") ||
          itemStr.includes('6"')
        )
          slotSize = "personal";
        else if (
          gLower.includes("xl") ||
          gLower.includes("panormous") ||
          itemStr.includes("xl") ||
          itemStr.includes("panormous")
        )
          slotSize = "xl";
        else if (
          gLower.includes("med") ||
          gLower.includes('12"') ||
          itemStr.includes("med") ||
          itemStr.includes('12"')
        )
          slotSize = "medium";
        else slotSize = "medium";
      }
    }

    const availableOpts = g.options.filter((opt) =>
      isOptionAvailableForSize(opt, slotSize),
    );

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
                isRoot
                  ? "text-[10px] text-neutral-700"
                  : "text-[9.5px] text-brand-primary"
              }`}
            >
              {displayName}
              {g.required && (
                <span className="text-red-500 ml-1 font-bold">*</span>
              )}
            </h4>
            {!isRoot && (
              <p className="text-[8px] text-neutral-400 font-medium">
                Nested Modifier Choice
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {typeof g.freeSelectionLimit === "number" &&
              g.freeSelectionLimit > 0 && (
                <span className="text-[9px] font-700 text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  🎁 First {g.freeSelectionLimit} Free
                </span>
              )}
            <span className="text-[9px] font-600 text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {selectedCount} / {g.maxSelection === 1 ? "1" : g.maxSelection}{" "}
              Selected
            </span>
          </div>
        </div>

        {/* Options Grid */}
        <div
          className={`grid gap-2.5 ${
            isLargeGroup
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : availableOpts.length > 10
                ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
                : availableOpts.length > 4
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-2"
          }`}
        >
          {availableOpts.map((opt) => {
            const sel = isSelected(g.id, opt.id, parentOpt);
            const isCard = g.displayType === "card";
            const optPrice = getOptionPrice(opt, g.id, displayName);
            const included = isIncludedTopping(
              g.id,
              opt.id,
              selections,
              parentOpt,
            );
            const isRemoved = (removedIncluded[gKey] ?? []).includes(opt.id);

            return (
              <div key={opt.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggle(g, opt, parentOpt)}
                  className={`relative flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] w-full ${
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
                        g.displayType === "radio" || g.maxSelection === 1
                          ? "rounded-full"
                          : "rounded"
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

                  <div className="flex-1 min-w-0 pr-1">
                    <p
                      className={`text-[10px] font-600 leading-tight ${
                        isRemoved
                          ? "text-red-700 line-through opacity-80"
                          : "text-neutral-800"
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
                      <div className="text-[9px] font-700 text-brand-primary">
                        {(() => {
                          const dealP = getDealPriceForModifierOption(
                            opt.id,
                            opt.name,
                          );
                          if (dealP !== null && dealP < opt.price) {
                            return (
                              <span className="flex items-center gap-1">
                                <span className="line-through text-neutral-400 font-normal text-[8px]">
                                  +${opt.price.toFixed(2)}
                                </span>
                                <span className="font-bold text-brand-primary">
                                  🔥 +${dealP.toFixed(2)}
                                </span>
                              </span>
                            );
                          }
                          return `+$${optPrice.toFixed(2)}`;
                        })()}
                      </div>
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
          const sel = isSelected(g.id, opt.id, parentOpt);
          if (sel && opt.modifierGroups && opt.modifierGroups.length > 0) {
            return (
              <div key={`child-of-${opt.id}`} className="space-y-3">
                {opt.modifierGroups.map((childG) =>
                  renderModifierGroup(
                    childG,
                    isRoot ? opt.name : `${pathName} › ${opt.name}`,
                    opt,
                  ),
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Helper to render selections hierarchically with original clean UI styling
  const renderSelectedChoicesTree = () => {
    if (!item || !item.modifierGroups) return null;

    const renderChoicesForGroup = (
      gOrId: ModifierGroup | string,
      parentOpt?: ModifierOption,
    ): React.ReactNode => {
      const g = resolveModifierGroup(gOrId);
      if (!g) return null;
      const gId = (g.id || (g as any)._id) as string;

      const selKey = getGroupKey(gId, parentOpt);
      const opts = selections[selKey] ?? [];
      const removedOpts = removedIncluded[selKey] ?? [];
      if (!opts.length && !removedOpts.length) return null;

      const isRootSlot = item.modifierGroups?.some(
        (rg) => (rg.id || (rg as any)._id) === gId,
      );

      return (
        <div key={`${gId}_${parentOpt?.id || "root"}`} className="space-y-0.5">
          {opts.map((o) => {
            const optPrice = getOptionPrice(o, gId, g.name);
            const included = isIncludedTopping(gId, o.id, selections, parentOpt);

            return (
              <div key={o.id} className="space-y-0.5">
                <div
                  className={`flex items-center justify-between gap-1 ${
                    isRootSlot
                      ? "text-brand-primary font-600 text-[10.5px] mt-1.5"
                      : included
                        ? "text-emerald-600 text-[9.5px] pl-2"
                        : "text-neutral-700 text-[9.5px] pl-2"
                  }`}
                >
                  <span className="truncate">{o.name}</span>
                  {included && !isRootSlot ? (
                    <span className="text-[8px] text-emerald-500 font-600 shrink-0">
                      Included
                    </span>
                  ) : optPrice > 0 ? (
                    <span className="text-[9px] text-neutral-400 shrink-0">
                      +${optPrice.toFixed(2)}
                    </span>
                  ) : null}
                </div>

                {/* Child groups for this selected option */}
                {o.modifierGroups && o.modifierGroups.length > 0 && (
                  <div className="space-y-0.5">
                    {o.modifierGroups.map((subG) =>
                      renderChoicesForGroup(subG, o),
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {removedOpts.map((rId) => {
            const optObj = g.options.find((o) => o.id === rId);
            if (!optObj) return null;
            return (
              <div
                key={`removed-${rId}`}
                className="flex items-center justify-between text-red-600 pl-2 text-[9.5px]"
              >
                <span className="truncate">- NO {optObj.name}</span>
                <span className="text-[8px] text-red-500 font-600 uppercase">
                  Removed
                </span>
              </div>
            );
          })}
        </div>
      );
    };

    return item.modifierGroups.map((g) => renderChoicesForGroup(g));
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
          isLargeGroup
            ? "max-w-[95vw] lg:max-w-[92vw] xl:max-w-7xl"
            : "max-w-3xl"
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
            <div className="px-5 pt-3.5 pb-2.5 border-b border-neutral-100 bg-gradient-to-r from-orange-50/40 via-amber-50/20 to-orange-50/40 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-800 text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                  <Pizza size={11} className="text-brand-primary" />
                  Select Pizza Size
                </p>
                {item.variants.some(
                  (v) => getDealPriceForVariant(v.sizeCode) !== null,
                ) && (
                  <span className="text-[8.5px] font-700 text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200/60 shadow-xs">
                    🔥 Deal Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {(() => {
                  const SIZE_ORDER = [
                    "personal",
                    "small",
                    "medium",
                    "large",
                    "panalicious",
                    "xl",
                  ];
                  const sortedVariants = [...item.variants].sort((a, b) => {
                    const idxA = SIZE_ORDER.indexOf(a.sizeCode);
                    const idxB = SIZE_ORDER.indexOf(b.sizeCode);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    return a.price - b.price;
                  });
                  return sortedVariants.map((variant) => {
                    const isSelected =
                      selectedSize?.sizeCode === variant.sizeCode;
                    const dPrice = getDealPriceForVariant(variant.sizeCode);
                    const hasDeal = dPrice !== null;
                    const finalPrice = hasDeal ? dPrice : variant.price;

                    return (
                      <button
                        key={variant.sizeCode}
                        type="button"
                        onClick={() => setSelectedSize(variant)}
                        className={`flex items-center justify-between px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98] min-w-0 ${
                          isSelected
                            ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 ring-2 ring-brand-primary/20"
                            : hasDeal
                              ? "bg-amber-50/80 border-amber-300/90 text-neutral-900 hover:bg-amber-100/80 hover:border-amber-400"
                              : "bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300"
                        }`}
                      >
                        {/* Size Name & Sub-badge */}
                        <div className="flex flex-col items-start min-w-0 pr-0.5">
                          <span className="text-[10px] sm:text-[10.5px] font-700 leading-tight tracking-tight whitespace-nowrap">
                            {variant.sizeName}
                          </span>
                          {/* {hasDeal && (
                            <span
                              className={`text-[7px] sm:text-[7.5px] font-800 uppercase tracking-tight mt-0.5 ${
                                isSelected ? "text-amber-200" : "text-amber-600"
                              }`}
                            >
                              Deal
                            </span>
                          )} */}
                        </div>

                        {/* Price Column */}
                        <div className="flex flex-col items-end shrink-0 ml-1">
                          {hasDeal && (
                            <span
                              className={`text-[8px] line-through font-semibold leading-tight mb-0.5 ${
                                isSelected
                                  ? "text-white/70"
                                  : "text-neutral-400"
                              }`}
                            >
                              ${variant.price.toFixed(2)}
                            </span>
                          )}
                          <span
                            className={`text-[8.5px] sm:text-[9px] px-1.5 py-0.5 rounded-md font-800 leading-none ${
                              isSelected
                                ? "bg-white text-brand-primary shadow-xs"
                                : hasDeal
                                  ? "bg-brand-primary text-white shadow-xs"
                                  : "bg-neutral-100 text-brand-primary"
                            }`}
                          >
                            ${finalPrice.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })()}
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
                        active
                          ? "bg-white/25 text-white"
                          : "bg-brand-primary/10 text-brand-primary"
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
                    Math.min(
                      (item.modifierGroups?.length ?? 1) - 1,
                      activeIdx + 1,
                    ),
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
                ${getBaseProductPrice().toFixed(2)}
              </p>
            </div>

            {/* Selected choices */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-1">
              <p className="text-[9px] font-700 text-neutral-400 uppercase tracking-widest sticky top-0 bg-neutral-50 pb-1 flex items-center justify-between">
                <span>Selected Choices</span>
                <span className="bg-brand-primary-light text-brand-primary px-1.5 py-0.5 rounded-full text-[8px] font-800 ml-2">
                  {allActiveGroups.reduce(
                    (acc, { key }) =>
                      acc +
                      (selections[key] ?? []).length +
                      (removedIncluded[key] ?? []).length,
                    0,
                  )}
                </span>
              </p>
              {renderSelectedChoicesTree()}
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
              {editCartItem
                ? `Update Cart\u00a0·\u00a0$${livePrice().toFixed(2)}`
                : `Add to Cart\u00a0·\u00a0$${livePrice().toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
