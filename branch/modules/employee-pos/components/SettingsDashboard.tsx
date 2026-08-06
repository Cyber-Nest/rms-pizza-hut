import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import PosNavbar from './PosNavbar';
import POSSidebarDrawer from './POSSidebarDrawer';

// Split Tab Components
import MainSettingsTab from './settings-components/MainSettingsTab';
import TaxFeesTab from './settings-components/TaxFeesTab';
import TerminalSetupTab from './settings-components/TerminalSetupTab';
import TillSetupTab from './settings-components/TillSetupTab';
import StoreTimingsTab from './settings-components/StoreTimingsTab';
import StoreTimingsUpdateTab from './settings-components/StoreTimingsUpdateTab';
import HolidaysTab from './settings-components/HolidaysTab';

// Shared Types
import { TabType, Terminal, Till, StoreTiming, TimingUpdate, Holiday, TaxFeesSettings } from './settings-components/settingsTypes';

export default function SettingsDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('main_settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── 1. Main Settings State ──
  const [mainSettings, setMainSettings] = useState({
    timezone: 'Mountain Standard Time (MST) - America/Edmonton',
    defaultTimeMinutes: '15',
    reportingStartTime: '12:00 AM',
    reportingEndTime: '12:00 AM',
    latitude: '51.05643',
    longitude: '-113.37832',
    commission: '0.00',
    gstNumber: '123456789',
    showMenuImage: true,
    showCategoryImage: true,
    backgroundColor: '#000000'
  });

  // ── 2. Tax & Fees Settings State ──
  const [taxFeesSettings, setTaxFeesSettings] = useState<TaxFeesSettings>({
    deliveryFee: '4.99',
    gstTaxRate: '5.00',
    pstTaxRate: '0.00',
    hstTaxRate: '0.00',
  });

  // ── 3. Terminal Setup State ──
  const [terminals, setTerminals] = useState<Terminal[]>([]);

  // ── 4. Till Setup State ──
  const [tills, setTills] = useState<Till[]>([]);

  // ── 5. Store Timings State ──
  const [isEmergencyClosed, setIsEmergencyClosed] = useState(false);
  const [storeTimings, setStoreTimings] = useState<StoreTiming[]>([
    { day: 'Sunday', startTime: '10:00 AM', endTime: '08:00 PM', isHoliday: 'No' },
    { day: 'Monday', startTime: '10:00 AM', endTime: '09:00 PM', isHoliday: 'No' },
    { day: 'Tuesday', startTime: '10:00 AM', endTime: '09:00 PM', isHoliday: 'No' },
    { day: 'Wednesday', startTime: '10:00 AM', endTime: '09:00 PM', isHoliday: 'No' },
    { day: 'Thursday', startTime: '10:00 AM', endTime: '09:00 PM', isHoliday: 'No' },
    { day: 'Friday', startTime: '10:00 AM', endTime: '10:00 PM', isHoliday: 'No' },
    { day: 'Saturday', startTime: '10:00 AM', endTime: '10:00 PM', isHoliday: 'No' },
  ]);

  // ── 6. Store Timings Update State ──
  const [timingsUpdates, setTimingsUpdates] = useState<TimingUpdate[]>([]);

  // ── 7. Holidays State ──
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // ── Get Active Branch ID ──
  const getBranchId = () => {
    if (typeof window !== 'undefined') {
      const rawBranch = localStorage.getItem('rms_branch');
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          return b._id;
        } catch (e) {}
      }
    }
    return undefined;
  };

  // ── Load Branch Settings from Backend ──
  const fetchSettings = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/branches/settings`, {
        params: { branchId }
      });
      if (res.data?.success && res.data?.data) {
        const s = res.data.data;
        // Persist to localStorage so KitchenDetailModal can read defaultTimeMinutes
        try { localStorage.setItem('rms_branch_settings', JSON.stringify(s)); } catch (e) {}

        if (s.mainSettings) {
          if (s.mainSettings.isEmergencyClosed !== undefined) {
            setIsEmergencyClosed(!!s.mainSettings.isEmergencyClosed);
          }
          setMainSettings((prev) => ({
            ...prev,
            ...s.mainSettings,
            latitude: String(s.mainSettings.latitude ?? prev.latitude),
            longitude: String(s.mainSettings.longitude ?? prev.longitude),
            commission: String(s.mainSettings.commission ?? prev.commission),
            defaultTimeMinutes: String(s.mainSettings.defaultTimeMinutes ?? prev.defaultTimeMinutes),
          }));
        }
        if (s.taxFeesSettings) {
          const tf = s.taxFeesSettings;
          setTaxFeesSettings(prev => ({
            ...prev,
            ...tf,
            deliveryFee: String(tf.deliveryFee ?? prev.deliveryFee),
            gstTaxRate: String(tf.gstTaxRate ?? prev.gstTaxRate),
            pstTaxRate: String(tf.pstTaxRate ?? prev.pstTaxRate),
            hstTaxRate: String(tf.hstTaxRate ?? prev.hstTaxRate),
          }));
        }
        if (s.storeTimings && s.storeTimings.length > 0) setStoreTimings(s.storeTimings);
        if (s.storeTimingsUpdates) setTimingsUpdates(s.storeTimingsUpdates);
        if (s.holidays) setHolidays(s.holidays);
        if (s.terminals) setTerminals(s.terminals);
        if (s.tills) setTills(s.tills);
      }
    } catch (err) {
      console.warn('Could not load branch settings from backend');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Save Settings to Backend ──
  const saveSettingsToBackend = async (payload: any, successMessage: string) => {
    const branchId = getBranchId();
    if (!branchId) {
      toast.error('Branch session invalid');
      return;
    }

    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      await axios.patch(`${apiUrl}/branches/settings`, {
        branchId,
        ...payload
      });
      toast.success(successMessage);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings to database');
    } finally {
      setSaving(false);
    }
  };

  // ── Main Settings Submit Handler ──
  const handleMainSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettingsToBackend({ mainSettings }, 'Main Settings updated successfully!');
    // Also update rms_branch localStorage so delivery map picks up new lat/lng immediately
    try {
      const raw = localStorage.getItem('rms_branch');
      if (raw) {
        const b = JSON.parse(raw);
        b.lat = Number(mainSettings.latitude) || b.lat;
        b.lng = Number(mainSettings.longitude) || b.lng;
        localStorage.setItem('rms_branch', JSON.stringify(b));
      }
    } catch (e) {}
  };

  // ── Tax & Fees Submit Handler ──
  const handleTaxFeesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsToBackend({ taxFeesSettings }, 'Tax & Fees Settings updated successfully!');
  };

  // ── Store Timings Submit Handler ──
  const handleStoreTimingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsToBackend(
      {
        storeTimings,
        mainSettings: {
          ...mainSettings,
          isEmergencyClosed,
        },
      },
      'Store Timings & Closed status updated successfully!'
    );
  };

  const handleUpdateTimingsUpdates = (newVal: React.SetStateAction<TimingUpdate[]>) => {
    setTimingsUpdates((prev) => {
      const updated = typeof newVal === 'function' ? newVal(prev) : newVal;
      saveSettingsToBackend({ storeTimingsUpdates: updated }, 'Store Timings Update saved!');
      return updated;
    });
  };

  const handleUpdateHolidays = (newVal: React.SetStateAction<Holiday[]>) => {
    setHolidays((prev) => {
      const updated = typeof newVal === 'function' ? newVal(prev) : newVal;
      saveSettingsToBackend({ holidays: updated }, 'Holidays saved!');
      return updated;
    });
  };

  const handleUpdateTerminals = (newVal: React.SetStateAction<Terminal[]>) => {
    setTerminals((prev) => {
      const updated = typeof newVal === 'function' ? newVal(prev) : newVal;
      saveSettingsToBackend({ terminals: updated }, 'Terminals saved!');
      return updated;
    });
  };

  const handleUpdateTills = (newVal: React.SetStateAction<Till[]>) => {
    setTills((prev) => {
      const updated = typeof newVal === 'function' ? newVal(prev) : newVal;
      saveSettingsToBackend({ tills: updated }, 'Till registers saved!');
      return updated;
    });
  };

  return (
    <main className="min-h-screen bg-[#F5F4F1] font-sans flex flex-col antialiased">
      
      {/* Navbar Header */}
      <PosNavbar 
        onToggleSidebar={() => setIsSidebarOpen(true)} 
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Horizontal Navigation Tabs Bar */}
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 w-max max-w-full">
            
            <button
              onClick={() => setActiveTab('main_settings')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'main_settings'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Main Settings
            </button>

            <button
              onClick={() => setActiveTab('tax_fees')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'tax_fees'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Tax & Fees
            </button>

            <button
              onClick={() => setActiveTab('terminal_setup')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'terminal_setup'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Terminal Setup
            </button>

            <button
              onClick={() => setActiveTab('till_setup')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'till_setup'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Cash Register (Till) Setup
            </button>

            <button
              onClick={() => setActiveTab('store_timings')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'store_timings'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Store Timings
            </button>

            <button
              onClick={() => setActiveTab('store_timings_update')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'store_timings_update'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Store Timings Update
            </button>

            <button
              onClick={() => setActiveTab('holidays')}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                activeTab === 'holidays'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-neutral-500 hover:text-brand-primary'
              }`}
            >
              Holidays
            </button>

          </div>
        </div>

        {/* Tab Panel View Container */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl shadow-xs p-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500 font-sans">
              <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-700 uppercase tracking-wider text-neutral-600">
                Loading Branch Settings...
              </span>
            </div>
          ) : (
            <>
              {activeTab === 'main_settings' && (
                <MainSettingsTab
                  mainSettings={mainSettings}
                  setMainSettings={setMainSettings}
                  onSubmit={handleMainSettingsSubmit}
                  saving={saving}
                />
              )}

              {activeTab === 'tax_fees' && (
                <TaxFeesTab
                  taxFeesSettings={taxFeesSettings}
                  setTaxFeesSettings={setTaxFeesSettings}
                  onSubmit={handleTaxFeesSubmit}
                  saving={saving}
                />
              )}

              {activeTab === 'terminal_setup' && (
                <TerminalSetupTab
                  terminals={terminals}
                  setTerminals={handleUpdateTerminals}
                />
              )}

              {activeTab === 'till_setup' && (
                <TillSetupTab
                  tills={tills}
                  setTills={handleUpdateTills}
                />
              )}

              {activeTab === 'store_timings' && (
                <StoreTimingsTab
                  storeTimings={storeTimings}
                  setStoreTimings={setStoreTimings}
                  isEmergencyClosed={isEmergencyClosed}
                  setIsEmergencyClosed={setIsEmergencyClosed}
                  onSubmit={handleStoreTimingsSubmit}
                />
              )}

              {activeTab === 'store_timings_update' && (
                <StoreTimingsUpdateTab
                  timingsUpdates={timingsUpdates}
                  setTimingsUpdates={handleUpdateTimingsUpdates}
                />
              )}

              {activeTab === 'holidays' && (
                <HolidaysTab
                  holidays={holidays}
                  setHolidays={handleUpdateHolidays}
                />
              )}
            </>
          )}

        </div>

      </div>

      {/* Sidebar Navigation Drawer Overlay */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="setting"
        onSelectTab={(tabKey) => {
          if (tabKey === 'pos') {
            window.location.href = '/employee/pos';
          } else if (tabKey === 'kitchen') {
            window.location.href = '/employee/kitchen';
          } else if (tabKey === 'customers') {
            window.location.href = '/employee/customers';
          } else if (tabKey === 'setting') {
            setActiveTab('main_settings');
          } else if (
            ['orders', 'dashboard', 'sales_summary', 'expense_payout', 'transactions', 'reports', 'update_profile', 'change_password'].includes(tabKey)
          ) {
            let targetTab = tabKey;
            if (tabKey === 'transactions') targetTab = 'orders';
            window.location.href = `/employee/orders?view=${targetTab}`;
          }
          setIsSidebarOpen(false);
        }}
      />

    </main>
  );
}
