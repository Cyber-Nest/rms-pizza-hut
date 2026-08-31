"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import PosNavbar from "./PosNavbar";
import POSSidebarDrawer from "./POSSidebarDrawer";
import EditScheduleModal from "./EditScheduleModal";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { getLocalTodayStr, dateToLocalStr } from "../utils/timezone";

interface ShiftSegment {
  startTime: string;
  endTime: string;
  hours: number;
}

interface ScheduleEntry {
  _id?: string;
  employeeId: string;
  date: string;
  isOff?: boolean;
  shifts?: ShiftSegment[];
  totalHours?: number;
  notes?: string;
}

interface EmployeeItem {
  _id: string;
  employeeId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address: string;
  locationStr: string;
}

// Get Monday date string for a given date YYYY-MM-DD
function getMondayOfDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 is Sun, 1 is Mon
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(dt.setDate(diff));
  return dateToLocalStr(monday);
}

// Get 7 consecutive dates starting from Monday YYYY-MM-DD
function getWeekDates(mondayStr: string) {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const dates: Array<{
    dateStr: string;
    dayName: string;
    dayShort: string;
    dateDisplay: string;
  }> = [];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i);
    const dateStr = dateToLocalStr(dt);

    const dayNum = dt.getDate();
    const monthShort = dt.toLocaleString("en-US", { month: "short" });
    const dateDisplay = `${dayNum}-${monthShort}`;

    dates.push({
      dateStr,
      dayName: dayNames[i],
      dayShort: dayNames[i],
      dateDisplay,
    });
  }
  return dates;
}

