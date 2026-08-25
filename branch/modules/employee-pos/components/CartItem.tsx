'use client';

import React from 'react';
import { Plus, Minus, Trash2, Pencil } from 'lucide-react';
import { CartItem as CartItemType } from '../types';
import { usePosStore } from '../store/pos.store';

interface CartItemProps {
  item: CartItemType;
  onEdit?: (item: CartItemType) => void;
}

export default function CartItem({ item, onEdit }: CartItemProps) {
  const { increaseQuantity, decreaseQuantity, removeFromCart } = usePosStore();

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-neutral-100 group last:border-0">
      {/* Thumbnail */}
      <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0 mt-0.5">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h5 className="text-[12px] lg:text-[14px] font-800 text-neutral-800 leading-tight break-words">{item.name}</h5>
        {item.selectedModifiers && item.selectedModifiers.length > 0 ? (
          <div className="text-[10px] lg:text-[12px] text-neutral-500 mt-1 space-y-0.5 leading-tight">
            {item.selectedModifiers.map((m, idx) => (
              <p
                key={idx}
                className={
                  m.isRoot
                    ? "font-700 text-neutral-700 mt-1.5 first:mt-0.5"
                    : "pl-2 text-neutral-500 font-500"
                }
              >
                {m.isRoot ? m.optionName : `• ${m.optionName}`}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[10px] lg:text-[10.5px] text-neutral-400 font-400 mt-0.5 leading-tight">
            No customization
          </p>
        )}
        {item.note && (
          <p className="text-[9px] lg:text-[10px] font-600 text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 mt-1 border border-amber-100 inline-block max-w-full break-words">
            {item.note}
          </p>
        )}
      </div>

      {/* Qty + Price */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[12px] lg:text-[14px] font-800 text-neutral-900">${item.totalPrice.toFixed(2)}</span>
        <div className="flex items-center gap-1">
          {/* Qty control */}
          <div className="flex items-center border border-neutral-200 rounded-md overflow-hidden bg-white">
            <button onClick={() => decreaseQuantity(item.id)} className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:text-brand-primary transition-all cursor-pointer">
              <Minus size={9} strokeWidth={3} />
            </button>
            <span className="w-6 h-6 flex items-center justify-center text-[11px] lg:text-[12px] font-800 text-neutral-800 border-x border-neutral-200">
              {item.quantity}
            </span>
            <button onClick={() => increaseQuantity(item.id)} className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 hover:text-green-600 transition-all cursor-pointer">
              <Plus size={9} strokeWidth={3} />
            </button>
          </div>
          {/* Edit */}
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="w-6 h-6 flex items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-all cursor-pointer"
              title="Edit item"
            >
              <Pencil size={11} />
            </button>
          )}
          {/* Delete */}
          <button
            onClick={() => removeFromCart(item.id)}
            className="w-6 h-6 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-md transition-all cursor-pointer"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
