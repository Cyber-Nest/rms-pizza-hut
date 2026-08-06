'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { usePosStore } from '../store/pos.store';

export default function CategoryCarousel() {
  const { selectedCategory, setCategory, categories, loadingMenu } = usePosStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full bg-white border-b border-neutral-200 flex items-center px-10 py-2.5 select-none">

      {/* Left Arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-2 z-10 w-7 h-7 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-500 hover:text-brand-primary hover:border-brand-primary/40 hover:shadow-md transition-all cursor-pointer flex-shrink-0"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full scroll-smooth"
      >
        {loadingMenu ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={`cat-skeleton-${idx}`}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[80px] pt-2 pb-1.5 px-1 rounded-xl border border-neutral-200 bg-white animate-pulse"
            >
              <div className="w-12 h-9 rounded-lg bg-neutral-100 flex-shrink-0" />
              <div className="h-2 w-12 bg-neutral-100 rounded mt-0.5" />
            </div>
          ))
        ) : (
          categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 w-[80px] pt-2 pb-1.5 px-1 rounded-xl border transition-all duration-150 cursor-pointer active:scale-95 ${
                  active
                    ? 'bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/20'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-brand-primary/40 hover:bg-orange-50/50'
                }`}
              >
                {/* Image / Icon */}
                <div className="w-12 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {cat.id === 'all' ? (
                    <div className={`flex items-center justify-center w-full h-full rounded-lg ${active ? 'bg-white/20' : 'bg-orange-50'}`}>
                      <LayoutGrid size={20} className={active ? 'text-white' : 'text-brand-primary'} strokeWidth={2} />
                    </div>
                  ) : (
                    <img 
                      src={cat.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=60'} 
                      alt={cat.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=60';
                      }}
                      className={`w-full h-full object-cover rounded-lg border ${active ? 'border-white/30' : 'border-neutral-100'}`} 
                    />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[9px] font-700 uppercase tracking-tight leading-tight text-center line-clamp-2 w-full px-0.5 ${active ? 'text-white' : 'text-neutral-600'}`}>
                  {cat.name}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 z-10 w-7 h-7 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-500 hover:text-brand-primary hover:border-brand-primary/40 hover:shadow-md transition-all cursor-pointer flex-shrink-0"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
