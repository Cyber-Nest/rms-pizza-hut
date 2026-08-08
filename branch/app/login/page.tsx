'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  KeyRound, UserCheck, ShieldCheck, ShieldOff, Loader2,
  CheckCircle2, LogIn,
} from 'lucide-react';

type Tab = 'master' | 'staff';

export default function BranchLoginPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // ── Tab & Session State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('master');
  const [masterActive, setMasterActive] = useState<boolean | null>(null); // null = checking
  const [masterBranchName, setMasterBranchName] = useState('');

  // ── Master Login State ───────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState('');

  // ── Staff Login State ────────────────────────────────────────────────────
  const [empId, setEmpId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  // ── Check master session on load ─────────────────────────────────────────
  const checkMasterSession = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const rawBranch = localStorage.getItem('rms_branch');
    const isImp = localStorage.getItem('rms_superadmin_impersonation') === 'true';
    let token = '';
    if (rawBranch) {
      try {
        const parsed = JSON.parse(rawBranch);
        token = parsed.token || '';
        if (parsed.name) setMasterBranchName(parsed.name);
      } catch (e) {}
    }

    if (!token && !isImp) {
      setMasterActive(false);
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.get(`${API_URL}/branches/check-session`, {
        headers,
        withCredentials: true,
        timeout: 4000,
      });
      if (res.data.success) {
        setMasterActive(true);
        if (res.data.data?.name) setMasterBranchName(res.data.data.name);
        setActiveTab('staff'); // Auto-switch to Staff tab if master is already logged in
      } else {
        setMasterActive(false);
      }
    } catch {
      // If server token validation fails, clear client storage
      localStorage.removeItem('rms_branch');
      localStorage.removeItem('rms_superadmin_impersonation');
      setMasterActive(false);
    }
  }, [API_URL]);

  useEffect(() => {
    checkMasterSession();
  }, [checkMasterSession]);

  // ── Master Login Handler ─────────────────────────────────────────────────
  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterError('');
    setMasterLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/branches/login`,
        { email: email.trim(), password: password.trim() },
        { withCredentials: true }
      );
      if (res.data.success && res.data.data) {
        const branchData = res.data.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('rms_branch', JSON.stringify(branchData));
          localStorage.setItem('rms_terminal_locked', 'false'); // Unlock terminal for Manager
          localStorage.removeItem('rms_superadmin_impersonation'); // Clear any leftover impersonation flag
          const maxAge = 30 * 24 * 60 * 60;
          document.cookie = `rms_terminal_locked=false; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `rms_branch_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;
          if (branchData.token) {
            document.cookie = `rms_branch_token=${branchData.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
          }
        }
        // Master login → go directly to dashboard (manager mode, no staff login needed)
        router.push('/');
      }
    } catch (err: any) {
      setMasterError(err.response?.data?.message || err.message || 'Branch login failed');
    } finally {
      setMasterLoading(false);
    }
  };

  // ── Staff Login Handler ──────────────────────────────────────────────────
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    if (!empId.trim()) { setStaffError('Please enter Employee ID'); return; }
    if (!/^\d{4}$/.test(pin)) { setStaffError('PIN must be exactly 4 digits'); return; }

    const branchRaw = typeof window !== 'undefined' ? localStorage.getItem('rms_branch') : null;
    const branchData = branchRaw ? JSON.parse(branchRaw) : null;
    const branchId = branchData?._id || branchData?.id;
    if (!branchId) { setStaffError('Terminal not activated. Please complete Master Login first.'); return; }

    setStaffLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/employees/login-code`,
        { branchId, employeeId: empId.trim().toUpperCase(), pin },
        { withCredentials: true }
      );
      if (res.data.success && res.data.data?.employee) {
        const emp = res.data.data.employee;
        localStorage.setItem('rms_active_employee', JSON.stringify(emp));
        localStorage.setItem('rms_terminal_locked', 'false'); // Unlock terminal for Staff
        const maxAge = 30 * 24 * 60 * 60;
        document.cookie = `rms_terminal_locked=false; path=/; max-age=${maxAge}; SameSite=Lax`;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('rms_active_employee_changed'));
        }
        router.push('/');
      } else {
        setStaffError('Login failed. Please try again.');
      }
    } catch (err: any) {
      setStaffError(err.response?.data?.message || 'Invalid Employee ID or PIN');
    } finally {
      setStaffLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-neutral-100 flex items-center justify-center p-4 font-sans text-neutral-900 select-none">
      <div className="w-full max-w-md space-y-5">

        {/* Logo */}
        <div className="text-center space-y-2">
          <img
            src="/pizza-hut-logo.webp"
            alt="Pizza Hut"
            className="mx-auto h-24 w-44 object-contain rounded-md"
          />
          <p className="text-xs font-600 text-neutral-500">Branch POS &amp; Terminal Login</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-neutral-200/70 border border-neutral-200 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-800 tracking-wide transition-all cursor-pointer ${
              activeTab === 'master'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck size={14} />
            Master Login
          </button>
          <button
            type="button"
            onClick={() => masterActive && setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-800 tracking-wide transition-all ${
              activeTab === 'staff'
                ? 'bg-brand-primary text-white shadow-md'
                : masterActive
                ? 'text-neutral-600 hover:text-neutral-900 cursor-pointer'
                : 'text-neutral-400 cursor-not-allowed'
            }`}
          >
            <UserCheck size={14} />
            Staff Login
            {!masterActive && masterActive !== null && (
              <span className="ml-1 text-[9px] bg-neutral-300 text-neutral-600 px-1.5 py-0.5 rounded-full font-700">LOCKED</span>
            )}
          </button>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-xl space-y-5">

          {/* ── MASTER LOGIN TAB ── */}
          {activeTab === 'master' && (
            <>
              {/* Active session notice */}
              {masterActive && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-800 text-emerald-900">Terminal Active</p>
                    <p className="text-[11px] text-emerald-700 font-500">
                      {masterBranchName ? `Branch: ${masterBranchName}` : 'Master session is running'}
                    </p>
                  </div>
                </div>
              )}

              {masterError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs font-600 rounded-xl text-center">
                  {masterError}
                </div>
              )}

              <form onSubmit={handleMasterLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-700 uppercase tracking-wider text-neutral-600 mb-1.5">
                    Branch Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      required
                      placeholder="downtown@chickendelight.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-700 uppercase tracking-wider text-neutral-600 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all font-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={masterLoading}
                  className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {masterLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Authenticating...</>
                  ) : (
                    <>{masterActive ? 'Re-Login Terminal' : 'Login To Terminal'} <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── STAFF LOGIN TAB ── */}
          {activeTab === 'staff' && (
            <>
              {/* Checking state */}
              {masterActive === null && (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-neutral-500">
                  <Loader2 size={22} className="animate-spin text-brand-primary" />
                  <p className="text-xs font-600">Checking terminal session...</p>
                </div>
              )}

              {/* Locked state */}
              {masterActive === false && (
                <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                    <ShieldOff size={24} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-800 text-red-600">Terminal Not Activated</p>
                    <p className="text-xs text-neutral-500 font-500 mt-1 leading-relaxed">
                      A manager must complete Master Login<br />before staff can sign in.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('master')}
                    className="px-5 py-2.5 bg-brand-primary text-white text-xs font-800 rounded-xl hover:bg-brand-primary/90 transition-all cursor-pointer shadow-md"
                  >
                    Go to Master Login
                  </button>
                </div>
              )}

              {/* Active state — Staff Login Form */}
              {masterActive === true && (
                <>
                  {/* Terminal active badge */}
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <p className="text-[11px] font-700 text-emerald-800">
                      Terminal Active{masterBranchName ? ` · ${masterBranchName}` : ''}
                    </p>
                  </div>

                  {staffError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-600 rounded-xl text-center">
                      {staffError}
                    </div>
                  )}

                  <form onSubmit={handleStaffLogin} className="space-y-4">
                    {/* Employee ID */}
                    <div>
                      <label className="block text-[10px] font-700 uppercase tracking-wider text-neutral-600 mb-1.5">
                        Employee ID
                      </label>
                      <div className="relative">
                        <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. 001, 002"
                          value={empId}
                          onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-xs font-mono font-800 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all uppercase tracking-widest"
                        />
                      </div>
                    </div>

                    {/* 4-Digit PIN */}
                    <div>
                      <label className="block text-[10px] font-700 uppercase tracking-wider text-neutral-600 mb-1.5">
                        4-Digit PIN
                      </label>
                      <div className="relative">
                        <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type={showPin ? 'text' : 'password'}
                          maxLength={4}
                          required
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 4) setPin(val);
                          }}
                          placeholder="••••"
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-10 py-3 text-sm font-mono font-900 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:bg-white transition-all tracking-[0.4em]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                        >
                          {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={staffLoading || pin.length < 4}
                      className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {staffLoading ? (
                        <><Loader2 size={16} className="animate-spin" /> Signing In...</>
                      ) : (
                        <><LogIn size={16} /> Sign In as Staff</>
                      )}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        <div className="text-center">
          <p className="text-[10px] text-neutral-500">
            Contact Super Admin if you forgot branch login credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
