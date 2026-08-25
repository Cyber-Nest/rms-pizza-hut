"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import CheckInOutModal from "./CheckInOutModal";
import {
  Clock,
  UserCheck,
  Coffee,
  LogOut,
  RefreshCw,
  Calendar,
  Shield,
  ChefHat,
  Truck,
  DollarSign,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface AttendanceRecord {
  employee: {
    _id: string;
    employeeId: string;
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  status: "checked-in" | "on-break" | "checked-out";
  shifts: Array<{
    checkIn: string;
    checkOut?: string;
    breaks: Array<{ breakIn: string; breakOut?: string }>;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
  }>;
}

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case "manager":
      return { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Manager" };
    case "chef":
      return { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "Chef" };
    case "driver":
      return { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Driver" };
    case "cashier":
      return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Cashier" };
    case "crew-member":
    default:
      return { bg: "bg-neutral-100 text-neutral-700 border-neutral-200", label: "Crew Member" };
  }
};

const formatTimeDisplay = (dateIso?: string) => {
  if (!dateIso) return "--:--";
  try {
    const d = new Date(dateIso);
    return d.toLocaleTimeString("en-US", {
      timeZone: "America/Edmonton",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "--:--";
  }
};

const formatMinutesToHours = (mins: number) => {
  if (!mins || mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default function CheckInOutView() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fetchAttendanceList = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/attendance`, {
        params: { branchId },
      });

      if (res.data.success && res.data.data) {
        setAttendanceData(res.data.data.records || []);
      }
    } catch (err: any) {
      console.error("Error fetching attendance list:", err);
      toast.error(err.response?.data?.message || "Failed to load today's attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceList();
  }, [fetchAttendanceList]);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
            <Clock size={20} />
          </div>
          <div>
            <h1 className="text-base font-900 text-neutral-900 tracking-tight">
              Staff Attendance & Check-In
            </h1>
            <p className="text-xs text-neutral-500 font-500">
              Today's shift tracking and break records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendanceList}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
            title="Refresh Attendance"
          >
            <RefreshCw size={15} />
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-900 hover:bg-brand-primary/90 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <UserCheck size={16} />
            <span>OPEN CHECK-IN TERMINAL</span>
          </button>
        </div>
      </div>

      {/* Attendance Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-800 uppercase tracking-wider text-neutral-400">Checked In (Working)</div>
            <div className="text-xl font-900 text-emerald-600">
              {attendanceData.filter((r) => r.status === "checked-in").length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-800 uppercase tracking-wider text-neutral-400">On Break</div>
            <div className="text-xl font-900 text-amber-600">
              {attendanceData.filter((r) => r.status === "on-break").length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coffee size={16} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-800 uppercase tracking-wider text-neutral-400">Not Checked In</div>
            <div className="text-xl font-900 text-neutral-500">
              {attendanceData.filter((r) => r.status === "checked-out").length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xs font-900 text-neutral-800 uppercase tracking-wider">
            Today's Staff Log
          </h2>
          <span className="text-[11px] font-600 text-neutral-500">
            {new Date().toLocaleDateString("en-US", { timeZone: "America/Edmonton", weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <div className="w-8 h-8 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            <span className="text-xs font-700 text-neutral-500">Loading today's staff logs...</span>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <User size={36} className="text-neutral-300 stroke-1" />
            <p className="text-xs font-700 text-neutral-600">No employee records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-[11px] font-800 uppercase tracking-wider text-neutral-500">
                  <th className="py-3.5 px-5">EMP ID</th>
                  <th className="py-3.5 px-5">Employee Name</th>
                  <th className="py-3.5 px-5">Role</th>
                  <th className="py-3.5 px-5">Current Status</th>
                  <th className="py-3.5 px-5">Check In Time</th>
                  <th className="py-3.5 px-5">Breaks Taken</th>
                  <th className="py-3.5 px-5">Check Out Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {attendanceData.map((record) => {
                  const emp = record.employee;
                  const roleBadge = getRoleBadgeStyle(emp.role);
                  const lastShift = record.shifts && record.shifts.length > 0 ? record.shifts[record.shifts.length - 1] : null;

                  return (
                    <tr key={emp._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-4 px-5 font-mono font-800 text-neutral-900">
                        <span className="bg-neutral-100 px-2.5 py-1 rounded-md text-neutral-700 border border-neutral-200">
                          {emp.employeeId}
                        </span>
                      </td>

                      <td className="py-4 px-5 font-800 text-neutral-900">
                        {emp.name}
                      </td>

                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-800 border ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        {record.status === "checked-in" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-900 text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Checked In
                          </span>
                        ) : record.status === "on-break" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-900 text-amber-700 bg-amber-50 border border-amber-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            On Break
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-700 text-neutral-500 bg-neutral-100 border border-neutral-200">
                            Checked Out
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 font-mono font-700 text-neutral-800">
                        {lastShift ? formatTimeDisplay(lastShift.checkIn) : "--:--"}
                      </td>

                      <td className="py-4 px-5 font-mono text-neutral-600">
                        {lastShift ? `${lastShift.breaks.length} breaks` : "0 breaks"}
                      </td>

                      <td className="py-4 px-5 font-mono font-700 text-neutral-800">
                        {lastShift && lastShift.checkOut ? formatTimeDisplay(lastShift.checkOut) : "--:--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check In / Out Modal */}
      <CheckInOutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAttendanceList}
      />
    </div>
  );
}
