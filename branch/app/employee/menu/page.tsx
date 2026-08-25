'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, UtensilsCrossed, RefreshCw, ArrowLeft, ImageIcon, X } from 'lucide-react';
import PosNavbar from '@/modules/employee-pos/components/PosNavbar';
import POSSidebarDrawer from '@/modules/employee-pos/components/POSSidebarDrawer';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

interface Product {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  itemType: 'simple' | 'combo';
  categoryId?: {
    _id: string;
    id?: string;
    name: string;
  };
  modifierGroups?: any[];
  badge?: string | null;
  productId?: string;
  isActive?: boolean;
  isOutOfStock?: boolean;
}

export default function BranchMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'outOfStock' | 'inactive'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingStockId, setTogglingStockId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const rawBranch = localStorage.getItem('rms_branch');
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const res = await axios.get(`${apiUrl}/menu/products/branch-list`, {
        params: {
          ...(branchId ? { branchId } : {}),
        },
      });
      if (res.data && res.data.success) {
        setProducts(res.data.data || []);
      } else {
        setError('Failed to load menu products');
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.message || 'Error connecting to the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleActive = async (product: Product) => {
    if (togglingId) return; // Prevent double clicks
    
    let branchId: string | undefined = undefined;
    if (typeof window !== 'undefined') {
      const rawBranch = localStorage.getItem('rms_branch');
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          branchId = b._id;
        } catch (e) {}
      }
    }

    const newStatus = product.isActive !== false ? false : true;
    setTogglingId(product._id);
    
    try {
      const res = await axios.patch(`${apiUrl}/menu/products/${product._id}/toggle-active`, {
        isActive: newStatus,
        branchId,
      });
      
      if (res.data && res.data.success) {
        setProducts(prev => 
          prev.map(p => p._id === product._id ? { ...p, isActive: newStatus } : p)
        );
        toast.success(`"${product.name}" is now ${newStatus ? 'Active' : 'Inactive'}`);
      } else {
        toast.error('Failed to update product status');
      }
    } catch (err: any) {
      console.error('Error toggling product status:', err);
      toast.error(err.response?.data?.message || 'Error updating product status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleStock = async (product: Product) => {
    if (togglingStockId) return;
    
    let branchId: string | undefined = undefined;
    if (typeof window !== 'undefined') {
      const rawBranch = localStorage.getItem('rms_branch');
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          branchId = b._id;
        } catch (e) {}
      }
    }

    const newStatus = product.isOutOfStock !== true ? true : false;
    setTogglingStockId(product._id);
    
    try {
      const res = await axios.patch(`${apiUrl}/menu/products/${product._id}/toggle-stock`, {
        isOutOfStock: newStatus,
        branchId,
      });
      
      if (res.data && res.data.success) {
        setProducts(prev => 
          prev.map(p => p._id === product._id ? { ...p, isOutOfStock: newStatus } : p)
        );
        toast.success(`"${product.name}" is now ${newStatus ? 'Out of Stock' : 'In Stock'}`);
      } else {
        toast.error('Failed to update product stock status');
      }
    } catch (err: any) {
      console.error('Error toggling product stock status:', err);
      toast.error(err.response?.data?.message || 'Error updating product stock status');
    } finally {
      setTogglingStockId(null);
    }
  };

  // Filter products by search query and status filter
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 1. Status filter
      if (statusFilter === 'active' && product.isActive === false) return false;
      if (statusFilter === 'outOfStock' && product.isOutOfStock !== true) return false;
      if (statusFilter === 'inactive' && product.isActive !== false) return false;

      // 2. Search query filter
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      
      const nameMatch = product.name?.toLowerCase().includes(query);
      const idMatch = product.productId?.toLowerCase().includes(query);
      const categoryMatch = product.categoryId?.name?.toLowerCase().includes(query);
      
      return nameMatch || idMatch || categoryMatch;
    });
  }, [products, searchQuery, statusFilter]);

  // Pagination Calculations
  const totalEntries = filteredProducts.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const activePage = currentPage > totalPages ? 1 : currentPage;
  const startIndex = (activePage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
  const visibleProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <EmployeePermissionGuard permissionKey="menus">
      <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar Header */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* Control Bar (Matching the project layout style) */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
            <UtensilsCrossed size={16} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-900 text-neutral-900 tracking-tight leading-none">
              Branch Menu Items
            </h1>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative w-[220px] sm:w-[280px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product, category, or ID"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-8 py-1.5 text-[12px] lg:text-[13.5px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary hover:border-neutral-300 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Stats Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 border rounded-full text-[10px] lg:text-[11.5px] font-800 uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                statusFilter === 'all'
                  ? 'bg-neutral-800 text-white border-neutral-800 shadow-sm ring-2 ring-neutral-400/30'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
              }`}
            >
              Total: {products.length}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 border rounded-full text-[10px] lg:text-[11.5px] font-800 uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100 hover:border-emerald-300'
              }`}
            >
              Active: {products.filter(p => p.isActive !== false).length}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('outOfStock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 border rounded-full text-[10px] lg:text-[11.5px] font-800 uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                statusFilter === 'outOfStock'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                  : 'bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100 hover:border-amber-300'
              }`}
            >
              Out of Stock: {products.filter(p => p.isOutOfStock === true).length}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('inactive');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 border rounded-full text-[10px] lg:text-[11.5px] font-800 uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                statusFilter === 'inactive'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-400/30'
                  : 'bg-red-50 text-red-750 border-red-200/60 hover:bg-red-100 hover:border-red-300'
              }`}
            >
              Inactive: {products.filter(p => p.isActive === false).length}
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={fetchProducts}
            className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-250 text-neutral-600 rounded-lg transition-all cursor-pointer shadow-3xs active:scale-95 flex items-center justify-center"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {/* <button
            onClick={() => window.location.href = '/employee/pos'}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-[11px] font-800 uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft size={12} />
            <span>Back to POS</span>
          </button> */}
        </div>
      </div>

      {/* Main Content Area (Matching viewports and scroll) */}
      <div className="flex-1 overflow-hidden p-6 bg-brand-bg flex flex-col min-h-0">
        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col min-h-0 font-sans select-none">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2">
              <span className="animate-spin text-xl">⏳</span>
              <span>Loading branch menu items...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 px-4 space-y-3 flex-1 flex flex-col items-center justify-center">
              <p className="text-red-500 font-800 text-xs">{error}</p>
              <button
                onClick={fetchProducts}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-[10px] font-800 uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Retry Load
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="text-center py-24 text-neutral-450 font-700 text-xs flex-1 flex items-center justify-center">
              No products found matching filters.
            </div>
          ) : (
            <>
              {/* Table Container */}
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[400px]">
                <table className="w-full text-left text-[11px] lg:text-[13px] text-neutral-600 font-600 border-collapse table-auto">
                  <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-550 text-[10px] lg:text-[11.5px] font-800 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="px-5 py-3.5 w-16 text-center">Image</th>
                      <th className="px-5 py-3.5">Item Name</th>
                      <th className="px-5 py-3.5 text-center w-28">Product ID</th>
                      <th className="px-5 py-3.5 w-40">Category</th>
                      <th className="px-5 py-3.5 text-right w-28">Price</th>
                      <th className="px-5 py-3.5 text-center w-36">Stock Status</th>
                      <th className="px-5 py-3.5 text-center w-36">Active Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleProducts.map((product) => (
                      <tr 
                        key={product._id} 
                        className={`hover:bg-orange-50/15 border-b border-neutral-100 transition-colors bg-white last:border-b-0 ${
                          product.isActive === false ? 'opacity-65 bg-neutral-50/40' : ''
                        }`}
                      >
                        {/* Image Thumbnail */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center mx-auto shadow-xs flex-shrink-0 select-none">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-neutral-400">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name & Type */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-800 text-neutral-800 text-[11.5px] lg:text-[13.5px] uppercase">{product.name}</span>
                            <span className="text-[7.5px] lg:text-[9px] font-800 uppercase text-neutral-400 mt-0.5 tracking-wider">
                              {product.itemType === 'combo' ? 'Combo Meal' : 'Simple Item'}
                            </span>
                          </div>
                        </td>

                        {/* Product ID (Clean matching style) */}
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-mono text-[10px] lg:text-[11.5px] font-700 text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            {product.productId || 'M----'}
                          </span>
                        </td>

                        {/* Category (Soft color style matching project) */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full border text-[9.5px] lg:text-[11px] font-750 uppercase tracking-wider bg-orange-50 text-brand-primary border-orange-100/70">
                            {product.categoryId?.name || 'Uncategorized'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-3.5 text-right font-750 text-neutral-500 text-[11.5px] lg:text-[13.5px]">
                          ${product.price.toFixed(2)}
                        </td>

                        {/* Out of Stock Toggle Button */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-3.5">
                            <span 
                              className={`text-[9.5px] font-750 uppercase tracking-wider w-20 text-center select-none ${
                                product.isOutOfStock === true ? 'text-red-650' : 'text-neutral-450'
                              }`}
                            >
                              {product.isOutOfStock === true ? 'Out of Stock' : 'In Stock'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleStock(product)}
                              disabled={togglingStockId === product._id}
                              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                product.isOutOfStock === true ? 'bg-red-600' : 'bg-neutral-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  product.isOutOfStock === true ? 'translate-x-[20px]' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </td>

                        {/* Active/Inactive Toggle Button */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-3.5">
                            <span 
                              className={`text-[9.5px] font-750 uppercase tracking-wider w-14 text-center select-none ${
                                product.isActive !== false ? 'text-emerald-700' : 'text-neutral-400'
                              }`}
                            >
                              {product.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(product)}
                              disabled={togglingId === product._id}
                              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                product.isActive !== false ? 'bg-[#16A34A]' : 'bg-neutral-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  product.isActive !== false ? 'translate-x-[20px]' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="bg-neutral-50/50 border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] lg:text-[12.5px] font-700 text-neutral-500 select-none">
                {/* Left Entries dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-450 font-550">Show</span>
                  <select
                    value={entriesPerPage}
                    onChange={(e) => {
                      setEntriesPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 font-600 focus:outline-none focus:border-brand-primary cursor-pointer hover:border-neutral-300 transition-colors"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-neutral-450 font-550">entries</span>
                </div>

                {/* Middle count */}
                <div className="text-neutral-400 font-550 text-[11.5px]">
                  {totalEntries > 0 ? (
                    <span>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</span>
                  ) : (
                    <span>Showing 0 to 0 of 0 entries</span>
                  )}
                </div>

                {/* Right pagination */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={activePage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all ${
                      activePage === 1
                        ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer'
                    }`}
                  >
                    &larr;
                  </button>

                  {Array.from({ length: totalPages }).map((_, pageIdx) => {
                    const pNum = pageIdx + 1;
                    const active = activePage === pNum;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all cursor-pointer text-[10.5px] ${
                          active
                            ? 'bg-brand-primary text-white shadow-sm border border-brand-primary'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={activePage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all ${
                      activePage === totalPages || totalPages === 0
                        ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer'
                    }`}
                  >
                    &rarr;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

        {/* Sidebar Drawer Component */}
        <POSSidebarDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab="menus"
          onSelectTab={(tabKey) => {
            if (tabKey === 'menus') {
              setIsSidebarOpen(false);
            } else if (tabKey === 'pos') {
              window.location.href = '/employee/pos';
            } else if (tabKey === 'kitchen') {
              window.location.href = '/employee/kitchen';
            } else if (tabKey === 'customers') {
              window.location.href = '/employee/customers';
            } else if (tabKey === 'setting') {
              window.location.href = '/employee/settings';
            } else if (
              ['orders', 'dashboard', 'sales_summary', 'expense_payout', 'transactions', 'reports', 'update_profile', 'change_password'].includes(tabKey)
            ) {
              let targetTab = tabKey;
              if (tabKey === 'transactions') targetTab = 'orders';
              window.location.href = `/employee/orders?view=${targetTab}`;
            }
          }}
        />
      </main>
    </EmployeePermissionGuard>
  );
}
