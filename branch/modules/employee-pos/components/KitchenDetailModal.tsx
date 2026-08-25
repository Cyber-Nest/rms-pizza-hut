"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  Printer,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  FileText,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { Order } from "../types";
import ThermalReceipt from "./ThermalReceipt";

// Read defaultTimeMinutes from saved branch settings (localStorage)
const getBranchDefaultPrepTime = (): number => {
  try {
    if (typeof window === "undefined") return 15;
    const raw = localStorage.getItem("rms_branch_settings");
    if (raw) {
      const s = JSON.parse(raw);
      const mins = Number(s?.mainSettings?.defaultTimeMinutes);
      if (mins > 0) return mins;
    }
    // Fallback: read from branch object itself
    const rawBranch = localStorage.getItem("rms_branch");
    if (rawBranch) {
      const b = JSON.parse(rawBranch);
      const mins = Number(b?.settings?.mainSettings?.defaultTimeMinutes);
      if (mins > 0) return mins;
    }
  } catch (e) {}
  return 15;
};

interface KitchenDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: () => void;
  categoryFilter?: string;
}

interface GroupedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  isRoot: boolean;
  quantity: number;
}

const getGroupedModifiers = (modifiers: any[]): GroupedModifier[] => {
  if (!modifiers) return [];
  const result: GroupedModifier[] = [];

  modifiers.forEach((mod) => {
    const isRootVal =
      mod.isRoot !== undefined
        ? mod.isRoot
        : !(
            mod.groupName?.toLowerCase().includes("mix") ||
            mod.groupName?.toLowerCase().includes("white & dark")
          );

    if (isRootVal) {
      const existingRoot = result.find(
        (g) => g.isRoot && g.groupId === mod.groupId && g.optionId === mod.optionId,
      );
      if (existingRoot) {
        existingRoot.quantity += 1;
      } else {
        result.push({
          groupId: mod.groupId,
          groupName: mod.groupName,
          optionId: mod.optionId,
          optionName: mod.optionName,
          price: mod.price,
          isRoot: true,
          quantity: 1,
        });
      }
    } else {
      let lastRootIndex = -1;
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].isRoot) {
          lastRootIndex = i;
          break;
        }
      }

      const existingSub = result
        .slice(lastRootIndex + 1)
        .find(
          (g) => !g.isRoot && g.groupId === mod.groupId && g.optionId === mod.optionId,
        );

      if (existingSub) {
        existingSub.quantity += 1;
      } else {
        result.push({
          groupId: mod.groupId,
          groupName: mod.groupName,
          optionId: mod.optionId,
          optionName: mod.optionName,
          price: mod.price,
          isRoot: false,
          quantity: 1,
        });
      }
    }
  });

  return result;
};

