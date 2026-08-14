'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Calendar, RefreshCw, CheckCircle, XCircle, DollarSign,
  Truck, CreditCard, Banknote, AlertTriangle, TrendingUp,
  FileCheck, Printer, Lock, Info, Wallet, Receipt
} from 'lucide-react';
import PosNavbar from '@/modules/employee-pos/components/PosNavbar';
import POSSidebarDrawer from '@/modules/employee-pos/components/POSSidebarDrawer';
import toast from 'react-hot-toast';

// ── Helpers ──
const fmt = (val: number) =>
  `$${(typeof val === 'number' && !isNaN(val) ? val : 0).toFixed(2)}`;

const getShortageColor = (val: number) => {
  if (val > 0.005) return 'text-emerald-600';
  if (val < -0.005) return 'text-rose-600';
  return 'text-neutral-600';
};

const ShortageTag = ({ val }: { val: number }) => {
  if (Math.abs(val) < 0.005)
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-800">Balanced</span>;
  if (val > 0)
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-800">+{fmt(val)} Overage</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-800">{fmt(val)} Shortage</span>;
};

// ── Input Row ──
interface InputRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  highlight?: boolean;
  systemVal?: number;
}

const InputRow = ({ label, value, onChange, disabled = false, highlight = false, systemVal }: InputRowProps) => {
  const entered = parseFloat(value) || 0;
  const diff = systemVal !== undefined ? entered - systemVal : null;

  return (
    <tr className={`${highlight ? 'bg-orange-50/40' : 'hover:bg-neutral-50/60'} transition-colors`}>
      <td className="py-2 px-4 text-neutral-700 font-650 text-[12px]">{label}</td>
      {systemVal !== undefined && (
        <td className="py-2 px-4 text-right text-neutral-500 font-600 text-[12px]">{fmt(systemVal)}</td>
      )}
      <td className="py-1.5 px-4 text-right">
        <div className="inline-flex items-center relative justify-end">
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`w-32 rounded-lg px-3 py-1 text-right font-800 font-mono text-xs shadow-2xs transition-all
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              ${disabled
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                : 'bg-white border border-neutral-300 focus:border-brand-primary focus:outline-none text-neutral-900'
              }`}
          />
        </div>
      </td>
      {diff !== null && (
        <td className="py-2 px-3 text-right">
          <ShortageTag val={diff} />
        </td>
      )}
    </tr>
  );
};

