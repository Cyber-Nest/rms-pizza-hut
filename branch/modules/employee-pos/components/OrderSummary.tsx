'use client';

import React from 'react';
import { usePosStore } from '../store/pos.store';

export default function OrderSummary() {
  const { subtotal, tax, discount, total } = usePosStore();

  return (
    <div className="space-y-1.5 text-[11px] font-bold text-gray-600 px-0.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-500">Subtotal</span>
        <span className="text-gray-800">${subtotal.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-500">Tax (HST 13%)</span>
        <span className="text-gray-800">${tax.toFixed(2)}</span>
      </div>
      {discount > 0 && (
        <div className="flex items-center justify-between text-emerald-600">
          <span className="font-semibold">Discount</span>
          <span>-${discount.toFixed(2)}</span>
        </div>
      )}
      <hr className="border-gray-150 my-1" />
      <div className="flex items-center justify-between text-gray-900">
        <span className="text-[11px] font-black uppercase tracking-wider">Total</span>
        <span className="text-sm font-black text-brand-red">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
