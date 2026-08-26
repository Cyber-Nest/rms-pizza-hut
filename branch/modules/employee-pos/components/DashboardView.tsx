'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ShoppingBag, DollarSign, UserCheck, Users } from 'lucide-react';

interface DashboardViewProps {
  metrics: {
    totalOrders: number;
    totalEarnings: number;
    newCustomers: number;
    returningCustomers: number;
    popularDaysData: Array<{ name: string; value: number }>;
    popularFoodData: Array<{ name: string; value: number }>;
  };
  loading?: boolean;
}

const COLORS = [
  '#e31837', // Brand Primary Maroon
  '#991B1B', // Burgundy
  '#16A34A', // Success Green
  '#D97706', // Warning Amber
  '#FBBF24', // Amber Light
  '#2563EB', // Info Blue
  '#A8A29E', // Stone Neutral
  '#78716C', // Stone Medium
  '#44403C'  // Stone Dark
];

export default function DashboardView({ metrics, loading }: DashboardViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    totalOrders = 0,
    totalEarnings = 0,
    newCustomers = 0,
    returningCustomers = 0,
    popularDaysData = [],
    popularFoodData = []
  } = metrics || {};

  // Sort popular food and days by value descending for chart ranking
  const sortedPopularDays = [...(popularDaysData || [])].sort((a, b) => b.value - a.value);
  const popularDaysChartData = sortedPopularDays.length > 0 ? sortedPopularDays : [
    { name: 'Monday', value: 0 },
    { name: 'Tuesday', value: 0 },
    { name: 'Wednesday', value: 0 },
    { name: 'Thursday', value: 0 },
    { name: 'Friday', value: 0 },
    { name: 'Saturday', value: 0 },
    { name: 'Sunday', value: 0 }
  ];

  const sortedPopularFood = [...(popularFoodData || [])].sort((a, b) => b.value - a.value);
  const popularFoodChartData = sortedPopularFood.length > 0 ? sortedPopularFood : [
    { name: 'No Menu Items Sold', value: 0 }
  ];

  const renderCustomLegend = (data: Array<{ name: string; value: number }>, unitLabel: string) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);

    return (
      <div className="w-full flex justify-end">
        <div className="flex flex-col gap-1.5 w-full max-w-[230px] max-h-[240px] overflow-y-auto pr-1">
          {data.map((entry, index) => {
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
            const color = COLORS[index % COLORS.length];

            return (
              <div
                key={`legend-${index}`}
                className="flex items-center justify-between gap-2 py-0.5 px-1 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="truncate font-700 text-[12px] leading-snug"
                    style={{ color: color }}
                    title={entry.name}
                  >
                    {entry.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-neutral-500 font-600 text-[11px] ml-1">
                  <span className="font-800 text-neutral-900">{entry.value}</span>
                  <span className="text-[10px] text-neutral-400 font-500">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 font-600 text-[12px] lg:text-[14px] p-12">
        Initializing Dashboard metrics...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pb-6 select-none font-sans">
      
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Orders Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-brand-primary">
            <ShoppingBag size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] lg:text-[12px] text-neutral-450 font-800 tracking-wider uppercase block">
              Total Orders
            </span>
            <span className="text-xl lg:text-2xl font-900 text-neutral-900 block leading-tight">
              {totalOrders}
            </span>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <DollarSign size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] lg:text-[12px] text-neutral-450 font-800 tracking-wider uppercase block">
              Total Earning
            </span>
            <span className="text-xl lg:text-2xl font-900 text-neutral-900 block leading-tight">
              ${totalEarnings.toFixed(2)}
            </span>
          </div>
        </div>

        {/* New Customer Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] lg:text-[12px] text-neutral-450 font-800 tracking-wider uppercase block">
              New Customer
            </span>
            <span className="text-xl lg:text-2xl font-900 text-neutral-900 block leading-tight">
              {newCustomers}
            </span>
          </div>
        </div>

        {/* Returning Customer Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <UserCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[10px] lg:text-[12px] text-neutral-450 font-800 tracking-wider uppercase block">
              Returning Customer
            </span>
            <span className="text-xl lg:text-2xl font-900 text-neutral-900 block leading-tight">
              {returningCustomers}
            </span>
          </div>
        </div>

      </div>

      {/* ── Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Popular Days Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-neutral-850 font-850 text-[13px] lg:text-[15px] uppercase tracking-wide border-b border-neutral-100 pb-3 mb-4">
            Most Popular Days (Last 30 Days)
          </h3>
          <div className="w-full min-h-[250px] grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {popularDaysData && popularDaysData.length > 0 ? (
              <>
                <div className="sm:col-span-6 h-[230px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={popularDaysChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {popularDaysChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Orders`, 'Volume']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="sm:col-span-6 w-full min-w-0 flex items-center justify-end">
                  {renderCustomLegend(popularDaysChartData, "Orders")}
                </div>
              </>
            ) : (
              <div className="sm:col-span-12 text-center text-neutral-400 text-[11px] font-700 py-12">
                No sales data available.
              </div>
            )}
          </div>
        </div>

        {/* Most Popular Food Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-neutral-850 font-850 text-[13px] lg:text-[15px] uppercase tracking-wide border-b border-neutral-100 pb-3 mb-4">
            Most Popular Food (Last 30 Days)
          </h3>
          <div className="w-full min-h-[250px] grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {popularFoodData && popularFoodData.length > 0 && popularFoodData[0].name !== 'No Menu Items Sold' ? (
              <>
                <div className="sm:col-span-6 h-[230px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={popularFoodChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {popularFoodChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} items sold`, 'Quantity']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="sm:col-span-6 w-full min-w-0 flex items-center justify-end">
                  {renderCustomLegend(popularFoodChartData, "Items")}
                </div>
              </>
            ) : (
              <div className="sm:col-span-12 text-center text-neutral-400 text-[11px] font-700 py-12">
                No items sold.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
