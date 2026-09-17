"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { X, Plus, Trash2, Clock, Calendar, Check, Save } from "lucide-react";

interface ShiftSegmentInput {
  startTime: string;
  endTime: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: {
    _id: string;
    employeeId: string;
    name: string;
    role: string;
  } | null;
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "24-Aug (Mon)"
  initialSchedule?: {
    isOff?: boolean;
    shifts?: Array<{ startTime: string; endTime: string; hours: number }>;
    notes?: string;
  } | null;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  if (str.includes(":")) {
    const [h, m] = str.split(":");
    return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
  }
  const h = parseFloat(str) || 0;
  return Math.round(h * 60);
}

function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const startMins = parseTimeToMinutes(startTime);
  let endMins = parseTimeToMinutes(endTime);

  if (endMins <= startMins) {
    endMins += 1440; // Overnight shift
  }

  const diffMins = endMins - startMins;
  return Math.round((diffMins / 60) * 100) / 100;
}

/**
 * Validate that a time string is a valid 24H time.
 * Accepts: "9", "09", "9:00", "09:00", "16:30", "23:59"
 * Rejects: "28:00", "09:88", "abc", "25"
 */
function isValidTime(val: string): boolean {
  if (!val || !val.trim()) return false;
  const str = val.trim();

  if (str.includes(":")) {
    const parts = str.split(":");
    if (parts.length !== 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  } else {
    // Plain number like "9" or "16"
    const h = parseFloat(str);
    if (isNaN(h)) return false;
    return h >= 0 && h <= 23 && Number.isInteger(h);
  }
}

/**
 * Auto-format time on blur:
 * "9" → "09:00", "16" → "16:00", "9:5" → "09:05"
 */
function autoFormatTime(val: string): string {
  if (!val || !val.trim()) return val;
  const str = val.trim();

  if (str.includes(":")) {
    const [hPart, mPart] = str.split(":");
    const h = parseInt(hPart, 10);
    const m = parseInt(mPart, 10);
    if (isNaN(h) || isNaN(m)) return str;
    if (h > 23 || m > 59) return str; // Let validation show error
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } else {
    const h = parseInt(str, 10);
    if (isNaN(h) || h > 23) return str;
    return `${String(h).padStart(2, "0")}:00`;
  }
}

export default function EditScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  employee,
  date,
  dayLabel,
  initialSchedule,
}: Props) {
  const [isOff, setIsOff] = useState(false);
  const [shifts, setShifts] = useState<ShiftSegmentInput[]>([
    { startTime: "09:00", endTime: "16:00" },
  ]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialSchedule) {
        setIsOff(!!initialSchedule.isOff);
        setNotes(initialSchedule.notes || "");
        if (
          initialSchedule.shifts &&
          initialSchedule.shifts.length > 0 &&
          !initialSchedule.isOff
        ) {
          setShifts(
            initialSchedule.shifts.map((s) => ({
              startTime: s.startTime || "09:00",
              endTime: s.endTime || "16:00",
            }))
          );
        } else {
          setShifts([{ startTime: "09:00", endTime: "16:00" }]);
        }
      } else {
        setIsOff(false);
        setNotes("");
        setShifts([{ startTime: "09:00", endTime: "16:00" }]);
      }
    }
  }, [isOpen, initialSchedule]);

  if (!isOpen || !employee) return null;

  const handleAddShiftSegment = () => {
    setShifts((prev) => [...prev, { startTime: "17:00", endTime: "21:00" }]);
  };

  const handleRemoveShiftSegment = (index: number) => {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShiftChange = (
    index: number,
    field: "startTime" | "endTime",
    val: string
  ) => {
    setShifts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleShiftBlur = (index: number, field: "startTime" | "endTime", val: string) => {
    const formatted = autoFormatTime(val);
    setShifts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: formatted };
      return copy;
    });
  };

  // Check if any shift has invalid times
  const hasInvalidTimes = !isOff && shifts.some(
    (s) => !isValidTime(s.startTime) || !isValidTime(s.endTime)
  );

  // Calculate total scheduled hours live
  const totalHours = isOff
    ? 0
    : shifts.reduce(
        (sum, s) => sum + calculateHours(s.startTime, s.endTime),
        0
      );

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

  const handleSave = async () => {
    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Branch ID not found. Please log in again.");
      return;
    }

    // Validate all shift times before saving
    if (hasInvalidTimes) {
      toast.error("Please fix invalid shift times before saving. Use 24H format (e.g. 09:00, 16:30, 23:00)");
      return;
    }

    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/employees/schedule`, {
        branchId,
        employeeId: employee._id,
        date,
        isOff,
        shifts: isOff ? [] : shifts,
        notes,
      });

      if (res.data.success) {
        toast.success(`Schedule saved for ${employee.name}`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleClearShift = async () => {
    const branchId = getBranchId();
    if (!branchId) return;

    if (!confirm(`Clear shift schedule for ${employee.name} on ${dayLabel}?`)) {
      return;
    }

    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      await axios.delete(`${apiUrl}/employees/schedule`, {
        params: { branchId, employeeId: employee._id, date },
      });
      toast.success("Shift schedule cleared");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to clear schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-orange-400 font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-800 tracking-wide uppercase">
                Edit Shift Schedule
              </h3>
              <p className="text-[11px] text-neutral-300 font-550">
                {employee.name} {employee.employeeId ? `(#${employee.employeeId})` : ""} &bull; <span className="capitalize">{employee.role}</span> &bull; <span className="text-amber-300 font-700">{dayLabel}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-neutral-300 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Day OFF Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <div>
              <p className="text-xs font-800 text-neutral-800">Day Off / Holiday</p>
              <p className="text-[10px] text-neutral-500 font-500">
                Mark employee as OFF for this day
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isOff}
                onChange={(e) => setIsOff(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          {/* Shift Segments (If not OFF) */}
          {!isOff && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-800 text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-brand-primary" />
                  <span>Shift Times & Duration</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddShiftSegment}
                  className="text-[11px] font-750 text-brand-primary hover:text-brand-primary-dark inline-flex items-center gap-1 cursor-pointer bg-orange-50 hover:bg-orange-100/80 px-2.5 py-1 rounded-lg border border-orange-200 transition-all"
                >
                  <Plus size={12} />
                  <span>Add Split Shift</span>
                </button>
              </div>

              {shifts.map((shift, idx) => {
                const segHours = calculateHours(shift.startTime, shift.endTime);
                const startInvalid = shift.startTime && !isValidTime(shift.startTime);
                const endInvalid = shift.endTime && !isValidTime(shift.endTime);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50/80 border border-neutral-200 rounded-xl space-y-2 relative"
                  >
                    {shifts.length > 1 && (
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 mb-1.5">
                        <span className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">
                          Shift Segment #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveShiftSegment(idx)}
                          className="text-red-600 hover:text-red-700 text-[10px] font-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Remove</span>
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-700 text-neutral-500 uppercase mb-1">
                          Start Time (24h or HH:mm)
                        </label>
                        <input
                          type="text"
                          value={shift.startTime}
                          onChange={(e) =>
                            handleShiftChange(idx, "startTime", e.target.value)
                          }
                          onBlur={(e) =>
                            handleShiftBlur(idx, "startTime", e.target.value)
                          }
                          placeholder="e.g. 09:00 or 9"
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-700 text-neutral-900 focus:ring-2 outline-none transition-all ${
                            startInvalid
                              ? "border-red-400 bg-red-50/40 focus:ring-red-200 focus:border-red-500"
                              : "border-neutral-200 hover:border-neutral-300 focus:ring-brand-primary/20 focus:border-brand-primary"
                          }`}
                        />
                        {startInvalid && (
                          <p className="text-[10px] text-red-500 font-700 mt-1">⚠ Invalid time (0–23 hrs, 0–59 min)</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-700 text-neutral-500 uppercase mb-1">
                          End Time (24h or HH:mm)
                        </label>
                        <input
                          type="text"
                          value={shift.endTime}
                          onChange={(e) =>
                            handleShiftChange(idx, "endTime", e.target.value)
                          }
                          onBlur={(e) =>
                            handleShiftBlur(idx, "endTime", e.target.value)
                          }
                          placeholder="e.g. 16:00 or 16"
                          className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-700 text-neutral-900 focus:ring-2 outline-none transition-all ${
                            endInvalid
                              ? "border-red-400 bg-red-50/40 focus:ring-red-200 focus:border-red-500"
                              : "border-neutral-200 hover:border-neutral-300 focus:ring-brand-primary/20 focus:border-brand-primary"
                          }`}
                        />
                        {endInvalid && (
                          <p className="text-[10px] text-red-500 font-700 mt-1">⚠ Invalid time (0–23 hrs, 0–59 min)</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10.5px] font-750 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded">
                        Duration: {segHours.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-800 text-neutral-700 uppercase tracking-wider mb-1.5">
              Shift Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Opening shift, Training, Delivery duty"
              className="w-full px-3 py-2 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-600 text-neutral-900 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
            />
          </div>

          {/* Total Scheduled Summary */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-center justify-between">
            <span className="text-xs font-800 text-amber-900">
              Total Scheduled Shift Hours:
            </span>
            <span className="text-sm font-900 text-amber-800 font-mono">
              {totalHours.toFixed(1)} hrs
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3">
          {initialSchedule ? (
            <button
              type="button"
              onClick={handleClearShift}
              disabled={saving}
              className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-750 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>Clear Shift</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-750 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || hasInvalidTimes}
              className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-800 transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              <span>{saving ? "Saving..." : "Save Shift"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
