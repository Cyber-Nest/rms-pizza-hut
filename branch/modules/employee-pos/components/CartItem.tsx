'use client';

import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '../types';
import { usePosStore } from '../store/pos.store';

export default function CartItem({ item }: { item: CartItemType }) {
  const { increaseQuantity, decreaseQuantity, removeFromCart } = usePosStore();
  const summary = item.selectedModifiers.map((m) => m.optionName).join(', ');

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-neutral-100 group last:border-0">
      {/* Thumbnail */}
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0 mt-0.5">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h5 className="text-[11px] font-600 text-neutral-800 leading-tight truncate">{item.name}</h5>
        <p className="text-[9px] text-neutral-400 font-400 mt-0.5 truncate leading-tight">
          {summary || 'No customization'}
        </p>
        {item.note && (
          <p className="text-[8.5px] font-500 text-amber-600 bg-amber-50 rounded px-1 py-0.5 mt-0.5 border border-amber-100 inline-block max-w-full truncate">
            {item.note}
          </p>
        )}
      </div>

      {/* Qty + Price */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[11px] font-700 text-neutral-900">${item.totalPrice.toFixed(2)}</span>
        <div className="flex items-center gap-1">
          {/* Qty control */}
          <div className="flex items-center border border-neutral-200 rounded-md overflow-hidden bg-white">
            <button onClick={() => decreaseQuantity(item.id)} className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:text-brand-primary transition-all cursor-pointer">
              <Minus size={7} strokeWidth={3} />
            </button>
            <span className="w-5 h-5 flex items-center justify-center text-[10px] font-700 text-neutral-800 border-x border-neutral-200">
              {item.quantity}
            </span>
            <button onClick={() => increaseQuantity(item.id)} className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:text-green-600 transition-all cursor-pointer">
              <Plus size={7} strokeWidth={3} />
            </button>
          </div>
          {/* Delete */}
          <button
            onClick={() => removeFromCart(item.id)}
            className="w-5 h-5 flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 rounded-md transition-all cursor-pointer"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
