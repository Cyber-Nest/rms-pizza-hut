'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, LogOut, LayoutDashboard, KeyRound, Clock, ShoppingBag, 
  Receipt, ArrowLeftRight, Wallet, Users, UtensilsCrossed, 
  Settings, UserCheck, Lock, Bell, BarChart3, Power, ChefHat, TrendingUp, Truck, Car, QrCode, ShieldCheck, User
} from 'lucide-react';
import CheckInOutModal from './CheckInOutModal';
import StoreQrModal from './StoreQrModal';
import LoginAsCodeModal from './LoginAsCodeModal';
import toast from 'react-hot-toast';
import axios from 'axios';


interface POSSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabKey: string) => void;
}

export default function POSSidebarDrawer({ isOpen, onClose, activeTab, onSelectTab }: POSSidebarDrawerProps) {
  const [isCheckInOutOpen, setIsCheckInOutOpen] = useState(false);
  const [isStoreQrOpen, setIsStoreQrOpen] = useState(false);
  const [isLoginCodeOpen, setIsLoginCodeOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<any>(null);

  const syncActiveEmployee = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('rms_active_employee');
      if (raw) {
        setActiveEmployee(JSON.parse(raw));
      } else {
        setActiveEmployee(null);
      }
    } catch {
      setActiveEmployee(null);
    }
  }, []);

  useEffect(() => {
    syncActiveEmployee();
    const handleStorageChange = () => syncActiveEmployee();
    window.addEventListener('rms_active_employee_changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('rms_active_employee_changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncActiveEmployee]);

  const handleSwitchToManager = () => {
    const isImp = typeof window !== 'undefined' && localStorage.getItem('rms_superadmin_impersonation') === 'true';
    localStorage.removeItem('rms_active_employee');
    if (!isImp) {
      localStorage.setItem('rms_terminal_locked', 'true');
      document.cookie = 'rms_terminal_locked=true; path=/; max-age=604800; SameSite=Lax';
    }
    window.dispatchEvent(new Event('rms_active_employee_changed'));
    toast.success('Staff logged out');
    window.location.href = '/login';
  };

  // Master Logout: clears everything and redirects to /login
  const handleMasterLogout = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      await axios.post(`${API_URL}/branches/logout`, {}, { withCredentials: true });
    } catch {
      // Even if API fails, proceed with local cleanup
    }
    // Clear localStorage
    localStorage.removeItem('rms_branch');
    localStorage.removeItem('rms_active_employee');
    localStorage.removeItem('rms_terminal_locked');
    localStorage.removeItem('rms_superadmin_impersonation'); // Clear impersonation flag
    // Clear JS-readable cookies (Next.js middleware uses these)
    document.cookie = 'rms_terminal_locked=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'rms_branch_session=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'rms_branch_token=; path=/; max-age=0; SameSite=Lax';
    toast.success('Terminal logged out');
    window.location.href = '/login';
  };


  if (!isOpen && !isCheckInOutOpen && !isStoreQrOpen && !isLoginCodeOpen) return null;

  const rawMenuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'login_code', label: 'Login As Code', icon: KeyRound },
    { key: 'check_in_out', label: 'Check-In/Out', icon: Clock },
    { key: 'store_qr', label: 'Store QR Code', icon: QrCode },
    { key: 'pos', label: 'POS', icon: ShoppingBag },
    { key: 'kitchen', label: 'Kitchen View', icon: ChefHat },
    { key: 'reception_view', label: 'Reception View', icon: TrendingUp },
    { key: 'delivery', label: 'Delivery', icon: Truck },
    { key: 'driver_drop', label: 'Driver Drop', icon: Receipt },
    { key: 'vehicles', label: 'Vehicle Number', icon: Car },
    { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { key: 'expense_payout', label: 'Expense/Payout', icon: Wallet },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'menus', label: 'Menus', icon: UtensilsCrossed },
    { key: 'setting', label: 'Setting', icon: Settings },
    { key: 'employees', label: 'Employee Management', icon: UserCheck },
    { key: 'permissions', label: 'Permissions', icon: ShieldCheck },
    { key: 'update_profile', label: 'Profile & Security', icon: UserCheck },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'master_logout', label: 'Master Logout', icon: LogOut, isLogout: true },
  ];

  // Filter menu items based on role
  const isManagerMode = !activeEmployee || activeEmployee.role === 'manager';

  const menuItems = rawMenuItems.filter(item => {
    // Master Logout: only for manager/admin (no active employee OR active employee is manager)
    if (item.key === 'master_logout') {
      return isManagerMode;
    }
    // Always visible system utilities
    if (['login_code', 'check_in_out', 'store_qr', 'pos'].includes(item.key)) {
      return true;
    }
    // Manager or no staff logged in sees all tabs
    if (isManagerMode) {
      return true;
    }
    // Non-manager employee: check employee permissions object
    const perms = activeEmployee.permissions || {};
    if (item.key === 'transactions' || item.key === 'orders') {
      const orderSubTabKeys = ['orders', 'orders_list', 'dashboard', 'sales_summary', 'expense_payout', 'reports', 'item_sales', 'hourly_sales', 'cash_out_summary', 'monthly_sales_summary', 'failed_transaction', 'refund_orders'];
      return orderSubTabKeys.some(k => perms[k] === true);
    }
    return perms[item.key] === true;
  });


  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 select-none font-sans">
          
          {/* Backdrop overlay clickable */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Drawer Container */}
          <div className="relative w-72 sm:w-80 bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            
            {/* Top Header */}
            <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between shadow-xs">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[11px] text-neutral-400 font-600 uppercase tracking-wider">
                  {activeEmployee ? `Staff Terminal (${activeEmployee.employeeId})` : 'User Account'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-900 text-white truncate">
                    Hi, {activeEmployee ? activeEmployee.name : 'Manager'}
                  </span>
                  {activeEmployee && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-800 bg-brand-primary text-white capitalize shrink-0">
                      {activeEmployee.role}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeEmployee ? (
                  <button 
                    onClick={handleSwitchToManager}
                    className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-neutral-900 transition-colors cursor-pointer"
                    title="Switch back to Manager mode"
                  >
                    <User size={14} />
                  </button>
                ) : (
                  <button 
                    onClick={handleMasterLogout}
                    className="p-2 rounded-full bg-red-600/90 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    title="Master Logout Terminal"
                  >
                    <Power size={14} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
                  title="Close Menu"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Active Employee Switcher Pill Notice */}
            {activeEmployee && (
              <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 flex items-center justify-between text-[11px] text-amber-800 font-700">
                <span>Active: {activeEmployee.name}</span>
                <button
                  type="button"
                  onClick={handleSwitchToManager}
                  className="text-[10px] text-amber-900 hover:underline font-800 cursor-pointer"
                >
                  Logout Staff
                </button>
              </div>
            )}

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key || 
                                 (item.key === 'transactions' && activeTab === 'orders');

                if (item.key === 'delivery') {
                  return (
                    <a
                      key={item.key}
                      href="/employee/delivery"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-800 tracking-wide transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-brand-primary text-white shadow-md' 
                          : item.isLogout
                          ? 'text-red-600 hover:bg-red-50 mt-4 border-t border-neutral-100 rounded-none'
                          : 'text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-white' : item.isLogout ? 'text-red-600' : 'text-neutral-500'} />
                      <span>{item.label}</span>
                    </a>
                  );
                }

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === 'login_code') {
                        setIsLoginCodeOpen(true);
                        onClose();
                        return;
                      }

                      if (item.key === 'check_in_out') {
                        setIsCheckInOutOpen(true);
                        onClose();
                        return;
                      }

                      if (item.key === 'store_qr') {
                        setIsStoreQrOpen(true);
                        onClose();
                        return;
                      }

                      if (item.key === 'master_logout') {
                        handleMasterLogout();
                        return;
                      }

                      if (item.key === 'pos') {
                        window.location.href = '/employee/pos';
                      } else if (item.key === 'kitchen') {
                        window.location.href = '/employee/kitchen';
                      } else if (item.key === 'reception_view') {
                        window.location.href = '/employee/reception';
                      } else if (item.key === 'driver_drop') {
                        window.location.href = '/employee/driver-drop';
                      } else if (item.key === 'vehicles') {
                        window.location.href = '/employee/vehicles';
                      } else if (item.key === 'customers') {
                        window.location.href = '/employee/customers';
                      } else if (item.key === 'employees') {
                        window.location.href = '/employee/employees';
                      } else if (item.key === 'permissions') {
                        window.location.href = '/employee/permissions';
                      } else if (item.key === 'setting') {
                        window.location.href = '/employee/settings';
                      } else if (item.key === 'update_profile') {
                        window.location.href = '/employee/profile?tab=profile';
                        } else if (item.key === 'change_password') {
                        window.location.href = '/employee/profile?tab=password';
                      } else if (item.key === 'menus') {
                        window.location.href = '/employee/menu';
                      } else if (
                        item.key === 'orders' || 
                        item.key === 'dashboard' || 
                        item.key === 'expense_payout' || 
                        item.key === 'sales_summary' || 
                        item.key === 'transactions' ||
                        item.key === 'reports'
                      ) {
                        let targetTab = item.key;
                        if (item.key === 'transactions') targetTab = 'orders';

                        if (typeof window !== 'undefined' && !window.location.pathname.includes('/employee/orders')) {
                          window.location.href = `/employee/orders?tab=${targetTab}`;
                        } else {
                          onSelectTab(targetTab);
                        }
                      } else {
                        onSelectTab(item.key);
                      }
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-800 tracking-wide transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-brand-primary text-white shadow-md' 
                        : item.isLogout
                        ? 'text-red-600 hover:bg-red-50 mt-4 border-t border-neutral-100 rounded-none'
                        : 'text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : item.isLogout ? 'text-red-600' : 'text-neutral-500'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100 text-center text-[10.5px] text-neutral-400 font-600 bg-neutral-50">
              RMS POS System v2.4
            </div>

          </div>
        </div>
      )}

      {/* Login As Code Modal */}
      <LoginAsCodeModal
        isOpen={isLoginCodeOpen}
        onClose={() => setIsLoginCodeOpen(false)}
      />

      {/* Check In / Out Modal Terminal */}
      <CheckInOutModal
        isOpen={isCheckInOutOpen}
        onClose={() => setIsCheckInOutOpen(false)}
        onSuccess={() => {}}
      />

      {/* Store QR Code Display & Download Modal */}
      <StoreQrModal
        isOpen={isStoreQrOpen}
        onClose={() => setIsStoreQrOpen(false)}
      />
    </>
  );
}
