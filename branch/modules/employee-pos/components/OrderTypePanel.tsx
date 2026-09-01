/* 
======================================================================
ORIGINAL CODE (COMMENTED OUT)
======================================================================
'use client';

import React, { useState } from 'react';
import { UserPlus, Gift, Compass, UserCheck, Car, TableProperties, Radio } from 'lucide-react';
import { usePosStore } from '../store/pos.store';
import CustomerModal from './CustomerModal';

const ORDER_TYPES = [
  { id: 'takeout',      label: 'Takeout'       },
  { id: 'delivery',     label: 'Delivery'      },
  // { id: 'drive-through',label: 'Drive Thru'    },
  { id: 'dine-in',      label: 'Dine In'       },
] as const;

type OT = typeof ORDER_TYPES[number]['id'];

export default function OrderTypePanel() {
  const { orderType, setOrderType, selectedCustomer, cartItems } = usePosStore();
  const [showCustomer, setShowCustomer] = useState(false);

  const handleTypeChange = (t: OT) => {
    setOrderType(t);
    if (t === 'delivery')      setShowCustomer(true);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-3.5 flex flex-col h-full gap-3 select-none">

      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100 flex-shrink-0">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="65" r="28" fill="#F5F0EB" />
            <circle cx="50" cy="65" r="24" fill="#FAF7F4" />
            <path d="M26 65H74" stroke="#E7E5E4" strokeWidth="2" strokeLinecap="round" />
            <path d="M26 63C26 40.5 40.5 30 50 30C59.5 30 74 40.5 74 63H26Z" fill="#e31837" opacity="0.85" />
            <circle cx="50" cy="26" r="5" fill="#f7cbd4" />
            <path d="M48 30C48 28.5 49 26 50 26C51 26 52 28.5 52 30" stroke="#f7cbd4" strokeWidth="2" />
            <path d="M32 58C32 48 39 42 45 40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
            <path d="M40 18C40 16 42 14 42 12" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
            <path d="M50 16C50 14 52 12 52 10" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
            <path d="M60 18C60 16 62 14 62 12" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[12.5px] lg:text-[14.5px] font-900 text-black text-center leading-tight">Choose order type</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {ORDER_TYPES.map(({ id, label }) => {
          const active = orderType === id;
          return (
            <button
              key={id}
              onClick={() => handleTypeChange(id)}
              className={`py-2.5 px-1 rounded-lg border text-[12px] lg:text-[14px] font-800 text-center tracking-wide transition-all relative ${
                active
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm cursor-pointer active:scale-95'
                  : 'bg-white border-neutral-200 text-black hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer active:scale-95'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <hr className="border-neutral-100" />

      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto no-scrollbar gap-2">

        <div className="rounded-lg border border-dashed border-neutral-200 p-2.5 bg-neutral-50/50">
          {cartItems.length === 0 ? (
            <div className="text-center space-y-0.5">
              <p className="text-[12px] lg:text-[14px] font-800 text-black">No order in process</p>
              <p className="text-[10px] lg:text-[12px] text-neutral-500 font-600">Select items from the menu.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-green-600">
                <Radio size={12} className="animate-pulse" />
                <span className="text-[10px] lg:text-[11px] font-800 uppercase tracking-wide">Order Active</span>
              </div>
              <p className="text-[11px] lg:text-[13px] text-black font-800">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in {orderType} cart
              </p>
            </div>
          )}

          {orderType === 'delivery' && selectedCustomer && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1 text-brand-primary">
                <UserCheck size={12} />
                <span className="text-[10px] font-700 uppercase">Customer Attached</span>
              </div>
              <p className="text-[11px] lg:text-[12px] text-black font-800">{selectedCustomer.name}</p>
              <p className="text-[10px] text-neutral-600 font-700">{selectedCustomer.phone}</p>
              {selectedCustomer.address && (
                <p className="text-[9.5px] text-neutral-600 font-600 leading-tight truncate">{selectedCustomer.address}</p>
              )}
            </div>
          )}

          {orderType !== 'delivery' && selectedCustomer && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1 text-brand-primary">
                <UserCheck size={12} />
                <span className="text-[10px] font-700 uppercase">Customer Attached</span>
              </div>
              <p className="text-[11px] lg:text-[12px] text-black font-800">{selectedCustomer.name}</p>
              <p className="text-[10px] text-neutral-600 font-700">{selectedCustomer.phone}</p>
              {selectedCustomer.address && (
                <p className="text-[9.5px] text-neutral-600 font-600 leading-tight truncate">{selectedCustomer.address}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          {orderType !== 'delivery' && (
            <button
              onClick={() => setShowCustomer(true)}
              className={`w-full py-2 px-2.5 rounded-lg border text-[12px] lg:text-[13px] font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                selectedCustomer
                  ? 'bg-orange-50 border-brand-primary text-brand-primary hover:bg-orange-100'
                  : 'bg-white border-neutral-200 text-black hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <UserPlus size={14} />
              {selectedCustomer ? 'Edit Customer' : 'Add Customer Info'}
            </button>
          )}

          {[
            { icon: <Compass size={12} />, label: 'Open Items' },
            { icon: <Gift size={12} />,    label: 'Add Gift Card' },
            { icon: null,                  label: 'Send Tracker'  },
          ].map(({ icon, label }) => (
            <button key={label} disabled
              className="w-full py-1.5 px-2.5 rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-300 text-[10px] font-500 flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      <CustomerModal isOpen={showCustomer} onClose={() => setShowCustomer(false)} />
    </div>
  );
}
======================================================================
ACTIVE DUPLICATED CODE
======================================================================
*/

'use client';

