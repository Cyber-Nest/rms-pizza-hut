'use client';

import React, { useState } from 'react';
import { X, Tag, Percent, DollarSign, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { usePosStore } from '../store/pos.store';

interface PromoDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'promo' | 'discount';
type DiscountSubType = 'percentage' | 'flat';

export default function PromoDiscountModal({ isOpen, onClose }: PromoDiscountModalProps) {
  const { cartItems, subtotal, applyPromo, applyManualDiscount, appliedPromo, manualDiscountType, manualDiscountValue, removeDiscount } = usePosStore();

  const [mode, setMode] = useState<Mode>('promo');
  const [promoCode, setPromoCode] = useState('');
  const [discountSubType, setDiscountSubType] = useState<DiscountSubType>('flat');
  const [discountValue, setDiscountValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const hasApplied = !!appliedPromo || !!manualDiscountType;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setError('Please enter a promo code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const rawBranch = localStorage.getItem('rms_branch');
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id || b.id || b.branchId;
          } catch (e) {}
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${apiUrl}/promos/validate`, {
        code: promoCode.trim(),
        channel: 'pos',
        branchId,
        subtotal,
        items: cartItems,
      });
      if (res.data.success) {
        applyPromo(res.data.data);
        onClose();
      } else {
        setError(res.data.message || 'Invalid promo code.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to validate promo code.';
      // Try to get axios response error
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid discount value.');
      return;
    }
    if (discountSubType === 'percentage' && val > 100) {
      setError('Percentage cannot exceed 100%.');
      return;
    }
    if (discountSubType === 'flat' && val > subtotal) {
      setError(`Flat discount cannot exceed subtotal ($${subtotal.toFixed(2)}).`);
      return;
    }
    setError('');
    applyManualDiscount(discountSubType, val);
    onClose();
  };

  const handleRemove = () => {
    removeDiscount();
    setPromoCode('');
    setDiscountValue('');
    setError('');
    onClose();
  };

  const previewDiscount = () => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return null;
    if (discountSubType === 'percentage') {
      return Math.min((subtotal * val) / 100, subtotal).toFixed(2);
    }
    return Math.min(val, subtotal).toFixed(2);
  };

  const discountPreview = mode === 'discount' ? previewDiscount() : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-brand-primary" />
            <h3 className="text-[13px] font-700 text-white uppercase tracking-wide">Promo Code / Discount</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Applied state */}
          {hasApplied && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-700 text-green-800">
                    {appliedPromo ? `Promo "${appliedPromo.code}" applied` : 'Manual discount applied'}
                  </p>
                  <p className="text-[10px] text-green-600">
                    {appliedPromo
                      ? `-$${appliedPromo.discountAmount.toFixed(2)} off`
                      : manualDiscountType === 'percentage'
                      ? `-${manualDiscountValue}% off`
                      : `-$${manualDiscountValue.toFixed(2)} off`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="text-[10px] font-600 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          {/* Mode Toggle */}
          <div>
            <p className="text-[11px] font-600 text-neutral-600 mb-2.5">Do you want to apply promo code or discount?</p>
            <div className="flex items-center gap-5">
              {(['promo', 'discount'] as Mode[]).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => { setMode(m); setError(''); }}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      mode === m ? 'border-brand-primary bg-brand-primary' : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {mode === m && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[11px] font-500 text-neutral-700 capitalize">{m === 'promo' ? 'Promo Code' : 'Discount'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Promo Code Input */}
          {mode === 'promo' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-600 text-neutral-600 uppercase tracking-wide">Promo Code</label>
              <input
                type="text"
                placeholder="Enter Promo Code"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-[12px] font-600 text-neutral-800 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 tracking-widest placeholder:tracking-normal placeholder:font-400 placeholder:text-neutral-400 transition-all"
              />
            </div>
          )}

          {/* Discount Input */}
          {mode === 'discount' && (
            <div className="space-y-3">
              {/* Discount sub-type toggle */}
              <div className="flex items-center gap-5">
                {(['percentage', 'flat'] as DiscountSubType[]).map((st) => (
                  <label key={st} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => { setDiscountSubType(st); setDiscountValue(''); setError(''); }}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                        discountSubType === st ? 'border-brand-primary bg-brand-primary' : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {discountSubType === st && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-[11px] font-500 text-neutral-700 flex items-center gap-1">
                      {st === 'percentage' ? <><Percent size={10} />Percentage (%)</> : <><DollarSign size={10} />Flat Rate ($)</>}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-600 text-neutral-600 mb-1.5 uppercase tracking-wide">Discount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-500 text-neutral-400">
                    {discountSubType === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    placeholder={discountSubType === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
                    min="0"
                    max={discountSubType === 'percentage' ? '100' : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => { setDiscountValue(e.target.value); setError(''); }}
                    className="w-full border border-neutral-200 rounded-xl pl-8 pr-4 py-2.5 text-[12px] font-600 text-neutral-800 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/10 transition-all"
                  />
                </div>
                {discountPreview && (
                  <p className="text-[10px] text-green-600 font-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle size={10} />
                    Discount: -${discountPreview} off your order
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-[10px] font-500 text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          )}

          {/* Apply Button */}
          <button
            onClick={mode === 'promo' ? handleApplyPromo : handleApplyDiscount}
            disabled={loading}
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[12px] font-700 transition-all active:scale-[0.99] cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
