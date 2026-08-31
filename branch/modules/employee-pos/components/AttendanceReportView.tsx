"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import PosNavbar from "./PosNavbar";
import POSSidebarDrawer from "./POSSidebarDrawer";
import {
  Calendar,
  Search,
  Download,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  User,
  Pencil,
} from "lucide-react";
import { getLocalTodayStr } from "../utils/timezone";
import EditShiftModal from "./EditShiftModal";
import { getPusherClient } from "../../../lib/pusher";

interface AttendanceReportRow {
  attendanceId: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  date: string;
  dateDayStr: string;
  startTime: string;
  endTime: string;
  rawCheckIn?: string;
  rawCheckOut?: string;
  rawBreaks?: Array<{ breakIn: string; breakOut: string }>;
  totalShiftHours: number;
  breaks: Array<{ breakIn: string; breakOut: string; durationMins: number }>;
  totalBreakHours: number;
  totalPayableHours: number;
  status: string;
  scheduledShiftStart?: string;
  scheduledShiftEnd?: string;
  autoCheckedOut?: boolean;
  managerOverride?: boolean;
  notes?: string;
  segmentIndex?: number;
  totalSegments?: number;
}

interface EmployeeItem {
  _id: string;
  employeeId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

export default function AttendanceReportView() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Employee Selection State
  const [employeesList, setEmployeesList] = useState<EmployeeItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");

  // Default Period: 1 Week Payout (Last 7 Days)
  const todayStr = getLocalTodayStr();
  const getWeekAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "week" | "month" | "custom">("week");
  const [startDate, setStartDate] = useState(getWeekAgoStr());
  const [endDate, setEndDate] = useState(todayStr);

  // Data
  const [reportRows, setReportRows] = useState<AttendanceReportRow[]>([]);

