"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { X, Clock, Plus, Trash2, Save, AlertCircle, LogOut } from "lucide-react";

interface BreakItem {
  breakInTime: string; // HH:mm (24hr)
  breakOutTime: string; // HH:mm (24hr)
}

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  row: {
    attendanceId: string;
    shiftId: string;
    employeeName: string;
    employeeId: string;
    date: string;
    dateDayStr: string;
    startTime: string;
    endTime: string;
    rawCheckIn?: string;
    rawCheckOut?: string;
    rawBreaks?: Array<{ breakIn: string; breakOut: string }>;
    status: string;
  } | null;
}

export default function EditShiftModal({
  isOpen,
  onClose,
  onSuccess,
  row,
}: EditShiftModalProps) {
  const [loading, setLoading] = useState(false);

  // Form State in 24-hour HH:mm format
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [breaksList, setBreaksList] = useState<BreakItem[]>([]);

  // Convert ISO date string or 24hr/12hr time to "HH:mm"
  const formatIsoToHHMM = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }
      // If it's already HH:mm or HH:mm AM/PM
      if (typeof dateStr === "string" && dateStr.includes(":")) {
        const parts = dateStr.trim().split(" ");
        const timeParts = parts[0].split(":");
        let hh = parseInt(timeParts[0], 10);
        const mm = String(timeParts[1]).padStart(2, "0");
        if (parts[1] && parts[1].toUpperCase() === "PM" && hh < 12) hh += 12;
        if (parts[1] && parts[1].toUpperCase() === "AM" && hh === 12) hh = 0;
        return `${String(hh).padStart(2, "0")}:${mm}`;
      }
      return "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (row) {
      const inStr = formatIsoToHHMM(row.rawCheckIn || row.startTime);
      const outStr = formatIsoToHHMM(row.rawCheckOut || (row.endTime !== "Working..." ? row.endTime : ""));
      
      setCheckInTime(inStr || "09:00");
      setCheckOutTime(outStr);
      setIsShiftActive(!outStr || row.endTime === "Working...");

      // Convert raw breaks
      if (Array.isArray(row.rawBreaks) && row.rawBreaks.length > 0) {
        setBreaksList(
          row.rawBreaks.map((b) => ({
            breakInTime: formatIsoToHHMM(b.breakIn),
            breakOutTime: formatIsoToHHMM(b.breakOut),
          }))
        );
      } else {
        setBreaksList([]);
      }
    }
  }, [row]);

  if (!isOpen || !row) return null;

  // Quick Check-Out Action at Current Time
  const handleForceCheckoutNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setCheckOutTime(`${hh}:${mm}`);
    setIsShiftActive(false);
    toast.success(`Check-out time set to current time (${hh}:${mm}). Click "Save Shift Edits" to confirm!`);
  };

  // Add a new empty break row
  const handleAddBreak = () => {
    setBreaksList([...breaksList, { breakInTime: "12:00", breakOutTime: "12:30" }]);
  };

  // Remove a break row
  const handleRemoveBreak = (index: number) => {
    setBreaksList(breaksList.filter((_, i) => i !== index));
  };

  // Update break row time
  const handleUpdateBreak = (index: number, field: "breakInTime" | "breakOutTime", val: string) => {
    const updated = [...breaksList];
    updated[index][field] = val;
    setBreaksList(updated);
  };

  // Calculate live preview totals
  const calculateTotalsPreview = () => {
    if (!checkInTime) return { grossHrs: "0.00", breakHrs: "0.00", payableHrs: "0.00" };

    const baseDate = row.date || "2026-08-28";
    const [inH, inM] = checkInTime.split(":").map(Number);
    const startMs = new Date(`${baseDate}T${String(inH || 0).padStart(2, "0")}:${String(inM || 0).padStart(2, "0")}:00`).getTime();

    let endMs = Date.now();
    if (!isShiftActive && checkOutTime) {
      const [outH, outM] = checkOutTime.split(":").map(Number);
      endMs = new Date(`${baseDate}T${String(outH || 0).padStart(2, "0")}:${String(outM || 0).padStart(2, "0")}:00`).getTime();
    }

    const grossDiffMins = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
    const grossHrs = (grossDiffMins / 60).toFixed(2);

    let totalBreakMins = 0;
    breaksList.forEach((b) => {
      if (b.breakInTime && b.breakOutTime) {
        const [bInH, bInM] = b.breakInTime.split(":").map(Number);
        const [bOutH, bOutM] = b.breakOutTime.split(":").map(Number);
        const bInMs = new Date(`${baseDate}T${String(bInH || 0).padStart(2, "0")}:${String(bInM || 0).padStart(2, "0")}:00`).getTime();
        const bOutMs = new Date(`${baseDate}T${String(bOutH || 0).padStart(2, "0")}:${String(bOutM || 0).padStart(2, "0")}:00`).getTime();
        const bMins = Math.max(0, Math.round((bOutMs - bInMs) / (1000 * 60)));
        totalBreakMins += bMins;
      }
    });

    const breakHrs = (totalBreakMins / 60).toFixed(2);
    const netMins = Math.max(0, grossDiffMins - totalBreakMins);
    const payableHrs = (netMins / 60).toFixed(2);

    return { grossHrs, breakHrs, payableHrs };
  };

  const preview = calculateTotalsPreview();

  // Save Shift Edits
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInTime) {
      toast.error("Please enter a valid Check-In Time!");
      return;
    }

    const baseDate = row.date;
    const checkInIso = new Date(`${baseDate}T${checkInTime}:00`).toISOString();
    const checkOutIso = !isShiftActive && checkOutTime ? new Date(`${baseDate}T${checkOutTime}:00`).toISOString() : null;

    const formattedBreaks = breaksList.map((b) => ({
      breakIn: new Date(`${baseDate}T${b.breakInTime}:00`).toISOString(),
      breakOut: b.breakOutTime ? new Date(`${baseDate}T${b.breakOutTime}:00`).toISOString() : null,
    }));

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.put(`${apiUrl}/attendance/shift/edit`, {
        attendanceId: row.attendanceId,
        shiftId: row.shiftId,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        breaks: formattedBreaks,
      });

      if (res.data.success) {
        toast.success("Shift log updated successfully!");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error("Error editing shift log:", err);
      toast.error(err.response?.data?.message || "Failed to update shift log");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-[#e31837] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock size={18} />
            <div>
              <h2 className="text-sm font-900 uppercase tracking-wider">
                Edit Shift Log
              </h2>
              <p className="text-[11px] text-white/80 font-600">
                {row.employeeName} ({row.employeeId}) • {row.dateDayStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Quick Check-Out Button */}
            {isShiftActive && (
              <button
                type="button"
                onClick={handleForceCheckoutNow}
                className="px-3 py-1.5 bg-white text-[#e31837] hover:bg-neutral-100 rounded-lg text-[11px] font-900 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 uppercase tracking-wide"
                title="Check-out employee at current time"
              >
                <LogOut size={13} />
                <span>Check-Out Now</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          
          {/* Active Shift Top Warning & Quick Action Button */}
          {isShiftActive && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3 text-red-900">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[11px] font-800 uppercase text-red-950">Employee Currently Working</div>
                  <div className="text-[10px] text-red-700 font-500">
                    Click "Check-Out Now" to log end time as current time.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleForceCheckoutNow}
                className="px-3 py-1.5 bg-[#e31837] hover:bg-[#b9142d] text-white rounded-lg text-[11px] font-800 flex items-center gap-1 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
              >
                <LogOut size={12} />
                <span>Check-Out Now</span>
              </button>
            </div>
          )}

          {/* Shift Check-In & Check-Out Times */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <h4 className="text-[11px] font-800 uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <Clock size={13} className="text-[#e31837]" /> Shift Duration
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Check-In */}
              <div>
                <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
                  Start Time (Check-In)
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono font-700 text-neutral-800 focus:outline-none focus:border-[#e31837]"
                  required
                />
              </div>

              {/* Check-Out */}
              <div>
                <label className="text-[10px] font-800 text-neutral-500 uppercase block mb-1">
                  End Time (Check-Out)
                </label>
                <input
                  type="time"
                  disabled={isShiftActive}
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-mono font-700 focus:outline-none ${
                    isShiftActive
                      ? "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed"
                      : "bg-white border-neutral-300 text-neutral-800 focus:border-[#e31837]"
                  }`}
                />
              </div>
            </div>

            {/* Shift Active Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="shiftActiveCheck"
                checked={isShiftActive}
                onChange={(e) => {
                  setIsShiftActive(e.target.checked);
                  if (e.target.checked) setCheckOutTime("");
                }}
                className="w-4 h-4 text-[#e31837] border-neutral-300 rounded focus:ring-[#e31837] cursor-pointer"
              />
              <label htmlFor="shiftActiveCheck" className="text-[11px] font-700 text-neutral-700 cursor-pointer">
                Shift is currently active (Working...)
              </label>
            </div>
          </div>

          {/* Breaks Section */}
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
                No breaks recorded for this shift. Click "+ Add Break" if employee took a break.
              </div>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {breaksList.map((b, bIdx) => (
                  <div
                    key={`edit-break-${bIdx}`}
                    className="flex items-center gap-2 bg-white p-2 rounded-lg border border-neutral-200"
                  >
                    <span className="text-[10px] font-800 text-neutral-500 uppercase w-14 shrink-0">
                      Break {bIdx + 1}:
                    </span>

                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="time"
                        value={b.breakInTime}
                        onChange={(e) => handleUpdateBreak(bIdx, "breakInTime", e.target.value)}
                        className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-[11px] font-mono font-700 text-neutral-800 w-full focus:outline-none focus:border-[#e31837]"
                      />
                      <span className="text-neutral-400 text-[10px] font-bold">to</span>
                      <input
                        type="time"
                        value={b.breakOutTime}
                        onChange={(e) => handleUpdateBreak(bIdx, "breakOutTime", e.target.value)}
                        className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-[11px] font-mono font-700 text-neutral-800 w-full focus:outline-none focus:border-[#e31837]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBreak(bIdx)}
                      className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove break"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculated Totals Live Preview Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-950">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <div>
                <div className="text-[10px] font-800 uppercase text-amber-800">Recalculated Summary</div>
                <div className="text-[11px] font-700 text-amber-900 mt-0.5">
                  Shift: <strong>{preview.grossHrs} hrs</strong> | Breaks: <strong>{preview.breakHrs} hrs</strong>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9.5px] font-900 uppercase text-amber-800">Payable Hours</div>
              <div className="text-sm font-900 font-mono text-amber-950">
                {preview.payableHrs} hrs
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
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
              <span>{loading ? "Saving..." : "Save Shift Edits"}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
