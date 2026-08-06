'use client';

import React, { useState } from 'react';
import { X, Phone, Mail, User, Search, CheckCircle } from 'lucide-react';
import { usePosStore } from '../store/pos.store';
import { CustomerInfo } from '../types';

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerSearchModal({ isOpen, onClose }: CustomerSearchModalProps) {
  const { selectedCustomer, setCustomer } = usePosStore();

  const [searchPhone, setSearchPhone] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [form, setForm] = useState<CustomerInfo>({
    name: selectedCustomer?.name || '',
    phone: selectedCustomer?.phone || '',
    email: selectedCustomer?.email || '',
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setCustomer({
      name: form.name.trim() || 'No Name',
      phone: form.phone.trim(),
      email: form.email?.trim() || '',
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 800);
  };

  const handleRemove = () => {
    setCustomer(null);
    setForm({ name: '', phone: '', email: '' });
    setSearchPhone('');
    setSearchEmail('');
    onClose();
  };

  const handleSearch = () => {
    // Pre-fill form with search values
    if (searchPhone) setForm((f) => ({ ...f, phone: searchPhone }));
    if (searchEmail) setForm((f) => ({ ...f, email: searchEmail }));
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="bg-brand-primary px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={15} className="text-white" />
            <h3 className="text-[13px] font-700 text-white uppercase tracking-wide">
              Add New Customer & Address
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-700 px-3 py-1.5 rounded-full transition-all cursor-pointer uppercase"
          >
            <X size={11} /> Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search section */}
          <div>
            <p className="text-[11px] text-neutral-500 font-500 text-center mb-3">
              Search by phone number or email address
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Phone size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  placeholder="Search by phone #"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder:text-neutral-400"
                />
              </div>
              <div className="relative">
                <Mail size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  placeholder="Search by email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>
            {(searchPhone || searchEmail) && (
              <button
                onClick={handleSearch}
                className="mt-2 w-full py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Search size={10} /> Fill form from search
              </button>
            )}
          </div>

          <hr className="border-neutral-100" />

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Phone size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                placeholder="Enter Phone #"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder:text-neutral-400"
              />
            </div>
            <div className="relative">
              <Mail size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                placeholder="Enter Email Address"
                value={form.email || ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder:text-neutral-400"
              />
            </div>
            <div className="relative">
              <User size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Enter First Name"
                value={form.name.split(' ')[0] || ''}
                onChange={(e) => {
                  const last = form.name.split(' ').slice(1).join(' ');
                  setForm((f) => ({ ...f, name: `${e.target.value}${last ? ' ' + last : ''}` }));
                }}
                className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder:text-neutral-400"
              />
            </div>
            <div className="relative">
              <User size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Enter Last Name"
                value={form.name.split(' ').slice(1).join(' ') || ''}
                onChange={(e) => {
                  const first = form.name.split(' ')[0] || '';
                  setForm((f) => ({ ...f, name: `${first}${e.target.value ? ' ' + e.target.value : ''}` }));
                }}
                className="w-full border border-neutral-200 rounded-xl pl-8 pr-3 py-2.5 text-[11px] font-500 text-neutral-700 bg-neutral-50 focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {selectedCustomer && (
              <button
                onClick={handleRemove}
                className="flex-1 py-2.5 border border-red-200 text-red-500 rounded-xl text-[11px] font-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                Remove Customer
              </button>
            )}
            <button
              onClick={handleSubmit}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-700 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                submitted
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm active:scale-[0.99]'
              }`}
            >
              {submitted ? <><CheckCircle size={13} /> Saved!</> : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
