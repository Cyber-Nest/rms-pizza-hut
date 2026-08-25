"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Printer,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  PlusCircle,
  Receipt,
  DollarSign,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  FileText,
  Truck,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";

interface SalesSummaryViewProps {
  selectedDate: string;
}

export default function SalesSummaryView({
  selectedDate,
}: SalesSummaryViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Deposit modal state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [cashDeposit, setCashDeposit] = useState("");
  const [cardDeposit, setCardDeposit] = useState("");
  const [accountPayDeposit, setAccountPayDeposit] = useState("");

  const fetchSummary = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);
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
        const res = await axios.get(`${apiUrl}/orders/sales-summary`, {
          params: { date: selectedDate, ...(branchId ? { branchId } : {}) },
          timeout: 12000,
        });
        if (res.data.success && res.data.data && res.data.data.financials) {
          setData(res.data.data);
        } else {
          setError("Server ne invalid response bheja. Please refresh karo.");
        }
      } catch (err: any) {
        console.error("Sales summary fetch failed:", err);
        const msg =
          err?.code === "ECONNABORTED"
            ? "Server response slow hai. Dubara try karo."
            : "Backend se connect nahi ho pa raha. Server check karo.";
        setError(msg);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [selectedDate],
  );

  const handleOpenDeposit = () => {
    if (data) {
      const expectedCash = data.moneyToBeCollected?.cash || 0;
      const expectedCard = data.moneyToBeCollected?.card || 0;
      const expectedAccPay = data.moneyToBeCollected?.accountPay || 0;

      setCashDeposit(
        data.deposit
          ? Number(data.deposit.cashAmount).toFixed(2)
          : Number(expectedCash).toFixed(2),
      );
      setCardDeposit(
        data.deposit
          ? Number(data.deposit.cardAmount).toFixed(2)
          : Number(expectedCard).toFixed(2),
      );
      setAccountPayDeposit(
        data.deposit
          ? Number(data.deposit.accountPayAmount).toFixed(2)
          : Number(expectedAccPay).toFixed(2),
      );
    }
    setIsDepositOpen(true);
  };

  const handleSaveDeposit = async (type: "cash" | "card" | "accountPay") => {
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
      const payload = {
        date: selectedDate,
        cashAmount: parseFloat(cashDeposit) || 0,
        cardAmount: parseFloat(cardDeposit) || 0,
        accountPayAmount: parseFloat(accountPayDeposit) || 0,
        ...(branchId ? { branchId } : {}),
      };

      const res = await axios.post(
        `${apiUrl}/orders/sales-summary/deposit`,
        payload,
      );
      if (res.data.success) {
        toast.success(`${type.toUpperCase()} deposit saved successfully!`);
        fetchSummary(false);
        setIsDepositOpen(false);
      } else {
        toast.error(res.data.message || "Failed to save deposit.");
      }
    } catch (err: any) {
      console.error("Failed to save deposit:", err);
      toast.error(
        err.response?.data?.message || "Error occurred while saving deposit.",
      );
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handleDownloadSalesSummaryPdf = async () => {
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== "undefined") {
        const rawBranch = localStorage.getItem("rms_branch");
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id || b.id || b.branchId;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const toastId = toast.loading(`Generating sales summary PDF...`);
      const response = await axios.get(`${apiUrl}/orders/sales-summary/pdf`, {
        params: {
          date: selectedDate,
          ...(branchId ? { branchId } : {}),
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales-summary-${selectedDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Sales summary PDF downloaded!", { id: toastId });
    } catch (err: any) {
      console.error("Sales summary PDF download error:", err);
      toast.error("Failed to download sales summary PDF.");
    }
  };

  const handleSilentPrintSalesSummary = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
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
      toast.loading(`Printing sales summary for ${selectedDate}...`, {
        id: "print-summary",
      });
      const res = await axios.post(`${apiUrl}/orders/sales-summary/print`, {
        date: selectedDate,
        ...(branchId ? { branchId } : {}),
      });

      if (res.data.success) {
        toast.success(`Sales summary sent to printer!`, {
          id: "print-summary",
        });
      } else {
        throw new Error(res.data.message || "Print failed");
      }
    } catch (err: any) {
      toast.error("Print failed — check printer connection.", {
        id: "print-summary",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-600 text-[12px] p-12 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-neutral-200 border-t-brand-primary animate-spin" />
        <span className="text-neutral-500 font-700 text-[13px] lg:text-[14.5px]">
          Loading Sales Summary Report...
        </span>
        <span className="text-neutral-400 text-[11px] lg:text-[13px]">
          Fetching data for {selectedDate}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 gap-3">
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 max-w-sm w-full text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={22} className="text-neutral-400" />
          </div>
          <p className="text-neutral-800 font-800 text-[13px] mb-1">
            Unable to Load Report
          </p>
          <p className="text-neutral-400 font-500 text-[11px] mb-5">
            Could not fetch sales data for the selected date. Please check your
            connection and try again.
          </p>
          <button
            onClick={() => fetchSummary(true)}
            className="px-6 py-2 bg-brand-primary text-white text-[11px] font-800 uppercase tracking-wide rounded-full hover:bg-[#b9142d] active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    completedOrders = { count: 0, totalAmount: 0 },
    cancelledOrders = { count: 0, totalAmount: 0 },
    refundOrders = { count: 0, totalAmount: 0 },
    financials = {
      allCategoryTotal: 0,
      subTotal: 0,
      deliveryCharges: 0,
      debitCardCharges: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
      tips: 0,
      finalAmount: 0,
    },
    categorySales = [],
    discountSummary = { percentageDiscount: 0, total: 0 },
    taxSummary = { pst: 0, gst: 0, hst: 0, total: 0 },
    salesReceived = {
      accountPay: 0,
      cash: 0,
      creditCardSales: 0,
      debitCardSales: 0,
      grandTotal: 0,
      tips: 0,
      finalAmount: 0,
    },
    cardTypeReceived = {
      interac: { total: 0, tips: 0, final: 0 },
      mastercard: { total: 0, tips: 0, final: 0 },
      visa: { total: 0, tips: 0, final: 0 },
      total: { total: 0, tips: 0, final: 0 },
    },
    orderTypeSummary = {
      takeout: 0,
      dineIn: 0,
      driveThrough: 0,
      delivery: 0,
      total: 0,
    },
    channelSummary = { online: 0, doordash: 0, skip: 0, ubereats: 0, pos: 0 },
    expense = [],
    shortageOverage = { cash: 0, card: 0, accountPay: 0 },
    moneyToBeCollected = { cash: 0, card: 0, accountPay: 0 },
    driverReport = [],
    accountClosing = null,
  } = data;

  return (
    <div className="space-y-6 select-none font-sans text-neutral-900 pb-12">
      {/* Date Filter & Control Action Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-800 text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200">
            <Calendar size={14} className="text-brand-primary" />
            <span>
              Date Filter: <strong>{selectedDate}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Silent Thermal Print Button */}
          <button
            onClick={handleSilentPrintSalesSummary}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Print Sales Summary directly to connected Thermal Printer"
          >
            {isPrinting ? (
              <>
                <RefreshCw size={13} className="animate-spin text-white" />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer size={13} />
                <span>Print Receipt</span>
              </>
            )}
          </button>

          {/* PDF Download Icon Button */}
          <button
            onClick={handleDownloadSalesSummaryPdf}
            className="p-2 bg-neutral-800 hover:bg-black text-white rounded-xl border border-neutral-700 text-[12px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
            title="Download PDF Sales Summary"
          >
            <FileText size={14} />
          </button>

          {/* Refresh Report Button */}
          <button
            onClick={() => fetchSummary(true)}
            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all cursor-pointer border border-neutral-300 active:scale-95 flex items-center justify-center ml-0.5"
            title="Refresh Report"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="space-y-6">
          {/* 1. SALES SUMMARY BY CATEGORY */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider flex items-center justify-between">
              <span>Sales Summary By Category</span>
              <span className="text-[10px] lg:text-[11.5px] bg-white/20 px-2 py-0.5 rounded font-700">
                Total
              </span>
            </div>
            <div className="p-0">
              <table className="w-full text-left text-[12px] lg:text-[13.5px]">
                <tbody className="divide-y divide-neutral-200/60 font-600">
                  {categorySales && categorySales.length > 0 ? (
                    categorySales.map((cat: any) => (
                      <tr key={cat.name} className="hover:bg-neutral-50/70">
                        <td className="py-2.5 px-4 text-neutral-800 font-650">
                          {cat.name}
                        </td>
                        <td className="py-2.5 px-4 text-right font-800 text-neutral-900">
                          ${cat.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-3 px-4 text-center text-neutral-400 font-500"
                      >
                        No category records found for selected date.
                      </td>
                    </tr>
                  )}
                  {/* Totals Section */}
                  <tr className="bg-neutral-50/80 font-800 text-neutral-900 border-t border-neutral-200">
                    <td className="py-2.5 px-4 uppercase text-[11px] lg:text-[12px] tracking-wide">
                      All Category Total
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      ${financials.allCategoryTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-neutral-700">Sub Total</td>
                    <td className="py-2.5 px-4 text-right font-700 text-neutral-900">
                      ${financials.subTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-neutral-500">
                      Delivery Charges
                    </td>
                    <td className="py-2 px-4 text-right font-600 text-neutral-500">
                      ${financials.deliveryCharges.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-neutral-500">
                      Debit Card Charges
                    </td>
                    <td className="py-2 px-4 text-right font-600 text-neutral-500">
                      ${financials.debitCardCharges.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-neutral-700">Discount</td>
                    <td className="py-2 px-4 text-right font-700 text-amber-600">
                      ${financials.discount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-neutral-700">Tax</td>
                    <td className="py-2 px-4 text-right font-700 text-neutral-900">
                      ${financials.tax.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-orange-50/60 font-900 text-neutral-900 border-y border-brand-primary/20">
                    <td className="py-2.5 px-4 uppercase text-[11px] lg:text-[12px] tracking-wide">
                      Grand Total
                    </td>
                    <td className="py-2.5 px-4 text-right text-brand-primary font-900 text-sm">
                      ${financials.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-neutral-500">Tips</td>
                    <td className="py-2 px-4 text-right font-600 text-neutral-500">
                      ${financials.tips.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-neutral-900 text-white font-900">
                    <td className="py-2.5 px-4 uppercase text-[11px] lg:text-[12px] tracking-wide">
                      Final Amount
                    </td>
                    <td className="py-2.5 px-4 text-right text-sm text-emerald-400 font-900">
                      ${financials.finalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 1.5. PROMO CODE & DISCOUNT SUMMARY */}
          {/* <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
              <span>Promo Code & Discount Summary</span>
              <Tag size={14} />
            </div>
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                  <th className="py-2 px-4">Promo Code</th>
                  <th className="py-2 px-4 text-center">Redeemed</th>
                  <th className="py-2 px-4 text-right">Total Discount ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                {financials.promoSummary && financials.promoSummary.length > 0 ? (
                  financials.promoSummary.map((promo: any) => (
                    <tr key={promo.code}>
                      <td className="py-2 px-4 font-mono font-800 text-neutral-900">{promo.code}</td>
                      <td className="py-2 px-4 text-center font-700">{promo.count} times</td>
                      <td className="py-2 px-4 text-right font-800 text-amber-600">-${Number(promo.totalDiscount).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-neutral-400 text-[11px] font-600 italic">
                      No promo codes redeemed for this period
                    </td>
                  </tr>
                )}
                <tr className="bg-neutral-900 text-white font-900">
                  <td className="py-2.5 px-4 uppercase text-[10.5px]" colSpan={2}>Total Discount Given</td>
                  <td className="py-2.5 px-4 text-right text-sm text-amber-400 font-900">-${financials.discount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div> */}

          {/* 2. SALES RECEIVED (Left Table) */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Sales Received
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                  <th className="py-2 px-4">Payment Type</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                <tr>
                  <td className="py-2 px-4">Account Pay (Prepaid Online)</td>
                  <td className="py-2 px-4 text-right font-700 text-blue-700">
                    ${salesReceived.accountPay.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Cash</td>
                  <td className="py-2 px-4 text-right font-800 text-emerald-600">
                    ${salesReceived.cash.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Credit Card - Sales (Terminal)</td>
                  <td className="py-2 px-4 text-right font-700 text-purple-700">
                    ${salesReceived.creditCardSales.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Debit Card - Sales</td>
                  <td className="py-2 px-4 text-right font-700 text-neutral-900">
                    ${salesReceived.debitCardSales.toFixed(2)}
                  </td>
                </tr>
                {salesReceived.unpaidSales !== undefined &&
                  salesReceived.unpaidSales > 0 && (
                    <tr className="bg-amber-50/60">
                      <td className="py-2 px-4 text-amber-800 font-700">
                        Unpaid / Pay Later (Pending)
                      </td>
                      <td className="py-2 px-4 text-right font-800 text-amber-700">
                        ${salesReceived.unpaidSales.toFixed(2)}
                      </td>
                    </tr>
                  )}
                <tr className="bg-neutral-50 font-900 text-neutral-900 border-t border-neutral-200/80">
                  <td className="py-2 px-4 uppercase text-[10.5px]">
                    Grand Total
                  </td>
                  <td className="py-2 px-4 text-right text-brand-primary font-900">
                    ${salesReceived.grandTotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-4 text-neutral-500 text-[11px]">
                    Prepaid - Tips
                  </td>
                  <td className="py-1.5 px-4 text-right font-600 text-neutral-500">
                    ${salesReceived.tips.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-neutral-900 text-white font-900">
                  <td className="py-2 px-4 uppercase text-[10.5px]">
                    Final Amount
                  </td>
                  <td className="py-2 px-4 text-right text-emerald-400 font-900">
                    ${salesReceived.finalAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. ORDER TYPE */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Order Type
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                  <th className="py-2 px-4">Order Type</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                <tr>
                  <td className="py-2 px-4">Take-Out</td>
                  <td className="py-2 px-4 text-right font-700">
                    ${orderTypeSummary.takeout.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Dine-in</td>
                  <td className="py-2 px-4 text-right font-700">
                    ${orderTypeSummary.dineIn.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Drive Through</td>
                  <td className="py-2 px-4 text-right font-700">
                    ${orderTypeSummary.driveThrough.toFixed(2)}
                  </td>
                </tr>
                {orderTypeSummary.delivery !== undefined && (
                  <tr>
                    <td className="py-2 px-4 font-700 text-brand-primary">
                      Delivery
                    </td>
                    <td className="py-2 px-4 text-right font-800 text-brand-primary">
                      ${orderTypeSummary.delivery.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="bg-orange-50/60 font-900 text-neutral-900 border-t border-brand-primary/20">
                  <td className="py-2 px-4 uppercase text-[10.5px]">Total</td>
                  <td className="py-2 px-4 text-right text-brand-primary font-900">
                    ${orderTypeSummary.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. EXPENSE */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Expense
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                  <th className="py-2 px-4">Employee</th>
                  <th className="py-2 px-4 text-center">Mode</th>
                  <th className="py-2 px-4 text-center">PST</th>
                  <th className="py-2 px-4 text-center">GST</th>
                  <th className="py-2 px-4 text-center">HST</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                {expense && expense.length > 0 ? (
                  expense.map((exp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50/70">
                      <td className="py-2.5 px-4 font-700 text-neutral-900">
                        {exp.employee || exp.employeeName || "Manager"}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-800 uppercase tracking-wider ${exp.paymentMode === "card" ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}
                        >
                          {exp.paymentMode || "cash"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-neutral-500">
                        ${Number(exp.pst || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-center text-neutral-500">
                        ${Number(exp.gst || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-center text-neutral-500">
                        ${Number(exp.hst || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-800 text-brand-primary">
                        ${Number(exp.total || exp.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-3 px-4 text-center text-neutral-400 font-600"
                    >
                      No Record Found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── ACCOUNT CLOSING STATUS (Left Column) ── */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText size={14} />
                <span>Account Closing</span>
              </span>
              {accountClosing ? (
                <span className="flex items-center gap-1 text-[9.5px] bg-emerald-500 text-white px-2 py-0.5 rounded font-800">
                  <CheckCircle size={10} /> Day Closed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9.5px] bg-amber-400 text-amber-900 px-2 py-0.5 rounded font-800">
                  <XCircle size={10} /> Not Closed
                </span>
              )}
            </div>

            {(() => {
              // Calculate live settlement figures if accountClosing doc is open or not closed
              const sysGrand = accountClosing
                ? Number(accountClosing.systemGrandTotal || 0)
                : Number(financials.grandTotal || 0);
              const drvPayout = accountClosing
                ? Number(accountClosing.totalDriverPayout || 0)
                : driverReport.reduce(
                    (acc: number, d: any) =>
                      acc + Number(d.expectedPayout || d.payout || 0),
                    0,
                  );
              const storeExp = accountClosing
                ? Number(accountClosing.totalExpensePayout || 0)
                : Number(expense?.amount || 0);
              const expNetDep = accountClosing
                ? Number(accountClosing.systemCash || 0) +
                  Number(accountClosing.systemCard || 0)
                : Math.max(0, sysGrand - drvPayout - storeExp);
              const totDep = accountClosing
                ? Number(accountClosing.enteredGrandTotal || 0)
                : data.deposit
                  ? Number(data.deposit.cashAmount || 0) +
                    Number(data.deposit.cardAmount || 0)
                  : 0;
              const dueBal = accountClosing
                ? Number(accountClosing.grandShortage || 0)
                : totDep - expNetDep;
              const isClosed = accountClosing?.status === "closed";

              return (
                <div className="p-4 space-y-3">
                  {/* Financial Settlement 5 Blocks */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2">
                      <p className="text-[8.5px] font-800 uppercase text-neutral-500 mb-0.5">
                        System Grand Total
                      </p>
                      <p className="text-xs font-900 font-mono text-neutral-900">
                        ${sysGrand.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                      <p className="text-[8.5px] font-800 uppercase text-rose-700 mb-0.5">
                        Driver Payout
                      </p>
                      <p className="text-xs font-900 font-mono text-rose-700">
                        -${drvPayout.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
                      <p className="text-[8.5px] font-800 uppercase text-rose-700 mb-0.5">
                        Store Expenses
                      </p>
                      <p className="text-xs font-900 font-mono text-rose-700">
                        -${storeExp.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-[8.5px] font-800 uppercase text-blue-700 mb-0.5">
                        Expected Net Deposit
                      </p>
                      <p className="text-xs font-900 font-mono text-blue-900">
                        ${expNetDep.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 col-span-2 sm:col-span-1">
                      <p className="text-[8.5px] font-800 uppercase text-emerald-700 mb-0.5">
                        Total Deposited
                      </p>
                      <p className="text-xs font-900 font-mono text-emerald-900">
                        ${totDep.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Shortage / Settlement Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-800 text-neutral-600 uppercase">
                        Shortage / Due Balance:
                      </span>
                      <span
                        className={`text-xs font-900 font-mono px-2.5 py-0.5 rounded-md border ${
                          dueBal >= -0.005
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                            : "bg-rose-100 border-rose-300 text-rose-800"
                        }`}
                      >
                        {dueBal >= 0 ? "+" : ""}${dueBal.toFixed(2)}
                      </span>
                    </div>

                    <a
                      href="/employee/account-closing"
                      className="flex items-center gap-1 text-[10.5px] font-800 text-brand-primary hover:underline"
                    >
                      <FileText size={12} /> View Details
                    </a>
                  </div>
                  {/* {isClosed && (
                    <p className="text-[9.5px] text-neutral-400 font-600">Closed by: {accountClosing.closedBy || 'Manager'}</p>
                  )} */}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="space-y-6">
          {/* 1. COMPLETED ORDERS */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Completed Orders
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-100">
                  <th className="py-2 px-4">Payment Status</th>
                  <th className="py-2 px-4 text-center"># Of Orders</th>
                  <th className="py-2 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-650 text-neutral-800">
                <tr>
                  <td className="py-2.5 px-4 font-700 text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    <span>Paid</span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-800 bg-neutral-50">
                    {completedOrders.count}
                  </td>
                  <td className="py-2.5 px-4 text-right font-800 text-emerald-600">
                    ${completedOrders.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. CANCELLED ORDERS */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Cancelled Orders
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-100">
                  <th className="py-2 px-4">Payment Status</th>
                  <th className="py-2 px-4 text-center"># Of Orders</th>
                  <th className="py-2 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {cancelledOrders && cancelledOrders.count > 0 ? (
                  <tr className="font-650 text-neutral-800">
                    <td className="py-2.5 px-4 font-700 text-red-600 flex items-center gap-1.5">
                      <XCircle size={14} />
                      <span>Cancelled</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-800 bg-neutral-50">
                      {cancelledOrders.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-800 text-red-600">
                      ${cancelledOrders.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 px-4 text-center text-neutral-400 font-600"
                    >
                      No Record Found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3. REFUND ORDERS */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Refund Orders
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                  <th className="py-2 px-4 text-center"># Of Refund Orders</th>
                  <th className="py-2 px-4 text-right">Total Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                {refundOrders && refundOrders.count > 0 ? (
                  <tr className="font-650 text-neutral-800">
                    <td className="py-2.5 px-4 text-center font-800 bg-neutral-50">
                      {refundOrders.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-800 text-rose-600">
                      ${refundOrders.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-3 px-4 text-center text-neutral-400 font-600"
                    >
                      No Record Found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. DISCOUNT & PROMO SUMMARY */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Discount & Promo Summary
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                  <th className="py-2 px-4">Description</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                <tr>
                  <td className="py-2 px-4">Discount</td>
                  <td className="py-2 px-4 text-right font-700 text-amber-600">
                    ${discountSummary.percentageDiscount.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-neutral-50 font-900 text-neutral-900 border-t border-neutral-200/80">
                  <td className="py-2 px-4 uppercase text-[10.5px]">Total</td>
                  <td className="py-2 px-4 text-right text-amber-600 font-900">
                    ${discountSummary.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. TAX SUMMARY */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Tax Summary
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                  <th className="py-2 px-4">Description</th>
                  <th className="py-2 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                <tr>
                  <td className="py-2 px-4 text-neutral-500">PST</td>
                  <td className="py-2 px-4 text-right font-600 text-neutral-500">
                    ${taxSummary.pst.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-neutral-800">GST</td>
                  <td className="py-2 px-4 text-right font-700 text-neutral-900">
                    ${taxSummary.gst.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-neutral-500">HST</td>
                  <td className="py-2 px-4 text-right font-600 text-neutral-500">
                    ${taxSummary.hst.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-neutral-50 font-900 text-neutral-900 border-t border-neutral-200/80">
                  <td className="py-2 px-4 uppercase text-[10.5px]">Total</td>
                  <td className="py-2 px-4 text-right font-900">
                    ${taxSummary.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. SALES RECEIVED (Card Details - Right Table) */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Sales Received
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-900 text-white font-800 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Card Type</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Tips</th>
                  <th className="py-2.5 px-4 text-right">Final Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                <tr>
                  <td className="py-2 px-4 font-700 text-neutral-900">
                    INTERAC
                  </td>
                  <td className="py-2 px-4 text-right">
                    ${cardTypeReceived.interac.total.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.interac.tips.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right font-800">
                    ${cardTypeReceived.interac.final.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-neutral-500">MASTERCARD</td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.mastercard.total.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.mastercard.tips.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.mastercard.final.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-neutral-500">VISA</td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.visa.total.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.visa.tips.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right text-neutral-400">
                    ${cardTypeReceived.visa.final.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-neutral-50 font-900 text-neutral-900 border-t border-neutral-200/80">
                  <td className="py-2 px-4 uppercase text-[10.5px]">Total</td>
                  <td className="py-2 px-4 text-right">
                    ${cardTypeReceived.total.total.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right">
                    ${cardTypeReceived.total.tips.toFixed(2)}
                  </td>
                  <td className="py-2 px-4 text-right text-brand-primary font-900">
                    ${cardTypeReceived.total.final.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 7. ORDER TYPE (Channel Breakdown - Online vs POS) */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Order Channel Breakdown
            </div>

            <div className="p-4 space-y-3">
              {/* Online */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="bg-neutral-100 px-3 py-1 font-800 text-[11px] lg:text-[12.5px] uppercase text-neutral-700">
                  ONLINE (Stripe Prepaid)
                </div>
                <table className="w-full text-left text-[12px] lg:text-[13.5px]">
                  <tbody className="divide-y divide-neutral-200/60">
                    <tr>
                      <td className="py-1.5 px-3 font-650 text-neutral-700">
                        Online (Website/App)
                      </td>
                      <td className="py-1.5 px-3 text-right font-700 text-blue-700">
                        ${(channelSummary.online || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-650 text-neutral-700">
                        DoorDash
                      </td>
                      <td className="py-1.5 px-3 text-right font-700">
                        ${(channelSummary.doordash || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-650 text-neutral-700">
                        Skip
                      </td>
                      <td className="py-1.5 px-3 text-right font-700">
                        ${(channelSummary.skip || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-650 text-neutral-700">
                        Uber Eats
                      </td>
                      <td className="py-1.5 px-3 text-right font-700">
                        ${(channelSummary.ubereats || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-neutral-50 font-900 border-t border-neutral-200/80">
                      <td className="py-1.5 px-3 uppercase text-[10px]">
                        Total Online
                      </td>
                      <td className="py-1.5 px-3 text-right text-brand-primary font-900">
                        $
                        {(
                          (channelSummary.online || 0) +
                          (channelSummary.doordash || 0) +
                          (channelSummary.skip || 0) +
                          (channelSummary.ubereats || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* POS */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="bg-neutral-100 px-3 py-1 font-800 text-[11px] lg:text-[12.5px] uppercase text-neutral-700">
                  POS (Call-In Delivery & In-Store)
                </div>
                <table className="w-full text-left text-[12px] lg:text-[13.5px]">
                  <tbody className="divide-y divide-neutral-200/60">
                    <tr>
                      <td className="py-1.5 px-3 font-650 text-neutral-700">
                        POS Terminal
                      </td>
                      <td className="py-1.5 px-3 text-right font-700 text-purple-700">
                        ${channelSummary.pos.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-neutral-50 font-900 border-t border-neutral-200/80">
                      <td className="py-1.5 px-3 uppercase text-[10px]">
                        Total POS
                      </td>
                      <td className="py-1.5 px-3 text-right text-brand-primary font-900">
                        ${channelSummary.pos.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 8. SHORTAGE / OVERAGE */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider">
              Shortage / Overage
            </div>
            <table className="w-full text-left text-[12px] lg:text-[13.5px]">
              <thead>
                <tr className="bg-neutral-100 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                  <th className="py-2 px-4 text-center">Cash</th>
                  <th className="py-2 px-4 text-center">Card</th>
                  <th className="py-2 px-4 text-center">Account Pay</th>
                </tr>
              </thead>
              <tbody className="font-700 text-neutral-800">
                <tr>
                  <td className="py-2.5 px-4 text-center text-neutral-500">
                    ${shortageOverage.cash.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-center text-neutral-500">
                    ${shortageOverage.card.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-center text-neutral-500">
                    ${shortageOverage.accountPay.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 9. MONEY TO BE COLLECTED FROM STORE (Reflects Driver Cash Payout Deductions) */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
              <span>Money To Be Collected From Store</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-700">
                Driver Payout Adjusted
              </span>
            </div>

            <div className="p-4 space-y-4">
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                      <th className="py-2 px-4 text-center">
                        Cash (Net Register)
                      </th>
                      <th className="py-2 px-4 text-center">Card</th>
                      <th className="py-2 px-4 text-center">
                        Account Pay (Prepaid)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-800 text-neutral-900">
                    <tr>
                      <td
                        className={`py-3 px-4 text-center font-900 ${moneyToBeCollected.cash >= 0 ? "text-emerald-600" : "text-rose-600 font-black"}`}
                      >
                        {moneyToBeCollected.cash < 0
                          ? `-$${Math.abs(moneyToBeCollected.cash).toFixed(2)}`
                          : `$${moneyToBeCollected.cash.toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4 text-center text-purple-700 font-900">
                        ${moneyToBeCollected.card.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-700 font-800">
                        ${moneyToBeCollected.accountPay.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleOpenDeposit}
                  disabled={!!data.deposit}
                  className={`flex items-center gap-2 px-6 py-2 text-white font-800 text-[12px] uppercase tracking-wide rounded-full shadow-sm transition-all ${
                    data.deposit
                      ? "bg-neutral-250 text-neutral-400 cursor-not-allowed opacity-60"
                      : "bg-[#e31837] hover:bg-[#b9142d] active:scale-95 cursor-pointer"
                  }`}
                >
                  <PlusCircle size={15} />
                  <span>{data.deposit ? "Deposited" : "Add Deposit"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FULL WIDTH BOTTOM SECTION: DRIVER REPORT TABLE ==================== */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden mt-6">
        <div className="bg-brand-primary text-white px-5 py-3 font-900 text-[13px] lg:text-[15px] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Truck size={16} />
            <span>Driver Report & Settlement Summary</span>
          </span>
          <span className="text-[11px] bg-white/20 px-3 py-1 rounded-full font-700">
            {driverReport.length} Drivers Active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] lg:text-[13.5px] whitespace-nowrap">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700 font-850 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4 text-center"># Delivery</th>
                <th className="py-3 px-4 text-right">Prepaid (Online)</th>
                <th className="py-3 px-4 text-right">Cash</th>
                <th className="py-3 px-4 text-right">Card (Terminal)</th>
                <th className="py-3 px-4 text-right">Prepaid Tip</th>
                <th className="py-3 px-4 text-right">Terminal Tip</th>
                <th className="py-3 px-4 text-right">Total Tip</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Driver Earning</th>
                <th className="py-3 px-4 text-right">Expected Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 font-650">
              {driverReport && driverReport.length > 0 ? (
                driverReport.map((drv: any, idx: number) => {
                  const prepaidTip = Number(
                    drv.prepaidTip || drv.prepaidTips || 0,
                  );
                  const terminalTip = Number(
                    drv.terminalTip || drv.terminalTips || 0,
                  );
                  const totalTip = Number(
                    drv.totalTip ||
                      drv.cardTip ||
                      drv.tips ||
                      prepaidTip + terminalTip,
                  );

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-neutral-50/80 transition-colors text-neutral-800"
                    >
                      <td className="py-3 px-4 font-800 text-neutral-900">
                        {drv.driverName || drv.driver || drv.name}
                      </td>
                      <td className="py-3 px-4 text-center font-800 bg-neutral-50/80">
                        {drv.deliveryCount ?? drv.deliveries ?? drv.count ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right font-700 text-blue-700">
                        $
                        {Number(drv.prepaidSales || drv.prepaid || 0).toFixed(
                          2,
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-700 text-emerald-700">
                        ${Number(drv.cashSales || drv.cash || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-700 text-purple-700">
                        ${Number(drv.cardSales || drv.card || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-700 text-blue-800">
                        ${prepaidTip.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-700 text-purple-800">
                        ${terminalTip.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-800 text-amber-700">
                        ${totalTip.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-800 text-neutral-900">
                        ${Number(drv.totalSales || drv.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-800 text-brand-primary">
                        $
                        {Number(drv.driverEarning || drv.earning || 0).toFixed(
                          2,
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-900 text-sm ${Number(drv.expectedPayout || drv.payout || 0) >= 0 ? "text-emerald-700 bg-emerald-50/60" : "text-rose-600 bg-rose-50/60"}`}
                      >
                        $
                        {Number(drv.expectedPayout || drv.payout || 0).toFixed(
                          2,
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="py-5 px-4 text-center text-neutral-400 font-600 text-xs"
                  >
                    No driver records found for selected date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
