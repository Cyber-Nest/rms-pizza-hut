'use client';

import React from 'react';
import axios from 'axios';
import { Search, Bell, ChefHat, LayoutGrid, Menu, TrendingUp, ClipboardList, LogOut, MapPin } from 'lucide-react';
import { usePosStore } from '../store/pos.store';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PosNavbarProps {
  onToggleSidebar?: () => void;
}

export default function PosNavbar({ onToggleSidebar }: PosNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { search, setSearch, orders } = usePosStore();
  const [branchInfo, setBranchInfo] = React.useState<{ name: string; code: string; _id?: string } | null>(null);
  const [loadingBranchInfo, setLoadingBranchInfo] = React.useState(true);
  const [activeEmployee, setActiveEmployee] = React.useState<any>(null);
  const [isLocationPending, setIsLocationPending] = React.useState(false);

  React.useEffect(() => {
    const syncActiveEmployee = () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem('rms_active_employee');
        setActiveEmployee(raw ? JSON.parse(raw) : null);
      } catch {
        setActiveEmployee(null);
      }
    };

    syncActiveEmployee();
    window.addEventListener('rms_active_employee_changed', syncActiveEmployee);
    window.addEventListener('storage', syncActiveEmployee);
    return () => {
      window.removeEventListener('rms_active_employee_changed', syncActiveEmployee);
      window.removeEventListener('storage', syncActiveEmployee);
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const loadBranchSession = async () => {
      if (typeof window === 'undefined') return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const raw = localStorage.getItem('rms_branch');
      let token = '';

      if (raw) {
        try {
          const b = JSON.parse(raw);
          token = b.token || '';
          if (isMounted && b.name && b.code) {
            setBranchInfo({ name: b.name, code: b.code, _id: b._id });
            const hasLoc = b.isLocationConfigured || (b.lat !== null && b.lng !== null && b.lat !== undefined && b.lng !== undefined && !(b.lat === 0 && b.lng === 0));
            setIsLocationPending(!hasLoc);
          }
        } catch (e) {}
      }

      // Try fetching fresh branch profile from backend
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await axios.get(`${API_URL}/branches/me`, {
          withCredentials: true,
          headers,
        });

        if (res.data.success && res.data.data) {
          const freshData = res.data.data;
          if (isMounted) {
            setBranchInfo({ name: freshData.name, code: freshData.code, _id: freshData._id });
            const hasLoc = freshData.isLocationConfigured || (freshData.lat !== null && freshData.lng !== null && freshData.lat !== undefined && freshData.lng !== undefined && !(freshData.lat === 0 && freshData.lng === 0));
            setIsLocationPending(!hasLoc);
          }
          // Sync localStorage
          if (raw) {
            try {
              const existing = JSON.parse(raw);
              localStorage.setItem('rms_branch', JSON.stringify({ ...existing, ...freshData }));
            } catch (e) {}
          }
        }
      } catch (err: any) {
        // If unauthenticated or branch inactive, force redirect to login ONLY if not a Super Admin impersonation session
        if (err.response?.status === 401) {
          const isImp = typeof window !== 'undefined' && localStorage.getItem('rms_superadmin_impersonation') === 'true';
          if (!isImp) {
            localStorage.removeItem('rms_branch');
            document.cookie = 'rms_branch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'rms_branch_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            router.push('/login');
            return;
          }
        }
      } finally {
        if (isMounted) setLoadingBranchInfo(false);
      }

      // If no branch info found at all and not impersonating, redirect to login
      const isImpSession = typeof window !== 'undefined' && localStorage.getItem('rms_superadmin_impersonation') === 'true';
      if (!raw && !isImpSession) {
        router.push('/login');
      }
    };

    loadBranchSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Employee Logout: clears active staff session, locks terminal, goes to /login
  const handleEmployeeLogout = () => {
    if (confirm(`Logout ${activeEmployee?.name}`)) {
      const isImp = typeof window !== 'undefined' && localStorage.getItem('rms_superadmin_impersonation') === 'true';
      localStorage.removeItem('rms_active_employee');
      if (!isImp) {
        localStorage.setItem('rms_terminal_locked', 'true');
        document.cookie = 'rms_terminal_locked=true; path=/; max-age=604800; SameSite=Lax';
      }
      window.dispatchEvent(new Event('rms_active_employee_changed'));
      router.push('/login');
    }
  };

  // Master Logout: clears everything (branch + employee) and redirects to /login
  const handleMasterLogout = async () => {
    if (confirm('Master Logout: This will close the terminal session. All staff will need to re-login. Continue?')) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        await axios.post(`${API_URL}/branches/logout`, {}, { withCredentials: true });
      } catch (e) {}

      if (typeof window !== 'undefined') {
        localStorage.removeItem('rms_branch');
        localStorage.removeItem('rms_active_employee');
        localStorage.removeItem('rms_terminal_locked');
        localStorage.removeItem('rms_draft_cart');
        localStorage.removeItem('rms_superadmin_impersonation'); // Clear impersonation flag
        document.cookie = 'rms_terminal_locked=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'rms_branch_session=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'rms_branch_token=; path=/; max-age=0; SameSite=Lax';
      }
      router.push('/login');
    }
  };

  const rawNavLinks = [
    { key: 'pos', name: 'POS Terminal', href: '/employee/pos', icon: LayoutGrid },
    { key: 'kitchen', name: 'Kitchen View', href: '/employee/kitchen', icon: ChefHat },
    { key: 'orders', name: 'Orders', href: '/employee/orders', icon: ClipboardList },
    { key: 'reception_view', name: 'Reception View', href: '/employee/reception', icon: TrendingUp },
  ];

  const navLinks = rawNavLinks.filter((link) => {
    if (!activeEmployee || activeEmployee.role === 'manager') return true;
    if (link.key === 'pos') return true;
    const perms = activeEmployee.permissions || {};
    if (link.key === 'orders') {
      const orderSubTabKeys = ['orders', 'orders_list', 'dashboard', 'sales_summary', 'expense_payout', 'reports', 'item_sales', 'hourly_sales', 'cash_out_summary', 'monthly_sales_summary', 'failed_transaction', 'refund_orders'];
      return orderSubTabKeys.some(k => perms[k] === true);
    }
    return perms[link.key] === true;
  });

  const [isImpersonated, setIsImpersonated] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isImp = localStorage.getItem('rms_superadmin_impersonation') === 'true';
      setIsImpersonated(isImp);
    }
  }, []);

  return (
    <>
      {isLocationPending && (
        <div className="bg-amber-500 text-white text-xs font-800 px-5 py-2.5 flex items-center justify-between shadow-md z-50 sticky top-0 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span>
              Action Required: Restaurant GPS location is pending setup! Super Admin requires your exact location before taking your store <strong>LIVE</strong>.
            </span>
          </div>
          <Link
            href="/employee/settings"
            className="bg-white text-amber-900 px-3.5 py-1 rounded-xl text-[11px] font-900 uppercase hover:bg-amber-50 transition-all shadow-sm flex-shrink-0 cursor-pointer flex items-center gap-1"
          >
            <span>Configure Location Now</span>
            <span className="text-xs">→</span>
          </Link>
        </div>
      )}  

      <header className="h-[64px] bg-white border-b border-neutral-200 px-5 flex items-center justify-between sticky top-0 z-40 shadow-sm font-sans">
        {/* ── Left: Logo + Branch + Nav Links ── */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link href="/employee/pos" className="flex items-center gap-2.5">
            <img src="/pizza-hut-logo.webp" alt="Pizza Hut" className="h-12 w-[86px] object-contain rounded-sm" />
          </Link>

          {/* Divider */}
          <div className="h-7 w-px bg-neutral-200" />

          {/* Active Branch Badge */}
          {loadingBranchInfo && !branchInfo ? (
            <div className="flex items-center gap-2 bg-orange-50/60 border border-orange-200/60 rounded-xl px-3 py-1.5 shadow-xs animate-pulse">
              <div className="w-8 h-4 bg-orange-200/80 rounded" />
              <div className="w-24 h-4 bg-orange-200/50 rounded" />
            </div>
          ) : branchInfo ? (
            <div className="flex items-center gap-2 bg-orange-50/80 border border-orange-200 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="px-1.5 py-0.5 bg-brand-primary text-white text-[9px] font-900 rounded uppercase flex-shrink-0">
                {branchInfo.code}
              </span>
              <span className="text-[12px] font-800 text-black whitespace-nowrap">
                {branchInfo.name}
              </span>
              {isImpersonated && (
                <span className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-900 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                  <span>Super Admin View</span>
                </span>
              )}
            </div>
          ) : null}

          {/* Divider */}
          {navLinks.length > 0 && <div className="h-5 w-px bg-neutral-200 hidden lg:block" />}

          {/* Nav Navigation Links */}
          <div className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href === '/employee/pos' && (pathname === '/' || pathname === '/employee'));
              const Icon = link.icon;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-800 transition-all cursor-pointer border ${
                    isActive
                      ? 'border-brand-primary/30 bg-brand-primary-light text-brand-primary shadow-xs'
                      : 'border-neutral-200 bg-neutral-50 text-black hover:border-brand-primary/30 hover:bg-brand-primary-light hover:text-brand-primary'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-brand-primary' : 'text-black'} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Center: Global Search (Only shown on POS Terminal page) ── */}
        {pathname === '/employee/pos' && (
          <div className="flex-1 max-w-sm mx-4 hidden md:block">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 pl-9 pr-3 text-[12px] font-700 text-black placeholder-neutral-500 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        {/* ── Right: Actions + Profile + Logout ── */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary-light transition-all cursor-pointer">
            <Bell size={16} />
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-brand-primary text-white text-[9px] font-700 rounded-full flex items-center justify-center px-1 border border-white">
                {orders.length}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-7 w-px bg-neutral-200" />

          {/* Staff Profile Badge */}
          {loadingBranchInfo && !branchInfo ? (
            <div className="w-24 h-8 bg-neutral-100 animate-pulse rounded-xl" />
          ) : branchInfo ? (
            <div className="flex items-center gap-2.5 bg-neutral-50/90 border border-neutral-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-brand-primary text-white font-900 text-[11px] flex items-center justify-center shadow-xs uppercase shrink-0">
                {activeEmployee ? activeEmployee.name.charAt(0) : 'A'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[12px] font-800 text-black leading-none">
                  {activeEmployee ? activeEmployee.name : `${branchInfo.code}`}
                </span>
                <span className="text-[9.5px] font-800 text-brand-primary uppercase tracking-wider mt-0.5 leading-none">
                  {activeEmployee ? activeEmployee.role.replace('_', ' ') : 'BRANCH ADMIN'}
                </span>
              </div>
            </div>
          ) : null}

          {/* Logout Button — Always locks screen to /login while keeping terminal active */}
          <button
            onClick={handleEmployeeLogout}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all cursor-pointer"
            title={activeEmployee ? `Logout ${activeEmployee.name}` : "Lock Terminal Screen"}
          >
            <LogOut size={15} />
          </button>

          {/* Menu Drawer Toggle Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-primary text-white hover:bg-orange-600 transition-all cursor-pointer shadow-xs ml-1"
              title="Open Menu Drawer"
            >
              <Menu size={18} />
            </button>
          )}
        </div>
      </header>
    </>
  );
}

