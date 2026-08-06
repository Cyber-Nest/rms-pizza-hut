'use client';

import React, { useState } from 'react';
import { Eye, Smartphone, Store } from 'lucide-react';
import { Order } from '../types';
import { formatLocalDateTime24 } from '../utils/timezone';

interface OrdersTableViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  isServerSide?: boolean;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  entriesPerPage?: number;
  setEntriesPerPage?: (limit: number) => void;
  totalEntries?: number;
}

export default function OrdersTableView({ 
  orders, 
  onSelectOrder,
  isServerSide = false,
  currentPage,
  setCurrentPage,
  entriesPerPage,
  setEntriesPerPage,
  totalEntries
}: OrdersTableViewProps) {
  // ── Local Pagination States (Fallback for client-side) ──
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localEntriesPerPage, setLocalEntriesPerPage] = useState(10);

  // ── 24-Hour Date Formatting (Alberta Timezone) ──
  const formatDate = (dateStr: string) => {
    try {
      return formatLocalDateTime24(dateStr);
    } catch {
      return dateStr;
    }
  };

  // ── Render Status Badge ──
  const renderOrderStatusBadge = (status: string) => {
    let styles = '';
    let label = '';

    switch (status) {
      case 'completed':
        styles = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
        label = 'Completed';
        break;
      case 'cancelled':
        styles = 'bg-red-50 text-red-700 border-red-200/60';
        label = 'Cancelled';
        break;
      case 'ready':
        styles = 'bg-sky-50 text-sky-700 border-sky-200/60';
        label = 'Ready Pick';
        break;
      case 'preparing':
        styles = 'bg-blue-50 text-blue-700 border-blue-200/60';
        label = 'Preparing';
        break;
      case 'pending':
      default:
        styles = 'bg-orange-50 text-brand-primary border-brand-primary-muted/50';
        label = 'Pending';
        break;
    }

    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-750 uppercase tracking-wider inline-flex items-center gap-1.5 border ${styles}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {label}
      </span>
    );
  };

  // ── Render Payment Status Badge ──
  const renderPaymentStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-750 uppercase tracking-wider inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Paid
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-750 uppercase tracking-wider inline-flex items-center gap-1.5 bg-red-50 text-red-750 border border-red-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Unpaid
        </span>
      );
    }
  };

  // ── Pagination Calculations ──
  const activeEntriesPerPage = isServerSide && entriesPerPage !== undefined ? entriesPerPage : localEntriesPerPage;
  const activeCurrentPage = isServerSide && currentPage !== undefined ? currentPage : localCurrentPage;
  const activeSetCurrentPage = isServerSide && setCurrentPage ? setCurrentPage : setLocalCurrentPage;
  const activeSetEntriesPerPage = isServerSide && setEntriesPerPage ? setEntriesPerPage : setLocalEntriesPerPage;

  const totalEntriesCount = isServerSide && totalEntries !== undefined ? totalEntries : orders.length;
  const totalPages = Math.ceil(totalEntriesCount / activeEntriesPerPage);
  
  // Safety check: if currentPage goes out of bounds due to filters
  const activePage = activeCurrentPage > totalPages ? 1 : activeCurrentPage;
  
  const startIndex = (activePage - 1) * activeEntriesPerPage;
  const endIndex = Math.min(startIndex + activeEntriesPerPage, totalEntriesCount);
  const visibleOrders = isServerSide ? orders : orders.slice(startIndex, endIndex);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col min-h-0 font-sans select-none">
      
      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[400px]">
        <table className="w-full text-left text-[11px] text-neutral-600 font-600 border-collapse table-auto">
          <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-550 text-[10px] font-800 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              <th className="px-5 py-3.5">Order #</th>
              <th className="px-5 py-3.5">Customer</th>
              <th className="px-5 py-3.5 text-right">Sub Total</th>
              <th className="px-5 py-3.5 text-right">Grand Total</th>
              <th className="px-5 py-3.5">Order Type</th>
              <th className="px-5 py-3.5">Order Placed</th>
              <th className="px-5 py-3.5">Payment</th>
              <th className="px-5 py-3.5">Order Status</th>
              <th className="px-5 py-3.5">Order Date</th>
              <th className="px-5 py-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visibleOrders.length > 0 ? (
              visibleOrders.map((order, index) => {
                const subTotalDisplay = order.subtotal;
                const grandTotalDisplay = order.total;
                
                const actualOrderNum = order.orderNumber;
                const shortNum = actualOrderNum.startsWith('#') ? actualOrderNum : `#${actualOrderNum}`;

                // Order Type Badge style
                const typeBadgeClass = {
                  takeout: 'bg-orange-50 text-brand-primary border-orange-100/70',
                  'drive-through': 'bg-purple-50 text-purple-600 border-purple-100/70',
                  'dine-in': 'bg-blue-50 text-blue-600 border-blue-100/70',
                  delivery: 'bg-amber-50 text-amber-700 border-amber-100/70',
                }[order.orderType] || 'bg-neutral-50 text-neutral-600 border-neutral-100';

                const formattedType = {
                  takeout: 'Take-Out',
                  'drive-through': 'Drive-Thru',
                  'dine-in': 'Dine-In',
                  delivery: 'Delivery',
                }[order.orderType] || order.orderType;

                // Customer helper flags
                const isSkipOrder = order.orderSource === 'skip';
                const hasCustomer = !!(order.customer?.name && order.customer.name.trim() !== '' && order.customer.name !== 'No Name');
                const hasPhone = !!(order.customer?.phone && order.customer.phone.trim() !== '' && order.customer.phone !== 'No phone');
                
                const customerInitials = isSkipOrder
                  ? 'SK'
                  : (hasCustomer && order.customer?.name
                      ? order.customer.name.slice(0, 2)
                      : 'NN');

                const avatarClass = isSkipOrder
                  ? 'bg-orange-50 border-orange-200 text-orange-700 font-750'
                  : hasCustomer
                    ? 'bg-brand-primary-light border-brand-primary-muted text-brand-primary'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-400';

                return (
                  <tr
                    key={order._id || index}
                    className="hover:bg-orange-50/15 border-b border-neutral-100 transition-colors bg-white last:border-b-0"
                  >
                    {/* Order Number in a nice mono tag */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-[10.5px] font-700 text-neutral-700 bg-neutral-100/80 px-2.5 py-1 rounded border border-neutral-200/80 tracking-wide shadow-3xs">
                        {shortNum}
                      </span>
                    </td>

                    {/* Customer with profile avatar initials */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-800 uppercase border ${avatarClass}`}>
                          {customerInitials}
                        </div>
                        <div className="leading-tight">
                          <p className={`text-[11.5px] ${
                            isSkipOrder || hasCustomer
                              ? 'font-800 text-neutral-800'
                              : 'font-700 text-neutral-400'
                          }`}>
                            {isSkipOrder ? (order.customer?.name || 'No Digits') : (hasCustomer ? order.customer?.name : 'No Name')}
                          </p>
                          {!isSkipOrder && hasCustomer && hasPhone && (
                            <p className="text-[9.5px] text-neutral-400 font-550 mt-0.5">
                              {order.customer?.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sub Total */}
                    <td className="px-5 py-4 text-right font-700 text-neutral-450 text-[11.5px]">
                      ${subTotalDisplay.toFixed(2)}
                    </td>

                    {/* Grand Total */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-900 text-[12.5px] text-neutral-900">
                        ${grandTotalDisplay.toFixed(2)}
                      </span>
                    </td>

                    {/* Order Type */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9.5px] font-750 uppercase tracking-wider ${typeBadgeClass}`}>
                        {formattedType}
                      </span>
                    </td>

                    {/* Order Placed (Source) */}
                    <td className="px-5 py-4">
                      {order.orderSource === 'pos' ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1.5 bg-neutral-50 text-neutral-600 border-neutral-200">
                          <Store size={10} />
                          <span>POS System</span>
                        </span>
                      ) : order.orderSource === 'doordash' ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1.5 bg-red-50 text-red-750 border-red-200/60">
                          <Smartphone size={10} />
                          <span>Online - DoorDash</span>
                        </span>
                      ) : order.orderSource === 'skip' ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1.5 bg-orange-50 text-orange-755 border-orange-200/60">
                          <Smartphone size={10} />
                          <span>Online - Skip</span>
                        </span>
                      ) : order.orderSource === 'ubereats' ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-750 border-emerald-200/60">
                          <Smartphone size={10} />
                          <span>Online - Uber Eats</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border-sky-100">
                          <Smartphone size={10} />
                          <span>Online</span>
                        </span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="px-5 py-4">
                      {renderPaymentStatusBadge(order.paymentStatus)}
                    </td>

                    {/* Order Status */}
                    <td className="px-5 py-4">
                      {renderOrderStatusBadge(order.status)}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-neutral-450 font-550 text-[11px]">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Action Eye Button */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-brand-primary-light border border-neutral-200 hover:border-brand-primary/30 text-neutral-500 hover:text-brand-primary flex items-center justify-center transition-all duration-150 active:scale-90 mx-auto cursor-pointer shadow-xs"
                        title="View details"
                      >
                        <Eye size={13} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="px-5 py-16 text-center text-neutral-450 font-700">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Table Pagination Footer */}
      <div className="bg-neutral-50/50 border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-700 text-neutral-500 select-none">
        
        {/* Left: Entries dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-450 font-550">Show</span>
          <select
            value={activeEntriesPerPage}
            onChange={(e) => {
              activeSetEntriesPerPage(Number(e.target.value));
              activeSetCurrentPage(1); // Reset to first page
            }}
            className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 font-600 focus:outline-none focus:border-brand-primary cursor-pointer hover:border-neutral-300 transition-colors"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-neutral-450 font-550">entries</span>
        </div>

        {/* Middle: Count text */}
        <div className="text-neutral-400 font-550 text-[11.5px]">
          {totalEntriesCount > 0 ? (
            <span>Showing {startIndex + 1} to {endIndex} of {totalEntriesCount} entries</span>
          ) : (
            <span>Showing 0 to 0 of 0 entries</span>
          )}
        </div>

        {/* Right: Pagination buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={activePage === 1}
            onClick={() => activeSetCurrentPage(Math.max(1, activePage - 1))}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all ${
              activePage === 1
                ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer'
            }`}
          >
            &larr;
          </button>

          {Array.from({ length: totalPages }).map((_, pageIdx) => {
            const pNum = pageIdx + 1;
            const active = activePage === pNum;
            return (
              <button
                key={pNum}
                type="button"
                onClick={() => activeSetCurrentPage(pNum)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all cursor-pointer text-[10.5px] ${
                  active
                    ? 'bg-brand-primary text-white shadow-sm border border-brand-primary'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {pNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={activePage === totalPages || totalPages === 0}
            onClick={() => activeSetCurrentPage(Math.min(totalPages, activePage + 1))}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all ${
              activePage === totalPages || totalPages === 0
                ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer'
            }`}
          >
            &rarr;
          </button>
        </div>

      </div>
    </div>
  );
}
