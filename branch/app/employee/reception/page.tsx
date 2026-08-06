"use client";

import React, { useState } from "react";
import PosNavbar from "@/modules/employee-pos/components/PosNavbar";
import ReceptionView from "@/modules/employee-pos/components/ReceptionView";
import POSSidebarDrawer from "@/modules/employee-pos/components/POSSidebarDrawer";
import EmployeePermissionGuard from "@/modules/employee-pos/components/EmployeePermissionGuard";

export default function ReceptionPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <EmployeePermissionGuard permissionKey="reception_view">
      <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
        {/* Top Navbar */}
        <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

        {/* Main View Container */}
        <div className="flex-1 overflow-hidden p-6 bg-brand-bg flex flex-col min-h-0">
          <ReceptionView />
        </div>

        {/* Sidebar Drawer Component */}
        <POSSidebarDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab="reception_view"
          onSelectTab={(tabKey) => {
            if (tabKey === "kitchen") {
              window.location.href = "/employee/kitchen";
            } else if (tabKey === "pos") {
              window.location.href = "/employee/pos";
            } else if (tabKey === "reception_view") {
              setIsSidebarOpen(false);
            } else {
              window.location.href = `/employee/orders?tab=${tabKey}`;
            }
          }}
        />
      </main>
    </EmployeePermissionGuard>
  );
}
