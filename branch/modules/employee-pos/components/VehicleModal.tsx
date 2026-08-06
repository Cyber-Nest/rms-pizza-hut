'use client';

import React, { useState, useEffect } from 'react';
import { X, Car, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePosStore } from '../store/pos.store';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VehicleModal({ isOpen, onClose }: VehicleModalProps) {
  const { selectedVehicle, setVehicle } = usePosStore();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (selectedVehicle) {
      setVehicleNumber(selectedVehicle.vehicleNumber);
      setCustomerName(selectedVehicle.customerName);
      setPhone(selectedVehicle.phone);
    } else {
      setVehicleNumber(''); setCustomerName(''); setPhone('');
    }
  }, [selectedVehicle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim() || !customerName.trim() || !phone.trim()) { 
      toast.error('Please fill in all fields.'); 
      return; 
    }
    setVehicle({ vehicleNumber: vehicleNumber.trim().toUpperCase(), customerName: customerName.trim(), phone: phone.trim() });
    onClose();
  };

  const inp = "w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-[340px] bg-white rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-[13px] font-700 text-neutral-900">Vehicle Information</h3>
            <p className="text-[9.5px] text-neutral-400 font-500 mt-0.5">Required for Drive-Through orders</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all cursor-pointer">
            <X size={13} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Vehicle Number */}
          <div>
            <label className="text-[9.5px] font-600 text-neutral-500 uppercase tracking-wide mb-1 block">Vehicle License / ID *</label>
            <div className="relative">
              <Car size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. ONT-1234" className={`${inp} uppercase`} required />
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-[9.5px] font-600 text-neutral-500 uppercase tracking-wide mb-1 block">Customer Name *</label>
            <div className="relative">
              <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" className={inp} required />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-[9.5px] font-600 text-neutral-500 uppercase tracking-wide mb-1 block">Phone Number *</label>
            <div className="relative">
              <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" className={inp} required />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {selectedVehicle && (
              <button type="button" onClick={() => { setVehicle(null); onClose(); }}
                className="px-3 py-2.5 border border-red-200 rounded-xl text-[10px] font-600 text-red-500 hover:bg-red-50 transition-all cursor-pointer">
                Remove
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-[10px] font-600 text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-700 hover:bg-brand-primary-hover transition-all cursor-pointer shadow-sm shadow-brand-primary/20">
              {selectedVehicle ? 'Save Details' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
