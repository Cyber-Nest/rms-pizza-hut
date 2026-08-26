import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "axios";
import {
  MenuItem,
  SelectedModifier,
  CartItem,
  CustomerInfo,
  VehicleInfo,
  TableInfo,
  Order,
  Category,
  SplitPayment,
  PromoApplied,
} from "../types";

interface PosState {
  // ── Menu / Category ─────────────────────────────────────────
  selectedCategory: string;
  search: string;
  sortBy: string;
  categories: Category[];
  menuItems: MenuItem[];
  loadingMenu: boolean;

  // ── Order Type & Context ─────────────────────────────────────
  orderType: "takeout" | "delivery" | "drive-through" | "dine-in";
  selectedTable: TableInfo | null;
  selectedCustomer: CustomerInfo | null;
  selectedVehicle: VehicleInfo | null;

  // ── Cart ─────────────────────────────────────────────────────
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currentOrderSeq: number;
  branchTaxFees: {
    deliveryFee: number;
    gstTaxRate: number;
    pstTaxRate: number;
    hstTaxRate: number;
  };

  // ── Checkout Modal ───────────────────────────────────────────
  checkoutOpen: boolean;

  // ── Payment ──────────────────────────────────────────────────
  paymentTiming: "pay-now" | "pay-later";
  paymentType: "one-time" | "split";
  paymentMethod: "cash" | "card" | "credit" | "debit";
  splitPayments: SplitPayment[];
  cashDenominations: Record<number, number>;
  cashGiven: number;
  changeAmount: number;

  // ── Order Details ────────────────────────────────────────────
  orderSource: "pos" | "online" | "doordash" | "skip" | "ubereats";
  orderTiming: "now" | "later";
  scheduledAt: string | null;
  orderNotes: string;
  skipLastDigits: string;

  // ── Promo / Discount ─────────────────────────────────────────
  appliedPromo: PromoApplied | null;
  manualDiscountType: "percentage" | "flat" | null;
  manualDiscountValue: number;

  // ── Orders ───────────────────────────────────────────────────
  currentOrder: Order | null;
  orders: Order[];
  placingOrder: boolean;
  nextOrderNumber: string;

  // ── Editing Existing Order ──────────────────────────────────
  editingOrderId: string | null;
  editingOrderNumber: string | null;
  updatingOrder: boolean;

