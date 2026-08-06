"use client";

import React, { useMemo } from "react";
import { Eye } from "lucide-react";
import { Order } from "../types";

interface CashOutSummaryViewProps {
  orders: Order[];
  startDate: string;
  endDate: string;
  onViewDetails?: (employeeName: string) => void;
}

export default function CashOutSummaryView({
  orders,
  startDate,
  endDate,
  onViewDetails,
}: CashOutSummaryViewProps) {
  // Group orders by creator/employee
  const cashOutData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include full end day

    // Filter orders by date range and completed status
    const inRangeOrders = orders.filter((o) => {
      const date = new Date(o.createdAt);
      return date >= start && date <= end && o.status === "completed";
    });

    if (inRangeOrders.length === 0) {
      return [];
    }

    // Grouping
    const groups: {
      [key: string]: {
        employeeName: string;
        orderCount: number;
        lastCashOut: string;
        totalAmount: number;
      };
    } = {};

    inRangeOrders.forEach((order) => {
      const empName =
        order.customer?.name === "No Name" || !order.customer?.name
          ? "Manager"
          : order.customer.name;

      if (!groups[empName]) {
        groups[empName] = {
          employeeName: empName,
          orderCount: 0,
          lastCashOut: order.createdAt,
          totalAmount: 0,
        };
      }

      groups[empName].orderCount += 1;
      groups[empName].totalAmount += order.total;

      // Keep latest date
      if (new Date(order.createdAt) > new Date(groups[empName].lastCashOut)) {
        groups[empName].lastCashOut = order.createdAt;
      }
    });

    return Object.values(groups);
  }, [orders, startDate, endDate]);

  // ── Date Formatting ──
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex flex-col font-sans select-none min-h-[400px]">
      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-left text-[11px] text-neutral-600 font-600 border-collapse table-auto">
          <thead>
            {/* Brand Orange Header Bar */}
            <tr className="bg-brand-primary text-white font-900 uppercase text-[10px] tracking-wider text-center border-b border-brand-primary-muted/20">
              <th colSpan={5} className="py-2.5">
                Cash Out By Employee
              </th>
            </tr>
            {/* Table Column Headers */}
            <tr className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[10px] border-b border-neutral-800">
              <th className="px-5 py-3.5 text-left">Employee</th>
              <th className="px-5 py-3.5 text-center"># of Orders</th>
              <th className="px-5 py-3.5 text-center">Cash Out Date & Time</th>
              <th className="px-5 py-3.5 text-right">Total Amount</th>
              <th className="px-5 py-3.5 text-center">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {cashOutData.length > 0 ? (
              cashOutData.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-neutral-50/50 transition-colors bg-white last:border-b-0"
                >
                  {/* Employee Name */}
                  <td className="px-5 py-4 text-left font-800 text-neutral-800 text-[11.5px]">
                    {item.employeeName}
                  </td>

                  {/* Number of Orders */}
                  <td className="px-5 py-4 text-center font-700 text-neutral-600">
                    {item.orderCount}
                  </td>

                  {/* Cash Out Time */}
                  <td className="px-5 py-4 text-center text-neutral-450 font-550">
                    {formatDate(item.lastCashOut)}
                  </td>

                  {/* Total Amount */}
                  <td className="px-5 py-4 text-right font-900 text-neutral-900 text-[12.5px]">
                    ${item.totalAmount.toFixed(2)}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => onViewDetails?.(item.employeeName)}
                      className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-brand-primary-light border border-neutral-200 hover:border-brand-primary/30 text-neutral-500 hover:text-brand-primary flex items-center justify-center transition-all duration-150 active:scale-90 mx-auto cursor-pointer shadow-xs"
                      title="View details"
                    >
                      <Eye size={13} strokeWidth={2.5} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-16 text-center text-neutral-400 font-800"
                >
                  No Record Found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
