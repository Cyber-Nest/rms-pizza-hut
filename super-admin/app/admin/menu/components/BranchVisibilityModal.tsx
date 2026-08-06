"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Store, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { API_URL, getAuthConfig } from "../utils";

interface Branch {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface BranchVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "category" | "product";
  targetId: string;
  targetName: string;
  disabledBranches: string[];
  onUpdated: () => void;
}

export default function BranchVisibilityModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  disabledBranches: initialDisabled,
  onUpdated,
}: BranchVisibilityModalProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabledList, setDisabledList] = useState<string[]>(initialDisabled || []);
  const [updatingBranchId, setUpdatingBranchId] = useState<string | null>(null);

  useEffect(() => {
    setDisabledList(initialDisabled || []);
  }, [initialDisabled]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/branches?isActive=true&minimal=true`, getAuthConfig());
        if (res.data.success) {
          setBranches(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load branches:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBranch = async (branchId: string) => {
    const isCurrentlyHidden = disabledList.includes(branchId);
    const newHiddenState = !isCurrentlyHidden;

    setUpdatingBranchId(branchId);
    try {
      const endpoint =
        targetType === "category"
          ? `${API_URL}/categories/${targetId}/toggle-branch`
          : `${API_URL}/products/${targetId}/toggle-branch`;

      const res = await axios.patch(endpoint, {
        branchId,
        isHidden: newHiddenState,
      }, getAuthConfig());

      if (res.data.success) {
        if (newHiddenState) {
          setDisabledList([...disabledList, branchId]);
        } else {
          setDisabledList(disabledList.filter((id) => id !== branchId));
        }
        onUpdated();
      }
    } catch (err: any) {
      toast.error("Failed to update branch visibility: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingBranchId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div>
            <div className="flex items-center gap-2 text-brand-primary font-800 text-[10px] uppercase tracking-wider">
              <Store size={14} /> Branch Visibility Control
            </div>
            <h2 className="text-sm font-800 text-neutral-900 mt-0.5 truncate">
              {targetName} ({targetType})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Toggle visibility for each branch below. Turning a branch <span className="font-700 text-red-600">OFF</span> will hide this {targetType} from that branch&apos;s POS and menu feed.
          </p>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-3 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
              <span className="text-xs text-neutral-400 font-500">Loading branches...</span>
            </div>
          ) : branches.length === 0 ? (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center text-xs text-neutral-600">
              <AlertCircle size={20} className="mx-auto text-brand-primary mb-1" />
              No branches found. Please create branches first in Branch Management.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {branches.map((branch) => {
                const isHidden = disabledList.includes(branch._id);
                const isUpdating = updatingBranchId === branch._id;

                return (
                  <div
                    key={branch._id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isHidden
                        ? "bg-red-50/50 border-red-200"
                        : "bg-emerald-50/50 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-neutral-200 text-neutral-800 text-[10px] font-800 rounded font-mono">
                        {branch.code}
                      </span>
                      <div>
                        <span className="block text-xs font-700 text-neutral-900">{branch.name}</span>
                        <span className="block text-[10px] font-600 text-neutral-500">
                          Status: {isHidden ? "Hidden in POS" : "Visible in POS"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleBranch(branch._id)}
                      disabled={isUpdating}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-700 transition-all cursor-pointer ${
                        isHidden
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                      }`}
                    >
                      {isUpdating ? (
                        "Saving..."
                      ) : isHidden ? (
                        <>
                          <EyeOff size={13} /> Hidden
                        </>
                      ) : (
                        <>
                          <Eye size={13} /> Visible
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-brand-primary text-white text-xs font-700 rounded-xl hover:bg-brand-primary/90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
