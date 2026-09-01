"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import PosNavbar from "./PosNavbar";
import DashboardView from "./DashboardView";
import SalesSummaryView from "./SalesSummaryView";
import ReportsView from "./ReportsView";
import UpdateProfileView from "./UpdateProfileView";
import ChangePasswordView from "./ChangePasswordView";
import DummyReportView from "./DummyReportView";
import ItemSalesView from "./ItemSalesView";
import HourlySalesView from "./HourlySalesView";
import MonthlySalesView from "./MonthlySalesView";
import ExpenseDashboardView from "./ExpenseDashboardView";
import POSSidebarDrawer from "./POSSidebarDrawer";
import OrdersTableView from "./OrdersTableView";
import OrderDetailModal from "./OrderDetailModal";
import FailedTransactionsView from "./FailedTransactionsView";
import RefundOrdersView from "./RefundOrdersView";
import CashOutSummaryView from "./CashOutSummaryView";
import CheckInOutView from "./CheckInOutView";
import { Order } from "../types";
import {
  Search,
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  RefreshCw,
  X,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getLocalTodayStr,
  getLocalPastDateStr,
  getLocalPastDateOf,
  dateToLocalStr,
  getLocalYear,
} from "../utils/timezone";

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    // Convert YYYY-MM-DD to MM/DD/YYYY
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return dateStr;
};

// ── Permission helpers ────────────────────────────────────────────────────
const ORDERS_SUBTAB_KEYS = [
  "dashboard",
  "orders_list",
  "sales_summary",
  "expense_payout",
  "reports",
  "item_sales",
  "hourly_sales",
  "cash_out_summary",
  "monthly_sales_summary",
  "failed_transaction",
  "refund_orders",
];

// Map from URL tab param → permission key (when different)
const TAB_TO_PERM_KEY: Record<string, string> = {
  orders: "orders_list", // 'orders' tab in URL uses 'orders_list' permission
};

function getEmployeePermissions(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("rms_active_employee");
    if (!raw) return {};
    const emp = JSON.parse(raw);
    if (!emp || emp.role === "manager") return {}; // manager has all access
    return emp.permissions || {};
  } catch {
    return {};
  }
}

function isManager(): boolean {
  try {
    const raw = localStorage.getItem("rms_active_employee");
    if (!raw) return true; // no staff logged in = manager mode
    const emp = JSON.parse(raw);
    return !emp || emp.role === "manager";
  } catch {
    return true;
  }
}

