'use client';

import React, { useState, useEffect } from 'react';
import PosNavbar from './PosNavbar';
import POSSidebarDrawer from './POSSidebarDrawer';
import BranchProfileTab from './settings-components/BranchProfileTab';
import BranchPasswordTab from './settings-components/BranchPasswordTab';
import { UserCheck, Lock, ShieldCheck } from 'lucide-react';

type ActiveTab = 'profile' | 'password';

export default function BranchProfileView() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'password') {
        setActiveTab('password');
      } else {
        setActiveTab('profile');
      }
    }
  }, []);

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-neutral-100 text-neutral-900 font-sans antialiased select-none">
      {/* Top Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* Control Bar - Matching Vehicles Dashboard Header */}
      <div className="bg-white border-b border-neutral-200/90 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg lg:text-xl font-900 text-neutral-900 tracking-tight flex items-center gap-2">
            <span>Branch Account &amp; Security</span>
          </h1>
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md text-[10.5px] font-800 text-emerald-800">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Branch Master</span>
          </span>
        </div>

        {/* Tab Buttons Bar */}
        <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl border border-neutral-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs lg:text-[13.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <UserCheck size={14} />
            <span>Update Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs lg:text-[13.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Lock size={14} />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full bg-white border border-neutral-200/90 rounded-2xl shadow-xs p-5 sm:p-6">
          {activeTab === 'profile' ? <BranchProfileTab /> : <BranchPasswordTab />}
        </div>
      </div>

      {/*Sidebar Drawer*/}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab === 'profile' ? 'update_profile' : 'change_password'}
        onSelectTab={(tabKey) => {
          if (tabKey === 'update_profile') {
            setActiveTab('profile');
          } else if (tabKey === 'change_password') {
            setActiveTab('password');
          }
          setIsSidebarOpen(false);
        }}
      />
    </main>
  );
}
