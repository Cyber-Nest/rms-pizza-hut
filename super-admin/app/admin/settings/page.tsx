"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Settings as SettingsIcon,
} from "lucide-react";

export default function AdminSettingsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // ── Profile State ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Password State ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // ── Load Current Admin Profile ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAdminProfile = async () => {
      setProfileLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("rms_superadmin_token")
            : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await axios.get(`${API_URL}/branches/admin/me`, {
          headers,
          withCredentials: true,
        });

        if (res.data.success && res.data.data) {
          setName(res.data.data.name || "");
          setEmail(res.data.data.email || "");
        } else {
          const raw = localStorage.getItem("rms_superadmin");
          if (raw) {
            const admin = JSON.parse(raw);
            setName(admin.name || "");
            setEmail(admin.email || "");
          }
        }
      } catch (err: any) {
        console.error("Failed to load admin profile:", err);
        const raw = localStorage.getItem("rms_superadmin");
        if (raw) {
          try {
            const admin = JSON.parse(raw);
            setName(admin.name || "");
            setEmail(admin.email || "");
          } catch (e) {}
        }
      } finally {
        setProfileLoading(false);
      }
    };

    fetchAdminProfile();
  }, [API_URL]);

  // ── Handle Profile Update ──────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setProfileSaving(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("rms_superadmin_token")
          : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await axios.put(
        `${API_URL}/branches/admin/profile`,
        { name: name.trim() },
        { headers, withCredentials: true }
      );

      if (res.data.success && res.data.data) {
        setName(res.data.data.name);
        const updatedAdmin = res.data.data;
        localStorage.setItem("rms_superadmin", JSON.stringify(updatedAdmin));
        window.dispatchEvent(new Event("storage"));
        toast.success("Profile updated successfully!");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to update profile details"
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Handle Password Update ─────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("rms_superadmin_token")
          : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await axios.put(
        `${API_URL}/branches/admin/password`,
        { currentPassword, newPassword },
        { headers, withCredentials: true }
      );

      if (res.data.success) {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to update password";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-neutral-400 font-medium text-xs">
        <Loader2 size={24} className="animate-spin text-brand-primary" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      {/* ── Top Banner Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-primary shrink-0">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 className="text-lg font-800 text-neutral-900">Settings</h1>
            <p className="text-xs text-neutral-500 font-500">
              Manage your Super Admin profile details and update account security credentials
            </p>
          </div>
        </div>

        <div className="self-start sm:self-center flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-700 shadow-xs">
          <ShieldCheck size={15} className="text-emerald-600" />
          <span>Super Admin Verified</span>
        </div>
      </div>

      {/* ── Main Form Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── CARD 1: Profile Information ── */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-800 text-neutral-900">
                    Profile Details
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Update account display name
                  </p>
                </div>
              </div>
            </div>

            <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-4 pt-1">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-600 mb-1.5">
                  Super Admin Name *
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Email Address (Read Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-600">
                    Email Address
                  </label>
                  <span className="text-[9px] font-800 text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Read-Only
                  </span>
                </div>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-neutral-100/70 border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-600 text-neutral-500 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[11px] font-500 text-neutral-400 mt-1.5 leading-tight flex items-center gap-1">
                  <span>Super Admin email address cannot be changed for security purposes.</span>
                </p>
              </div>
            </form>
          </div>

          <div className="pt-3 border-t border-neutral-100">
            <button
              type="submit"
              form="profile-form"
              disabled={profileSaving}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 uppercase tracking-wider rounded-xl transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {profileSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Profile Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── CARD 2: Security & Password Update ── */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                  <Lock size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-800 text-neutral-900">
                    Security &amp; Password
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Update your account password
                  </p>
                </div>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-600 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-500" />
                <span>{passwordError}</span>
              </div>
            )}

            <form id="password-form" onSubmit={handleUpdatePassword} className="space-y-3.5 pt-1">
              {/* Current Password */}
              <div>
                <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-600 mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-600 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-600 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="pt-3 border-t border-neutral-100">
            <button
              type="submit"
              form="password-form"
              disabled={passwordSaving}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-700 uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {passwordSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  Update Password
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
