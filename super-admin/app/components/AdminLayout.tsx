"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  Store,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Menu,
  X,
  SlidersHorizontal,
  Monitor,
  Search,
  ExternalLink,
  Loader2,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

interface Props {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchesDropdownOpen, setBranchesDropdownOpen] = useState(false);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [launchingBranchId, setLaunchingBranchId] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  // 1. Session Guard check
  useEffect(() => {
    if (pathname === "/login") return;

    const syncAdminUser = () => {
      if (typeof window === "undefined") return;
      const rawUser = localStorage.getItem("rms_superadmin");
      if (rawUser) {
        try {
          setAdminUser(JSON.parse(rawUser));
        } catch (e) {}
      }
    };

    window.addEventListener("storage", syncAdminUser);

    const checkSuperAdminSession = async () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("rms_superadmin_token");
      const rawUser = localStorage.getItem("rms_superadmin");

      if (!token) {
        router.push("/login");
        return;
      }

      if (rawUser) {
        try {
          setAdminUser(JSON.parse(rawUser));
        } catch (e) {}
      }

      // Verify token with backend
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${API_URL}/branches/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (res.data.success && res.data.data) {
          setAdminUser(res.data.data);
          localStorage.setItem("rms_superadmin", JSON.stringify(res.data.data));
        }
      } catch (err: any) {
        console.error("Super Admin session invalid:", err);
        localStorage.removeItem("rms_superadmin_token");
        localStorage.removeItem("rms_superadmin");
        document.cookie = "rms_superadmin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
      }
    };

    checkSuperAdminSession();

    return () => {
      window.removeEventListener("storage", syncAdminUser);
    };
  }, [pathname, router]);

  // Fetch branches when POS dropdown is opened
  const toggleBranchesDropdown = async () => {
    const nextState = !branchesDropdownOpen;
    setBranchesDropdownOpen(nextState);

    if (nextState && branchesList.length === 0) {
      setLoadingBranches(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const token = localStorage.getItem("rms_superadmin_token");
        const res = await axios.get(`${API_URL}/branches?isActive=true&minimal=true`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        if (res.data.success) {
          setBranchesList(res.data.data || []);
        }
      } catch (err) {
        console.error("Error loading branches for switcher:", err);
      } finally {
        setLoadingBranches(false);
      }
    }
  };

  // Launch POS Impersonation session in a new tab
  const handleLaunchBranchPOS = async (branch: any) => {
    setLaunchingBranchId(branch._id);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("rms_superadmin_token");

      const res = await axios.post(
        `${API_URL}/branches/impersonate/${branch._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (res.data.success && res.data.data?.ticket) {
        const ticket = res.data.data.ticket;
        let branchAppUrl = process.env.NEXT_PUBLIC_BRANCH_APP_URL;

        if (!branchAppUrl || !branchAppUrl.trim()) {
          if (typeof window !== "undefined") {
            const currentOrigin = window.location.origin;
            const currentPort = window.location.port;
            const currentHost = window.location.hostname;
            const currentProtocol = window.location.protocol;

            if (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) {
              branchAppUrl = `${currentProtocol}//${currentHost}:3000`;
            }
            else if (currentHost.startsWith("admin.")) {
              branchAppUrl = `${currentProtocol}//${currentHost.replace("admin.", "pos.")}`;
            } else if (currentHost.startsWith("superadmin.")) {
              branchAppUrl = `${currentProtocol}//${currentHost.replace("superadmin.", "pos.")}`;
            }
            else if (currentHost.includes("super-admin")) {
              branchAppUrl = `${currentProtocol}//${currentHost.replace("super-admin", "pos")}`;
            } else if (currentHost.includes("superadmin")) {
              branchAppUrl = `${currentProtocol}//${currentHost.replace("superadmin", "pos")}`;
            } else if (currentHost.includes("admin")) {
              branchAppUrl = `${currentProtocol}//${currentHost.replace("admin", "pos")}`;
            } else {
              branchAppUrl = "https://rms-pos-v1.vercel.app";
            }
          }
        }

        const launchUrl = `${branchAppUrl}/impersonate?ticket=${encodeURIComponent(ticket)}`;

        // Open branch POS directly in a new browser tab
        window.open(launchUrl, "_blank");
        setBranchesDropdownOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not launch branch POS");
    } finally {
      setLaunchingBranchId(null);
    }
  };

  const executeLogout = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("rms_superadmin_token");
      await axios.post(
        `${API_URL}/branches/admin/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
    } catch (e) {}

    localStorage.removeItem("rms_superadmin_token");
    localStorage.removeItem("rms_superadmin");
    document.cookie = "rms_superadmin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const confirmLogout = () => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to log out?</p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await executeLogout();
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    ), { duration: 4000, position: "top-center" });
  };

  // Skip layout if on /login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, desc: "Overview & Analytics" },
    { name: "Menu Management", href: "/admin/menu", icon: Utensils, desc: "Configure master categories & menu items" },
    { name: "Branch Menu Control", href: "/admin/menu-matrix", icon: SlidersHorizontal, desc: "Control menu availability per branch location" },
    { name: "Promo Codes", href: "/admin/promo-codes", icon: Tag, desc: "Manage discount codes & promotions" },
    { name: "Orders", href: "/admin/orders", icon: ClipboardList, desc: "Live restaurant order management" },
    { name: "Branches", href: "/admin/branches", icon: Store, desc: "Manage multi-unit branch locations" },
    { name: "Settings", href: "/admin/settings", icon: Settings, desc: "System configuration & preferences" },
  ];

  const sortedItems = [...navItems].sort((a, b) => b.href.length - a.href.length);
  const currentTab =
    sortedItems.find((item) =>
      item.href === "/admin/menu"
        ? pathname === "/admin/menu" || pathname === "/"
        : pathname.startsWith(item.href)
    ) || navItems[1];

  const filteredBranches = branchesList.filter(
    (b) =>
      b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
      b.code.toLowerCase().includes(branchSearch.toLowerCase())
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F5F4F1] flex font-sans antialiased text-neutral-900 select-none">
      {/* ── SIDEBAR (Desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-dark text-white flex-shrink-0 border-r border-neutral-800">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-neutral-800 bg-[#161412]">
          <img src="/pizza-hut-logo.webp" alt="Pizza Hut" className="h-12 w-[86px] object-contain rounded-sm" />
          <div>
            <p className="text-[9px] font-600 text-brand-primary uppercase tracking-wider leading-none">
              RMS Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.name === currentTab.name;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-600 transition-all cursor-pointer ${
                  active
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                }`}
              >
                <Icon
                  size={15}
                  className={active ? "text-white" : "text-neutral-400"}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800 bg-[#161412]">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center font-700 text-white text-[11px]">
              {adminUser?.name ? adminUser.name.charAt(0) : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-700 text-neutral-200 truncate leading-tight">
                {adminUser?.name || "Super Admin"}
              </p>
              <p className="text-[8px] font-600 text-neutral-500 truncate leading-none mt-0.5">
                {adminUser?.email || ""}
              </p>
            </div>
            <button
              onClick={confirmLogout}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-brand-primary hover:bg-neutral-800 transition-all cursor-pointer"
              title="Logout Super Admin"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-all cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:block">
              <h2 className="text-[13px] font-700 text-neutral-800">
                {currentTab.name}
              </h2>
              <p className="text-[9px] font-500 text-neutral-400 mt-0.5">
                {currentTab.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ── 1-CLICK BRANCH POS SWITCHER BUTTON ── */}
            <div className="relative">
              <button
                onClick={toggleBranchesDropdown}
                className="px-3.5 py-1.5 bg-brand-primary text-white hover:bg-orange-600 rounded-xl text-xs font-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Monitor size={14} />
                <span>Access POS</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${
                    branchesDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {branchesDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 z-50 p-3 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-800 text-neutral-400 uppercase tracking-wider">
                      Select Branch to Mirror POS
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-600 font-700 px-1.5 py-0.5 rounded">
                      Live Access
                    </span>
                  </div>

                  {/* Search filter */}
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="text"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="Search branch name or code..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-1.5 pl-8 pr-2.5 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  {/* Branch List */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {loadingBranches ? (
                      <div className="p-4 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin text-brand-primary" />
                        <span>Loading branches...</span>
                      </div>
                    ) : filteredBranches.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-400">
                        No active branches found
                      </div>
                    ) : (
                      filteredBranches.map((b) => (
                        <button
                          key={b._id}
                          disabled={launchingBranchId === b._id}
                          onClick={() => handleLaunchBranchPOS(b)}
                          className="w-full p-2.5 rounded-xl border border-neutral-100 hover:border-brand-primary/30 hover:bg-orange-50/60 flex items-center justify-between text-left transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 group-hover:bg-brand-primary group-hover:text-white text-[9px] font-900 rounded uppercase transition-colors">
                              {b.code}
                            </span>
                            <span className="text-xs font-700 text-neutral-800 group-hover:text-brand-primary transition-colors">
                              {b.name}
                            </span>
                          </div>
                          {launchingBranchId === b._id ? (
                            <Loader2 size={13} className="animate-spin text-brand-primary" />
                          ) : (
                            <ExternalLink
                              size={13}
                              className="text-neutral-400 group-hover:text-brand-primary transition-colors"
                            />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="w-px h-6 bg-neutral-200" />

            {/* Notifications */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-all cursor-pointer">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-primary rounded-full" />
            </button>

            <span className="w-px h-6 bg-neutral-200" />

            {/* Profile Info (Click to logout removed) */}
            <div className="flex items-center gap-2">
              <div className="w-7.5 h-7.5 bg-orange-100 text-brand-primary rounded-lg flex items-center justify-center font-700 text-[10px]">
                {adminUser?.name ? adminUser.name.charAt(0) : "C"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-700 text-neutral-800 leading-tight">
                  {adminUser?.name || "Pizza Hut Super Admin"}
                </p>
                <p className="text-[8px] font-600 text-neutral-400 uppercase tracking-wide leading-none mt-0.5">
                  Brand Manager
                </p>
              </div>
            </div>

            <span className="w-px h-6 bg-neutral-200" />

            {/* Dedicated Logout Button */}
            <button
              onClick={confirmLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Logout Super Admin"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ── INNER VIEW CONTAINER ── */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0">{children}</main>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative w-64 bg-brand-dark text-white flex flex-col animate-drawer-slide-in">
            <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-800 bg-[#161412]">
              <div className="flex items-center gap-3">
                <img src="/pizza-hut-logo.webp" alt="Pizza Hut" className="h-12 w-[86px] object-contain rounded-sm" />
                <div>
                  <p className="text-[9px] font-600 text-brand-primary uppercase tracking-wider leading-none">
                    RMS Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = item.name === currentTab.name;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-600 transition-all cursor-pointer ${
                      active
                        ? "bg-brand-primary text-white"
                        : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                    }`}
                  >
                    <Icon size={15} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-neutral-800 bg-[#161412]">
              <button
                onClick={confirmLogout}
                className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-800 text-red-400 rounded-xl text-xs font-700 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Logout Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-right" />
    </div>
  );
}
