/* 
======================================================================
ORIGINAL CODE (COMMENTED OUT)
======================================================================
"use client";

import React, { useMemo } from "react";
import { MenuItem } from "../types";
import { usePosStore } from "../store/pos.store";
import MenuCard from "./MenuCard";
import SearchBar from "./SearchBar";
import SortDropdown from "./SortDropdown";

interface MenuGridProps {
  onOpenModifiers: (item: MenuItem) => void;
}

export default function MenuGrid({ onOpenModifiers }: MenuGridProps) {
  const {
    search,
    selectedCategory,
    sortBy,
    menuItems,
    categories,
    loadingMenu,
  } = usePosStore();

  const catName = useMemo(() => {
    return (
      categories.find((c) => c.id === selectedCategory)?.name ??
      (categories[0]?.name || "Menu")
    );
  }, [selectedCategory, categories]);

  const items = useMemo(() => {
    let list =
      !selectedCategory || selectedCategory === "all"
        ? menuItems
        : menuItems.filter((i) => i.categoryId === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = (selectedCategory && selectedCategory !== "all" ? list : menuItems).filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "popular") {
        const pDiff = (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
        if (pDiff !== 0) return pDiff;
      } else if (sortBy === "newest") {
        const bDiff = (b.badge === "New" ? 1 : 0) - (a.badge === "New" ? 1 : 0);
        if (bDiff !== 0) return bDiff;
      } else if (sortBy === "price-low") {
        const prDiff = a.price - b.price;
        if (prDiff !== 0) return prDiff;
      } else if (sortBy === "price-high") {
        const prDiff = b.price - a.price;
        if (prDiff !== 0) return prDiff;
      }

      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      if (orderA > 0 && orderB > 0) return orderA - orderB;
      if (orderA > 0 && orderB === 0) return -1;
      if (orderA === 0 && orderB > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [selectedCategory, search, sortBy, menuItems]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 flex-shrink-0">
        <div>
          <h2 className="text-[14px] lg:text-[15.5px] font-900 text-neutral-900">{catName}</h2>
          <p className="text-[11px] lg:text-[12px] text-neutral-500 font-600 mt-0.5">
            {items.length} item{items.length !== 1 ? "" : ""} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[140px] md:w-[180px]">
            <SearchBar />
          </div>
          <SortDropdown />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-3 min-h-0 pr-0.5">
        {loadingMenu ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={`menu-skeleton-${idx}`}
                className="flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden p-2.5 gap-2.5 animate-pulse"
              >
                <div className="h-[90px] w-full bg-neutral-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-neutral-100 rounded" />
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-neutral-50 rounded" />
                      <div className="h-2 w-5/6 bg-neutral-50 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="h-3.5 w-1/3 bg-neutral-100 rounded" />
                    <div className="h-6 w-6 bg-neutral-100 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
            {items.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                onOpenModifiers={onOpenModifiers}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border border-dashed border-neutral-200 rounded-xl p-6 text-center bg-neutral-50">
            <span className="text-2xl mb-2">🧐</span>
            <h4 className="text-[11px] font-600 text-neutral-700">
              No items found
            </h4>
            <p className="text-[9.5px] text-neutral-400 mt-1 leading-normal">
              No results for &ldquo;{search}&rdquo; in {catName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
======================================================================
ACTIVE DUPLICATED CODE
======================================================================
*/

"use client";

