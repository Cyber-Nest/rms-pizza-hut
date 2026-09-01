/* 
======================================================================
ORIGINAL CODE (COMMENTED OUT)
======================================================================
"use client";

import React from "react";
import { ShoppingCart, Plus } from "lucide-react";
import { MenuItem } from "../types";
import { usePosStore } from "../store/pos.store";
import { getLocalDayName } from "../utils/timezone";

interface MenuCardProps {
  item: MenuItem;
  onOpenModifiers: (item: MenuItem) => void;
}

const BADGE_STYLES: Record<string, string> = {
  popular: "bg-brand-primary text-white",
  "best seller": "bg-amber-500 text-white",
  new: "bg-emerald-500 text-white",
};

export default function MenuCard({ item, onOpenModifiers }: MenuCardProps) {
  const { addToCart } = usePosStore();
  const hasModifiers = !!item.modifierGroups?.length || !!item.hasVariants;
  const isOutOfStock = !!item.isOutOfStock;

  const getItemEffectivePrice = () => {
    const today = getLocalDayName();
    const prodId = (item.id || (item as any)._id || item.productId) as string;
    const deals = (item as any).dealsOfTheDay || [];
    const matchedDeal = deals.find(
      (d: any) =>
        d.isActive &&
        d.dayOfWeek?.toLowerCase() === today &&
        (d.productId === prodId ||
          (d.productId as any)?._id === prodId ||
          (d.productId as any)?.id === prodId ||
          !d.productId),
    );
    const szConfig = matchedDeal?.sizes?.find(
      (s: any) =>
        s.isEnabled && typeof s.dealPrice === "number" && s.dealPrice > 0,
    );
    return szConfig ? szConfig.dealPrice : item.price;
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    hasModifiers
      ? onOpenModifiers(item)
      : addToCart({ ...item, price: getItemEffectivePrice() }, []);
  };

  return (
    <div
      onClick={() => {
        if (isOutOfStock) return;
        hasModifiers
          ? onOpenModifiers(item)
          : addToCart({ ...item, price: getItemEffectivePrice() }, []);
      }}
      className={`group relative flex flex-col bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
        isOutOfStock
          ? "border-neutral-200 bg-neutral-50/70 opacity-60 cursor-not-allowed select-none"
          : "border-neutral-200 cursor-pointer hover:border-brand-primary/50 hover:shadow-md hover:shadow-brand-primary/8 active:scale-[0.99]"
      }`}
    >
      {item.badge && !isOutOfStock && (
        <span
          className={`absolute top-2 left-2 z-10 text-[8px] font-700 uppercase tracking-wider px-1.5 py-0.5 rounded-md ${BADGE_STYLES[item.badge.toLowerCase()] ?? "bg-neutral-500 text-white"}`}
        >
          {item.badge}
        </span>
      )}

      <div className="h-[100px] lg:h-[115px] w-full overflow-hidden bg-neutral-100 relative flex-shrink-0">
        <img
          src={
            item.image ||
            "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60"
          }
          alt={item.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60";
          }}
          className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock ? "group-hover:scale-105" : "grayscale"}`}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-neutral-900/50 z-20 flex items-center justify-center">
            <span className="bg-neutral-800 text-white text-[9px] lg:text-[10px] font-900 uppercase tracking-wider px-2 py-0.5 rounded-md border border-neutral-700/80 shadow-sm">
              Out of stock
            </span>
          </div>
        )}
        {!isOutOfStock && (
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <button
              onClick={handleAdd}
              className="p-2.5 bg-white text-brand-primary hover:bg-brand-primary hover:text-white rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              {hasModifiers ? (
                <Plus size={17} strokeWidth={2.5} />
              ) : (
                <ShoppingCart size={17} strokeWidth={2} />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between gap-1.5">
        <div>
          <h4
            className={`text-[14px] lg:text-[16px] font-900 leading-tight transition-colors line-clamp-1 ${isOutOfStock ? "text-neutral-450" : "text-black group-hover:text-brand-primary"}`}
          >
            {item.name}
          </h4>
          <p className="text-[10px] lg:text-[12px] text-neutral-400 font-400 leading-snug line-clamp-2 mt-0.5">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span
            className={`text-[13px] lg:text-[15px] font-800 ${isOutOfStock ? "text-neutral-400" : "text-neutral-900"}`}
          >
            {(() => {
              const today = getLocalDayName();
              const prodId = (item.id ||
                (item as any)._id ||
                item.productId) as string;
              const deals = (item as any).dealsOfTheDay || [];
              const matchedDeal = deals.find(
                (d: any) =>
                  d.isActive &&
                  d.dayOfWeek?.toLowerCase() === today &&
                  (d.productId === prodId ||
                    (d.productId as any)?._id === prodId ||
                    (d.productId as any)?.id === prodId ||
                    !d.productId),
              );
              const szConfig = matchedDeal?.sizes?.find(
                (s: any) =>
                  s.isEnabled &&
                  typeof s.dealPrice === "number" &&
                  s.dealPrice > 0,
              );
              const simpleDealPrice = szConfig ? szConfig.dealPrice : null;

              if (
                item.hasVariants &&
                item.variants &&
                item.variants.length > 0
              ) {
                const availableVars = item.variants.filter(
                  (v) => v.isEnabled !== false,
                );
                const varsToUse =
                  availableVars.length > 0 ? availableVars : item.variants;
                const minPrice = Math.min(
                  ...varsToUse.map((v) => {
                    const dealSZ = matchedDeal?.sizes?.find(
                      (s: any) =>
                        s.sizeCode === v.sizeCode &&
                        s.isEnabled &&
                        s.dealPrice > 0,
                    );
                    return dealSZ ? dealSZ.dealPrice : v.price;
                  }),
                );
                return (
                  <>
                    <span className="text-[10px] font-600 text-neutral-400">
                      From{" "}
                    </span>
                    ${minPrice.toFixed(2)}
                  </>
                );
              }

              if (simpleDealPrice !== null) {
                return (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-neutral-400 line-through">
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="text-brand-primary font-900">
                      🔥 ${simpleDealPrice.toFixed(2)}
                    </span>
                  </div>
                );
              }

              return `$${item.price.toFixed(2)}`;
            })()}
          </span>
          {!isOutOfStock ? (
            <button
              onClick={handleAdd}
              className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 group-hover:border-brand-primary group-hover:text-brand-primary hover:bg-orange-50 transition-all cursor-pointer active:scale-90"
            >
              {hasModifiers ? (
                <Plus size={13} strokeWidth={2.5} />
              ) : (
                <ShoppingCart size={13} strokeWidth={2} />
              )}
            </button>
          ) : (
            <span className="text-[9px] font-800 uppercase text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/50">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
======================================================================
ACTIVE DUPLICATED CODE (MODIFIED FOR NEW LAYOUT)
======================================================================
*/

