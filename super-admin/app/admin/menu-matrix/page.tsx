"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  SlidersHorizontal,
  Store,
  Search,
  Folder,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  ImageIcon,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";

interface Branch {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Category {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  disabledBranches?: string[];
  displayOrder: number;
}

interface Product {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  image?: string;
  categoryId: any;
  kitchenLabel?: string;
  disabledBranches?: string[];
  productId?: string;
  isActive?: boolean;
}

export default function MenuMatrixPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const MENU_API_URL = `${BASE_API_URL}/menu`;

  const getAuthConfig = () => {
    if (typeof window === "undefined") return { withCredentials: true };
    const token = localStorage.getItem("rms_superadmin_token");
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchesRes, catRes, prodRes] = await Promise.all([
        axios.get(`${BASE_API_URL}/branches?isActive=true&minimal=true`, getAuthConfig()),
        axios.get(`${MENU_API_URL}/categories`, getAuthConfig()),
        axios.get(`${MENU_API_URL}/products?minimal=true`, getAuthConfig()),
      ]);

      if (branchesRes.data.success) {
        setBranches(branchesRes.data.data.filter((b: Branch) => b.isActive));
      }
      if (catRes.data.success) {
        setCategories(catRes.data.data);
      }
      if (prodRes.data.success) {
        setProducts(prodRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load matrix data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Toggle Category Branch Visibility
  const handleToggleCategoryBranch = async (categoryId: string, branchId: string, isCurrentlyHidden: boolean) => {
    const key = `cat-${categoryId}-${branchId}`;
    setUpdatingId(key);
    try {
      const isHidden = !isCurrentlyHidden;
      const res = await axios.patch(
        `${MENU_API_URL}/categories/${categoryId}/toggle-branch`,
        { branchId, isHidden },
        getAuthConfig()
      );

      if (res.data.success) {
        setCategories((prev) =>
          prev.map((c) => {
            const id = c._id || c.id;
            if (id === categoryId) {
              const curDisabled = c.disabledBranches || [];
              const updatedDisabled = isHidden
                ? [...curDisabled, branchId]
                : curDisabled.filter((b) => b !== branchId);
              return { ...c, disabledBranches: updatedDisabled };
            }
            return c;
          })
        );
      }
    } catch (err: any) {
      toast.error("Failed to update category visibility: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle Product Branch Visibility
  const handleToggleProductBranch = async (productId: string, branchId: string, isCurrentlyHidden: boolean) => {
    const key = `prod-${productId}-${branchId}`;
    setUpdatingId(key);
    try {
      const isHidden = !isCurrentlyHidden;
      const res = await axios.patch(
        `${MENU_API_URL}/products/${productId}/toggle-branch`,
        { branchId, isHidden },
        getAuthConfig()
      );

      if (res.data.success) {
        setProducts((prev) =>
          prev.map((p) => {
            const id = p._id || p.id;
            if (id === productId) {
              const curDisabled = p.disabledBranches || [];
              const updatedDisabled = isHidden
                ? [...curDisabled, branchId]
                : curDisabled.filter((b) => b !== branchId);
              return { ...p, disabledBranches: updatedDisabled };
            }
            return p;
          })
        );
      }
    } catch (err: any) {
      toast.error("Failed to update product visibility: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  // Group products by category
  const groupedData = useMemo(() => {
    return categories.map((cat) => {
      const catId = (cat._id || cat.id) as string;
      const catProducts = products.filter((prod) => {
        const prodCatId = typeof prod.categoryId === "object" ? prod.categoryId._id || prod.categoryId.id : prod.categoryId;
        return prodCatId === catId;
      });

      // Filter by search
      const matchesCategory = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredProducts = catProducts.filter(
        (p) =>
          matchesCategory ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.productId && p.productId.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      return {
        category: cat,
        products: filteredProducts,
        totalProducts: catProducts.length,
      };
    }).filter((group) => {
      if (selectedCategoryFilter !== "all") {
        const catId = group.category._id || group.category.id;
        if (catId !== selectedCategoryFilter) return false;
      }
      return searchTerm ? group.products.length > 0 : true;
    });
  }, [categories, products, searchTerm, selectedCategoryFilter]);

  // Filter branches by branch search input
  const displayedBranches = useMemo(() => {
    if (!branchSearchTerm.trim()) return branches;
    const term = branchSearchTerm.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term)
    );
  }, [branches, branchSearchTerm]);

  // Shorten branch name for matrix header (trims repetitive Pizza Hut prefix)
  const getShortBranchName = (fullName: string) => {
    const trimmed = fullName.replace(/^pizza\s+hut\s*[-–—]?\s*/i, "").trim();
    return trimmed || fullName;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Controls in 1 Single Card */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Description */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-primary flex-shrink-0">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h1 className="text-lg font-800 text-neutral-900">Branch Menu Allocation Matrix</h1>
              <p className="text-xs text-neutral-500 font-500">
                Control menu availability for each branch in a single matrix grid
              </p>
            </div>
          </div>

          {/* Right Controls: Item Search, Branch Search, Category Filter, Refresh */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Search Item / Category */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Filter Branch */}
            <div className="relative flex-1 sm:w-48">
              <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Filter branches..."
                value={branchSearchTerm}
                onChange={(e) => setBranchSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 font-600 focus:outline-none focus:border-brand-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-700 rounded-xl transition-all cursor-pointer flex-shrink-0"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div className="py-20 bg-white rounded-2xl border border-neutral-200 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
          <span className="text-xs font-700 text-neutral-500">Loading Menu Matrix...</span>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
          <Store size={36} className="mx-auto text-neutral-300 mb-2" />
          <h3 className="text-sm font-800 text-neutral-800">No Active Branches Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Please create active branches first in Branch Management before configuring the menu matrix.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-800 text-white text-[11px] font-800 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[280px] sticky left-0 bg-neutral-800 z-10 border-r border-neutral-700">
                    Category / Product Item
                  </th>
                  {displayedBranches.map((branch) => (
                    <th
                      key={branch._id}
                      className="py-3.5 px-4 min-w-[140px] text-center border-r border-neutral-700 last:border-r-0"
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="px-1.5 py-0.5 bg-brand-primary text-white text-[8px] font-900 rounded uppercase mb-1">
                          {branch.code}
                        </span>
                        <span className="text-[12px] font-800 text-neutral-100 truncate max-w-[140px]" title={branch.name}>
                          {getShortBranchName(branch.name)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200 text-xs">
                {groupedData.map(({ category, products: catProducts }) => {
                  const catId = (category._id || category.id) as string;
                  const isCollapsed = collapsedCategories[catId];
                  const catDisabled = category.disabledBranches || [];

                  return (
                    <React.Fragment key={catId}>
                      {/* Category Header Row */}
                      <tr className="bg-orange-50/70 border-t-2 border-orange-100">
                        <td className="py-3 px-4 font-800 text-neutral-900 sticky left-0 bg-orange-50/90 z-10 border-r border-orange-200">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleCategoryCollapse(catId)}
                              className="flex items-center gap-2 text-neutral-900 hover:text-brand-primary transition-colors cursor-pointer"
                            >
                              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              <Folder size={15} className="text-brand-primary fill-brand-primary/20" />
                              <span className="font-800 uppercase text-[11px]">{category.name}</span>
                              <span className="text-[9px] bg-white border border-orange-200 text-brand-primary px-1.5 py-0.5 rounded-full font-700">
                                {catProducts.length} items
                              </span>
                            </button>
                          </div>
                        </td>

                        {/* Category Toggles per Branch */}
                        {displayedBranches.map((branch) => {
                          const isCatHidden = catDisabled.includes(branch._id);
                          const updateKey = `cat-${catId}-${branch._id}`;
                          const isUpdating = updatingId === updateKey;

                          return (
                            <td key={branch._id} className="py-3 px-4 text-center border-r border-orange-100 last:border-r-0">
                              <button
                                onClick={() => handleToggleCategoryBranch(catId, branch._id, isCatHidden)}
                                disabled={isUpdating}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-800 tracking-wider uppercase transition-all cursor-pointer border ${
                                  isCatHidden
                                    ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                                    : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs"
                                }`}
                              >
                                {isUpdating ? (
                                  <RefreshCw size={10} className="animate-spin" />
                                ) : isCatHidden ? (
                                  <>
                                    <EyeOff size={10} />Hidden
                                  </>
                                ) : (
                                  <>
                                    <Eye size={10} />Active
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Product Sub-Rows */}
                      {!isCollapsed &&
                        catProducts.map((prod) => {
                          const prodId = (prod._id || prod.id) as string;
                          const prodDisabled = prod.disabledBranches || [];

                          return (
                            <tr key={prodId} className="hover:bg-neutral-50/80 transition-colors">
                              {/* Product Info */}
                              <td className="py-2.5 px-4 pl-8 font-600 text-neutral-800 sticky left-0 bg-white hover:bg-neutral-50/80 z-10 border-r border-neutral-200">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                                    {prod.image ? (
                                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                        <ImageIcon size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-700 text-neutral-900 text-xs truncate max-w-[180px]">
                                        {prod.name}
                                      </span>
                                      {prod.productId && (
                                        <span className="text-[8px] bg-neutral-200 text-neutral-700 px-1 py-0.2 rounded font-mono font-700">
                                          {prod.productId}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                                      <span className="font-800 text-brand-primary">${prod.price.toFixed(2)}</span>
                                      <span>•</span>
                                      <span className="font-600">
                                        {prod.kitchenLabel === "make_table" || prod.kitchenLabel === "pizza" ? "🍕 Make Table" : "🍗 Wings Station"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Product Branch Toggle Switches */}
                              {displayedBranches.map((branch) => {
                                const isProdHidden = prodDisabled.includes(branch._id);
                                const isCatHidden = catDisabled.includes(branch._id);
                                const isEffectiveHidden = isProdHidden || isCatHidden;
                                const updateKey = `prod-${prodId}-${branch._id}`;
                                const isUpdating = updatingId === updateKey;

                                return (
                                  <td key={branch._id} className="py-2.5 px-4 text-center border-r border-neutral-100 last:border-r-0">
                                    <button
                                      onClick={() => handleToggleProductBranch(prodId, branch._id, isProdHidden)}
                                      disabled={isUpdating}
                                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        isEffectiveHidden ? "bg-red-400" : "bg-emerald-500"
                                      }`}
                                      title={
                                        isCatHidden
                                          ? "Hidden because Category is Hidden for this branch"
                                          : isProdHidden
                                          ? "Product is Hidden for this branch"
                                          : "Product is Visible for this branch"
                                      }
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          isEffectiveHidden ? "translate-x-0" : "translate-x-5"
                                        }`}
                                      />
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
