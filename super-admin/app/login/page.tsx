"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.post(
        `${API_URL}/branches/admin/login`,
        { email, password },
        { withCredentials: true }
      );

      if (res.data.success) {
        const { token, admin } = res.data.data;
        if (typeof window !== "undefined") {
          localStorage.setItem("rms_superadmin_token", token);
          localStorage.setItem("rms_superadmin", JSON.stringify(admin));
          document.cookie = `rms_superadmin_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        }
        router.push("/admin/branches");
      }
    } catch (err: any) {
      console.error("Super Admin login error:", err);
      setError(
        err.response?.data?.message || "Invalid credentials. Please verify email & password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#11100F] flex items-center justify-center p-4 font-sans text-white select-none">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md bg-[#1B1917] border border-neutral-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/pizza-hut-logo.webp" alt="Pizza Hut" className="mb-4 h-24 w-44 object-contain rounded-md" />
          <h1 className="text-xl font-900 tracking-tight text-brand-primary">SUPER ADMIN</h1>
          <p className="text-xs font-500 text-neutral-400 mt-1">
            Centralized Multi-Unit Restaurant Control Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-600 animate-fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-[11px] font-800 text-neutral-400 uppercase tracking-wider mb-2">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-[#11100F] border border-neutral-800 rounded-2xl py-3 pl-10 pr-4 text-xs font-600 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-800 text-neutral-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#11100F] border border-neutral-800 rounded-2xl py-3 pl-10 pr-11 text-xs font-600 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>



          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-primary hover:bg-orange-600 text-white font-800 text-xs rounded-2xl transition-all shadow-lg shadow-brand-primary/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Secure Super Admin Login</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-neutral-800/80 pt-4">
          <p className="text-[10.5px] text-neutral-500 font-600 tracking-wide">
            Pizza Hut RMS • Protected by Enterprise Multi-Tenant Security
          </p>
        </div>
      </div>
    </div>
  );
}