"use client";

import React from "react";
import { ShoppingCart, Plus } from "lucide-react";
import { MenuItem } from "../types";
import { usePosStore } from "../store/pos.store";
import { getLocalDayName } from "../utils/timezone";

interface MenuCardProps {
  item: MenuItem;
  onOpenModifiers: (item: MenuItem) => void;
}

const BADGE_STYLES: Record<string, string> = {
  popular: "bg-brand-primary text-white",
  "best seller": "bg-amber-500 text-white",
  new: "bg-emerald-500 text-white",
};

export default function MenuCard({ item, onOpenModifiers }: MenuCardProps) {
  const { addToCart } = usePosStore();
  const hasModifiers = !!item.modifierGroups?.length || !!item.hasVariants;
  const isOutOfStock = !!item.isOutOfStock;

  const getItemEffectivePrice = () => {
    const today = getLocalDayName();
    const prodId = (item.id || (item as any)._id || item.productId) as string;
    const deals = (item as any).dealsOfTheDay || [];
    const matchedDeal = deals.find(
      (d: any) =>
        d.isActive &&
        d.dayOfWeek?.toLowerCase() === today &&
        (d.productId === prodId ||
          (d.productId as any)?._id === prodId ||
          (d.productId as any)?.id === prodId ||
          !d.productId),
    );
    const szConfig = matchedDeal?.sizes?.find(
      (s: any) =>
        s.isEnabled && typeof s.dealPrice === "number" && s.dealPrice > 0,
    );
    return szConfig ? szConfig.dealPrice : item.price;
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    hasModifiers
      ? onOpenModifiers(item)
      : addToCart({ ...item, price: getItemEffectivePrice() }, []);
  };

  return (
    <div
      onClick={() => {
        if (isOutOfStock) return;
        hasModifiers
          ? onOpenModifiers(item)
          : addToCart({ ...item, price: getItemEffectivePrice() }, []);
      }}
      className={`group relative flex flex-col bg-white rounded-xl border overflow-hidden transition-all duration-200 ${
        isOutOfStock
          ? "border-neutral-200 bg-neutral-50/70 opacity-60 cursor-not-allowed select-none"
          : "border-neutral-200 cursor-pointer hover:border-brand-primary/50 hover:shadow-md hover:shadow-brand-primary/8 active:scale-[0.99]"
      }`}
    >
      {/* Badge */}
      {item.badge && !isOutOfStock && (
        <span
          className={`absolute top-2 left-2 z-10 text-[8px] font-700 uppercase tracking-wider px-1.5 py-0.5 rounded-md ${BADGE_STYLES[item.badge.toLowerCase()] ?? "bg-neutral-500 text-white"}`}
        >
          {item.badge}
        </span>
      )}

      {/* Image */}
      <div className="h-[100px] lg:h-[115px] w-full overflow-hidden bg-neutral-100 relative flex-shrink-0">
        <img
          src={
            item.image ||
            "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60"
          }
          alt={item.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=60";
          }}
          className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock ? "group-hover:scale-105" : "grayscale"}`}
        />
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-neutral-900/50 z-20 flex items-center justify-center">
            <span className="bg-neutral-800 text-white text-[9px] lg:text-[10px] font-900 uppercase tracking-wider px-2 py-0.5 rounded-md border border-neutral-700/80 shadow-sm">
              Out of stock
            </span>
          </div>
        )}
        {/* Quick-add overlay */}
        {!isOutOfStock && (
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <button
              onClick={handleAdd}
              className="p-2.5 bg-white text-brand-primary hover:bg-brand-primary hover:text-white rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              {hasModifiers ? (
                <Plus size={17} strokeWidth={2.5} />
              ) : (
                <ShoppingCart size={17} strokeWidth={2} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-1.5">
        <div>
          <h4
            className={`text-[14px] lg:text-[16px] font-900 leading-tight transition-colors line-clamp-1 ${isOutOfStock ? "text-neutral-450" : "text-black group-hover:text-brand-primary"}`}
          >
            {item.name}
          </h4>

          {/* Description commented out as requested */}
          {/* <p className="text-[10px] lg:text-[12px] text-neutral-400 font-400 leading-snug line-clamp-2 mt-0.5">
            {item.description}
          </p> */}
        </div>

        {/* Pricing commented out as requested */}
        {/* <div className="flex items-center justify-between mt-1">
          <span
            className={`text-[13px] lg:text-[15px] font-800 ${isOutOfStock ? "text-neutral-400" : "text-neutral-900"}`}
          >
            {(() => {
              const today = getLocalDayName();
              const prodId = (item.id ||
                (item as any)._id ||
                item.productId) as string;
              const deals = (item as any).dealsOfTheDay || [];
              const matchedDeal = deals.find(
                (d: any) =>
                  d.isActive &&
                  d.dayOfWeek?.toLowerCase() === today &&
                  (d.productId === prodId ||
                    (d.productId as any)?._id === prodId ||
                    (d.productId as any)?.id === prodId ||
                    !d.productId),
              );
              const szConfig = matchedDeal?.sizes?.find(
                (s: any) =>
                  s.isEnabled &&
                  typeof s.dealPrice === "number" &&
                  s.dealPrice > 0,
              );
              const simpleDealPrice = szConfig ? szConfig.dealPrice : null;

              if (
                item.hasVariants &&
                item.variants &&
                item.variants.length > 0
              ) {
                const availableVars = item.variants.filter(
                  (v) => v.isEnabled !== false,
                );
                const varsToUse =
                  availableVars.length > 0 ? availableVars : item.variants;
                const minPrice = Math.min(
                  ...varsToUse.map((v) => {
                    const dealSZ = matchedDeal?.sizes?.find(
                      (s: any) =>
                        s.sizeCode === v.sizeCode &&
                        s.isEnabled &&
                        s.dealPrice > 0,
                    );
                    return dealSZ ? dealSZ.dealPrice : v.price;
                  }),
                );
                return (
                  <>
                    <span className="text-[10px] font-600 text-neutral-400">
                      From{" "}
                    </span>
                    ${minPrice.toFixed(2)}
                  </>
                );
              }

              if (simpleDealPrice !== null) {
                return (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-neutral-400 line-through">
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="text-brand-primary font-900">
                      🔥 ${simpleDealPrice.toFixed(2)}
                    </span>
                  </div>
                );
              }

              return `$${item.price.toFixed(2)}`;
            })()}
          </span>
          {!isOutOfStock ? (
            <button
              onClick={handleAdd}
              className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 group-hover:border-brand-primary group-hover:text-brand-primary hover:bg-orange-50 transition-all cursor-pointer active:scale-90"
            >
              {hasModifiers ? (
                <Plus size={13} strokeWidth={2.5} />
              ) : (
                <ShoppingCart size={13} strokeWidth={2} />
              )}
            </button>
          ) : (
            <span className="text-[9px] font-800 uppercase text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/50">
              Unavailable
            </span>
          )}
        </div> */}
      </div>
    </div>
  );
}
