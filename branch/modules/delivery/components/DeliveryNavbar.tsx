"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Truck, Clock, ArrowLeft, Menu, Power } from "lucide-react";
import { useDeliveryStore } from "../store/deliveryStore";

interface DeliveryNavbarProps {
  onToggleSidebar?: () => void;
}

export default function DeliveryNavbar({
  onToggleSidebar,
}: DeliveryNavbarProps) {
  const router = useRouter();
  const orders = useDeliveryStore((s) => s.orders);
  const [currentTime, setCurrentTime] = useState("");
  const [branchName, setBranchName] = useState("Restaurant");

  const deliveryCount = orders.filter((o) => o.status !== "delivered").length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rms_branch");
      if (raw) {
        const b = JSON.parse(raw);
        setBranchName(b.name || b.branchName || "Restaurant");
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "America/Edmonton",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="flex items-center justify-between px-5 h-14 bg-neutral-900 text-white font-sans border-b border-white/5">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/8 text-white hover:bg-white/15 transition-colors cursor-pointer"
          onClick={() => router.push("/employee/pos")}
          title="Back to POS Terminal"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-lg bg-brand-primary flex items-center justify-center text-white">
            <Truck size={20} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] lg:text-[15px] font-bold tracking-tight text-white">
              {branchName}
            </span>
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-widest">
              Dispatch System
            </span>
          </div>
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center gap-1.5 text-[13px] lg:text-[14.5px] font-medium text-white/60 tabular-nums">
        <Clock size={14} className="opacity-50" />
        <span>{currentTime}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-brand-primary rounded-lg text-xs lg:text-[13px] font-semibold text-white">
          <Truck size={16} />
          <span>Delivery Orders</span>
          <span className="bg-white text-brand-primary text-[11px] font-extrabold rounded-md px-1.5 py-0.5 min-w-[22px] text-center">
            {deliveryCount}
          </span>
        </div>

        {/* Divider */}
        <div className="h-7 w-px bg-white/10" />

        {/* Employee Profile */}
        <div className="flex items-center gap-2.5">
          <div className="text-right leading-none">
            <p className="text-[12px] lg:text-[14px] font-700 text-white">Hi, Manager</p>
            <span className="text-[10px] font-600 text-brand-primary leading-tight uppercase tracking-wide">
              Manager
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-[11px] font-800 text-white shadow-sm border border-brand-primary-hover/30">
            MG
          </div>
        </div>

        {/* Menu Drawer Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/8 text-white hover:bg-white/15 transition-all cursor-pointer"
            title="Open Sidebar Menu"
          >
            <Menu size={16} />
          </button>
        )}

        {/* Exit/Logout Button */}
        {/* <button
          onClick={() => {
            window.close();
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          title="Exit POS"
        >
          <Power size={14} />
        </button> */}
      </div>
    </nav>
  );
}