  // ── Actions ──────────────────────────────────────────────────
  setCategory: (category: string) => void;
  setSearch: (query: string) => void;
  setSort: (sort: string) => void;
  setOrderType: (
    type: "takeout" | "delivery" | "drive-through" | "dine-in",
  ) => void;
  setCustomer: (customer: CustomerInfo | null) => void;
  setTable: (table: TableInfo | null) => void;
  setVehicle: (vehicle: VehicleInfo | null) => void;
  addToCart: (
    menuItem: MenuItem,
    selectedModifiers: SelectedModifier[],
    quantity?: number,
    note?: string,
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  updateCartItem: (
    originalCartItemId: string,
    menuItem: MenuItem,
    selectedModifiers: SelectedModifier[],
    quantity: number,
    note: string,
  ) => void;
  clearCart: () => void;
  calculateTotals: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  resetCheckoutState: () => void;
  setPaymentTiming: (timing: "pay-now" | "pay-later") => void;
  setPaymentType: (type: "one-time" | "split") => void;
  setPaymentMethod: (method: "cash" | "card" | "credit" | "debit") => void;
  setCashDenomination: (denom: number, qty: number) => void;
  setCashGiven: (amount: number) => void;
  addSplitPayment: (payment: SplitPayment) => void;
  updateSplitPayment: (index: number, payment: SplitPayment) => void;
  removeSplitPayment: (index: number) => void;
  setOrderSource: (
    source: "pos" | "online" | "doordash" | "skip" | "ubereats",
  ) => void;
  setOrderTiming: (timing: "now" | "later") => void;
  setScheduledAt: (date: string | null) => void;
  setOrderNotes: (notes: string) => void;
  setSkipLastDigits: (digits: string) => void;
  applyPromo: (promo: PromoApplied) => void;
  applyManualDiscount: (type: "percentage" | "flat", value: number) => void;
  removeDiscount: () => void;
  placeOrder: () => Promise<Order | null>;
  loadOrderForEditing: (order: Order) => void;
  cancelEditingOrder: () => void;
  updateOrder: () => Promise<Order | null>;
  fetchMenu: () => Promise<void>;
  fetchNextOrderNumber: () => Promise<void>;
}

const TAX_RATE = 0.05; // 5% GST — admin configurable later

const roundToTwo = (num: number): number =>
  Math.round((num + Number.EPSILON) * 100) / 100;

const generateCartItemId = (
  menuItemId: string,
  modifiers: SelectedModifier[],
): string => {
  const sortedOptionIds = modifiers
    .map((m) => m.optionId)
    .sort()
    .join("-");
  return sortedOptionIds ? `${menuItemId}-${sortedOptionIds}` : menuItemId;
};

const DENOMINATIONS = [5, 10, 20, 50, 100];
const defaultDenominations = () =>
  Object.fromEntries(DENOMINATIONS.map((d) => [d, 0]));

const syncDraftCart = (
  cartItems: CartItem[],
  orderType: string,
  customer: CustomerInfo | null,
  totals: { subtotal: number; tax: number; discount: number; total: number },
  skipDeleteIfEmpty = false,
) => {
  if (typeof window === "undefined") return;
  if (cartItems.length === 0) {
    if (!skipDeleteIfEmpty) {
      window.localStorage.removeItem("rms_draft_cart");
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }
  const draft = {
    orderNumber: "#DRAFT",
    orderType,
    customer,
    items: cartItems,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    status: "pending",
    createdAt: new Date().toISOString(),
    paymentTiming: "pay-now",
    paymentStatus: "unpaid",
    payments: [],
  };
  window.localStorage.setItem("rms_draft_cart", JSON.stringify(draft));
  window.dispatchEvent(new Event("storage"));
};

// ── Read draft cart from localStorage at store creation time ──────────────
// This runs BEFORE any component can call setOrderType/setCustomer (which
// would wipe localStorage with an empty cart). Doing it here ensures the
// cart is already populated when those actions fire.
const getInitialCartState = (): Partial<PosState> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("rms_draft_cart");
    if (!raw) return {};
    const draft = JSON.parse(raw);
    if (
      !draft ||
      draft.status !== "pending" ||
      !Array.isArray(draft.items) ||
      draft.items.length === 0
    ) return {};

    const restoredItems: CartItem[] = draft.items.map((item: CartItem) => ({
      ...item,
      id: item.id || item.menuItemId,
      selectedModifiers: item.selectedModifiers || [],
      quantity: item.quantity || 1,
      totalPrice: item.totalPrice || item.basePrice || 0,
    }));

    return {
      cartItems: restoredItems,
      orderType: (draft.orderType as PosState["orderType"]) || "takeout",
      selectedCustomer:
        draft.customer?.name && draft.customer.name !== "No Name"
          ? draft.customer
          : null,
      subtotal: draft.subtotal || 0,
      tax: draft.tax || 0,
      discount: draft.discount || 0,
      total: draft.total || 0,
    };
  } catch {
    return {};
  }
};

const getInitialCategoryState = (): string => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("rms_selected_category");
      if (saved) return saved;
    } catch (e) {}
  }
  return "all";
};

