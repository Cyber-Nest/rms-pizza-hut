"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Percent,
  Monitor,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  applicableChannel: "both" | "online" | "pos";
  applicableScope: "all_categories" | "specific_categories";
  categoryIds: string[];
  applicableBranchScope: "all_branches" | "specific_branches";
  branchIds: string[];
  usageLimit: number | null;
  usedCount: number;
  startDate: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Available categories for specific category selection
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "flat",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: "",
    applicableChannel: "both" as "both" | "online" | "pos",
    applicableScope: "all_categories" as "all_categories" | "specific_categories",
    categoryIds: [] as string[],
    applicableBranchScope: "all_branches" as "all_branches" | "specific_branches",
    branchIds: [] as string[],
    usageType: "unlimited" as "unlimited" | "limited",
    usageLimit: "",
    startDate: "",
    expiresAt: "",
    isActive: true,
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const getAuthConfig = () => {
    if (typeof window === "undefined") return { withCredentials: true };
    const token = localStorage.getItem("rms_superadmin_token");
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    };
  };

  // Fetch Promo Codes
  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/promos`, {
        ...getAuthConfig(),
        params: {
          search,
          channel: channelFilter,
          status: statusFilter,
        },
      });
      if (res.data.success) {
        setPromos(res.data.data.promos || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch promo codes");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Categories for selection
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/menu/categories`, getAuthConfig());
      if (res.data.success) {
        setCategoriesList(res.data.data || []);
      }
    } catch (e) {}
  };

  // Fetch Branches for selection
  const fetchBranches = async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API_URL}/branches?isActive=true&minimal=true`, getAuthConfig());
      } catch (err) {
        res = await axios.get(`${API_URL}/branches/public`);
      }

      if (res.data?.success) {
        const rawData = res.data.data;
        const list = Array.isArray(rawData) ? rawData : (rawData?.branches || []);
        setBranchesList(list);
      }
    } catch (e) {
      console.error("Error fetching branches for promo modal:", e);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [search, channelFilter, statusFilter]);

  useEffect(() => {
    fetchCategories();
    fetchBranches();
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPromo(null);
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscount: "",
      applicableChannel: "both",
      applicableScope: "all_categories",
      categoryIds: [],
      applicableBranchScope: "all_branches",
      branchIds: [],
      usageType: "unlimited",
      usageLimit: "",
      startDate: "",
      expiresAt: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description || "",
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount || 0,
      maxDiscount: promo.maxDiscount !== null ? String(promo.maxDiscount) : "",
      applicableChannel: promo.applicableChannel || "both",
      applicableScope: promo.applicableScope || "all_categories",
      categoryIds: promo.categoryIds || [],
      applicableBranchScope: (promo.applicableBranchScope as "all_branches" | "specific_branches") || "all_branches",
      branchIds: promo.branchIds || [],
      usageType: promo.usageLimit !== null ? "limited" : "unlimited",
      usageLimit: promo.usageLimit !== null ? String(promo.usageLimit) : "",
      startDate: promo.startDate ? promo.startDate.slice(0, 10) : "",
      expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : "",
      isActive: promo.isActive,
    });
    setIsModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Promo code is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        maxDiscount: formData.maxDiscount !== "" ? Number(formData.maxDiscount) : null,
        applicableChannel: formData.applicableChannel,
        applicableScope: formData.applicableScope,
        categoryIds: formData.categoryIds,
        applicableBranchScope: formData.applicableBranchScope,
        branchIds: formData.branchIds,
        usageLimit: formData.usageType === "limited" && formData.usageLimit !== "" ? Number(formData.usageLimit) : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        isActive: formData.isActive,
      };

      if (editingPromo) {
        const res = await axios.patch(`${API_URL}/promos/${editingPromo._id}`, payload, getAuthConfig());
        if (res.data.success) {
          toast.success("Promo code updated successfully!");
          setIsModalOpen(false);
          fetchPromos();
        }
      } else {
        const res = await axios.post(`${API_URL}/promos`, payload, getAuthConfig());
        if (res.data.success) {
          toast.success("New promo code created successfully!");
          setIsModalOpen(false);
          fetchPromos();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (promo: PromoCode) => {
    try {
      const res = await axios.patch(`${API_URL}/promos/${promo._id}/toggle-status`, {}, getAuthConfig());
      if (res.data.success) {
        toast.success(`Promo code '${promo.code}' is now ${res.data.data.isActive ? "Active" : "Inactive"}`);
        fetchPromos();
      }
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  // Delete Promo
  const handleDelete = (promo: PromoCode) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2 p-1 text-xs font-sans">
          <p className="font-700 text-neutral-900">
            Delete promo code <b>{promo.code}</b>?
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const res = await axios.delete(`${API_URL}/promos/${promo._id}`, getAuthConfig());
                  if (res.data.success) {
                    toast.success("Promo code deleted!");
                    fetchPromos();
                  }
                } catch (e) {
                  toast.error("Failed to delete promo code");
                }
              }}
              className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: 5000, position: "top-center" }
    );
  };

  const formatDate = (dStr: string | null) => {
    if (!dStr) return "Infinite / No Expiry";
    try {
      return new Date(dStr).toLocaleDateString("en-US", {
        timeZone: "America/Edmonton",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      
      {/* ── Top Header Title Banner ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-brand-primary flex items-center justify-center shadow-xs shrink-0">
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-lg font-900 text-neutral-900 tracking-tight flex items-center gap-2">
              <span>Promo Code Management</span>
              <span className="text-[10px] font-800 bg-orange-100 text-brand-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Multi-Channel
              </span>
            </h1>
            <p className="text-[11px] font-600 text-neutral-500 mt-0.5">
              Create discount coupons valid across Online Website, POS Terminals, or Specific Categories
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-800 rounded-xl shadow-md shadow-brand-primary/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Create New Promo</span>
        </button>
      </div>

      {/* ── Filters & Search Header Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative min-w-[260px] flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search promo code or description..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary font-600"
          />
        </div>

        {/* Channel Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-800 text-neutral-400 uppercase tracking-wider">Channel:</span>
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-700">
            {[
              { id: "all", label: "All" },
              { id: "online", label: "Online" },
              { id: "pos", label: "POS" },
              { id: "both", label: "Both Only" },
            ].map((ch) => (
              <button
                key={ch.id}
                onClick={() => setChannelFilter(ch.id)}
                className={`px-3 py-1 rounded-lg uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  channelFilter === ch.id
                    ? "bg-neutral-900 text-white shadow-xs font-800"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-800 text-neutral-400 uppercase tracking-wider">Status:</span>
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-700">
            {["all", "active", "inactive"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Data Grid Table ── */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[9.5px]">
              <tr>
                <th className="px-4 py-3">Promo Code</th>
                <th className="px-3.5 py-3">Discount</th>
                <th className="px-3.5 py-3">Channel Scope</th>
                <th className="px-3.5 py-3">Category / Branch Scope</th>
                <th className="px-3.5 py-3">Min Order</th>
                <th className="px-3.5 py-3">Validity Period</th>
                <th className="px-3.5 py-3 text-center whitespace-nowrap">Usage</th>
                <th className="px-3.5 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-600 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 font-700">
                    <RefreshCw size={18} className="animate-spin mx-auto text-brand-primary mb-1.5" />
                    <span>Loading promo codes...</span>
                  </td>
                </tr>
              ) : promos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-neutral-400 font-700">
                    <Tag size={28} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-neutral-800 font-800 text-xs">No Promo Codes Found</p>
                    <p className="text-[10.5px] text-neutral-400 font-500 mt-0.5">Click "Create New Promo" to set up your first coupon code.</p>
                  </td>
                </tr>
              ) : (
                promos.map((promo) => {
                  const isExpired = promo.expiresAt && new Date() > new Date(promo.expiresAt);
                  return (
                    <tr key={promo._id} className="hover:bg-neutral-50/60 transition-colors border-b border-neutral-100">
                      
                      {/* Code */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] font-900 text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 tracking-wider">
                            {promo.code}
                          </span>
                          {promo.description && (
                            <p className="text-[9.5px] text-neutral-400 font-500 truncate max-w-[150px] pt-0.5">
                              {promo.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-900 text-[11px] border border-emerald-200/60 inline-flex items-center">
                            {promo.discountType === "percentage" ? (
                              <span>{promo.discountValue}% OFF</span>
                            ) : (
                              <span>${promo.discountValue.toFixed(2)} OFF</span>
                            )}
                          </span>
                          {promo.maxDiscount && (
                            <span className="text-[9px] text-neutral-400 font-600">
                              (Cap ${promo.maxDiscount})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {promo.applicableChannel === "both" ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-800 tracking-wide border uppercase inline-flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200/80">
                            <Globe size={10} />
                            <span>Both (POS & Web)</span>
                          </span>
                        ) : promo.applicableChannel === "online" ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-800 tracking-wide border uppercase inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200/80">
                            <Globe size={10} />
                            <span>Online Web Only</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-800 tracking-wide border uppercase inline-flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200/80">
                            <Monitor size={10} />
                            <span>POS Terminal Only</span>
                          </span>
                        )}
                      </td>

                      {/* Scope */}
                      <td className="px-3.5 py-3">
                        <div className="space-y-1">
                          {promo.applicableScope === "all_categories" ? (
                            <span className="text-[10px] font-700 text-neutral-600 inline-flex items-center gap-1">
                              <Layers size={11} className="text-neutral-400" />
                              <span>All Menu Items</span>
                            </span>
                          ) : (
                            <div>
                              <span className="text-[9px] font-800 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase inline-block">
                                Specific Categories ({promo.categoryIds?.length || 0})
                              </span>
                              {promo.categoryIds && promo.categoryIds.length > 0 && (
                                <p className="text-[9px] text-neutral-400 truncate max-w-[130px] mt-0.5">
                                  {promo.categoryIds.join(", ")}
                                </p>
                              )}
                            </div>
                          )}

                          {promo.applicableBranchScope === "specific_branches" && (
                            <div>
                              <span className="text-[9px] font-800 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 uppercase inline-block">
                                Branch Restricted ({promo.branchIds?.length || 0})
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Min Purchase */}
                      <td className="px-3.5 py-3 font-mono font-700 text-neutral-800 whitespace-nowrap">
                        {promo.minOrderAmount > 0 ? `$${promo.minOrderAmount.toFixed(2)}` : "No Min"}
                      </td>

                      {/* Validity Period */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className={`text-[10.5px] font-700 flex items-center gap-1 ${isExpired ? "text-red-500" : "text-neutral-700"}`}>
                            <Calendar size={10} />
                            <span>Expires: {formatDate(promo.expiresAt)}</span>
                          </p>
                          {promo.startDate && (
                            <p className="text-[9px] text-neutral-400 pl-3.5">
                              Starts: {formatDate(promo.startDate)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className="font-mono text-[10.5px] font-800 text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                          {promo.usedCount} / {promo.usageLimit !== null ? promo.usageLimit : "∞"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(promo)}
                          className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-800 uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer border ${
                            promo.isActive && !isExpired
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${promo.isActive && !isExpired ? "bg-emerald-500" : "bg-red-500"}`} />
                          <span>{promo.isActive ? (isExpired ? "Expired" : "Active") : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200 transition-all cursor-pointer"
                            title="Edit Promo"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(promo)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer"
                            title="Delete Promo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT PROMO CODE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden my-8 border border-neutral-200 animate-scale-up flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-brand-dark text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-700">
                  <Tag size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-800 uppercase tracking-wider">
                    {editingPromo ? `Edit Promo Code: ${editingPromo.code}` : "Create New Promo Code"}
                  </h2>
                  <p className="text-[10px] text-neutral-400 font-500">Configure discount value, channels, and validity constraints</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1 font-sans">
              
              {/* Code & Discount Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-700 text-neutral-700">Promo Code String *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WELCOME50"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-800 uppercase tracking-wider text-neutral-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-700 text-neutral-700">Discount Type *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: "percentage" })}
                      className={`flex-1 py-2 rounded-xl border text-center font-800 uppercase text-[11px] transition-all cursor-pointer ${
                        formData.discountType === "percentage"
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: "flat" })}
                      className={`flex-1 py-2 rounded-xl border text-center font-800 uppercase text-[11px] transition-all cursor-pointer ${
                        formData.discountType === "flat"
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200"
                      }`}
                    >
                      Flat Dollar ($)
                    </button>
                  </div>
                </div>
              </div>

              {/* Discount Value & Max Discount & Min Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-700 text-neutral-700">
                    Discount Value {formData.discountType === "percentage" ? "(%)" : "($)"} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    placeholder={formData.discountType === "percentage" ? "10" : "5.00"}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {formData.discountType === "percentage" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-700 text-neutral-700">Max Capped ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      placeholder="e.g. 15.00 (Optional)"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-700 text-neutral-700">Min Cart Subtotal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-700 text-neutral-700">Description / Customer Note</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Get 10% off on your first order over $20!"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Channel Scope Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-700 text-neutral-700 block">
                  Applicable Ordering Channel *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "both", label: "Both (POS & Online)", icon: Globe },
                    { id: "online", label: "Online Website Only", icon: Globe },
                    { id: "pos", label: "POS Terminal Only", icon: Monitor },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const selected = formData.applicableChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, applicableChannel: ch.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          selected
                            ? "bg-orange-50/80 border-brand-primary text-brand-primary font-800 shadow-xs"
                            : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                        }`}
                      >
                        <Icon size={14} />
                        <span className="text-[10.5px] mt-1.5 leading-tight">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Scope Selection */}
              <div className="space-y-2 pt-1 border-t border-neutral-100">
                <label className="text-[11px] font-700 text-neutral-700 block">
                  Menu Items Scope *
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-600 text-neutral-800">
                    <input
                      type="radio"
                      name="applicableScope"
                      checked={formData.applicableScope === "all_categories"}
                      onChange={() => setFormData({ ...formData, applicableScope: "all_categories" })}
                      className="accent-brand-primary"
                    />
                    <span>All Menu Categories</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-600 text-neutral-800">
                    <input
                      type="radio"
                      name="applicableScope"
                      checked={formData.applicableScope === "specific_categories"}
                      onChange={() => setFormData({ ...formData, applicableScope: "specific_categories" })}
                      className="accent-brand-primary"
                    />
                    <span>Specific Categories Only</span>
                  </label>
                </div>

                {/* Specific Category Selection List with Scroll */}
                {formData.applicableScope === "specific_categories" && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">
                        Select Target Categories ({formData.categoryIds.length} Selected):
                      </p>
                      {formData.categoryIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, categoryIds: [] })}
                          className="text-[9.5px] font-700 text-red-500 hover:underline cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-neutral-200/80 rounded-xl bg-white shadow-inner">
                      {categoriesList.length > 0 ? (
                        categoriesList.map((cat: any) => {
                          const catName = cat.name || cat.categoryName || cat;
                          const isSelected = formData.categoryIds.includes(catName);
                          return (
                            <button
                              key={cat._id || catName}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormData({
                                    ...formData,
                                    categoryIds: formData.categoryIds.filter((c) => c !== catName),
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    categoryIds: [...formData.categoryIds, catName],
                                  });
                                }
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-700 border transition-all cursor-pointer select-none ${
                                isSelected
                                  ? "bg-brand-primary text-white border-brand-primary shadow-xs active:scale-95"
                                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-350 hover:bg-neutral-100"
                              }`}
                            >
                              {isSelected ? "✓ " : ""}{catName}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-[10.5px] text-neutral-400 italic p-1">No categories loaded.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Branch Scope Selection */}
              <div className="space-y-2 pt-1 border-t border-neutral-100">
                <label className="text-[11px] font-700 text-neutral-700 block">
                  Branch Scope *
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-600 text-neutral-800">
                    <input
                      type="radio"
                      name="applicableBranchScope"
                      checked={formData.applicableBranchScope === "all_branches"}
                      onChange={() => setFormData({ ...formData, applicableBranchScope: "all_branches" })}
                      className="accent-brand-primary"
                    />
                    <span>All Branch Locations</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-600 text-neutral-800">
                    <input
                      type="radio"
                      name="applicableBranchScope"
                      checked={formData.applicableBranchScope === "specific_branches"}
                      onChange={() => setFormData({ ...formData, applicableBranchScope: "specific_branches" })}
                      className="accent-brand-primary"
                    />
                    <span>Specific Branches Only</span>
                  </label>
                </div>

                {/* Specific Branch Selection List with Scroll */}
                {formData.applicableBranchScope === "specific_branches" && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">
                        Select Target Branches ({formData.branchIds.length} Selected):
                      </p>
                      {formData.branchIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, branchIds: [] })}
                          className="text-[9.5px] font-700 text-red-500 hover:underline cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border border-neutral-200/80 rounded-xl bg-white shadow-inner">
                      {branchesList.length > 0 ? (
                        branchesList.map((branch: any) => {
                          const bId = String(branch._id || branch.code || branch.id);
                          const codeStr = branch.code ? `[${branch.code}] ` : "";
                          const bName = `${codeStr}${branch.name || branch.branchName || "Branch"}`;
                          const isSelected = formData.branchIds.includes(bId);
                          return (
                            <button
                              key={bId}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormData({
                                    ...formData,
                                    branchIds: formData.branchIds.filter((b) => b !== bId),
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    branchIds: [...formData.branchIds, bId],
                                  });
                                }
                              }}
                              className={`px-3 py-1 rounded-lg text-[11px] font-700 border transition-all cursor-pointer select-none ${
                                isSelected
                                  ? "bg-brand-primary text-white border-brand-primary shadow-xs active:scale-95"
                                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-350 hover:bg-neutral-100"
                              }`}
                            >
                              {isSelected ? "✓ " : ""}{bName}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-[10.5px] text-neutral-400 italic p-1">No active branches loaded.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-700 text-neutral-700">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-700 text-neutral-700">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Usage Limit Section Below Dates */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-700 text-neutral-700">Usage Limit & Redemption Constraints *</label>
                  <span className="text-[10px] text-neutral-500 font-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                    Total Redeemed: <b className="text-neutral-900 font-900">{editingPromo ? editingPromo.usedCount : 0}</b> times
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Toggle Selector */}
                  <div className="flex bg-neutral-100 p-1 rounded-xl gap-1 shrink-0 w-full sm:w-56">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, usageType: "unlimited", usageLimit: "" })}
                      className={`flex-1 py-2 rounded-lg text-[10.5px] font-800 uppercase tracking-wider transition-all cursor-pointer ${
                        formData.usageType === "unlimited"
                          ? "bg-white text-neutral-900 shadow-xs border border-neutral-200 font-900"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      ∞ Unlimited
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, usageType: "limited" })}
                      className={`flex-1 py-2 rounded-lg text-[10.5px] font-800 uppercase tracking-wider transition-all cursor-pointer ${
                        formData.usageType === "limited"
                          ? "bg-brand-primary text-white shadow-xs font-900"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      Limited Usage
                    </button>
                  </div>

                  {/* Input or Badge */}
                  <div className="flex-1 min-w-0">
                    {formData.usageType === "limited" ? (
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.usageLimit}
                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                        placeholder="Enter max number of uses (e.g. 100)"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-brand-primary"
                      />
                    ) : (
                      <div className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-2 text-[10.5px] text-neutral-500 font-600 select-none flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Unlimited usage</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div>
                  <span className="text-[11px] font-700 text-neutral-800 block">Promo Active Status</span>
                  <span className="text-[10px] text-neutral-400">Toggle whether this code can be redeemed at checkout</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`px-4 py-1.5 rounded-full text-xs font-800 uppercase tracking-wider transition-all cursor-pointer border ${
                    formData.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {formData.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-700 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-800 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-brand-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingPromo ? "Update Promo Code" : "Save Promo Code"}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