export default function KitchenDetailModal({
  order,
  onClose,
  onStatusChange,
  categoryFilter = "all",
}: KitchenDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [localOrder, setLocalOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const getModStation = (mod: any): "make_table" | "wings_station" | null => {
    if (mod.kitchenLabel) {
      if (mod.kitchenLabel === "wings_station" || mod.kitchenLabel === "chicken") return "wings_station";
      if (mod.kitchenLabel === "make_table" || mod.kitchenLabel === "pizza") return "make_table";
    }
    const name = ((mod.groupName || "") + " " + (mod.optionName || "")).toLowerCase();
    if (
      name.includes("wing") ||
      name.includes("side") ||
      name.includes("chicken") ||
      name.includes("dessert") ||
      name.includes("dip") ||
      name.includes("frosting") ||
      name.includes("brownie")
    ) {
      return "wings_station";
    }
    if (name.includes("pizza")) {
      return "make_table";
    }
    return null;
  };

  const getFilteredItemForModal = (item: any): any | null => {
    if (
      !categoryFilter ||
      categoryFilter === "all" ||
      categoryFilter === "cut_station"
    ) {
      return item;
    }
    const targetStation =
      categoryFilter === "wings_station" || categoryFilter === "chicken"
        ? "wings_station"
        : "make_table";

    const getItemBaseLabel = (i: any): "make_table" | "wings_station" => {
      if (i.kitchenLabel === "wings_station" || i.kitchenLabel === "chicken")
        return "wings_station";
      if (i.kitchenLabel === "make_table" || i.kitchenLabel === "pizza")
        return "make_table";
      return "make_table";
    };

    const baseLabel = getItemBaseLabel(item);
    const mods = item.selectedModifiers || [];
    const hasExplicitModLabels = mods.some(
      (m: any) => getModStation(m) !== null,
    );

    if (!hasExplicitModLabels) {
      return baseLabel === targetStation ? item : null;
    }

    let currentRootStation: "make_table" | "wings_station" = baseLabel;
    const matchingMods = mods.filter((m: any) => {
      let s = getModStation(m);
      const isRootVal =
        m.isRoot !== undefined
          ? m.isRoot
          : !(
              m.groupName?.toLowerCase().includes("mix") ||
              m.groupName?.toLowerCase().includes("white & dark")
            );

      if (isRootVal) {
        if (s) {
          currentRootStation = s;
        } else {
          currentRootStation = baseLabel;
        }
      } else {
        if (!s) {
          s = currentRootStation;
        }
      }

      const finalStation = s || currentRootStation;
      return finalStation === targetStation;
    });

    const isBaseStationMatch = baseLabel === targetStation;
    const hasMatchingMods = matchingMods.length > 0;

    if (isBaseStationMatch || hasMatchingMods) {
      return {
        ...item,
        selectedModifiers: matchingMods,
      };
    }

    return null;
  };

  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  // Initialize due date based on database order data (dueAt or createdAt)
  useEffect(() => {
    if (localOrder) {
      const baseTime = localOrder.dueAt
        ? new Date(localOrder.dueAt)
        : localOrder.scheduledAt
          ? new Date(localOrder.scheduledAt)
          : new Date(localOrder.createdAt);

      // If it has no dueAt (older order), default it to baseTime + configured prep time
      const prepMins = getBranchDefaultPrepTime();
      const currentDue = localOrder.dueAt
        ? baseTime
        : new Date(baseTime.getTime() + prepMins * 60000);
      setDueDate(currentDue);
    } else {
      setDueDate(null);
    }
  }, [localOrder]);

  if (!localOrder) return null;

  const isDraft = localOrder.orderNumber === "#DRAFT";

  // Handle due time adjustments (- 5 mins / + 5 mins) and save to database
  const adjustDueTime = async (mins: number) => {
    if (isDraft || !dueDate || !localOrder) return;
    const newDueDate = new Date(dueDate.getTime() + mins * 60000);
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/due-time`,
        { dueAt: newDueDate.toISOString() },
      );
      if (res.data.success) {
        setDueDate(newDueDate);
        setLocalOrder({
          ...localOrder,
          dueAt: newDueDate.toISOString(),
        });
        toast.success(
          `Preparation time adjusted by ${mins > 0 ? "+" : ""}${mins} minutes`,
        );
        onStatusChange(); // Reload dashboard so timer updates
      } else {
        throw new Error(res.data.message || "Time update failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to adjust due time",
      );
    } finally {
      setUpdating(false);
    }
  };

  // Status transitions
  const handleTransition = async (
    nextStatus: "preparing" | "in_oven" | "ready" | "completed",
  ) => {
    if (isDraft || !localOrder) return;

    setUpdating(true);
    try {
      let activeEmpName = "Manager";
      if (typeof window !== "undefined") {
        const rawEmp = localStorage.getItem("rms_active_employee");
        if (rawEmp) {
          try {
            const emp = JSON.parse(rawEmp);
            if (emp && emp.name) activeEmpName = emp.name;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const note = `Kitchen updated status to ${nextStatus}`;
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/status`,
        {
          status: nextStatus,
          note,
          userName: activeEmpName,
          station: categoryFilter,
        },
      );

      if (res.data.success) {
        const readyText =
          localOrder.orderType === "delivery"
            ? "Ready for Delivery"
            : "Ready for Pickup";
        const statusMsg =
          nextStatus === "preparing"
            ? "Preparing"
            : nextStatus === "in_oven"
              ? "In the Oven"
              : nextStatus === "ready"
                ? readyText
                : "Completed";
        toast.success(`Order transitioned to ${statusMsg}`);

        // Update local status and history
        const updatedHistory = [...(localOrder.statusHistory || [])];
        updatedHistory.push({
          status: nextStatus,
          changedAt: new Date().toISOString(),
          note,
          userName: activeEmpName,
        });

        const serverData = res.data.data || {};
        const newMakeTableStatus =
          serverData.makeTableStatus ||
          (categoryFilter === "make_table" || categoryFilter === "pizza"
            ? nextStatus
            : localOrder.makeTableStatus);

        const newWingsStatus =
          serverData.wingsStatus ||
          (categoryFilter === "wings_station" || categoryFilter === "chicken"
            ? nextStatus
            : localOrder.wingsStatus);

        setLocalOrder({
          ...localOrder,
          status: serverData.status || nextStatus,
          makeTableStatus: newMakeTableStatus,
          wingsStatus: newWingsStatus,
          statusHistory: updatedHistory,
        });

        onStatusChange();

        // ── Auto-download receipt on Complete ──────────────────────────────
        if (nextStatus === "completed") {
          // Determine receipt type based on station
          // Combo order on Wings Station → wings-only partial receipt
          // Cut Station (Pizza or Combo) → full receipt
          // Wings-only order on Wings Station → full receipt (all items are wings)
          const isComboOrder =
            !!(
              localOrder.hasPizza ||
              (localOrder.items || []).some(
                (i: any) =>
                  i.kitchenLabel === "make_table" || i.kitchenLabel === "pizza",
              )
            ) &&
            !!(
              localOrder.hasWings ||
              (localOrder.items || []).some(
                (i: any) =>
                  i.kitchenLabel === "wings_station" ||
                  i.kitchenLabel === "chicken",
              )
            );

          const wingsOnlyDownload =
            categoryFilter === "wings_station" && isComboOrder;

          const itemsFilterParam = wingsOnlyDownload ? "wings_only" : "all";
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

          // Silent backend print via pdf-to-printer (SumatraPDF) — no browser dialog
          axios
            .post(`${apiUrl}/orders/${localOrder._id}/print`, {
              paperSize: "80mm",
              itemsFilter: itemsFilterParam,
            })
            .then(() => {
              toast.success("Receipt sent to printer!");
            })
            .catch((err) => {
              console.warn("[print] Backend print failed:", err);
              toast.error("Print failed — check printer connection.");
            });
        }
        // ──────────────────────────────────────────────────────────────────

        if (nextStatus === "completed" || nextStatus === "in_oven") {
          onClose();
        }
      } else {
        throw new Error(res.data.message || "Transition failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update order status",
      );
    } finally {
      setUpdating(false);
    }
  };

  // Mark unpaid order as paid
  const executeMarkAsPaid = async () => {
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const payload = {
        payments: [
          {
            method: "cash" as const,
            amount: unpaidBalance,
            cashGiven: unpaidBalance,
            changeGiven: 0,
          },
        ],
      };
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/payment`,
        payload,
      );
      if (res.data.success) {
        toast.success(
          `Order ${localOrder.orderNumber} payment difference of $${unpaidBalance.toFixed(2)} marked as PAID!`,
        );

        setLocalOrder({
          ...localOrder,
          paymentStatus: "paid",
          paymentTiming: "pay-now",
          payments: [...(localOrder.payments || []), ...payload.payments],
        });

        onStatusChange();
      } else {
        throw new Error(res.data.message || "Payment update failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update payment status",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsPaid = () => {
    if (isDraft || !localOrder) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1.5 min-w-[220px]">
          <p className="text-[11px] font-700 text-neutral-800 uppercase tracking-wide">
            Confirm Payment
          </p>
          <p className="text-[10px] text-neutral-500 font-500">
            Are you sure you want to mark order {localOrder.orderNumber} as
            PAID?
          </p>
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-700 transition-all cursor-pointer border border-neutral-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeMarkAsPaid();
              }}
              className="px-2.5 py-1 rounded bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-700 transition-all cursor-pointer"
            >
              Yes, Paid
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
      },
    );
  };
  // ── Reorder Order (Kitchen side clone) ───────────────────────
  const handleReorder = () => {
    if (isDraft || !localOrder) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-3 p-1">
          <p className="font-600 text-neutral-800 text-sm">
            Clone & reorder <b>{localOrder.orderNumber}</b>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeReorder();
              }}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white px-3 py-1.5 rounded-lg text-xs font-700 transition-all flex-1 cursor-pointer"
            >
              Confirm Reorder
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-xs font-600 transition-all flex-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  const executeReorder = async () => {
    if (isDraft || !localOrder) return;
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      const payload = {
        orderType: localOrder.orderType,
        orderSource: localOrder.orderSource || "pos",
        items: localOrder.items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          image: item.image || "",
          basePrice: item.basePrice,
          selectedModifiers: item.selectedModifiers || [],
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          note: item.note || "",
        })),
        subtotal: localOrder.subtotal,
        taxRate: localOrder.taxRate || 0.05,
        tax: localOrder.tax,
        discount: localOrder.discount || 0,
        discountType: localOrder.discountType || "none",
        promoCode: localOrder.promoCode || "",
        total: localOrder.total,
        paymentTiming: "pay-later", // starts unpaid
        paymentType: "one-time",
        payments: [],
        orderTiming: "now",
        scheduledAt: null,
        customer: localOrder.customer || {
          name: "No Name",
          phone: "",
          email: "",
        },
        notes:
          `Reordered from #${localOrder.orderNumber}. ${localOrder.notes || ""}`.trim(),
      };

      const res = await axios.post(`${apiUrl}/orders`, payload);
      if (res.data.success) {
        toast.success(
          `Order ${localOrder.orderNumber} reordered successfully as #${res.data.data.orderNumber}!`,
        );
        onStatusChange();
        onClose();
      } else {
        throw new Error(res.data.message || "Reorder failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to update order status",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleKitchenClear = async () => {
    if (!localOrder || !localOrder._id) return;
    setUpdating(true);
    try {
      let activeEmpName = "Manager";
      if (typeof window !== "undefined") {
        const rawEmp = localStorage.getItem("rms_active_employee");
        if (rawEmp) {
          try {
            const emp = JSON.parse(rawEmp);
            if (emp && emp.name) activeEmpName = emp.name;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}/kitchen-clear`,
        { userName: activeEmpName },
      );
      if (res.data.success) {
        toast.success("Order handed over to driver!");
        setLocalOrder((prev) =>
          prev ? { ...prev, kitchenCleared: true } : prev,
        );
        onStatusChange();
        onClose();
      } else {
        toast.error("Failed to clear order from kitchen.");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to clear order from kitchen",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (isDraft || !localOrder) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1.5 min-w-[220px]">
          <p className="text-[11px] font-700 text-neutral-800 uppercase tracking-wide">
            Confirm Reorder
          </p>
          <p className="text-[10px] text-neutral-500 font-500">
            Are you sure you want to REORDER / duplicate order{" "}
            {localOrder.orderNumber}?
          </p>
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] font-700 transition-all cursor-pointer border border-neutral-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeReorder();
              }}
              className="px-2.5 py-1 rounded bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-700 transition-all cursor-pointer"
            >
              Yes, Reorder
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
      },
    );
  };

  // ── Update Order (Kitchen side edit) ─────────────────────────
  const handleStartEdit = () => {
    if (isDraft || !localOrder) return;
    setEditItems(JSON.parse(JSON.stringify(localOrder.items)));
    setIsEditing(true);
  };

  const handleUpdateQty = (idx: number, change: number) => {
    const copy = [...editItems];
    const newQty = Math.max(1, copy[idx].quantity + change);
    copy[idx].quantity = newQty;
    copy[idx].totalPrice = newQty * copy[idx].basePrice;
    setEditItems(copy);
  };

  const handleRemoveItem = (idx: number) => {
    const copy = editItems.filter((_, i) => i !== idx);
    setEditItems(copy);
  };

  const handleUpdateItemNote = (idx: number, note: string) => {
    const copy = [...editItems];
    copy[idx].note = note;
    setEditItems(copy);
  };

  const getEditTotals = () => {
    const subtotal = editItems.reduce(
      (sum, item) => sum + item.quantity * item.basePrice,
      0,
    );
    const discount = localOrder.discount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, tax, total };
  };

  const handleSaveOrder = async () => {
    if (isDraft || !localOrder) return;
    if (editItems.length === 0) {
      toast.error(
        "Cannot save an order with 0 items. Please cancel the order instead.",
      );
      return;
    }
    setUpdating(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const { subtotal, tax, total } = getEditTotals();
      const payload = {
        items: editItems,
        subtotal,
        tax,
        total,
      };
      const res = await axios.patch(
        `${apiUrl}/orders/${localOrder._id}`,
        payload,
      );
      if (res.data.success) {
        toast.success(`Order ${localOrder.orderNumber} updated successfully.`);
        setLocalOrder({
          ...localOrder,
          items: editItems,
          subtotal,
          tax,
          total,
        });
        setIsEditing(false);
        onStatusChange();
      } else {
        throw new Error(res.data.message || "Update failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to update order",
      );
    } finally {
      setUpdating(false);
    }
  };

  // Cancel order
  const executeCancelOrder = async () => {
    if (cancelling || isDraft || !localOrder) return;
    setCancelling(true);
    try {
      let activeEmpName = "Manager";
      if (typeof window !== "undefined") {
        const rawEmp = localStorage.getItem("rms_active_employee");
        if (rawEmp) {
          try {
            const emp = JSON.parse(rawEmp);
            if (emp && emp.name) activeEmpName = emp.name;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(
        `${apiUrl}/orders/${localOrder._id}/cancel`,
        {
          reason: cancelReason,
          userName: activeEmpName,
        },
      );

      if (res.data.success) {
        toast.success("Order cancelled successfully.");
        setShowCancelModal(false);
        setCancelReason("");
        onStatusChange();
        onClose();
      } else {
        throw new Error(res.data.message || "Cancellation failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to cancel order",
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelOrder = () => {
    if (isDraft || !localOrder) return;
    setShowCancelModal(true);
  };

  const handlePrintInvoice = async () => {
    if (!localOrder || isPrinting) return;
    setIsPrinting(true);
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    try {
      toast.loading("Sending to printer...", { id: "print-toast" });
      await axios.post(`${apiUrl}/orders/${localOrder._id}/print`, {
        paperSize: "80mm",
      });
      toast.success("Receipt printed successfully!", { id: "print-toast" });
    } catch (err: any) {
      console.error("[print] Failed:", err);
      toast.error("Print failed. Is printer ON and connected?", {
        id: "print-toast",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const paymentsTotal = localOrder.payments
    ? localOrder.payments.reduce((sum, p: any) => sum + p.amount, 0)
    : 0;
  const unpaidBalance = Math.max(0, localOrder.total - paymentsTotal);
  const isUnpaid =
    localOrder.paymentStatus === "unpaid" || unpaidBalance > 0.01;

  // Format type tag
  const formattedType =
    {
      takeout: "Take-Out",
      "drive-through": "Drive-Through",
      "dine-in": "Dine-In",
      delivery: "Delivery",
    }[localOrder.orderType] || localOrder.orderType;

  // Determine transition button label and color matching brand primary orange
  const renderTransitionButtons = () => {
    if (isDraft) {
      return (
        <span className="text-[12px] text-neutral-400 font-750 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg select-none">
          Active POS Draft Preview
        </span>
      );
    }

    const currentStationStatus =
      categoryFilter === "make_table"
        ? localOrder.makeTableStatus || localOrder.status
        : categoryFilter === "wings_station"
          ? localOrder.wingsStatus || localOrder.status
          : localOrder.makeTableStatus || localOrder.status;

    if (currentStationStatus === "pending") {
      return (
        <button
          onClick={() => handleTransition("preparing")}
          disabled={updating}
          className="bg-brand-primary text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-brand-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          In Preparing
        </button>
      );
    }

    if (currentStationStatus === "preparing") {
      if (categoryFilter === "make_table" || categoryFilter === "pizza") {
        return (
          <button
            onClick={() => handleTransition("in_oven")}
            disabled={updating}
            className="bg-orange-600 text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-orange-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            In the Oven
          </button>
        );
      }
      return (
        <button
          onClick={() => handleTransition("ready")}
          disabled={updating}
          className="bg-brand-primary text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-brand-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {localOrder.orderType === "delivery"
            ? "Ready For Delivery"
            : "Ready For Pickup"}
        </button>
      );
    }

    if (
      currentStationStatus === "in_oven" ||
      currentStationStatus === "ready"
    ) {
      return (
        <button
          onClick={() => handleTransition("completed")}
          disabled={updating}
          className="bg-success text-white text-[12px] font-800 px-4 py-2 rounded-full hover:bg-green-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          Complete Order
        </button>
      );
    }

    return null;
  };

  const getSubtotal = () => {
    return localOrder.items.reduce(
      (sum, item) =>
        sum +
        ((item.totalPrice as number | undefined) ??
          item.basePrice * item.quantity),
      0,
    );
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4 font-sans animate-fade-in">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-scale-up border border-neutral-200">
        {/* ── Header (Charcoal brand-dark banner matching POS) ── */}
        <div className="bg-brand-dark text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Customer Button */}
            <span className="bg-white/10 text-white text-[11px] font-600 px-3.5 py-1.5 rounded-lg border border-white/15 select-none">
              Customer:{" "}
              <span className="font-800 text-orange-300">
                {localOrder.customer?.name || "N/A"}
              </span>
            </span>
            <span className="text-[12px] font-500 text-neutral-300">
              Placed By :{" "}
              <span className="text-white font-700">
                {localOrder.orderSource === "online"
                  ? "Online System"
                  : "Employee Terminal"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isDraft && (
              <button
                onClick={handlePrintInvoice}
                disabled={isPrinting}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/25 text-[11px] font-700 px-3.5 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-white" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer size={13} />
                    Print Invoice
                  </>
                )}
              </button>
            )}
            <span className="bg-brand-primary text-white text-[11px] font-800 px-3.5 py-1.5 rounded-lg uppercase tracking-wider select-none shadow-xs">
              {formattedType}
            </span>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Subheader Controls & Status Pills ── */}
        <div className="bg-neutral-50/50 px-5 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-800 text-neutral-900 text-[14.5px] tracking-wide uppercase">
              {localOrder.orderNumber}
            </span>

            {dueDate && (
              <div className="flex items-center gap-2 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg text-[11.5px] font-700 text-neutral-600">
                <Clock size={12} className="text-neutral-450" />
                <span>
                  Due at{" "}
                  <span className="font-900 text-brand-primary bg-orange-50 px-2 py-0.5 rounded border border-orange-100/80 font-mono">
                    {dueDate.toLocaleTimeString("en-US", {
                      timeZone: "America/Edmonton",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                {!isDraft && (
                  <span className="text-neutral-450 font-550">
                    (
                    <span className="font-800 text-neutral-750">
                      {Math.max(
                        0,
                        Math.floor((dueDate.getTime() - Date.now()) / 60000),
                      )}
                    </span>{" "}
                    mins left)
                  </span>
                )}
              </div>
            )}

            {!isDraft && dueDate && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustDueTime(-5)}
                  disabled={updating}
                  className="w-7 h-7 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-800 rounded-full flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50 active:scale-90 transition-all"
                >
                  <Minus size={12} />
                </button>
                <span className="text-[11px] font-700 text-neutral-500 px-1.5">
                  5 Min
                </span>
                <button
                  onClick={() => adjustDueTime(5)}
                  disabled={updating}
                  className="w-7 h-7 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-800 rounded-full flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50 active:scale-90 transition-all"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Action Button Row */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveOrder}
                  disabled={updating || editItems.length === 0}
                  className="bg-brand-primary text-white text-[11.5px] font-700 px-4 py-2 rounded-full hover:bg-brand-primary-hover shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={updating}
                  className="bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11.5px] font-700 px-4 py-2 rounded-full hover:bg-neutral-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {renderTransitionButtons()}

                {/* Unpaid/Paid toggle pill */}
                {isUnpaid ? (
                  // <button
                  //   onClick={handleMarkAsPaid}
                  //   disabled={updating}
                  //   className="px-4 py-2 rounded-full text-[11.5px] font-700 uppercase tracking-wider border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  //   title="Click to mark as PAID"
                  // >
                  //   Unpaid (Pay Now)
                  // </button>
                  <span className="px-4 py-2 rounded-full text-[11.5px] font-700 select-none uppercase tracking-wider border border-red-250 text-red-700 bg-red-50">
                    Unpaid
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-full text-[11.5px] font-700 select-none uppercase tracking-wider border border-emerald-250 text-emerald-700 bg-emerald-50">
                    Paid
                  </span>
                )}

                {!isDraft && (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="bg-orange-50 border border-brand-primary/30 text-brand-primary text-[11.5px] font-700 px-4 py-2 rounded-full hover:bg-orange-100/50 hover:border-brand-primary/50 transition-colors shadow-xs cursor-pointer"
                    >
                      Update Order
                    </button>
                    <button
                      onClick={handleReorder}
                      className="bg-neutral-900 text-white text-[11.5px] font-700 px-4 py-2 rounded-full hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                    >
                      Reorder
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Scrollable Body Wrapper ── */}
        <div className="flex-1 overflow-y-auto bg-brand-bg flex flex-col min-h-0">
          {/* Order Level Delivery Instructions Note */}
          {localOrder.notes && (
            <div className="mx-5 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-950 font-sans">
              <FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-900 text-amber-800 uppercase tracking-wider">
                  {localOrder.orderType === "delivery"
                    ? "Delivery Instructions Note:"
                    : "Customer Order Note:"}
                </p>
                <p className="text-xs font-700 mt-0.5 leading-relaxed">
                  "{localOrder.notes}"
                </p>
              </div>
            </div>
          )}

          {/* ── Middle section (2 Columns side-by-side) ── */}
          <div className="flex flex-col lg:flex-row p-5 gap-5 items-start">
            {/* Left Column: Items Table List */}
            <div className="w-full lg:w-[60%] flex flex-col">
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                {/* Brand Dark Header row from reference screenshot */}
                <div className="bg-brand-dark text-white px-4 py-2.5 flex text-[11px] font-800 uppercase tracking-wider select-none">
                  <span className="flex-1">Items</span>
                  <span className="w-16 text-center">Qty</span>
                  <span className="w-24 text-right">Price</span>
                </div>

                <div className="flex flex-col divider-y divider-neutral-100">
                  {isEditing
                    ? editItems.map((rawItem, idx) => {
                        const item = getFilteredItemForModal(rawItem);
                        if (!item) return null;
                        return (
                          <div
                            key={idx}
                            className="p-4 border-b border-neutral-100 last:border-b-0"
                          >
                            <div className="flex items-start">
                              <div className="flex-1">
                                <h4 className="font-700 text-[15.5px] text-brand-primary leading-tight">
                                  {item.name}
                                </h4>

                                {item.selectedModifiers &&
                                  item.selectedModifiers.length > 0 && (
                                    <div className="pl-3 mt-1.5 border-l-2 border-neutral-200 flex flex-col gap-1 text-[13px] font-sans">
                                      {getGroupedModifiers(
                                        item.selectedModifiers,
                                      ).map((mod, modIdx) => (
                                        <div
                                          key={modIdx}
                                          className="flex flex-col text-neutral-600"
                                        >
                                          {mod.isRoot ? (
                                            <>
                                              {/* <span className="text-neutral-450 font-700 text-[11px] uppercase tracking-wider mt-1 select-none">
                                                {mod.groupName}
                                              </span> */}
                                              <div className="flex justify-between items-baseline text-neutral-700 font-600 pl-0.5">
                                                {mod.optionName
                                                  .trim()
                                                  .startsWith("-") ||
                                                mod.optionName
                                                  .toLowerCase()
                                                  .includes("no ") ? (
                                                  <span className="text-red-600 font-800 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 inline-block my-0.5 shadow-xs">
                                                    {mod.optionName}
                                                  </span>
                                                ) : (
                                                  <span>{mod.optionName}</span>
                                                )}
                                                {mod.quantity > 1 && (
                                                  <span className="font-700 text-neutral-850 ml-1 text-[11.5px]">
                                                    x{mod.quantity}
                                                  </span>
                                                )}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex justify-between items-baseline text-neutral-555 font-500 text-[12px] pl-2 italic">
                                              <span>{mod.optionName}</span>
                                              {mod.quantity > 1 && (
                                                <span className="font-600 text-neutral-600 ml-1 text-[10.5px]">
                                                  x{mod.quantity}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                <input
                                  type="text"
                                  placeholder="Add item note..."
                                  value={item.note || ""}
                                  onChange={(e) =>
                                    handleUpdateItemNote(idx, e.target.value)
                                  }
                                  className="mt-2 px-2.5 py-1 text-[11px] border border-neutral-200 rounded-lg w-full focus:outline-none focus:border-brand-primary transition-colors bg-neutral-50/50"
                                />
                              </div>

                              <div className="w-24 flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(idx, -1)}
                                  className="w-6 h-6 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center font-800 text-[11px] text-neutral-600 transition-all border border-neutral-200 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-700 text-[12px] min-w-[14px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(idx, 1)}
                                  className="w-6 h-6 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center font-800 text-[11px] text-neutral-600 transition-all border border-neutral-200 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <div className="w-24 text-right flex items-center justify-end font-700 text-[13px] text-neutral-800">
                                <span>
                                  ${(item.quantity * item.basePrice).toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-all ml-2 cursor-pointer"
                                  title="Remove Item"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    : localOrder.items.map((rawItem, idx) => {
                        const item = getFilteredItemForModal(rawItem);
                        if (!item) return null;
                        return (
                          <div
                            key={idx}
                            className="px-4 py-3 border-b border-neutral-100 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <div className="flex-1 pr-4">
                                <h4 className="font-700 text-[15.5px] text-neutral-800 leading-tight">
                                  {item.name}
                                </h4>

                                {item.selectedModifiers &&
                                  item.selectedModifiers.length > 0 && (
                                    <div className="pl-2.5 mt-1 border-l-2 border-neutral-200 flex flex-col gap-0.5 text-[13px] font-sans">
                                      {getGroupedModifiers(
                                        item.selectedModifiers,
                                      ).map((mod, modIdx) => (
                                        <div
                                          key={modIdx}
                                          className="flex flex-col text-neutral-500"
                                        >
                                          {mod.isRoot ? (
                                            <div className="mt-0.5">
                                              {/* <span className="text-neutral-400 font-750 text-[11px] uppercase tracking-wider select-none">
                                                {mod.groupName}
                                              </span> */}
                                              <div className="flex justify-between items-baseline text-neutral-600 font-600 pl-0.5">
                                                {mod.optionName
                                                  .trim()
                                                  .startsWith("-") ||
                                                mod.optionName
                                                  .toLowerCase()
                                                  .includes("no ") ? (
                                                  <span className="text-red-600 font-800 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 inline-block my-0.5 shadow-xs">
                                                    {mod.optionName}
                                                  </span>
                                                ) : (
                                                  <span>{mod.optionName}</span>
                                                )}
                                                {mod.quantity > 1 && (
                                                  <span className="font-700 text-neutral-800 ml-1 text-[11.5px]">
                                                    x{mod.quantity}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex justify-between items-baseline text-neutral-500 font-500 text-[12px] pl-1.5 italic">
                                              <span>{mod.optionName}</span>
                                              {mod.quantity > 1 && (
                                                <span className="font-650 text-neutral-600 ml-1 text-[10.5px]">
                                                  x{mod.quantity}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                {item.note && (
                                  <p className="text-[9.5px] text-amber-805 font-600 italic mt-1.5 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/40 inline-block">
                                    Note: {item.note}
                                  </p>
                                )}
                              </div>

                              <div className="w-16 text-center">
                                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-700 text-[13px]">
                                  {item.quantity}
                                </span>
                              </div>

                              <div className="w-24 text-right font-700 text-[12.5px] text-neutral-800 font-mono">
                                $
                                {(
                                  (item.totalPrice as number | undefined) ??
                                  item.basePrice * item.quantity
                                ).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>
            </div>

            {/* Right Column: Invoice summary details */}
            <div className="w-full lg:w-[40%] flex flex-col gap-5">
              <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                <h3 className="text-[11.5px] font-800 text-neutral-450 uppercase tracking-wider border-b border-neutral-100 pb-2 select-none">
                  Invoice Breakdown
                </h3>

                <div className="flex flex-col gap-2.5 text-[12px] font-600 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Item Total:</span>
                    <span className="text-neutral-800 font-mono">
                      $
                      {(isEditing
                        ? editItems.reduce(
                            (sum, item) => sum + item.quantity * item.basePrice,
                            0,
                          )
                        : getSubtotal()
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="text-[#DC2626] font-mono">
                      -$
                      {(
                        (localOrder.discount as number | undefined) ?? 0
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-neutral-200 pt-2 text-neutral-800">
                    <span>Sub Total:</span>
                    <span className="font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().subtotal
                        : ((localOrder.subtotal as number | undefined) ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span className="text-neutral-800 font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().tax
                        : ((localOrder.tax as number | undefined) ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tax:</span>
                    <span className="text-neutral-800 font-mono">
                      $
                      {(isEditing
                        ? getEditTotals().tax
                        : ((localOrder.tax as number | undefined) ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  {((localOrder.deliveryFee as number | undefined) ?? 0) >
                    0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span className="text-neutral-800 font-mono">
                        ${(localOrder.deliveryFee as number).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {((localOrder.tip as number | undefined) ?? 0) > 0 && (
                    <div className="flex justify-between text-brand-primary font-bold">
                      <span>Driver Tip:</span>
                      <span className="font-mono">
                        +${(localOrder.tip as number).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13.5px] font-750 text-neutral-900 border-t border-neutral-200 pt-2.5">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[14.5px] text-brand-primary font-800">
                      $
                      {(isEditing
                        ? getEditTotals().total
                        : ((localOrder.total as number | undefined) ?? 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12.5px] font-700 text-red-650 pt-1 items-center">
                    <span>Total Unpaid:</span>
                    <span className="font-mono bg-red-50 text-red-600 px-2.5 py-0.5 rounded border border-red-150 font-900 text-[13px]">
                      $
                      {Math.max(
                        0,
                        (isEditing
                          ? getEditTotals().total
                          : ((localOrder.total as number | undefined) ?? 0)) -
                          paymentsTotal,
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancel Order */}
              {!isDraft &&
                localOrder.status !== "completed" &&
                localOrder.status !== "cancelled" && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 hover:border-red-300 bg-red-50/50 hover:bg-red-50 text-red-600 py-2.5 rounded-xl text-[12px] font-700 transition-all cursor-pointer shadow-xs"
                  >
                    <Trash2 size={13} />
                    Cancel Order
                  </button>
                )}
            </div>
          </div>

          {/* ── Bottom Section: logs and histories ── */}
          <div className="border-t border-neutral-200 bg-neutral-50/30 p-5 flex flex-col gap-4 text-[11px] text-neutral-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Info */}
              <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                <h4 className="text-neutral-850 font-800 mb-2 border-b border-neutral-100 pb-1.5 uppercase text-[9.5px] tracking-wider select-none">
                  Order Information
                </h4>
                <div className="flex flex-col text-neutral-600 gap-1.5">
                  <div className="flex justify-between py-1.5 border-b border-neutral-50 last:border-b-0 items-center">
                    <span className="text-neutral-450 font-500">
                      Order Date:
                    </span>
                    <span className="text-neutral-800 font-800 bg-neutral-100/80 px-2 py-0.5 rounded border border-neutral-200/50 font-mono">
                      {new Date(localOrder.createdAt).toLocaleString("en-US", { timeZone: "America/Edmonton" })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-neutral-50 last:border-b-0 items-center">
                    <span className="text-neutral-450 font-500">
                      Order Due Date:
                    </span>
                    <span className="text-brand-primary font-900 bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100/60 font-mono">
                      {dueDate ? dueDate.toLocaleString("en-US", { timeZone: "America/Edmonton" }) : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-neutral-50 last:border-b-0 items-center">
                    <span className="text-neutral-450 font-500">
                      Report Date:
                    </span>
                    <span className="text-neutral-800 font-800 bg-neutral-100/80 px-2 py-0.5 rounded border border-neutral-200/50 font-mono">
                      {new Date(localOrder.createdAt).toLocaleDateString("en-US", { timeZone: "America/Edmonton", month: "2-digit", day: "2-digit", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-50 last:border-b-0">
                    <span className="text-neutral-450 font-500">Order By:</span>
                    <span className="text-neutral-700 font-600">
                      {localOrder.orderSource === "online"
                        ? "Online Source"
                        : "Employee (Doe)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount History */}
              <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                <h4 className="text-neutral-850 font-800 mb-2 border-b border-neutral-100 pb-1.5 uppercase text-[9.5px] tracking-wider select-none">
                  Order Discount History
                </h4>
                <div className="flex flex-col text-neutral-600 gap-1.5">
                  {localOrder.discount > 0 ? (
                    <>
                      <div className="flex justify-between py-1 border-b border-neutral-50 last:border-b-0">
                        <span className="text-neutral-450 font-500">Type:</span>
                        <span className="text-neutral-700 font-600 capitalize">
                          {localOrder.discountType}
                        </span>
                      </div>
                      {localOrder.promoCode && (
                        <div className="flex justify-between py-1 border-b border-neutral-50 last:border-b-0">
                          <span className="text-neutral-450 font-500">
                            Promo Code:
                          </span>
                          <span className="text-neutral-700 font-600 font-mono">
                            {localOrder.promoCode}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-neutral-50 last:border-b-0">
                        <span className="text-neutral-450 font-500">
                          Discount Amount:
                        </span>
                        <span className="text-[#DC2626] font-750">
                          -$
                          {(
                            (localOrder.discount as number | undefined) ?? 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-neutral-400 italic">
                      No discount applied.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
              <h4 className="text-neutral-850 font-800 mb-2 border-b border-neutral-100 pb-1.5 uppercase text-[9.5px] tracking-wider select-none">
                Order Payment History
              </h4>
              {localOrder.payments && localOrder.payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[8.5px] font-700">
                        <th className="py-1.5 pr-2">Type</th>
                        <th className="py-1.5 px-2">Person</th>
                        <th className="py-1.5 px-2">Card Type</th>
                        <th className="py-1.5 px-2 text-right">Amount</th>
                        <th className="py-1.5 px-2 text-right">Cash Given</th>
                        <th className="py-1.5 pl-2 text-right">Change Given</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-700">
                      {localOrder.payments.map((p, pIdx) => (
                        <tr
                          key={pIdx}
                          className="border-b border-neutral-100 last:border-b-0 text-[10.5px] font-500"
                        >
                          <td className="py-2 pr-2 uppercase font-700 text-brand-primary">
                            {p.method}
                          </td>
                          <td className="py-2 px-2 text-neutral-600">
                            {p.personName || "Customer"}
                          </td>
                          <td className="py-2 px-2 text-neutral-550">
                            {p.method === "card" ? "Visa/Mastercard" : "-"}
                          </td>
                          <td className="py-2 px-2 text-right font-700 text-neutral-850">
                            ${p.amount.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right text-neutral-600">
                            ${(p.cashGiven || 0).toFixed(2)}
                          </td>
                          <td className="py-2 pl-2 text-right text-neutral-600">
                            ${(p.changeGiven || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-neutral-400 italic">
                  No payment record found (unpaid order).
                </p>
              )}
            </div>

            {/* Order Activity Log (Dynamic status history rendering) */}
            {!isDraft && (
              <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                <h4 className="text-neutral-850 font-800 mb-2 border-b border-neutral-100 pb-1.5 uppercase text-[9.5px] tracking-wider select-none">
                  Order Log History
                </h4>
                <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  <div className="flex justify-between py-1.5 border-b border-neutral-50 last:border-0 text-neutral-600 font-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full flex-shrink-0" />
                      Order Created: New order placed
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(localOrder.createdAt).toLocaleString("en-US", { timeZone: "America/Edmonton" })}
                    </span>
                  </div>
                  {localOrder.statusHistory &&
                  localOrder.statusHistory.length > 0
                    ? localOrder.statusHistory.map(
                        (historyItem: any, idx: number) => {
                          if (historyItem.status === "pending" && idx === 0)
                            return null;

                          const statusLabels: Record<string, string> = {
                            preparing: "In Preparing",
                            ready: "Ready For Pickup",
                            completed: "Completed",
                            cancelled: "Cancelled",
                          };
                          const label =
                            statusLabels[historyItem.status] ||
                            historyItem.status;

                          return (
                            <div
                              key={idx}
                              className="flex justify-between py-1.5 border-b border-neutral-50 last:border-0 text-neutral-650 font-500 animate-fade-in"
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full flex-shrink-0" />
                                <span>
                                  Status Updated →{" "}
                                  <span className="uppercase text-brand-primary font-700">
                                    {label}
                                  </span>
                                  {historyItem.note
                                    ? ` (${historyItem.note})`
                                    : ""}
                                </span>
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {new Date(
                                  historyItem.changedAt,
                                ).toLocaleString("en-US", { timeZone: "America/Edmonton" })}
                              </span>
                            </div>
                          );
                        },
                      )
                    : localOrder.status !== "pending" && (
                        <div className="flex justify-between py-1.5 border-b border-neutral-50 last:border-0 text-neutral-650 font-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-brand-primary rounded-full flex-shrink-0" />
                            <span>
                              Status Updated →{" "}
                              <span className="uppercase text-brand-primary font-700">
                                {localOrder.status}
                              </span>
                            </span>
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Updated in kitchen
                          </span>
                        </div>
                      )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cancel Order Confirmation Dialog Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-neutral-200 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-900 text-neutral-900 leading-tight">
                  Confirm Order Cancellation
                </h3>
                <p className="text-[11px] text-neutral-500 font-500">
                  Order {localOrder.orderNumber} · Total $
                  {localOrder.total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-700 text-neutral-700 block">
                Cancellation Reason (Optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Item unavailable, Customer request, Wrong entry..."
                rows={3}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[12px] text-neutral-800 focus:outline-none focus:border-red-500 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={cancelling}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-800 rounded-full uppercase tracking-wider transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={executeCancelOrder}
                disabled={cancelling}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-800 rounded-full uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-red-500/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
