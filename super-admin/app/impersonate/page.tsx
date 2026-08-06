"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RedirectorContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ticket = searchParams.get("ticket");
    if (ticket && typeof window !== "undefined") {
      let branchBaseUrl = process.env.NEXT_PUBLIC_BRANCH_APP_URL;

      if (!branchBaseUrl || !branchBaseUrl.trim()) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        if (port === "3000") {
          branchBaseUrl = `${protocol}//${hostname}:3001`;
        } else if (port === "3002") {
          branchBaseUrl = `${protocol}//${hostname}:3000`;
        } else if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
          branchBaseUrl = `${protocol}//${hostname}:3001`;
        } else if (hostname.startsWith("admin.")) {
          branchBaseUrl = `${protocol}//${hostname.replace("admin.", "pos.")}`;
        } else if (hostname.startsWith("superadmin.")) {
          branchBaseUrl = `${protocol}//${hostname.replace("superadmin.", "pos.")}`;
        } else if (hostname.includes("super-admin")) {
          branchBaseUrl = `${protocol}//${hostname.replace("super-admin", "pos")}`;
        } else if (hostname.includes("superadmin")) {
          branchBaseUrl = `${protocol}//${hostname.replace("superadmin", "pos")}`;
        } else if (hostname.includes("admin")) {
          branchBaseUrl = `${protocol}//${hostname.replace("admin", "pos")}`;
        } else {
          branchBaseUrl = "https://rms-pos-v1.vercel.app";
        }
      }

      const targetBranchUrl = `${branchBaseUrl}/impersonate?ticket=${encodeURIComponent(ticket)}`;
      window.location.href = targetBranchUrl;
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#11100F] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-3 border-neutral-600 border-t-brand-primary rounded-full animate-spin mx-auto" />
        <p className="text-xs font-700 text-neutral-300">
          Redirecting to Branch POS Terminal...
        </p>
      </div>
    </div>
  );
}

export default function ImpersonateRedirector() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#11100F]" />}>
      <RedirectorContent />
    </Suspense>
  );
}
