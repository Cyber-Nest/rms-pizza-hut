'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart3, AlertCircle } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface HourlySalesData {
  label: string;
  startHour: number;
  endHour: number;
  orderCount: number;
  totalSales: number;
}

interface HourlySalesViewProps {
  startDate: string;
  endDate: string;
}

export default function HourlySalesView({ startDate, endDate }: HourlySalesViewProps) {
  const [data, setData] = useState<HourlySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchHourlySales = async () => {
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
      const res = await axios.get(`${apiUrl}/orders/hourly-sales-summary`, {
        params: { startDate, endDate, ...(branchId ? { branchId } : {}) }
      });
      if (res.data && res.data.success) {
        setData(res.data.data || []);
      } else {
        setError('Failed to fetch hourly sales summary');
      }
    } catch (err: any) {
      console.error('Error fetching hourly sales summary:', err);
      setError(err.response?.data?.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchHourlySales();
    }
  }, [startDate, endDate, mounted]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 font-750 text-[12px] py-20 select-none">
        <span className="animate-spin text-2xl text-brand-primary">⏳</span>
        <span>Initializing Hourly Report...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2 py-20 select-none">
        <span className="animate-spin text-2xl text-brand-primary">⏳</span>
        <span>Generating hourly sales metrics...</span>
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
          onClick={fetchHourlySales}
          className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white font-800 text-[11px] uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Let's filter out slots that are 0 if they are at the very end or start, but keeping 10 AM to 10 PM.
  const activeSlots = data.filter(slot => {
    // If it has transactions, display it. Or if it's within the standard 10 AM to 10 PM range, display it.
    return slot.orderCount > 0 || (slot.startHour >= 10 && slot.startHour <= 21);
  });

  // Calculate grand totals
  const totalOrders = activeSlots.reduce((sum, slot) => sum + slot.orderCount, 0);
  const totalSales = activeSlots.reduce((sum, slot) => sum + slot.totalSales, 0);

  // Custom tooltips for Composed Chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-md text-[11px] font-sans">
          <p className="font-800 text-neutral-800 mb-1.5">{payload[0].payload.label}</p>
          <div className="space-y-1 font-600">
            <p className="text-[#3B82F6] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              Paid Amount: <span className="font-800">${payload[0].value.toFixed(2)}</span>
            </p>
            {payload[1] && (
              <p className="text-[#F43F5E] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                Total Orders: <span className="font-800">{payload[1].value}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pb-10 select-none font-sans text-neutral-900 pr-1">
      {/* ── Table Segment ── */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden w-full">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead>
            <tr className="bg-brand-dark text-white font-800 text-[10px] uppercase tracking-wider border-b border-neutral-250">
              <th className="py-2.5 px-5 w-2/5">Time Wise Sales</th>
              <th className="py-2.5 px-4 text-center w-1/5"># Orders</th>
              <th className="py-2.5 px-5 text-right w-2/5">Total Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-850">
            {activeSlots.map((slot, idx) => (
              <tr key={idx} className="hover:bg-neutral-50/70 border-b border-neutral-100 transition-colors">
                <td className="py-2.5 px-5 font-700 text-neutral-900">{slot.label}</td>
                <td className="py-2.5 px-4 text-center font-600 text-neutral-700">{slot.orderCount}</td>
                <td className="py-2.5 px-5 text-right font-700 text-neutral-800">${slot.totalSales.toFixed(2)}</td>
              </tr>
            ))}

            {/* Total Footer Row matching screenshot */}
            <tr className="bg-neutral-50/50 font-850 border-t-2 border-neutral-300">
              <td className="py-3 px-5 text-neutral-900 font-900 uppercase tracking-wide text-[11px]">
                Total
              </td>
              <td className="py-3 px-4 text-center text-neutral-900 font-900 text-[12px]">
                {totalOrders}
              </td>
              {/* Highlight total sales column with beige background */}
              <td className="py-3 px-5 text-right text-neutral-900 font-900 bg-amber-50/80 border-l border-neutral-100 text-[12px]">
                ${totalSales.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Chart Segment ── */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col items-center">
        {/* Title and Legend matching exact layout */}
        <div className="text-center mb-4 space-y-1">
          <h4 className="text-[12px] font-800 text-neutral-500 tracking-wide">
            Hourly Sales & Order Count
          </h4>
          <div className="flex items-center justify-center gap-6 text-[10px] font-800 tracking-wider uppercase text-neutral-500 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-2.5 rounded bg-[#3B82F6]/60 inline-block" />
              <span>Paid Amount</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-[#F43F5E] relative inline-block">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
              </span>
              <span>Total Orders</span>
            </div>
          </div>
        </div>

        <div className="h-[320px] w-full pt-2">
          {activeSlots.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={activeSlots}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                {/* Left YAxis: Paid Amount */}
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  label={{ value: 'Paid Amount', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: '#6B7280' }, offset: 0 }}
                />
                {/* Right YAxis: Total Orders */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  label={{ value: 'Total Orders', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 9, fontWeight: 800, fill: '#6B7280' }, offset: 0 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
                
                {/* Bar for Paid Amount */}
                <Bar 
                  yAxisId="left"
                  dataKey="totalSales" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
                
                {/* Line for Total Orders */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="orderCount" 
                  stroke="#F43F5E" 
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F43F5E', stroke: '#F43F5E', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-400 text-[11px] font-750">
              No hourly transaction records found for this period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
