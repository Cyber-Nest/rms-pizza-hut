'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart3, AlertCircle } from 'lucide-react';

interface MonthlySalesRow {
  date: string;
  rawDate: string;
  salesSummary: {
    subtotal: number;
    deliveryCharges: number;
    debitCharges: number;
    discount: number;
    tax: number;
    grandTotal: number;
    tips: number;
    finalAmount: number;
  };
  paymentType: {
    cash: number;
    accountPay: number;
    creditCardSales: number;
    debitCardSales: number;
    grandTotal: number;
    debitTips: number;
    creditTips: number;
    finalAmount: number;
  };
  orderType: {
    takeout: number;
    dineIn: number;
    delivery: number;
    driveThrough: number;
    total: number;
  };
  orders: {
    completed: number;
    paidCancelled: number;
    unpaidCancelled: number;
    refund: number;
    refundAmount: number;
  };
  taxBreakdown: {
    pst: number;
    gst: number;
    hst: number;
    total: number;
  };
  cardType: {
    amex: number;
    interac: number;
    mastercard: number;
    visa: number;
  };
  online: {
    website: number;
    uber: number;
    skip: number;
    doordash: number;
    total: number;
  };
  pos: {
    posSales: number;
    total: number;
  };
  expense: {
    amount: number;
  };
  shortage: {
    cash: number;
    card: number;
    accountPay: number;
  };
  deposit: {
    cash: number;
    card: number;
    accountPay: number;
  };
  moneyToBeCollected: {
    cash: number;
    card: number;
    accountPay: number;
  };
}

interface MonthlySalesViewProps {
  startDate: string;
  endDate: string;
}

