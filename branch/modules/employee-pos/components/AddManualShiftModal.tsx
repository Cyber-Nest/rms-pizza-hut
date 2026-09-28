"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  X,
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { getLocalTodayStr } from "../utils/timezone";

interface EmployeeItem {
  _id: string;
  employeeId: string;
  name: string;
  role: string;
}

interface BreakItem {
  breakInTime: string; // HH:mm
  breakOutTime: string; // HH:mm
}

interface AddManualShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeesList: EmployeeItem[];
  defaultEmployeeId?: string;
}

export default function AddManualShiftModal({
  isOpen,
  onClose,
  onSuccess,
  employeesList,
  defaultEmployeeId,
}: AddManualShiftModalProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [employeeId, setEmployeeId] = useState("");
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const todayStr = getLocalTodayStr();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breaksList, setBreaksList] = useState<BreakItem[]>([]);
  const [notes, setNotes] = useState("Manual Entry by Branch Admin");

  const filteredEmployeesList = useMemo(() => {
    return (employeesList || []).filter(
      (emp) => emp.role && emp.role.toLowerCase() !== "driver"
    );
  }, [employeesList]);

  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined") {
        const activeRaw = localStorage.getItem("rms_active_employee");
        if (activeRaw) {
          toast.error("Access Restricted: Only Branch Admin can manually add shift logs.");
          onClose();
          return;
        }
      }
      if (defaultEmployeeId) {
        setEmployeeId(defaultEmployeeId);
      } else if (filteredEmployeesList.length > 0) {
        setEmployeeId(filteredEmployeesList[0]._id);
      }
      const t = getLocalTodayStr();
      setStartDate(t);
      setEndDate(t);
      setStartTime("09:00");
      setEndTime("17:00");
      setBreaksList([]);
      setNotes("Manual Entry by Branch Admin");
    }
  }, [isOpen, defaultEmployeeId, filteredEmployeesList, onClose]);


  if (!isOpen) return null;

  const handleAddBreak = () => {
    setBreaksList([
      ...breaksList,
      { breakInTime: "12:00", breakOutTime: "12:30" },
    ]);
  };

  const handleRemoveBreak = (index: number) => {
    setBreaksList(breaksList.filter((_, i) => i !== index));
  };

  const handleUpdateBreak = (
    index: number,
    field: "breakInTime" | "breakOutTime",
    val: string
  ) => {
    const updated = [...breaksList];
    updated[index][field] = val;
    setBreaksList(updated);
  };

  // Preview Totals Calculation (Per day)
  const calculateTotalsPreview = () => {
    if (!startTime || !endTime) {
      return { grossHrs: "0.00", breakHrs: "0.00", payableHrs: "0.00", daysCount: 1 };
    }

    const baseDate = "2026-09-28";
    const [inH, inM] = startTime.split(":").map(Number);
    const startMs = new Date(
      `${baseDate}T${String(inH || 0).padStart(2, "0")}:${String(inM || 0).padStart(2, "0")}:00`
    ).getTime();

    const [outH, outM] = endTime.split(":").map(Number);
    let endMs = new Date(
      `${baseDate}T${String(outH || 0).padStart(2, "0")}:${String(outM || 0).padStart(2, "0")}:00`
    ).getTime();

    // Overnight shift check
    if (endMs <= startMs) {
      endMs += 24 * 60 * 60 * 1000;
    }

    const grossDiffMins = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
    const grossHrs = (grossDiffMins / 60).toFixed(2);

    let totalBreakMins = 0;
    breaksList.forEach((b) => {
      if (b.breakInTime && b.breakOutTime) {
        const [bInH, bInM] = b.breakInTime.split(":").map(Number);
        const [bOutH, bOutM] = b.breakOutTime.split(":").map(Number);
        const bInMs = new Date(
          `${baseDate}T${String(bInH || 0).padStart(2, "0")}:${String(bInM || 0).padStart(2, "0")}:00`
        ).getTime();
        let bOutMs = new Date(
          `${baseDate}T${String(bOutH || 0).padStart(2, "0")}:${String(bOutM || 0).padStart(2, "0")}:00`
        ).getTime();
        if (bOutMs < bInMs) bOutMs += 24 * 60 * 60 * 1000;
        const bMins = Math.max(0, Math.round((bOutMs - bInMs) / (1000 * 60)));
        totalBreakMins += bMins;
      }
    });

    const breakHrs = (totalBreakMins / 60).toFixed(2);
    const netMins = Math.max(0, grossDiffMins - totalBreakMins);
    const payableHrs = (netMins / 60).toFixed(2);

    let daysCount = 1;
    if (dateMode === "range" && startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = d2.getTime() - d1.getTime();
      if (diffTime >= 0) {
        daysCount = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    return { grossHrs, breakHrs, payableHrs, daysCount };
  };

  const preview = calculateTotalsPreview();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee!");
      return;
    }
    if (!startDate) {
      toast.error("Please select start date!");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Please select both Start Time and End Time!");
      return;
    }

    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Branch session not found!");
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const payload = {
        branchId,
        employeeId,
        startDate,
        endDate: dateMode === "range" ? endDate : startDate,
        startTime,
        endTime,
        breaks: breaksList,
        notes,
      };

      const res = await axios.post(`${apiUrl}/attendance/shift/manual`, payload);

      if (res.data.success) {
        toast.success(`Manual shift log(s) added for ${preview.daysCount} day(s)!`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error("Error adding manual shift:", err);
      toast.error(err.response?.data?.message || "Failed to add manual shift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-[#e31837] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Plus className="w-5 h-5 bg-white/20 p-0.5 rounded-full" />
            <div>
              <h2 className="text-sm font-900 uppercase tracking-wider">
                Add Manual Shift Log
              </h2>
              <p className="text-[11px] text-white/80 font-600">
                Log shift entry manually for 1 day or multi-days (Alberta Timezone)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          
          {/* Employee Selection */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
            <label className="text-[11px] font-800 uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <User size={13} className="text-[#e31837]" /> Select Employee
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-700 text-neutral-800 focus:outline-none focus:border-[#e31837] cursor-pointer"
              required
            >
              <option value="">-- Choose Employee --</option>
              {filteredEmployeesList.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId}) • {emp.role.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection: Single Day vs Date Range */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-800 uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#e31837]" /> Select Date / Range
              </label>

              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-1 bg-neutral-200/80 p-0.5 rounded-lg text-[10.5px] font-800">
                <button
                  type="button"
                  onClick={() => {
                    setDateMode("single");
                    setEndDate(startDate);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    dateMode === "single"
                      ? "bg-[#e31837] text-white shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode("range")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    dateMode === "range"
                      ? "bg-[#e31837] text-white shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Multi-Day Range
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
                  {dateMode === "single" ? "Date" : "Start Date"}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (dateMode === "single") setEndDate(e.target.value);
                  }}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono font-700 text-neutral-800 focus:outline-none focus:border-[#e31837]"
                  required
                />
              </div>

              {dateMode === "range" && (
                <div>
                  <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono font-700 text-neutral-800 focus:outline-none focus:border-[#e31837]"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Shift Start & End Times */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <h4 className="text-[11px] font-800 uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <Clock size={13} className="text-[#e31837]" /> Shift Timings (Alberta Time)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
                  Start Time (Check-In)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono font-700 text-neutral-800 focus:outline-none focus:border-[#e31837]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
                  End Time (Check-Out)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono font-700 text-neutral-800 focus:outline-none focus:border-[#e31837]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Breaks Section */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                Breaks Recorded ({breaksList.length})
              </h4>
              <button
                type="button"
                onClick={handleAddBreak}
                className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-[#e31837] border border-[#e31837]/30 rounded-lg text-[10.5px] font-800 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Break
              </button>
            </div>

            {breaksList.length === 0 ? (
              <div className="text-[11px] text-neutral-400 italic text-center py-2 bg-white rounded-lg border border-dashed border-neutral-200">
                No breaks added. Click "+ Add Break" if employee took a break.
              </div>
            ) : (
              <div className="space-y-2 max-h-[130px] overflow-y-auto pr-1">
                {breaksList.map((b, bIdx) => (
                  <div
                    key={`manual-break-${bIdx}`}
                    className="flex items-center gap-2 bg-white p-2 rounded-lg border border-neutral-200"
                  >
                    <span className="text-[10px] font-800 text-neutral-500 uppercase w-14 shrink-0">
                      Break {bIdx + 1}:
                    </span>

                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="time"
                        value={b.breakInTime}
                        onChange={(e) =>
                          handleUpdateBreak(bIdx, "breakInTime", e.target.value)
                        }
                        className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-[11px] font-mono font-700 text-neutral-800 w-full focus:outline-none focus:border-[#e31837]"
                      />
                      <span className="text-neutral-400 text-[10px] font-bold">to</span>
                      <input
                        type="time"
                        value={b.breakOutTime}
                        onChange={(e) =>
                          handleUpdateBreak(bIdx, "breakOutTime", e.target.value)
                        }
                        className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-[11px] font-mono font-700 text-neutral-800 w-full focus:outline-none focus:border-[#e31837]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBreak(bIdx)}
                      className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
              Notes / Reason (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Manual shift entry by admin"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-500 text-neutral-800 focus:outline-none focus:border-[#e31837]"
            />
          </div>

          {/* Live Summary Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-950">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <div>
                <div className="text-[10px] font-800 uppercase text-amber-800">
                  Calculated Summary ({preview.daysCount} day{preview.daysCount > 1 ? "s" : ""})
                </div>
                <div className="text-[11px] font-700 text-amber-900 mt-0.5">
                  Shift: <strong>{preview.grossHrs} hrs/day</strong> | Break:{" "}
                  <strong>{preview.breakHrs} hrs/day</strong>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9.5px] font-900 uppercase text-amber-800">
                Payable / Day
              </div>
              <div className="text-sm font-900 font-mono text-amber-950">
                {preview.payableHrs} hrs
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-800 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#e31837] hover:bg-[#b9142d] text-white font-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{loading ? "Saving Shift..." : `Add Manual Shift (${preview.daysCount} Day${preview.daysCount > 1 ? "s" : ""})`}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
