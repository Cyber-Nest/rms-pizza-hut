"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ShoppingBag,
  Search,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  Trash2,
  Plus,
  Minus,
  Flame,
  Info,
  Maximize2,
  X,
} from "lucide-react";
import { Category, MenuItem } from "../types";
import { useCart } from "../context/CartContext";
import ModifierModal from "../components/ModifierModal";
import CheckoutModal from "../components/CheckoutModal";
import OrderStatusModal from "../components/OrderStatusModal";
import { fallbackCategories, fallbackMenuItems } from "../data/menuData";
import { isBranchCurrentlyOpen } from "../lib/storeTimingUtils";

import StoreLandingView, { BranchStore } from "../components/StoreLandingView";

export default function HomePage() {
  const {
    cartItems,
    orderType,
    setOrderType,
    address,
    setAddress,
    subtotal,
    tax,
    deliveryFee,
    total,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    setBranchDeliveryFee,
    branchTaxRate,
    setBranchTaxRate,
  } = useCart();

  // Multi-Restaurant Branch States
  const [branches, setBranches] = useState<BranchStore[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<BranchStore | null>(
    null,
  );

  // Menu states
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [addressInput, setAddressInput] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Customizer modal state
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [autoOpenMap, setAutoOpenMap] = useState(false);

  const applyBranchSettings = (branch: BranchStore) => {
    const taxFees = branch.settings?.taxFeesSettings;
    if (taxFees) {
      if (taxFees.deliveryFee !== undefined) {
        setBranchDeliveryFee(Number(taxFees.deliveryFee) || 0);
      }
      const totalTaxRate =
        (Number(taxFees.gstTaxRate) || 0) +
        (Number(taxFees.pstTaxRate) || 0) +
        (Number(taxFees.hstTaxRate) || 0);
      if (totalTaxRate > 0) {
        setBranchTaxRate(totalTaxRate);
      }
    }
  };

  // Load public branches and restore selected branch on mount
  useEffect(() => {
    async function loadPublicBranches() {
      setLoadingBranches(true);
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${apiUrl}/branches/public`);
        if (res.data.success && Array.isArray(res.data.data)) {
          setBranches(res.data.data);

          // Restore saved branch if valid
          const savedBranchStr = localStorage.getItem("cd_user_branch");
          if (savedBranchStr) {
            try {
              const parsed = JSON.parse(savedBranchStr);
              const matched = res.data.data.find(
                (b: BranchStore) => b._id === parsed._id,
              );
              if (matched) {
                setSelectedBranch(matched);
                applyBranchSettings(matched);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Failed to load public branches:", err);
      } finally {
        setLoadingBranches(false);
      }
    }
    loadPublicBranches();
  }, []);

  // Fetch Branch-Scoped Menu when selectedBranch changes
  useEffect(() => {
    if (!selectedBranch) return;
    const currentBranchId = selectedBranch._id;

    async function loadMenu() {
      setLoading(true);
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await axios.get(`${apiUrl}/menu/pos-feed`, {
          params: { branchId: currentBranchId },
        });
        if (res.data.success) {
          const dealsOfTheDay = res.data.data.dealsOfTheDay || [];
          const menuItems = (res.data.data.menuItems || []).map((item: any) => ({
            ...item,
            dealsOfTheDay,
          }));
          setCategories(res.data.data.categories || []);
          setMenuItems(menuItems);
        }
      } catch (err) {
        console.warn("Error loading branch menu:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, [selectedBranch]);

  const executeSelectBranch = (branch: BranchStore) => {
    clearCart();
    setSelectedBranch(branch);
    localStorage.setItem("cd_user_branch", JSON.stringify(branch));
    applyBranchSettings(branch);
  };

  const handleSelectBranch = (branch: BranchStore) => {
    if (
      cartItems.length > 0 &&
      selectedBranch &&
      selectedBranch._id !== branch._id
    ) {
      toast((t) => (
        <div className="flex flex-col gap-2 p-1 text-xs">
          <p className="font-700 text-neutral-900">Switching to {branch.name} will clear your current cart. Continue?</p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeSelectBranch(branch);
              }}
              className="px-2.5 py-1 font-700 bg-brand-primary text-white rounded-lg cursor-pointer shadow-sm"
            >
              Switch & Clear Cart
            </button>
          </div>
        </div>
      ), { duration: 5000, position: "top-center" });
      return;
    }
    setSelectedBranch(branch);
    localStorage.setItem("cd_user_branch", JSON.stringify(branch));
    applyBranchSettings(branch);
  };

  const handleSwitchStoreClick = () => {
    if (cartItems.length > 0) {
      toast((t) => (
        <div className="flex flex-col gap-2 p-1 text-xs">
          <p className="font-700 text-neutral-900">Changing store will clear your current bag items. Continue?</p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                clearCart();
                setSelectedBranch(null);
              }}
              className="px-2.5 py-1 font-700 bg-brand-primary text-white rounded-lg cursor-pointer shadow-sm"
            >
              Clear & Switch
            </button>
          </div>
        </div>
      ), { duration: 5000, position: "top-center" });
    } else {
      setSelectedBranch(null);
    }
  };

  // Sync state input with context on load
  useEffect(() => {
    if (address) {
      setAddressInput(address);
    }
  }, [address]);

  // Load active order from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedOrder = localStorage.getItem("cd_active_order");
      if (savedOrder) {
        try {
          setActiveOrder(JSON.parse(savedOrder));
          setShowStatusModal(true); // Open tracker automatically on load
        } catch (e) {
          console.error("Failed to parse active order", e);
        }
      }
    }
  }, []);

  const handlePlaceOrder = async (orderPayload: any) => {
    setIsPlacingOrder(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const finalPayload = {
        ...orderPayload,
        branchId: selectedBranch?._id || orderPayload.branchId,
      };
      const res = await axios.post(`${apiUrl}/orders`, finalPayload);
      if (res.data.success) {
        const createdOrder = res.data.data;
        setActiveOrder(createdOrder);
        if (typeof window !== "undefined") {
          localStorage.setItem("cd_active_order", JSON.stringify(createdOrder));
        }
        clearCart();
        setShowCheckoutModal(false);
        setShowStatusModal(true);
        toast.success("Order placed successfully!");
      } else {
        throw new Error(res.data.message || "Failed to place order");
      }
    } catch (err) {
      console.warn(
        "API connection failed, falling back to local simulation",
        err,
      );
      // Fallback local simulation payload
      const mockOrder = {
        ...orderPayload,
        _id: "mock-" + Math.random().toString(36).substr(2, 9),
        orderNumber: String(Math.floor(100 + Math.random() * 900)),
        createdAt: new Date().toISOString(),
      };
      setActiveOrder(mockOrder);
      if (typeof window !== "undefined") {
        localStorage.setItem("cd_active_order", JSON.stringify(mockOrder));
      }
      clearCart();
      setShowCheckoutModal(false);
      setShowStatusModal(true);
      toast.success("Order placed successfully (Demo mode)!");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleDismissActiveOrder = () => {
    setActiveOrder(null);
    setShowStatusModal(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cd_active_order");
    }
  };

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    let list = menuItems;

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter((item) => item.categoryId === selectedCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q),
      );
    }

    // Sort list
    return [...list].sort((a, b) => {
      if (sortBy === "popular")
        return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [menuItems, selectedCategory, searchQuery, sortBy]);

  const handleOpenModifiers = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setActiveItem(item);
    } else {
      // Add directly to cart if no modifiers exist
      addToCart(item, [], 1, "");
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      setAddress(addressInput);
      setShowAddressModal(false);
    }
  };

  if (!selectedBranch) {
    return (
      <StoreLandingView
        branches={branches}
        loading={loadingBranches}
        onSelectStore={handleSelectBranch}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-brand-bg text-neutral-900 font-sans select-none">
      {/* ── HEADER NAVIGATION ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Brand Logo & Change Restaurant Trigger */}
        <div className="flex items-center gap-3">
          <div
            onClick={handleSwitchStoreClick}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img
              src="/pizza-hut-logo.webp"
              alt="Pizza Hut"
              className="h-14 w-[100px] object-contain rounded-sm transition-transform group-hover:scale-105"
            />
          </div>

          <button
            type="button"
            onClick={handleSwitchStoreClick}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full text-[11px] font-bold transition-all cursor-pointer border border-neutral-200"
          >
            <MapPin size={12} className="text-brand-primary" />
            <span>Switch Store</span>
          </button>
        </div>

        {/* Order Mode & Address Banner */}
        <div className="hidden md:flex items-center gap-3.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200/50">
          <div className="flex bg-white shadow-sm rounded-lg overflow-hidden border border-neutral-200/30">
            <button
              onClick={() => setOrderType("takeout")}
              className={`px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                orderType === "takeout"
                  ? "bg-brand-primary text-white"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Pickup
            </button>
            <button
              onClick={() => {
                setOrderType("delivery");
                if (!address) setShowAddressModal(true);
              }}
              className={`px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                orderType === "delivery"
                  ? "bg-brand-primary text-white"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Delivery
            </button>
          </div>

          <button
            onClick={() => setShowAddressModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-neutral-600 hover:text-brand-primary transition-colors font-medium border-l border-neutral-200"
          >
            <MapPin size={13} className="text-brand-primary" />
            <span className="max-w-[160px] truncate">
              {address ? address : "Set Delivery Address"}
            </span>
            <ChevronRight size={10} className="opacity-50" />
          </button>
        </div>

        {/* Shopping Cart Summary Trigger */}
        <div className="flex items-center gap-3">
          {activeOrder && (
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              className="relative flex items-center gap-1.5 bg-white hover:bg-neutral-50 text-neutral-800 px-3 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all active:scale-[0.97] cursor-pointer border border-neutral-200/80 shadow-sm whitespace-nowrap"
            >
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-primary"></span>
              </span>
              <span>Track Order</span>
            </button>
          )}

          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative flex items-center gap-2 bg-brand-primary text-white hover:bg-brand-primary-hover px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] cursor-pointer shadow-md shadow-brand-primary/10"
          >
            <ShoppingBag size={14} />
            <span className="hidden sm:inline">My Bag</span>
            {cartItems.length > 0 && (
              <span className="flex items-center justify-center w-5 h-5 bg-white text-brand-primary rounded-full text-[10px] font-black border border-brand-primary/10">
                {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Address Selection strip */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-brand-primary-light border-b border-brand-primary-muted/20 text-xs shadow-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() =>
              setOrderType(orderType === "takeout" ? "delivery" : "takeout")
            }
            className="flex-shrink-0 bg-brand-primary text-white text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider cursor-pointer active:scale-95 transition-transform"
          >
            {orderType}
          </button>
          <button
            type="button"
            onClick={() => setShowAddressModal(true)}
            className="flex items-center gap-1.5 text-neutral-700 font-semibold truncate text-[11px] min-w-0 flex-1 cursor-pointer"
          >
            <MapPin size={12} className="text-brand-primary flex-shrink-0" />
            <span className="truncate">
              {orderType === "delivery"
                ? address
                  ? address
                  : "Set Delivery Address"
                : "Strathmore Branch Counter"}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowAddressModal(true)}
          className="text-[10px] font-black text-brand-primary uppercase tracking-wider ml-3 flex-shrink-0 hover:underline cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* ── STORE DETAILS BANNER ── */}
      <section className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-200 overflow-hidden flex-shrink-0 hidden sm:block">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=60"
              alt="Restaurant facade"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const statusInfo = isBranchCurrentlyOpen(selectedBranch);
                return (
                  <>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                        statusInfo.isOpen
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}
                    >
                      {statusInfo.reason}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      ·
                    </span>
                    <span className="text-[10px] text-neutral-500 font-semibold">
                      Today: {statusInfo.scheduleText}
                    </span>
                  </>
                );
              })()}
              <span className="text-[10px] text-neutral-400 font-medium">
                ·
              </span>
              <button
                type="button"
                onClick={handleSwitchStoreClick}
                className="text-[10px] text-brand-primary font-bold hover:underline cursor-pointer"
              >
                Change Restaurant
              </button>
            </div>
            <h2 className="text-base font-black text-neutral-900 mt-1 leading-tight">
              {selectedBranch.name}
            </h2>
            <p className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1 font-medium">
              <MapPin size={11} className="text-neutral-400" />
              {selectedBranch.address || "Main City Location"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t md:border-t-0 border-neutral-100 pt-3 md:pt-0 text-[11px] text-neutral-600 font-semibold">
          {selectedBranch.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="text-brand-primary" />
              <span>{selectedBranch.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-brand-primary" />
            <span>Delivery: 30-45 mins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-brand-primary" />
            <span>Min. Order $15.00</span>
          </div>
        </div>
      </section>

      {/* ── CATEGORY STICKY BAR & SEARCH ── */}
      <div className="sticky top-[61px] md:top-[63px] z-30 bg-brand-bg border-b border-neutral-200 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        {/* Category Carousel */}
        <div className="flex-1 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-neutral-800 text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search & Sort Panel */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative w-full sm:w-[180px]">
            <Search
              className="absolute left-3 top-2.5 text-neutral-400"
              size={13}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full bg-white border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-600 font-bold focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
          >
            <option value="popular">Popularity</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* ── MAIN CONTAINER (SPLIT SCREEN LAYOUT) ── */}
      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-6 min-h-0">
        {/* LEFT COLUMN: PRODUCT GRID (75% on Desktop) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {loading ? (
            /* Loading skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col bg-white rounded-2xl border border-neutral-200/60 overflow-hidden p-3.5 gap-3 animate-pulse"
                >
                  <div className="h-[120px] w-full bg-neutral-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 bg-neutral-100 rounded" />
                    <div className="h-2 w-full bg-neutral-50 rounded" />
                    <div className="h-2 w-4/5 bg-neutral-50 rounded" />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-4 w-1/4 bg-neutral-100 rounded" />
                    <div className="h-8 w-8 bg-neutral-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredItems.map((item) => {
                const hasModifiers =
                  item.modifierGroups && item.modifierGroups.length > 0;
                const isOutOfStock = !!item.isOutOfStock;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-row sm:flex-col bg-white rounded-2xl border overflow-hidden p-3 sm:p-3.5 gap-3.5 transition-all duration-200 ${
                      isOutOfStock
                        ? "border-neutral-200 bg-neutral-50/70 opacity-65 cursor-not-allowed select-none"
                        : "border-neutral-200/60 hover:shadow-lg hover:border-neutral-300/40 group"
                    }`}
                  >
                    {/* Food Image Container */}
                    <div className="relative h-[95px] w-[95px] sm:h-[130px] sm:w-full bg-neutral-50 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=300&auto=format&fit=crop&q=60"
                        }
                        alt={item.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=300&auto=format&fit=crop&q=60";
                        }}
                        className={`w-full h-full object-cover transition-transform duration-300 ${!isOutOfStock ? "group-hover:scale-105" : "grayscale"}`}
                      />
                      {/* Out of Stock Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-neutral-900/50 z-20 flex items-center justify-center">
                          <span className="bg-neutral-800 text-white text-[9px] sm:text-[10px] font-900 uppercase tracking-wider px-2.5 py-1 rounded-md border border-neutral-700/80 shadow-md">
                            Out of stock
                          </span>
                        </div>
                      )}
                      {/* Badge (e.g. Popular, New) */}
                      {item.badge && !isOutOfStock && (
                        <span className="absolute top-2 left-2 bg-brand-primary text-white text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                          <Flame
                            size={9}
                            className="fill-white animate-pulse"
                          />
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Food Info */}
                    <div className="flex-1 flex flex-col justify-between gap-1.5 sm:gap-3 min-w-0">
                      <div>
                        <h3
                          className={`text-xs sm:text-[13px] font-extrabold leading-snug truncate sm:whitespace-normal ${isOutOfStock ? "text-neutral-450" : "text-neutral-800 group-hover:text-brand-primary transition-colors"}`}
                        >
                          {item.name}
                        </h3>
                        <p className="text-[9.5px] sm:text-[10px] text-neutral-400 font-medium leading-relaxed mt-1 sm:mt-1.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Pricing & CTA Button */}
                      <div className="flex justify-between items-center mt-1 border-t border-neutral-50 pt-2 sm:pt-2.5">
                        <div>
                          <p className="text-[8.5px] sm:text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                            Price
                          </p>
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const today = [
                                "sunday",
                                "monday",
                                "tuesday",
                                "wednesday",
                                "thursday",
                                "friday",
                                "saturday",
                              ][new Date().getDay()];
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
                                  s.isEnabled &&
                                  typeof s.dealPrice === "number" &&
                                  s.dealPrice > 0,
                              );
                              const dealPrice = szConfig ? szConfig.dealPrice : null;

                              if (dealPrice !== null) {
                                return (
                                  <>
                                    <span className="text-[10px] text-neutral-400 line-through">
                                      ${item.price.toFixed(2)}
                                    </span>
                                    <span className="text-[12px] sm:text-[14px] font-black text-brand-primary">
                                      🔥 ${dealPrice.toFixed(2)}
                                    </span>
                                  </>
                                );
                              }

                              return (
                                <span
                                  className={`text-[12px] sm:text-[14px] font-black ${
                                    isOutOfStock
                                      ? "text-neutral-400"
                                      : "text-neutral-800"
                                  }`}
                                >
                                  ${item.price.toFixed(2)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            !isOutOfStock && handleOpenModifiers(item)
                          }
                          disabled={isOutOfStock}
                          className={`px-2.5 py-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md transition-all flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs ${
                            isOutOfStock
                              ? "bg-neutral-200 border border-neutral-350 text-neutral-400 cursor-not-allowed shadow-none"
                              : "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-brand-primary/10 active:scale-90 cursor-pointer"
                          }`}
                        >
                          {!isOutOfStock ? (
                            <>
                              <Plus size={12} strokeWidth={3} />
                              <span>{hasModifiers ? "Customize" : "Add"}</span>
                            </>
                          ) : (
                            <span>Out of stock</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty Filter Search View */
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-neutral-300/80 rounded-2xl p-6 text-center bg-white">
              <span className="text-3xl mb-2">🧐</span>
              <h4 className="text-xs font-bold text-neutral-700">
                No dishes match your filters
              </h4>
              <p className="text-[10px] text-neutral-400 mt-1 max-w-[240px] leading-relaxed">
                Could not find any items matching &ldquo;{searchQuery}&rdquo; in
                our{" "}
                {categories.find((c) => c.id === selectedCategory)?.name ||
                  "menus"}
                .
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PERSISTENT DESKTOP CART (25% on Desktop) */}
        <aside className="hidden lg:flex w-[28%] flex-col bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm h-fit max-h-[85vh]">
          <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200/80 flex-shrink-0">
            <h3 className="text-xs font-black text-neutral-800 flex items-center gap-2">
              <ShoppingBag size={14} className="text-brand-primary" />
              <span>Shopping Bag</span>
            </h3>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] font-bold text-neutral-400 hover:text-brand-red transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>

          {/* Cart items scrollbox */}
          <div
            className={`flex-1 overflow-y-auto min-h-0 py-3 divide-y divide-neutral-100 max-h-[40vh] no-scrollbar pr-0.5 ${cartItems.length === 0 ? "flex flex-col justify-center" : ""}`}
          >
            {cartItems.length > 0 ? (
              cartItems.map((cartItem) => (
                <div key={cartItem.id} className="py-3 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2 justify-between">
                    <div>
                      <h4 className="text-[11px] font-extrabold text-neutral-800 leading-snug">
                        {cartItem.name}
                      </h4>
                      {/* Selected modifiers display */}
                      {cartItem.selectedModifiers.length > 0 && (
                        <div className="text-[9px] text-neutral-400 mt-1 space-y-0.5">
                          {cartItem.selectedModifiers.map((mod) => (
                            <p
                              key={mod.optionId}
                              className="flex items-center gap-1 pl-1"
                            >
                              <span className="text-brand-primary">•</span>
                              <span>{mod.optionName}</span>
                              {mod.price > 0 && (
                                <span>(+${mod.price.toFixed(2)})</span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                      {cartItem.note && (
                        <p className="text-[9px] text-brand-primary font-medium italic mt-1 bg-orange-50/50 px-2 py-0.5 rounded-md border border-orange-100/50">
                          Note: &ldquo;{cartItem.note}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-neutral-700 ml-auto flex-shrink-0">
                      ${cartItem.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Qty incrementors */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-lg px-2 py-0.5">
                      <button
                        onClick={() => decreaseQuantity(cartItem.id)}
                        className="text-neutral-500 hover:text-brand-primary cursor-pointer p-0.5"
                      >
                        <Minus size={9} />
                      </button>
                      <span className="text-[10px] font-black text-neutral-800 w-3 text-center">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => increaseQuantity(cartItem.id)}
                        className="text-neutral-500 hover:text-brand-primary cursor-pointer p-0.5"
                      >
                        <Plus size={9} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(cartItem.id)}
                      className="text-[9px] font-bold text-neutral-400 hover:text-brand-red cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              /* Empty Bag view */
              <div className="flex flex-col items-center justify-center py-10 text-center h-full">
                <span className="text-2xl mb-1.5 opacity-80">🛒</span>
                <p className="text-xs font-bold text-neutral-600">
                  Your bag is empty
                </p>
                <p className="text-[9.5px] text-neutral-400 max-w-[160px] leading-relaxed mt-1">
                  Add savory items from the menu to start your order.
                </p>
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          {cartItems.length > 0 && (
            <div className="border-t border-neutral-200/80 pt-3.5 space-y-2 flex-shrink-0">
              <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                  <span>Delivery Fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                <span>GST ({branchTaxRate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-neutral-800 border-t border-neutral-100 pt-2 flex-shrink-0">
                <span>Total Amount</span>
                <span className="text-sm text-brand-primary">
                  ${total.toFixed(2)}
                </span>
              </div>

              {/* Simulated submit trigger */}
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-brand-primary/10 transition-all active:scale-[0.98] mt-3.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* ── MOBILE CART SIDEBAR OVERLAY ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
          />
          <div className="relative w-full max-w-md bg-white h-full flex flex-col p-5 shadow-2xl z-10 animate-drawer-slide-in">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 flex-shrink-0">
              <h3 className="text-xs font-black text-neutral-800 flex items-center gap-2">
                <ShoppingBag size={14} className="text-brand-primary" />
                <span>My Ordering Bag</span>
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-7 h-7 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-lg flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Cart Items Scroll */}
            <div
              className={`flex-1 overflow-y-auto py-3 divide-y divide-neutral-100 no-scrollbar ${cartItems.length === 0 ? "flex flex-col justify-center" : ""}`}
            >
              {cartItems.length > 0 ? (
                cartItems.map((cartItem) => (
                  <div key={cartItem.id} className="py-3 flex flex-col gap-1.5">
                    <div className="flex items-start gap-2 justify-between">
                      <div>
                        <h4 className="text-[11px] font-extrabold text-neutral-800 leading-snug">
                          {cartItem.name}
                        </h4>
                        {cartItem.selectedModifiers.length > 0 && (
                          <div className="text-[9px] text-neutral-400 mt-1 space-y-0.5">
                            {cartItem.selectedModifiers.map((mod) => (
                              <p
                                key={mod.optionId}
                                className="flex items-center gap-1 pl-1"
                              >
                                <span className="text-brand-primary">•</span>
                                <span>{mod.optionName}</span>
                                {mod.price > 0 && (
                                  <span>(+${mod.price.toFixed(2)})</span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                        {cartItem.note && (
                          <p className="text-[9px] text-brand-primary font-medium italic mt-1 bg-orange-50/50 px-2 py-0.5 rounded-md border border-orange-100/50">
                            Note: &ldquo;{cartItem.note}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-neutral-700 ml-auto flex-shrink-0">
                        ${cartItem.totalPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2.5 border border-neutral-200 bg-white rounded-lg px-2.5 py-0.5">
                        <button
                          onClick={() => decreaseQuantity(cartItem.id)}
                          className="text-neutral-500 hover:text-brand-primary cursor-pointer p-0.5"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-[10px] font-black text-neutral-800 w-3 text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(cartItem.id)}
                          className="text-neutral-500 hover:text-brand-primary cursor-pointer p-0.5"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(cartItem.id)}
                        className="text-[9px] font-bold text-neutral-400 hover:text-brand-red cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center h-full">
                  <span className="text-3xl mb-2 opacity-80">🛒</span>
                  <p className="text-xs font-bold text-neutral-600">
                    Your bag is empty
                  </p>
                  <p className="text-[10px] text-neutral-400 max-w-[200px] leading-relaxed mt-1">
                    Select mouthwatering meals from the menu list to build your
                    order!
                  </p>
                </div>
              )}
            </div>

            {/* Totals Summary */}
            {cartItems.length > 0 && (
              <div className="border-t border-neutral-200 pt-3.5 space-y-2 flex-shrink-0">
                <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {orderType === "delivery" && (
                  <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                    <span>Delivery Fee</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                  <span>GST ({branchTaxRate}%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-neutral-800 border-t border-neutral-100 pt-2">
                  <span>Total Amount</span>
                  <span className="text-sm text-brand-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={clearCart}
                    className="px-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setShowCheckoutModal(true);
                    }}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-brand-primary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ChevronRight size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE FLOATING STICKY ACTION BAR ── */}
      {cartItems.length > 0 && !isCartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-lg z-30 flex items-center justify-between gap-3 animate-fade-in">
          <div>
            <p className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-wide">
              My Bag Total
            </p>
            <p className="text-[13px] font-black text-neutral-800">
              ${total.toFixed(2)}&nbsp;
              <span className="text-[10px] text-neutral-400 font-normal">
                ({cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} item
                {cartItems.length !== 1 ? "s" : ""})
              </span>
            </p>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-brand-primary/15 cursor-pointer"
          >
            <span>View Bag</span>
            <ChevronRight size={12} strokeWidth={3} />
          </button>
        </div>
      )}

      {/* ── DELIVERY ADDRESS SELECTION MODAL ── */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowAddressModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
          />
          <form
            onSubmit={handleSaveAddress}
            className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl p-6 z-10 animate-scale-up space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-primary" />
                <span>Enter Address</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="w-7 h-7 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-lg flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
              Please enter your delivery details below to check availability and
              calculate delivery fees.
            </p>

            <div>
              <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Full Delivery Address
              </label>
              <input
                type="text"
                required
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="E.g. Apt 105, 231 Edgefield Pl, Strathmore, AB"
                className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-brand-primary/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              Confirm Address
            </button>
          </form>
        </div>
      )}

      {/* ── PRODUCT CUSTOMIZER DRAWERS ── */}
      <ModifierModal
        item={activeItem}
        isOpen={activeItem !== null}
        onClose={() => setActiveItem(null)}
      />

      {/* ── STICKY ACTIVE ORDER WIDGET ── */}
      {activeOrder && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-white/95 backdrop-blur-md border border-neutral-200/80 text-neutral-800 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3.5 animate-fade-in transition-all duration-300 hover:border-neutral-300/80 hover:shadow-[0_16px_50px_rgba(0,0,0,0.16)] select-none">
          <div
            onClick={() => {
              setAutoOpenMap(false);
              setShowStatusModal(true);
            }}
            className="flex-1 min-w-0 cursor-pointer flex items-center gap-3"
          >
            {/* Status icon with animated pulse */}
            <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center">
              <ShoppingBag size={18} className="text-brand-primary" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-primary"></span>
              </span>
            </div>

            {/* Content info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest leading-none">
                  {activeOrder.status === "pending" && "Order Placed"}
                  {activeOrder.status === "preparing" && "Preparing"}
                  {activeOrder.status === "ready" && "Out for Delivery"}
                  {activeOrder.status === "completed" && "Delivered"}
                  {activeOrder.status === "cancelled" && "Cancelled"}
                </span>
              </div>
              <h4 className="text-[13px] font-black text-neutral-800 truncate mt-1 leading-snug">
                {activeOrder.items?.[0]?.name || "Your Order"}
                {activeOrder.items?.length > 1
                  ? ` + ${activeOrder.items.length - 1} items`
                  : ""}
              </h4>
              <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed truncate">
                {activeOrder.status === "pending" &&
                  "Waiting for branch confirmation"}
                {activeOrder.status === "preparing" &&
                  "Kitchen is cooking your meal"}
                {activeOrder.status === "ready" && "Driver is en route to you!"}
                {activeOrder.status === "completed" && "Enjoy your hot meal!"}
              </p>
            </div>
          </div>

          {/* Right Action */}
          {activeOrder.orderType === "delivery" &&
          activeOrder.status === "ready" ? (
            <button
              onClick={() => {
                setAutoOpenMap(true);
                setShowStatusModal(true);
              }}
              className="flex-shrink-0 bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-extrabold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <MapPin size={13} className="text-white" />
              <span>Track Map</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setAutoOpenMap(false);
                setShowStatusModal(true);
              }}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* ── CHECKOUT MODAL ── */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedBranch={selectedBranch}
        cartItems={cartItems}
        orderType={orderType}
        setOrderType={setOrderType}
        address={address}
        setAddress={setAddress}
        subtotal={subtotal}
        tax={tax}
        deliveryFee={deliveryFee}
        total={total}
        onSubmit={handlePlaceOrder}
        isSubmitting={isPlacingOrder}
      />

      {/* ── ORDER STATUS MODAL ── */}
      {activeOrder && (
        <OrderStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          order={activeOrder}
          selectedBranch={selectedBranch}
          onDismiss={handleDismissActiveOrder}
          autoOpenMap={autoOpenMap}
        />
      )}
    </div>
  );
}