// Calculate week number of year
function getWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const firstDayOfYear = new Date(dt.getFullYear(), 0, 1);
  const pastDaysOfYear = (dt.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export default function EmployeeScheduleView() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  // Week Navigation State
  const todayStr = getLocalTodayStr();
  const [mondayStr, setMondayStr] = useState<string>(() =>
    getMondayOfDate(todayStr),
  );

  // Branch Info & Schedule Data
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleEntry>>(
    {},
  );

  // Modal State
  const [selectedCell, setSelectedCell] = useState<{
    employee: EmployeeItem;
    date: string;
    dayLabel: string;
    initialSchedule?: ScheduleEntry | null;
  } | null>(null);

  const weekDates = useMemo(() => getWeekDates(mondayStr), [mondayStr]);
  const sundayStr = weekDates[6]?.dateStr || mondayStr;
  const weekNum = useMemo(() => getWeekNumber(mondayStr), [mondayStr]);

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

  // Fetch Schedule Matrix from API
  const fetchSchedule = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) return;

    setLoading(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/employees/schedule`, {
        params: {
          branchId,
          startDate: mondayStr,
          endDate: sundayStr,
        },
      });

      if (res.data.success && res.data.data) {
        setBranchInfo(res.data.data.branchInfo);
        setEmployees(res.data.data.employees || []);
        setScheduleMap(res.data.data.scheduleMap || {});
      }
    } catch (err: any) {
      toast.error("Failed to load schedule matrix");
    } finally {
      setLoading(false);
    }
  }, [mondayStr, sundayStr]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Week Navigation Handlers
  const handlePrevWeek = () => {
    const [y, m, d] = mondayStr.split("-").map(Number);
    const prevMon = new Date(y, m - 1, d - 7);
    setMondayStr(dateToLocalStr(prevMon));
  };

  const handleNextWeek = () => {
    const [y, m, d] = mondayStr.split("-").map(Number);
    const nextMon = new Date(y, m - 1, d + 7);
    setMondayStr(dateToLocalStr(nextMon));
  };

  const handleTodayWeek = () => {
    setMondayStr(getMondayOfDate(getLocalTodayStr()));
  };

  // Copy Schedule from Previous Week
  const handleCopyPreviousWeek = async () => {
    const branchId = getBranchId();
    if (!branchId) return;

    if (
      !confirm(
        `Copy schedule from the previous week into Week ${weekNum} (${weekDates[0].dateDisplay} to ${weekDates[6].dateDisplay})?`,
      )
    ) {
      return;
    }

    setCopying(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/employees/schedule/copy-week`, {
        branchId,
        targetStartDate: mondayStr,
      });

      if (res.data.success) {
        toast.success(`Copied ${res.data.data.copiedCount} shift schedules!`);
        fetchSchedule();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to copy schedule");
    } finally {
      setCopying(false);
    }
  };

  // Print Noticeboard View
  const handlePrint = () => {
    window.print();
  };

  // Helper to format shift time text e.g. "9 to 16", "11 to 16:30", "16 to 01", "9 to 11, 16 to 20"
  const formatShiftTimeDisplay = (shifts?: ShiftSegment[]): string => {
    if (!shifts || shifts.length === 0) return "";
    return shifts
      .map((s) => {
        const start = s.startTime.replace(":00", "");
        const end = s.endTime.replace(":00", "");
        return `${start} to ${end}`;
      })
      .join(", ");
  };

  // Compute Employee Row Total Hours
  const getEmployeeRowTotal = (employeeId: string): number => {
    let total = 0;
    weekDates.forEach((d) => {
      const key = `${employeeId}_${d.dateStr}`;
      const entry = scheduleMap[key];
      if (entry && !entry.isOff && entry.totalHours) {
        total += entry.totalHours;
      }
    });
    return Math.round(total * 100) / 100;
  };

  // Compute Daily Column Total Hours across all employees
  const getDailyColumnTotal = (dateStr: string): number => {
    let total = 0;
    employees.forEach((emp) => {
      const key = `${emp._id}_${dateStr}`;
      const entry = scheduleMap[key];
      if (entry && !entry.isOff && entry.totalHours) {
        total += entry.totalHours;
      }
    });
    return Math.round(total * 100) / 100;
  };

  // Compute Grand Total Weekly Hours
  const grandTotalHours = useMemo(() => {
    let total = 0;
    employees.forEach((emp) => {
      total += getEmployeeRowTotal(emp._id);
    });
    return Math.round(total * 100) / 100;
  }, [employees, scheduleMap, weekDates]);

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans print:bg-white print:h-auto print:overflow-visible">
      {/* POS Navbar */}
      <div className="print:hidden">
        <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />
      </div>

      {/* POS Sidebar Drawer */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectTab={() => {}}
        activeTab="employee_schedule"
      />

      {/* Edge-to-Edge Top Control Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none print:hidden">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px] flex items-center gap-2">
            <span>Employee Schedule</span>
          </h1>
        </div>

        {/* Week Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Week Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 p-1 rounded-lg">
            <button
              onClick={handlePrevWeek}
              className="p-1 rounded hover:bg-neutral-200 text-neutral-700 transition-all cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>

            {(() => {
              const isCurrentWeek = mondayStr === getMondayOfDate(todayStr);
              return (
                <button
                  onClick={handleTodayWeek}
                  className={`px-2.5 py-1 text-xs rounded border transition-all cursor-pointer ${
                    isCurrentWeek
                      ? "bg-white text-neutral-800 font-800 border-neutral-200 hover:border-neutral-300 shadow-2xs"
                      : "bg-orange-50 hover:bg-orange-100 text-brand-primary font-800 border-orange-200"
                  }`}
                  title={
                    isCurrentWeek
                      ? "Currently viewing Current Week"
                      : "Click to jump to Current Week"
                  }
                >
                  {isCurrentWeek ? "Current Week" : "Jump to Current Week ↵"}
                </button>
              );
            })()}

            <span className="px-2 font-mono text-xs font-800 text-neutral-800">
              Week {weekNum} ({weekDates[0]?.dateDisplay} &ndash;{" "}
              {weekDates[6]?.dateDisplay})
            </span>

            <button
              onClick={handleNextWeek}
              className="p-1 rounded hover:bg-neutral-200 text-neutral-700 transition-all cursor-pointer"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchSchedule}
            disabled={loading}
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
            title="Refresh Schedule"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Copy Prev Week */}
          <button
            onClick={handleCopyPreviousWeek}
            disabled={copying}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-800 uppercase tracking-wide transition-all cursor-pointer"
          >
            <Copy size={14} />
            <span>{copying ? "Copying..." : "Copy Prev Week"}</span>
          </button>

          {/* Print Schedule */}
          {/* <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-[11px] font-800 uppercase tracking-wide transition-all cursor-pointer shadow-xs"
          >
            <Printer size={14} />
            <span>Print Schedule</span>
          </button> */}
        </div>
      </div>

      {/* Main Table Area (Edge-to-Edge Container) */}
      <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
          {/* Print Noticeboard Header (Visible ONLY on Print) */}
          <div className="hidden print:block text-center p-4 border-b-2 border-black">
            <h2 className="text-xl font-bold uppercase tracking-wide">
              {branchInfo?.locationStr || "PIZZAHUT (STORE SCHEDULE)"}
            </h2>
            <h3 className="text-base font-bold uppercase tracking-wider mt-1">
              SCHEDULE WEEK {weekNum} ({weekDates[0]?.dateDisplay} TO{" "}
              {weekDates[6]?.dateDisplay})
            </h3>
          </div>

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[500px]">
            <table className="w-full border-collapse text-center table-fixed border border-neutral-300 text-xs font-sans select-none">
              {/* Header Row: Dates & Days */}
              <thead className="bg-neutral-100 text-neutral-800 uppercase font-800 border-b border-neutral-300 sticky top-0 z-10 print:static print:bg-neutral-200">
                <tr className="border-b border-neutral-300">
                  <th className="w-36 lg:w-44 px-3 py-3 border-r border-neutral-300 text-left font-900 tracking-wider">
                    Employee
                  </th>
                  {weekDates.map((d) => (
                    <th
                      key={d.dateStr}
                      className="px-2 py-2 border-r border-neutral-300 text-center"
                    >
                      <div className="text-[11px] lg:text-xs font-900 text-neutral-900">
                        {d.dateDisplay}
                      </div>
                      <div className="text-[10px] lg:text-[11px] font-700 text-neutral-500 uppercase mt-0.5">
                        {d.dayShort}
                      </div>
                    </th>
                  ))}
                  <th className="w-24 px-3 py-3 font-900 text-center uppercase tracking-wider bg-neutral-200/80">
                    Total
                  </th>
                </tr>
              </thead>

              {/* Body Rows: Employee Matrix */}
              <tbody className="divide-y divide-neutral-300">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-neutral-400">
                        <div className="w-8 h-8 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                        <span className="text-xs font-700 text-neutral-500">
                          Loading employee schedule...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : employees.length > 0 ? (
                  employees.map((emp) => {
                    const rowTotal = getEmployeeRowTotal(emp._id);

                    return (
                      <tr
                        key={emp._id}
                        className="hover:bg-amber-50/20 border-b border-neutral-300 transition-colors bg-white print:hover:bg-transparent"
                      >
                        {/* Employee Info Cell */}
                        <td className="px-3 py-3 border-r border-neutral-300 text-left font-800 text-neutral-900 bg-neutral-50/50 print:bg-transparent">
                          <div className="font-800 text-xs lg:text-[13px] text-neutral-900 leading-tight flex items-center gap-1.5 flex-wrap">
                            <span>{emp.name}</span>
                            {emp.employeeId ? (
                              <span className="text-[10px] font-mono font-800 text-neutral-600 bg-neutral-200/80 px-1.5 py-0.2 rounded border border-neutral-300">
                                #{emp.employeeId}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[9.5px] lg:text-[10.5px] font-600 text-neutral-400 capitalize mt-0.5">
                            {emp.role}
                          </div>
                        </td>

                        {/* 7 Days Cells */}
                        {weekDates.map((d) => {
                          const key = `${emp._id}_${d.dateStr}`;
                          const entry = scheduleMap[key];

                          const isOff = entry?.isOff;
                          const shiftText = formatShiftTimeDisplay(
                            entry?.shifts,
                          );
                          const hours = entry?.totalHours || 0;

                          return (
                            <td
                              key={d.dateStr}
                              onClick={() => {
                                setSelectedCell({
                                  employee: emp,
                                  date: d.dateStr,
                                  dayLabel: `${d.dateDisplay} (${d.dayShort})`,
                                  initialSchedule: entry || null,
                                });
                              }}
                              className="px-2 py-3 border-r border-neutral-300 text-center cursor-pointer hover:bg-orange-50/60 transition-all relative group print:cursor-default"
                            >
                              {isOff ? (
                                <div className="py-1">
                                  <span className="text-[10px] font-800 text-neutral-400 uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 print:border-none">
                                    OFF
                                  </span>
                                </div>
                              ) : entry &&
                                entry.shifts &&
                                entry.shifts.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="font-700 text-[11px] lg:text-[12.5px] text-neutral-900 leading-tight font-mono">
                                    {shiftText}
                                  </div>
                                  <div className="font-800 text-[11px] text-neutral-700 font-mono">
                                    {hours.toFixed(hours % 1 === 0 ? 0 : 1)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-neutral-300 font-mono text-xs font-500 py-1">
                                  --
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Employee Row Weekly Total Hours */}
                        <td className="px-3 py-3 font-900 text-xs lg:text-[13px] text-neutral-900 font-mono bg-neutral-100/60 border-l border-neutral-300 text-center">
                          {rowTotal > 0
                            ? rowTotal.toFixed(rowTotal % 1 === 0 ? 0 : 1)
                            : "0"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-neutral-400 font-600 text-xs"
                    >
                      No active employees found for this branch.
                    </td>
                  </tr>
                )}

                {/* ── Summary Bottom Total Row ── */}
                <tr className="bg-neutral-100 font-900 border-t-2 border-neutral-400 text-neutral-900">
                  <td className="px-3 py-3 border-r border-neutral-300 text-left uppercase text-xs tracking-wider">
                    Total
                  </td>

                  {weekDates.map((d) => {
                    const colTotal = getDailyColumnTotal(d.dateStr);
                    return (
                      <td
                        key={`total_${d.dateStr}`}
                        className="px-2 py-3 border-r border-neutral-300 text-center font-mono text-xs lg:text-sm font-900"
                      >
                        {colTotal > 0
                          ? colTotal.toFixed(colTotal % 1 === 0 ? 0 : 1)
                          : "0"}
                      </td>
                    );
                  })}

                  {/* Grand Total Weekly Scheduled Hours */}
                  <td className="px-3 py-3 text-center font-mono text-sm lg:text-base font-900 text-neutral-900 bg-neutral-200/90">
                    {grandTotalHours.toFixed(grandTotalHours % 1 === 0 ? 0 : 1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Shift Modal */}
      {selectedCell && (
        <EditScheduleModal
          isOpen={Boolean(selectedCell)}
          onClose={() => setSelectedCell(null)}
          onSuccess={fetchSchedule}
          employee={selectedCell.employee}
          date={selectedCell.date}
          dayLabel={selectedCell.dayLabel}
          initialSchedule={selectedCell.initialSchedule}
        />
      )}
    </main>
  );
}
