'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { usePosStore } from '../store/pos.store';

export default function SearchBar() {
  const { search, setSearch } = usePosStore();
  return (
    <div className="relative w-full">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items..."
        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg py-1.5 pl-8 pr-7 text-[11px] font-500 text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all"
      />
      {search && (
        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
          <X size={11} />
        </button>
      )}
    </div>
  );
}
