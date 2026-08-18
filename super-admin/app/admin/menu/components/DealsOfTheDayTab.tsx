import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  Flame,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Sparkles,
  Tag,
  Percent,
} from "lucide-react";
import { Product } from "../types";
import { API_URL, getAuthConfig } from "../utils";

export interface DealSizeConfig {
  sizeCode: string;
  sizeName: string;
  originalPrice: number;
  dealPrice: number;
  isEnabled: boolean;
}

export interface DealOfTheDay {
  id?: string;
  _id?: string;
  dayOfWeek: string;
  productId: any;
  sizes: DealSizeConfig[];
  isActive: boolean;
}

interface DealsOfTheDayTabProps {
  products: Product[];
  showToast: (text: string, type?: "success" | "error") => void;
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

export default function DealsOfTheDayTab({
  products,
  showToast,
}: DealsOfTheDayTabProps) {
  const [selectedDay, setSelectedDay] = useState("monday");
  const [deals, setDeals] = useState<DealOfTheDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealSizes, setDealSizes] = useState<DealSizeConfig[]>([]);
  const [dealIsActive, setDealIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/deals-of-the-day`);
      if (res.data.success) {
        setDeals(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to load Deals of the Day", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const currentDayDeals = deals.filter(
    (d) => d.dayOfWeek.toLowerCase() === selectedDay.toLowerCase(),
  );

  const handleSelectProductForDeal = (prod: Product, existingDeal?: DealOfTheDay) => {
    setSelectedProduct(prod);
    setSearchProductQuery("");

    if (existingDeal) {
      setEditingDealId((existingDeal.id || existingDeal._id) as string);
      setDealIsActive(existingDeal.isActive);
      setDealSizes(existingDeal.sizes || []);
    } else {
      setEditingDealId(null);
      setDealIsActive(true);

      // Build default deal sizes array from product variants, modifier options, or base price
      if (prod.hasVariants && prod.variants && prod.variants.length > 0) {
        const initialSizes: DealSizeConfig[] = prod.variants.map((v) => ({
          sizeCode: v.sizeCode,
          sizeName: v.sizeName,
          originalPrice: v.price,
          dealPrice: v.price,
          isEnabled: false,
        }));
        setDealSizes(initialSizes);
      } else if ((prod as any).modifierGroups && Array.isArray((prod as any).modifierGroups)) {
        const modOptions: DealSizeConfig[] = [];
        (prod as any).modifierGroups.forEach((mg: any) => {
          if (mg && mg.options && Array.isArray(mg.options)) {
            mg.options.forEach((opt: any) => {
              const optId = (opt.id || opt._id || opt.name) as string;
              modOptions.push({
                sizeCode: optId,
                sizeName: mg.options.length > 1 ? `${mg.name}: ${opt.name}` : opt.name,
                originalPrice: opt.price ?? 0,
                dealPrice: opt.price ?? 0,
                isEnabled: false,
              });
            });
          }
        });

        if (modOptions.length > 0) {
          setDealSizes(modOptions);
        } else {
          setDealSizes([
            {
              sizeCode: "regular",
              sizeName: "Regular",
              originalPrice: prod.price,
              dealPrice: prod.price,
              isEnabled: true,
            },
          ]);
        }
      } else {
        setDealSizes([
          {
            sizeCode: "regular",
            sizeName: "Regular",
            originalPrice: prod.price,
            dealPrice: prod.price,
            isEnabled: true,
          },
        ]);
      }
    }
  };

  const handleSizeChange = (
    index: number,
    field: "dealPrice" | "isEnabled",
    val: any,
  ) => {
    const updated = [...dealSizes];
    if (field === "dealPrice") {
      updated[index].dealPrice = parseFloat(val) || 0;
    } else if (field === "isEnabled") {
      updated[index].isEnabled = val;
    }
    setDealSizes(updated);
  };

  const handleSaveDeal = async () => {
    if (!selectedProduct) return;
    const prodId = (selectedProduct.id || (selectedProduct as any)._id) as string;

    const payload = {
      dayOfWeek: selectedDay,
      productId: prodId,
      sizes: dealSizes,
      isActive: dealIsActive,
    };

    setSaving(true);
    try {
      let res;
      if (editingDealId) {
        res = await axios.put(
          `${API_URL}/deals-of-the-day/${editingDealId}`,
          payload,
          getAuthConfig(),
        );
      } else {
        res = await axios.post(
          `${API_URL}/deals-of-the-day`,
          payload,
          getAuthConfig(),
        );
      }

      if (res.data.success) {
        showToast(
          `Deal saved for ${selectedProduct.name} on ${
            DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.label
          }!`,
        );
        setSelectedProduct(null);
        setEditingDealId(null);
        fetchDeals();
      }
    } catch (err: any) {
      console.error(err);
      showToast(
        err.response?.data?.message || "Failed to save Deal of the Day",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeal = async (dealId: string, prodName: string) => {
    if (!window.confirm(`Are you sure you want to remove deal for "${prodName}"?`))
      return;
    try {
      const res = await axios.delete(
        `${API_URL}/deals-of-the-day/${dealId}`,
        getAuthConfig(),
      );
      if (res.data.success) {
        showToast(`Deal removed for ${prodName}`);
        fetchDeals();
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to delete deal", "error");
    }
  };

  const handleToggleDealActive = async (deal: DealOfTheDay) => {
    const dealId = (deal.id || deal._id) as string;
    try {
      const res = await axios.put(
        `${API_URL}/deals-of-the-day/${dealId}`,
        { ...deal, isActive: !deal.isActive },
        getAuthConfig(),
      );
      if (res.data.success) {
        showToast(`Deal status updated!`);
        fetchDeals();
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to update status", "error");
    }
  };

  // Filter products for search dropdown
  const filteredProducts = searchProductQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchProductQuery.toLowerCase()),
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      {/* <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-yellow-300 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight">
              Deal of the Day Manager
            </h2>
          </div>
          <p className="text-xs text-orange-100 max-w-xl">
            Configure day-wise recurring special pricing per pizza size. Deals automatically repeat every week on their assigned day across POS and User Frontend!
          </p>
        </div>
      </div> */}

      {/* 7 Days Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS_OF_WEEK.map((day) => {
          const count = deals.filter(
            (d) => d.dayOfWeek.toLowerCase() === day.key && d.isActive,
          ).length;
          const isSelected = selectedDay === day.key;
          return (
            <button
              key={day.key}
              onClick={() => {
                setSelectedDay(day.key);
                setSelectedProduct(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap shadow-sm ${
                isSelected
                  ? "bg-brand-primary text-white shadow-brand-primary/25 scale-[1.02]"
                  : "bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200"
              }`}
            >
              <Calendar size={14} />
              <span>{day.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected
                      ? "bg-white text-brand-primary"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Product Search & Add Section */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
            {/* <Sparkles size={16} className="text-amber-500" /> */}
            Add Deal for{" "}
            <span className="text-brand-primary capitalize">
              {DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.label}
            </span>
          </h3>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              placeholder="Search product to add to deal..."
              value={searchProductQuery}
              onChange={(e) => setSearchProductQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:border-brand-primary font-medium"
            />
            {searchProductQuery && (
              <button
                onClick={() => setSearchProductQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Product Search Results Dropdown */}
        {searchProductQuery.trim() !== "" && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 max-h-60 overflow-y-auto space-y-1">
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-neutral-400 p-2 text-center">
                No matching products found.
              </p>
            ) : (
              filteredProducts.map((p) => {
                const existing = currentDayDeals.find(
                  (d) =>
                    (d.productId?.id || d.productId?._id || d.productId) ===
                    (p.id || (p as any)._id),
                );
                return (
                  <div
                    key={p.id || (p as any)._id}
                    onClick={() => handleSelectProductForDeal(p, existing)}
                    className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-neutral-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          p.image ||
                          "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100"
                        }
                        alt={p.name}
                        className="w-8 h-8 rounded-lg object-cover bg-neutral-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-neutral-800">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          Base Price: ${p.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-brand-primary bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1">
                      <Plus size={11} /> {existing ? "Edit Deal" : "Add Deal"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Selected Product Deal Form Modal / Form */}
        {selectedProduct && (
          <div className="bg-orange-50/40 border border-orange-200 rounded-xl p-4 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedProduct.image ||
                    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100"
                  }
                  alt={selectedProduct.name}
                  className="w-10 h-10 rounded-xl object-cover border border-neutral-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    {editingDealId ? "Edit Deal for" : "Configuring Deal for"}{" "}
                    <span className="text-brand-primary">
                      {selectedProduct.name}
                    </span>
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    Day:{" "}
                    <strong className="capitalize text-neutral-700">
                      {selectedDay}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dealIsActive}
                    onChange={(e) => setDealIsActive(e.target.checked)}
                    className="rounded border-neutral-300 text-brand-primary focus:ring-brand-primary w-4 h-4"
                  />
                  <span>Active Deal</span>
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Per Size Price Configuration Grid */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Set Deal Price Per Size:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {dealSizes.map((sz, idx) => (
                  <div
                    key={sz.sizeCode}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      sz.isEnabled
                        ? "bg-white border-orange-300 shadow-sm ring-1 ring-orange-200"
                        : "bg-neutral-100 border-neutral-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sz.isEnabled}
                          onChange={(e) =>
                            handleSizeChange(idx, "isEnabled", e.target.checked)
                          }
                          className="rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <span>{sz.sizeName || sz.sizeCode}</span>
                      </label>
                      <span className="text-[10px] text-neutral-400 line-through font-semibold">
                        ${sz.originalPrice.toFixed(2)}
                      </span>
                    </div>

                    {sz.isEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-500">
                          Deal Price: $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={sz.dealPrice}
                          onChange={(e) =>
                            handleSizeChange(idx, "dealPrice", e.target.value)
                          }
                          className="w-full bg-orange-50/50 border border-orange-300 rounded-lg px-2.5 py-1 text-xs font-bold text-neutral-900 focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-orange-200/60">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeal}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>Save Deal</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Deals List for Selected Day */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
          <Tag size={15} className="text-brand-primary" />
          Active Deals for{" "}
          <span className="capitalize text-brand-primary">
            {DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.label}
          </span>
          <span className="text-xs text-neutral-400 font-normal">
            ({currentDayDeals.length} configured)
          </span>
        </h3>

        {loading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200">
            <Loader2 className="w-6 h-6 text-brand-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-medium">
              Loading deals...
            </p>
          </div>
        ) : currentDayDeals.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-neutral-200 text-neutral-400 space-y-2">
            <Flame className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-xs font-semibold">
              No deals configured for{" "}
              <span className="capitalize">{selectedDay}</span> yet.
            </p>
            <p className="text-[11px]">
              Search a product above to set special discounted prices for this day!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentDayDeals.map((deal) => {
              const dealId = (deal.id || deal._id) as string;
              const prod = deal.productId;
              const prodName = prod?.name || "Unknown Product";
              const prodImg =
                prod?.image ||
                "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100";

              return (
                <div
                  key={dealId}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-sm space-y-3 ${
                    deal.isActive
                      ? "border-neutral-200 hover:border-brand-primary/40"
                      : "border-neutral-200 bg-neutral-50/60 opacity-65"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={prodImg}
                        alt={prodName}
                        className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-neutral-900">
                            {prodName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              deal.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-neutral-200 text-neutral-600"
                            }`}
                          >
                            {deal.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium">
                          Recurring on every{" "}
                          <strong className="capitalize text-neutral-600">
                            {selectedDay}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleDealActive(deal)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                          deal.isActive
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {deal.isActive ? "Pause" : "Enable"}
                      </button>

                      {prod && (
                        <button
                          onClick={() => handleSelectProductForDeal(prod, deal)}
                          className="p-1.5 text-neutral-500 hover:text-brand-primary hover:bg-orange-50 rounded-lg cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDeal(dealId, prodName)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Configured Size Prices Grid */}
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
                    {deal.sizes
                      .filter((s) => s.isEnabled)
                      .map((sz) => (
                        <div
                          key={sz.sizeCode}
                          className="bg-orange-50/70 border border-orange-200/80 rounded-lg px-2.5 py-1 text-[10.5px] flex items-center gap-1.5"
                        >
                          <span className="font-bold text-neutral-700">
                            {sz.sizeName || sz.sizeCode}:
                          </span>
                          <span className="text-neutral-400 line-through text-[9.5px]">
                            ${sz.originalPrice.toFixed(2)}
                          </span>
                          <span className="font-extrabold text-brand-primary">
                            ${sz.dealPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