export const usePosStore = create<PosState>((set, get) => ({
  // ── Initial State ────────────────────────────────────────────
  selectedCategory: getInitialCategoryState(),
  search: "",
  sortBy: "default",
  orderType: "takeout",
  selectedTable: null,
  selectedCustomer: null,
  selectedVehicle: null,
  cartItems: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  currentOrderSeq: 124,
  branchTaxFees: {
    deliveryFee: 4.99,
    gstTaxRate: 5,
    pstTaxRate: 0,
    hstTaxRate: 0,
  },
  categories: [],
  menuItems: [],
  loadingMenu: true,
  checkoutOpen: false,
  paymentTiming: "pay-now",
  paymentType: "one-time",
  paymentMethod: "cash",
  splitPayments: [],
  cashDenominations: defaultDenominations(),
  cashGiven: 0,
  changeAmount: 0,
  orderSource: "pos",
  orderTiming: "now",
  scheduledAt: null,
  orderNotes: "",
  skipLastDigits: "",
  appliedPromo: null,
  manualDiscountType: null,
  manualDiscountValue: 0,
  currentOrder: null,
  orders: [],
  placingOrder: false,
  nextOrderNumber: "",
  editingOrderId: null,
  editingOrderNumber: null,
  updatingOrder: false,

  // ── Restore cart from localStorage (runs before any component action) ──
  ...getInitialCartState(),

  // ── Menu ────────────────────────────────────────────────────
  setCategory: (category) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("rms_selected_category", category);
      } catch (e) {}
    }
    set({ selectedCategory: category });
  },
  setSearch: (query) => set({ search: query }),
  setSort: (sort) => set({ sortBy: sort }),

  setOrderType: (type) => {
    set({ orderType: type });
    get().calculateTotals();
    get().fetchNextOrderNumber();
    const {
      cartItems,
      orderType,
      selectedCustomer,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(cartItems, orderType, selectedCustomer, {
      subtotal,
      tax,
      discount,
      total,
    });
  },

  setCustomer: (customer) => {
    set({ selectedCustomer: customer });
    const {
      cartItems,
      orderType,
      selectedCustomer: curCust,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(cartItems, orderType, curCust, {
      subtotal,
      tax,
      discount,
      total,
    });
  },
  setTable: (table) => set({ selectedTable: table }),
  setVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  // ── Cart ─────────────────────────────────────────────────────
  addToCart: (menuItem, selectedModifiers, quantity = 1, note = "") => {
    const { cartItems } = get();
    const cartItemId = generateCartItemId(menuItem.id, selectedModifiers);
    const modifierSum = selectedModifiers.reduce(
      (sum, mod) => sum + mod.price,
      0,
    );
    const itemUnitCost = menuItem.price + modifierSum;
    const existingIndex = cartItems.findIndex((item) => item.id === cartItemId);
    let updatedCartItems = [...cartItems];

    if (existingIndex > -1) {
      const item = updatedCartItems[existingIndex];
      const newQty = item.quantity + quantity;
      updatedCartItems[existingIndex] = {
        ...item,
        quantity: newQty,
        totalPrice: roundToTwo(itemUnitCost * newQty),
        note: note || item.note,
      };
    } else {
      const catObj = get().categories.find(
        (c) => c.id === menuItem.categoryId || c.name === menuItem.categoryId,
      );
      const categoryName =
        catObj?.name ||
        (menuItem as any).categoryName ||
        (menuItem as any).category ||
        "";

      let currentRootStation: any = menuItem.kitchenLabel || "make_table";
      const stampedModifiers = selectedModifiers.map((mod) => {
        const modLabelMapping = (menuItem.modifierKitchenLabels || []).find((m) => m.groupId === mod.groupId);
        const mappedLabel = modLabelMapping?.kitchenLabel || mod.kitchenLabel;
        const isRootVal = mod.isRoot !== undefined ? mod.isRoot : true;
        
        if (isRootVal) {
          if (mappedLabel) currentRootStation = mappedLabel;
        }

        const finalLabel = mappedLabel || currentRootStation || undefined;
        return {
          ...mod,
          kitchenLabel: finalLabel,
        };
      });

      const newItem: CartItem = {
        id: cartItemId,
        menuItemId: menuItem.id,
        categoryId: menuItem.categoryId,
        categoryName: categoryName,
        name: menuItem.name,
        image: menuItem.image,
        basePrice: menuItem.price,
        selectedModifiers: stampedModifiers,
        quantity,
        totalPrice: roundToTwo(itemUnitCost * quantity),
        note,
        kitchenLabel: menuItem.kitchenLabel || "make_table",
      };
      updatedCartItems.push(newItem);
    }

    set({ cartItems: updatedCartItems });
    get().calculateTotals();
    const {
      cartItems: curItems,
      orderType: curType,
      selectedCustomer: curCust,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(curItems, curType, curCust, {
      subtotal,
      tax,
      discount,
      total,
    });
    toast.success(`${menuItem.name} added to cart`);
  },

  removeFromCart: (cartItemId) => {
    const item = get().cartItems.find((i) => i.id === cartItemId);
    set({ cartItems: get().cartItems.filter((i) => i.id !== cartItemId) });
    get().calculateTotals();
    const {
      cartItems: curItems,
      orderType: curType,
      selectedCustomer: curCust,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(curItems, curType, curCust, {
      subtotal,
      tax,
      discount,
      total,
    });
    if (item) toast.success(`${item.name} removed from cart`);
  },

  increaseQuantity: (cartItemId) => {
    const updated = get().cartItems.map((item) => {
      if (item.id === cartItemId) {
        const newQty = item.quantity + 1;
        const modSum = item.selectedModifiers.reduce((s, m) => s + m.price, 0);
        return {
          ...item,
          quantity: newQty,
          totalPrice: roundToTwo((item.basePrice + modSum) * newQty),
        };
      }
      return item;
    });
    set({ cartItems: updated });
    get().calculateTotals();
    const {
      cartItems: curItems,
      orderType: curType,
      selectedCustomer: curCust,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(curItems, curType, curCust, {
      subtotal,
      tax,
      discount,
      total,
    });
  },

  decreaseQuantity: (cartItemId) => {
    const { cartItems } = get();
    const existing = cartItems.find((item) => item.id === cartItemId);
    if (!existing) return;
    let updated: CartItem[];
    if (existing.quantity <= 1) {
      updated = cartItems.filter((item) => item.id !== cartItemId);
    } else {
      updated = cartItems.map((item) => {
        if (item.id === cartItemId) {
          const newQty = item.quantity - 1;
          const modSum = item.selectedModifiers.reduce(
            (s, m) => s + m.price,
            0,
          );
          return {
            ...item,
            quantity: newQty,
            totalPrice: roundToTwo((item.basePrice + modSum) * newQty),
          };
        }
        return item;
      });
    }
    set({ cartItems: updated });
    get().calculateTotals();
    const {
      cartItems: curItems,
      orderType: curType,
      selectedCustomer: curCust,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(curItems, curType, curCust, {
      subtotal,
      tax,
      discount,
      total,
    });
  },
  updateCartItem: (originalCartItemId, menuItem, selectedModifiers, quantity, note) => {
    const { cartItems } = get();
    const originalIndex = cartItems.findIndex((i) => i.id === originalCartItemId);
    if (originalIndex === -1) return;

    const modifierSum = selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
    const itemUnitCost = menuItem.price + modifierSum;
    const newCartItemId = generateCartItemId(menuItem.id, selectedModifiers);

    const catObj = get().categories.find(
      (c) => c.id === menuItem.categoryId || c.name === menuItem.categoryId,
    );
    const categoryName =
      catObj?.name ||
      (menuItem as any).categoryName ||
      (menuItem as any).category ||
      cartItems[originalIndex].categoryName ||
      "";

    let currentRootStation: any = menuItem.kitchenLabel || "make_table";
    const stampedModifiers = selectedModifiers.map((mod) => {
      const modLabelMapping = (menuItem.modifierKitchenLabels || []).find((m) => m.groupId === mod.groupId);
      const mappedLabel = modLabelMapping?.kitchenLabel || mod.kitchenLabel;
      const isRootVal = mod.isRoot !== undefined ? mod.isRoot : true;
      
      if (isRootVal) {
        if (mappedLabel) currentRootStation = mappedLabel;
      }

      const finalLabel = mappedLabel || currentRootStation || undefined;
      return {
        ...mod,
        kitchenLabel: finalLabel,
      };
    });

    const updatedItem: CartItem = {
      id: newCartItemId,
      menuItemId: menuItem.id,
      categoryId: menuItem.categoryId,
      categoryName,
      name: menuItem.name,
      image: menuItem.image,
      basePrice: menuItem.price,
      selectedModifiers: stampedModifiers,
      quantity,
      totalPrice: roundToTwo(itemUnitCost * quantity),
      note,
      kitchenLabel: menuItem.kitchenLabel || cartItems[originalIndex].kitchenLabel || "make_table",
    };

    // Replace at same position
    const updatedCartItems = [...cartItems];
    updatedCartItems.splice(originalIndex, 1, updatedItem);

    // If new id conflicts with another item (different position), merge quantities
    const conflictIndex = updatedCartItems.findIndex(
      (i, idx) => i.id === newCartItemId && idx !== originalIndex
    );
    let finalCartItems = updatedCartItems;
    if (conflictIndex > -1) {
      const merged = {
        ...updatedCartItems[conflictIndex],
        quantity: updatedCartItems[conflictIndex].quantity + quantity,
        totalPrice: roundToTwo(itemUnitCost * (updatedCartItems[conflictIndex].quantity + quantity)),
      };
      finalCartItems = updatedCartItems.filter((_, idx) => idx !== originalIndex);
      finalCartItems[conflictIndex > originalIndex ? conflictIndex - 1 : conflictIndex] = merged;
    }

    set({ cartItems: finalCartItems });
    get().calculateTotals();
    const {
      cartItems: curItems,
      orderType: curType,
      selectedCustomer: curCust,
      subtotal,
      tax,
      discount,
      total,
    } = get();
    syncDraftCart(curItems, curType, curCust, { subtotal, tax, discount, total });
    toast.success(`${menuItem.name} updated!`);
  },

  clearCart: () => {
    set({
      editingOrderId: null,
      editingOrderNumber: null,
      cartItems: [],
      selectedCustomer: null,
      selectedTable: null,
      selectedVehicle: null,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      appliedPromo: null,
      manualDiscountType: null,
      manualDiscountValue: 0,
    });
    syncDraftCart([], "takeout", null, {
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
    });
  },

  calculateTotals: () => {
    const {
      cartItems,
      appliedPromo,
      manualDiscountType,
      manualDiscountValue,
      orderType,
      branchTaxFees,
    } = get();
    const subtotal = roundToTwo(
      cartItems.reduce((sum, item) => sum + item.totalPrice, 0),
    );

    let discount = 0;
    if (appliedPromo) {
      discount = appliedPromo.discountAmount;
    } else if (manualDiscountType === "percentage") {
      discount = roundToTwo((subtotal * manualDiscountValue) / 100);
    } else if (manualDiscountType === "flat") {
      discount = Math.min(manualDiscountValue, subtotal);
    }
    discount = roundToTwo(discount);

    const gst = Number(branchTaxFees?.gstTaxRate ?? 5);
    const pst = Number(branchTaxFees?.pstTaxRate ?? 0);
    const hst = Number(branchTaxFees?.hstTaxRate ?? 0);
    const totalTaxRatePercent =
      (isNaN(gst) ? 5 : gst) + (isNaN(pst) ? 0 : pst) + (isNaN(hst) ? 0 : hst);
    const effectiveTaxRate = totalTaxRatePercent / 100;

    const rawDeliveryFee = Number(branchTaxFees?.deliveryFee ?? 4.99);
    const deliveryFee =
      orderType === "delivery"
        ? isNaN(rawDeliveryFee)
          ? 4.99
          : rawDeliveryFee
        : 0;

    const taxableAmount = Math.max(0, subtotal - discount) + deliveryFee;
    const tax = roundToTwo(taxableAmount * effectiveTaxRate);
    const total = roundToTwo(taxableAmount + tax);

    set({ subtotal, tax, discount, total });
  },

  // ── Checkout ─────────────────────────────────────────────────
  openCheckout: () => set({ checkoutOpen: true }),
  closeCheckout: () => set({ checkoutOpen: false }),

  resetCheckoutState: () =>
    set({
      checkoutOpen: false,
      paymentTiming: "pay-now",
      paymentType: "one-time",
      paymentMethod: "cash",
      splitPayments: [],
      cashDenominations: defaultDenominations(),
      cashGiven: 0,
      changeAmount: 0,
      orderSource: "pos",
      orderTiming: "now",
      scheduledAt: null,
      orderNotes: "",
      skipLastDigits: "",
      appliedPromo: null,
      manualDiscountType: null,
      manualDiscountValue: 0,
    }),

  // ── Payment ──────────────────────────────────────────────────
  setPaymentTiming: (timing) => set({ paymentTiming: timing }),
  setPaymentType: (type) =>
    set({
      paymentType: type,
      splitPayments: [],
      cashDenominations: defaultDenominations(),
      cashGiven: 0,
      changeAmount: 0,
    }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setCashDenomination: (denom, qty) => {
    const { cashDenominations, total } = get();
    const updated = { ...cashDenominations, [denom]: Math.max(0, qty) };
    const cashGiven = Object.entries(updated).reduce(
      (sum, [d, q]) => sum + Number(d) * q,
      0,
    );
    const changeAmount = roundToTwo(Math.max(0, cashGiven - total));
    set({
      cashDenominations: updated,
      cashGiven: roundToTwo(cashGiven),
      changeAmount,
    });
  },

  setCashGiven: (amount) => {
    const { total } = get();
    set({
      cashGiven: amount,
      cashDenominations: defaultDenominations(),
      changeAmount: roundToTwo(Math.max(0, amount - total)),
    });
  },

  addSplitPayment: (payment) =>
    set({ splitPayments: [...get().splitPayments, payment] }),
  updateSplitPayment: (index, payment) => {
    const updated = [...get().splitPayments];
    updated[index] = payment;
    set({ splitPayments: updated });
  },
  removeSplitPayment: (index) =>
    set({ splitPayments: get().splitPayments.filter((_, i) => i !== index) }),

  // ── Order Details ────────────────────────────────────────────
  setOrderSource: (source) => {
    set({ orderSource: source });
    // For 3rd party platforms, auto-set payment to pay-now one-time (Account Pay)
    if (["doordash", "skip", "ubereats"].includes(source)) {
      set({
        paymentTiming: "pay-now",
        paymentType: "one-time",
        paymentMethod: "cash",
      });
    }
  },
  setOrderTiming: (timing) => set({ orderTiming: timing }),
  setScheduledAt: (date) => set({ scheduledAt: date }),
  setOrderNotes: (notes) => set({ orderNotes: notes }),
  setSkipLastDigits: (digits) => set({ skipLastDigits: digits }),

  // ── Promo / Discount ─────────────────────────────────────────
  applyPromo: (promo) => {
    set({
      appliedPromo: promo,
      manualDiscountType: null,
      manualDiscountValue: 0,
    });
    get().calculateTotals();
    toast.success(
      `Promo "${promo.code}" applied! -$${promo.discountAmount.toFixed(2)}`,
    );
  },

  applyManualDiscount: (type, value) => {
    set({
      manualDiscountType: type,
      manualDiscountValue: value,
      appliedPromo: null,
    });
    get().calculateTotals();
    toast.success("Discount applied!");
  },

  removeDiscount: () => {
    set({
      appliedPromo: null,
      manualDiscountType: null,
      manualDiscountValue: 0,
    });
    get().calculateTotals();
    toast.success("Discount removed.");
  },

  // ── Place Order (API) ─────────────────────────────────────────
  placeOrder: async () => {
    const {
      cartItems,
      orderType,
      orderSource,
      selectedCustomer,
      subtotal,
      tax,
      discount,
      total,
      appliedPromo,
      manualDiscountType,
      paymentTiming,
      paymentType,
      paymentMethod,
      splitPayments,
      cashGiven,
      changeAmount,
      orderTiming,
      scheduledAt,
      orderNotes,
      skipLastDigits,
      orders,
      currentOrderSeq,
    } = get();

    if (cartItems.length === 0) {
      toast.error("Cart is empty.");
      return null;
    }

    set({ placingOrder: true });

    let payments: SplitPayment[] = [];
    if (paymentTiming === "pay-now") {
      if (paymentType === "split") {
        payments = splitPayments;
      } else if (["doordash", "skip", "ubereats"].includes(orderSource)) {
        // 3rd party orders: payment goes to Account Pay
        // Send as cash method - backend routes to accountPay based on orderSource
        payments = [
          {
            method: "cash",
            amount: total,
            cashGiven: 0,
            changeGiven: 0,
          },
        ];
      } else {
        payments = [
          {
            method: paymentMethod,
            amount: total,
            cashGiven: paymentMethod === "cash" ? cashGiven : 0,
            changeGiven: paymentMethod === "cash" ? changeAmount : 0,
          },
        ];
      }
    }

    const discountType = appliedPromo
      ? "promo"
      : (manualDiscountType ?? "none");
    const promoCode = appliedPromo ? appliedPromo.code : "";

    let branchId: string | undefined = undefined;
    let branchName: string | undefined = undefined;
    let branchCode: string | undefined = undefined;
    let placedBy: string = "Manager";
    if (typeof window !== "undefined") {
      const rawBranch = localStorage.getItem("rms_branch");
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          branchId = b._id || b.id || b.branchId;
          branchName = b.name;
          branchCode = b.code;
        } catch (e) {}
      }
      const rawEmp = localStorage.getItem("rms_active_employee");
      if (rawEmp) {
        try {
          const emp = JSON.parse(rawEmp);
          if (emp && emp.name) placedBy = emp.name;
        } catch (e) {}
      }
    }

    const rawDeliveryFee = Number(get().branchTaxFees?.deliveryFee ?? 4.99);
    const deliveryFee =
      orderType === "delivery"
        ? isNaN(rawDeliveryFee)
          ? 4.99
          : rawDeliveryFee
        : 0;

    const payload = {
      orderType,
      orderSource,
      placedBy,
      branchId: branchId || undefined,
      branchName: branchName || undefined,
      branchCode: branchCode || undefined,
      items: cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        image: item.image || "",
        basePrice: item.basePrice,
        selectedSize: item.selectedSize || undefined,
        selectedModifiers: item.selectedModifiers,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        note: item.note || "",
        kitchenLabel: item.kitchenLabel || "chicken",
      })),
      subtotal,
      taxRate: TAX_RATE,
      tax,
      deliveryFee,
      discount,
      discountType,
      promoCode,
      total,
      paymentTiming,
      paymentType,
      payments,
      orderTiming,
      scheduledAt: orderTiming === "later" ? scheduledAt : null,
      customer:
        orderSource === "skip"
          ? { name: skipLastDigits, phone: "", email: "" }
          : selectedCustomer &&
              selectedCustomer.name &&
              selectedCustomer.name.trim()
            ? selectedCustomer
            : { name: "No Name", phone: "", email: "" },
      notes: orderNotes,
      driverNotes: selectedCustomer?.driverNotes || "",
    };

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/orders`, payload);

      if (res.data.success) {
        const newOrder = res.data.data as Order;
        set({
          orders: [...orders, newOrder],
          currentOrder: newOrder,
          currentOrderSeq: currentOrderSeq + 1,
          cartItems: [],
          selectedCustomer: null,
          selectedTable: null,
          selectedVehicle: null,
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          placingOrder: false,
        });
        syncDraftCart([], "takeout", null, {
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
        });
        get().resetCheckoutState();
        get().fetchNextOrderNumber();
        return newOrder;
      }
      throw new Error(res.data.message || "Failed to place order.");
    } catch (error: unknown) {
      set({ placingOrder: false });
      const message =
        error instanceof Error
          ? error.message
          : "Network error. Please try again.";
      toast.error(message);
      return null;
    }
  },

  // ── Load Order For Editing ───────────────────────────────────
  loadOrderForEditing: (order) => {
    const restoredItems: CartItem[] = (order.items || []).map((item) => {
      const modifierSum = (item.selectedModifiers || []).reduce(
        (sum, mod) => sum + mod.price,
        0,
      );
      const unitPrice =
        item.basePrice ||
        roundToTwo((item.totalPrice || 0) / (item.quantity || 1) - modifierSum);
      return {
        id: generateCartItemId(item.menuItemId, item.selectedModifiers || []),
        menuItemId: item.menuItemId,
        categoryId: item.categoryId || "",
        categoryName: item.categoryName || "",
        name: item.name,
        image: item.image || "",
        basePrice: unitPrice,
        selectedModifiers: item.selectedModifiers || [],
        quantity: item.quantity || 1,
        totalPrice:
          item.totalPrice ||
          roundToTwo((unitPrice + modifierSum) * (item.quantity || 1)),
        note: item.note || "",
        kitchenLabel: item.kitchenLabel || "make_table",
      };
    });

    set({
      editingOrderId: order._id,
      editingOrderNumber: order.orderNumber,
      cartItems: restoredItems,
      orderType: (order.orderType as PosState["orderType"]) || "takeout",
      selectedCustomer:
        order.customer &&
        order.customer.name &&
        order.customer.name !== "No Name"
          ? order.customer
          : null,
      orderNotes: order.notes || "",
    });

    get().calculateTotals();
    toast.success(`Order ${order.orderNumber} loaded for editing`);
  },

  // ── Cancel Editing Mode ───────────────────────────────────────
  cancelEditingOrder: () => {
    set({
      editingOrderId: null,
      editingOrderNumber: null,
      cartItems: [],
      selectedCustomer: null,
      selectedTable: null,
      selectedVehicle: null,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      orderNotes: "",
    });
    get().calculateTotals();
    toast("Order editing cancelled");
  },

  // ── Update Order (API) ────────────────────────────────────────
  updateOrder: async () => {
    const {
      editingOrderId,
      editingOrderNumber,
      cartItems,
      orderType,
      selectedCustomer,
      subtotal,
      tax,
      discount,
      total,
      orderNotes,
      orders,
    } = get();

    if (!editingOrderId) {
      toast.error("No active order being edited.");
      return null;
    }

    if (cartItems.length === 0) {
      toast.error("Cart cannot be empty for an existing order.");
      return null;
    }

    set({ updatingOrder: true });

    const rawDeliveryFee = Number(get().branchTaxFees?.deliveryFee ?? 4.99);
    const deliveryFee =
      orderType === "delivery"
        ? isNaN(rawDeliveryFee)
          ? 4.99
          : rawDeliveryFee
        : 0;

    const payload = {
      orderType,
      items: cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        image: item.image || "",
        basePrice: item.basePrice,
        selectedSize: item.selectedSize || undefined,
        selectedModifiers: item.selectedModifiers,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        note: item.note || "",
        kitchenLabel: item.kitchenLabel || "chicken",
      })),
      subtotal,
      tax,
      deliveryFee,
      discount,
      total,
      notes: orderNotes,
      customer:
        selectedCustomer &&
        selectedCustomer.name &&
        selectedCustomer.name.trim()
          ? selectedCustomer
          : { name: "No Name", phone: "", email: "" },
    };

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(
        `${apiUrl}/orders/${editingOrderId}`,
        payload,
      );

      if (res.data.success) {
        const updatedOrder = res.data.data as Order;
        const updatedOrdersList = orders.map((o) =>
          o._id === editingOrderId ? updatedOrder : o,
        );

        set({
          orders: updatedOrdersList,
          currentOrder: updatedOrder,
          editingOrderId: null,
          editingOrderNumber: null,
          cartItems: [],
          selectedCustomer: null,
          selectedTable: null,
          selectedVehicle: null,
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          orderNotes: "",
          updatingOrder: false,
          checkoutOpen: false,
        });

        syncDraftCart([], "takeout", null, {
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
        });
        toast.success(
          `Order ${editingOrderNumber || ""} updated successfully!`,
        );
        return updatedOrder;
      }
      throw new Error(res.data.message || "Failed to update order.");
    } catch (error: unknown) {
      set({ updatingOrder: false });
      const message =
        error instanceof Error
          ? error.message
          : "Network error while updating order.";
      toast.error(message);
      return null;
    }
  },

  // ── Fetch Menu ───────────────────────────────────────────────
  fetchMenu: async () => {
    set({ loadingMenu: true });
    get().fetchNextOrderNumber(); // Load next order number on startup
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== "undefined") {
        const rawBranch = localStorage.getItem("rms_branch");
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      // Also load branch settings for tax and delivery fee calculation
      if (branchId) {
        axios
          .get(`${apiUrl}/branches/settings`, { params: { branchId } })
          .then((settingsRes) => {
            if (
              settingsRes.data?.success &&
              settingsRes.data?.data?.taxFeesSettings
            ) {
              const tf = settingsRes.data.data.taxFeesSettings;
              set({
                branchTaxFees: {
                  deliveryFee: Number(tf.deliveryFee ?? 4.99),
                  gstTaxRate: Number(tf.gstTaxRate ?? 5),
                  pstTaxRate: Number(tf.pstTaxRate ?? 0),
                  hstTaxRate: Number(tf.hstTaxRate ?? 0),
                },
              });
              get().calculateTotals();
            }
          })
          .catch(() => {});
      }

      const res = await axios.get(`${apiUrl}/menu/pos-feed`, {
        params: branchId ? { branchId } : {},
      });
      if (res.data.success) {
        const fetchedCategories: Category[] = res.data.data.categories || [];
        let savedCat = get().selectedCategory;
        if (typeof window !== "undefined") {
          try {
            const localCat = localStorage.getItem("rms_selected_category");
            if (localCat) savedCat = localCat;
          } catch (e) {}
        }

        const exists = fetchedCategories.some(
          (c) => c.id === savedCat || (c as any)._id === savedCat
        );
        const defaultCatId = exists
          ? savedCat
          : fetchedCategories.length > 0
          ? (fetchedCategories[0].id || (fetchedCategories[0] as any)._id)
          : "";

        const dealsOfTheDay = res.data.data.dealsOfTheDay || [];
        const menuItems = (res.data.data.menuItems || []).map((item: any) => ({
          ...item,
          dealsOfTheDay,
        }));

        set({
          categories: fetchedCategories,
          menuItems,
          selectedCategory: defaultCatId,
        });
      }
    } catch {
      //dummy data when backend data is unavailable
      // const { categories: staticCats } = require("../data/categories");
      // const { menuItems: staticItems } = require("../data/menuItems");
      // set({ categories: staticCats, menuItems: staticItems });
    } finally {
      set({ loadingMenu: false });
    }
  },

  // ── Fetch Next Order Number ──────────────────────────────────
  fetchNextOrderNumber: async () => {
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== "undefined") {
        const rawBranch = localStorage.getItem("rms_branch");
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const { orderType } = get();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/orders/next-number`, {
        params: {
          type: orderType,
          ...(branchId ? { branchId } : {}),
        },
      });
      if (res.data.success) {
        set({ nextOrderNumber: res.data.data });
      }
    } catch {
      set({ nextOrderNumber: "101" });
    }
  },
}));
