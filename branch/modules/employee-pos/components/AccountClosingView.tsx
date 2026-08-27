"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Calendar,
  RefreshCw,
  CheckCircle,
  DollarSign,
  Truck,
  CreditCard,
  Banknote,
  AlertTriangle,
  TrendingUp,
  FileCheck,
  Lock,
  PlusCircle,
  Trash2,
  Layers,
  Receipt,
  Wallet,
  Edit3,
  XCircle,
  Printer,
  FileText,
} from "lucide-react";
import PosNavbar from "@/modules/employee-pos/components/PosNavbar";
import POSSidebarDrawer from "@/modules/employee-pos/components/POSSidebarDrawer";
import toast from "react-hot-toast";
import { getLocalTodayStr, formatLocalTime } from "../utils/timezone";

// ── Helpers ──
const fmt = (val: number) =>
  `$${(typeof val === "number" && !isNaN(val) ? val : 0).toFixed(2)}`;

interface TerminalDeposit {
  _id?: string;
  id?: string;
  cash: number;
  interac: number;
  visa: number;
  mastercard: number;
  giftCard: number;
  totalDeposit: number;
  comments: string;
  time: string;
}

export default function AccountClosingView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab] = useState("account_closing");
  const [selectedDate, setSelectedDate] = useState(getLocalTodayStr());
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDayClosed, setIsDayClosed] = useState(false);

  // ── Data fetched from Backend ──
  const [systemData, setSystemData] = useState({
    grandTotal: 0,
    cash: 0,
    card: 0,
    accountPay: 0,
    totalDriverPayout: 0,
    totalExpensePayout: 0,
    expectedNetDeposit: 0,
  });

  const [driverReport, setDriverReport] = useState<any[]>([]);
  const [expenseReport, setExpenseReport] = useState<any[]>([]);
  const [submittedDeposits, setSubmittedDeposits] = useState<TerminalDeposit[]>(
    [],
  );

  // ── Form State ──
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [enteredCash, setEnteredCash] = useState("0");
  const [enteredInterac, setEnteredInterac] = useState("0");
  const [enteredVisa, setEnteredVisa] = useState("0");
  const [enteredMastercard, setEnteredMastercard] = useState("0");
  const [enteredGiftCard, setEnteredGiftCard] = useState("0");
  const [comments, setComments] = useState("");

  const getBranchId = () => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("rms_branch");
      if (raw) return JSON.parse(raw)._id;
    } catch {}
    return undefined;
  };

  const fetchData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const branchId = getBranchId();
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${apiUrl}/orders/account-closing`, {
          params: { date: selectedDate, ...(branchId ? { branchId } : {}) },
          timeout: 12000,
        });

        if (res.data.success && res.data.data) {
          const d = res.data.data;
          setSystemData(d.systemData || {});
          setDriverReport(d.driverReport || []);
          setExpenseReport(d.expenseReport || []);

          const closing = d.existingClosing;
          if (closing) {
            const list = (closing.terminalDeposits || []).map((item: any) => ({
              id: item._id,
              _id: item._id,
              cash: item.cash || 0,
              interac: item.interac || 0,
              visa: item.visa || 0,
              mastercard: item.mastercard || 0,
              giftCard: item.giftCard || 0,
              totalDeposit: item.totalDeposit || 0,
              comments: item.comments || "",
              time:
                item.time ||
                (item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""),
            }));
            setSubmittedDeposits(list);
            setIsDayClosed(closing.status === "closed");
          } else {
            setSubmittedDeposits([]);
            setIsDayClosed(false);
          }
        }
      } catch (err: any) {
        toast.error("Failed to load account closing data.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Live Computations ──
  const currentFormTotal = useMemo(() => {
    const cash = parseFloat(enteredCash) || 0;
    const interac = parseFloat(enteredInterac) || 0;
    const visa = parseFloat(enteredVisa) || 0;
    const mc = parseFloat(enteredMastercard) || 0;
    const gift = parseFloat(enteredGiftCard) || 0;
    return cash + interac + visa + mc + gift;
  }, [
    enteredCash,
    enteredInterac,
    enteredVisa,
    enteredMastercard,
    enteredGiftCard,
  ]);

  const cumulativeTotals = useMemo(() => {
    const totalCash = submittedDeposits.reduce((sum, d) => sum + d.cash, 0);
    const totalInterac = submittedDeposits.reduce(
      (sum, d) => sum + d.interac,
      0,
    );
    const totalVisa = submittedDeposits.reduce((sum, d) => sum + d.visa, 0);
    const totalMastercard = submittedDeposits.reduce(
      (sum, d) => sum + d.mastercard,
      0,
    );
    const totalGiftCard = submittedDeposits.reduce(
      (sum, d) => sum + d.giftCard,
      0,
    );

    const grandTotalDeposited =
      totalCash + totalInterac + totalVisa + totalMastercard + totalGiftCard;
    const currentShortage =
      grandTotalDeposited - (systemData.expectedNetDeposit || 0);

    return {
      totalCash,
      totalInterac,
      totalVisa,
      totalMastercard,
      totalGiftCard,
      grandTotalDeposited,
      currentShortage,
    };
  }, [submittedDeposits, systemData]);

  const [isPrintingClosing, setIsPrintingClosing] = useState(false);

  const handleSilentPrintAccountClosing = async () => {
    if (isPrintingClosing) return;
    setIsPrintingClosing(true);
    try {
      const branchId = getBranchId();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      toast.loading("Printing Day-End Account Closing Receipt...", {
        id: "print-closing",
      });
      const res = await axios.post(`${apiUrl}/orders/account-closing/print`, {
        date: selectedDate,
        ...(branchId ? { branchId } : {}),
      });

      if (res.data.success) {
        toast.success("Account Closing receipt sent to printer!", {
          id: "print-closing",
        });
      } else {
        throw new Error(res.data.message || "Print failed");
      }
    } catch (err: any) {
      toast.error("Print failed — check printer connection.", {
        id: "print-closing",
      });
    } finally {
      setIsPrintingClosing(false);
    }
  };

  const handleDownloadAccountClosingPdf = async () => {
    try {
      const branchId = getBranchId();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const toastId = toast.loading("Generating account closing PDF...");
      const response = await axios.get(`${apiUrl}/orders/account-closing/pdf`, {
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
      link.setAttribute("download", `account-closing-${selectedDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Account closing PDF downloaded!", { id: toastId });
    } catch (err: any) {
      console.error("Account closing PDF download error:", err);
      toast.error("Failed to download account closing PDF.");
    }
  };

  const handlePrintDeposit = async (dep: TerminalDeposit) => {
    try {
      const branchId = getBranchId();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      toast.loading("Printing deposit receipt...", { id: "print-deposit" });
      const res = await axios.post(
        `${apiUrl}/orders/account-closing/deposit/print`,
        {
          date: selectedDate,
          branchId,
          cash: dep.cash,
          interac: dep.interac,
          visa: dep.visa,
          mastercard: dep.mastercard,
          giftCard: dep.giftCard,
          totalDeposit: dep.totalDeposit,
          comments: dep.comments,
        },
      );

      if (res.data.success) {
        toast.success("Deposit receipt sent to printer!", {
          id: "print-deposit",
        });
      } else {
        throw new Error(res.data.message || "Print failed");
      }
    } catch (err: any) {
      toast.error("Deposit print failed — check printer connection.", {
        id: "print-deposit",
      });
    }
  };

  // ── Add / Update Deposit Handler ──
  const handleAddOrUpdateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (currentFormTotal <= 0) {
      toast.error("Deposit total must be greater than $0.00");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      editingDepositId ? "Updating deposit..." : "Submitting deposit...",
    );
    try {
      const branchId = getBranchId();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      const depositPayload = {
        date: selectedDate,
        branchId,
        depositId: editingDepositId || undefined,
        cash: parseFloat(enteredCash) || 0,
        interac: parseFloat(enteredInterac) || 0,
        visa: parseFloat(enteredVisa) || 0,
        mastercard: parseFloat(enteredMastercard) || 0,
        giftCard: parseFloat(enteredGiftCard) || 0,
        comments: comments.trim(),
        systemCash: systemData.cash,
        systemCard: systemData.card,
        systemGrandTotal: systemData.grandTotal,
        systemAccountPay: systemData.accountPay,
      };

      await axios.post(
        `${apiUrl}/orders/account-closing/deposit`,
        depositPayload,
      );

      toast.success(
        editingDepositId
          ? "Deposit updated successfully!"
          : "Deposit submitted successfully!",
        { id: toastId },
      );

      // Auto-print Deposit Receipt
      try {
        await axios.post(`${apiUrl}/orders/account-closing/deposit/print`, {
          ...depositPayload,
          totalDeposit: currentFormTotal,
        });
      } catch (printErr) {
        console.warn("Auto-print deposit failed:", printErr);
      }

      setEditingDepositId(null);
      setEnteredCash("0");
      setEnteredInterac("0");
      setEnteredVisa("0");
      setEnteredMastercard("0");
      setEnteredGiftCard("0");
      setComments("");

      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save deposit.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Start Handler ──
  const handleStartEdit = (dep: TerminalDeposit) => {
    const id = dep._id || dep.id;
    if (!id) return;
    setEditingDepositId(id);
    setEnteredCash(String(dep.cash));
    setEnteredInterac(String(dep.interac));
    setEnteredVisa(String(dep.visa));
    setEnteredMastercard(String(dep.mastercard));
    setEnteredGiftCard(String(dep.giftCard));
    setComments(dep.comments || "");
    toast("Editing deposit entry", { icon: "✏️" });
  };

  // ── Edit Cancel Handler ──
  const handleCancelEdit = () => {
    setEditingDepositId(null);
    setEnteredCash("0");
    setEnteredInterac("0");
    setEnteredVisa("0");
    setEnteredMastercard("0");
    setEnteredGiftCard("0");
    setComments("");
  };

  // ── Void / Delete Deposit Handler ──
  const handleVoidDeposit = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Deleting deposit...");
    try {
      const branchId = getBranchId();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      await axios.post(`${apiUrl}/orders/account-closing/void`, {
        date: selectedDate,
        branchId,
        depositId: id,
      });

      toast.success("Deposit deleted successfully.", { id: toastId });
      if (editingDepositId === id) handleCancelEdit();
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete deposit.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Final Day Close Handler ──
  const handleFinalCloseDay = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Finalizing day closing...");
    try {
      const branchId = getBranchId();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      await axios.post(`${apiUrl}/orders/account-closing/finalize`, {
        date: selectedDate,
        branchId,
        closedBy: "Manager",
      });

      toast.success("Day Closed & Account Finalized!", { id: toastId });

      // Auto-print Day-End Account Closing Receipt
      try {
        await axios.post(`${apiUrl}/orders/account-closing/print`, {
          date: selectedDate,
          branchId,
        });
      } catch (printErr) {
        console.warn("Auto-print account closing failed:", printErr);
      }

      fetchData(false);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to finalize account closing.",
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans select-none">
      <PosNavbar onToggleSidebar={() => setSidebarOpen(true)} />
      <POSSidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={() => {}}
      />

      {/* ── Top Header Control Bar ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl lg:text-2xl font-900 text-neutral-900 tracking-tight leading-none flex items-center gap-2">
            <FileCheck size={20} className="text-brand-primary" />
            <span>Account Closing</span>
          </h1>
          {isDayClosed ? (
            <span className="flex items-center gap-1 text-[10px] font-800 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle size={11} /> Day Closed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-800 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />{" "}
              Open (In Progress)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Print & PDF Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSilentPrintAccountClosing}
              disabled={isPrintingClosing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-primary hover:bg-[#b9142d] active:scale-95 text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Print Day-End Account Closing Receipt"
            >
              <Printer size={13} />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={handleDownloadAccountClosingPdf}
              className="p-2 bg-neutral-800 hover:bg-black text-white rounded-xl border border-neutral-700 text-[12px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
              title="Download Account Closing PDF"
            >
              <FileText size={14} />
            </button>
          </div>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-4 pr-9 py-1 text-[11px] font-750 text-[#1E3A8A] focus:outline-none cursor-pointer shadow-sm w-[130px]"
            />
            <Calendar
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E3A8A] pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-neutral-200 border-t-brand-primary animate-spin" />
            <span className="text-neutral-500 font-700 text-[12px]">
              Loading live account closing data...
            </span>
          </div>
        ) : (
          <>
            {/* ==================== TOP: DAY CLOSING FINANCIAL SETTLEMENT BOX ==================== */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-900 text-neutral-900 uppercase tracking-wide flex items-center gap-2 border-b border-neutral-200 pb-2">
                <TrendingUp size={14} className="text-brand-primary" />
                <span>Day Closing Financial Settlement</span>
              </h3>

              {/* Detailed Financial Accounting Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5">
                  <p className="text-[9px] lg:text-[10.5px] font-800 uppercase text-neutral-500 mb-0.5">
                    System Grand Total
                  </p>
                  <p className="text-sm lg:text-base font-900 font-mono text-neutral-900">
                    {fmt(systemData.grandTotal)}
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <p className="text-[9px] lg:text-[10.5px] font-800 uppercase text-rose-700 mb-0.5">
                    Driver Payout
                  </p>
                  <p className="text-sm lg:text-base font-900 font-mono text-rose-700">
                    -{fmt(systemData.totalDriverPayout)}
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <p className="text-[9px] lg:text-[10.5px] font-800 uppercase text-rose-700 mb-0.5">
                    Store Expenses
                  </p>
                  <p className="text-sm lg:text-base font-900 font-mono text-rose-700">
                    -{fmt(systemData.totalExpensePayout)}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                  <p className="text-[9px] lg:text-[10.5px] font-800 uppercase text-blue-700 mb-0.5">
                    Expected Net Deposit
                  </p>
                  <p className="text-sm lg:text-base font-900 font-mono text-blue-900">
                    {fmt(systemData.expectedNetDeposit)}
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 col-span-2 sm:col-span-1">
                  <p className="text-[9px] lg:text-[10.5px] font-800 uppercase text-emerald-700 mb-0.5">
                    Total Deposited
                  </p>
                  <p className="text-sm lg:text-base font-900 font-mono text-emerald-900">
                    {fmt(cumulativeTotals.grandTotalDeposited)}
                  </p>
                </div>
              </div>

              {/* Shortage / Settlement Status */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-800 text-neutral-600 uppercase">
                    Shortage / Due Balance:
                  </span>
                  <span
                    className={`text-sm font-900 font-mono px-2.5 py-0.5 rounded-md border ${
                      cumulativeTotals.currentShortage >= 0
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                        : "bg-rose-100 border-rose-300 text-rose-800"
                    }`}
                  >
                    {cumulativeTotals.currentShortage >= 0 ? "+" : ""}
                    {fmt(cumulativeTotals.currentShortage)}
                  </span>
                </div>

                {/* Final Close Day Action */}
                <div>
                  <button
                    type="button"
                    onClick={handleFinalCloseDay}
                    disabled={isDayClosed || isSubmitting}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-900 text-xs uppercase tracking-wide shadow-sm transition-all
                      ${
                        isDayClosed || isSubmitting
                          ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                          : "bg-brand-primary hover:bg-[#b9142d] active:scale-95 text-white cursor-pointer"
                      }`}
                  >
                    <Lock size={14} />
                    <span>
                      {isDayClosed
                        ? "Day Account Closed"
                        : isSubmitting
                          ? "Finalizing..."
                          : "Close Day & Finalize Account"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ==================== 2-COLUMN LAYOUT: FORM & HISTORY TABLE ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ==================== LEFT: DEPOSIT ENTRY FORM (4 cols) ==================== */}
              <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                <div
                  className={`px-4 py-2.5 text-white font-900 text-[12px] lg:text-[14px] uppercase tracking-wider flex items-center justify-between transition-colors ${
                    editingDepositId ? "bg-amber-600" : "bg-brand-primary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {editingDepositId ? (
                      <Edit3 size={15} />
                    ) : (
                      <PlusCircle size={15} />
                    )}
                    <span>
                      {editingDepositId
                        ? "Edit Deposit Entry"
                        : "Day-End Deposit Entry"}
                    </span>
                  </span>
                  {editingDepositId ? (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded font-800 transition-all cursor-pointer"
                    >
                      <XCircle size={11} /> Cancel
                    </button>
                  ) : isDayClosed ? (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-800">
                      <Lock size={10} /> Closed
                    </span>
                  ) : null}
                </div>

                <form
                  onSubmit={handleAddOrUpdateDeposit}
                  className="p-4 space-y-4"
                >
                  {/* Deposit Inputs Table */}
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[12px] lg:text-[14px]">
                      <thead>
                        <tr className="bg-neutral-100 text-neutral-700 font-800 text-[10px] lg:text-[12px] uppercase tracking-wider border-b border-neutral-200">
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60 font-650">
                        <tr className="hover:bg-neutral-50/60">
                          <td className="py-2 px-3 text-neutral-800 font-700 text-xs lg:text-sm">
                            Cash
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={enteredCash}
                              disabled={isDayClosed || isSubmitting}
                              onChange={(e) => setEnteredCash(e.target.value)}
                              className="w-32 rounded-lg px-3 py-1 text-right font-800 font-mono text-xs lg:text-sm border border-neutral-300 focus:border-brand-primary focus:outline-none bg-white text-neutral-900"
                            />
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50/60">
                          <td className="py-2 px-3 text-neutral-800 font-700 text-xs lg:text-sm">
                            Interac / Debit
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={enteredInterac}
                              disabled={isDayClosed || isSubmitting}
                              onChange={(e) =>
                                setEnteredInterac(e.target.value)
                              }
                              className="w-32 rounded-lg px-3 py-1 text-right font-800 font-mono text-xs lg:text-sm border border-neutral-300 focus:border-brand-primary focus:outline-none bg-white text-neutral-900"
                            />
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50/60">
                          <td className="py-2 px-3 text-neutral-800 font-700 text-xs lg:text-sm">
                            Visa
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={enteredVisa}
                              disabled={isDayClosed || isSubmitting}
                              onChange={(e) => setEnteredVisa(e.target.value)}
                              className="w-32 rounded-lg px-3 py-1 text-right font-800 font-mono text-xs lg:text-sm border border-neutral-300 focus:border-brand-primary focus:outline-none bg-white text-neutral-900"
                            />
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50/60">
                          <td className="py-2 px-3 text-neutral-800 font-700 text-xs lg:text-sm">
                            Mastercard
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={enteredMastercard}
                              disabled={isDayClosed || isSubmitting}
                              onChange={(e) =>
                                setEnteredMastercard(e.target.value)
                              }
                              className="w-32 rounded-lg px-3 py-1 text-right font-800 font-mono text-xs lg:text-sm border border-neutral-300 focus:border-brand-primary focus:outline-none bg-white text-neutral-900"
                            />
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50/60">
                          <td className="py-2 px-3 text-neutral-800 font-700 text-xs lg:text-sm">
                            Gift Card
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={enteredGiftCard}
                              disabled={isDayClosed || isSubmitting}
                              onChange={(e) =>
                                setEnteredGiftCard(e.target.value)
                              }
                              className="w-32 rounded-lg px-3 py-1 text-right font-800 font-mono text-xs lg:text-sm border border-neutral-300 focus:border-brand-primary focus:outline-none bg-white text-neutral-900"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* This Deposit Total */}
                    <div className="bg-neutral-900 text-white px-3 py-2.5 flex items-center justify-between font-900 text-xs lg:text-sm border-t border-neutral-800">
                      <span className="uppercase tracking-wider">
                        THIS DEPOSIT TOTAL:
                      </span>
                      <span className="text-emerald-400 font-mono text-sm lg:text-base">
                        {fmt(currentFormTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Comments Input */}
                  <div>
                    <label className="text-[10.5px] lg:text-[12px] font-800 text-neutral-600 uppercase tracking-wide block mb-1">
                      Comments / Notes
                    </label>
                    <textarea
                      rows={2}
                      value={comments}
                      disabled={isDayClosed || isSubmitting}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Optional notes for this deposit..."
                      className="w-full rounded-lg px-3 py-2 text-xs lg:text-sm font-600 border border-neutral-300 focus:border-brand-primary focus:outline-none bg-white text-neutral-900 resize-none"
                    />
                  </div>

                  {/* Submit / Update Deposit Button */}
                  <button
                    type="submit"
                    disabled={
                      isDayClosed || isSubmitting || currentFormTotal <= 0
                    }
                    className={`w-full py-2.5 rounded-xl font-900 text-xs uppercase tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all
                      ${
                        isDayClosed || isSubmitting || currentFormTotal <= 0
                          ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                          : editingDepositId
                            ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-98"
                            : "bg-brand-primary hover:bg-[#b9142d] text-white cursor-pointer active:scale-98"
                      }`}
                  >
                    {editingDepositId ? (
                      <Edit3 size={15} />
                    ) : (
                      <PlusCircle size={15} />
                    )}
                    <span>
                      {isSubmitting
                        ? "Saving..."
                        : editingDepositId
                          ? `Update Deposit (${fmt(currentFormTotal)})`
                          : `Submit Deposit (${fmt(currentFormTotal)})`}
                    </span>
                  </button>
                </form>
              </div>

              {/* ==================== RIGHT: SUBMITTED DEPOSITS HISTORY TABLE (8 cols) ==================== */}
              <div className="lg:col-span-8">
                <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers size={15} />
                      <span>Submitted Deposits History</span>
                    </span>
                    <span className="text-[11px] lg:text-[13px] bg-white/20 px-2.5 py-0.5 rounded-full font-800">
                      {submittedDeposits.length} Entries
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px] lg:text-[14px] whitespace-nowrap">
                      <thead>
                        <tr className="bg-neutral-100 text-neutral-700 font-800 text-[10px] lg:text-[12px] uppercase tracking-wider border-b border-neutral-200">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3 text-right">Cash</th>
                          <th className="py-2.5 px-3 text-right">Interac</th>
                          <th className="py-2.5 px-3 text-right">Visa</th>
                          <th className="py-2.5 px-3 text-right">Mastercard</th>
                          <th className="py-2.5 px-3 text-right">Gift Card</th>
                          <th className="py-2.5 px-3 text-right">
                            Total Deposit
                          </th>
                          <th className="py-2.5 px-3">Time / Notes</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                        {submittedDeposits.length > 0 ? (
                          submittedDeposits.map((dep, idx) => {
                            const depId = dep._id || dep.id || "";
                            return (
                              <tr
                                key={depId || idx}
                                className={`transition-colors ${
                                  editingDepositId === depId
                                    ? "bg-amber-50/80"
                                    : "hover:bg-neutral-50/80"
                                }`}
                              >
                                <td className="py-2.5 px-3 font-800 text-neutral-900">
                                  #{idx + 1}
                                </td>
                                <td className="py-2.5 px-3 text-right font-700 text-emerald-700">
                                  {fmt(dep.cash)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-700 text-blue-700">
                                  {fmt(dep.interac)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-700 text-purple-700">
                                  {fmt(dep.visa)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-700 text-indigo-700">
                                  {fmt(dep.mastercard)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-700 text-amber-700">
                                  {fmt(dep.giftCard)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-900 text-neutral-900 font-mono bg-neutral-50/80">
                                  {fmt(dep.totalDeposit)}
                                </td>
                                <td className="py-2.5 px-3 text-neutral-500 text-[11px]">
                                  <span className="font-700 text-neutral-700">
                                    {dep.time}
                                  </span>
                                  {dep.comments && (
                                    <span className="ml-1.5 italic text-neutral-400">
                                      ({dep.comments})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintDeposit(dep)}
                                      className="px-2 py-1 text-[10px] font-800 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                                      title="Print Deposit Receipt"
                                    >
                                      <Printer size={11} /> Receipt
                                    </button>
                                    {!isDayClosed && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(dep)}
                                          className="px-2 py-1 text-[10px] font-800 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                                          title="Edit this deposit"
                                        >
                                          <Edit3 size={11} /> Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleVoidDeposit(depId)
                                          }
                                          className="p-1 text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                          title="Delete deposit"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={9}
                              className="py-6 text-center text-neutral-400 font-600 text-xs"
                            >
                              No deposits submitted yet for today. Fill the form
                              on the left to add a deposit.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {submittedDeposits.length > 0 && (
                        <tfoot>
                          <tr className="bg-neutral-900 text-white font-900 text-[11px]">
                            <td className="py-3 px-3 uppercase tracking-wide">
                              TOTAL
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-400">
                              {fmt(cumulativeTotals.totalCash)}
                            </td>
                            <td className="py-3 px-3 text-right text-blue-300">
                              {fmt(cumulativeTotals.totalInterac)}
                            </td>
                            <td className="py-3 px-3 text-right text-purple-300">
                              {fmt(cumulativeTotals.totalVisa)}
                            </td>
                            <td className="py-3 px-3 text-right text-indigo-300">
                              {fmt(cumulativeTotals.totalMastercard)}
                            </td>
                            <td className="py-3 px-3 text-right text-amber-300">
                              {fmt(cumulativeTotals.totalGiftCard)}
                            </td>
                            <td
                              className="py-3 px-3 text-right text-emerald-400 font-mono text-sm"
                              colSpan={3}
                            >
                              {fmt(cumulativeTotals.grandTotalDeposited)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== BOTTOM: DRIVER PAYOUT & STORE EXPENSES SUMMARY TABLES ==================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pt-2">
              {/* ── DRIVER PAYOUT SUMMARY TABLE (7 cols) ── */}
              <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Truck size={15} />
                    <span>Driver Payout Summary</span>
                  </span>
                  <span className="text-[11px] lg:text-[13px] bg-white/20 px-2.5 py-0.5 rounded-full font-800">
                    {driverReport.length} Drivers Settled
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] lg:text-[14px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-neutral-100 text-neutral-700 font-800 text-[10px] lg:text-[12px] uppercase tracking-wider border-b border-neutral-200">
                        <th className="py-2.5 px-3">Driver</th>
                        <th className="py-2.5 px-3 text-center"># Delivery</th>
                        <th className="py-2.5 px-3 text-right">Total Sales</th>
                        <th className="py-2.5 px-3 text-right">Prepaid</th>
                        <th className="py-2.5 px-3 text-right">Cash</th>
                        <th className="py-2.5 px-3 text-right">Card</th>
                        <th className="py-2.5 px-3 text-right">Tips</th>
                        <th className="py-2.5 px-3 text-right">Earning</th>
                        <th className="py-2.5 px-3 text-right">Cash Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                      {driverReport.length > 0 ? (
                        driverReport.map((d, i) => (
                          <tr
                            key={i}
                            className="hover:bg-neutral-50/80 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-800 text-neutral-900">
                              {d.driverName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-800 text-neutral-700">
                              {d.deliveryCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-700 text-neutral-800">
                              {fmt(d.totalSales)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-blue-700 font-700">
                              {fmt(d.prepaidSales)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-700">
                              {fmt(d.cashSales)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-purple-700 font-700">
                              {fmt(d.cardSales)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-700 font-700">
                              {fmt(d.totalTips)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-indigo-700 font-700">
                              {fmt(d.driverEarning)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-900 text-rose-600 bg-rose-50/50">
                              {fmt(d.expectedPayout)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-6 text-center text-neutral-400 font-600 text-xs"
                          >
                            No driver settlements found for selected date.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── STORE EXPENSES SUMMARY TABLE (5 cols) ── */}
              <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[14px] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt size={15} />
                    <span>Store Expenses Summary</span>
                  </span>
                  <span className="text-[11px] lg:text-[13px] bg-white/20 px-2.5 py-0.5 rounded-full font-800">
                    {expenseReport.length} Expenses Recorded
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px] lg:text-[14px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-neutral-100 text-neutral-700 font-800 text-[10px] lg:text-[12px] uppercase tracking-wider border-b border-neutral-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                      {expenseReport.length > 0 ? (
                        expenseReport.map((exp, idx) => (
                          <tr
                            key={exp.id || idx}
                            className="hover:bg-neutral-50/80 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-800 text-neutral-900">
                              #{idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-700 text-neutral-900">
                              {exp.description}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600 font-600">
                              {exp.category}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-800 bg-amber-100 text-amber-800 uppercase">
                                {exp.paymentMode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-900 text-rose-600">
                              {fmt(exp.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-neutral-400 font-600 text-xs"
                          >
                            No store expenses recorded for selected date.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
