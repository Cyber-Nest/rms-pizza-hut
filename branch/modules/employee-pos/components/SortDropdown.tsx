'use client';

import React from 'react';
import { usePosStore } from '../store/pos.store';

export default function SortDropdown() {
  const { sortBy, setSort } = usePosStore();
  return (
    <div className="relative">
      <select
        value={sortBy}
        onChange={(e) => setSort(e.target.value)}
        className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] font-600 text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 cursor-pointer transition-all hover:border-neutral-300"
      >
        <option value="popular">Popular</option>
        <option value="newest">Newest</option>
        <option value="price-low">Price ↑</option>
        <option value="price-high">Price ↓</option>
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-[9px]">▼</div>
    </div>
  );
}
