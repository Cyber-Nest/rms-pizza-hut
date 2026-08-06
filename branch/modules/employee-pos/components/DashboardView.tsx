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
  '#8a1538', // Brand Primary Maroon
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

  // Fallback default data if empty
  const popularDaysChartData = popularDaysData && popularDaysData.length > 0 ? popularDaysData : [
    { name: 'Monday', value: 0 },
    { name: 'Tuesday', value: 0 },
    { name: 'Wednesday', value: 0 },
    { name: 'Thursday', value: 0 },
    { name: 'Friday', value: 0 },
    { name: 'Saturday', value: 0 },
    { name: 'Sunday', value: 0 }
  ];

  const popularFoodChartData = popularFoodData && popularFoodData.length > 0 ? popularFoodData : [
    { name: 'No Menu Items Sold', value: 0 }
  ];

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 font-600 text-[12px] p-12">
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
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              Total Orders
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
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
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              Total Earning
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
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
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              New Customer
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
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
            <span className="text-[10px] text-neutral-450 font-800 tracking-wider uppercase block">
              Returning Customer
            </span>
            <span className="text-xl font-900 text-neutral-900 block leading-tight">
              {returningCustomers}
            </span>
          </div>
        </div>

      </div>

      {/* ── Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Popular Days Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-neutral-850 font-850 text-[13px] uppercase tracking-wide border-b border-neutral-100 pb-3 mb-4">
            Most Popular Days (Last 30 Days)
          </h3>
          <div className="h-[280px] w-full flex items-center justify-center">
            {popularDaysData && popularDaysData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularDaysChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {popularDaysChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Orders`, 'Volume']} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 650, color: '#44403C' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-neutral-400 text-[11px] font-700">No sales data available.</div>
            )}
          </div>
        </div>

        {/* Most Popular Food Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-neutral-850 font-850 text-[13px] uppercase tracking-wide border-b border-neutral-100 pb-3 mb-4">
            Most Popular Food (Last 30 Days)
          </h3>
          <div className="h-[280px] w-full flex items-center justify-center">
            {popularFoodData && popularFoodData.length > 0 && popularFoodData[0].name !== 'No Menu Items Sold' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularFoodChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {popularFoodChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items sold`, 'Quantity']} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 650, color: '#44403C' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-neutral-405 text-[11px] font-700">No items sold.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
