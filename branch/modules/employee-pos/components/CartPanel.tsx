"use client";

import React from "react";
import {
  ShoppingBag,
  Users,
  Trash2,
  Plus,
  ChevronRight,
  Car,
  TableProperties,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePosStore } from "../store/pos.store";
import CartItem from "./CartItem";

export default function CartPanel() {
  const {
    cartItems,
    selectedCustomer,
    selectedTable,
    selectedVehicle,
    subtotal,
    tax,
    discount,
    total,
    orderType,
    clearCart,
    openCheckout,
    nextOrderNumber,
    branchTaxFees,
  } = usePosStore();

  const activeTaxRatePercent =
    (branchTaxFees?.gstTaxRate ?? 5) +
    (branchTaxFees?.pstTaxRate ?? 0) +
    (branchTaxFees?.hstTaxRate ?? 0);

  const orderNum = nextOrderNumber;

  const validate = () => {
    if (!cartItems.length) {
      toast.error("Cart is empty.");
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (!validate()) return;
    openCheckout();
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;

    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1.5 min-w-[220px]">
          <p className="text-[11.5px] font-700 text-neutral-800 uppercase tracking-wide">
            Clear Cart
          </p>
          <p className="text-[10px] text-neutral-500 font-550">
            Are you sure you want to clear all items from your cart?
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
                clearCart();
                toast.success("Cart cleared successfully.");
              }}
              className="px-2.5 py-1 rounded bg-[#DC2626] hover:bg-red-700 text-white text-[10px] font-700 transition-all cursor-pointer"
            >
              Yes, Clear
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
      },
    );
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 flex flex-col h-full overflow-hidden select-none">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-100 flex-shrink-0">
        <div>
          <h3 className="text-[12px] font-700 text-neutral-900 leading-tight">
            Current Order
          </h3>
          <span className="text-[10px] font-600 text-brand-primary tracking-wide mt-0.5 block">
            {orderNum}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded-md">
            <Users size={9} className="text-neutral-500" />
            <span className="text-[9px] font-700 text-neutral-600">
              {selectedCustomer ? 1 : 0}
            </span>
          </div>
          <button
            onClick={handleClearCart}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            title="Clear cart"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Cart Items ── */}
      <div className="flex-1 overflow-y-auto px-3.5 min-h-0">
        {cartItems.length > 0 ? (
          <div className="py-1">
            {cartItems.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded-full flex items-center justify-center mb-2">
              <ShoppingBag size={18} className="text-neutral-300" />
            </div>
            <h4 className="text-[11px] font-600 text-neutral-600">
              Cart is empty
            </h4>
            <p className="text-[9px] text-neutral-400 mt-1 leading-normal">
              Select items from the menu
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-neutral-100 px-3.5 py-3 space-y-2.5 flex-shrink-0">
        {/* Add More */}
        <button
          onClick={() =>
            document
              .getElementById("menu-grid-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="w-full py-1.5 rounded-lg border border-dashed border-neutral-300 text-neutral-500 hover:border-brand-primary hover:text-brand-primary text-[9.5px] font-600 flex items-center justify-center gap-1 hover:bg-orange-50/30 transition-all cursor-pointer"
        >
          <Plus size={10} />
          Add More Items
        </button>

        {/* Totals */}
        <div className="space-y-1.5">
          {[
            {
              label: "Subtotal",
              value: `$${subtotal.toFixed(2)}`,
              cls: "text-neutral-700",
            },
            {
              label: `Tax (${activeTaxRatePercent}%)`,
              value: `$${tax.toFixed(2)}`,
              cls: "text-neutral-500",
            },
            ...(discount > 0
              ? [
                  {
                    label: "Discount",
                    value: `-$${discount.toFixed(2)}`,
                    cls: "text-green-600",
                  },
                ]
              : []),
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] font-500 text-neutral-500">
                {label}
              </span>
              <span className={`text-[10px] font-600 ${cls}`}>{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 mt-1">
            <span className="text-[11px] font-700 text-neutral-900 uppercase tracking-wide">
              Total
            </span>
            <span className="text-[14px] font-800 text-brand-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-1.5 pt-0.5">
          <button
            onClick={handleCreate}
            disabled={!cartItems.length}
            className={`w-full py-2.5 rounded-xl text-[11px] font-700 flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
              cartItems.length
                ? "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-brand-primary/20"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
            }`}
          >
            Create Order <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