export default function AccountClosingView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab] = useState('account_closing');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);

  // ── Entered Fields (5 Canadian POS Categories) ──
  const [enteredCash, setEnteredCash] = useState('0');
  const [enteredInterac, setEnteredInterac] = useState('0');
  const [enteredVisa, setEnteredVisa] = useState('0');
  const [enteredMastercard, setEnteredMastercard] = useState('0');
  const [enteredGiftCard, setEnteredGiftCard] = useState('0');
  const [comments, setComments] = useState('');

  const getBranchId = () => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem('rms_branch');
      if (raw) return JSON.parse(raw)._id;
    } catch {}
    return undefined;
  };

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const branchId = getBranchId();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/orders/account-closing`, {
        params: { date: selectedDate, ...(branchId ? { branchId } : {}) },
        timeout: 12000,
      });
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setData(d);

        // Populate from existing closing if present
        if (d.isClosed && d.existingClosing) {
          const c = d.existingClosing;
          setEnteredCash(String(c.enteredCash ?? 0));
          setEnteredInterac(String(c.enteredInterac ?? 0));
          setEnteredVisa(String(c.enteredVisa ?? 0));
          setEnteredMastercard(String(c.enteredMastercard ?? 0));
          setEnteredGiftCard(String(c.enteredGiftCard ?? 0));
          setComments(c.comments || '');
        } else {
          // Pre-fill with system expected values
          setEnteredCash(String(d.systemData?.cash ?? 0));
          setEnteredInterac(String(d.systemData?.card ?? 0));
          setEnteredVisa('0');
          setEnteredMastercard('0');
          setEnteredGiftCard('0');
          setComments('');
        }
      }
    } catch (err: any) {
      toast.error('Failed to load account closing data.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Live Calculations ──
  const calc = useMemo(() => {
    const cash = parseFloat(enteredCash) || 0;
    const interac = parseFloat(enteredInterac) || 0;
    const visa = parseFloat(enteredVisa) || 0;
    const mc = parseFloat(enteredMastercard) || 0;
    const gift = parseFloat(enteredGiftCard) || 0;

    const totalCard = visa + mc + interac + gift;
    const grandTotal = cash + totalCard;

    const sys = data?.systemData || {};
    const expectedNetDeposit = (sys.cash || 0) + (sys.card || 0);
    const cashShortage = cash - (sys.cash || 0);
    const cardShortage = totalCard - (sys.card || 0);
    const grandShortage = grandTotal - expectedNetDeposit;

    return { cash, totalCard, grandTotal, expectedNetDeposit, cashShortage, cardShortage, grandShortage };
  }, [enteredCash, enteredInterac, enteredVisa, enteredMastercard, enteredGiftCard, data]);

  const isClosed = data?.isClosed;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading('Saving account closing...');
    try {
      const branchId = getBranchId();
      if (!branchId) {
        toast.error('Branch not found. Please reload.', { id: toastId });
        return;
      }
      const sys = data?.systemData || {};
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${apiUrl}/orders/account-closing`, {
        date: selectedDate,
        branchId,
        enteredCash: parseFloat(enteredCash) || 0,
        enteredInterac: parseFloat(enteredInterac) || 0,
        enteredVisa: parseFloat(enteredVisa) || 0,
        enteredMastercard: parseFloat(enteredMastercard) || 0,
        enteredGiftCard: parseFloat(enteredGiftCard) || 0,
        systemCash: sys.cash || 0,
        systemCard: sys.card || 0,
        systemGrandTotal: sys.grandTotal || 0,
        systemAccountPay: sys.accountPay || 0,
        systemTips: sys.tips || 0,
        systemDeliveryTotal: sys.deliveryTotal || 0,
        systemTaxTotal: sys.taxTotal || 0,
        systemDiscountTotal: sys.discountTotal || 0,
        totalDriverPayout: sys.totalDriverPayout || 0,
        totalExpensePayout: sys.totalExpensePayout || 0,
        comments,
        closedBy: 'Manager',
      });
      if (res.data.success) {
        toast.success('Account closing saved successfully!', { id: toastId });
        fetchData(false);
      } else {
        toast.error(res.data.message || 'Failed to save.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving account closing.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sys = data?.systemData || {};
  const driverReport: any[] = data?.driverReport || [];

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans select-none">
      <PosNavbar onToggleSidebar={() => setSidebarOpen(true)} />
      <POSSidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={() => {}}
      />

      {/* ── Control Bar ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-900 text-neutral-900 tracking-tight leading-none flex items-center gap-2">
            <FileCheck size={20} className="text-brand-primary" />
            <span>Account Closing</span>
          </h1>
          {isClosed && (
            <span className="flex items-center gap-1 text-[10px] font-800 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle size={11} /> Day Closed
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="custom-date-pill bg-white border border-neutral-300 rounded-full pl-5 pr-10 py-1.5 text-[12px] font-750 text-[#1E3A8A] hover:border-neutral-400 focus:outline-none focus:border-brand-primary cursor-pointer transition-all shadow-sm w-[135px]"
            />
            <Calendar size={14} className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[#1E3A8A] pointer-events-none" />
          </div>

          <button
            onClick={() => fetchData(true)}
            className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-neutral-200 border-t-brand-primary animate-spin" />
            <span className="text-neutral-500 font-700 text-[12px]">Loading account data...</span>
          </div>
        ) : (
          <>
            {/* ── Top Summary Cards (5 KPI Cards) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {[
                { label: 'System Grand Total', val: sys.grandTotal || 0, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Expected Cash', val: sys.cash || 0, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                { label: 'Delivery Sales', val: sys.deliveryTotal || 0, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                { label: 'Driver Payout', val: sys.totalDriverPayout || 0, icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                { label: 'Store Expenses', val: sys.totalExpensePayout || 0, icon: Receipt, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
              ].map((card) => (
                <div key={card.label} className={`bg-white border rounded-xl p-3.5 shadow-xs ${card.bg}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <card.icon size={14} className={card.color} />
                    <span className="text-[9.5px] font-800 uppercase text-neutral-500 tracking-wide truncate">{card.label}</span>
                  </div>
                  <p className={`text-lg font-900 font-mono ${card.color}`}>{fmt(card.val)}</p>
                </div>
              ))}
            </div>

            {/* ── Info Banner ── */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[11px] font-650 text-blue-800">
                <strong>Terminal amounts</strong> below are manually entered from your terminal machine's printed report.
                System values show expected amounts from POS orders. Enter actual counts to calculate shortage/overage.
              </p>
            </div> */}

            {/* ── Two Column Layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* ==================== LEFT: DEPOSIT ENTRY ==================== */}
              <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider flex items-center justify-between">
                  <span>Day-End Deposit Entry</span>
                  {isClosed && (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-800">
                      <Lock size={10} /> Closed
                    </span>
                  )}
                </div>

                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                      <th className="py-2 px-4">Category</th>
                      <th className="py-2 px-4 text-right">Expected (System)</th>
                      <th className="py-2 px-4 text-right">Entered (Actual)</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60">
                    <InputRow label="Cash" value={enteredCash} onChange={setEnteredCash} disabled={isClosed} systemVal={sys.cash || 0} highlight />
                    <InputRow label="Interac / Debit" value={enteredInterac} onChange={setEnteredInterac} disabled={isClosed} systemVal={sys.card || 0} />
                    <InputRow label="Visa" value={enteredVisa} onChange={setEnteredVisa} disabled={isClosed} />
                    <InputRow label="Mastercard" value={enteredMastercard} onChange={setEnteredMastercard} disabled={isClosed} />
                    <InputRow label="Gift Card" value={enteredGiftCard} onChange={setEnteredGiftCard} disabled={isClosed} />
                  </tbody>
                </table>

                {/* Total Card Row */}
                <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-800 text-neutral-700 uppercase tracking-wide">Total Card</span>
                  <span className="text-sm font-900 text-purple-700 font-mono">{fmt(calc.totalCard)}</span>
                </div>

                {/* Grand Total Row */}
                <div className="border-t-2 border-neutral-300 bg-neutral-900 px-4 py-3 flex items-center justify-between">
                  <span className="text-[11px] font-900 text-white uppercase tracking-wider">TOTAL Deposit</span>
                  <span className="text-lg font-900 text-emerald-400 font-mono">{fmt(calc.grandTotal)}</span>
                </div>

                {/* Comments */}
                <div className="p-4 border-t border-neutral-200">
                  <label className="text-[10.5px] font-800 text-neutral-600 uppercase tracking-wide block mb-1.5">
                    Comments
                  </label>
                  <textarea
                    rows={2}
                    value={comments}
                    disabled={isClosed}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Optional notes for this closing..."
                    className={`w-full rounded-lg px-3 py-2 text-xs font-600 focus:outline-none focus:border-brand-primary resize-none
                      ${isClosed ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200' : 'bg-white border border-neutral-300 text-neutral-900'}`}
                  />
                </div>
              </div>

              {/* ==================== RIGHT: SUMMARY & SHORTAGE ==================== */}
              <div className="space-y-5">

                {/* Shortage / Overage Card */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider">
                    Shortage / Overage Analysis
                  </div>
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="bg-neutral-100 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                        <th className="py-2 px-4">Type</th>
                        <th className="py-2 px-4 text-right">Expected</th>
                        <th className="py-2 px-4 text-right">Entered</th>
                        <th className="py-2 px-4 text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 font-650">
                      <tr className="hover:bg-neutral-50/60">
                        <td className="py-2.5 px-4 font-700 text-neutral-800 flex items-center gap-2">
                          <Banknote size={14} className="text-emerald-500" /> Cash
                        </td>
                        <td className="py-2.5 px-4 text-right text-neutral-500">{fmt(sys.cash || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-800">{fmt(calc.cash)}</td>
                        <td className={`py-2.5 px-4 text-right font-900 ${getShortageColor(calc.cashShortage)}`}>
                          {calc.cashShortage >= 0 ? '+' : ''}{fmt(calc.cashShortage)}
                        </td>
                      </tr>
                      <tr className="hover:bg-neutral-50/60">
                        <td className="py-2.5 px-4 font-700 text-neutral-800 flex items-center gap-2">
                          <CreditCard size={14} className="text-purple-500" /> Card (Total)
                        </td>
                        <td className="py-2.5 px-4 text-right text-neutral-500">{fmt(sys.card || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-800">{fmt(calc.totalCard)}</td>
                        <td className={`py-2.5 px-4 text-right font-900 ${getShortageColor(calc.cardShortage)}`}>
                          {calc.cardShortage >= 0 ? '+' : ''}{fmt(calc.cardShortage)}
                        </td>
                      </tr>
                      <tr className="bg-orange-50/50 font-900 border-t border-brand-primary/20">
                        <td className="py-3 px-4 uppercase text-[11px] tracking-wide text-neutral-900 flex items-center gap-2">
                          <TrendingUp size={14} className="text-brand-primary" /> Grand Total
                        </td>
                        <td className="py-3 px-4 text-right text-neutral-700">{fmt(calc.expectedNetDeposit)}</td>
                        <td className="py-3 px-4 text-right text-brand-primary font-900">{fmt(calc.grandTotal)}</td>
                        <td className={`py-3 px-4 text-right font-900 text-sm ${getShortageColor(calc.grandShortage)}`}>
                          {calc.grandShortage >= 0 ? '+' : ''}{fmt(calc.grandShortage)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Day Summary Panel */}
                <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="bg-brand-primary text-white px-4 py-2.5 font-900 text-[12px] uppercase tracking-wider">
                    Day Summary
                  </div>
                  <table className="w-full text-left text-[12px]">
                    <tbody className="divide-y divide-neutral-200/60 font-650">
                      {[
                        { label: 'Grand Total (Sales)', val: sys.grandTotal || 0, color: 'text-neutral-900' },
                        { label: 'Total Tax Collected', val: sys.taxTotal || 0, color: 'text-neutral-600' },
                        { label: 'Total Discounts Given', val: sys.discountTotal || 0, color: 'text-amber-600' },
                        { label: 'Total Tips', val: sys.tips || 0, color: 'text-blue-600' },
                        { label: 'Delivery Sales', val: sys.deliveryTotal || 0, color: 'text-amber-700' },
                        { label: 'Account Pay (Prepaid/Online)', val: sys.accountPay || 0, color: 'text-blue-700' },
                        { label: 'Total Driver Payout', val: sys.totalDriverPayout || 0, color: 'text-rose-600' },
                        { label: 'Total Expense Payout', val: sys.totalExpensePayout || 0, color: 'text-rose-600' },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-neutral-50/60">
                          <td className="py-2.5 px-4 text-neutral-700">{row.label}</td>
                          <td className={`py-2.5 px-4 text-right font-800 ${row.color}`}>{fmt(row.val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Submit Button (Visible only when difference is 0 or positive) */}
                <div className="flex flex-col items-end gap-2">
                  {!isClosed && calc.grandShortage < -0.005 && (
                    <span className="text-[11px] font-700 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 shadow-2xs">
                      <AlertTriangle size={13} />
                      Cannot close day: Difference is negative ({fmt(calc.grandShortage)} shortage)
                    </span>
                  )}
                  {(isClosed || calc.grandShortage >= -0.005) && (
                    <button
                      onClick={handleSubmit}
                      disabled={isClosed || isSubmitting}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-900 text-[12px] uppercase tracking-wide shadow-sm transition-all
                        ${isClosed || isSubmitting
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          : 'bg-brand-primary hover:bg-[#b9142d] active:scale-95 text-white cursor-pointer'
                        }`}
                    >
                      <FileCheck size={15} />
                      <span>{isClosed ? 'Day Already Closed' : isSubmitting ? 'Saving...' : 'Close Day & Save'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Driver Report Table ── */}
            <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
              <div className="bg-brand-primary text-white px-5 py-3 font-900 text-[13px] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck size={16} />
                  <span>Driver Payout Summary</span>
                </span>
                <span className="text-[11px] bg-white/20 px-3 py-1 rounded-full font-700">
                  {driverReport.length} Drivers Settled
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-700 font-850 text-[10px] uppercase tracking-wider border-b border-neutral-200">
                      <th className="py-3 px-4">Driver</th>
                      <th className="py-3 px-4 text-center"># Delivery</th>
                      <th className="py-3 px-4 text-right">Total Sales</th>
                      <th className="py-3 px-4 text-right">Prepaid</th>
                      <th className="py-3 px-4 text-right">Cash</th>
                      <th className="py-3 px-4 text-right">Card</th>
                      <th className="py-3 px-4 text-right">Tips</th>
                      <th className="py-3 px-4 text-right">Earning</th>
                      <th className="py-3 px-4 text-right">Cash Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60 font-650">
                    {driverReport.length > 0 ? driverReport.map((drv: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3 px-4 font-800 text-neutral-900">{drv.driverName}</td>
                        <td className="py-3 px-4 text-center font-800 bg-neutral-50/80">{drv.deliveryCount ?? 0}</td>
                        <td className="py-3 px-4 text-right font-700 text-neutral-900">{fmt(drv.totalSales || 0)}</td>
                        <td className="py-3 px-4 text-right font-700 text-blue-700">{fmt(drv.prepaidSales || 0)}</td>
                        <td className="py-3 px-4 text-right font-700 text-emerald-700">{fmt(drv.cashSales || 0)}</td>
                        <td className="py-3 px-4 text-right font-700 text-purple-700">{fmt(drv.cardSales || 0)}</td>
                        <td className="py-3 px-4 text-right font-700 text-amber-700">{fmt(drv.totalTips || 0)}</td>
                        <td className="py-3 px-4 text-right font-800 text-brand-primary">{fmt(drv.driverEarning || 0)}</td>
                        <td className="py-3 px-4 text-right font-900 text-sm text-emerald-700 bg-emerald-50/60">{fmt(drv.expectedPayout || 0)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={9} className="py-5 px-4 text-center text-neutral-400 font-600 text-xs">
                          No driver settlements found for selected date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {driverReport.length > 0 && (
                    <tfoot>
                      <tr className="bg-neutral-900 text-white font-900">
                        <td className="py-3 px-4 text-[11px] uppercase tracking-wide" colSpan={2}>Total</td>
                        <td className="py-3 px-4 text-right">{fmt(driverReport.reduce((s, d) => s + (d.totalSales || 0), 0))}</td>
                        <td className="py-3 px-4 text-right">{fmt(driverReport.reduce((s, d) => s + (d.prepaidSales || 0), 0))}</td>
                        <td className="py-3 px-4 text-right">{fmt(driverReport.reduce((s, d) => s + (d.cashSales || 0), 0))}</td>
                        <td className="py-3 px-4 text-right">{fmt(driverReport.reduce((s, d) => s + (d.cardSales || 0), 0))}</td>
                        <td className="py-3 px-4 text-right">{fmt(driverReport.reduce((s, d) => s + (d.totalTips || 0), 0))}</td>
                        <td className="py-3 px-4 text-right">{fmt(driverReport.reduce((s, d) => s + (d.driverEarning || 0), 0))}</td>
                        <td className="py-3 px-4 text-right text-emerald-400">{fmt(driverReport.reduce((s, d) => s + (d.expectedPayout || 0), 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </main>
  );
}
