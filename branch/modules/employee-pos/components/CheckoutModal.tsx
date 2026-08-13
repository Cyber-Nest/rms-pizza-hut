"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  Banknote,
  Clock,
  Utensils,
  ShoppingBag,
  Car,
  Minus,
  Plus,
  UserPlus,
  Tag,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Truck,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePosStore } from "../store/pos.store";
import OrderLaterModal from "./OrderLaterModal";
import PromoDiscountModal from "./PromoDiscountModal";
import CustomerModal from "./CustomerModal";

const DENOMINATIONS = [5, 10, 20, 50, 100];

const ORDER_TYPE_LABELS: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  takeout: { label: "Takeout", icon: <ShoppingBag size={11} /> },
  delivery: { label: "Delivery", icon: <Truck size={11} /> },
  // "drive-through": { label: "Drive Thru", icon: <Car size={11} /> },
  "dine-in": { label: "Dine In", icon: <Utensils size={11} /> },
};

export default function CheckoutModal() {
  const {
    checkoutOpen,
    closeCheckout,
    orderType,
    setOrderType,
    cartItems,
    subtotal,
    tax,
    discount,
    total,
    appliedPromo,
    manualDiscountType,
    manualDiscountValue,
    paymentTiming,
    setPaymentTiming,
    paymentType,
    setPaymentType,
    paymentMethod,
    setPaymentMethod,
    branchTaxFees,
    splitPayments,
    addSplitPayment,
    updateSplitPayment,
    removeSplitPayment,
    cashDenominations,
    setCashDenomination,
    setCashGiven,
    cashGiven,
    changeAmount,
    orderSource,
    setOrderSource,
    orderTiming,
    setOrderTiming,
    scheduledAt,
    setScheduledAt,
    orderNotes,
    setOrderNotes,
    selectedCustomer,
    setCustomer,
    placeOrder,
    placingOrder,
    skipLastDigits,
    setSkipLastDigits,
  } = usePosStore();

  const [showOrderLater, setShowOrderLater] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const submittingRef = React.useRef(false);

  // Custom split state
  const [nextSplitAmount, setNextSplitAmount] = useState<string>("");
  const [nextSplitMethod, setNextSplitMethod] = useState<"cash" | "card">(
    "cash",
  );

  // Split payment helpers
  const splitTotal = splitPayments.reduce((s, p) => s + p.amount, 0);
  const splitRemaining = Math.max(0, total - splitTotal);

  React.useEffect(() => {
    if (splitPayments.length > 0 && splitRemaining > 0.01) {
      setNextSplitAmount(splitRemaining.toFixed(2));
    } else {
      setNextSplitAmount("");
    }
  }, [splitPayments.length, splitRemaining]);

  React.useEffect(() => {
    if (checkoutOpen) {
      const notesArray = cartItems
        .filter((item) => item.note && item.note.trim() !== "")
        .map((item) => {
          return cartItems.length === 1
            ? item.note
            : `${item.name}: ${item.note}`;
        });
      const itemNotes = notesArray.join(", ");
      if (itemNotes && !orderNotes) {
        setOrderNotes(itemNotes);
      }
    }
  }, [checkoutOpen, cartItems, orderNotes, setOrderNotes]);

  const isThirdParty = ["doordash", "skip", "ubereats"].includes(orderSource);

  const handleOrderTypeChange = (
    type: "takeout" | "delivery" | "drive-through" | "dine-in",
  ) => {
    setOrderType(type);
    if (type === "delivery") {
      if (
        !selectedCustomer ||
        !selectedCustomer.name ||
        !selectedCustomer.name.trim() ||
        !selectedCustomer.phone ||
        !selectedCustomer.phone.trim() ||
        !selectedCustomer.address ||
        !selectedCustomer.address.trim()
      ) {
        setShowCustomer(true);
      }
    }
  };

  const handleOrderTimingChange = (timing: "now" | "later") => {
    setOrderTiming(timing);
    if (timing === "later") {
      setShowOrderLater(true);
    } else {
      setScheduledAt(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    // Validate Delivery Order Customer Info
    if (orderType === "delivery") {
      if (
        !selectedCustomer ||
        !selectedCustomer.name ||
        !selectedCustomer.name.trim() ||
        !selectedCustomer.phone ||
        !selectedCustomer.phone.trim() ||
        !selectedCustomer.address ||
        !selectedCustomer.address.trim()
      ) {
        toast.error(
          "Customer Name, Phone, and Delivery Address are required for Delivery orders.",
        );
        setShowCustomer(true);
        submittingRef.current = false;
        return;
      }
    }

    // Validate 3rd Party Orders
    if (orderSource === "doordash" || orderSource === "ubereats") {
      if (
        !selectedCustomer ||
        !selectedCustomer.name ||
        !selectedCustomer.name.trim()
      ) {
        toast.error(
          "Customer name is required for DoorDash and Uber Eats orders.",
        );
        submittingRef.current = false;
        return;
      }
    }

    if (orderSource === "skip") {
      if (!skipLastDigits || !/^\d{6}$/.test(skipLastDigits)) {
        toast.error("Please enter a valid 6 digit number for Skip.");
        submittingRef.current = false;
        return;
      }
    }

    if (paymentTiming === "pay-now") {
      if (paymentType === "split") {
        if (splitPayments.length < 2) {
          toast.error("Please enter at least 2 split payments.");
          submittingRef.current = false;
          return;
        }
        const sumOk = Math.abs(splitTotal - total) < 0.01;
        if (!sumOk) {
          toast.error(
            `Remaining split balance is $${splitRemaining.toFixed(2)}. Please pay the full amount before placing the order.`,
          );
          submittingRef.current = false;
          return;
        }
      } else if (!isThirdParty) {
        if (paymentMethod === "cash" && cashGiven < total) {
          toast.error("Cash given is less than the total amount.");
          submittingRef.current = false;
          return;
        }
      }
    }
    if (orderTiming === "later" && !scheduledAt) {
      toast.error("Please confirm the pickup schedule.");
      submittingRef.current = false;
      return;
    }

    try {
      const order = await placeOrder();
      if (order) {
        toast.success(
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-700 text-[11px] text-green-900">
              Order Placed! 🎉
            </span>
            <span className="text-[10px] text-green-800">
              {order.orderNumber} • {order.orderType.toUpperCase()}
            </span>
            <span className="font-600 text-[10px] text-green-950">
              {order.paymentStatus === "unpaid"
                ? "⏳ Payment Pending"
                : `✓ Paid $${order.total.toFixed(2)}`}
            </span>
          </div>,
        );
      }
    } finally {
      submittingRef.current = false;
    }
  };

  if (!checkoutOpen) return null;

  const discountLabel = appliedPromo
    ? `${appliedPromo.code} (-$${appliedPromo.discountAmount.toFixed(2)})`
    : manualDiscountType === "percentage"
      ? `${manualDiscountValue}% off (-$${discount.toFixed(2)})`
      : manualDiscountType === "flat"
        ? `-$${discount.toFixed(2)}`
        : null;

  const formatScheduled = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-3">
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
          {/* ── Header ── */}
          <div className="bg-brand-primary px-5 py-3 flex items-center gap-3 flex-shrink-0">
            <h2 className="text-[14px] font-900 text-white uppercase tracking-widest">
              Your Order
            </h2>

            {/* Order type tabs */}
            <div className="flex items-center gap-1.5 ml-2">
              {(isThirdParty
                ? (["takeout", "delivery"] as const)
                : (["takeout", "delivery", /* "drive-through", */ "dine-in"] as const)
              ).map((t) => {
                const entry = ORDER_TYPE_LABELS[t];
                if (!entry) return null;
                const { label } = entry;
                return (
                  <button
                    key={t}
                    onClick={() => handleOrderTypeChange(t)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-900 uppercase tracking-wide transition-all cursor-pointer ${
                      orderType === t
                        ? "bg-white text-brand-primary shadow-sm"
                        : "bg-white/20 text-white font-800 hover:bg-white/30"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={closeCheckout}
              className="ml-auto flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-full text-[11px] font-900 uppercase transition-all cursor-pointer"
            >
              <X size={13} strokeWidth={2.5} /> Close
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* ══ LEFT — Payment Panel ══ */}
            <div className="w-1/2 border-r border-neutral-100 flex flex-col overflow-hidden">
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {/* Pay Now / Pay Later */}
                {!isThirdParty && (
                  <div className="grid grid-cols-2 gap-2">
                    {(["pay-now", "pay-later"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setPaymentTiming(t)}
                        className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer active:scale-[0.98] ${
                          paymentTiming === t
                            ? "bg-brand-primary text-white shadow-sm"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        }`}
                      >
                        {t === "pay-now" ? "Pay Now" : "Pay Later"}
                      </button>
                    ))}
                  </div>
                )}

                {/* One Time / Split Payment */}
                {paymentTiming === "pay-now" && !isThirdParty && (
                  <div className="grid grid-cols-2 gap-2">
                    {(["one-time", "split"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setPaymentType(t)}
                        className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer active:scale-[0.98] ${
                          paymentType === t
                            ? "bg-neutral-800 text-white shadow-sm"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        }`}
                      >
                        {t === "one-time" ? "One Time" : "Split Payment"}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── PAY LATER info ── */}
                {paymentTiming === "pay-later" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <Clock
                      size={14}
                      className="text-amber-600 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[11px] font-700 text-amber-800">
                        Payment Pending
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Order will be placed. Customer can pay when picking up
                        (within 1–3 hours).
                      </p>
                    </div>
                  </div>
                )}

                {/* ── ONE TIME PAYMENT ── */}
                {paymentTiming === "pay-now" &&
                  paymentType === "one-time" &&
                  !isThirdParty && (
                    <>
                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-600 text-neutral-500 mb-1.5 uppercase tracking-wide">
                          Amount To Pay ($)
                        </label>
                        <div className="border border-neutral-200 rounded-xl px-3.5 py-2.5 bg-brand-primary/5">
                          <span className="text-[16px] font-800 text-brand-primary">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Cash / Card */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod("cash")}
                          className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                            paymentMethod === "cash"
                              ? "bg-brand-primary text-white shadow-sm"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          <Banknote size={13} /> Cash
                        </button>
                        <button
                          onClick={() => setPaymentMethod("card")}
                          className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                            paymentMethod === "card"
                              ? "bg-brand-primary text-white shadow-sm"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          <CreditCard size={13} /> Card
                        </button>
                      </div>

                      {/* Cash denomination picker */}
                      {paymentMethod === "cash" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-600 text-neutral-500 uppercase tracking-wide">
                            Cash Denominations
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {DENOMINATIONS.map((denom) => {
                              const qty = cashDenominations[denom] || 0;
                              return (
                                <div
                                  key={denom}
                                  className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 flex flex-col items-center gap-1.5"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[10px] font-700 text-neutral-700">
                                      ${denom}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setCashDenomination(denom, qty - 1)
                                      }
                                      className="w-5 h-5 flex items-center justify-center rounded-md bg-neutral-200 hover:bg-neutral-300 transition-colors cursor-pointer"
                                    >
                                      <Minus size={9} />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[13px] font-800 text-neutral-900 w-6 text-center">
                                      {qty}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setCashDenomination(denom, qty + 1)
                                      }
                                      className="w-5 h-5 flex items-center justify-center rounded-md bg-brand-primary hover:bg-brand-primary-hover text-white transition-colors cursor-pointer"
                                    >
                                      <Plus size={9} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Custom cash amount input */}
                          <div>
                            <label className="block text-[10px] font-600 text-neutral-500 mb-1.5 uppercase tracking-wide">
                              Or Enter Custom Amount
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-500 text-neutral-400">
                                $
                              </span>
                              <input
                                type="number"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={
                                  cashGiven > 0 &&
                                  Object.values(cashDenominations).every(
                                    (q) => q === 0,
                                  )
                                    ? cashGiven
                                    : ""
                                }
                                onChange={(e) =>
                                  setCashGiven(parseFloat(e.target.value) || 0)
                                }
                                className="w-full border border-neutral-200 rounded-xl pl-8 pr-4 py-2.5 text-[12px] font-600 text-neutral-800 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 transition-all"
                              />
                            </div>
                          </div>

                          {/* Cash totals */}
                          {cashGiven > 0 && (
                            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-neutral-500 font-500">
                                  Cash Given
                                </span>
                                <span className="text-[11px] font-700 text-neutral-800">
                                  ${cashGiven.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-neutral-500 font-500">
                                  Change Due
                                </span>
                                <span
                                  className={`text-[12px] font-800 ${changeAmount > 0 ? "text-green-600" : "text-neutral-400"}`}
                                >
                                  ${changeAmount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                {/* ── ACCOUNT PAY (3rd Party) ── */}
                {paymentTiming === "pay-now" &&
                  paymentType === "one-time" &&
                  isThirdParty && (
                    <div className="space-y-2">
                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-600 text-neutral-500 mb-1.5 uppercase tracking-wide">
                          Amount To Pay ($)
                        </label>
                        <div className="border border-neutral-200 rounded-xl px-3.5 py-2.5 bg-brand-primary/5">
                          <span className="text-[16px] font-800 text-brand-primary">
                            ${total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Account Pay Badge */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                        <CheckCircle
                          size={14}
                          className="text-emerald-600 flex-shrink-0 mt-0.5"
                        />
                        <div>
                          <p className="text-[11px] font-700 text-emerald-800">
                            Account Pay
                          </p>
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            Payment received via{" "}
                            {orderSource === "doordash"
                              ? "DoorDash"
                              : orderSource === "skip"
                                ? "Skip The Dishes"
                                : "Uber Eats"}
                            . Amount will be recorded as Account Pay.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* ── SPLIT PAYMENT ── */}
                {paymentTiming === "pay-now" && paymentType === "split" && (
                  <div className="space-y-3">
                    {/* Status header */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <p className="text-[11px] font-700 text-neutral-700 uppercase tracking-wide">
                        Split Payments
                      </p>
                      <span
                        className={`text-[11px] font-800 ${splitRemaining < 0.01 ? "text-green-600" : "text-brand-primary"}`}
                      >
                        Paid: ${splitTotal.toFixed(2)} / ${total.toFixed(2)}
                      </span>
                    </div>

                    {/* List of processed split payments */}
                    {splitPayments.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-600 text-neutral-400 uppercase tracking-wide">
                          Processed Payments
                        </p>
                        {splitPayments.map((sp, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-800 text-neutral-500">
                                #{i + 1}
                              </span>
                              <span className="text-[11px] font-700 text-neutral-800">
                                ${sp.amount.toFixed(2)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-700 uppercase ${
                                  sp.method === "cash"
                                    ? "bg-orange-50 text-brand-primary border border-orange-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {sp.method}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSplitPayment(i)}
                              className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-0.5 hover:bg-neutral-100 rounded-md"
                              title="Remove Payment"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Next payment entry input */}
                    {splitRemaining > 0.01 ? (
                      <div className="bg-neutral-50/50 border border-dashed border-neutral-250 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-700 text-neutral-700 uppercase tracking-wide">
                          Pay Next Split
                        </p>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-600 text-neutral-500 uppercase tracking-wide">
                            Amount to Pay ($)
                          </label>
                          <input
                            type="number"
                            placeholder="Enter split amount"
                            min="0.01"
                            max={splitRemaining}
                            step="0.01"
                            value={nextSplitAmount}
                            onChange={(e) => setNextSplitAmount(e.target.value)}
                            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-650 text-neutral-800 bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNextSplitMethod("cash")}
                            className={`py-2 rounded-lg text-[10px] font-700 uppercase transition-all cursor-pointer border ${
                              nextSplitMethod === "cash"
                                ? "bg-brand-primary border-brand-primary text-white shadow-xs"
                                : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            Cash
                          </button>
                          <button
                            type="button"
                            onClick={() => setNextSplitMethod("card")}
                            className={`py-2 rounded-lg text-[10px] font-700 uppercase transition-all cursor-pointer border ${
                              nextSplitMethod === "card"
                                ? "bg-brand-primary border-brand-primary text-white shadow-xs"
                                : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            Card
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const amt = parseFloat(nextSplitAmount);
                            if (isNaN(amt) || amt <= 0) {
                              toast.error("Please enter a valid amount.");
                              return;
                            }
                            if (amt > splitRemaining + 0.01) {
                              toast.error(
                                `Amount cannot exceed remaining balance of $${splitRemaining.toFixed(2)}`,
                              );
                              return;
                            }
                            addSplitPayment({
                              method: nextSplitMethod,
                              amount: amt,
                            });
                          }}
                          className="w-full py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-[10.5px] font-700 uppercase transition-all cursor-pointer shadow-xs"
                        >
                          Pay ${parseFloat(nextSplitAmount || "0").toFixed(2)} (
                          {nextSplitMethod})
                        </button>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                        <p className="text-[11px] font-750 text-green-700">
                          ✓ All splits fully paid!
                        </p>
                        <p className="text-[9.5px] text-green-600 mt-0.5">
                          Click "Place Order" below to complete transaction.
                        </p>
                      </div>
                    )}

                    {/* Remaining hint */}
                    {/* {splitRemaining > 0.01 && (
                    <div className="flex items-center gap-1.5 bg-amber-50/50 border border-amber-200/40 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-700 font-600">
                      <AlertCircle size={12} className="flex-shrink-0" />
                      <span>Remaining balance to be split: ${splitRemaining.toFixed(2)}</span>
                    </div>
                  )} */}
                  </div>
                )}
              </div>

              {/* ── Place Order Button — fixed at bottom ── */}
              <div className="flex-shrink-0 p-4 pt-0 border-t border-neutral-100">
                <button
                  onClick={handlePlaceOrder}
                  disabled={
                    placingOrder ||
                    cartItems.length === 0 ||
                    (paymentTiming === "pay-now" &&
                      paymentType === "split" &&
                      splitRemaining > 0.01)
                  }
                  className={`w-full py-3 rounded-xl text-[13px] font-800 uppercase tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm ${
                    placingOrder ||
                    cartItems.length === 0 ||
                    (paymentTiming === "pay-now" &&
                      paymentType === "split" &&
                      splitRemaining > 0.01)
                      ? "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                      : "bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer shadow-brand-primary/20"
                  }`}
                >
                  {placingOrder ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Placing
                      Order...
                    </>
                  ) : paymentTiming === "pay-now" &&
                    paymentType === "split" &&
                    splitRemaining > 0.01 ? (
                    <>Remaining split balance: ${splitRemaining.toFixed(2)}</>
                  ) : paymentTiming === "pay-later" ? (
                    <>Place Order (Pay Later)</>
                  ) : (
                    <>Place Order ${total.toFixed(2)}</>
                  )}
                </button>
              </div>
            </div>

            {/* ══ RIGHT — Order Details Panel ══ */}
            <div className="w-1/2 flex flex-col overflow-y-auto p-4 space-y-3 no-scrollbar">
              {/* Order Now / Order Later */}
              <div className="grid grid-cols-2 gap-2">
                {(["now", "later"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleOrderTimingChange(t)}
                    className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer active:scale-[0.98] ${
                      orderTiming === t
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    }`}
                  >
                    {t === "now" ? "Order Now" : "Order Later"}
                  </button>
                ))}
              </div>

              {/* Scheduled time preview */}
              {orderTiming === "later" && scheduledAt && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-2">
                  <Clock
                    size={13}
                    className="text-brand-primary flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-[10px] font-600 text-brand-primary">
                      Scheduled Pickup
                    </p>
                    <p className="text-[11px] font-700 text-neutral-800">
                      {formatScheduled(scheduledAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOrderLater(true)}
                    className="text-[9px] font-600 text-brand-primary hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* POS / Online Order */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setOrderSource("pos");
                    // Reset order type if switching from 3rd party
                    if (
                      ["doordash", "skip", "ubereats"].includes(orderSource) &&
                      orderType === "delivery"
                    ) {
                      setOrderType("takeout");
                    }
                  }}
                  className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer active:scale-[0.98] ${
                    orderSource === "pos"
                      ? "bg-neutral-800 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  POS
                </button>
                <button
                  onClick={() => {
                    setOrderSource("doordash");
                    // Reset order type if it's not takeout or delivery
                    if (
                      orderType === "drive-through" ||
                      orderType === "dine-in"
                    ) {
                      setOrderType("takeout");
                    }
                  }}
                  className={`py-2.5 rounded-xl text-[11px] font-700 uppercase tracking-wide transition-all cursor-pointer active:scale-[0.98] ${
                    isThirdParty
                      ? "bg-neutral-800 text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  Online Order
                </button>
              </div>

              {/* 3rd Party Platform Selector */}
              {isThirdParty && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-600 text-neutral-500 uppercase tracking-wide">
                    Select Platform
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        id: "doordash" as const,
                        label: "DoorDash",
                        color: "bg-red-50 border-red-200 text-red-700",
                        activeColor: "bg-red-600 border-red-600 text-white",
                      },
                      {
                        id: "skip" as const,
                        label: "Skip",
                        color: "bg-orange-50 border-orange-200 text-orange-700",
                        activeColor:
                          "bg-orange-600 border-orange-600 text-white",
                      },
                      {
                        id: "ubereats" as const,
                        label: "Uber Eats",
                        color: "bg-green-50 border-green-200 text-green-700",
                        activeColor: "bg-green-600 border-green-600 text-white",
                      },
                    ].map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => setOrderSource(platform.id)}
                        className={`py-2 rounded-xl text-[10px] font-700 uppercase tracking-wide transition-all cursor-pointer active:scale-[0.97] border ${
                          orderSource === platform.id
                            ? platform.activeColor + " shadow-sm"
                            : platform.color + " hover:opacity-80"
                        }`}
                      >
                        {platform.label}
                      </button>
                    ))}
                  </div>

                  {orderSource === "skip" && (
                    <div className="space-y-1 mt-2.5 animate-scale-up">
                      <label className="block text-[10px] font-600 text-neutral-500 uppercase tracking-wide">
                        Enter your skip last digit
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6 digit number"
                        value={skipLastDigits}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, ""); // Allow only digits
                          setSkipLastDigits(val);
                        }}
                        className="w-full border border-neutral-200 rounded-xl px-3.5 py-2 text-[11px] font-600 text-neutral-800 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Order Notes */}
              <div>
                <label className="block text-[10px] font-600 text-neutral-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <FileText size={9} /> Order Notes
                </label>
                <textarea
                  placeholder="Add any special instructions..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 resize-none transition-all placeholder:text-neutral-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {orderSource === "skip" ? (
                  <div className="py-2.5 rounded-xl text-[11px] font-600 flex items-center justify-center gap-1.5 border bg-neutral-100 border-neutral-200 text-neutral-400 select-none cursor-not-allowed">
                    <UserPlus size={12} />
                    <span>Customer Details (Skip)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomer(true)}
                    className={`py-2.5 rounded-xl text-[11px] font-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] border ${
                      selectedCustomer
                        ? "bg-orange-50 border-brand-primary text-brand-primary"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300"
                    }`}
                  >
                    <UserPlus size={12} />
                    {selectedCustomer
                      ? `${selectedCustomer.name}`
                      : "Add Customer"}
                  </button>
                )}

                <button
                  onClick={() => setShowPromo(true)}
                  className={`py-2.5 rounded-xl text-[11px] font-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] border ${
                    discountLabel
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-800"
                  }`}
                >
                  <Tag size={12} />
                  {discountLabel ? discountLabel : "Add Promo Code"}
                </button>
              </div>

              {/* ── Order Summary ── */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2">
                <p className="text-[11px] font-700 text-neutral-800 uppercase tracking-wide text-center mb-3">
                  Order Summary
                </p>

                {/* Items count */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="text-[10px] text-neutral-500 font-500">
                    {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10px] font-600 text-neutral-700">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-500">
                      Sub Total
                    </span>
                    <span className="text-[10px] font-600 text-neutral-700">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-green-600 font-500 flex items-center gap-1">
                        <CheckCircle size={9} /> Discount
                      </span>
                      <span className="text-[10px] font-600 text-green-600">
                        -${discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {orderType === "delivery" && (
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-[10px] text-brand-primary font-600 flex items-center gap-1">
                        <Truck size={10} /> Delivery Fee
                      </span>
                      <span className="text-[10px] font-700 text-brand-primary">
                        +${(branchTaxFees?.deliveryFee ?? 4.99).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-500">
                      GST ({branchTaxFees?.gstTaxRate ?? 5}%)
                    </span>
                    <span className="text-[10px] font-600 text-neutral-700">
                      ${tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 font-500">
                      Total Tax (
                      {(branchTaxFees?.gstTaxRate ?? 5) +
                        (branchTaxFees?.pstTaxRate ?? 0) +
                        (branchTaxFees?.hstTaxRate ?? 0)}
                      %)
                    </span>
                    <span className="text-[10px] font-600 text-neutral-700">
                      ${tax.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200 mt-1">
                  <span className="text-[11px] font-700 text-neutral-900">
                    Amount To Pay
                  </span>
                  <span className="text-[15px] font-800 text-brand-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>

                {/* Payment status badge */}
                {paymentTiming === "pay-later" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 mt-1">
                    <Clock size={10} className="text-amber-600" />
                    <span className="text-[10px] font-600 text-amber-700">
                      Will be marked as UNPAID until collected
                    </span>
                  </div>
                )}
              </div>

              {/* Cancel / Send Tracker */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={closeCheckout}
                  className="text-[10px] font-600 text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X size={11} /> Cancel Order
                </button>
                <button
                  disabled
                  className="text-[10px] font-500 text-neutral-300 flex items-center gap-1 cursor-not-allowed"
                  title="Coming soon"
                >
                  🔔 Send Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <OrderLaterModal
        isOpen={showOrderLater}
        onClose={() => setShowOrderLater(false)}
        onConfirm={(iso) => {
          setScheduledAt(iso);
          setOrderTiming("later");
        }}
      />
      <PromoDiscountModal
        isOpen={showPromo}
        onClose={() => setShowPromo(false)}
      />
      <CustomerModal
        isOpen={showCustomer}
        onClose={() => setShowCustomer(false)}
      />
    </>
  );
}
