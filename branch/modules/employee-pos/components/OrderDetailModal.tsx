"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  RefreshCw,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  FileText,
  Pencil,
} from "lucide-react";
import { Order, CartItem, SplitPayment } from "../types";
import axios from "axios";
import toast from "react-hot-toast";
import ThermalReceipt from "./ThermalReceipt";
import { usePosStore } from "../store/pos.store";
import { useRouter } from "next/navigation";

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function OrderDetailModal({
  order,
  onClose,
  onRefresh,
}: OrderDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [payMethod, setPayMethod] = useState<
    "cash" | "card" | "debit" | "credit"
  >("cash");
  const [cashGivenInput, setCashGivenInput] = useState("");
  const router = useRouter();
  const { loadOrderForEditing } = usePosStore();

  const handleEditOrder = () => {
    if (!order) return;
    loadOrderForEditing(order);
    onClose();
    router.push("/employee/pos");
  };

  // Refund State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  // Cancel State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  if (!order) return null;

  // Check Manager / Admin permission
  const activeEmp =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem("rms_active_employee");
            return raw ? JSON.parse(raw) : null;
          } catch (e) {
            return null;
          }
        })()
      : null;

  const isManagerOrAdmin =
    !activeEmp ||
    activeEmp.role === "manager" ||
    activeEmp.role === "admin" ||
    activeEmp.isBranchAdmin === true ||
    activeEmp.permissions?.refund_orders === true;

  const isPosOrder =
    order.orderSource === "pos" ||
    (order as any).orderPlaced === "POS SYSTEM" ||
    !["online", "doordash", "skip", "ubereats"].includes(order.orderSource);

  const canRefund =
    isManagerOrAdmin &&
    isPosOrder &&
    order.status !== "cancelled" &&
    order.paymentStatus === "paid";

  const handleExecuteRefund = async () => {
    if (refunding || !order) return;
    setRefunding(true);
    try {
      let activeEmpName = "Manager";
      if (activeEmp && activeEmp.name) {
        activeEmpName = activeEmp.name;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/orders/${order._id}/refund`, {
        reason: refundReason,
        userName: activeEmpName,
      });

      if (res.data.success) {
        toast.success(`Order ${order.orderNumber} refunded successfully!`);
        setShowRefundModal(false);
        setRefundReason("");
        order.status = "cancelled";
        order.paymentStatus = "refunded";
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to refund order");
    } finally {
      setRefunding(false);
    }
  };

  const handleSilentPrint = async () => {
    if (isPrinting || !order) return;
    setIsPrinting(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      toast.loading(`Printing receipt for #${order.orderNumber}...`, {
        id: `print-${order._id}`,
      });
      const res = await axios.post(`${apiUrl}/orders/${order._id}/print`, {
        paperSize: "80mm",
      });
      if (res.data.success) {
        toast.success(`Receipt printed successfully!`, {
          id: `print-${order._id}`,
        });
      } else {
        throw new Error(res.data.message || "Print failed");
      }
    } catch (err: any) {
      toast.error("Print failed — check printer connection.", {
        id: `print-${order._id}`,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isPrinting || !order) return;
    setIsPrinting(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await axios.get(
        `${apiUrl}/orders/${order._id}/pdf?paperSize=80mm`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `invoice-${order.orderNumber.replace("#", "")}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice PDF downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to download invoice PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const handleUpdateStatus = async (
    newStatus: "pending" | "preparing" | "ready" | "completed" | "cancelled",
  ) => {
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
      const res = await axios.patch(`${apiUrl}/orders/${order._id}/status`, {
        status: newStatus,
        note: `Status updated to ${newStatus} via orders list`,
        userName: activeEmpName,
      });

      if (res.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        if (newStatus === "completed") {
          axios
            .post(`${apiUrl}/orders/${order._id}/print`, { paperSize: "80mm" })
            .then(() => toast.success("Receipt auto-printed!"))
            .catch((err) => console.warn("Auto-print failed silently:", err));
        }
        onRefresh();
        // Update local order reference
        order.status = newStatus;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleExecuteCancel = async () => {
    if (cancelling || !order) return;
    setCancelling(true);
    try {
      let activeEmpName = "Manager";
      if (activeEmp && activeEmp.name) {
        activeEmpName = activeEmp.name;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/orders/${order._id}/cancel`, {
        reason: cancelReason,
        userName: activeEmpName,
      });

      if (res.data.success) {
        toast.success(`Order ${order.orderNumber} cancelled successfully!`);
        setShowCancelModal(false);
        setCancelReason("");
        order.status = "cancelled";
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const handleCollectPayment = async () => {
    setUpdating(true);
    try {
      const amount = order.total;
      const cashGivenVal =
        payMethod === "cash" ? parseFloat(cashGivenInput) || amount : 0;
      const changeGivenVal =
        payMethod === "cash" ? Math.max(0, cashGivenVal - amount) : 0;

      const paymentsPayload: SplitPayment[] = [
        {
          method: payMethod,
          amount: amount,
          cashGiven: cashGivenVal,
          changeGiven: changeGivenVal,
          personName: "Cashier Collected",
        },
      ];

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(`${apiUrl}/orders/${order._id}/payment`, {
        payments: paymentsPayload,
      });

      if (res.data.success) {
        toast.success("Payment recorded successfully!");
        setShowPayForm(false);
        onRefresh();
        order.paymentStatus = "paid";
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setUpdating(false);
    }
  };

  // Status transitions
  const getNextStatusLabel = (): {
    target: "pending" | "preparing" | "ready" | "completed" | "cancelled";
    label: string;
  } | null => {
    switch (order.status) {
      case "pending":
        return { target: "preparing", label: "Start Preparing" };
      case "preparing":
        return { target: "ready", label: "Mark Ready" };
      case "ready":
        if (order.orderType === "delivery") {
          return null;
        }
        return { target: "completed", label: "Mark Completed" };
      default:
        return null;
    }
  };

  const nextStatus = getNextStatusLabel();

  // Customer presence helpers
  const hasCustomer = !!(
    order.customer?.name &&
    order.customer.name.trim() !== "" &&
    order.customer.name !== "No Name"
  );
  const displayCustomerName = hasCustomer ? order.customer?.name : "No Name";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-neutral-50 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* ── Top Header Navigation Bar (Charcoal theme matching POS) ── */}
        <div className="bg-brand-dark text-white px-6 py-3.5 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3.5">
            <span className="bg-white/10 text-white text-[11px] font-600 px-3.5 py-1.5 rounded-lg border border-white/15 select-none">
              Customer: {displayCustomerName}
            </span>
            <span className="text-[12px] opacity-75 font-600">
              Order By:{" "}
              {order.orderSource === "pos"
                ? "Employee Terminal"
                : order.orderSource === "doordash"
                  ? "Online - DoorDash"
                  : order.orderSource === "skip"
                    ? "Online - Skip"
                    : order.orderSource === "ubereats"
                      ? "Online - Uber Eats"
                      : order.orderSource === "online"
                        ? "Online - Website"
                        : "Online Source"}
            </span>
            {!order.orderNumber.startsWith("#DRAFT") && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={handleSilentPrint}
                  disabled={isPrinting}
                  className="flex items-center gap-1.5 py-1.5 px-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg border border-brand-primary/30 text-[11px] font-800 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Silent Print directly to connected Thermal Printer (POS-58)"
                >
                  {isPrinting ? (
                    <>
                      <RefreshCw
                        size={13}
                        className="animate-spin text-white"
                      />
                      <span>Printing...</span>
                    </>
                  ) : (
                    <>
                      <Printer size={13} />
                      <span>Print Invoice</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isPrinting}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white rounded-lg border border-white/10 text-[11px] transition-all cursor-pointer disabled:opacity-50"
                  title="Download PDF Invoice"
                >
                  <FileText size={13} />
                </button>
                {order.status !== "cancelled" && (
                  <button
                    onClick={handleEditOrder}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg border border-amber-400/30 text-[11px] font-800 transition-all cursor-pointer shadow-sm"
                    title="Edit this order in POS Terminal"
                  >
                    <Pencil size={13} />
                    <span>Edit Order</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-brand-primary text-white text-[11px] font-800 px-3.5 py-1.5 rounded-lg uppercase tracking-wider select-none shadow-xs">
              {order.orderType.replace("-", " ")}
            </span>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Main Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Meta Info Section */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1.5">
              <span className="font-mono text-[10.5px] font-700 text-neutral-700 bg-neutral-100/80 px-2.5 py-1 rounded border border-neutral-200/80 tracking-wide shadow-3xs select-none">
                {order.orderNumber}
              </span>
              <p className="text-neutral-400 text-[10.5px] font-600 pl-1 mt-1">
                Created At: {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Payment Status Badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-750 uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                  order.paymentStatus === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                    : "bg-red-50 text-red-700 border-red-200/60"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${order.paymentStatus === "paid" ? "bg-emerald-500" : "bg-red-500"}`}
                />
                {order.paymentStatus}
              </span>

              {/* Order Status Badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-750 uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                  order.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                    : order.status === "cancelled"
                      ? "bg-red-50 text-red-700 border-red-200/60"
                      : order.status === "ready"
                        ? "bg-sky-50 text-sky-700 border-sky-200/60"
                        : order.status === "preparing"
                          ? "bg-blue-50 text-blue-700 border-blue-200/60"
                          : "bg-orange-50 text-brand-primary border-brand-primary-muted/50"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {order.status === "completed"
                  ? "Completed"
                  : order.status === "ready"
                    ? "Ready Pick"
                    : order.status === "preparing"
                      ? "Preparing"
                      : order.status}
              </span>

              <button className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-850 text-white rounded-full text-[11px] font-800 uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer">
                <RefreshCw size={12} />
                <span>Reorder</span>
              </button>
            </div>
          </div>

          {/* Delivery Instructions / Order Note Banner */}
          {order.notes && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 animate-scale-up">
              <FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-900 text-amber-800 uppercase tracking-wider">
                  {order.orderType === "delivery"
                    ? "Instructions Note:"
                    : "Customer Order Note:"}
                </p>
                <p className="text-xs font-700 mt-0.5 leading-relaxed text-amber-950">
                  "{order.notes}"
                </p>
              </div>
            </div>
          )}

          {/* Dual Column Layout (Items on Left, Financials on Right) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left Col - Items Table (3/5) */}
            <div className="md:col-span-3 border border-neutral-200 bg-white rounded-xl overflow-hidden shadow-xs flex flex-col">
              {/* Modern Clean Table Header matching KitchenDetailModal */}
              <div className="bg-brand-dark text-white border-b border-neutral-200 text-[11px] font-800 uppercase tracking-wider px-4 py-2.5 grid grid-cols-12 select-none">
                <span className="col-span-8">Items</span>
                <span className="col-span-2 text-center">QTY</span>
                <span className="col-span-2 text-right">Price</span>
              </div>
              <div className="divide-y divide-neutral-100 flex-1 overflow-y-auto min-h-[220px]">
                {order.items.map((item: CartItem, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3.5 grid grid-cols-12 text-[12px] text-neutral-800 items-start"
                  >
                    <div className="col-span-8 space-y-1.5">
                      <p className="font-800 text-neutral-800 text-[15.5px]">
                        {item.name}
                      </p>

                      {/* Render modifiers if any */}
                      {item.selectedModifiers &&
                        item.selectedModifiers.length > 0 && (
                          <div className="pl-3 mt-1 border-l-2 border-neutral-200 space-y-0.5 text-neutral-500 text-[12.5px] font-600">
                            {item.selectedModifiers.map((mod, mIdx) => {
                              const isMinusMod =
                                mod.optionName.trim().startsWith("-") ||
                                mod.optionName.toLowerCase().includes("no ");
                              const showGroupPrefix =
                                mod.groupName &&
                                !mod.optionName
                                  .toLowerCase()
                                  .startsWith(mod.groupName.toLowerCase());
                              return (
                                <p key={mIdx}>
                                  {showGroupPrefix && (
                                    <span>{mod.groupName}: </span>
                                  )}
                                  {isMinusMod ? (
                                    <span className="text-red-600 font-800 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 inline-block my-0.5 shadow-xs">
                                      {mod.optionName}
                                    </span>
                                  ) : (
                                    <span>{mod.optionName}</span>
                                  )}
                                  {mod.price > 0
                                    ? ` (+$${mod.price.toFixed(2)})`
                                    : ""}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      {item.note && (
                        <p className="text-[10px] text-amber-700 font-600 italic pl-3 mt-1">
                          Note: "{item.note}"
                        </p>
                      )}
                    </div>
                    {/* Quantity Badge */}
                    <div className="col-span-2 text-center self-start pt-0.5">
                      <span className="px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-700 text-[13px]">
                        {item.quantity}
                      </span>
                    </div>
                    {/* Price (safe fallback included) */}
                    <div className="col-span-2 text-right font-800 text-neutral-900 self-start pt-0.5 font-mono">
                      $
                      {(
                        (item.totalPrice as number | undefined) ??
                        item.basePrice * item.quantity
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col - Receipt Calculations (2/5) */}
            <div className="md:col-span-2 border border-neutral-200 bg-white rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-2.5 text-[12px] text-neutral-600">
                <h3 className="text-[10.5px] font-800 text-neutral-500 uppercase tracking-wider border-b border-neutral-300 pb-2.5 mb-3 select-none">
                  Invoice Breakdown
                </h3>
                <div className="flex justify-between font-600">
                  <span>Item Total :</span>
                  <span className="text-neutral-850 font-700 font-mono">
                    ${(order.subtotal ?? 0).toFixed(2)}
                  </span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600 font-700">
                    <span>Discount :</span>
                    <span className="font-mono">
                      -${(order.discount ?? 0).toFixed(2)} ({order.discountType}
                      )
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-600">
                  <span>Sub Total :</span>
                  <span className="text-neutral-850 font-700 font-mono">
                    $
                    {((order.subtotal ?? 0) - (order.discount ?? 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-600">
                  <span>
                    GST ({((order.taxRate ?? 0) * 100).toFixed(0)}%) :
                  </span>
                  <span className="text-neutral-850 font-700 font-mono">
                    ${(order.tax ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-600">
                  <span>Total Tax :</span>
                  <span className="text-neutral-850 font-700 font-mono">
                    ${(order.tax ?? 0).toFixed(2)}
                  </span>
                </div>
                {(order.deliveryFee ?? 0) > 0 && (
                  <div className="flex justify-between font-600">
                    <span>Delivery Fee :</span>
                    <span className="text-neutral-850 font-700 font-mono">
                      ${(order.deliveryFee ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {(order.tip ?? 0) > 0 && (
                  <div className="flex justify-between font-700 text-brand-primary">
                    <span>Driver Tip :</span>
                    <span className="font-mono">
                      ${(order.tip ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-neutral-300 my-2.5" />
                <div className="flex justify-between text-[14px] font-900 text-neutral-900 pt-1">
                  <span>Grand Total :</span>
                  <span className="font-mono text-brand-primary">
                    ${(order.total ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[14px] font-900 text-green-600">
                  <span>Total Paid :</span>
                  <span className="font-mono">
                    $
                    {order.paymentStatus === "paid"
                      ? (order.total ?? 0).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </div>

              {/* Status Actions panel */}
              <div className="mt-6 pt-4 border-t border-neutral-300 space-y-3 select-none">
                {updating ? (
                  <div className="text-center text-[11px] font-700 text-neutral-400 py-1.5 animate-pulse">
                    Processing request...
                  </div>
                ) : (
                  <>
                    {/* Advance Order Status Trigger */}
                    {nextStatus && (
                      <button
                        onClick={() => handleUpdateStatus(nextStatus.target)}
                        className="w-full py-2 bg-brand-primary text-white text-[11.5px] font-800 rounded-full hover:bg-brand-primary-hover active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-brand-primary/10 uppercase tracking-wider"
                      >
                        {nextStatus.label}
                      </button>
                    )}

                    {/* Pay order button */}
                    {order.status !== "cancelled" &&
                      order.paymentStatus === "unpaid" &&
                      !showPayForm && (
                        <button
                          onClick={() => setShowPayForm(true)}
                          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-[11.5px] font-800 rounded-full active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                        >
                          <CreditCard size={13} />
                          <span>Collect Payment</span>
                        </button>
                      )}

                    {/* Pay Form Toggle Panel */}
                    {showPayForm && (
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2.5 text-[11px] animate-scale-up">
                        <p className="font-800 text-neutral-750">
                          Record Payment Amount: $
                          {(order.total ?? 0).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2">
                          {["cash", "card", "debit"].map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPayMethod(method as any)}
                              className={`flex-1 py-1.5 rounded-lg border text-center font-750 uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                                payMethod === method
                                  ? "bg-neutral-900 border-neutral-900 text-white"
                                  : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-350"
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>

                        {payMethod === "cash" && (
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-500 font-700">
                              Cash Given
                            </label>
                            <input
                              type="number"
                              value={cashGivenInput}
                              onChange={(e) =>
                                setCashGivenInput(e.target.value)
                              }
                              placeholder={`$${(order.total ?? 0).toFixed(2)}`}
                              className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[11.5px] text-neutral-800 focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={handleCollectPayment}
                            className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white font-800 rounded-lg active:scale-95 transition-all cursor-pointer uppercase tracking-wider text-[10.5px]"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setShowPayForm(false)}
                            className="flex-1 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 font-700 rounded-lg active:scale-95 transition-all cursor-pointer uppercase tracking-wider text-[10.5px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cancel button */}
                    {order.status !== "cancelled" && (
                      <button
                        onClick={handleCancelOrder}
                        className="w-full py-2 border border-red-200 text-red-500 text-[11.5px] font-700 rounded-full hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
                      >
                        Cancel Order
                      </button>
                    )}

                    {/* Refund button (Only for Manager / Admin on POS orders) */}
                    {canRefund && (
                      <button
                        onClick={() => setShowRefundModal(true)}
                        className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-[11.5px] font-800 rounded-full active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-sm shadow-red-500/20"
                      >
                        <RotateCcw size={13} />
                        <span>Refund Order</span>
                      </button>
                    )}

                    {/* Refunded Badge if already refunded */}
                    {order.paymentStatus === "refunded" && (
                      <div className="w-full py-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-800 rounded-full text-center uppercase tracking-wider">
                        ✓ Order Refunded
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Triple-grid logs: Order Info, Discount Info, Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-neutral-300">
            {/* Order Info card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 shadow-xs">
              <h3 className="font-800 text-[9.5px] text-neutral-500 border-b border-neutral-300 pb-2 uppercase tracking-wider select-none">
                Order Information
              </h3>
              <div className="space-y-2 text-[11px] text-neutral-600 font-600 divide-y divide-neutral-50">
                <div className="flex justify-between py-1.5 items-center">
                  <span>Order Date :</span>
                  <span className="text-neutral-850 font-800 bg-neutral-100/80 px-2 py-0.5 rounded border border-neutral-200/50 font-mono">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 items-center">
                  <span>Order Due Date :</span>
                  <span className="text-brand-primary font-900 bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100/60 font-mono">
                    {formatDate(order.dueAt || order.scheduledAt)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 items-center">
                  <span>Report Date :</span>
                  <span className="text-neutral-850 font-800 bg-neutral-100/80 px-2 py-0.5 rounded border border-neutral-200/50 font-mono">
                    {formatDateOnly(order.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Order By :</span>
                  <span className="text-neutral-800 font-700">
                    {(order as any).placedBy ||
                      (order as any).employeeName ||
                      (typeof window !== "undefined" &&
                      localStorage.getItem("rms_active_employee")
                        ? JSON.parse(
                            localStorage.getItem("rms_active_employee") || "{}",
                          ).name
                        : "Manager")}
                  </span>
                </div>
              </div>
            </div>

            {/* Discount Info card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 shadow-xs">
              <h3 className="font-800 text-[9.5px] text-neutral-500 border-b border-neutral-300 pb-2 uppercase tracking-wider select-none">
                Order Discount History
              </h3>
              {(order.discount ?? 0) > 0 ? (
                <div className="space-y-2 text-[11px] text-neutral-600 font-600 divide-y divide-neutral-50">
                  <div className="flex justify-between py-1">
                    <span>Type:</span>
                    <span className="text-neutral-800 capitalize font-700">
                      {order.discountType}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Promo Code:</span>
                    <span className="text-neutral-800 font-700 font-mono">
                      {order.promoCode || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Discount:</span>
                    <span className="text-green-600 font-800 font-mono">
                      -${(order.discount ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400 font-600 text-center py-4 select-none">
                  No discount applied to this order.
                </p>
              )}
            </div>

            {/* Payment history card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3 shadow-xs md:col-span-2 lg:col-span-1">
              <h3 className="font-800 text-[9.5px] text-neutral-500 border-b border-neutral-300 pb-2 uppercase tracking-wider select-none">
                Order Payment History
              </h3>
              <div className="space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
                {order.payments && order.payments.length > 0 ? (
                  order.payments.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 text-[11px] space-y-1"
                    >
                      <div className="flex justify-between font-800 text-neutral-750">
                        <span className="uppercase text-[9.5px] text-neutral-500">
                          {p.cardBrand ? `Stripe (${p.cardBrand})` : p.method}
                        </span>
                        <span className="font-mono text-neutral-800">
                          ${(p.amount ?? 0).toFixed(2)}
                        </span>
                      </div>
                      {p.cashGiven !== undefined && p.cashGiven > 0 && (
                        <div className="flex justify-between text-neutral-500 font-600 text-[10px]">
                          <span>
                            Cash Given: ${(p.cashGiven ?? 0).toFixed(2)}
                          </span>
                          <span>
                            Change: ${(p.changeGiven ?? 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {p.cardBrand && (
                        <div className="text-[10px] text-neutral-500 font-600 space-y-0.5 mt-1 border-t border-neutral-200/50 pt-1">
                          <p>
                            Type:{" "}
                            <span className="capitalize">
                              {p.cardFunding || "N/A"}
                            </span>
                          </p>
                          {p.cardLast4 && (
                            <p>Card: **** **** **** {p.cardLast4}</p>
                          )}
                          {p.transactionId && (
                            <p className="text-[8px] font-mono text-neutral-450 select-all truncate mt-0.5">
                              ID: {p.transactionId}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-neutral-400 font-600 text-center py-4 select-none">
                    {order.paymentStatus === "paid" &&
                    order.paymentTiming === "pay-now"
                      ? "One-time Paid"
                      : "No recorded transactions."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order Status History (Log) */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-neutral-50/75 border-b border-neutral-300 text-neutral-550 text-[10px] font-800 uppercase tracking-wider px-4 py-2.5 select-none">
              Order History Log
            </div>
            <div className="overflow-x-auto select-none">
              <table className="w-full text-left text-[11px] text-neutral-600 font-550">
                <thead className="bg-neutral-50 border-b border-neutral-300 text-neutral-500 text-[9px] font-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 font-900">#</th>
                    <th className="px-4 py-2 font-900">Action</th>
                    <th className="px-4 py-2 font-900">Comment</th>
                    <th className="px-4 py-2 font-900">Date</th>
                    <th className="px-4 py-2 font-900">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {/* History rows rendering */}
                  {order.statusHistory && order.statusHistory.length > 0 ? (
                    order.statusHistory.map((hist, hIdx) => (
                      <tr key={hIdx} className="hover:bg-neutral-50/30">
                        <td className="px-4 py-2 font-800 text-neutral-800">
                          {hIdx + 1}
                        </td>
                        <td className="px-4 py-2 text-brand-primary font-700 capitalize">
                          Status Changed (
                          {hist.status === "completed"
                            ? "Completed"
                            : hist.status === "ready"
                              ? "Ready Pick"
                              : hist.status}
                          )
                        </td>
                        <td className="px-4 py-2 text-neutral-400 italic">
                          {hist.note || `Transition to ${hist.status}`}
                        </td>
                        <td className="px-4 py-2 text-neutral-500">
                          {formatDate(hist.changedAt)}
                        </td>
                        <td className="px-4 py-2 text-neutral-750 font-600">
                          {(hist as any).userName ||
                            (hist as any).updatedBy ||
                            (order as any).placedBy ||
                            (typeof window !== "undefined" &&
                            localStorage.getItem("rms_active_employee")
                              ? JSON.parse(
                                  localStorage.getItem("rms_active_employee") ||
                                    "{}",
                                ).name
                              : "Manager")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      {/* Fallback history */}
                      <tr className="hover:bg-neutral-50/30">
                        <td className="px-4 py-2 font-800 text-neutral-800">
                          1
                        </td>
                        <td className="px-4 py-2 text-brand-primary font-700">
                          Order Created
                        </td>
                        <td className="px-4 py-2 text-neutral-450 italic">
                          New order placed
                        </td>
                        <td className="px-4 py-2 text-neutral-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-neutral-750 font-600">
                          {(order as any).placedBy ||
                            (typeof window !== "undefined" &&
                            localStorage.getItem("rms_active_employee")
                              ? JSON.parse(
                                  localStorage.getItem("rms_active_employee") ||
                                    "{}",
                                ).name
                              : "Manager")}
                        </td>
                      </tr>
                      {order.paymentStatus === "paid" && (
                        <tr className="hover:bg-neutral-50/30">
                          <td className="px-4 py-2 font-800 text-neutral-800">
                            2
                          </td>
                          <td className="px-4 py-2 text-brand-primary font-700">
                            Payment Processed
                          </td>
                          <td className="px-4 py-2 text-neutral-450 italic">
                            Marked paid
                          </td>
                          <td className="px-4 py-2 text-neutral-500">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-4 py-2 text-neutral-750 font-600">
                            {(order as any).placedBy ||
                              (typeof window !== "undefined" &&
                              localStorage.getItem("rms_active_employee")
                                ? JSON.parse(
                                    localStorage.getItem(
                                      "rms_active_employee",
                                    ) || "{}",
                                  ).name
                                : "Manager")}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Bottom Footer with Close Button ── */}
        <div className="border-t border-neutral-200 bg-white py-4 px-6 flex items-center justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2 border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700 hover:bg-neutral-50 text-[11px] font-800 rounded-full uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Refund Confirmation Dialog Modal ── */}
      {showRefundModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-neutral-200 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-900 text-neutral-900 leading-tight">
                  Confirm Order Refund
                </h3>
                <p className="text-[11px] text-neutral-500 font-500">
                  Order {order.orderNumber} · Total ${order.total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-700 text-neutral-700 block">
                Refund Reason (Optional)
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer returned items, Incorrect charge, Manager approval..."
                rows={3}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[12px] text-neutral-800 focus:outline-none focus:border-red-500 resize-none font-sans"
              />
            </div>

            {/* <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-600">
              ⚠️ Warning: This will mark the order as Refunded & Cancelled. This action cannot be undone.
            </div> */}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundReason("");
                }}
                disabled={refunding}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-800 rounded-full uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRefund}
                disabled={refunding}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-800 rounded-full uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-red-500/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {refunding ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    <span>Confirm Refund</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Order Confirmation Dialog Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-neutral-200 animate-scale-up font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-900 text-neutral-900 leading-tight">
                  Confirm Order Cancellation
                </h3>
                <p className="text-[11px] text-neutral-500 font-500">
                  Order {order.orderNumber} · Total ${order.total.toFixed(2)}
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
                placeholder="e.g. Out of stock, Customer changed mind, Kitchen delay..."
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
                onClick={handleExecuteCancel}
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
