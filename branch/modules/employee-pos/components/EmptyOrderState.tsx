'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface EmptyOrderStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export default function EmptyOrderState({ icon, title, description }: EmptyOrderStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      <div className="w-12 h-12 bg-gray-50 border border-gray-155 rounded-full flex items-center justify-center text-gray-300 mb-2 shadow-inner">
        {icon || <ShoppingBag size={20} />}
      </div>
      <h4 className="text-xs font-black text-gray-700 uppercase tracking-wide">{title}</h4>
      <p className="text-[9.5px] text-gray-400 mt-1 max-w-[160px] leading-normal font-semibold">
        {description}
      </p>
    </div>
  );
}
