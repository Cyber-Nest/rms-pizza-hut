'use client';

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Lock, KeyRound, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function BranchPasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg('Current password is required');
      return;
    }
    if (!newPassword) {
      setErrorMsg('New password is required');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    setSaving(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const raw = localStorage.getItem('rms_branch');
      const branchData = raw ? JSON.parse(raw) : null;
      const branchId = branchData?._id || branchData?.id;

      const res = await axios.patch(`${API_URL}/branches/change-password`, {
        branchId,
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        toast.success('Branch password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update branch password';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans w-full max-w-2xl">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <Lock size={17} className="text-brand-primary" />
          <h2 className="text-xs font-850 uppercase tracking-wider text-neutral-800">
            Branch Password Security
          </h2>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-700 rounded-xl flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Current Password */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
          Current Password *
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type={showCurrent ? 'text' : 'password'}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-9 py-2 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
          >
            {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
          New Password *
        </label>
        <div className="relative">
          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type={showNew ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-9 py-2 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
          >
            {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Confirm New Password */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
          Confirm New Password *
        </label>
        <div className="relative">
          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-9 py-2 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
          >
            {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-3 border-t border-neutral-100 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-800 uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <KeyRound size={14} />
              Update Password
            </>
          )}
        </button>
      </div>
    </form>
  );
}