import React, { useState } from 'react';
import { UserPlus, Gift, Compass, UserCheck, Car, TableProperties, Radio } from 'lucide-react';
import { usePosStore } from '../store/pos.store';
import CustomerModal from './CustomerModal';

const ORDER_TYPES = [
  { id: 'takeout',      label: 'Takeout'       },
  { id: 'delivery',     label: 'Delivery'      },
  // { id: 'drive-through',label: 'Drive Thru'    },
  { id: 'dine-in',      label: 'Dine In'       },
] as const;

type OT = typeof ORDER_TYPES[number]['id'];

export default function OrderTypePanel() {
  const { orderType, setOrderType, selectedCustomer, cartItems } = usePosStore();
  const [showCustomer, setShowCustomer] = useState(false);

  const handleTypeChange = (t: OT) => {
    setOrderType(t);
    if (t === 'delivery')      setShowCustomer(true);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-3.5 flex flex-col h-full gap-3 select-none">

      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100 flex-shrink-0">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="65" r="28" fill="#F5F0EB" />
            <circle cx="50" cy="65" r="24" fill="#FAF7F4" />
            <path d="M26 65H74" stroke="#E7E5E4" strokeWidth="2" strokeLinecap="round" />
            <path d="M26 63C26 40.5 40.5 30 50 30C59.5 30 74 40.5 74 63H26Z" fill="#e31837" opacity="0.85" />
            <circle cx="50" cy="26" r="5" fill="#f7cbd4" />
            <path d="M48 30C48 28.5 49 26 50 26C51 26 52 28.5 52 30" stroke="#f7cbd4" strokeWidth="2" />
            <path d="M32 58C32 48 39 42 45 40" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
            <path d="M40 18C40 16 42 14 42 12" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
            <path d="M50 16C50 14 52 12 52 10" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
            <path d="M60 18C60 16 62 14 62 12" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[12.5px] lg:text-[14.5px] font-900 text-black text-center leading-tight">Choose order type</p>
      </div>

      {/* ── Order Type Grid ── */}
      <div className="grid grid-cols-3 gap-1.5">
        {ORDER_TYPES.map(({ id, label }) => {
          const active = orderType === id;
          return (
            <button
              key={id}
              onClick={() => handleTypeChange(id)}
              className={`py-2.5 px-1 rounded-lg border text-[12px] lg:text-[14px] font-800 text-center tracking-wide transition-all relative ${
                active
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-sm cursor-pointer active:scale-95'
                  : 'bg-white border-neutral-200 text-black hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer active:scale-95'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <hr className="border-neutral-100" />

      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto no-scrollbar gap-2">

        {/* Status card */}
        <div className="rounded-lg border border-dashed border-neutral-200 p-2.5 bg-neutral-50/50">
          {cartItems.length === 0 ? (
            <div className="text-center space-y-0.5">
              <p className="text-[12px] lg:text-[14px] font-800 text-black">No order in process</p>
              <p className="text-[10px] lg:text-[12px] text-neutral-500 font-600">Select items from the menu.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-green-600">
                <Radio size={12} className="animate-pulse" />
                <span className="text-[10px] lg:text-[11px] font-800 uppercase tracking-wide">Order Active</span>
              </div>
              <p className="text-[11px] lg:text-[13px] text-black font-800">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in {orderType} cart
              </p>
            </div>
          )}

          {/* Delivery customer preview */}
          {orderType === 'delivery' && selectedCustomer && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1 text-brand-primary">
                <UserCheck size={12} />
                <span className="text-[10px] font-700 uppercase">Customer Attached</span>
              </div>
              <p className="text-[11px] lg:text-[12px] text-black font-800">{selectedCustomer.name}</p>
              <p className="text-[10px] text-neutral-600 font-700">{selectedCustomer.phone}</p>
              {selectedCustomer.address && (
                <p className="text-[9.5px] text-neutral-600 font-600 leading-tight truncate">{selectedCustomer.address}</p>
              )}
            </div>
          )}

          {/* Customer preview for other order types */}
          {orderType !== 'delivery' && selectedCustomer && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-lg space-y-0.5">
              <div className="flex items-center gap-1 text-brand-primary">
                <UserCheck size={12} />
                <span className="text-[10px] font-700 uppercase">Customer Attached</span>
              </div>
              <p className="text-[11px] lg:text-[12px] text-black font-800">{selectedCustomer.name}</p>
              <p className="text-[10px] text-neutral-600 font-700">{selectedCustomer.phone}</p>
              {selectedCustomer.address && (
                <p className="text-[9.5px] text-neutral-600 font-600 leading-tight truncate">{selectedCustomer.address}</p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-1.5">
          {/* Customer booking modal for Takeout, Dine-in, and Drive-through */}
          {orderType !== 'delivery' && (
            <button
              onClick={() => setShowCustomer(true)}
              className={`w-full py-2 px-2.5 rounded-lg border text-[12px] lg:text-[13px] font-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                selectedCustomer
                  ? 'bg-orange-50 border-brand-primary text-brand-primary hover:bg-orange-100'
                  : 'bg-white border-neutral-200 text-black hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <UserPlus size={14} />
              {selectedCustomer ? 'Edit Customer' : 'Add Customer Info'}
            </button>
          )}

          {/* Disabled buttons */}
          {[
            { icon: <Compass size={12} />, label: 'Open Items' },
            { icon: <Gift size={12} />,    label: 'Add Gift Card' },
            { icon: null,                  label: 'Send Tracker'  },
          ].map(({ icon, label }) => (
            <button key={label} disabled
              className="w-full py-1.5 px-2.5 rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-300 text-[10px] font-500 flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CustomerModal isOpen={showCustomer} onClose={() => setShowCustomer(false)} />
    </div>
  );
}
