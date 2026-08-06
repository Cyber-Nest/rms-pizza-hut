"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

function ImpersonateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ticket = searchParams.get("ticket");

  useEffect(() => {
    let isMounted = true;

    const redeemTicket = async () => {
      if (!ticket) {
        if (isMounted) {
          setError("No impersonation ticket provided. Please launch from Super Admin portal.");
          setLoading(false);
        }
        return;
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${API_URL}/branches/verify-impersonation`, {
          params: { ticket },
        });

        if (res.data.success && res.data.data) {
          const branchData = res.data.data;

          if (typeof window !== "undefined") {
            // ──cleanup of ALL stale session data before setting new ──
            localStorage.removeItem("rms_branch");
            localStorage.removeItem("rms_active_employee");
            localStorage.removeItem("rms_terminal_locked");
            localStorage.removeItem("rms_superadmin_impersonation");
            localStorage.removeItem("rms_draft_cart");
            document.cookie = "rms_terminal_locked=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "rms_branch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "rms_branch_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

            // ── Set fresh impersonation session data ──
            localStorage.setItem("rms_branch", JSON.stringify(branchData));
            localStorage.setItem("rms_superadmin_impersonation", "true");
            localStorage.setItem("rms_terminal_locked", "false");

            // Set cookies so Next.js middleware allows navigation 
            const maxAge = 24 * 60 * 60; // 24 hours for impersonation sessions
            const secureSuffix = window.location.protocol === "https:" ? "; Secure" : "";

            document.cookie = `rms_terminal_locked=false; path=/; max-age=${maxAge}; SameSite=Lax${secureSuffix}`;
            document.cookie = `rms_branch_session=true; path=/; max-age=${maxAge}; SameSite=Lax${secureSuffix}`;
            if (branchData.token) {
              document.cookie = `rms_branch_token=${branchData.token}; path=/; max-age=${maxAge}; SameSite=Lax${secureSuffix}`;
            }

            // Dispatch storage event so open tabs refresh session if needed
            window.dispatchEvent(new Event("storage"));

            window.location.href = "/employee/pos";
          }
        }
      } catch (err: any) {
        console.error("Error redeeming impersonation ticket:", err);
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "The impersonation link has expired or is invalid. Please launch Access POS from Super Admin portal again."
          );
          setLoading(false);
        }
      }
    };

    redeemTicket();

    return () => {
      isMounted = false;
    };
  }, [ticket, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-[#11100F] flex items-center justify-center p-4 text-white select-none">
        <div className="flex flex-col items-center gap-4 bg-[#1B1917] p-8 rounded-3xl border border-neutral-800 shadow-2xl max-w-sm text-center">
          <div className="w-14 h-14 bg-brand-primary/20 border border-brand-primary/40 rounded-2xl flex items-center justify-center text-brand-primary shadow-lg">
            <Loader2 size={28} className="animate-spin text-brand-primary" />
          </div>
          <div>
            <h2 className="text-base font-900 tracking-tight text-neutral-100">
              Initializing POS Mirror Session
            </h2>
            <p className="text-xs text-neutral-400 font-500 mt-1">
              Verifying Super Admin single-use security ticket...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-screen bg-[#11100F] flex items-center justify-center p-4 text-white select-none">
        <div className="flex flex-col items-center gap-4 bg-[#1B1917] p-8 rounded-3xl border border-neutral-800 shadow-2xl max-w-md text-center">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shadow-lg">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-base font-900 tracking-tight text-neutral-100">
              Access Ticket Expired or Invalid
            </h2>
            <p className="text-xs text-neutral-400 font-500 mt-2 leading-relaxed">
              {error}
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-700 rounded-xl transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            <span>Return to Branch Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export default function ImpersonatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-screen bg-[#11100F] flex items-center justify-center text-white">
          <Loader2 size={28} className="animate-spin text-brand-primary" />
        </div>
      }
    >
      <ImpersonateContent />
    </Suspense>
  );
}
