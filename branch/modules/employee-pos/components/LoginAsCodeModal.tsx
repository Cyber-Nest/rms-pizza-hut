'use client';

import React, { useState } from "react";
import { X, KeyRound, UserCheck, Eye, EyeOff, ShieldCheck, LogOut, CheckCircle2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface LoginAsCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginAsCodeModal({
  isOpen,
  onClose,
  onSuccess,
}: LoginAsCodeModalProps) {
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
    setVerifying(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleVerifyAndLogin = async (e: React.FormEvent) => {
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
      const res = await axios.post(`${apiUrl}/employees/login-code`, {
        branchId,
        employeeId: employeeIdInput.trim(),
        pin: pinInput.trim(),
      }, { withCredentials: true });

      if (res.data.success && res.data.data?.employee) {
        const emp = res.data.data.employee;
        
        // Save active employee session to localStorage
        localStorage.setItem("rms_active_employee", JSON.stringify(emp));
        
        // Dispatch custom event to notify all components in app
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("rms_active_employee_changed"));
        }

        toast.success(`Logged in as ${emp.name} (${emp.role})`);
        
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        toast.error("Verification failed");
      }
    } catch (err: any) {
      console.error("Employee PIN verification error:", err);
      toast.error(err.response?.data?.message || "Invalid Employee ID or PIN");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200 font-sans">
        
        {/* Header */}
        <div className="bg-[#18181B] text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold">
              <KeyRound size={16} />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-900 tracking-wide text-white">Login As Code</h3>
              <p className="text-[11px] lg:text-xs text-neutral-400 font-500">
                Staff Terminal PIN Authentication
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerifyAndLogin} className="p-6 space-y-4">
          {/* Employee ID */}
          <div className="space-y-1">
            <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
                placeholder="e.g. 001, 002"
                required
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs lg:text-sm font-700 text-neutral-900 focus:outline-none focus:border-brand-primary focus:bg-white transition-all uppercase"
              />
              <UserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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
                placeholder="Enter 4-digit PIN"
                required
                className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-700 text-neutral-900 tracking-widest focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
              />
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-700 text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-800 hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {verifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login Staff</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
