"use client";

import React from "react";
import { ChefHat } from "lucide-react";
import { Order, CartItem } from "../types";

interface ThermalReceiptProps {
  order: Order | null;
}

export default function ThermalReceipt({ order }: ThermalReceiptProps) {
  if (!order) return null;

  const formatDateFormatted = (dateStr: string | undefined) => {
    if (!dateStr) return "Sat, Jun 27, 2026 01:40 PM";
    try {
      const d = new Date(dateStr);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const dayName = days[d.getDay()];
      const monthName = months[d.getMonth()];
      const dayNum = String(d.getDate()).padStart(2, "0");
      const year = d.getFullYear();

      let hours = d.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 hour should be 12
      const strHours = String(hours).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");

      return `${dayName}, ${monthName} ${dayNum}, ${year} ${strHours}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  const formattedDateStr = formatDateFormatted(order.createdAt);

  return (
    <div className="thermal-receipt-container font-mono text-neutral-900 text-[11px] leading-tight select-none">
      {/* Printable Area - styling applied via inline / tailwind & @media print in global CSS */}
      <div className="w-[80mm] max-w-full bg-white p-4 mx-auto border border-dashed border-neutral-300 shadow-sm print:shadow-none print:border-none">
        {/* Top Branding Logo */}
        <div className="flex flex-col items-center justify-center text-center mb-2">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <ChefHat size={22} className="text-black stroke-[2.5]" />
            <div className="leading-none text-left font-sans">
              <span className="text-sm font-900 tracking-tight block">
                Pizza
              </span>
              <span className="text-[11px] font-800 tracking-widest uppercase text-black block">
                Hut
              </span>
            </div>
          </div>
        </div>

        {/* Store Information Box with dashed border matching photo */}
        <div className="border border-dashed border-neutral-400 p-2 text-center text-[10px] space-y-0.5 mb-3 leading-snug">
          <p className="font-600">{(order as any)?.branchAddress || "231 Edgefield Pl , Strathmore,"}</p>
          <p className="font-600">{(order as any)?.branchCity || "Alberta, T1P 0E8, Canada"}</p>
          <p className="font-600">Tel # : {(order as any)?.branchPhone || "(587) 365-5401"}</p>
          <p className="font-600">GST# : {(order as any)?.gstNumber || (order as any)?.branchGst || "11111111"}</p>
        </div>

        {/* Order Header */}
        <div className="text-center space-y-1 mb-3">
          <h1 className="text-lg font-900 tracking-tight uppercase">
            Order # : {order.orderNumber.replace(/^[#A-Za-z\-]+/, "")}
          </h1>
          <p className="text-[10px] font-600 text-neutral-800">
            {formattedDateStr}
          </p>
          <p className="text-[10.5px] font-800 tracking-wide uppercase">
            ORDER SUMMARY ({order.paymentStatus === "paid" ? "PAID" : "UNPAID"})
          </p>
          <p className="text-[11px] font-900 tracking-widest uppercase">
            {(() => {
              const platformLabels: Record<string, string> = {
                doordash: "DoorDash",
                skip: "Skip",
                ubereats: "Uber Eats",
                online: "Online",
              };
              const platform = platformLabels[order.orderSource];
              const typeStr = order.orderType ? order.orderType.replace("-", " ") : "TAKEOUT";
              return platform ? `${platform} ${typeStr}` : typeStr;
            })()}
          </p>
        </div>

        {/* Customer Delivery Notes */}
        {order.notes && (
          <div className="border border-black p-2 my-2 text-center text-[10.5px] font-800 leading-snug uppercase">
            <p className="underline mb-0.5">NOTE / DELIVERY INSTRUCTIONS:</p>
            <p className="font-900">"{order.notes}"</p>
          </div>
        )}

        {/* Items Table Header */}
        <div className="border-t border-b border-dashed border-neutral-800 py-1.5 my-2 font-800 text-[10.5px] grid grid-cols-12 uppercase">
          <span className="col-span-7">ITEMS</span>
          <span className="col-span-2 text-center">QTY</span>
          <span className="col-span-3 text-right">AMT</span>
        </div>

        {/* Items List */}
        <div className="space-y-2.5 my-2">
          {order.items && order.items.length > 0 ? (
            order.items.map((item: CartItem, idx: number) => {
              const itemTotal =
                (item.totalPrice as number | undefined) ??
                item.basePrice * item.quantity;
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="grid grid-cols-12 font-800 text-[11px] items-start">
                    <span className="col-span-7 pr-1 leading-tight">
                      {item.name}
                    </span>
                    <span className="col-span-2 text-center font-700">
                      {item.quantity}
                    </span>
                    <span className="col-span-3 text-right font-700">
                      ${itemTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Render Modifiers / Sub-items indented matching photo */}
                  {item.selectedModifiers &&
                    item.selectedModifiers.length > 0 && (
                      <div className="pl-3 space-y-0.5 text-[10px] text-neutral-700 font-500">
                        {item.selectedModifiers.map((mod, mIdx) => {
                          const isMinus = mod.optionName.trim().startsWith('-') || mod.optionName.toLowerCase().includes('no ');
                          return (
                            <p key={mIdx} className={`leading-tight ${isMinus ? "font-800 text-black uppercase" : ""}`}>
                              {mod.optionName}{" "}
                              {mod.price > 0 ? `(+$${mod.price.toFixed(2)})` : ""}
                            </p>
                          );
                        })}
                      </div>
                    )}

                  {/* Item note if any */}
                  {item.note && (
                    <p className="pl-3 text-[10px] font-700 text-black">
                      Note : {item.note}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center py-2 text-neutral-500">
              No items in order
            </p>
          )}
        </div>

        {/* Totals Section */}
        <div className="border-t border-dashed border-neutral-800 pt-2 mt-3 space-y-1 text-[11px] font-600">
          <div className="flex justify-between">
            <span>Subtotal :</span>
            <span className="font-700">
              ${(order.subtotal ?? 0).toFixed(2)}
            </span>
          </div>
          {(order.discount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span>Discount :</span>
              <span className="font-700">
                -${(order.discount ?? 0).toFixed(2)} (
                {order.discountType === "percentage"
                  ? `${((order.discount / order.subtotal) * 100).toFixed(0)}%`
                  : "Fixed"}
                )
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>GST :</span>
            <span className="font-700">
              ${(order.tax ?? 0).toFixed(2)} (
              {((order.taxRate ?? 0) * 100).toFixed(0)}%)
            </span>
          </div>
          {(order.tip ?? 0) > 0 && (
            <div className="flex justify-between font-700">
              <span>Tip :</span>
              <span className="font-700">
                +${(order.tip ?? 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[12px] font-900 pt-1 border-t border-neutral-200">
            <span>Total :</span>
            <span className="font-900">${(order.total ?? 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Transaction Record Section matching payment type */}
        {(() => {
          const firstPayment =
            order.payments && order.payments.length > 0
              ? order.payments[0]
              : null;
          const isThirdParty = ["doordash", "skip", "ubereats"].includes(order.orderSource);
          const isCard = firstPayment
            ? ["card", "interac", "debit", "credit"].includes(
                firstPayment.method.toLowerCase(),
              )
            : (order.paymentType as string) === "card" || (order as any).paymentMethod === "card" || order.orderSource === "online";
          return (
            <div className="border-t border-b border-dashed border-neutral-800 py-2 my-3 space-y-1 text-[10px]">
              <p className="text-center font-800 uppercase tracking-wider mb-1">
                TRANSACTION RECORD
              </p>
              {isThirdParty ? (
                <>
                  <div className="flex justify-between font-600">
                    <span>TYPE :</span>
                    <span className="font-700">ACCOUNT PAY</span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>PLATFORM :</span>
                    <span className="font-700 uppercase">{order.orderSource === "online" ? "WEBSITE" : order.orderSource}</span>
                  </div>
                </>
              ) : isCard ? (
                <>
                  <div className="flex justify-between font-600">
                    <span>ACCT :</span>
                    <span className="font-700">INTERAC</span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>CARD NUMBER :</span>
                    <span className="font-700">************5762</span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>Type :</span>
                    <span className="font-700">CARD</span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>TRANS # :</span>
                    <span className="font-700">1027-0_649</span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>AID :</span>
                    <span className="font-700">0THB2O87P7ZOBIK</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-600">
                    <span>TYPE :</span>
                    <span className="font-700">CASH</span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>CASH GIVEN :</span>
                    <span className="font-700">
                      $
                      {(firstPayment?.cashGiven ?? order.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-600">
                    <span>CHANGE :</span>
                    <span className="font-700">
                      ${(firstPayment?.changeGiven ?? 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Footer Messages matching photo */}
        <div className="text-center space-y-1.5 pt-1 text-[10px] text-neutral-800">
          <p className="font-800 italic">
            "Don't Cook Tonight, Call Pizza Hut!"
          </p>
          <p className="font-600">Have a nice day, Visit us again!</p>
          <p className="text-[8.5px] leading-tight text-neutral-600 pt-1 px-1">
            We are implementing new POS systems. If you see any discrepancy in
            the invoice, please email the invoice to
            accounting@chickendelight.com
          </p>
        </div>
      </div>
    </div>
  );
}
