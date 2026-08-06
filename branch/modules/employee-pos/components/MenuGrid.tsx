'use client';

import React, { useMemo } from 'react';
import { MenuItem } from '../types';
import { usePosStore } from '../store/pos.store';
import MenuCard from './MenuCard';
import SearchBar from './SearchBar';
import SortDropdown from './SortDropdown';

interface MenuGridProps {
  onOpenModifiers: (item: MenuItem) => void;
}

export default function MenuGrid({ onOpenModifiers }: MenuGridProps) {
  const { search, selectedCategory, sortBy, menuItems, categories, loadingMenu } = usePosStore();

  const catName = useMemo(() => {
    return categories.find((c) => c.id === selectedCategory)?.name ?? 'All Menus';
  }, [selectedCategory, categories]);

  const items = useMemo(() => {
    let list = selectedCategory === 'all' ? menuItems : menuItems.filter((i) => i.categoryId === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'popular')    return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
      if (sortBy === 'newest')     return (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0);
      if (sortBy === 'price-low')  return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return 0;
    });
  }, [selectedCategory, search, sortBy, menuItems]);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 flex-shrink-0">
        <div>
          <h2 className="text-[13px] font-700 text-neutral-900">{catName}</h2>
          <p className="text-[10px] text-neutral-400 font-500 mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[180px]"><SearchBar /></div>
          <SortDropdown />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pt-3 min-h-0 pr-0.5">
        {loadingMenu ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={`menu-skeleton-${idx}`}
                className="flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden p-2.5 gap-2.5 animate-pulse"
              >
                {/* Image placeholder */}
                <div className="h-[90px] w-full bg-neutral-100 rounded-lg flex-shrink-0" />
                
                {/* Body placeholder */}
                <div className="flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    {/* Title */}
                    <div className="h-3 w-3/4 bg-neutral-100 rounded" />
                    {/* Description */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-neutral-50 rounded" />
                      <div className="h-2 w-5/6 bg-neutral-50 rounded" />
                    </div>
                  </div>
                  {/* Price and Cart button */}
                  <div className="flex justify-between items-center mt-1">
                    <div className="h-3.5 w-1/3 bg-neutral-100 rounded" />
                    <div className="h-6 w-6 bg-neutral-100 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((item) => (
              <MenuCard key={item.id} item={item} onOpenModifiers={onOpenModifiers} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border border-dashed border-neutral-200 rounded-xl p-6 text-center bg-neutral-50">
            <span className="text-2xl mb-2">🧐</span>
            <h4 className="text-[11px] font-600 text-neutral-700">No items found</h4>
            <p className="text-[9.5px] text-neutral-400 mt-1 leading-normal">
              No results for &ldquo;{search}&rdquo; in {catName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
