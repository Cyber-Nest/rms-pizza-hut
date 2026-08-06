'use client';

import React from 'react';
import { TaxFeesSettings } from './settingsTypes';
import { Percent, DollarSign, Receipt, Truck } from 'lucide-react';

interface TaxFeesTabProps {
  taxFeesSettings: TaxFeesSettings;
  setTaxFeesSettings: React.Dispatch<React.SetStateAction<TaxFeesSettings>>;
  onSubmit: (e: React.FormEvent) => void;
  saving?: boolean;
}

export default function TaxFeesTab({
  taxFeesSettings,
  setTaxFeesSettings,
  onSubmit,
  saving = false,
}: TaxFeesTabProps) {
  const [isEditing, setIsEditing] = React.useState(false);

  const handleChange = (field: keyof TaxFeesSettings, value: string) => {
    setTaxFeesSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-neutral-200/90 shadow-xs max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 className="text-base font-900 text-neutral-900 uppercase tracking-wide flex items-center gap-2">
            <Receipt className="text-brand-primary" size={20} />
            <span>Tax & Delivery Charges Settings</span>
          </h2>
          <p className="text-xs text-neutral-500 font-500 mt-1">
            Configure active tax rates (% GST, PST, HST) and default delivery charges applied to branch checkout & receipts.
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Grid Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Delivery Fee ($) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Truck size={14} className="text-brand-primary" />
              <span>Delivery Fee ($) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-700 text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={!isEditing}
                value={taxFeesSettings.deliveryFee}
                onChange={(e) => handleChange('deliveryFee', e.target.value)}
                placeholder="4.99"
                className={`w-full pl-8 pr-4 py-2.5 rounded-xl border text-xs font-700 transition-all ${
                  isEditing
                    ? 'bg-white border-brand-primary/40 text-neutral-900 focus:outline-none focus:border-brand-primary'
                    : 'bg-neutral-100/70 border-neutral-200 text-neutral-600 cursor-not-allowed'
                }`}
                required
              />
            </div>
            <p className="text-[10px] text-neutral-400 font-500">
              Fee added when order type is set to Delivery.
            </p>
          </div>

          {/* GST Tax Rate (%) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Percent size={14} className="text-brand-primary" />
              <span>GST Tax Rate (%) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={!isEditing}
                value={taxFeesSettings.gstTaxRate}
                onChange={(e) => handleChange('gstTaxRate', e.target.value)}
                placeholder="5.00"
                className={`w-full pl-4 pr-8 py-2.5 rounded-xl border text-xs font-700 transition-all ${
                  isEditing
                    ? 'bg-white border-brand-primary/40 text-neutral-900 focus:outline-none focus:border-brand-primary'
                    : 'bg-neutral-100/70 border-neutral-200 text-neutral-600 cursor-not-allowed'
                }`}
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-700 text-xs">%</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-500">
              Goods & Services Tax percentage.
            </p>
          </div>

          {/* PST Tax Rate (%) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Percent size={14} className="text-neutral-400" />
              <span>PST Tax Rate (%)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={!isEditing}
                value={taxFeesSettings.pstTaxRate}
                onChange={(e) => handleChange('pstTaxRate', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-4 pr-8 py-2.5 rounded-xl border text-xs font-700 transition-all ${
                  isEditing
                    ? 'bg-white border-brand-primary/40 text-neutral-900 focus:outline-none focus:border-brand-primary'
                    : 'bg-neutral-100/70 border-neutral-200 text-neutral-600 cursor-not-allowed'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-700 text-xs">%</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-500">
              Provincial Sales Tax percentage (if applicable).
            </p>
          </div>

          {/* HST Tax Rate (%) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Percent size={14} className="text-neutral-400" />
              <span>HST Tax Rate (%)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={!isEditing}
                value={taxFeesSettings.hstTaxRate}
                onChange={(e) => handleChange('hstTaxRate', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-4 pr-8 py-2.5 rounded-xl border text-xs font-700 transition-all ${
                  isEditing
                    ? 'bg-white border-brand-primary/40 text-neutral-900 focus:outline-none focus:border-brand-primary'
                    : 'bg-neutral-100/70 border-neutral-200 text-neutral-600 cursor-not-allowed'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-700 text-xs">%</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-500">
              Harmonized Sales Tax percentage (if applicable).
            </p>
          </div>

        </div>

        {/* Action Buttons Bar */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-neutral-100">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-8 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              Edit Settings
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[12px] font-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-2.5 rounded-full bg-brand-primary hover:bg-orange-600 text-white font-900 text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </>
          )}
        </div>

      </form>
    </div>
  );
}
