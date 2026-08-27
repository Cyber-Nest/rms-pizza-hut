"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Truck,
  Calendar,
  User,
  Search,
  Printer,
  DollarSign,
  CheckCircle,
  FileText,
  ArrowRightLeft,
  XCircle,
  Award,
  CreditCard,
  Wallet,
  RefreshCw,
  X,
  Check,
  Lock,
  Phone,
  Car,
  Download,
  LogOut,
} from "lucide-react";
import PosNavbar from "@/modules/employee-pos/components/PosNavbar";
import POSSidebarDrawer from "@/modules/employee-pos/components/POSSidebarDrawer";
import ThermalDriverSalesReport, {
  DriverDropSummaryData,
} from "./ThermalDriverSalesReport";
import ThermalDriverCommissionSlip, {
  DriverCommissionSlipData,
} from "./ThermalDriverCommissionSlip";
import toast from "react-hot-toast";
import { getLocalTodayStr } from "../../employee-pos/utils/timezone";

export interface DriverInfo {
  id: string;
  driverId: string;
  name: string;
  phone: string;
  vehicle: string;
  status: string;
  isSettled?: boolean;
  settlementSummary?: any;
}

interface OrderRow {
  orderNumber: string;
  id: string;
  ticketName: string;
  customerName: string;
  phone: string;
  address: string;
  time: string;
  total: number;
  dc: number;
  pd: "PP" | "TM" | "CS";
  prepaidTip: number;
  terminalTip: number;
  cashGiven: number;
}

