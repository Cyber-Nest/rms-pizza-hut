'use client';

import React, { useState, useMemo } from 'react';
import { Eye, Smartphone, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { Order } from '../types';

interface FailedTransactionsViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  searchKeyword: string;
  statusFilter: string;
  selectedDate: string;
}

export default function FailedTransactionsView({
  orders,
  onSelectOrder,
  searchKeyword,
  statusFilter,
  selectedDate
}: FailedTransactionsViewProps) {

  // Local Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // ── Date Formatting ──
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
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
        styles = 'bg-red-55 text-red-750 border-red-200/60';
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
        <span className="px-2.5 py-1 rounded-full text-[10px] font-750 uppercase tracking-wider inline-flex items-center gap-1.5 bg-red-55 text-red-750 border border-red-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Failed/Unpaid
        </span>
      );
    }
  };

  // ── Filter Failed/Cancelled Transactions ──
  const filteredFailedTransactions = useMemo(() => {
    return orders.filter((order) => {
      // 1. Must be failed/cancelled (either status is cancelled or paymentStatus is unpaid)
      const isFailed = order.status === 'cancelled' || order.paymentStatus === 'unpaid';
      if (!isFailed) return false;

      // 2. Date filter (if selectedDate is set)
      if (selectedDate) {
        const orderDateStr = order.createdAt.slice(0, 10);
        if (orderDateStr !== selectedDate) return false;
      }

      // 3. Keyword Search filter
      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase().trim();
        const numMatch = order.orderNumber.toLowerCase().includes(kw);
        const nameMatch = order.customer?.name?.toLowerCase().includes(kw) || false;
        const phoneMatch = order.customer?.phone?.includes(kw) || false;
        if (!numMatch && !nameMatch && !phoneMatch) return false;
      }

      // 4. Status Filter
      if (statusFilter !== '') {
        if (order.status !== statusFilter) return false;
      }

      return true;
    });
  }, [orders, searchKeyword, statusFilter, selectedDate]);

  // ── Pagination calculations ──
  const totalEntries = filteredFailedTransactions.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const activePage = currentPage > totalPages ? 1 : currentPage;
  
  const startIndex = (activePage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
  const visibleTransactions = filteredFailedTransactions.slice(startIndex, endIndex);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col min-h-[450px] font-sans select-none">
      
      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-left text-[11px] text-neutral-600 font-600 border-collapse table-auto">
          <thead className="bg-neutral-900 text-white border-b border-neutral-200 text-[10px] font-800 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3.5">Order #</th>
              <th className="px-5 py-3.5">Customer Name</th>
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
            {visibleTransactions.length > 0 ? (
              visibleTransactions.map((order, idx) => {
                const actualOrderNum = order.orderNumber;
                const shortNum = actualOrderNum.startsWith('#') ? actualOrderNum : `#${actualOrderNum}`;

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

                const hasCustomer = !!(order.customer?.name && order.customer.name.trim() !== '' && order.customer.name !== 'No Name');
                const hasPhone = !!(order.customer?.phone && order.customer.phone.trim() !== '' && order.customer.phone !== 'No phone');
                const customerInitials = hasCustomer && order.customer?.name ? order.customer.name.slice(0, 2) : 'NN';

                return (
                  <tr key={order._id || idx} className="hover:bg-neutral-50/50 border-b border-neutral-100 transition-colors bg-white last:border-b-0">
                    
                    {/* Order Number */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-[10.5px] font-700 text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {shortNum}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-800 uppercase border ${
                          hasCustomer ? 'bg-orange-50 border-orange-150 text-brand-primary' : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                        }`}>
                          {customerInitials}
                        </div>
                        <div className="leading-tight">
                          <p className={`text-[11.5px] ${hasCustomer ? 'font-800 text-neutral-800' : 'font-700 text-neutral-400'}`}>
                            {hasCustomer ? order.customer?.name : 'No Name'}
                          </p>
                          {hasCustomer && hasPhone && (
                            <p className="text-[9.5px] text-neutral-450 font-550 mt-0.5">
                              {order.customer?.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sub Total */}
                    <td className="px-5 py-4 text-right font-750 text-neutral-500 text-[11.5px]">
                      ${order.subtotal.toFixed(2)}
                    </td>

                    {/* Grand Total */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-900 text-[12.5px] text-neutral-900">
                        ${order.total.toFixed(2)}
                      </span>
                    </td>

                    {/* Order Type */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9.5px] font-750 uppercase tracking-wider ${typeBadgeClass}`}>
                        {formattedType}
                      </span>
                    </td>

                    {/* Placed */}
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

                    {/* Payment */}
                    <td className="px-5 py-4">
                      {renderPaymentStatusBadge(order.paymentStatus)}
                    </td>

                    {/* Order Status */}
                    <td className="px-5 py-4">
                      {renderOrderStatusBadge(order.status)}
                    </td>

                    {/* Order Date */}
                    <td className="px-5 py-4 text-neutral-450 font-550 text-[11px]">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Actions */}
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
                <td colSpan={10} className="px-5 py-16 text-center text-neutral-400 font-700">
                  No data available in table
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalEntries > 0 && (
        <div className="bg-white border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500 font-600 select-none">
          
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-neutral-200 rounded px-2 py-0.5 bg-neutral-50 focus:outline-none focus:border-brand-primary cursor-pointer font-700"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
          </div>

          <div className="flex items-center gap-1.5 select-none text-[10.5px]">
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
                activePage === 1
                  ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
                  activePage === p
                    ? 'bg-brand-primary text-white font-800 border border-brand-primary'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
                activePage >= totalPages
                  ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