import React, { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { MenuItem } from "../types";
import { usePosStore } from "../store/pos.store";
import MenuCard from "./MenuCard";
import SearchBar from "./SearchBar";
import SortDropdown from "./SortDropdown";
import CustomerModal from "./CustomerModal";
import CategoryCarousel from "./CategoryCarousel";

interface MenuGridProps {
  onOpenModifiers: (item: MenuItem) => void;
}

const ORDER_TYPES = [
  { id: 'takeout', label: 'Takeout' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'dine-in', label: 'Dine In' },
] as const;

export default function MenuGrid({ onOpenModifiers }: MenuGridProps) {
  const {
    search,
    selectedCategory,
    sortBy,
    menuItems,
    categories,
    loadingMenu,
    orderType,
    setOrderType,
    selectedCustomer,
  } = usePosStore();

  const [showCustomer, setShowCustomer] = useState(false);

  const catName = useMemo(() => {
    return (
      categories.find((c) => c.id === selectedCategory)?.name ??
      (categories[0]?.name || "Menu")
    );
  }, [selectedCategory, categories]);

  const items = useMemo(() => {
    let list =
      !selectedCategory || selectedCategory === "all"
        ? menuItems
        : menuItems.filter((i) => i.categoryId === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = (selectedCategory && selectedCategory !== "all" ? list : menuItems).filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "popular") {
        const pDiff = (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
        if (pDiff !== 0) return pDiff;
      } else if (sortBy === "newest") {
        const bDiff = (b.badge === "New" ? 1 : 0) - (a.badge === "New" ? 1 : 0);
        if (bDiff !== 0) return bDiff;
      } else if (sortBy === "price-low") {
        const prDiff = a.price - b.price;
        if (prDiff !== 0) return prDiff;
      } else if (sortBy === "price-high") {
        const prDiff = b.price - a.price;
        if (prDiff !== 0) return prDiff;
      }

      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      if (orderA > 0 && orderB > 0) return orderA - orderB;
      if (orderA > 0 && orderB === 0) return -1;
      if (orderA === 0 && orderB > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [selectedCategory, search, sortBy, menuItems]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-2 border-b border-neutral-200 flex-shrink-0 gap-2">
        {/* Left: Category Title & items count */}
        <div className="flex-shrink-0">
          <h2 className="text-[13px] md:text-[14px] lg:text-[15.5px] font-900 text-neutral-900">{catName}</h2>
          <p className="text-[10px] md:text-[10.5px] lg:text-[11.5px] text-neutral-500 font-600 mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Center: Order Type Tabs (Takeout, Delivery, Dine In) + Customer Info */}
        <div className="flex items-center gap-0.5 md:gap-1 bg-neutral-100/90 p-0.5 md:p-1 rounded-xl border border-neutral-200 flex-shrink-0">
          {ORDER_TYPES.map(({ id, label }) => {
            const active = orderType === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setOrderType(id as any);
                  if (id === 'delivery') setShowCustomer(true);
                }}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10.5px] md:text-[11.5px] lg:text-[12.5px] font-900 transition-all cursor-pointer ${
                  active
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-neutral-200/60'
                }`}
              >
                {label}
              </button>
            );
          })} 

          <button
            onClick={() => setShowCustomer(true)}
            className={`ml-0.5 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg border text-[10px] md:text-[11px] lg:text-[12px] font-900 flex items-center gap-1 transition-all cursor-pointer ${
              selectedCustomer
                ? 'bg-orange-50 border-brand-primary text-brand-primary'
                : 'bg-white border-neutral-200 text-black hover:bg-neutral-50'
            }`}
          >
            <UserPlus size={11} />
            {selectedCustomer ? selectedCustomer.name : '+ Customer'}
          </button>
        </div>

        {/* Right: Search & Sort */}
        <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
          <div className="w-[100px] md:w-[130px] lg:w-[160px]">
            <SearchBar />
          </div>
          <SortDropdown />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pt-3 min-h-0 pr-0.5">
        {loadingMenu ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-2.5">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={`menu-skeleton-${idx}`}
                className="flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden p-2.5 gap-2.5 animate-pulse"
              >
                <div className="h-[90px] w-full bg-neutral-100 rounded-lg flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-neutral-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-2.5">
            {items.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                onOpenModifiers={onOpenModifiers}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border border-dashed border-neutral-200 rounded-xl p-6 text-center bg-neutral-50">
            <span className="text-2xl mb-2">🧐</span>
            <h4 className="text-[11px] font-600 text-neutral-700">
              No items found
            </h4>
            <p className="text-[9.5px] text-neutral-400 mt-1 leading-normal">
              No results for &ldquo;{search}&rdquo; in {catName}
            </p>
          </div>
        )}
      </div>

      <CustomerModal isOpen={showCustomer} onClose={() => setShowCustomer(false)} />
    </div>
  );
}
