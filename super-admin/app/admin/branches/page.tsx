"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Radio,
  AlertCircle,
  Power,
} from "lucide-react";

interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  password?: string;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  isLive: boolean;
  isLocationConfigured?: boolean;
  createdAt: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Note: Lat and Lng inputs removed from Super Admin form.
  // Coordinates are set by the restaurant manager in POS Settings.
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    password: "",
    isActive: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const getAuthConfig = () => {
    if (typeof window === "undefined") return { withCredentials: true };
    const token = localStorage.getItem("rms_superadmin_token");
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    };
  };

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/branches`, getAuthConfig());
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleOpenModal = (branch?: Branch) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address || "",
        city: branch.city || "",
        phone: branch.phone || "",
        email: branch.email,
        password: branch.password || "",
        isActive: branch.isActive,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        password: "",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (editingBranch) {
        const res = await axios.patch(
          `${API_URL}/branches/${editingBranch._id}`,
          formData,
          getAuthConfig()
        );
        if (res.data.success) {
          setSuccessMsg("Branch updated successfully!");
          fetchBranches();
          setTimeout(() => setIsModalOpen(false), 1000);
        }
      } else {
        const res = await axios.post(`${API_URL}/branches`, formData, getAuthConfig());
        if (res.data.success) {
          setSuccessMsg("New branch created successfully!");
          fetchBranches();
          setTimeout(() => setIsModalOpen(false), 1000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save branch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    try {
      const newActiveState = !branch.isActive;
      const payload: { isActive: boolean; isLive?: boolean } = {
        isActive: newActiveState,
      };
      if (!newActiveState) {
        payload.isLive = false;
      }
      const res = await axios.patch(
        `${API_URL}/branches/${branch._id}`,
        payload,
        getAuthConfig()
      );
      if (res.data.success) {
        fetchBranches();
        toast.success("Branch status updated");
      }
    } catch (err: any) {
      toast.error("Failed to update branch active status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleLive = async (branch: Branch) => {
    if (!branch.isActive) {
      toast.error("Cannot Go Live! This branch is currently Inactive. Please activate the branch first.");
      return;
    }

    const isLocationSet =
      branch.isLocationConfigured ||
      (branch.lat !== null &&
        branch.lng !== null &&
        branch.lat !== undefined &&
        branch.lng !== undefined &&
        !(branch.lat === 0 && branch.lng === 0));

    if (!branch.isLive && !isLocationSet) {
      toast.error(
        "Cannot Go Live! The restaurant's exact GPS location coordinates (Latitude & Longitude) must be set in POS Settings first."
      );
      return;
    }

    try {
      const newLiveState = !branch.isLive;
      const res = await axios.patch(
        `${API_URL}/branches/${branch._id}`,
        { isLive: newLiveState },
        getAuthConfig()
      );
      if (res.data.success) {
        fetchBranches();
        toast.success(`Branch is now ${newLiveState ? "LIVE" : "OFFLINE"}`);
      }
    } catch (err: any) {
      toast.error("Failed to change live status: " + (err.response?.data?.message || err.message));
    }
  };

  const executeDeleteBranch = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/branches/${id}`, getAuthConfig());
      toast.success("Branch deleted successfully");
      fetchBranches();
    } catch (err: any) {
      toast.error("Failed to delete branch: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this branch?</p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await executeDeleteBranch(id);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000, position: "top-center" });
  };

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-primary">
              <Store size={20} />
            </div>
            <div>
              <h1 className="text-lg font-800 text-neutral-900">Branch Management</h1>
              <p className="text-xs text-neutral-500 font-500">
                Create & manage multi-unit restaurant locations, operational status, and public Go-Live controls
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 rounded-xl transition-all shadow-md shadow-brand-primary/20 cursor-pointer"
        >
          <Plus size={16} />
          Create New Branch
        </button>
      </div>

      {/* Search & Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search branches by name, code, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-700 text-neutral-600 bg-white px-4 py-2 rounded-xl border border-neutral-200">
          <div>Total: <span className="text-neutral-900 font-800">{branches.length}</span></div>
          <span className="w-px h-4 bg-neutral-200" />
          <div>Live: <span className="text-emerald-600 font-800">{branches.filter((b) => b.isLive).length}</span></div>
          <span className="w-px h-4 bg-neutral-200" />
          <div>Active: <span className="text-blue-600 font-800">{branches.filter((b) => b.isActive).length}</span></div>
        </div>
      </div>

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
          <span className="text-xs font-700 text-neutral-500">Loading branches...</span>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
          <Building2 size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="text-sm font-800 text-neutral-800">No Branches Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? "No branches matching your search filter."
              : "You haven't created any restaurant branches yet. Click 'Create New Branch' to add your first branch."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => {
            const isLocationSet =
              branch.isLocationConfigured ||
              (branch.lat !== null &&
                branch.lng !== null &&
                branch.lat !== undefined &&
                branch.lng !== undefined &&
                !(branch.lat === 0 && branch.lng === 0));

            return (
              <div
                key={branch._id}
                className={`bg-white rounded-2xl border ${
                  branch.isLive
                    ? "border-emerald-300 shadow-emerald-500/5"
                    : branch.isActive
                    ? "border-neutral-200 shadow-sm"
                    : "border-red-200 bg-red-50/20"
                } p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden`}
              >
                <div>
                  {/* Top Status Badges */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-orange-100 text-brand-primary font-800 text-[10px] rounded-md tracking-wider">
                          {branch.code}
                        </span>

                        {/* Active Toggle Button */}
                        <button
                          onClick={() => handleToggleActive(branch)}
                          className={`inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                            branch.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          }`}
                          title="Click to toggle Active/Inactive"
                        >
                          <Power size={9} />
                          {branch.isActive ? "Active" : "Inactive"}
                        </button>

                        {/* Live Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-800 px-2 py-0.5 rounded-full ${
                            branch.isActive && branch.isLive
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                          }`}
                        >
                          <Radio size={9} className={branch.isActive && branch.isLive ? "animate-pulse" : ""} />
                          {branch.isActive && branch.isLive ? "LIVE" : "Offline"}
                        </span>
                      </div>
                      <h2 className="text-base font-800 text-neutral-900 mt-2">{branch.name}</h2>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(branch)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-brand-primary hover:bg-orange-50 transition-all"
                        title="Edit Branch"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(branch._id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete Branch"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Branch Details */}
                  <div className="py-4 space-y-2.5 text-xs text-neutral-600">
                    <div className="flex items-center gap-2.5">
                      <Mail size={14} className="text-neutral-400 flex-shrink-0" />
                      <span className="font-600 text-neutral-800 truncate">{branch.email}</span>
                    </div>

                    {branch.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone size={14} className="text-neutral-400 flex-shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}

                    {branch.address && (
                      <div className="flex items-start gap-2.5">
                        <MapPin size={14} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                        <span>
                          {branch.address}
                          {branch.city ? `, ${branch.city}` : ""}
                        </span>
                      </div>
                    )}

                    {/* Location Status Indicator */}
                    <div className="pt-1">
                      {isLocationSet ? (
                        <div className="flex items-center gap-2 text-[11px] font-700 text-emerald-700 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                          <span>Location Added ({branch.lat?.toFixed(4)}, {branch.lng?.toFixed(4)})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] font-700 text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                          <span>Location Pending (Setup in POS)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls / Go Live Button */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-400 font-500">
                    {new Date(branch.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => handleToggleLive(branch)}
                    disabled={!branch.isActive || (!branch.isLive && !isLocationSet)}
                    title={
                      !branch.isActive
                        ? "Activate branch first to Go Live"
                        : !isLocationSet
                        ? "Restaurant GPS coordinates must be configured in POS settings first"
                        : ""
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-800 transition-all flex items-center gap-1.5 shadow-xs ${
                      !branch.isActive
                        ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed opacity-60"
                        : branch.isLive
                        ? "bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer"
                        : isLocationSet
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer"
                        : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <Radio size={12} />
                    {!branch.isActive
                      ? "Offline (Branch Inactive)"
                      : branch.isLive
                      ? "Take Offline"
                      : "Go Live"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal (Without Lat/Lng Inputs) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h2 className="text-sm font-800 text-neutral-900 flex items-center gap-2">
                <Store size={18} className="text-brand-primary" />
                {editingBranch ? "Edit Branch Details" : "Create New Restaurant Branch"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-600 rounded-xl">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-600 rounded-xl">
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-700 text-neutral-700 mb-1">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chicken Delight Downtown"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-700 text-neutral-700 mb-1">
                    Branch Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DT-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-3">
                <span className="text-[11px] font-800 uppercase tracking-wider text-brand-primary block">
                  Branch Login Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-700 text-neutral-700 mb-1">
                      Login Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="downtown@chickendelight.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-700 text-neutral-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!editingBranch}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-3 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-700 text-neutral-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 555-0192"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-700 text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Toronto"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-700 text-neutral-700 mb-1">Full Street Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, Suite 100"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Location Setup Note */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 font-500">
                ℹ️ <strong>Location Note:</strong> Restaurant GPS coordinates will be captured directly by the branch manager in the POS Settings tab before Super Admin can take this branch <strong>Live</strong>.
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs font-700 text-neutral-800 cursor-pointer">
                  Branch Operational (Active)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-700 rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-700 rounded-xl transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : editingBranch ? "Update Branch" : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
