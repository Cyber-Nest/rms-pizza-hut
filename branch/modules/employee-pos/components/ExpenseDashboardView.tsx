'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Plus, RefreshCw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AddExpenseModal from './AddExpenseModal';
import { getLocalTodayStr } from '../utils/timezone';

export default function ExpenseDashboardView() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeesList, setEmployeesList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchRealEmployees = async () => {
      try {
        let branchId: string | undefined = undefined;
        if (typeof window !== "undefined") {
          const rawBranch = localStorage.getItem("rms_branch");
          if (rawBranch) {
            try {
              const b = JSON.parse(rawBranch);
              branchId = b._id;
            } catch (e) {}
          }
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${apiUrl}/employees`, {
          params: { ...(branchId ? { branchId } : {}) },
        });
        if (res.data?.success && Array.isArray(res.data.data)) {
          const emps = res.data.data.map((emp: any) => ({
            id: emp._id,
            name: emp.name || emp.fullName || "Employee",
          }));
          setEmployeesList(emps);
        }
      } catch (err) {
        console.warn("Could not fetch real employees for expense filter", err);
      }
    };
    fetchRealEmployees();
  }, []);

  const fetchExpenses = useCallback(async () => {
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/expenses`, {
        params: {
          date: selectedDate || undefined,
          employeeName: selectedEmployee || undefined,
          search: searchKeyword || undefined,
          ...(branchId ? { branchId } : {})
        }
      });
      if (res.data?.success) {
        setExpenses(res.data.data);
      }
    } catch (err) {
      console.warn('Backend server unreachable, using clean empty expense list');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedEmployee, searchKeyword]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return (
    <div className="flex-1 overflow-y-auto space-y-5 pb-10 select-none font-sans text-neutral-900 pr-1">
      
      {/* Control / Filters Bar (Polished matching reference) */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Show entries */}
        <div className="flex items-center gap-2 text-xs lg:text-[13.5px] font-700 text-neutral-600">
          <span>Show</span>
          <select 
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            className="px-3 py-1.5 rounded-full border border-neutral-300 bg-neutral-50 font-800 text-neutral-900 focus:outline-hidden cursor-pointer shadow-2xs hover:bg-white transition-all"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        {/* Filters right side */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Refresh button */}
          <button
            onClick={fetchExpenses}
            className="p-2 rounded-full bg-neutral-50 border border-neutral-300 text-neutral-600 hover:text-brand-primary hover:bg-white transition-all cursor-pointer shadow-2xs"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-300 bg-neutral-50/70 text-xs font-700 text-neutral-700 shadow-2xs hover:bg-white transition-all">
            <Calendar size={14} className="text-brand-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-hidden font-800 text-neutral-900 cursor-pointer"
            />
          </div>

          {/* Select Employee Dropdown */}
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-4 py-1.5 rounded-full border border-neutral-300 bg-neutral-50/70 text-xs font-700 text-neutral-700 focus:outline-hidden cursor-pointer shadow-2xs hover:bg-white transition-all"
          >
            <option value="">Select Employee</option>
            <option value="Manager">Manager</option>
            {employeesList.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search By Keyword"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-full border border-neutral-300 bg-neutral-50/70 text-xs font-650 text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-brand-primary focus:outline-hidden shadow-2xs transition-all w-44 sm:w-56"
            />
          </div>

          {/* Add Expense Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-brand-primary hover:bg-orange-600 text-white text-xs font-900 uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer ml-auto sm:ml-0"
          >
            <Plus size={15} />
            <span>Add Expense/Payout</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs lg:text-[13px] whitespace-nowrap">
            <thead>
              <tr className="bg-neutral-900 text-white font-800 text-[10px] lg:text-[11.5px] uppercase tracking-wider border-b border-neutral-800">
                <th className="py-3 px-4">Expense Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Expense Date</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">PST</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">HST</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400 font-600">Loading expense records...</td>
                </tr>
              ) : expenses && expenses.length > 0 ? (
                expenses.map((item) => (
                  <tr key={item._id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className={`px-3 py-1 rounded-full text-[9.5px] font-900 uppercase tracking-wider ${item.expenseType === 'employee' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                        {item.expenseType === 'employee' ? `Employee (${item.employeeName || 'Manager'})` : 'Store'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-750 text-neutral-900">{item.category}</td>
                    <td className="py-3.5 px-4 text-neutral-600 max-w-xs truncate">{item.description || '-'}</td>
                    <td className="py-3.5 px-4">{new Date(item.expenseDate).toLocaleDateString("en-US", { timeZone: "America/Edmonton", month: "2-digit", day: "2-digit", year: "numeric" })}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wide ${item.paymentMode === 'card' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                        {item.paymentMode || 'cash'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-900 text-brand-primary">${Number(item.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-neutral-500">${Number(item.pst || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-neutral-500">${Number(item.gst || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-neutral-500">${Number(item.hst || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-neutral-400 text-[11px]">{new Date(item.createdAt).toLocaleDateString("en-US", { timeZone: "America/Edmonton", month: "2-digit", day: "2-digit", year: "numeric" })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-neutral-400 font-600 text-xs">No data available in table</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="px-4 py-3 bg-neutral-50/80 border-t border-neutral-200/80 flex items-center justify-between text-xs lg:text-[13px] text-neutral-500 font-600">
          <span>Showing {expenses.length} to {expenses.length} of {expenses.length} entries</span>
          <div className="flex items-center gap-1">
            <button disabled className="px-3 py-1 rounded-lg border border-neutral-200 bg-white opacity-50 cursor-not-allowed">Previous</button>
            <button disabled className="px-3 py-1 rounded-lg border border-neutral-200 bg-white opacity-50 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
