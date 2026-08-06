'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Search, Calendar, X, Edit, Eye, Users, Mail, Phone, MapPin, CalendarRange } from 'lucide-react';
import toast from 'react-hot-toast';
import PosNavbar from './PosNavbar';
import POSSidebarDrawer from './POSSidebarDrawer';
import CustomerModal from './CustomerModal';
import { usePosStore } from '../store/pos.store';
import { getLocalTodayStr, getLocalDateStr, formatLocalDateTime12 } from '../utils/timezone';

interface CustomerRecord {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  updatedDate: string;
  lastOrderDate: string;
  address?: string;
  postalCode?: string;
}

export default function CustomersDashboard() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<CustomerRecord | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const { setCustomer } = usePosStore();

  // ── Fetch Customers from API ──
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const rawBranch = localStorage.getItem('rms_branch');
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/orders/customers`, {
        params: {
          ...(branchId ? { branchId } : {}),
        },
      });
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      toast.error('Could not load customer records from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const getLocalDateStr = (dateInput: string | Date) => {
    try {
      return getLocalDateStr(dateInput);
    } catch {
      return '';
    }
  };

  // ── Format Date for Display (MM/DD/YYYY HH:MM AM/PM) in local timezone ──
  const formatDate = (dateStr: string) => {
    try {
      return formatLocalDateTime12(dateStr);
    } catch {
      return dateStr;
    }
  };

  const customersList = customers;

  // ── Filtered Customers (Date and Keyword Search) ──
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      // Date Filter (Last Order Date matches selected date)
      if (selectedDate) {
        const cDateStr = getLocalDateStr(c.lastOrderDate);
        if (cDateStr !== selectedDate) return false;
      }

      // Keyword Search Filter
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const email = c.email.toLowerCase();
        const phone = c.phone;
        const address = (c.address || '').toLowerCase();

        return (
          fullName.includes(kw) ||
          email.includes(kw) ||
          phone.includes(kw) ||
          address.includes(kw)
        );
      }

      return true;
    });
  }, [customersList, selectedDate, searchKeyword]);

  // ── Pagination Calculations ──
  const totalEntries = filteredCustomers.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const activePage = currentPage > totalPages ? 1 : currentPage;
  const startIndex = (activePage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
  const visibleCustomers = filteredCustomers.slice(startIndex, endIndex);

  // ── Edit Customer Handler ──
  const handleEditCustomer = (customer: CustomerRecord) => {
    setCustomer({
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      postalCode: customer.postalCode,
    });
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchKeyword('');
    setSelectedDate('');
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* Control Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px]">
            Customers
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker Input */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] font-600 text-neutral-700 hover:border-neutral-355 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
            />
          </div>

          {/* Keyword Search Input */}
          <div className="relative w-[220px] sm:w-[280px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search By Name, Email, Phone no, Address"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary hover:border-neutral-355 focus:bg-white transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Clear Filters Button */}
          {(searchKeyword || selectedDate) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-600 text-neutral-500 hover:text-neutral-800 transition-all cursor-pointer"
            >
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 bg-brand-bg flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2">
            <span className="animate-spin text-xl">⏳</span>
            <span>Fetching updated customer records...</span>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col min-h-0 font-sans select-none">
            
            {/* Table Container */}
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[400px]">
              <table className="w-full text-left text-[11px] text-neutral-600 font-600 border-collapse table-auto">
                <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-550 text-[10px] font-800 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-5 py-3.5">First Name</th>
                    <th className="px-5 py-3.5">Last Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Phone No</th>
                    <th className="px-5 py-3.5">Updated Date</th>
                    <th className="px-5 py-3.5">Last Order Date</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleCustomers.length > 0 ? (
                    visibleCustomers.map((customer, index) => {
                      const initials = `${customer.firstName.slice(0, 1)}${customer.lastName.slice(0, 1)}`.toUpperCase();

                      return (
                        <tr
                          key={customer.phone || index}
                          className="hover:bg-orange-50/15 border-b border-neutral-100 transition-colors bg-white last:border-b-0"
                        >
                          {/* First Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-800 uppercase border bg-brand-primary-light border-brand-primary-muted text-brand-primary">
                                {initials || 'NN'}
                              </div>
                              <span className="font-800 text-neutral-800 text-[11.5px] uppercase">
                                {customer.firstName}
                              </span>
                            </div>
                          </td>

                          {/* Last Name */}
                          <td className="px-5 py-4 font-800 text-neutral-800 text-[11.5px] uppercase">
                            {customer.lastName}
                          </td>

                          {/* Email */}
                          <td className="px-5 py-4 font-700 text-neutral-600 text-[11.5px]">
                            {customer.email}
                          </td>

                          {/* Phone No */}
                          <td className="px-5 py-4 font-700 text-neutral-700 text-[11.5px] font-mono">
                            {customer.phone}
                          </td>

                          {/* Updated Date */}
                          <td className="px-5 py-4 text-neutral-450 font-550 text-[11px]">
                            {formatDate(customer.updatedDate)}
                          </td>

                          {/* Last Order Date */}
                          <td className="px-5 py-4 text-neutral-450 font-550 text-[11px]">
                            {formatDate(customer.lastOrderDate)}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleEditCustomer(customer)}
                                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-orange-50 border border-neutral-200 hover:border-brand-primary/30 text-neutral-500 hover:text-brand-primary flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                                title="Edit customer details"
                              >
                                <Edit size={12} strokeWidth={2.5} />
                              </button>

                              {/* View Button */}
                              <button
                                onClick={() => setViewCustomer(customer)}
                                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-orange-50 border border-neutral-200 hover:border-brand-primary/30 text-neutral-500 hover:text-brand-primary flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                                title="View customer profile"
                              >
                                <Eye size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-neutral-450 font-700">
                        No customers found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-neutral-50/50 border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-700 text-neutral-500 select-none">
              
              {/* Left Entries dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-450 font-550">Show</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
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

              {/* Middle count */}
              <div className="text-neutral-400 font-550 text-[11.5px]">
                {totalEntries > 0 ? (
                  <span>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</span>
                ) : (
                  <span>Showing 0 to 0 of 0 entries</span>
                )}
              </div>

              {/* Right pagination */}
              <div className="flex items-center gap-1">
                <button
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      onClick={() => setCurrentPage(pNum)}
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
                  disabled={activePage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
        )}
      </div>

      {/* Sidebar Drawer Component */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="customers"
        onSelectTab={(tabKey) => {
          if (tabKey === 'orders' || tabKey === 'dashboard' || tabKey === 'sales_summary' || tabKey === 'expense_payout') {
            window.location.href = `/employee/orders?tab=${tabKey}`;
          }
        }}
      />

      {/* workable Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Refresh list to show any edits
          fetchCustomers();
        }}
      />

      {/* View Customer Details Overlay Modal */}
      {viewCustomer && (
        <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up border border-neutral-200">
            {/* Modal Header */}
            <div className="bg-brand-primary text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-850 text-xs uppercase tracking-wider flex items-center gap-2">
                <Users size={15} />
                <span>Customer Profile</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="text-white hover:text-white/80 transition-colors flex items-center gap-0.5 cursor-pointer active:scale-95"
              >
                Close <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs font-600 text-neutral-700 bg-[#FAF9F5]">
              <div className="flex items-center gap-3 border-b border-neutral-200/50 pb-4">
                <div className="w-12 h-12 bg-brand-primary-light border border-brand-primary-muted rounded-full flex items-center justify-center text-md font-900 text-brand-primary uppercase">
                  {customerInitials(viewCustomer)}
                </div>
                <div>
                  <h4 className="text-sm font-900 text-neutral-900 leading-tight uppercase">
                    {viewCustomer.firstName} {viewCustomer.lastName}
                  </h4>
                  <p className="text-[9px] text-neutral-400 font-800 uppercase mt-1 tracking-wider">Registered Client</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
                    <Phone size={13} />
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 font-800 uppercase block tracking-wider">Phone Number</span>
                    <span className="text-[11.5px] text-neutral-800 font-mono font-700">{viewCustomer.phone}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
                    <Mail size={13} />
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 font-800 uppercase block tracking-wider">Email Address</span>
                    <span className="text-[11.5px] text-neutral-805">{viewCustomer.email}</span>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
                    <MapPin size={13} />
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 font-800 uppercase block tracking-wider">Address Detail</span>
                    <span className="text-[11px] text-neutral-800 leading-relaxed font-700">
                      {viewCustomer.address || <span className="text-neutral-400 italic">No address selected</span>}
                      {viewCustomer.postalCode && ` (${viewCustomer.postalCode})`}
                    </span>
                  </div>
                </div>

                {/* Last Order Date */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
                    <CalendarRange size={13} />
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 font-800 uppercase block tracking-wider">Last Order Placed</span>
                    <span className="text-[11.5px] text-neutral-850">
                      {formatDate(viewCustomer.lastOrderDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex items-center justify-end select-none">
              <button
                type="button"
                onClick={() => setViewCustomer(null)}
                className="px-5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-800 uppercase rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Helpers
function customerInitials(customer: CustomerRecord) {
  return `${customer.firstName.slice(0, 1)}${customer.lastName.slice(0, 1)}`.toUpperCase();
}