export default function OrdersDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<
    | "dashboard"
    | "orders"
    | "reception_view"
    | "sales_summary"
    | "reports"
    | "expense_payout"
    | "update_profile"
    | "change_password"
    | "item_sales"
    | "item_wise_sales"
    | "hourly_sales"
    | "cash_out_report"
    | "cash_out_summary"
    | "monthly_sales_summary"
    | "failed_transaction"
    | "refund_orders"
  >("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [empPerms, setEmpPerms] = useState<Record<string, boolean>>({});
  const [managerMode, setManagerMode] = useState(false);

  // Helper: is this sub-tab accessible? Maps URL tab key → permission key
  const canAccessTab = (tabKey: string): boolean => {
    if (managerMode) return true;
    const permKey = TAB_TO_PERM_KEY[tabKey] ?? tabKey;
    if (ORDERS_SUBTAB_KEYS.includes(permKey)) return empPerms[permKey] === true;
    return true;
  };

  const ALL_MORE_TABS = [
    { key: "item_sales", label: "Item Sales" },
    { key: "hourly_sales", label: "Hourly Sales Report" },
    { key: "cash_out_report", label: "Cash Out Report" },
    // { key: "cash_out_summary", label: "Cash Out Summary" },
    { key: "monthly_sales_summary", label: "Monthly Sales Summary" },
    { key: "failed_transaction", label: "Failed Transaction" },
    { key: "refund_orders", label: "Refund Orders" },
  ];

  // Only show tabs this employee can access
  const MORE_TABS = managerMode
    ? ALL_MORE_TABS
    : ALL_MORE_TABS.filter((t) => empPerms[t.key] === true);

  const isMoreTabActive = ALL_MORE_TABS.some((t) => t.key === activeSubTab);
  const activeMoreTab = MORE_TABS.find((t) => t.key === activeSubTab);
  const moreButtonLabel = activeMoreTab ? activeMoreTab.label : "More";

  // ── Orders State ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // ── Server-side Pagination States ──
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Filters State ──
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  // Date states (Default: Last 30 Days)
  const getPastDateStr = (daysAgo: number) => {
    return getLocalPastDateStr(daysAgo);
  };
  const getTodayDateStr = () => {
    return getLocalTodayStr();
  };
  const getPastDateOf = (dateStr: string, daysAgo: number) => {
    return getLocalPastDateOf(dateStr, daysAgo);
  };

  const [startDate, setStartDate] = useState(getPastDateStr(30));
  const [endDate, setEndDate] = useState(getTodayDateStr());

  // Standard single date input (synced with endDate)
  const [singleDate, setSingleDate] = useState(getTodayDateStr());

  // Dashboard pre-aggregated metrics state
  const [dashboardMetrics, setDashboardMetrics] = useState<{
    totalOrders: number;
    totalEarnings: number;
    newCustomers: number;
    returningCustomers: number;
    popularDaysData: Array<{ name: string; value: number }>;
    popularFoodData: Array<{ name: string; value: number }>;
  } | null>(null);

  // ── Advance Search Modal State ──
  const [isAdvanceSearchOpen, setIsAdvanceSearchOpen] = useState(false);
  const [advStartDate, setAdvStartDate] = useState(getPastDateStr(30));
  const [advEndDate, setAdvEndDate] = useState(getTodayDateStr());

  // ── Fetch Orders from API ──
  const fetchOrders = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
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

      if (activeSubTab === "dashboard") {
        const res = await axios.get(`${apiUrl}/orders/dashboard-metrics`, {
          params: {
            date: singleDate,
            ...(branchId ? { branchId } : {}),
          },
        });
        if (res.data.success) {
          setDashboardMetrics(res.data.data);
        }
      } else if (
        [
          "orders",
          "cash_out_summary",
          "cash_out_report",
          "failed_transaction",
          "refund_orders",
        ].includes(activeSubTab)
      ) {
        const isAllLimit = [
          "cash_out_summary",
          "cash_out_report",
          "failed_transaction",
          "refund_orders",
        ].includes(activeSubTab);
        const res = await axios.get(`${apiUrl}/orders`, {
          params: {
            startDate: startDate,
            endDate: endDate,
            status: statusFilter || undefined,
            paymentStatus: paymentFilter || undefined,
            fields:
              "orderNumber,customer,subtotal,total,orderType,orderSource,paymentStatus,paymentMethod,payments,status,createdAt,orderTiming,scheduledAt,dueAt",
            page: isAllLimit ? 1 : currentPage,
            limit: isAllLimit ? 1000 : entriesPerPage,
            search: searchKeyword || undefined,
            ...(branchId ? { branchId } : {}),
          },
        });
        if (res.data.success) {
          if (res.data.data && res.data.data.orders) {
            setOrders(res.data.data.orders);
            setTotalPages(res.data.data.pagination.totalPages);
            setTotalCount(res.data.data.pagination.total);
          } else {
            setOrders(res.data.data || []);
            setTotalPages(1);
            setTotalCount(res.data.data?.length || 0);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      toast.error("Could not load dashboard data from database.");
    } finally {
      setLoading(false);
    }
  }, [
    isReady,
    activeSubTab,
    startDate,
    endDate,
    singleDate,
    statusFilter,
    paymentFilter,
    currentPage,
    entriesPerPage,
    searchKeyword,
  ]);

  // ── Reset Page On Filter Change ──
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, statusFilter, paymentFilter, startDate, endDate]);

  // ── Load employee permissions on mount ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const perms = getEmployeePermissions();
      const mgr = isManager();
      setEmpPerms(perms);
      setManagerMode(mgr);
    }

    const onPermsChange = () => {
      setEmpPerms(getEmployeePermissions());
      setManagerMode(isManager());
    };
    window.addEventListener("rms_active_employee_changed", onPermsChange);
    window.addEventListener("storage", onPermsChange);
    return () => {
      window.removeEventListener("rms_active_employee_changed", onPermsChange);
      window.removeEventListener("storage", onPermsChange);
    };
  }, []);

  // ── Parse Tab Query Param On Mount & enforce sub-tab permission ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const perms = getEmployeePermissions();
      const mgr = isManager();
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");

      const VALID_TABS = [
        "dashboard",
        "orders",
        "reception_view",
        "check_in_out",
        "sales_summary",
        "reports",
        "expense_payout",
        "update_profile",
        "change_password",
        "item_sales",
        "item_wise_sales",
        "hourly_sales",
        "cash_out_report",
        "cash_out_summary",
        "monthly_sales_summary",
        "failed_transaction",
        "refund_orders",
      ];

      let resolvedTab = tab && VALID_TABS.includes(tab) ? tab : "dashboard";

      // If not manager, validate the resolved tab against permissions
      if (!mgr) {
        // Map URL tab → permission key
        const permKey = TAB_TO_PERM_KEY[resolvedTab] ?? resolvedTab;
        if (ORDERS_SUBTAB_KEYS.includes(permKey) && perms[permKey] !== true) {
          // Find first permitted sub-tab (check by permission key, map back to URL tab)
          const PERM_TO_TAB: Record<string, string> = { orders_list: "orders" };
          const firstAllowedPermKey = ORDERS_SUBTAB_KEYS.find((k) => perms[k] === true);
          if (firstAllowedPermKey) {
            resolvedTab = PERM_TO_TAB[firstAllowedPermKey] ?? firstAllowedPermKey;
          } else {
            resolvedTab = "dashboard";
          }
          // Rewrite the URL silently
          const url = new URL(window.location.href);
          url.searchParams.set("tab", resolvedTab);
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      }

      setActiveSubTab(resolvedTab as any);
      if (resolvedTab === "dashboard") {
        setStartDate(getPastDateStr(30));
        setEndDate(getTodayDateStr());
      } else if (
        [
          "orders",
          "reception_view",
          "sales_summary",
          "hourly_sales",
          "failed_transaction",
          "refund_orders",
        ].includes(resolvedTab)
      ) {
        setStartDate(getTodayDateStr());
        setEndDate(getTodayDateStr());
        setSingleDate(getTodayDateStr());
      }
    }
    setIsReady(true);
  }, []);

  // ── Sync Active Tab to URL ──
  useEffect(() => {
    if (isReady && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeSubTab) {
        url.searchParams.set("tab", activeSubTab);
        window.history.pushState({}, "", url.pathname + url.search);
      }
    }
  }, [activeSubTab, isReady]);

  // ── Initial Fetch ──
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Sync singleDate to startDate/endDate range ──
  const handleSingleDateChange = (val: string) => {
    setSingleDate(val);
    if (
      activeSubTab === "orders" ||
      activeSubTab === "reception_view" ||
      isMoreTabActive ||
      activeSubTab === "hourly_sales" ||
      activeSubTab === "sales_summary" ||
      activeSubTab === "dashboard"
    ) {
      setStartDate(val);
      setEndDate(val);
    }
  };

  const handleExport = (format: "pdf" | "excel") => {
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
    let params = `type=${activeSubTab}&format=${format}&startDate=${startDate}&endDate=${endDate}`;
    if (branchId) params += `&branchId=${branchId}`;
    if (
      activeSubTab === "failed_transaction" ||
      activeSubTab === "refund_orders"
    ) {
      if (searchKeyword)
        params += `&search=${encodeURIComponent(searchKeyword)}`;
      if (statusFilter) params += `&status=${encodeURIComponent(statusFilter)}`;
    }
    const downloadUrl = `${apiUrl}/orders/export-report?${params}`;
    window.open(downloadUrl, "_blank");
  };

  // ── Month Selection Helper (Advance Search) ──
  const handleMonthSelect = (monthIdx: number) => {
    const currentYear = getLocalYear();
    const start = new Date(currentYear, monthIdx, 1);
    const end = new Date(currentYear, monthIdx + 1, 0);
    const startStr = dateToLocalStr(start);
    const endStr = dateToLocalStr(end);
    setAdvStartDate(startStr);
    setAdvEndDate(endStr);
  };

  // ── Reset Date Ranges on Tab Change ──
  // Deleted to preserve selected date across tabs as requested by the user.

  // ── Apply Quick Date Ranges (Advance Search) ──
  const handleQuickRange = (
    range:
      | "today"
      | "yesterday"
      | "this_week"
      | "last_week"
      | "this_month"
      | "last_month",
  ) => {
    const todayStr = getLocalTodayStr();
    let startStr = todayStr;
    let endStr = todayStr;

    switch (range) {
      case "today":
        // already set
        break;
      case "yesterday":
        startStr = getLocalPastDateStr(1);
        endStr = startStr;
        break;
      case "this_week": {
        // Current week (Monday to Sunday)
        const today = new Date(todayStr + "T12:00:00");
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(today);
        weekStart.setDate(diff);
        startStr = dateToLocalStr(weekStart);
        endStr = todayStr;
        break;
      }
      case "last_week": {
        const today = new Date(todayStr + "T12:00:00");
        const dayOfWeek = today.getDay();
        const thisMonday = new Date(today);
        thisMonday.setDate(
          today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1),
        );
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(thisMonday.getDate() - 7);
        const lastSunday = new Date(thisMonday);
        lastSunday.setDate(thisMonday.getDate() - 1);
        startStr = dateToLocalStr(lastMonday);
        endStr = dateToLocalStr(lastSunday);
        break;
      }
      case "this_month": {
        const today = new Date(todayStr + "T12:00:00");
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startStr = dateToLocalStr(monthStart);
        endStr = todayStr;
        break;
      }
      case "last_month": {
        const today = new Date(todayStr + "T12:00:00");
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startStr = dateToLocalStr(lastMonthStart);
        endStr = dateToLocalStr(lastMonthEnd);
        break;
      }
    }

    setAdvStartDate(startStr);
    setAdvEndDate(endStr);
  };

  const handleSelectOrder = async (order: Order) => {
    const toastId = toast.loading("Loading order details...");
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/orders/${order._id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data);
      } else {
        toast.error("Failed to load order details");
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      toast.error("Failed to load order details");
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleAdvanceSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStartDate(advStartDate);
    setEndDate(advEndDate);
    setIsAdvanceSearchOpen(false);
    toast.success(`Date range updated: ${advStartDate} to ${advEndDate}`);
  };

  const handleResetAdvanceSearch = () => {
    const defaultStart = isMoreTabActive
      ? getTodayDateStr()
      : getPastDateStr(30);
    const defaultEnd = getTodayDateStr();
    setAdvStartDate(defaultStart);
    setAdvEndDate(defaultEnd);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSingleDate(defaultEnd);
    setIsAdvanceSearchOpen(false);
    toast.success(
      isMoreTabActive
        ? "Filters reset to Today"
        : "Filters reset to default last 30 days",
    );
  };

  const handleClearFilters = () => {
    setSearchKeyword("");
    setStatusFilter("");
    setPaymentFilter("");
    const today = getTodayDateStr();
    setSingleDate(today);

    if (activeSubTab === "dashboard") {
      setStartDate(getPastDateStr(30));
      setEndDate(today);
    } else {
      setStartDate(today);
      setEndDate(today);
    }
    toast.success("Filters cleared successfully");
  };

  // ── Server-side Filtered Orders ──
  const filteredOrders = React.useMemo(() => {
    return orders;
  }, [orders]);

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar Header */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* ── Secondary Control Bar (Dashboard / Orders / Sales tabs + Filters) ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        {/* Left Side: Sub-tabs and Main Header Text */}
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px]">
            {activeSubTab === "dashboard"
              ? "Dashboard"
              : activeSubTab === "orders"
                ? "Orders"
                : activeSubTab === "reception_view"
                  ? "Reception View"
                  : activeSubTab === "sales_summary"
                    ? "Sales Summary"
                    : activeSubTab === "reports"
                      ? "Reports"
                      : activeSubTab === "update_profile"
                        ? "Update Profile"
                        : activeSubTab === "change_password"
                          ? "Change Password"
                          : activeSubTab === "item_sales"
                            ? "Item Sales"
                            : activeSubTab === "item_wise_sales"
                              ? "Item Wise Sales"
                              : activeSubTab === "hourly_sales"
                                ? "Hourly Sales Report"
                                : activeSubTab === "cash_out_report"
                                  ? "Cash Out Report"
                                  : activeSubTab === "cash_out_summary"
                                    ? "Cash Out Summary"
                                    : activeSubTab === "monthly_sales_summary"
                                      ? "Monthly Sales Summary"
                                      : activeSubTab === "failed_transaction"
                                        ? "Failed Transactions"
                                        : activeSubTab === "refund_orders"
                                          ? "Refund Orders"
                                          : "Expense/Payout"}
          </h1>

          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            {/* Dashboard tab – always shown if employee has permission */}
            {canAccessTab("dashboard") && (
              <button
                onClick={() => {
                  setActiveSubTab("dashboard");
                  setIsMoreDropdownOpen(false);
                  setStartDate(singleDate);
                  setEndDate(singleDate);
                }}
                className={`px-4 py-1.5 rounded-lg text-[11px] lg:text-[12.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                  activeSubTab === "dashboard"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-neutral-500 hover:text-brand-primary"
                }`}
              >
                Dashboard
              </button>
            )}

            {/* Orders tab */}
            {canAccessTab("orders") && (
              <button
                onClick={() => {
                  setActiveSubTab("orders");
                  setIsMoreDropdownOpen(false);
                  setStartDate(singleDate);
                  setEndDate(singleDate);
                }}
                className={`px-4 py-1.5 rounded-lg text-[11px] lg:text-[12.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                  activeSubTab === "orders"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-neutral-500 hover:text-brand-primary"
                }`}
              >
                Orders
              </button>
            )}

            {/* Sales Summary tab */}
            {canAccessTab("sales_summary") && (
              <button
                onClick={() => {
                  setActiveSubTab("sales_summary");
                  setIsMoreDropdownOpen(false);
                  setStartDate(singleDate);
                  setEndDate(singleDate);
                }}
                className={`px-4 py-1.5 rounded-lg text-[11px] lg:text-[12.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                  activeSubTab === "sales_summary"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-neutral-500 hover:text-brand-primary"
                }`}
              >
                Sales Summary
              </button>
            )}

            {/* More Dropdown – only shown if employee has access to at least one more-tab */}
            {MORE_TABS.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                  className={`px-4 py-1.5 rounded-lg text-[11px] lg:text-[12.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                    isMoreTabActive
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-neutral-500 hover:text-brand-primary"
                  }`}
                >
                  <span>{moreButtonLabel}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isMoreDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isMoreDropdownOpen && (
                  <>
                    {/* Backdrop overlay to close dropdown */}
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setIsMoreDropdownOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 z-40 animate-scale-up font-sans">
                      {MORE_TABS.map((tab) => {
                        const isActive = activeSubTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                              if (tab.key === "cash_out_report") {
                                window.location.href =
                                  "/employee/orders?tab=reports";
                              } else {
                                setActiveSubTab(tab.key as any);
                                if (
                                  [
                                    "hourly_sales",
                                    "failed_transaction",
                                    "refund_orders",
                                    "sales_summary",
                                    "dashboard",
                                  ].includes(tab.key)
                                ) {
                                  setStartDate(singleDate);
                                  setEndDate(singleDate);
                                }
                              }
                              setIsMoreDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-[11px] font-750 transition-colors cursor-pointer flex items-center justify-between ${
                              isActive
                                ? "bg-brand-primary text-white"
                                : "text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900"
                            }`}
                          >
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Filters (Keyword, Status, Payment, Date, More Search) */}
        <div className="flex flex-wrap items-center gap-3">
          {![
            "reports",
            "update_profile",
            "change_password",
            "expense_payout",
          ].includes(activeSubTab) && (
            <>
              {activeSubTab === "hourly_sales" ||
              activeSubTab === "sales_summary" ||
              activeSubTab === "dashboard" ? (
                <>
                  {/* Date Picker Input (Pill style with calendar icon on right) */}
                  <div className="relative">
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => handleSingleDateChange(e.target.value)}
                      className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-[#1E3A8A] hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm w-[135px]"
                    />
                    <Calendar
                      size={14}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[#1E3A8A] pointer-events-none"
                    />
                  </div>
                </>
              ) : activeSubTab === "cash_out_summary" ? (
                <>
                  {/* Start Date Picker Input */}
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-neutral-750 hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm w-[135px]"
                    />
                    <Calendar
                      size={14}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    />
                  </div>

                  {/* End Date Picker Input */}
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-neutral-750 hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm w-[135px]"
                    />
                    <Calendar
                      size={14}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    />
                  </div>

                  {/* More Search Button */}
                  <button
                    onClick={() => setIsAdvanceSearchOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-[#e31837] hover:bg-[#b9142d] active:scale-95 text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm select-none"
                  >
                    <Search size={13} />
                    <span>More Search</span>
                  </button>
                </>
              ) : activeSubTab === "failed_transaction" ||
                activeSubTab === "refund_orders" ? (
                <>
                  {/* Date Picker Input (Pill style with calendar icon on right) */}
                  <div className="relative">
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => handleSingleDateChange(e.target.value)}
                      className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-neutral-750 hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm w-[135px]"
                    />
                    <Calendar
                      size={14}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    />
                  </div>

                  {/* Keyword Search Input */}
                  <div className="relative w-[180px] sm:w-[220px]">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Search By Order #, Custom"
                      className="w-full bg-white border border-neutral-300 rounded-full px-5 py-1.5 text-[12px] text-neutral-700 placeholder-neutral-455 focus:outline-none focus:border-brand-primary hover:border-neutral-400 transition-all shadow-sm"
                    />
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Order Status Select */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-neutral-750 hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm"
                    >
                      <option value="">Select Order Status</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="pending">Pending</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    />
                  </div>

                  {/* More Search Button */}
                  <button
                    onClick={() => setIsAdvanceSearchOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-[#e31837] hover:bg-[#b9142d] active:scale-95 text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm select-none"
                  >
                    <Search size={13} />
                    <span>More Search</span>
                  </button>
                </>
              ) : isMoreTabActive ? (
                <>
                  {/* Date Display Pill (Clickable to open Advance Search) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAdvanceSearchOpen(true)}
                      className="bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-[#1E3A8A] hover:border-neutral-400 hover:border-brand-primary/40 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm min-w-[135px] text-left flex items-center min-h-[32px]"
                    >
                      {startDate === endDate
                        ? formatDateDisplay(startDate)
                        : `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`}
                    </button>
                    <Calendar
                      size={14}
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[#1E3A8A] pointer-events-none"
                    />
                  </div>

                  {/* More Search Button */}
                  <button
                    onClick={() => setIsAdvanceSearchOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-[#e31837] hover:bg-[#b9142d] active:scale-95 text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm select-none"
                  >
                    <Search size={13} />
                    <span>More Search</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Date Display Pill (Clickable to open Advance Search) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAdvanceSearchOpen(true)}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-350 hover:border-brand-primary/40 focus:outline-none focus:border-brand-primary cursor-pointer transition-all min-w-[120px] text-left flex items-center min-h-[32px]"
                    >
                      {startDate === endDate
                        ? formatDateDisplay(startDate)
                        : `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`}
                    </button>
                    <Calendar
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    />
                  </div>

                  {/* Keyword Search Input */}
                  <div className="relative w-[180px] sm:w-[220px]">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Search by Order #, Cust"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary hover:border-neutral-350 focus:bg-white transition-all"
                    />
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Order Status Select */}
                  {activeSubTab === "orders" && (
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-350 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
                      >
                        <option value="">Order Status</option>
                        <option value="pending">Pending</option>
                        <option value="preparing">In Preparing</option>
                        <option value="ready">Ready For Pickup</option>
                        <option value="completed">Order Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Payment Method Select */}
                  {/* {activeSubTab === "orders" && (
                <div className="relative">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-350 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
                  >
                    <option value="">Payment Status</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                </div>
              )} */}

                  {/* Advance Search Button */}
                  {activeSubTab === "orders" && (
                    <button
                      onClick={() => setIsAdvanceSearchOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-[12px] font-600 text-neutral-700 hover:text-brand-primary transition-all cursor-pointer shadow-2xs"
                    >
                      <SlidersHorizontal size={13} />
                      <span>Advance Search</span>
                    </button>
                  )}

                  {/* Clear Filters Button */}
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-600 text-neutral-500 hover:text-neutral-800 transition-all cursor-pointer"
                  >
                    <span>Clear</span>
                  </button>

                  {/* Manual Refresh Trigger */}
                  {activeSubTab === "orders" && (
                    <button
                      onClick={fetchOrders}
                      className={`p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-brand-primary transition-all cursor-pointer ${
                        loading ? "animate-spin" : ""
                      }`}
                      title="Refresh list"
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                </>
              )}
              {/* Export Button */}
              {[
                "item_sales",
                "hourly_sales",
                "cash_out_summary",
                "monthly_sales_summary",
                "failed_transaction",
                "refund_orders",
              ].includes(activeSubTab) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIsExportDropdownOpen(!isExportDropdownOpen)
                    }
                    className="flex items-center gap-1.5 px-4 py-1.5 border border-neutral-300 rounded-full bg-white hover:bg-neutral-50 text-[12px] font-800 text-neutral-750 hover:text-brand-primary active:scale-95 transition-all cursor-pointer shadow-sm select-none"
                  >
                    <Download size={13} />
                    <span>Export</span>
                    <ChevronDown size={12} />
                  </button>
                  {isExportDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setIsExportDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2.5 w-52 bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-2xl shadow-xl p-1.5 z-40 animate-scale-up font-sans divide-y divide-neutral-100 select-none">
                        <div className="py-0.5 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              handleExport("pdf");
                              setIsExportDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-3 hover:bg-rose-50/80 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-rose-100/70 group-hover:bg-rose-600 text-rose-600 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                              <FileText size={15} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11.5px] font-800 text-neutral-800 group-hover:text-rose-700 leading-tight">
                                Export as PDF
                              </span>
                              <span className="text-[9.5px] text-neutral-400 font-500 truncate">
                                Printable PDF Report
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleExport("excel");
                              setIsExportDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-3 hover:bg-emerald-50/80 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-100/70 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                              <FileSpreadsheet size={15} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11.5px] font-800 text-neutral-800 group-hover:text-emerald-700 leading-tight">
                                Export as Excel
                              </span>
                              <span className="text-[9.5px] text-neutral-400 font-500 truncate">
                                Spreadsheet (.csv)
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main View Container ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-brand-bg flex flex-col min-h-0">
        {loading &&
        (activeSubTab === "dashboard"
          ? !dashboardMetrics
          : orders.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute w-12 h-12 rounded-full border-4 border-brand-primary/10 animate-ping duration-1000" />
              {/* Inner spinning gradient ring */}
              <div className="w-12 h-12 rounded-full border-4 border-neutral-200 border-t-brand-primary animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-800 tracking-wider uppercase text-neutral-550 animate-pulse">
                Fetching updated dashboard records
              </span>
              <span className="text-[9px] text-neutral-400 font-500">
                Please wait a moment...
              </span>
            </div>
          </div>
        ) : (
          <>
            {activeSubTab === "dashboard" ? (
              <DashboardView
                metrics={
                  dashboardMetrics || {
                    totalOrders: 0,
                    totalEarnings: 0,
                    newCustomers: 0,
                    returningCustomers: 0,
                    popularDaysData: [],
                    popularFoodData: [],
                  }
                }
                loading={loading}
              />
            ) : activeSubTab === "sales_summary" ? (
              <SalesSummaryView selectedDate={singleDate} />
            ) : activeSubTab === "reports" ? (
              <ReportsView />
            ) : activeSubTab === "update_profile" ? (
              <UpdateProfileView />
            ) : activeSubTab === "change_password" ? (
              <ChangePasswordView />
            ) : activeSubTab === "expense_payout" ? (
              <ExpenseDashboardView />
            ) : activeSubTab === "item_sales" ? (
              <ItemSalesView startDate={startDate} endDate={endDate} />
            ) : activeSubTab === "hourly_sales" ? (
              <HourlySalesView startDate={startDate} endDate={endDate} />
            ) : activeSubTab === "monthly_sales_summary" ? (
              <MonthlySalesView startDate={startDate} endDate={endDate} />
            ) : activeSubTab === "failed_transaction" ? (
              <FailedTransactionsView
                orders={orders}
                onSelectOrder={handleSelectOrder}
                searchKeyword={searchKeyword}
                statusFilter={statusFilter}
                selectedDate={singleDate}
              />
            ) : activeSubTab === "refund_orders" ? (
              <RefundOrdersView
                orders={orders}
                onSelectOrder={handleSelectOrder}
                searchKeyword={searchKeyword}
                statusFilter={statusFilter}
                selectedDate={singleDate}
              />
            ) : activeSubTab === "cash_out_summary" ||
              activeSubTab === "cash_out_report" ? (
              <CashOutSummaryView
                orders={orders}
                startDate={startDate}
                endDate={endDate}
              />
            ) : activeSubTab === "item_wise_sales" ? (
              <DummyReportView title="Item Wise Sales" />
            ) : (
              <OrdersTableView
                orders={filteredOrders}
                onSelectOrder={handleSelectOrder}
                isServerSide={true}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                entriesPerPage={entriesPerPage}
                setEntriesPerPage={setEntriesPerPage}
                totalEntries={totalCount}
              />
            )}
          </>
        )}
      </div>

      {/* Sidebar Drawer Component */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeSubTab}
        onSelectTab={(tabKey) => {
          if (
            [
              "dashboard",
              "orders",
              "reception_view",
              "check_in_out",
              "sales_summary",
              "reports",
              "update_profile",
              "change_password",
              "expense_payout",
              "item_sales",
              "item_wise_sales",
              "hourly_sales",
              "cash_out_report",
              "cash_out_summary",
              "monthly_sales_summary",
              "failed_transaction",
              "refund_orders",
            ].includes(tabKey)
          ) {
            setActiveSubTab(tabKey as any);
            if (
              [
                "hourly_sales",
                "failed_transaction",
                "refund_orders",
                "sales_summary",
                "dashboard",
              ].includes(tabKey)
            ) {
              setStartDate(singleDate);
              setEndDate(singleDate);
            }
          } else {
            toast.success(
              `Navigating to ${tabKey.replace("_", " ").toUpperCase()}`,
            );
          }
        }}
      />

      {/* ── Advance Search Modal ── */}
      {isAdvanceSearchOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <form
            onSubmit={handleAdvanceSearchSubmit}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
          >
            {/* Modal Header */}
            <div className="bg-brand-primary text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-850 text-[13px] uppercase tracking-wider">
                Advance Search
              </h3>
              <button
                type="button"
                onClick={() => setIsAdvanceSearchOpen(false)}
                className="text-white hover:text-white/80"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Quick Ranges */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "this_week", label: "This week" },
                    { id: "last_week", label: "Last week" },
                    { id: "this_month", label: "This month" },
                    { id: "last_month", label: "Last month" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => handleQuickRange(btn.id as any)}
                      className="px-3 py-1 border border-neutral-200 rounded-md bg-neutral-50 hover:bg-neutral-100 text-[11px] font-600 text-neutral-600 hover:text-brand-primary transition-all cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month selections */}
              <div className="space-y-1.5 pt-1.5 border-t border-neutral-100/70">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((month, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleMonthSelect(idx)}
                      className="px-2 py-1 border border-neutral-200 rounded-md bg-white hover:bg-neutral-50 hover:border-neutral-350 text-[10.5px] font-700 text-neutral-600 hover:text-brand-primary transition-all cursor-pointer text-center"
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start and End Date selection */}
              <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-neutral-100/70">
                <div className="space-y-1">
                  <label className="text-[10.5px] text-neutral-500 font-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={advStartDate}
                    onChange={(e) => setAdvStartDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-600 text-neutral-700 focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] text-neutral-500 font-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={advEndDate}
                    onChange={(e) => setAdvEndDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-600 text-neutral-700 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex items-center justify-end gap-3 select-none">
              <button
                type="submit"
                className="px-8 py-2 bg-[#881337] hover:bg-[#7F1D1D] active:scale-95 text-white text-[11px] font-800 tracking-wide uppercase rounded-full shadow-sm transition-all cursor-pointer"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleResetAdvanceSearch}
                className="px-8 py-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white text-[11px] font-800 tracking-wide uppercase rounded-full shadow-sm transition-all cursor-pointer"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Order Detail Modal Overlay ── */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRefresh={fetchOrders}
      />
    </main>
  );
}
