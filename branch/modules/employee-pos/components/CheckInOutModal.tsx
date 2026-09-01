"use client";

import React, { useState } from "react";
import { X, Clock, KeyRound, UserCheck, Coffee, LogOut, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckInOutModal({
  isOpen,
  onClose,
  onSuccess,
}: CheckInOutModalProps) {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Step 2 State
  const [verifiedEmployee, setVerifiedEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const [overridePin, setOverridePin] = useState("");

  if (!isOpen) return null;

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

  const handleReset = () => {
    setEmployeeIdInput("");
    setPinInput("");
    setVerifiedEmployee(null);
    setTodayAttendance(null);
    setVerifying(false);
    setActionLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeIdInput.trim()) {
      toast.error("Please enter Employee ID");
      return;
    }

    if (!pinInput || !/^\d{4}$/.test(pinInput.trim())) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Branch session invalid. Please log in again.");
      return;
    }

    setVerifying(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/employees/verify-pin`, {
        branchId,
        employeeId: employeeIdInput.trim().toUpperCase(),
        pin: pinInput.trim(),
      }, { withCredentials: true });

      if (res.data.success) {
        setVerifiedEmployee(res.data.data.employee);
        setTodayAttendance(res.data.data.todayAttendance);
        toast.success(`Verified: ${res.data.data.employee.name}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Invalid credentials");
    } finally {
      setVerifying(false);
    }
  };

  const handleAttendanceAction = async (
    actionType: "check-in" | "break-in" | "break-out" | "check-out",
    mgrPin?: string
  ) => {
    const branchId = getBranchId();
    if (!branchId || !verifiedEmployee) return;

    setActionLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(`${apiUrl}/attendance/${actionType}`, {
        branchId,
        employeeId: verifiedEmployee._id,
        managerPin: mgrPin || overridePin || undefined,
      }, { withCredentials: true });

      if (res.data.success) {
        const actionLabels = {
          "check-in": "Checked In successfully! Have a great shift. 👍",
          "break-in": "Break started ☕",
          "break-out": "Break ended. Welcome back! 💼",
          "check-out": "Checked Out successfully! See you next time. 👋",
        };
        toast.success(actionLabels[actionType]);
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Action failed";
      if (msg.startsWith("NOT_SCHEDULED")) {
        setShowManagerOverride(true);
        toast.error("Not scheduled today. Manager PIN required to check in.");
      } else if (msg.startsWith("EARLY_CHECKIN")) {
        const cleanMsg = msg.replace("EARLY_CHECKIN: ", "");
        toast.error(cleanMsg, { duration: 5000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleClose} />
      
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-900 tracking-wide text-white">
                Check-In / Out Terminal
              </h3>
              <p className="text-[11px] lg:text-xs text-neutral-400 font-500">
                Staff Shift & Break Portal
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* STEP 1: Enter Employee ID & PIN */}
        {!verifiedEmployee ? (
          <form onSubmit={handleVerify} className="p-6 space-y-4">
            {/* Employee ID */}
            <div className="space-y-1">
              <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 001"
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs lg:text-sm font-mono font-800 text-neutral-900 tracking-wider focus:outline-none focus:border-brand-primary focus:bg-white transition-all uppercase"
                />
                <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            {/* 4-Digit PIN */}
            <div className="space-y-1">
              <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                4-Digit PIN <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono font-900 text-neutral-900 tracking-[0.3em] focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                />
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Keypad Buttons for easy touch input */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 select-none">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === "C") {
                      setPinInput("");
                    } else if (btn === "⌫") {
                      setPinInput(prev => prev.slice(0, -1));
                    } else if (pinInput.length < 4) {
                      setPinInput(prev => prev + btn);
                    }
                  }}
                  className={`py-2 rounded-xl text-xs font-800 transition-all cursor-pointer ${
                    btn === "C"
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : btn === "⌫"
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-95"
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-xl bg-brand-primary text-white text-xs font-800 hover:bg-brand-primary/90 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>VERIFY CREDENTIALS</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Display Verified Employee & Action Buttons */
          <div className="p-6 space-y-5">
            {/* Employee Info Card */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-900 text-neutral-900">{verifiedEmployee.name}</div>
                <div className="text-[10.5px] font-mono font-700 text-neutral-500 mt-0.5">
                  ID: {verifiedEmployee.employeeId} • <span className="uppercase text-brand-primary">{verifiedEmployee.role}</span>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-[10px] font-700 text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
              >
                Change User
              </button>
            </div>

            {/* Current Shift Status */}
            <div className="text-center py-2 space-y-1">
              <div className="text-[10px] font-800 uppercase tracking-widest text-neutral-400">Current Status</div>
              {todayAttendance?.status === "checked-in" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-900 text-emerald-700 bg-emerald-100 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Checked In (Working)
                </span>
              ) : todayAttendance?.status === "on-break" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-900 text-amber-700 bg-amber-100 border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  On Break ☕
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-900 text-neutral-600 bg-neutral-100 border border-neutral-300">
                  Not Checked In
                </span>
              )}
            </div>

            {/* Dynamic Actions Based on Current Status */}
            <div className="space-y-2.5 pt-1">
              {showManagerOverride && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-800 text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <KeyRound size={14} className="text-amber-600" />
                      Require Manager Approval
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManagerOverride(false)}
                      className="text-[10px] text-amber-700 font-700 underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10.5px] text-amber-800 font-550">
                    Employee is not scheduled today. Enter Manager PIN to approve check-in.
                  </p>
                  <input
                    type="password"
                    maxLength={4}
                    value={overridePin}
                    onChange={(e) => setOverridePin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Enter Manager PIN (••••)"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-800 text-neutral-900 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAttendanceAction("check-in", overridePin)}
                    disabled={actionLoading || overridePin.length < 4}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-800 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Approve Check-In (Override)
                  </button>
                </div>
              )}

              {todayAttendance?.status === "checked-out" || !todayAttendance?.status ? (
                /* ACTION: CHECK IN */
                <button
                  onClick={() => handleAttendanceAction("check-in")}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-900 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <UserCheck size={16} />
                  <span>CHECK IN (START SHIFT)</span>
                </button>
              ) : todayAttendance?.status === "checked-in" ? (
                /* ACTIONS: BREAK IN & CHECK OUT */
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleAttendanceAction("break-in")}
                    disabled={actionLoading}
                    className="py-3 rounded-xl bg-amber-500 text-neutral-900 text-xs font-900 hover:bg-amber-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Coffee size={15} />
                    <span>BREAK IN</span>
                  </button>

                  <button
                    onClick={() => handleAttendanceAction("check-out")}
                    disabled={actionLoading}
                    className="py-3 rounded-xl bg-red-600 text-white text-xs font-900 hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <LogOut size={15} />
                    <span>CHECK OUT</span>
                  </button>
                </div>
              ) : todayAttendance?.status === "on-break" ? (
                /* ACTION: BREAK OUT */
                <button
                  onClick={() => handleAttendanceAction("break-out")}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-amber-600 text-white text-xs font-900 hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <Coffee size={16} />
                  <span>BREAK OUT (RESUME WORK)</span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