export default function DriverDropDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayStr());
  const [driverSearchInput, setDriverSearchInput] = useState<string>("");

  // Modals state
  const [activePrintModal, setActivePrintModal] = useState<
    "sales" | "commission" | "both" | null
  >(null);
  const [isSalesDetailsModalOpen, setIsSalesDetailsModalOpen] = useState(false);

  // ── Shift Reconciliation Table Direct Input States ──
  const [terminalSalesInput, setTerminalSalesInput] = useState<string>("0.00");
  const [terminalTipsInput, setTerminalTipsInput] = useState<string>("0.00");
  const [cashSalesInput, setCashSalesInput] = useState<string>("0.00");

  // ── Driver Settlement Payout Card States ──
  const [hasAdditionalCommissionToggle, setHasAdditionalCommissionToggle] =
    useState<boolean>(false);
  const [additionalCommission, setAdditionalCommission] =
    useState<string>("0.00");
  const [additionalReason, setAdditionalReason] = useState<string>("");

  // Live Drivers & Orders State
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [ordersMap, setOrdersMap] = useState<Record<string, OrderRow[]>>({});
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Fetch Drivers for selected date & branch
  const fetchDrivers = useCallback(async () => {
    setLoadingDrivers(true);
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
      const res = await axios.get(`${apiUrl}/delivery/driver-drop/drivers`, {
        params: { date: selectedDate, ...(branchId ? { branchId } : {}) },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        setDrivers(res.data.data);
      } else {
        setDrivers([]);
      }
    } catch (err) {
      console.error("Failed to fetch driver drop drivers", err);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Active Driver Info
  const selectedDriver = useMemo(() => {
    if (selectedDriverId) {
      return drivers.find((d) => d.id === selectedDriverId) || null;
    }
    if (driverSearchInput.trim()) {
      const q = driverSearchInput.trim().toLowerCase();
      return (
        drivers.find(
          (d) =>
            d.driverId.toLowerCase().includes(q) ||
            d.name.toLowerCase().includes(q),
        ) || null
      );
    }
    return null;
  }, [selectedDriverId, driverSearchInput, drivers]);

  // Fetch Summary / Orders for selected driver
  useEffect(() => {
    if (!selectedDriver) return;
    const drvId = selectedDriver.id;

    const fetchSummary = async () => {
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
        const res = await axios.get(`${apiUrl}/delivery/driver-drop/summary`, {
          params: {
            driverId: drvId,
            date: selectedDate,
            ...(branchId ? { branchId } : {}),
          },
        });

        if (res.data.success && res.data.data) {
          const { isSettled, settlement, orders: orderList } = res.data.data;
          const currentOrders = orderList || [];
          setOrdersMap((prev) => ({ ...prev, [drvId]: currentOrders }));

          if (isSettled && settlement) {
            setTerminalSalesInput(
              Number(settlement.terminalSales || 0).toFixed(2),
            );
            setTerminalTipsInput(
              Number(settlement.terminalTips || 0).toFixed(2),
            );
            setCashSalesInput(Number(settlement.cashSales || 0).toFixed(2));
            if (
              settlement.additionalCommission &&
              Number(settlement.additionalCommission) > 0
            ) {
              setHasAdditionalCommissionToggle(true);
              setAdditionalCommission(
                Number(settlement.additionalCommission).toFixed(2),
              );
              setAdditionalReason(settlement.additionalReason || "");
            } else {
              setHasAdditionalCommissionToggle(false);
              setAdditionalCommission("0.00");
              setAdditionalReason("");
            }
          } else {
            const tmOrders = currentOrders.filter((o: any) => o.pd === "TM");
            const tmSales = tmOrders.reduce(
              (sum: number, o: any) => sum + o.total,
              0,
            );
            const tmTips = currentOrders.reduce(
              (sum: number, o: any) => sum + (o.terminalTip || 0),
              0,
            );
            const csOrders = currentOrders.filter((o: any) => o.pd === "CS");
            const csSales = csOrders.reduce(
              (sum: number, o: any) => sum + o.total,
              0,
            );

            setTerminalSalesInput(tmSales.toFixed(2));
            setTerminalTipsInput(tmTips.toFixed(2));
            setCashSalesInput(csSales.toFixed(2));
            setHasAdditionalCommissionToggle(false);
            setAdditionalCommission("0.00");
            setAdditionalReason("");
          }
        }
      } catch (err) {
        console.error("Failed to fetch driver summary", err);
        setOrdersMap((prev) => ({ ...prev, [drvId]: [] }));
      }
    };

    fetchSummary();
  }, [selectedDriver, selectedDate]);

  // Active Orders
  const orders = useMemo(() => {
    if (!selectedDriver) return [];
    return ordersMap[selectedDriver.id] || [];
  }, [selectedDriver, ordersMap]);

  // ── Calculation Logic ──
  const calculations = useMemo(() => {
    if (!selectedDriver) {
      return {
        totalOrders: 0,
        totalCancels: 0,
        totalSales: 0,
        prepaidSales: 0,
        prepaidTips: 0,
        totalNewSales: 0,
        terminalSales: 0,
        terminalTips: 0,
        cashSales: 0,
        saleDue: 0,
        driverBaseCommission: 0,
        driverAdditionalCommission: 0,
        driverTotalCommission: 0,
        totalTipsEarned: 0,
        totalDriverEarning: 0,
        netCashPayoutToDriver: 0,
        ratePerOrder: 6.0,
      };
    }

    if (selectedDriver?.isSettled && selectedDriver?.settlementSummary) {
      const s = selectedDriver.settlementSummary;
      const baseComm = s.driverBaseCommission ?? (s.totalOrders || orders.length) * 6.0;
      const addComm = s.additionalCommission ?? 0;
      const totalComm = s.driverTotalCommission ?? (baseComm + addComm);
      const tipsEarned = s.totalTipsEarned ?? ((s.prepaidTips || 0) + (s.terminalTips || 0));
      const driverEarning = s.totalDriverEarning ?? (totalComm + tipsEarned);

      return {
        totalOrders: s.totalOrders ?? orders.length,
        totalCancels: 0,
        totalSales: s.totalSales ?? 0,
        prepaidSales: s.prepaidSales ?? 0,
        prepaidTips: s.prepaidTips ?? 0,
        totalNewSales: s.totalNewSales ?? 0,
        terminalSales: s.terminalSales ?? 0,
        terminalTips: s.terminalTips ?? 0,
        cashSales: s.cashSales ?? 0,
        saleDue: s.saleDue ?? 0,
        driverBaseCommission: baseComm,
        driverAdditionalCommission: addComm,
        driverTotalCommission: totalComm,
        totalTipsEarned: tipsEarned,
        totalDriverEarning: driverEarning,
        netCashPayoutToDriver: s.netCashPayoutToDriver ?? driverEarning,
        ratePerOrder: 6.0,
      };
    }

    const totalOrders = orders.length;
    const totalCancels = 0;
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);

    const prepaidOrders = orders.filter((o) => o.pd === "PP");
    const prepaidTips = orders.reduce((sum, o) => sum + o.prepaidTip, 0);
    const prepaidSales = prepaidOrders.reduce((sum, o) => sum + Math.max(0, o.total - o.prepaidTip), 0);

    const totalNewSales = Math.max(0, totalSales - prepaidSales - prepaidTips);

    // Entered Input values
    const enteredTerminalSales = parseFloat(terminalSalesInput) || 0;
    const enteredTerminalTips = parseFloat(terminalTipsInput) || 0;
    const enteredCashSales = parseFloat(cashSalesInput) || 0;

    // Sale Due calculation (rounded to 2 decimal places to prevent JS floating point precision bugs like 0.000000000000014 > 0)
    const rawSaleDue =
      totalNewSales -
      enteredTerminalSales -
      enteredTerminalTips -
      enteredCashSales;
    const saleDue = Math.round(rawSaleDue * 100) / 100;

    // Delivery Commissions ($6.00 flat per order)
    const driverBaseCommission = totalOrders * 6.0;
    const extraComm = hasAdditionalCommissionToggle
      ? parseFloat(additionalCommission) || 0
      : 0;
    const driverTotalCommission = driverBaseCommission + extraComm;

    const totalTipsEarned = prepaidTips + enteredTerminalTips;

    // Total Driver Earnings & Net Cash Settlement
    const totalDriverEarning = totalTipsEarned + driverTotalCommission;
    const netCashPayoutToDriver = totalDriverEarning;

    return {
      totalOrders,
      totalCancels,
      totalSales,
      prepaidSales,
      prepaidTips,
      totalNewSales,
      terminalSales: enteredTerminalSales,
      terminalTips: enteredTerminalTips,
      cashSales: enteredCashSales,
      saleDue,
      driverBaseCommission,
      driverAdditionalCommission: extraComm,
      driverTotalCommission,
      totalTipsEarned,
      totalDriverEarning,
      netCashPayoutToDriver,
      ratePerOrder: 6.0,
    };
  }, [
    selectedDriver,
    orders,
    terminalSalesInput,
    terminalTipsInput,
    cashSalesInput,
    hasAdditionalCommissionToggle,
    additionalCommission,
  ]);

  // Submit button disabled if no driver selected OR Sale Due > 0.009 OR driver already settled
  const isSubmitDisabled =
    !selectedDriver ||
    calculations.saleDue > 0.009 ||
    Boolean(selectedDriver?.isSettled);

  const [isPrinting, setIsPrinting] = useState(false);

  const handleSilentPrintPdf = async () => {
    if (!selectedDriver || isPrinting) return;
    setIsPrinting(true);
    const toastId = toast.loading("Sending to printer...", { id: "print-driver-drop" });
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
      const slipType = activePrintModal || "both";
      const res = await axios.post(
        `${apiUrl}/delivery/driver-drop/receipt/print`,
        {
          driverId: selectedDriver.id,
          date: selectedDate,
          type: slipType,
          terminalSales: parseFloat(terminalSalesInput) || 0,
          terminalTips: parseFloat(terminalTipsInput) || 0,
          cashSales: parseFloat(cashSalesInput) || 0,
          additionalCommission: hasAdditionalCommissionToggle
            ? parseFloat(additionalCommission) || 0
            : 0,
          additionalReason: hasAdditionalCommissionToggle ? additionalReason : "",
          ...(branchId ? { branchId } : {}),
        }
      );

      if (res.data.success) {
        toast.success("Driver Drop receipt sent to printer!", { id: "print-driver-drop" });
      } else {
        throw new Error(res.data.message || "Print failed");
      }
    } catch (err: any) {
      console.error("Failed to print Driver Drop receipt", err);
      toast.error("Print failed — check printer connection.", { id: "print-driver-drop" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedDriver || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading("Generating PDF receipt...");
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
      const slipType = activePrintModal || "both";
      const response = await axios.get(
        `${apiUrl}/delivery/driver-drop/receipt/pdf`,
        {
          params: {
            driverId: selectedDriver.id,
            date: selectedDate,
            type: slipType,
            terminalSales: parseFloat(terminalSalesInput) || 0,
            terminalTips: parseFloat(terminalTipsInput) || 0,
            cashSales: parseFloat(cashSalesInput) || 0,
            additionalCommission: hasAdditionalCommissionToggle
              ? parseFloat(additionalCommission) || 0
              : 0,
            additionalReason: hasAdditionalCommissionToggle ? additionalReason : "",
            ...(branchId ? { branchId } : {}),
          },
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Driver_Receipt_${slipType}_${selectedDriver.driverId || selectedDriver.id.slice(-4)}_${selectedDate}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF receipt downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Failed to download PDF receipt", err);
      toast.error("Failed to download PDF receipt.", { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Data for Thermal Sales Report
  const salesReportData: DriverDropSummaryData = useMemo(() => {
    return {
      employeeId: selectedDriver ? selectedDriver.driverId : "0",
      employeeName: selectedDriver ? selectedDriver.name : "DRIVER",
      reportDate: new Date(selectedDate + "T12:00:00").toLocaleDateString(
        "en-US",
        {
          timeZone: "America/Edmonton",
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        },
      ),
      reportTime: new Date().toLocaleTimeString("en-US", {
        timeZone: "America/Edmonton",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      orders: orders.map((o) => ({
        ticketName: o.ticketName,
        total: o.total,
        dc: o.dc,
        pd: o.pd,
      })),
      totalOrders: calculations.totalOrders,
      totalCancels: calculations.totalCancels,
      totalSales: calculations.totalSales,
      closedSales: 0,
      closedCharges: 0,
      prepaidSales: calculations.prepaidSales,
      totalNewSales: calculations.totalNewSales,
      terminalSales: calculations.terminalSales,
      terminalTips: calculations.terminalTips,
      cashSales: calculations.cashSales,
      saleDue: calculations.saleDue,
      openBanks: 0,
      cashDropped: calculations.cashSales,
      creditCardDrop: calculations.terminalSales,
      otherDrops: 0,
      checksDropped: 0,
      totalDue: calculations.saleDue,
      totalPrepaidTips: calculations.prepaidTips,
      paidPrepaidTips: 0,
      prepaidTipsDue: calculations.prepaidTips,
      driverBaseCommission: calculations.driverBaseCommission,
      driverAdditionalCommission: calculations.driverAdditionalCommission,
      driverCommissionReason: hasAdditionalCommissionToggle
        ? additionalReason
        : "",
      driverTotalCommission: calculations.driverTotalCommission,
      totalTips: calculations.totalTipsEarned,
      totalDriverEarning: calculations.totalDriverEarning,
      totalCommissionDue: calculations.driverTotalCommission,
    };
  }, [
    selectedDriver,
    selectedDate,
    orders,
    calculations,
    hasAdditionalCommissionToggle,
    additionalReason,
  ]);

  // Data for Thermal Commission Slip
  const commissionSlipData: DriverCommissionSlipData = useMemo(() => {
    return {
      driverName: selectedDriver ? selectedDriver.name : "DRIVER",
      reportDate: new Date(selectedDate + "T12:00:00").toLocaleDateString(
        "en-US",
        {
          timeZone: "America/Edmonton",
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        },
      ),
      reportTime: new Date().toLocaleTimeString("en-US", {
        timeZone: "America/Edmonton",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      commissionSales: calculations.totalSales,
      numberOfOrders: calculations.totalOrders,
      ratePercent: 0,
      ratePerOrder: calculations.ratePerOrder,
      totalBeforeCutoff: calculations.totalSales,
      bonus: calculations.driverAdditionalCommission,
      driverBaseCommission: calculations.driverBaseCommission,
      driverAdditionalCommission: calculations.driverAdditionalCommission,
      driverCommissionReason: hasAdditionalCommissionToggle
        ? additionalReason
        : "",
      driverTotalCommission: calculations.driverTotalCommission,
      prepaidTipsPaid: calculations.prepaidTips,
      terminalTipsPaid: calculations.terminalTips,
      totalTipsPaid: calculations.totalTipsEarned,
      totalDriverEarning: calculations.totalDriverEarning,
      totalPaid: calculations.totalDriverEarning,
    };
  }, [
    selectedDriver,
    selectedDate,
    calculations,
    hasAdditionalCommissionToggle,
    additionalReason,
  ]);



  const handleFinalizeSettlement = () => {
    if (!selectedDriver) {
      toast.error("Please select a driver first!");
      return;
    }
    if (isSubmitDisabled) {
      toast.error(
        `Cannot submit settlement while Sale Due is $${calculations.saleDue.toFixed(2)}. Reconciliation must be $0.00 or less.`,
      );
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const executeSettlement = async (autoCheckout: boolean) => {
    setIsCheckoutModalOpen(false);
    if (!selectedDriver) return;

    setIsSubmitting(true);
    const toastId = toast.loading(
      `Submitting settlement for ${selectedDriver.name}...`,
    );

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
        driverId: selectedDriver.id,
        date: selectedDate,
        terminalSales: parseFloat(terminalSalesInput) || 0,
        terminalTips: parseFloat(terminalTipsInput) || 0,
        cashSales: parseFloat(cashSalesInput) || 0,
        additionalCommission: hasAdditionalCommissionToggle
          ? parseFloat(additionalCommission) || 0
          : 0,
        additionalReason: hasAdditionalCommissionToggle ? additionalReason : "",
        settledBy: "Manager",
        autoCheckout,
        ...(branchId ? { branchId } : {}),
      };

      const res = await axios.post(
        `${apiUrl}/delivery/driver-drop/settle`,
        payload,
      );
      if (res.data.success) {
        toast.success(
          `Drop settlement finalized for ${selectedDriver.name}! ${autoCheckout ? "Driver checked out from POS & vehicle unassigned." : ""} Net Cash Payout: $${calculations.netCashPayoutToDriver.toFixed(2)}`,
          { id: toastId },
        );
        fetchDrivers();
        setActivePrintModal("both");
      } else {
        toast.error(res.data.message || "Failed to finalize settlement.", {
          id: toastId,
        });
      }
    } catch (err: any) {
      console.error("Settlement submission error:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to submit driver drop settlement.",
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans select-none">
      {/* ── Top POS Navbar ── */}
      <PosNavbar onToggleSidebar={() => setSidebarOpen(true)} />

      {/* ── Secondary Control Bar ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        {/* Left Side: Title */}
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px] flex items-center gap-2">
            <span>Driver Drop</span>
          </h1>
        </div>

        {/* Right Side: Date Filter & Action Print Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-[#1E3A8A] hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm w-[135px]"
            />
            <Calendar
              size={14}
              className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[#1E3A8A] pointer-events-none"
            />
          </div>

          <button
            onClick={() => {
              if (!selectedDriver) {
                toast.error("Please select a driver first!");
                return;
              }
              setActivePrintModal("sales");
            }}
            disabled={!selectedDriver}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[12px] lg:text-[13.5px] font-800 transition-all cursor-pointer shadow-sm select-none ${
              selectedDriver
                ? "bg-[#e31837] hover:bg-[#b9142d] active:scale-95"
                : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60"
            }`}
          >
            <Printer size={13} />
            <span>Sales Report Slip</span>
          </button>

          <button
            onClick={() => {
              if (!selectedDriver) {
                toast.error("Please select a driver first!");
                return;
              }
              setActivePrintModal("commission");
            }}
            disabled={!selectedDriver}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[12px] lg:text-[13.5px] font-800 transition-all cursor-pointer shadow-sm select-none ${
              selectedDriver
                ? "bg-[#e31837] hover:bg-[#b9142d] active:scale-95"
                : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60"
            }`}
          >
            <FileText size={13} />
            <span>Commission Slip</span>
          </button>
        </div>
      </div>

      {/* ── Main Scrollable Area ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12 select-none">
        {/* ── Section 1: Driver Selection & Profile Card ── */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
          <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] lg:text-[13.5px] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User size={15} />
              <span>Driver Selection & Profile</span>
            </span>
            {/* <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-700">
              {selectedDriver ? "Shift Active" : "No Driver Selected"}
            </span> */}
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Driver Select / Search Column */}
            <div className="lg:col-span-5 space-y-3">
              <label className="text-[10px] font-800 uppercase tracking-wider text-neutral-500 block">
                Select Driver / Search by ID or Name
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Enter Driver ID or Name..."
                    value={driverSearchInput}
                    onChange={(e) => setDriverSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && drivers.length > 0) {
                        const matched = drivers.find(
                          (d) =>
                            d.driverId
                              .toLowerCase()
                              .includes(
                                driverSearchInput.trim().toLowerCase(),
                              ) ||
                            d.name
                              .toLowerCase()
                              .includes(driverSearchInput.trim().toLowerCase()),
                        );
                        if (matched) setSelectedDriverId(matched.id);
                      }
                    }}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-[12px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (driverSearchInput.trim() && drivers.length > 0) {
                      const matched = drivers.find(
                        (d) =>
                          d.driverId
                            .toLowerCase()
                            .includes(driverSearchInput.trim().toLowerCase()) ||
                          d.name
                            .toLowerCase()
                            .includes(driverSearchInput.trim().toLowerCase()),
                      );
                      if (matched) {
                        setSelectedDriverId(matched.id);
                      } else {
                        toast.error(
                          "No checked-in driver found matching query.",
                        );
                      }
                    }
                  }}
                  className="px-4 py-2 bg-brand-primary hover:bg-[#b9142d] text-white text-[11.5px] font-800 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>

              {/* Dynamic Checked-In Driver Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {loadingDrivers ? (
                  <div className="text-[11px] text-neutral-400 italic">
                    Loading checked-in drivers...
                  </div>
                ) : drivers.length > 0 ? (
                  drivers.map((d) => {
                    const isSelected = selectedDriver?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDriverId("");
                            setDriverSearchInput("");
                          } else {
                            setSelectedDriverId(d.id);
                            setDriverSearchInput("");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] lg:text-[12.5px] font-800 uppercase transition-all cursor-pointer border flex items-center gap-2 ${
                          isSelected
                            ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                            : d.isSettled
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-brand-primary/30 hover:bg-brand-primary-light"
                        }`}
                      >
                        <span>{d.name}</span>
                        <span
                          className={`text-[9.5px] px-1.5 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : d.isSettled ? "bg-emerald-200 text-emerald-900" : "bg-neutral-200 text-neutral-700"}`}
                        >
                          {d.isSettled ? "Settled" : d.driverId}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-bold">
                    No drivers checked-in at POS for {selectedDate}.
                  </div>
                )}
              </div>
            </div>

            {/* Active Driver Profile Info OR Empty State Placeholder */}
            {selectedDriver ? (
              <div className="lg:col-span-7 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-white font-900 text-xs flex items-center justify-center shadow-xs shrink-0 uppercase tracking-wider">
                      {selectedDriver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2) || "DR"}
                    </div>
                    <div>
                      <h2 className="text-sm lg:text-[15px] font-900 text-neutral-900 tracking-tight flex items-center gap-2">
                        {selectedDriver.name}
                        <span className="text-[10px] font-800 px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary-muted uppercase">
                          ID: {selectedDriver.driverId}
                        </span>
                      </h2>
                      <p className="text-[11px] text-neutral-500 font-600 flex items-center gap-3.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-neutral-400" />{" "}
                          {selectedDriver.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Car size={12} className="text-neutral-400" />{" "}
                          {selectedDriver.vehicle}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* <span className="px-2.5 py-1 rounded-full text-[10px] font-800 uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedDriver.status}
                  </span> */}
                </div>

                {/* Quick Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-neutral-200">
                    <p className="text-[9.5px] font-800 text-neutral-500 uppercase">
                      Deliveries
                    </p>
                    <p className="font-900 text-neutral-900 text-sm">
                      {calculations.totalOrders}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-neutral-200">
                    <p className="text-[9.5px] font-800 text-neutral-500 uppercase">
                      Total Sales
                    </p>
                    <p className="font-900 text-emerald-700 text-sm">
                      ${calculations.totalSales.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-neutral-200">
                    <p className="text-[9.5px] font-800 text-neutral-500 uppercase">
                      DC Earned
                    </p>
                    <p className="font-900 text-brand-primary text-sm">
                      ${calculations.driverTotalCommission.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-neutral-200">
                    <p className="text-[9.5px] font-800 text-neutral-500 uppercase">
                      Cash Collected
                    </p>
                    <p className="font-900 text-rose-700 text-sm">
                      ${calculations.cashSales.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 bg-neutral-50 border border-dashed border-neutral-300 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-900 text-neutral-800 uppercase tracking-wide">
                    No Driver Selected
                  </h3>
                  <p className="text-[11px] text-neutral-500 max-w-sm font-500 mt-0.5">
                    Select a driver from the left chips or search by ID/Name to
                    load shift settlement.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Conditional Lower Dashboard Sections (Only shown when Driver is Selected) ── */}
        {selectedDriver ? (
          <>
            {/* ── Section 2: Two Column Reconciliation Cards ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in">
              {/* ==================== LEFT COLUMN: SHIFT SALES RECONCILIATION ==================== */}
              <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
                  <span>Shift Sales Reconciliation</span>
                  {/* <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-700">Interactive Inputs</span> */}
                </div>

                <table className="w-full text-left text-[12px]">
                  <tbody className="divide-y divide-neutral-200/60 font-650">
                    <tr>
                      <td className="py-2.5 px-4 text-neutral-700">
                        Total orders
                      </td>
                      <td className="py-2.5 px-4 text-right font-800 text-neutral-900">
                        {calculations.totalOrders}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-neutral-700">
                        Total cancels
                      </td>
                      <td className="py-2.5 px-4 text-right font-800 text-neutral-900">
                        {calculations.totalCancels}
                      </td>
                    </tr>

                    <tr className="bg-neutral-100/80 font-800 text-neutral-900 border-t border-neutral-200">
                      <td className="py-2.5 px-4 uppercase text-[11px] tracking-wide">
                        Total sales
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-900">
                        ${calculations.totalSales.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-neutral-600 pl-6">
                        Prepaid sales (-)
                      </td>
                      <td className="py-2 px-4 text-right font-700 text-rose-600">
                        -${calculations.prepaidSales.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-neutral-600 pl-6">
                        Prepaid Tips (-)
                      </td>
                      <td className="py-2 px-4 text-right font-700 text-rose-600">
                        -${calculations.prepaidTips.toFixed(2)}
                      </td>
                    </tr>

                    <tr className="bg-orange-50/60 font-900 text-neutral-900 border-y border-brand-primary/20">
                      <td className="py-2.5 px-4 uppercase text-[11px] tracking-wide">
                        Total new sales (=)
                      </td>
                      <td className="py-2.5 px-4 text-right text-brand-primary font-900">
                        ${calculations.totalNewSales.toFixed(2)}
                      </td>
                    </tr>

                    {/* Interactive Input Row 1: Terminal Sales */}
                    <tr className="bg-neutral-50/70">
                      <td className="py-2 px-4 text-neutral-800 font-700 pl-6 flex items-center gap-1.5">
                        <span>Terminal sales (-)</span>
                      </td>
                      <td className="py-1.5 px-4 text-right">
                        <div className="inline-flex items-center relative">
                          <span className="absolute left-2.5 text-neutral-400 font-bold text-[11px]">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={terminalSalesInput}
                            disabled={Boolean(selectedDriver?.isSettled)}
                            onChange={(e) =>
                              setTerminalSalesInput(e.target.value)
                            }
                            className={`w-28 rounded-lg pl-6 pr-2.5 py-1 text-right font-800 text-rose-600 focus:outline-none focus:border-brand-primary font-mono text-xs shadow-2xs transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              selectedDriver?.isSettled
                                ? "bg-neutral-100/90 text-neutral-500 cursor-not-allowed border border-neutral-200"
                                : "bg-white border border-neutral-300"
                            }`}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Interactive Input Row 2: Terminal Tips */}
                    <tr className="bg-neutral-50/70">
                      <td className="py-2 px-4 text-neutral-800 font-700 pl-6 flex items-center gap-1.5">
                        <span>Terminal Tips (-)</span>
                      </td>
                      <td className="py-1.5 px-4 text-right">
                        <div className="inline-flex items-center relative">
                          <span className="absolute left-2.5 text-neutral-400 font-bold text-[11px]">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={terminalTipsInput}
                            disabled={Boolean(selectedDriver?.isSettled)}
                            onChange={(e) =>
                              setTerminalTipsInput(e.target.value)
                            }
                            className={`w-28 rounded-lg pl-6 pr-2.5 py-1 text-right font-800 text-rose-600 focus:outline-none focus:border-brand-primary font-mono text-xs shadow-2xs transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              selectedDriver?.isSettled
                                ? "bg-neutral-100/90 text-neutral-500 cursor-not-allowed border border-neutral-200"
                                : "bg-white border border-neutral-300"
                            }`}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Interactive Input Row 3: Cash Sales */}
                    <tr className="bg-neutral-50/70">
                      <td className="py-2 px-4 text-neutral-800 font-700 pl-6 flex items-center gap-1.5">
                        <span>Cash Sales (-)</span>
                      </td>
                      <td className="py-1.5 px-4 text-right">
                        <div className="inline-flex items-center relative">
                          <span className="absolute left-2.5 text-neutral-400 font-bold text-[11px]">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={cashSalesInput}
                            disabled={Boolean(selectedDriver?.isSettled)}
                            onChange={(e) => setCashSalesInput(e.target.value)}
                            className={`w-28 rounded-lg pl-6 pr-2.5 py-1 text-right font-800 text-rose-600 focus:outline-none focus:border-brand-primary font-mono text-xs shadow-2xs transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              selectedDriver?.isSettled
                                ? "bg-neutral-100/90 text-neutral-500 cursor-not-allowed border border-neutral-200"
                                : "bg-white border border-neutral-300"
                            }`}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Final Sale Due Row */}
                    <tr
                      className={`font-900 transition-colors ${calculations.saleDue <= 0 ? "bg-neutral-900 text-white" : "bg-rose-950 text-white"}`}
                    >
                      <td className="py-3 px-4 uppercase text-[11px] tracking-wide">
                        Sale Due (=)
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-900 text-sm font-mono ${calculations.saleDue <= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        ${calculations.saleDue.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ==================== RIGHT COLUMN: DRIVER SETTLEMENT PAYOUT ==================== */}
              <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
                <div className="divide-y divide-neutral-200/60">
                  <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
                    <span>Driver Settlement Payout</span>
                    {selectedDriver?.isSettled && (
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-800 flex items-center gap-1 tracking-normal">
                        <CheckCircle size={11} /> Settled & Paid
                      </span>
                    )}
                  </div>

                  <table className="w-full text-left text-[12px]">
                    <tbody className="divide-y divide-neutral-200/60 font-650">
                      <tr>
                        <td className="py-2.5 px-4 text-neutral-800 font-700">
                          Driver Base Commission
                        </td>
                        <td className="py-2.5 px-4 text-right font-800 text-brand-primary">
                          ${calculations.driverBaseCommission.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-neutral-700">
                          Prepaid Tips
                        </td>
                        <td className="py-2.5 px-4 text-right font-700 text-neutral-900">
                          ${calculations.prepaidTips.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-neutral-700">
                          Terminal Tips
                        </td>
                        <td className="py-2.5 px-4 text-right font-700 text-neutral-900">
                          ${calculations.terminalTips.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Additional Commission Section Integrated Directly into Card */}
                  <div className="p-4 bg-neutral-50/80 space-y-3 border-t border-neutral-200">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-800 font-800 text-xs uppercase">
                        ADDITIONAL COMMISSION?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={Boolean(selectedDriver?.isSettled)}
                          onClick={() => setHasAdditionalCommissionToggle(true)}
                          className={`px-4 py-1 rounded-lg font-900 text-xs transition-all ${
                            selectedDriver?.isSettled
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            hasAdditionalCommissionToggle
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white text-neutral-600 border border-neutral-300"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(selectedDriver?.isSettled)}
                          onClick={() =>
                            setHasAdditionalCommissionToggle(false)
                          }
                          className={`px-4 py-1 rounded-lg font-900 text-xs transition-all ${
                            selectedDriver?.isSettled
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            !hasAdditionalCommissionToggle
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-white text-neutral-600 border border-neutral-300"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {hasAdditionalCommissionToggle && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[10.5px] font-800 text-neutral-600 uppercase block">
                            Additional Comm ($)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={additionalCommission}
                              disabled={Boolean(selectedDriver?.isSettled)}
                              onChange={(e) =>
                                setAdditionalCommission(e.target.value)
                              }
                              className={`w-full rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-900 focus:outline-none focus:border-brand-primary font-mono shadow-2xs ${
                                selectedDriver?.isSettled
                                  ? "bg-neutral-100/90 text-neutral-500 cursor-not-allowed border border-neutral-200"
                                  : "bg-white border border-neutral-300 text-neutral-900"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10.5px] font-800 text-neutral-600 uppercase block">
                            Reason
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Rain Allowance"
                            value={additionalReason}
                            disabled={Boolean(selectedDriver?.isSettled)}
                            onChange={(e) =>
                              setAdditionalReason(e.target.value)
                            }
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-600 focus:outline-none focus:border-brand-primary ${
                              selectedDriver?.isSettled
                                ? "bg-neutral-100/90 text-neutral-500 cursor-not-allowed border border-neutral-200"
                                : "bg-white border border-neutral-300 text-neutral-900"
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <table className="w-full text-left text-[12px]">
                    <tbody className="divide-y divide-neutral-200/60 font-650">
                      <tr className="bg-orange-50/60 font-900 text-neutral-900 border-y border-brand-primary/20">
                        <td className="py-2.5 px-4 uppercase text-[11px] tracking-wide">
                          TOTAL DRIVER EARNINGS (COMM + TIPS)
                        </td>
                        <td className="py-2.5 px-4 text-right text-brand-primary font-900">
                          ${calculations.totalDriverEarning.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Payout Callout Footer Box */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-800 uppercase text-neutral-500 tracking-wider">
                      NET CASH PAYOUT TO DRIVER
                    </p>
                    <p className="text-2xl font-900 text-emerald-700 mt-0.5 font-mono">
                      ${calculations.netCashPayoutToDriver.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePrintModal("both")}
                      className="px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-800 text-[11px] uppercase rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Print Both Slips</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFinalizeSettlement}
                      disabled={isSubmitDisabled || isSubmitting}
                      className={`px-5 py-2.5 font-900 text-[12px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
                        selectedDriver?.isSettled
                          ? "bg-emerald-700 text-white cursor-not-allowed opacity-90 shadow-xs"
                          : isSubmitDisabled || isSubmitting
                            ? "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60"
                            : "bg-[#e31837] hover:bg-[#b9142d] text-white cursor-pointer active:scale-95 shadow-md"
                      }`}
                    >
                      {selectedDriver?.isSettled ? (
                        <>
                          <CheckCircle size={14} />
                          <span>SETTLED & PAID</span>
                        </>
                      ) : (
                        <>
                          {isSubmitDisabled && !isSubmitting && (
                            <Lock size={13} />
                          )}
                          {isSubmitting && (
                            <RefreshCw size={13} className="animate-spin" />
                          )}
                          <span>
                            {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Delivered Orders Breakdown Table ── */}
            <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden animate-fade-in">
              <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
                <span>Delivered Orders Breakdown</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-700">
                  {orders.length} Orders
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200/80">
                      <th className="py-2.5 px-4">Ticket / Order Name</th>
                      <th className="py-2.5 px-4">Customer & Address</th>
                      <th className="py-2.5 px-4 text-center">Time</th>
                      <th className="py-2.5 px-4 text-right">Total ($)</th>
                      <th className="py-2.5 px-4 text-right">DC ($)</th>
                      <th className="py-2.5 px-4 text-center">
                        Payment Detail (PD)
                      </th>
                      <th className="py-2.5 px-4 text-right">Tip ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
                    {orders.length > 0 ? (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-neutral-50/70">
                          <td className="py-2.5 px-4 font-800 text-neutral-900">
                            {o.ticketName ||
                              `${o.orderNumber || ""} ${o.customerName || ""}`.trim() ||
                              `Order #${o.id || ""}`}
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="font-700 text-neutral-900">
                              {o.customerName}
                            </p>
                            <p className="text-[11px] text-neutral-500 font-500">
                              {o.address}
                            </p>
                          </td>
                          <td className="py-2.5 px-4 text-center text-neutral-500">
                            {o.time}
                          </td>
                          <td className="py-2.5 px-4 text-right font-800 text-neutral-900">
                            ${o.total.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-800 text-brand-primary">
                            ${o.dc.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-800 uppercase tracking-wider ${
                                o.pd === "PP"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : o.pd === "TM"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {o.pd === "PP"
                                ? "PP (Prepaid)"
                                : o.pd === "TM"
                                  ? "TM (Terminal)"
                                  : "CS (Cash)"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-700 text-neutral-700">
                            ${(o.prepaidTip + o.terminalTip).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 px-4 text-center text-neutral-400 font-600 text-xs"
                        >
                          No delivered orders found for this driver.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Empty State Section when NO Driver is Selected */
          <div className="bg-white border border-neutral-200 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary-light text-brand-primary flex items-center justify-center border border-brand-primary-muted shadow-xs">
              <Truck size={32} />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-base font-900 text-neutral-900 uppercase tracking-wide">
                Select a Driver to View Shift Drop
              </h2>
              <p className="text-xs text-neutral-500 font-500 leading-relaxed">
                Choose an active driver from the selection panel above or search
                by Driver ID (e.g. <strong>6</strong> or{" "}
                <strong>DRV-006</strong>) to load shift reconciliation,
                calculate driver earnings, and perform cash drop settlement.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 1. POS CHECKOUT CONFIRMATION MODAL ── */}
      {isCheckoutModalOpen && selectedDriver && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[200] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up border border-neutral-200">
            {/* Red Header */}
            <div className="bg-[#e31837] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-800 text-[13px] uppercase tracking-wide flex items-center gap-2">
                <LogOut size={16} />
                <span>Checkout Driver from POS?</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-white hover:text-white/80 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 text-[#e31837] flex items-center justify-center mx-auto border border-red-200 shadow-xs">
                <LogOut size={28} />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-900 text-neutral-900 uppercase tracking-tight">
                  Checkout {selectedDriver.name} (ID: {selectedDriver.driverId})?
                </h4>
                <p className="text-[11.5px] text-neutral-600 font-500 leading-relaxed max-w-xs mx-auto">
                  Would you like to automatically check out <strong>{selectedDriver.name}</strong> from POS attendance upon finalizing settlement?
                </p>
                {/* <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[10.5px] text-amber-900 font-600 text-left mt-2">
                  <p className="font-800 text-amber-950 flex items-center gap-1 mb-0.5">
                    ℹ Automatic Actions on Checkout:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-500">
                    <li>Unassigns assigned vehicle automatically</li>
                    <li>Sets driver status to offline</li>
                    <li>Blocks Driver App login until next POS check-in</li>
                  </ul>
                </div> */}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeSettlement(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-900 uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={15} />
                  )}
                  <span>YES, CHECKOUT & SETTLE</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeSettlement(false)}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white text-[12px] font-900 uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <FileText size={15} />
                  <span>NO, SETTLE ONLY (KEEP CHECKED-IN)</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-full py-1.5 text-neutral-500 hover:text-neutral-800 text-[11px] font-700 uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. VIEW SALES DETAILS MODAL ── */}
      {isSalesDetailsModalOpen && selectedDriver && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-brand-primary text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-800 text-[13px] uppercase tracking-wide flex items-center gap-2">
                <FileText size={16} />
                <span>
                  Sales Details - Driver #{selectedDriver.id} (
                  {selectedDriver.name})
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSalesDetailsModalOpen(false)}
                className="text-white hover:text-white/80 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-neutral-100/80 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                    <th className="py-2.5 px-4">Ticket Name</th>
                    <th className="py-2.5 px-4">Customer & Address</th>
                    <th className="py-2.5 px-4 text-center">Time</th>
                    <th className="py-2.5 px-4 text-right">Total ($)</th>
                    <th className="py-2.5 px-4 text-right">DC ($)</th>
                    <th className="py-2.5 px-4 text-center">PD</th>
                    <th className="py-2.5 px-4 text-right">Tip ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 font-650">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/70">
                      <td className="py-2.5 px-4 font-800 text-neutral-900">
                        {o.ticketName}
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-700 text-neutral-900">
                          {o.customerName}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-500">
                          {o.address}
                        </p>
                      </td>
                      <td className="py-2.5 px-4 text-center text-neutral-500">
                        {o.time}
                      </td>
                      <td className="py-2.5 px-4 text-right font-800 text-neutral-900">
                        ${o.total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-800 text-brand-primary">
                        ${o.dc.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-800 uppercase ${
                            o.pd === "PP"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {o.pd}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-700 text-neutral-700">
                        ${(o.prepaidTip + o.terminalTip).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex justify-end">
              <button
                onClick={() => setIsSalesDetailsModalOpen(false)}
                className="px-5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-800 uppercase rounded-lg transition-all cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. THERMAL PRINT PREVIEW MODAL ── */}
      {activePrintModal && selectedDriver && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up border border-neutral-200">
            <div className="bg-brand-primary text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-800 text-[13px] uppercase tracking-wide flex items-center gap-2">
                <Printer size={16} />
                <span>Slip Preview</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivePrintModal(null)}
                className="text-white hover:text-white/80 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-6 bg-neutral-100 max-h-[70vh] overflow-y-auto flex flex-col items-center space-y-6">
              {(activePrintModal === "sales" ||
                activePrintModal === "both") && (
                <div className="w-full">
                  <p className="text-[11px] font-800 text-neutral-600 text-center uppercase tracking-wider mb-2">
                    1. Employee Sales Report Slip
                  </p>
                  <ThermalDriverSalesReport data={salesReportData} />
                </div>
              )}

              {(activePrintModal === "commission" ||
                activePrintModal === "both") && (
                <div className="w-full">
                  <p className="text-[11px] font-800 text-neutral-600 text-center uppercase tracking-wider mb-2">
                    2. Driver Commission Settlement Slip
                  </p>
                  <ThermalDriverCommissionSlip data={commissionSlipData} />
                </div>
              )}
            </div>

            <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex items-center justify-between select-none">
              <span className="text-[11px] font-600 text-neutral-500">
                Slip Printer Ready
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActivePrintModal(null)}
                  className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-800 uppercase rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-800 uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleSilentPrintPdf}
                  disabled={isPrinting}
                  className="px-4 py-1.5 bg-brand-primary text-white text-[11px] font-800 uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-brand-primary/90 disabled:opacity-50"
                >
                  {isPrinting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Printer size={14} />
                  )}
                  <span>Print Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Sidebar Drawer */}
      <POSSidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="driver_drop"
        onSelectTab={(tab) => {
          if (tab !== "driver_drop") {
            window.location.href = `/employee/orders?tab=${tab}`;
          }
        }}
      />
    </main>
  );
}
