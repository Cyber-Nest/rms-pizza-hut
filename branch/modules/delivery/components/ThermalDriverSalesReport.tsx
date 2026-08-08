"use client";

import React from "react";
import { ChefHat } from "lucide-react";

export interface DriverReportOrder {
  ticketName: string;
  total: number;
  dc: number;
  pd: string;
}

export interface DriverDropSummaryData {
  employeeId?: string;
  employeeName?: string;
  reportDate?: string;
  reportTime?: string;
  orders?: DriverReportOrder[];
  totalOrders?: number;
  totalCancels?: number;
  totalSales?: number;
  closedSales?: number;
  closedCharges?: number;
  prepaidSales?: number;
  totalNewSales?: number;
  terminalSales?: number;
  terminalTips?: number;
  cashSales?: number;
  saleDue?: number;
  openBanks?: number;
  cashDropped?: number;
  creditCardDrop?: number;
  otherDrops?: number;
  checksDropped?: number;
  totalDue?: number;
  totalPrepaidTips?: number;
  paidPrepaidTips?: number;
  prepaidTipsDue?: number;
  driverBaseCommission?: number;
  driverAdditionalCommission?: number;
  driverCommissionReason?: string;
  driverTotalCommission?: number;
  totalTips?: number;
  totalDriverEarning?: number;
  totalCommissionDue?: number;
}

interface ThermalDriverSalesReportProps {
  data?: DriverDropSummaryData;
}

const fmt = (val?: number) => (typeof val === "number" && !isNaN(val) ? val.toFixed(2) : "0.00");

export default function ThermalDriverSalesReport({ data }: ThermalDriverSalesReportProps) {
  if (!data) return null;

  const orders = data.orders || [];

  return (
    <div className="thermal-receipt-container font-mono text-neutral-900 text-[11px] leading-tight select-none">
      <div className="w-[80mm] max-w-full bg-white p-4 mx-auto border border-dashed border-neutral-300 shadow-sm print:shadow-none print:border-none">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center justify-center text-center mb-2">
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <ChefHat size={20} className="text-black stroke-[2.5]" />
            <div className="leading-none text-left font-sans">
              <span className="text-sm font-900 tracking-tight block">
                Pizza
              </span>
              <span className="text-[10px] font-800 tracking-widest uppercase text-black block">
                Hut
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-2 space-y-0.5 border-t border-b border-dashed border-neutral-800 py-1.5">
          <p className="font-800 text-[12px] tracking-wide">------- Employee Sales Report -------</p>
          <div className="flex justify-between text-[10.5px] font-700 pt-1">
            <span>Employee: {data.employeeId || "0"} - {data.employeeName || "DRIVER"}</span>
          </div>
          <div className="flex justify-between text-[10px] text-neutral-700 font-600">
            <span>{data.reportDate || ""}</span>
            <span>{data.reportTime || ""}</span>
          </div>
        </div>

        {/* Order Details Header */}
        <div className="text-center font-800 text-[11px] mt-2 mb-1">
          ------- Order Details -------
        </div>
        <div className="border-b border-dashed border-neutral-800 pb-1 font-800 text-[10px] grid grid-cols-12 uppercase">
          <span className="col-span-6">Ticket Name</span>
          <span className="col-span-2 text-right">Total</span>
          <span className="col-span-2 text-right">DC</span>
          <span className="col-span-2 text-right">PD</span>
        </div>

        {/* Orders List */}
        <div className="space-y-1 my-2 border-b border-dashed border-neutral-800 pb-2">
          {orders.length > 0 ? (
            orders.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[10px] font-600 items-center">
                <span className="col-span-6 truncate pr-1">{item.ticketName}</span>
                <span className="col-span-2 text-right font-700">{fmt(item.total)}</span>
                <span className="col-span-2 text-right font-700">{fmt(item.dc)}</span>
                <span className="col-span-2 text-right font-800 uppercase">{item.pd}</span>
              </div>
            ))
          ) : (
            <p className="text-center text-[10px] text-neutral-500 py-1">No orders delivered</p>
          )}
        </div>

        {/* Coupon Reconciliation Section (Commented out) */}
        {/* <div className="text-center font-800 text-[10.5px] my-1">
          ------- Coupon Reconciliation -------
        </div> */}

        {/* Employee Banks / Drops Details (Commented out) */}
        {/* <div className="text-center font-800 text-[10.5px] my-1">
          ------- Employee Banks/Drops Details -------
        </div> */}

        {/* Employee Sales Summary (Exact Clean Match with Image 1 Excel Sheet) */}
        <div className="border-t border-dashed border-neutral-800 pt-1.5 mt-2 space-y-1 text-[10px]">
          <div className="text-center font-800 text-[11px] mb-1">
            ------- Employee Sales Summary -------
          </div>
          
          <div className="flex justify-between">
            <span>Total Orders.....:</span>
            <span className="font-800">{data.totalOrders ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Cancels....:</span>
            <span className="font-800">{data.totalCancels ?? 0}</span>
          </div>

          <div className="pt-1.5 space-y-0.5">
            <div className="flex justify-between font-700">
              <span>Total Sales......:</span>
              <span>{fmt(data.totalSales)}</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>- Prepaid Sales..:</span>
              <span>{fmt(data.prepaidSales)}</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>- Prepaid Tips...:</span>
              <span>{fmt(data.totalPrepaidTips)}</span>
            </div>
            <div className="flex justify-between font-800 pt-0.5 border-t border-neutral-300">
              <span>= Total New Sales:</span>
              <span>{fmt(data.totalNewSales)}</span>
            </div>
          </div>

          <div className="pt-1 space-y-0.5 text-neutral-700">
            <div className="flex justify-between">
              <span>- Terminal Sales.:</span>
              <span>{fmt(data.terminalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Terminal Tips..:</span>
              <span>{fmt(data.terminalTips)}</span>
            </div>
            <div className="flex justify-between font-700">
              <span>- Cash Sales.....:</span>
              <span>{fmt(data.cashSales)}</span>
            </div>
            <div className="flex justify-between font-900 border-t border-black pt-0.5 text-black text-[11px]">
              <span>= Sale Due.......:</span>
              <span>{fmt(data.saleDue)}</span>
            </div>
          </div>
        </div>

        {/* Tips & Driver Commission Summary */}
        <div className="border-t border-dashed border-neutral-800 pt-2 mt-2 space-y-1 text-[10.5px]">
          <div className="flex justify-between font-700">
            <span>Total Prepaid Tips......:</span>
            <span>{fmt(data.totalPrepaidTips)}</span>
          </div>
          <div className="flex justify-between font-700">
            <span>Total Terminal Tips.....:</span>
            <span>{fmt(data.terminalTips)}</span>
          </div>
          <div className="flex justify-between font-800 text-[11px] border-t border-dotted border-neutral-300 pt-0.5">
            <span>(Total Tips Due:</span>
            <span>{fmt((data.totalPrepaidTips || 0) + (data.terminalTips || 0))})</span>
          </div>
          <div className="flex justify-between font-900 text-[11px] text-amber-700 pt-1">
            <span>(Total Commission Due:</span>
            <span>{fmt(data.totalCommissionDue ?? data.driverTotalCommission ?? data.driverBaseCommission)})</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 text-[9px] text-neutral-500 font-sans">
          Printed for Driver Drop Reconciliation
        </div>

      </div>
    </div>
  );
}
