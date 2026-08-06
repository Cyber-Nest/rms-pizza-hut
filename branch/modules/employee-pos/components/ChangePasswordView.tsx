'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordView() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New Password and Confirm Password do not match');
      return;
    }
    setLoading(true);
    // Mimic API submission
    setTimeout(() => {
      setLoading(false);
      toast.success('Password changed successfully (Frontend Demo)');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }, 1000);
  };

  return (
    <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-8 shadow-xs max-w-4xl select-none font-sans text-neutral-900">
      <h2 className="text-xl font-900 text-neutral-900 tracking-tight mb-8">Change Password</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Old Password */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-neutral-500 font-750 block">Old Password</label>
          <div className="relative">
            <input
              type={showOldPassword ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg pl-5 pr-12 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
              placeholder="Enter Old Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-450 hover:text-neutral-600 transition-colors cursor-pointer focus:outline-none"
            >
              {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 font-750 block">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg pl-5 pr-12 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
                placeholder="Enter New Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-450 hover:text-neutral-600 transition-colors cursor-pointer focus:outline-none"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 font-750 block">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-neutral-100 hover:bg-neutral-100/80 focus:bg-white border-0 rounded-lg pl-5 pr-12 py-3 text-[12px] font-600 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/15 transition-all"
                placeholder="Enter Confirm Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-450 hover:text-neutral-600 transition-colors cursor-pointer focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
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
