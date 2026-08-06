'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function UpdateProfileView() {
  const [firstName, setFirstName] = useState('Nikit');
  const [lastName, setLastName] = useState('Patel');
  const [emailName, setEmailName] = useState('nikitdhaduk8122@gmail.com');
  const [phoneNo, setPhoneNo] = useState('');
  const [loginCode, setLoginCode] = useState('8122');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mimic API submission
    setTimeout(() => {
      setLoading(false);
      toast.success('Profile updated successfully (Frontend Demo)');
    }, 1000);
  };

  return (
    <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-8 shadow-xs max-w-4xl select-none font-sans text-neutral-900">
      <h2 className="text-xl font-900 text-neutral-900 tracking-tight mb-8">Update Profile</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 font-750 block">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg px-5 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
              placeholder="Enter First Name"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 font-750 block">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg px-5 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
              placeholder="Enter Last Name"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 font-750 block">Email Name</label>
            <input
              type="email"
              value={emailName}
              onChange={(e) => setEmailName(e.target.value)}
              className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg px-5 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
              placeholder="Enter Email Address"
              required
            />
          </div>

          {/* Phone No */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 font-750 block">Phone No</label>
            <input
              type="tel"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg px-5 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
              placeholder="Enter Phone No"
            />
          </div>
        </div>

        {/* Login Code */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-neutral-500 font-750 block">Login Code</label>
          <input
            type="text"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg px-5 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
            placeholder="Enter Login Code"
            required
          />
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white font-900 text-[12px] uppercase tracking-wider rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'SUBMITTING...' : 'SUBMIT'}
          </button>
        </div>
      </form>
    </div>
  );
}
