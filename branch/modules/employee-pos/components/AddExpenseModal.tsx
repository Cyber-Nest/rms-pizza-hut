'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getLocalTodayStr } from '../utils/timezone';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [category, setCategory] = useState('Store Maintenance');
  const [expenseType, setExpenseType] = useState<'employee' | 'store'>('employee');
  const [employeeName, setEmployeeName] = useState('Manager');
  const [expenseDate, setExpenseDate] = useState(getLocalTodayStr());
  const [amount, setAmount] = useState('');
  const [pst, setPst] = useState('');
  const [gst, setGst] = useState('');
  const [hst, setHst] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [employeesList, setEmployeesList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchRealEmployees = async () => {
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
        console.warn("Could not fetch employees for AddExpenseModal", err);
      }
    };
    fetchRealEmployees();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid final total amount');
      return;
    }

    setSubmitting(true);
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

      const payload = {
        category,
        expenseType,
        employeeName,
        expenseDate,
        paymentMode,
        amount: parseFloat(amount) || 0,
        pst: parseFloat(pst) || 0,
        gst: parseFloat(gst) || 0,
        hst: parseFloat(hst) || 0,
        description,
        ...(branchId ? { branchId } : {})
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      await axios.post(`${apiUrl}/expenses`, payload);
      toast.success('Expense/Payout logged successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit expense:', err);
      toast.error(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      
      {/* Main Modal Card matching reference rounded corners */}
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[500px] overflow-hidden border border-neutral-200 flex flex-col max-h-[92vh]">
        
        {/* Header Strip with brand primary orange */}
        <div className="bg-brand-primary text-white px-6 py-4 flex items-center justify-between shadow-xs">
          <h2 className="text-sm font-900 uppercase tracking-wider">EXPENSE/PAYOUT</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/90 hover:text-white hover:bg-white/20 p-1 rounded-full transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body matching screenshot inputs */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-neutral-800 text-xs font-sans">
          
          {/* Category */}
          <div>
            <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 transition-all cursor-pointer shadow-2xs"
              required
            >
              <option value="Store Maintenance">Store Maintenance</option>
              <option value="Employee Wage Payout">Employee Wage Payout</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Raw Materials / Inventory">Raw Materials / Inventory</option>
              <option value="Utilities">Utilities</option>
              <option value="Misc Payout">Misc Payout</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Expense Type matching reference pill input container */}
          <div>
            <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">
              Expense Type <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-8 font-650 text-neutral-700 bg-white px-5 py-3 rounded-full border border-neutral-300 shadow-2xs">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${expenseType === 'employee' ? 'border-neutral-700 bg-white' : 'border-neutral-400 bg-white'}`}>
                  {expenseType === 'employee' && (
                    <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                  )}
                </div>
                <input
                  type="radio"
                  name="expenseType"
                  value="employee"
                  checked={expenseType === 'employee'}
                  onChange={() => setExpenseType('employee')}
                  className="sr-only"
                />
                <span className="text-neutral-800 font-600 text-xs">Employee Expense</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${expenseType === 'store' ? 'border-neutral-700 bg-white' : 'border-neutral-400 bg-white'}`}>
                  {expenseType === 'store' && (
                    <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                  )}
                </div>
                <input
                  type="radio"
                  name="expenseType"
                  value="store"
                  checked={expenseType === 'store'}
                  onChange={() => setExpenseType('store')}
                  className="sr-only"
                />
                <span className="text-neutral-800 font-600 text-xs">Store Expense</span>
              </label>
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-8 font-650 text-neutral-700 bg-white px-5 py-3 rounded-full border border-neutral-300 shadow-2xs">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMode === 'cash' ? 'border-neutral-700 bg-white' : 'border-neutral-400 bg-white'}`}>
                  {paymentMode === 'cash' && (
                    <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                  )}
                </div>
                <input
                  type="radio"
                  name="paymentMode"
                  value="cash"
                  checked={paymentMode === 'cash'}
                  onChange={() => setPaymentMode('cash')}
                  className="sr-only"
                />
                <span className="text-neutral-800 font-600 text-xs">Cash</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMode === 'card' ? 'border-neutral-700 bg-white' : 'border-neutral-400 bg-white'}`}>
                  {paymentMode === 'card' && (
                    <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                  )}
                </div>
                <input
                  type="radio"
                  name="paymentMode"
                  value="card"
                  checked={paymentMode === 'card'}
                  onChange={() => setPaymentMode('card')}
                  className="sr-only"
                />
                <span className="text-neutral-800 font-600 text-xs">Card</span>
              </label>
            </div>
          </div>

          {/* Employee Name (If Employee Expense) */}
          {expenseType === 'employee' && (
            <div>
              <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">
                Select Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 transition-all cursor-pointer shadow-2xs"
              >
                <option value="Manager">Manager</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Expense Date */}
          <div>
            <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 transition-all cursor-pointer shadow-2xs"
              required
            />
          </div>

          {/* Final Total */}
          <div>
            <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">
              Final Total <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Enter Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-700 text-neutral-900 placeholder:text-neutral-400 transition-all shadow-2xs"
              required
            />
          </div>

          {/* Tax Breakdown: PST, GST, HST */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">PST</label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter PST"
                value={pst}
                onChange={(e) => setPst(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 placeholder:text-neutral-400 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">GST</label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter GST"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 placeholder:text-neutral-400 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">HST</label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter HST"
                value={hst}
                onChange={(e) => setHst(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 placeholder:text-neutral-400 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-neutral-700 font-750 mb-1.5 text-[12px]">Description</label>
            <textarea
              rows={3}
              placeholder="Add expense details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-neutral-300 bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:outline-hidden font-600 text-neutral-800 placeholder:text-neutral-400 transition-all resize-none shadow-2xs"
            />
          </div>

          {/* Submit Button matching pill design */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 bg-brand-primary hover:bg-orange-600 active:scale-95 text-white font-900 text-xs tracking-wide rounded-full shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
