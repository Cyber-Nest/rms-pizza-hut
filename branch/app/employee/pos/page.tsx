"use client";

import React, { useState, useEffect } from "react";
import PosNavbar from "@/modules/employee-pos/components/PosNavbar";
import CategoryCarousel from "@/modules/employee-pos/components/CategoryCarousel";
import OrderTypePanel from "@/modules/employee-pos/components/OrderTypePanel";
import MenuGrid from "@/modules/employee-pos/components/MenuGrid";
import CartPanel from "@/modules/employee-pos/components/CartPanel";
import ModifierDrawer from "@/modules/employee-pos/components/ModifierDrawer";
import CheckoutModal from "@/modules/employee-pos/components/CheckoutModal";
import POSSidebarDrawer from "@/modules/employee-pos/components/POSSidebarDrawer";
import { MenuItem } from "@/modules/employee-pos/types";
import { usePosStore } from "@/modules/employee-pos/store/pos.store";
import OnlineOrderBanner from "@/modules/employee-pos/components/OnlineOrderBanner";
import EmployeePermissionGuard from "@/modules/employee-pos/components/EmployeePermissionGuard";
import { ShoppingCart, SlidersHorizontal, X } from "lucide-react";

export default function PosPage() {
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Tablet: which panel is shown in the bottom sheet/drawer (null = hidden)
  const [tabletPanel, setTabletPanel] = useState<"order" | "cart" | null>(null);
  const { fetchMenu, cartItems } = usePosStore();

  useEffect(() => {
    // Clear any dangling draft carts from previous sessions so they don't get stuck in the Kitchen Dashboard
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("rms_draft_cart");
      window.dispatchEvent(new Event("storage"));
    }
    fetchMenu();
  }, [fetchMenu]);

  const handleOpenModifiers = (item: MenuItem) => {
    setActiveItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setActiveItem(null);
  };

  return (
    <EmployeePermissionGuard permissionKey="pos">
      <main className="h-screen flex flex-col overflow-hidden bg-neutral-100 text-neutral-900 font-sans">
        {/* Navbar */}
        <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

        {/* ── MAIN Layout: Unified responsive (Mobile → Tablet → Desktop) ── */}

        {/* Mobile (<md): CategoryCarousel pinned top, grid fills rest */}
        <div className="flex md:hidden flex-col flex-1 overflow-hidden min-h-0">
          {/* Category Strip - top */}
          <div className="flex-shrink-0 px-2 pt-2">
            <CategoryCarousel />
          </div>
          {/* Menu Grid */}
          <div
            id="menu-grid-section-mobile"
            className="flex-1 min-h-0 flex flex-col px-2 pt-2 pb-20"
          >
            <MenuGrid onOpenModifiers={handleOpenModifiers} />
          </div>
        </div>

        {/* Tablet & Desktop (md+): Side-by-side layout */}
        <div className="hidden md:flex flex-1 overflow-hidden p-2.5 md:p-3 gap-2.5 md:gap-3 min-h-0">
          {/* Left Column - Menu Items Grid */}
          <div
            id="menu-grid-section"
            className="flex-1 h-full flex flex-col min-w-0"
          >
            <MenuGrid onOpenModifiers={handleOpenModifiers} />
          </div>

          {/* Right Column - Category Carousel + CartPanel stacked */}
          <div className="w-[240px] md:w-[260px] lg:w-[310px] xl:w-[340px] flex-shrink-0 h-full flex flex-col gap-2.5 md:gap-3">
            <CategoryCarousel />
            <div className="flex-1 min-h-0">
              <CartPanel />
            </div>
          </div>
        </div>

        {/* ── Tablet: Order Type floating button (md–lg) ── */}
        <div className="hidden md:flex lg:hidden fixed bottom-5 left-5 z-30 gap-3">
          <button
            onClick={() =>
              setTabletPanel(tabletPanel === "order" ? null : "order")
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 text-white text-[12px] font-700 shadow-xl shadow-neutral-900/25 hover:bg-neutral-800 transition-all active:scale-95"
          >
            <SlidersHorizontal size={15} />
            Order Type
          </button>
        </div>

        {/* ── Mobile: FAB Buttons (below md) ── */}
        <div className="flex md:hidden fixed bottom-5 left-0 right-0 z-30 px-4 gap-3 justify-between">
          <button
            onClick={() =>
              setTabletPanel(tabletPanel === "order" ? null : "order")
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 text-white text-[12px] font-700 shadow-xl shadow-neutral-900/25 hover:bg-neutral-800 transition-all active:scale-95"
          >
            <SlidersHorizontal size={15} />
            Order Type
          </button>
          <button
            onClick={() =>
              setTabletPanel(tabletPanel === "cart" ? null : "cart")
            }
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-primary text-white text-[12px] font-700 shadow-xl shadow-brand-primary/30 hover:bg-orange-600 transition-all active:scale-95"
          >
            <ShoppingCart size={15} />
            Cart
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-neutral-900 text-white text-[9px] font-700 rounded-full flex items-center justify-center px-1 border-2 border-white">
                {cartItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Tablet/Mobile Panel Overlay: Order Type or Cart ── */}
        {tabletPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
              onClick={() => setTabletPanel(null)}
            />
            {/* Slide-up Panel */}
            <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <span className="text-[13px] font-700 text-neutral-900">
                  {tabletPanel === "order" ? "Order Type" : "Current Order"}
                </span>
                <button
                  onClick={() => setTabletPanel(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-3">
                {tabletPanel === "order" ? (
                  <div className="h-full">
                    <OrderTypePanel />
                  </div>
                ) : (
                  <div className="h-[70vh]">
                    <CartPanel />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Sidebar Drawer Component */}
        <POSSidebarDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab="pos"
          onSelectTab={(tabKey) => {
            if (
              tabKey === "orders" ||
              tabKey === "dashboard" ||
              tabKey === "sales_summary" ||
              tabKey === "expense_payout"
            ) {
              window.location.href = `/employee/orders?tab=${tabKey}`;
            }
          }}
        />

        {/* Modifier Customize Drawer Overlay */}
        <ModifierDrawer
          item={activeItem}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />

        {/* Checkout Modal Overlay */}
        <CheckoutModal />

        {/* Real-time Online Order Banner Alert */}
        <OnlineOrderBanner />
      </main>
    </EmployeePermissionGuard>
  );
}
