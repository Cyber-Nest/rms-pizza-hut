'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart3, AlertCircle } from 'lucide-react';

interface ItemSaleDetail {
  name: string;
  menuItemId: string;
  productId?: string;
  quantitySold: number;
  totalSales: number;
  percentageSales: number;
}

interface CategorySalesGroup {
  categoryName: string;
  subtotalSold: number;
  subtotalSales: number;
  items: ItemSaleDetail[];
}

interface ItemSalesViewProps {
  startDate: string;
  endDate: string;
}

export default function ItemSalesView({ startDate, endDate }: ItemSalesViewProps) {
  const [data, setData] = useState<CategorySalesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItemSales = async () => {
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
      const res = await axios.get(`${apiUrl}/orders/item-sales-summary`, {
        params: { startDate, endDate, ...(branchId ? { branchId } : {}) }
      });
      if (res.data && res.data.success) {
        setData(res.data.data || []);
      } else {
        setError('Failed to fetch item sales summary');
      }
    } catch (err: any) {
      console.error('Error fetching item sales summary:', err);
      setError(err.response?.data?.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemSales();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2 py-20 select-none">
        <span className="animate-spin text-2xl text-brand-primary">⏳</span>
        <span>Generating item sales records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-8 text-center space-y-4 max-w-4xl font-sans select-none">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-100">
          <AlertCircle size={24} />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="font-800 text-neutral-800 text-sm">Failed to Load Report</h3>
          <p className="text-[11px] text-neutral-500 font-550 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={fetchItemSales}
          className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white font-800 text-[11px] uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-4 max-w-4xl font-sans select-none">
        <div className="w-14 h-14 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-400 border border-neutral-100">
          <BarChart3 size={28} />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="font-800 text-neutral-800 text-sm">No Sales Records Found</h3>
          <p className="text-[11px] text-neutral-500 font-550 mt-1">
            Complete orders in the POS system to populate the item sales summary.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pb-10 select-none font-sans text-neutral-900 pr-1">
      {/* Table Container Card */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden w-full">
        <table className="w-full text-left text-[12px] border-collapse">
          {/* Main Table Head */}
          <thead>
            <tr className="bg-neutral-100 text-neutral-600 font-800 text-[10px] uppercase tracking-wider border-b border-neutral-200">
              <th className="py-2.5 px-5 w-2/5">Item Sales</th>
              <th className="py-2.5 px-4 text-center w-1/5">Product ID</th>
              <th className="py-2.5 px-4 text-center w-1/10"># Sold</th>
              <th className="py-2.5 px-4 text-right w-1/7">Sales</th>
              <th className="py-2.5 px-5 text-right w-1/7">% Sales</th>
            </tr>
          </thead>

          {/* Grouped Categories */}
          <tbody className="divide-y divide-neutral-200/60 font-650 text-neutral-800">
            {data.map((category, catIdx) => (
              <React.Fragment key={catIdx}>
                {/* Category Header Banner */}
                <tr className="bg-brand-primary text-white">
                  <td colSpan={5} className="py-2.5 px-5 font-950 text-[11px] uppercase tracking-wider">
                    {category.categoryName}
                  </td>
                </tr>

                {/* Category Items */}
                {category.items.map((item, itemIdx) => (
                  <tr key={itemIdx} className="hover:bg-neutral-50/70 border-b border-neutral-100">
                    <td className="py-2.5 px-5 font-700 text-neutral-900">{item.name}</td>
                    <td className="py-2.5 px-4 text-center font-600 text-neutral-500">{item.productId || 'M----'}</td>
                    <td className="py-2.5 px-4 text-center font-600 text-neutral-700">{item.quantitySold}</td>
                    <td className="py-2.5 px-4 text-right font-700 text-neutral-800">${item.totalSales.toFixed(2)}</td>
                    <td className="py-2.5 px-5 text-right font-600 text-neutral-500">{item.percentageSales.toFixed(2)} %</td>
                  </tr>
                ))}

                {/* Subtotal Row */}
                <tr className="bg-neutral-50/50 font-800 border-b border-neutral-200">
                  <td className="py-3 px-5 text-brand-primary font-850">
                    Subtotal ({category.categoryName})
                  </td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-center text-brand-primary font-850">
                    {category.subtotalSold}
                  </td>
                  <td className="py-3 px-4 text-right text-brand-primary font-850">
                    ${category.subtotalSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-5"></td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
