'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Store, Phone, MapPin, Building, Mail, Shield, Save, Loader2 } from 'lucide-react';

export default function BranchProfileTab() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      let token = '';

      const raw = typeof window !== 'undefined' ? localStorage.getItem('rms_branch') : null;
      if (raw) {
        try {
          const b = JSON.parse(raw);
          token = b.token || '';
          if (isMounted) {
            setName(b.name || '');
            setCode(b.code || '');
            setEmail(b.email || '');
            setPhone(b.phone || '');
            setAddress(b.address || '');
            setCity(b.city || '');
          }
        } catch (e) {}
      }

      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await axios.get(`${API_URL}/branches/me`, {
          withCredentials: true,
          headers,
        });

        if (res.data.success && res.data.data && isMounted) {
          const b = res.data.data;
          setName(b.name || '');
          setCode(b.code || '');
          setEmail(b.email || '');
          setPhone(b.phone || '');
          setAddress(b.address || '');
          setCity(b.city || '');
          try {
            localStorage.setItem('rms_branch', JSON.stringify({ ...JSON.parse(raw || '{}'), ...b }));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Could not load fresh branch profile from backend');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    setSaving(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const raw = localStorage.getItem('rms_branch');
      const branchData = raw ? JSON.parse(raw) : null;
      const branchId = branchData?._id || branchData?.id;

      const res = await axios.put(`${API_URL}/branches/profile`, {
        branchId,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      });

      if (res.data.success && res.data.data) {
        const updated = res.data.data;
        setName(updated.name);
        setPhone(updated.phone || '');
        setAddress(updated.address || '');
        setCity(updated.city || '');

        if (raw) {
          try {
            const existing = JSON.parse(raw);
            localStorage.setItem('rms_branch', JSON.stringify({ ...existing, ...updated }));
          } catch (e) {}
        }
        window.dispatchEvent(new Event('storage'));
        toast.success('Branch Profile updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update branch profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2.5 text-neutral-500 font-sans">
        <Loader2 size={22} className="animate-spin text-brand-primary" />
        <span className="text-xs font-700 uppercase tracking-wider text-neutral-600">
          Loading Branch Profile...
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <Store size={17} className="text-brand-primary" />
          <h2 className="text-xs font-850 uppercase tracking-wider text-neutral-800">
            Profile Details
          </h2>
        </div>
        <span className="text-[10px] font-800 text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
          Branch Code: {code}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Branch Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
            Branch Name *
          </label>
          <div className="relative">
            <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pizza Hut Downtown"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Branch Code (Read Only) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
              Branch Code
            </label>
            <span className="text-[9px] font-800 text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded uppercase">
              Fixed ID
            </span>
          </div>
          <div className="relative">
            <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              disabled
              value={code}
              className="w-full bg-neutral-100/80 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs font-800 font-mono text-neutral-500 cursor-not-allowed select-none"
            />
          </div>
        </div>

        {/* Branch Email (Read Only) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
              Branch Email
            </label>
            <span className="text-[9px] font-800 text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded uppercase">
              Read-Only
            </span>
          </div>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              disabled
              value={email}
              className="w-full bg-neutral-100/80 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs font-600 text-neutral-500 cursor-not-allowed select-none"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
            Phone Number
          </label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 416-555-0101"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Street Address */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
            Street Address
          </label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Yonge Street, Suite 101"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* City */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-800 text-neutral-600 uppercase tracking-wider">
            City
          </label>
          <div className="relative">
            <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Toronto"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-3 border-t border-neutral-100 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-800 uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-brand-primary/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              Save Branch Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
}