  const getBranchId = () => {
    if (typeof window !== "undefined") {
      const rawBranch = localStorage.getItem("rms_branch");
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          return b._id || b.id;
        } catch (e) {}
      }
    }
    return null;
  };

  // Fetch employees list for selection panel
  const fetchEmployees = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/employees`, {
        params: { branchId, minimal: true, excludeDrivers: true },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        setEmployeesList(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch employees list:", err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Selected Employee Details
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employeesList.find((e) => e._id === selectedEmployeeId || e.employeeId === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employeesList]);

  // Handle Preset Date changes
  const handlePresetChange = (preset: "today" | "yesterday" | "week" | "month" | "custom") => {
    setDatePreset(preset);
    const today = new Date();
    const fmt = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = fmt(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === "week") {
      setStartDate(getWeekAgoStr());
      setEndDate(todayStr);
    } else if (preset === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(fmt(monthStart));
      setEndDate(todayStr);
    }
  };

  // Fetch Attendance Report Data for Selected Employee
  const fetchReport = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId || !selectedEmployee) {
      setReportRows([]);
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/attendance/report`, {
        params: {
          branchId,
          startDate,
          endDate,
          employeeId: selectedEmployee._id,
        },
      });

      if (res.data.success && Array.isArray(res.data.data?.rows)) {
        setReportRows(res.data.data.rows);
      } else {
        setReportRows([]);
      }
    } catch (err: any) {
      console.error("Error fetching attendance report:", err);
      toast.error(err.response?.data?.message || "Failed to load attendance report");
      setReportRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedEmployee]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Subscribe to Pusher Realtime Attendance Updates
  useEffect(() => {
    const branchId = getBranchId();
    if (!branchId) return;

    try {
      const pusher = getPusherClient();
      const channelName = `attendance-${branchId}`;
      const channel = pusher.subscribe(channelName);

      channel.bind("attendance-updated", () => {
        toast("Attendance updated live ⚡", { icon: "", duration: 3000 });
        fetchReport();
      });

      return () => {
        pusher.unsubscribe(channelName);
      };
    } catch (e) {}
  }, [fetchReport]);

  // Dynamic Maximum Break Count calculation (Adapts to 1, 2, 3, 4, 5+ breaks dynamically!)
  const maxBreaksCount = useMemo(() => {
    if (reportRows.length === 0) return 1;
    const counts = reportRows.map((r) => (r.breaks ? r.breaks.length : 0));
    const maxVal = Math.max(0, ...counts);
    return Math.max(1, maxVal);
  }, [reportRows]);

  // Edit Modal State
  const [editingRow, setEditingRow] = useState<AttendanceReportRow | null>(null);

  // Selected Employee Aggregated Totals
  const selectedEmployeeTotals = useMemo(() => {
    let totalShift = 0;
    let totalBreak = 0;
    let totalPayable = 0;

    reportRows.forEach((r) => {
      totalShift += r.totalShiftHours;
      totalBreak += r.totalBreakHours;
      totalPayable += r.totalPayableHours;
    });

    return {
      totalShift: totalShift.toFixed(2),
      totalBreak: totalBreak.toFixed(2),
      totalPayable: totalPayable.toFixed(2),
      shiftsCount: reportRows.length,
    };
  }, [reportRows]);

  // Filtered Chips based on search input (Excluding Drivers)
  const filteredEmployeesList = useMemo(() => {
    const staffOnly = employeesList.filter((e) => !e.role || e.role.toLowerCase() !== "driver");
    if (!employeeSearchInput.trim()) return staffOnly;
    const q = employeeSearchInput.toLowerCase().trim();
    return staffOnly.filter(
      (e) => e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
    );
  }, [employeesList, employeeSearchInput]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!selectedEmployee || reportRows.length === 0) {
      toast.error("No employee attendance data to export");
      return;
    }

    const breakHeaders: string[] = [];
    for (let i = 0; i < maxBreaksCount; i++) {
      breakHeaders.push(`Break ${i + 1} In`, `Break ${i + 1} Out`);
    }

    const headers = [
      "Employee No",
      "Employee Name",
      "Role",
      "Date & Day",
      "Start Time",
      "End Time",
      "Total Shift Hrs",
      ...breakHeaders,
      "Total Break Time (Hrs)",
      "Total Payable Hours",
      "Status",
    ];

    const csvLines = [headers.join(",")];

    reportRows.forEach((r) => {
      const breakCells: string[] = [];
      for (let i = 0; i < maxBreaksCount; i++) {
        const bIn = r.breaks && r.breaks[i] ? r.breaks[i].breakIn : "--";
        const bOut = r.breaks && r.breaks[i] ? r.breaks[i].breakOut : "--";
        breakCells.push(`"${bIn}"`, `"${bOut}"`);
      }

      const row = [
        `"${r.employeeId}"`,
        `"${r.employeeName}"`,
        `"${r.role.toUpperCase()}"`,
        `"${r.dateDayStr}"`,
        `"${r.startTime}"`,
        `"${r.endTime}"`,
        r.totalShiftHours,
        ...breakCells,
        r.totalBreakHours,
        r.totalPayableHours,
        `"${r.status}"`,
      ];
      csvLines.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvLines.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${selectedEmployee.name}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Attendance Report for ${selectedEmployee.name} exported to CSV!`);
  };

  // Print Report
  const handlePrint = () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee first!");
      return;
    }
    window.print();
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans select-none">
      {/* Top POS Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* ── Sub-header Controls Bar (Matching Driver Drop Header UI) ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-xs flex-shrink-0 select-none">
        {/* Left Side: Page Title */}
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-900 text-neutral-900 tracking-tight leading-none min-w-[180px] flex items-center gap-2">
            <span>Attendance Report</span>
          </h1>
        </div>

        {/* Right Side: Action Buttons & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchReport}
            className="p-2 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors cursor-pointer shadow-xs"
            title="Refresh Attendance Report"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-[#e31837]" : ""} />
          </button>

          {/* 
          <button
            onClick={handleExportCSV}
            disabled={!selectedEmployee || reportRows.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-[12px] lg:text-[13px] font-800 transition-all shadow-xs ${
              selectedEmployee && reportRows.length > 0
                ? "bg-[#059669] hover:bg-[#047857] cursor-pointer active:scale-95"
                : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60"
            }`}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedEmployee}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-[12px] lg:text-[13px] font-800 transition-all shadow-xs ${
              selectedEmployee
                ? "bg-neutral-900 hover:bg-neutral-800 cursor-pointer active:scale-95"
                : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60"
            }`}
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button> 
          */}
        </div>
      </div>

      {/* ── Main Scrollable Body Container ── */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 space-y-5">
        
        {/* ── Section 1: Employee Selection & Profile Card (Matching Driver Drop UI) ── */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
          {/* Card Banner Header */}
          <div className="bg-[#e31837] text-white px-4 py-2.5 font-900 text-[12px] lg:text-[13.5px] uppercase tracking-wider flex items-center justify-between select-none">
            <span className="flex items-center gap-2">
              <User size={15} />
              <span>Employee Selection & Profile</span>
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            
            {/* Left Column: Search & Employee Chips */}
            <div className="lg:col-span-6 space-y-3">
              <label className="text-[10px] font-800 uppercase tracking-wider text-neutral-500 block">
                Select Employee / Search by ID or Name
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Enter Employee ID or Name..."
                    value={employeeSearchInput}
                    onChange={(e) => setEmployeeSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredEmployeesList.length > 0) {
                        setSelectedEmployeeId(filteredEmployeesList[0]._id);
                      }
                    }}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-[12px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-[#e31837] focus:bg-white transition-all font-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (filteredEmployeesList.length > 0) {
                      setSelectedEmployeeId(filteredEmployeesList[0]._id);
                    } else {
                      toast.error("No employee found matching query.");
                    }
                  }}
                  className="px-4 py-2 bg-[#e31837] hover:bg-[#b9142d] text-white text-[11.5px] font-800 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>

              {/* Clickable Employee Chips */}
              <div className="flex flex-wrap gap-2 pt-1 max-h-[110px] overflow-y-auto pr-1">
                {employeesList.length === 0 ? (
                  <div className="text-[11px] text-neutral-400 italic">
                    Loading employees...
                  </div>
                ) : (
                  employeesList.map((emp) => {
                    const isSelected = selectedEmployee?._id === emp._id;
                    return (
                      <button
                        key={emp._id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEmployeeId("");
                          } else {
                            setSelectedEmployeeId(emp._id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] lg:text-[12px] font-800 uppercase transition-all cursor-pointer border flex items-center gap-2 ${
                          isSelected
                            ? "bg-[#e31837] text-white border-[#e31837] shadow-xs"
                            : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-[#e31837]/40 hover:bg-neutral-100"
                        }`}
                      >
                        <span>{emp.name}</span>
                        <span
                          className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                            isSelected
                              ? "bg-white/20 text-white font-bold"
                              : "bg-neutral-200 text-neutral-600"
                          }`}
                        >
                          {emp.employeeId}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Employee Profile or Empty State */}
            <div className="lg:col-span-6">
              {!selectedEmployee ? (
                <div className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center text-neutral-400 space-y-1.5 bg-neutral-50/50">
                  <div className="w-10 h-10 rounded-full bg-neutral-200/60 flex items-center justify-center mx-auto text-neutral-500">
                    <User size={20} />
                  </div>
                  <h4 className="text-xs font-800 text-neutral-600 uppercase tracking-wide">
                    NO EMPLOYEE SELECTED
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-500 max-w-sm mx-auto">
                    Select an employee from the left chips or search by ID/Name to load shift attendance report.
                  </p>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#e31837]/10 border border-[#e31837]/20 flex items-center justify-center text-[#e31837] font-bold text-sm">
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-900 text-neutral-900">{selectedEmployee.name}</h3>
                          <span className="bg-[#e31837] text-white px-2 py-0.2 rounded text-[9.5px] font-800 uppercase tracking-wide">
                            {selectedEmployee.role}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-mono font-700 text-neutral-500">
                          EMP ID: {selectedEmployee.employeeId}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedEmployeeId("")}
                      className="text-[10px] font-800 text-neutral-400 hover:text-red-600 underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>

                  {/* Summary Metric Pills for Selected Employee */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div className="text-[9.5px] font-800 uppercase text-neutral-400">Total Shift</div>
                      <div className="text-sm font-900 text-neutral-800 font-mono mt-0.5">
                        {selectedEmployeeTotals.totalShift} <span className="text-[10px]">hrs</span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div className="text-[9.5px] font-800 uppercase text-neutral-400">Total Break</div>
                      <div className="text-sm font-900 text-orange-600 font-mono mt-0.5">
                        {selectedEmployeeTotals.totalBreak} <span className="text-[10px]">hrs</span>
                      </div>
                    </div>

                    <div className="bg-amber-100/70 p-2.5 rounded-lg border border-amber-300">
                      <div className="text-[9.5px] font-900 uppercase text-amber-900">Total Payable</div>
                      <div className="text-sm font-900 text-amber-950 font-mono mt-0.5">
                        {selectedEmployeeTotals.totalPayable} <span className="text-[10px]">hrs</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Section 2: Main Attendance Logs Table (Only displayed when Employee is Selected) ── */}
        {!selectedEmployee ? (
          /* Empty State: Prompt user to select employee (Matching Driver Drop empty state!) */
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#e31837] border border-red-200 flex items-center justify-center shadow-inner">
              <FileSpreadsheet size={28} />
            </div>
            <h3 className="text-base font-900 text-neutral-800 uppercase tracking-wide">
              SELECT AN EMPLOYEE TO VIEW ATTENDANCE REPORT
            </h3>
            <p className="text-xs text-neutral-500 font-500 max-w-md leading-relaxed">
              Choose an employee from the selection panel above or search by Employee ID (e.g. <strong className="text-neutral-800">001</strong>) to load shift reconciliation, calculate payable hours, and export payroll report.
            </p>
          </div>
        ) : (
          /* Main Table Container */
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Period Filters Header Bar */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 space-y-3 select-none">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                
                {/* Date Presets (Default: Last 7 Days / 1 Week Payout) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-800 uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1 shrink-0">
                    <Calendar size={13} /> Period:
                  </span>
                  {[
                    { id: "week", label: "Last 7 Days (1 Week)" },
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "month", label: "This Month" },
                    { id: "custom", label: "Custom Range" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePresetChange(p.id as any)}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-800 uppercase tracking-wide transition-all cursor-pointer border shrink-0 ${
                        datePreset === p.id
                          ? "bg-[#e31837] border-[#e31837] text-white shadow-xs"
                          : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Date Pickers */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-700 text-neutral-800 shadow-2xs">
                    <span className="text-[10px] font-800 text-neutral-400 uppercase">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setDatePreset("custom");
                        setStartDate(e.target.value);
                      }}
                      className="bg-transparent focus:outline-none cursor-pointer font-mono font-700 text-neutral-900 text-xs"
                    />
                  </div>

                  <span className="text-neutral-400 font-bold text-xs">-</span>

                  <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-700 text-neutral-800 shadow-2xs">
                    <span className="text-[10px] font-800 text-neutral-400 uppercase">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setDatePreset("custom");
                        setEndDate(e.target.value);
                      }}
                      className="bg-transparent focus:outline-none cursor-pointer font-mono font-700 text-neutral-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Logs Table (DYNAMIC BREAK COLUMNS: Automatically expands for 1, 2, 3, 5+ breaks!) */}
            <div className="overflow-x-auto min-h-[350px]">
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400 select-none">
                  <div className="w-9 h-9 border-3 border-neutral-200 border-t-[#e31837] rounded-full animate-spin" />
                  <span className="text-xs font-700 text-neutral-600">Loading shift logs for {selectedEmployee.name}...</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    {/* Category Header Row */}
                    <tr className="bg-neutral-800 text-white text-[10.5px] font-800 uppercase tracking-wider select-none border-b border-neutral-700">
                      <th colSpan={4} className="py-2.5 px-4">Shift Details</th>
                      {Array.from({ length: maxBreaksCount }).map((_, bIdx) => (
                        <th key={`cat-break-${bIdx}`} colSpan={2} className="py-2.5 px-2 text-center bg-neutral-700/60">
                          Break {bIdx + 1}
                        </th>
                      ))}
                      <th colSpan={3} className="py-2.5 px-4 text-right bg-amber-900/50 text-amber-300">Payable Summary</th>
                      <th className="py-2.5 px-3 text-center bg-neutral-900 text-neutral-300">Action</th>
                    </tr>

                    {/* Column Labels Header Row */}
                    <tr className="bg-neutral-100 text-neutral-700 border-b border-neutral-200 text-[11px] font-800 uppercase tracking-wider select-none">
                      <th className="py-3 px-4">Date & Day</th>
                      <th className="py-3 px-3">Start Time</th>
                      <th className="py-3 px-3">End Time</th>
                      <th className="py-3 px-3">Total Shift</th>

                      {/* Dynamic Break Columns */}
                      {Array.from({ length: maxBreaksCount }).map((_, bIdx) => (
                        <React.Fragment key={`lbl-break-${bIdx}`}>
                          <th className="py-3 px-2 text-center bg-neutral-50/70">In</th>
                          <th className="py-3 px-2 text-center bg-neutral-50/70">Out</th>
                        </React.Fragment>
                      ))}

                      {/* Total Break & Total Payable */}
                      <th className="py-3 px-3 text-center">Total Break</th>
                      <th className="py-3 px-4 text-right bg-amber-50 text-amber-950 font-900">Total Payable Hours</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Edit Log</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-100 text-xs font-sans">
                    {reportRows.length === 0 ? (
                      <tr>
                        <td colSpan={8 + maxBreaksCount * 2} className="py-16 text-center text-neutral-400 font-500">
                          No attendance shift logs found for <strong className="text-neutral-700">{selectedEmployee.name}</strong> in selected period.
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((row, idx) => (
                        <tr
                          key={`${row.attendanceId}-${row.shiftId}-${idx}`}
                          className="hover:bg-neutral-50/80 transition-colors"
                        >
                          {/* Date & Day + Split Shift Badge */}
                          <td className="py-3.5 px-4 font-700 text-neutral-900 font-mono text-[12px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{row.dateDayStr}</span>
                              {row.totalSegments && row.totalSegments > 1 ? (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded text-[9.5px] font-800 uppercase tracking-wide">
                                  Shift #{row.segmentIndex}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Start Time + Scheduled Subtext */}
                          <td className="py-3.5 px-3 font-mono">
                            <div className="font-700 text-emerald-700 text-xs">{row.startTime}</div>
                            {row.scheduledShiftStart ? (
                              <div className="text-[10px] text-neutral-400 font-550">
                                Sched: {row.scheduledShiftStart}
                              </div>
                            ) : null}
                          </td>

                          {/* End Time + Scheduled Subtext */}
                          <td className="py-3.5 px-3 font-mono">
                            <div className="font-700 text-neutral-800 text-xs">{row.endTime}</div>
                            {row.scheduledShiftEnd ? (
                              <div className="text-[10px] text-neutral-400 font-550">
                                Sched: {row.scheduledShiftEnd}
                              </div>
                            ) : null}
                          </td>

                          {/* Total Shift Hrs */}
                          <td className="py-3.5 px-3 font-mono font-700 text-neutral-600">
                            {row.totalShiftHours.toFixed(2)} hrs
                          </td>

                          {/* Dynamic Break Cells */}
                          {Array.from({ length: maxBreaksCount }).map((_, bIdx) => {
                            const bObj = row.breaks && row.breaks[bIdx];
                            return (
                              <React.Fragment key={`cell-break-${idx}-${bIdx}`}>
                                <td className="py-3.5 px-2 text-center font-mono text-[11px] text-neutral-500 bg-neutral-50/30">
                                  {bObj ? bObj.breakIn : "--"}
                                </td>
                                <td className="py-3.5 px-2 text-center font-mono text-[11px] text-neutral-500 bg-neutral-50/30">
                                  {bObj ? bObj.breakOut : "--"}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Total Break Hrs */}
                          <td className="py-3.5 px-3 text-center font-mono font-700 text-orange-700">
                            <span title={row.breaks && row.breaks.length > 0 ? `${row.breaks.length} break(s) recorded` : "No breaks"}>
                              {row.totalBreakHours.toFixed(2)} hrs
                            </span>
                          </td>

                          {/* Total Payable Hours */}
                          <td className="py-3.5 px-4 text-right bg-amber-50/50 font-mono font-900 text-sm text-amber-950">
                            <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                              {row.totalPayableHours.toFixed(2)} hrs
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center select-none">
                            {row.status === "checked-in" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-900 bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Working
                              </span>
                            ) : row.status === "on-break" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-900 bg-amber-100 text-amber-800 border border-amber-300">
                                On Break
                              </span>
                            ) : row.autoCheckedOut ? (
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-900 bg-purple-100 text-purple-800 border border-purple-300 cursor-help"
                                title={row.notes || "Auto-checked out by system at scheduled shift end"}
                              >
                                Auto Closed
                              </span>
                            ) : row.managerOverride ? (
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-900 bg-amber-100 text-amber-900 border border-amber-300 cursor-help"
                                title={row.notes || "Approved via Manager PIN Override"}
                              >
                                🔑 Manager Override
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-700 bg-neutral-100 text-neutral-600 border border-neutral-200">
                                Shift Closed
                              </span>
                            )}
                          </td>

                          {/* Action: Edit Shift Log */}
                          <td className="py-3.5 px-3 text-center select-none">
                            <button
                              onClick={() => setEditingRow(row)}
                              className="px-3 py-1.5 bg-[#e31837] hover:bg-[#b9142d] text-white rounded-lg text-[11px] font-800 flex items-center gap-1 mx-auto transition-all active:scale-95 shadow-2xs cursor-pointer"
                              title="Edit check-in, check-out, or break times"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Edit Shift Log Modal */}
      <EditShiftModal
        isOpen={!!editingRow}
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSuccess={fetchReport}
      />

      {/* Sidebar Drawer Component */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="attendance_report"
        onSelectTab={(tabKey) => {
          if (tabKey === 'orders' || tabKey === 'dashboard' || tabKey === 'sales_summary' || tabKey === 'expense_payout') {
            window.location.href = `/employee/orders?tab=${tabKey}`;
          }
        }}
      />
    </main>
  );
}
