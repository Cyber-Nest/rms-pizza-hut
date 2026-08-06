"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

// All Orders sub-tabs that require their own permission key
const ORDERS_SUBTAB_KEYS = [
  "dashboard",
  "orders_list",
  "sales_summary",
  "expense_payout",
  "reports",
  "item_sales",
  "hourly_sales",
  "cash_out_summary",
  "monthly_sales_summary",
  "failed_transaction",
  "refund_orders",
];

interface EmployeePermissionGuardProps {
  permissionKey: string;
  children: React.ReactNode;
}

export default function EmployeePermissionGuard({
  permissionKey,
  children,
}: EmployeePermissionGuardProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");

  useEffect(() => {
    const checkPermission = (emp?: any) => {
      if (typeof window === "undefined") return;

      try {
        // ── 0. Super Admin impersonation sessions always have full access ──
        const isImpersonation = localStorage.getItem("rms_superadmin_impersonation") === "true";
        if (isImpersonation) {
          setIsAllowed(true);
          return;
        }

        const terminalLocked = localStorage.getItem("rms_terminal_locked");
        const raw = emp
          ? JSON.stringify(emp)
          : localStorage.getItem("rms_active_employee");

        // ── 1. If terminal is explicitly locked (employee logged out), REDIRECT TO /LOGIN ──
        if (terminalLocked === "true") {
          setIsAllowed(false);
          window.location.href = "/login";
          return;
        }

        // ── 2. If no active employee is logged in ──
        if (!raw) {
          // If terminal has never been unlocked or is locked, go to /login
          if (terminalLocked !== "false") {
            setIsAllowed(false);
            window.location.href = "/login";
            return;
          }
          // Manager Terminal Mode (Master Login was done and not locked) → Full Access
          setIsAllowed(true);
          return;
        }

        // ── 3. Staff is logged in ──
        const activeEmp = typeof emp === "object" && emp !== null ? emp : JSON.parse(raw);

        // Drivers are never allowed to view POS pages
        if (activeEmp?.role === "driver") {
          setIsAllowed(false);
          toast.error("Driver accounts are not permitted to access the POS terminal.");
          return;
        }

        if (!activeEmp || activeEmp.role === "manager") {
          setIsAllowed(true);
          return;
        }

        setEmployeeName(activeEmp.name || "Staff");
        const perms = activeEmp.permissions || {};

        // POS route is allowed unless explicitly set to false
        if (permissionKey === "pos") {
          if (perms.pos === false) {
            setIsAllowed(false);
            toast.error("Access Restricted: You don't have permission to view POS.");
          } else {
            setIsAllowed(true);
          }
          return;
        }

        // Check main permission key
        let allowed = perms[permissionKey] === true;

        // ── Orders page: also validate active sub-tab from URL ──
        if (permissionKey === "orders" && allowed) {
          const urlParams = new URLSearchParams(window.location.search);
          const tab = urlParams.get("tab");
          const TAB_TO_PERM: Record<string, string> = { orders: "orders_list" };
          const PERM_TO_TAB: Record<string, string> = { orders_list: "orders" };
          if (tab && ORDERS_SUBTAB_KEYS.includes(TAB_TO_PERM[tab] ?? tab)) {
            const permKey = TAB_TO_PERM[tab] ?? tab;
            if (perms[permKey] !== true) {
              const firstAllowedPermKey = ORDERS_SUBTAB_KEYS.find((k) => perms[k] === true);
              if (firstAllowedPermKey) {
                const firstAllowedTab = PERM_TO_TAB[firstAllowedPermKey] ?? firstAllowedPermKey;
                const url = new URL(window.location.href);
                url.searchParams.set("tab", firstAllowedTab);
                window.history.replaceState({}, "", url.pathname + url.search);
                setIsAllowed(true);
                return;
              } else {
                allowed = false;
              }
            }
          }
        }

        if (!allowed) {
          setIsAllowed(false);
          toast.error(`Access Restricted: You don't have permission to view this section.`);
        } else {
          setIsAllowed(true);
        }
      } catch {
        setIsAllowed(true);
      }
    };

    // Run initial check from localStorage
    checkPermission();

    // ── Background DB Sync: fetch fresh permissions from backend ──
    const syncFromDB = async () => {
      try {
        const raw = localStorage.getItem("rms_active_employee");
        if (!raw) return;
        const activeEmp = JSON.parse(raw);
        if (!activeEmp || !activeEmp._id || activeEmp.role === "manager") return;

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${apiUrl}/employees/${activeEmp._id}`);
        if (res.data?.success && res.data?.data) {
          const freshEmp = res.data.data;
          const freshPerms = freshEmp.permissions || {};
          // Only update if permissions actually changed
          if (
            JSON.stringify(freshPerms) !==
            JSON.stringify(activeEmp.permissions || {})
          ) {
            const updatedSession = {
              ...activeEmp,
              permissions: freshPerms,
              name: freshEmp.name || activeEmp.name,
              role: freshEmp.role || activeEmp.role,
            };
            localStorage.setItem(
              "rms_active_employee",
              JSON.stringify(updatedSession)
            );
            // Re-check permission with fresh data
            checkPermission(updatedSession);
            window.dispatchEvent(new Event("rms_active_employee_changed"));
          }
        }
      } catch {
        // Silently fail — don't block access if DB is unreachable
      }
    };

    syncFromDB();

    const handleStorageChange = () => checkPermission();
    window.addEventListener("rms_active_employee_changed", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("rms_active_employee_changed", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [permissionKey]);

  // Loading spinner while checking
  if (isAllowed === null) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-neutral-500 font-600 text-xs">
          <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <span>Verifying access permissions...</span>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-6 text-neutral-900 font-sans">
        <div className="w-full max-w-md bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-inner">
            <Lock size={32} />
          </div>

          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-red-50 text-red-600 border border-red-200 uppercase tracking-widest">
              403 Forbidden
            </span>
            <h2 className="text-xl font-900 text-neutral-900 tracking-tight pt-1">
              Access Restricted
            </h2>
            <p className="text-xs text-neutral-500 font-500 leading-relaxed max-w-xs mx-auto">
              Hi <strong className="text-neutral-800">{employeeName}</strong>,
              your account does not have permission to access the{" "}
              <strong className="text-brand-primary capitalize">
                {permissionKey.replace(/_/g, " ")}
              </strong>{" "}
              section.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                window.location.href = "/employee/pos";
              }}
              className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white text-xs font-800 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>Return to POS Terminal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