export default function MonthlySalesView({ startDate, endDate }: MonthlySalesViewProps) {
  const [data, setData] = useState<MonthlySalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlySales = async () => {
    try {
      setLoading(true);
      setError(null);
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
      const res = await axios.get(`${apiUrl}/orders/monthly-sales-summary`, {
        params: { startDate, endDate, ...(branchId ? { branchId } : {}) }
      });
      if (res.data && res.data.success) {
        setData(res.data.data || []);
      } else {
        setError('Failed to fetch monthly sales summary');
      }
    } catch (err: any) {
      console.error('Error fetching monthly sales summary:', err);
      setError(err.response?.data?.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySales();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2 py-20 select-none">
        <span className="animate-spin text-2xl text-brand-primary">⏳</span>
        <span>Generating monthly sales accounting records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-8 text-center space-y-4 max-w-4xl font-sans select-none mx-auto">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-100">
          <AlertCircle size={24} />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="font-800 text-neutral-800 text-sm">Failed to Load Report</h3>
          <p className="text-[11px] text-neutral-500 font-550 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={fetchMonthlySales}
          className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white font-800 text-[11px] uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-4 max-w-4xl font-sans select-none mx-auto">
        <div className="w-14 h-14 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-400 border border-neutral-100">
          <BarChart3 size={28} />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="font-800 text-neutral-800 text-sm">No Sales Records Found</h3>
          <p className="text-[11px] text-neutral-500 font-550 mt-1">
            There are no orders placed within the selected period.
          </p>
        </div>
      </div>
    );
  }

  // ── Calculate Grand Totals for Footer Row ──
  const totals = data.reduce(
    (acc, row) => {
      // Sales Summary
      acc.salesSummary.subtotal += row.salesSummary.subtotal;
      acc.salesSummary.deliveryCharges += row.salesSummary.deliveryCharges;
      acc.salesSummary.debitCharges += row.salesSummary.debitCharges;
      acc.salesSummary.discount += row.salesSummary.discount;
      acc.salesSummary.tax += row.salesSummary.tax;
      acc.salesSummary.grandTotal += row.salesSummary.grandTotal;
      acc.salesSummary.tips += row.salesSummary.tips;
      acc.salesSummary.finalAmount += row.salesSummary.finalAmount;

      // Payment Type
      acc.paymentType.cash += row.paymentType.cash;
      acc.paymentType.accountPay += row.paymentType.accountPay;
      acc.paymentType.creditCardSales += row.paymentType.creditCardSales;
      acc.paymentType.debitCardSales += row.paymentType.debitCardSales;
      acc.paymentType.grandTotal += row.paymentType.grandTotal;
      acc.paymentType.debitTips += row.paymentType.debitTips;
      acc.paymentType.creditTips += row.paymentType.creditTips;
      acc.paymentType.finalAmount += row.paymentType.finalAmount;

      // Order Type
      acc.orderType.takeout += row.orderType.takeout;
      acc.orderType.dineIn += row.orderType.dineIn;
      acc.orderType.delivery += row.orderType.delivery;
      acc.orderType.driveThrough += row.orderType.driveThrough;
      acc.orderType.total += row.orderType.total;

      // Orders Counts
      acc.orders.completed += row.orders.completed;
      acc.orders.paidCancelled += row.orders.paidCancelled;
      acc.orders.unpaidCancelled += row.orders.unpaidCancelled;
      acc.orders.refund += row.orders.refund;
      acc.orders.refundAmount += row.orders.refundAmount;

      // Tax breakdown
      acc.taxBreakdown.pst += row.taxBreakdown.pst;
      acc.taxBreakdown.gst += row.taxBreakdown.gst;
      acc.taxBreakdown.hst += row.taxBreakdown.hst;
      acc.taxBreakdown.total += row.taxBreakdown.total;

      // Card Type
      acc.cardType.amex += row.cardType.amex;
      acc.cardType.interac += row.cardType.interac;
      acc.cardType.mastercard += row.cardType.mastercard;
      acc.cardType.visa += row.cardType.visa;

      // Online
      acc.online.website += row.online.website;
      acc.online.uber += row.online.uber;
      acc.online.skip += row.online.skip;
      acc.online.doordash += row.online.doordash;
      acc.online.total += row.online.total;

      // POS
      acc.pos.posSales += row.pos.posSales;
      acc.pos.total += row.pos.total;

      // Expense
      acc.expense.amount += row.expense.amount;

      // Shortage
      acc.shortage.cash += row.shortage.cash;
      acc.shortage.card += row.shortage.card;
      acc.shortage.accountPay += row.shortage.accountPay;

      // Deposit
      acc.deposit.cash += row.deposit.cash;
      acc.deposit.card += row.deposit.card;
      acc.deposit.accountPay += row.deposit.accountPay;

      // Money to be collected
      acc.moneyToBeCollected.cash += row.moneyToBeCollected.cash;
      acc.moneyToBeCollected.card += row.moneyToBeCollected.card;
      acc.moneyToBeCollected.accountPay += row.moneyToBeCollected.accountPay;

      return acc;
    },
    {
      salesSummary: { subtotal: 0, deliveryCharges: 0, debitCharges: 0, discount: 0, tax: 0, grandTotal: 0, tips: 0, finalAmount: 0 },
      paymentType: { cash: 0, accountPay: 0, creditCardSales: 0, debitCardSales: 0, grandTotal: 0, debitTips: 0, creditTips: 0, finalAmount: 0 },
      orderType: { takeout: 0, dineIn: 0, delivery: 0, driveThrough: 0, total: 0 },
      orders: { completed: 0, paidCancelled: 0, unpaidCancelled: 0, refund: 0, refundAmount: 0 },
      taxBreakdown: { pst: 0, gst: 0, hst: 0, total: 0 },
      cardType: { amex: 0, interac: 0, mastercard: 0, visa: 0 },
      online: { website: 0, uber: 0, skip: 0, doordash: 0, total: 0 },
      pos: { posSales: 0, total: 0 },
      expense: { amount: 0 },
      shortage: { cash: 0, card: 0, accountPay: 0 },
      deposit: { cash: 0, card: 0, accountPay: 0 },
      moneyToBeCollected: { cash: 0, card: 0, accountPay: 0 }
    }
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-sans text-neutral-900 pr-1 select-none">
      <style>{`
        .table-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .table-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 6px;
        }
        .table-scrollbar::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 6px;
          border: 1px solid #F3F4F6;
        }
        .table-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>

      {/* Scrollable Container wrapper card */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Horizontal scrollable wrapper */}
        <div className="overflow-auto flex-1 text-[11px] font-sans table-scrollbar">
          <table className="min-w-[4200px] text-left border-collapse table-fixed">
            
            {/* Header definition */}
            <thead className="sticky top-0 z-20 bg-neutral-900 border-b border-neutral-300">
              
              {/* Row 1: Category Groups (Light Pastel Backgrounds) */}
              <tr className="h-9 text-[10px] font-900 uppercase tracking-wider text-center select-none border-b border-neutral-300">
                {/* Date group */}
                <th className="bg-blue-50/90 text-blue-950 border-r border-neutral-300 w-[110px]">Date</th>
                
                {/* Sales Summary */}
                <th colSpan={8} className="bg-stone-100/90 text-stone-900 border-r border-neutral-300 w-[820px]">
                  Sales Summary
                </th>
                
                {/* Payment Type */}
                <th colSpan={8} className="bg-teal-50/90 text-teal-950 border-r border-neutral-300 w-[840px]">
                  Payment Type
                </th>
                
                {/* Order Type */}
                <th colSpan={5} className="bg-cyan-50/90 text-cyan-950 border-r border-neutral-300 w-[500px]">
                  Order Type
                </th>
                
                {/* Orders */}
                <th colSpan={5} className="bg-sky-50/90 text-sky-950 border-r border-neutral-300 w-[450px]">
                  Orders
                </th>
                
                {/* Tax */}
                <th colSpan={4} className="bg-emerald-50/90 text-emerald-950 border-r border-neutral-300 w-[400px]">
                  Tax
                </th>
                
                {/* Card Type */}
                <th colSpan={4} className="bg-orange-50/90 text-orange-950 border-r border-neutral-300 w-[520px]">
                  Card Type
                </th>
                
                {/* Online */}
                <th colSpan={5} className="bg-pink-50/90 text-pink-950 border-r border-neutral-300 w-[500px]">
                  Online
                </th>
                
                {/* POS */}
                <th colSpan={2} className="bg-indigo-50/90 text-indigo-950 border-r border-neutral-300 w-[220px]">
                  POS
                </th>
                
                {/* Expense */}
                <th className="bg-lime-50/90 text-lime-950 border-r border-neutral-300 w-[100px]">Expense</th>
                
                {/* Shortage / Overage */}
                <th colSpan={3} className="bg-rose-50/90 text-rose-950 border-r border-neutral-300 w-[300px]">
                  Shortage / Overage
                </th>
                
                {/* Deposit */}
                <th colSpan={3} className="bg-amber-50/90 text-amber-950 border-r border-neutral-300 w-[320px]">
                  Deposit
                </th>
                
                {/* Money to be Collected */}
                <th colSpan={3} className="bg-emerald-50/95 text-emerald-950 w-[320px]">
                  Money To Be Collected
                </th>
              </tr>

              {/* Row 2: Sub Columns */}
              <tr className="bg-neutral-850 text-white font-800 text-[9.5px] uppercase tracking-wide border-b border-neutral-350">
                {/* Date */}
                <th className="py-2.5 px-3.5 border-r border-neutral-700/60 text-center w-[110px]">Report Date</th>
                
                {/* Sales Summary */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Sub Total</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Delivery Charges</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Debit Card Charges</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Discount</th>
                <th className="py-2.5 px-3 text-right w-[80px] border-r border-neutral-800/40">Tax</th>
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">Grand Total</th>
                <th className="py-2.5 px-3 text-right w-[90px] border-r border-neutral-800/40">Tips</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[140px]">Final Amount</th>
                
                {/* Payment Type */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Cash</th>
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">Account Pay</th>
                <th className="py-2.5 px-3 text-right w-[130px] border-r border-neutral-800/40">Credit Card - Sales</th>
                <th className="py-2.5 px-3 text-right w-[130px] border-r border-neutral-800/40">Debit Card - Sales</th>
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">Grand Total</th>
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">Debit Card - Tips</th>
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">Credit Card - Tips</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[120px]">Final Amount</th>
                
                {/* Order Type */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Take-Out</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Dine-in</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Delivery</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Drive Through</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[100px]">Total</th>
                
                {/* Orders */}
                <th className="py-2.5 px-3 text-center w-[90px] border-r border-neutral-800/40">Completed</th>
                <th className="py-2.5 px-3 text-center w-[90px] border-r border-neutral-800/40">Paid Cancelled</th>
                <th className="py-2.5 px-3 text-center w-[100px] border-r border-neutral-800/40">Unpaid Cancelled</th>
                <th className="py-2.5 px-3 text-center w-[80px] border-r border-neutral-800/40">Refund</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[90px]">Refund Amount</th>
                
                {/* Tax */}
                <th className="py-2.5 px-3 text-right w-[90px] border-r border-neutral-800/40">PST</th>
                <th className="py-2.5 px-3 text-right w-[90px] border-r border-neutral-800/40">GST</th>
                <th className="py-2.5 px-3 text-right w-[90px] border-r border-neutral-800/40">HST</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[130px]">Total</th>
                
                {/* Card Type */}
                <th className="py-2.5 px-3 text-right w-[130px] border-r border-neutral-800/40">AMEX Final Amount</th>
                <th className="py-2.5 px-3 text-right w-[130px] border-r border-neutral-800/40">INTERAC Final Amount</th>
                <th className="py-2.5 px-3 text-right w-[130px] border-r border-neutral-800/40">MASTERCARD Final Amount</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[130px]">VISA Final Amount</th>
                
                {/* Online */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Website</th>
                <th className="py-2.5 px-3 text-right w-[90px] border-r border-neutral-800/40">Uber</th>
                <th className="py-2.5 px-3 text-right w-[90px] border-r border-neutral-800/40">Skip</th>
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">Door Dash</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[110px]">Total</th>
                
                {/* POS */}
                <th className="py-2.5 px-3 text-right w-[110px] border-r border-neutral-800/40">POS</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[110px]">Total</th>
                
                {/* Expense */}
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[100px]">Expense</th>
                
                {/* Shortage / Overage */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Cash</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Card</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[100px]">Account pay</th>
                
                {/* Deposit */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Cash</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Card</th>
                <th className="py-2.5 px-3 text-right border-r border-neutral-600/90 w-[120px]">Account pay</th>
                
                {/* Money to be Collected */}
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Cash</th>
                <th className="py-2.5 px-3 text-right w-[100px] border-r border-neutral-800/40">Card</th>
                <th className="py-2.5 px-3 text-right w-[120px]">Account pay</th>
              </tr>
            </thead>
            
            {/* Body */}
            <tbody className="divide-y divide-neutral-200/70 font-650 text-neutral-850">
              {data.map((row, idx) => (
                <tr key={idx} className="even:bg-neutral-50/60 hover:bg-neutral-100/50 transition-colors h-9">
                  {/* Date */}
                  <td className="py-1.5 px-3.5 border-r border-neutral-250 text-center font-800 text-neutral-900">{row.date}</td>
                  
                  {/* Sales Summary */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.salesSummary.subtotal.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.salesSummary.deliveryCharges.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.salesSummary.debitCharges.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-rose-600 border-r border-neutral-200/60 font-700">(${row.salesSummary.discount.toFixed(2)})</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.salesSummary.tax.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 border-r border-neutral-200/60">${row.salesSummary.grandTotal.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.salesSummary.tips.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-800 text-neutral-900 bg-stone-50/70 border-r-2 border-neutral-350">${row.salesSummary.finalAmount.toFixed(2)}</td>
                  
                  {/* Payment Type */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.paymentType.cash.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.paymentType.accountPay.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.paymentType.creditCardSales.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.paymentType.debitCardSales.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 border-r border-neutral-200/60">${row.paymentType.grandTotal.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.paymentType.debitTips.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.paymentType.creditTips.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-800 text-neutral-900 bg-teal-50/20 border-r-2 border-neutral-350">${row.paymentType.finalAmount.toFixed(2)}</td>
                  
                  {/* Order Type */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.orderType.takeout.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.orderType.dineIn.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.orderType.delivery.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.orderType.driveThrough.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 bg-cyan-50/20 border-r-2 border-neutral-350">${row.orderType.total.toFixed(2)}</td>
                  
                  {/* Orders */}
                  <td className="py-1.5 px-3 text-center tabular-nums font-700 text-neutral-900 border-r border-neutral-200/60">{row.orders.completed}</td>
                  <td className="py-1.5 px-3 text-center tabular-nums text-neutral-400 border-r border-neutral-200/60">{row.orders.paidCancelled}</td>
                  <td className="py-1.5 px-3 text-center tabular-nums text-neutral-400 border-r border-neutral-200/60">{row.orders.unpaidCancelled}</td>
                  <td className="py-1.5 px-3 text-center tabular-nums text-neutral-400 border-r border-neutral-200/60">{row.orders.refund}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-450 border-r-2 border-neutral-350">${row.orders.refundAmount.toFixed(2)}</td>
                  
                  {/* Tax */}
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.taxBreakdown.pst.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.taxBreakdown.gst.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.taxBreakdown.hst.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 bg-emerald-50/20 border-r-2 border-neutral-350">${row.taxBreakdown.total.toFixed(2)}</td>
                  
                  {/* Card Type */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.cardType.amex.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.cardType.interac.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.cardType.mastercard.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 border-r-2 border-neutral-350">${row.cardType.visa.toFixed(2)}</td>
                  
                  {/* Online */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.online.website.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.online.uber.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.online.skip.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-neutral-400 border-r border-neutral-200/60">${row.online.doordash.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 bg-pink-50/20 border-r-2 border-neutral-350">${row.online.total.toFixed(2)}</td>
                  
                  {/* POS */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60">${row.pos.posSales.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900 border-r-2 border-neutral-350">${row.pos.total.toFixed(2)}</td>
                  
                  {/* Expense */}
                  <td className="py-1.5 px-3 text-right tabular-nums text-amber-700 font-700 border-r-2 border-neutral-350">${row.expense.amount.toFixed(2)}</td>
                  
                  {/* Shortage / Overage */}
                  <td className={`py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60 font-700 ${row.shortage.cash < 0 ? 'text-rose-600' : row.shortage.cash > 0 ? 'text-emerald-600' : 'text-neutral-505'}`}>
                    {row.shortage.cash < 0 ? `-` : row.shortage.cash > 0 ? `+` : ``}${Math.abs(row.shortage.cash).toFixed(2)}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60 text-neutral-400">${row.shortage.card.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r-2 border-neutral-350 text-neutral-400">${row.shortage.accountPay.toFixed(2)}</td>
                  
                  {/* Deposit */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60 font-700 text-neutral-850">${row.deposit.cash.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60 font-700 text-neutral-850">${row.deposit.card.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r-2 border-neutral-350 font-700 text-neutral-850">${row.deposit.accountPay.toFixed(2)}</td>
                  
                  {/* Money to be Collected */}
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60 font-700 text-neutral-900">${row.moneyToBeCollected.cash.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums border-r border-neutral-200/60 font-700 text-neutral-900">${row.moneyToBeCollected.card.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-700 text-neutral-900">${row.moneyToBeCollected.accountPay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            
            {/* Grand Total Footer Row styled clean orange to match screen */}
            <tfoot className="sticky bottom-0 z-10 bg-brand-primary text-white font-900 text-[11px] border-t border-neutral-350 shadow-md">
              <tr className="h-10">
                <td className="py-2.5 px-3.5 border-r border-neutral-300/40 text-center uppercase tracking-wide">Total</td>
                
                {/* Sales Summary */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.salesSummary.subtotal.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.salesSummary.deliveryCharges.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.salesSummary.debitCharges.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-95">(${totals.salesSummary.discount.toFixed(2)})</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.salesSummary.tax.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.salesSummary.grandTotal.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.salesSummary.tips.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r-2 border-neutral-350/50 font-950">${totals.salesSummary.finalAmount.toFixed(2)}</td>
                
                {/* Payment Type */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.paymentType.cash.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.paymentType.accountPay.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.paymentType.creditCardSales.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.paymentType.debitCardSales.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.paymentType.grandTotal.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.paymentType.debitTips.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.paymentType.creditTips.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r-2 border-neutral-350/50 font-950">${totals.paymentType.finalAmount.toFixed(2)}</td>
                
                {/* Order Type */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.orderType.takeout.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.orderType.dineIn.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.orderType.delivery.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.orderType.driveThrough.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.orderType.total.toFixed(2)}</td>
                
                {/* Orders */}
                <td className="py-2.5 px-3 text-center tabular-nums border-r border-neutral-300/20">{totals.orders.completed}</td>
                <td className="py-2.5 px-3 text-center tabular-nums border-r border-neutral-300/20 opacity-85">{totals.orders.paidCancelled}</td>
                <td className="py-2.5 px-3 text-center tabular-nums border-r border-neutral-300/20 opacity-85">{totals.orders.unpaidCancelled}</td>
                <td className="py-2.5 px-3 text-center tabular-nums border-r border-neutral-300/20 opacity-85">{totals.orders.refund}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.orders.refundAmount.toFixed(2)}</td>
                
                {/* Tax */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.taxBreakdown.pst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.taxBreakdown.gst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.taxBreakdown.hst.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.taxBreakdown.total.toFixed(2)}</td>
                
                {/* Card Type */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.cardType.amex.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.cardType.interac.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.cardType.mastercard.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.cardType.visa.toFixed(2)}</td>
                
                {/* Online */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.online.website.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.online.uber.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.online.skip.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.online.doordash.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.online.total.toFixed(2)}</td>
                
                {/* POS */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.pos.posSales.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.pos.total.toFixed(2)}</td>
                
                {/* Expense */}
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.expense.amount.toFixed(2)}</td>
                
                {/* Shortage / Overage */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20">${totals.shortage.cash.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 opacity-80">${totals.shortage.card.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.shortage.accountPay.toFixed(2)}</td>
                
                {/* Deposit */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 font-950">${totals.deposit.cash.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 font-950">${totals.deposit.card.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right border-r-2 border-neutral-350/50 font-950">${totals.deposit.accountPay.toFixed(2)}</td>
                
                {/* Money to be Collected */}
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 font-950">${totals.moneyToBeCollected.cash.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums border-r border-neutral-300/20 font-950">${totals.moneyToBeCollected.card.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-950">${totals.moneyToBeCollected.accountPay.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
