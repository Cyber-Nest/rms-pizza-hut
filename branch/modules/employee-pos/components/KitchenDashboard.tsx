'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import PosNavbar from './PosNavbar';
import KitchenOrderCard from './KitchenOrderCard';
import KitchenDetailModal from './KitchenDetailModal';
import POSSidebarDrawer from './POSSidebarDrawer';
import { Order } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPusherClient } from '../../../lib/pusher';
import { getLocalTodayStr, getLocalDateStr } from '../utils/timezone';
import { KitchenSettings, StationConfig, DEFAULT_KITCHEN_SETTINGS } from './settings-components/settingsTypes';

// ── Responsive hook: how many cards to show based on screen width ──
function useVisibleCardCount() {
  const [count, setCount] = useState(4);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setCount(1);       // mobile: 1 card
      else if (w < 900) setCount(2);  // tablet portrait: 2 cards
      else if (w < 1200) setCount(3); // tablet landscape / small laptop: 3 cards
      else setCount(4);               // desktop: 4 cards
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return count;
}

export default function KitchenDashboard() {
  // ── Kitchen Settings (read from localStorage, saved by SettingsDashboard) ──
  const getKitchenSettings = (): KitchenSettings => {
    if (typeof window === 'undefined') return DEFAULT_KITCHEN_SETTINGS;
    try {
      const raw = localStorage.getItem('rms_branch_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.kitchenSettings?.stations?.length > 0) return parsed.kitchenSettings;
      }
    } catch (e) {}
    return DEFAULT_KITCHEN_SETTINGS;
  };

  const [kitchenSettings, setKitchenSettings] = useState<KitchenSettings>(getKitchenSettings);

  // Fetch kitchen settings directly from backend API on mount & focus to guarantee DB sync
  const fetchKitchenSettings = useCallback(async () => {
    let branchId: string | undefined = undefined;
    if (typeof window !== 'undefined') {
      const rawBranch = localStorage.getItem('rms_branch');
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          branchId = b._id;
        } catch (e) {}
      }
    }
    if (!branchId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/branches/settings`, { params: { branchId, kitchenOnly: true } });
      if (res.data?.success && res.data?.data?.kitchenSettings) {
        const ks = res.data.data.kitchenSettings;
        if (ks.stations && ks.stations.length > 0) {
          setKitchenSettings(ks);
          try {
            const raw = localStorage.getItem('rms_branch_settings');
            const stored = raw ? JSON.parse(raw) : {};
            localStorage.setItem('rms_branch_settings', JSON.stringify({ ...stored, kitchenSettings: ks }));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Could not load kitchen settings from backend API');
    }
  }, []);

  useEffect(() => {
    fetchKitchenSettings();
    const onRefresh = () => {
      setKitchenSettings(getKitchenSettings());
      fetchKitchenSettings();
    };
    window.addEventListener('storage', onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      window.removeEventListener('storage', onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [fetchKitchenSettings]);

  const enabledStations = kitchenSettings.stations.filter((s) => s.isEnabled);

  // ── States ───────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [draftCart, setDraftCart] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing' | 'in_oven' | 'ready'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'takeout' | 'drive-through' | 'dine-in' | 'delivery' | 'online'>('all');
  const [stationFilter, setStationFilter] = useState<'cut_station' | 'make_table' | 'wings_station'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kitchen_station_filter');
      // Validate saved station is still enabled in config
      const cfg = getKitchenSettings();
      const enabledIds = cfg.stations.filter((s) => s.isEnabled).map((s) => s.id);
      if (saved && enabledIds.includes(saved as any)) return saved as any;
      // Fall back to first enabled station
      if (enabledIds.length > 0) return enabledIds[0] as any;
    }
    return 'make_table';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kitchen_station_filter', stationFilter);
    }
  }, [stationFilter]);

  // Ensure selected stationFilter is always an enabled station
  useEffect(() => {
    const enabledIds = enabledStations.map((s) => s.id);
    if (enabledIds.length > 0 && !enabledIds.includes(stationFilter)) {
      setStationFilter(enabledIds[0]);
    }
  }, [enabledStations, stationFilter]);
  const [branchMenuItems, setBranchMenuItems] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const ordersRef = useRef(orders);
  const visibleCardCount = useVisibleCardCount();
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // ── Fetch Branch Menu Feed to Inspect Kitchen Labels ────────
  const fetchBranchMenu = useCallback(async () => {
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const rawBranch = localStorage.getItem('rms_branch');
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/menu/pos-feed`, {
        params: branchId ? { branchId } : {}
      });
      if (res.data?.success && res.data?.data?.menuItems) {
        setBranchMenuItems(res.data.data.menuItems);
      }
    } catch (err) {
      console.warn('Failed to load branch menu feed for kitchen label inspection');
    }
  }, []);

  useEffect(() => {
    fetchBranchMenu();
  }, [fetchBranchMenu]);

  // ── Fetch DB Orders ──────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== 'undefined') {
        const rawBranch = localStorage.getItem('rms_branch');
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/orders`, {
        params: {
          status: 'pending,preparing,in_oven,ready',
          fields: 'orderNumber,orderSource,orderType,status,makeTableStatus,wingsStatus,createdAt,items,orderTiming,scheduledAt,dueAt,total,paymentStatus,kitchenCleared,branchId,branchName,branchCode',
          excludeKitchenCleared: 'true',
          ...(branchId ? { branchId } : {})
        }
      });
      if (res.data.success) {
        // Only keep active kitchen orders (pending, preparing, in_oven, ready)
        // and exclude future scheduled orders (orders scheduled for a day after today)
        // Also exclude orders where ALL kitchen stations are completed (kitchen work is done)
        const todayLocalStr = getLocalTodayStr();
        const activeOrders = (res.data.data as Order[]).filter((o) => {
          const isActive = ['pending', 'preparing', 'in_oven', 'ready'].includes(o.status);
          if (!isActive) return false;
          if (o.kitchenCleared) return false;

          // If both stations are "completed", kitchen work is fully done for this order
          // (e.g., delivery orders stuck in "ready" status waiting for driver pickup)
          // These should not appear in the kitchen view at all
          if (o.makeTableStatus === 'completed' && o.wingsStatus === 'completed') {
            return false;
          }

          if (o.orderTiming === 'later' && o.scheduledAt) {
            const schedLocalStr = getLocalDateStr(o.scheduledAt);
            if (schedLocalStr > todayLocalStr) {
              return false;
            }
          }
          return true;
        });
        setOrders(activeOrders);
      }
    } catch (err) {
      console.error('Failed to fetch orders in kitchen dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial Fetch & Timer ────────────────────────────────────
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

// ── Web Audio Kitchen Notification Bell/Chime Sound ──────────
let globalAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
};

const playKitchenNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, startTime: number, duration: number, peakGain = 0.85, type: OscillatorType = 'triangle') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope: High-volume crisp attack and smooth decay for noisy kitchen
      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;

    // Single Loud Chime (A5 = 880Hz, D6 = 1174.66Hz)
    playTone(880, now, 0.25, 0.85, 'triangle');
    playTone(1174.66, now + 0.12, 0.45, 0.90, 'sine');
  } catch (err) {
    console.warn('Audio playback error in kitchen notification:', err);
  }
};

  const stationFilterRef = useRef(stationFilter);
  useEffect(() => {
    stationFilterRef.current = stationFilter;
  }, [stationFilter]);

  // Auto-unlock AudioContext on first user click/touch/keydown so background Pusher audio works 100% reliably
  useEffect(() => {
    const unlock = () => {
      getAudioContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Check if an order is active & relevant for a specific kitchen station
  // Used for Pusher audio notifications: beep only if order is relevant to current station
  // Cut-like stations (isEnabled but next station means pass-through) never beep
  const isOrderRelevantToStation = useCallback((orderData: any, targetStationId: string) => {
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) return true;

    const stationCfg = kitchenSettings.stations.find((s) => s.id === targetStationId);
    // Cut station never beeps — it is a pass-through destination, not an order entry point
    if (targetStationId === 'cut_station') return false;
    // If station is a passthrough (make_table with nextStation set to cut_station), it DOES beep
    // because new orders land here first

    const getItemLabel = (item: any): 'make_table' | 'wings_station' => {
      if (item.kitchenLabel === 'wings_station' || item.kitchenLabel === 'chicken') return 'wings_station';
      if (item.kitchenLabel === 'make_table' || item.kitchenLabel === 'pizza') return 'make_table';
      const lowerName = (item.name || '').toLowerCase();
      if (lowerName.includes('chicken') || lowerName.includes('wings') || lowerName.includes('strip') || lowerName.includes('side') || lowerName.includes('fries') || lowerName.includes('drink') || lowerName.includes('beverage')) return 'wings_station';
      return 'make_table';
    };

    const handlesTypes = stationCfg?.handlesItemTypes || ['pizza'];
    const hasPizza = orderData.items.some((i: any) => getItemLabel(i) === 'make_table');
    const hasWings = orderData.items.some((i: any) => getItemLabel(i) === 'wings_station');

    const wantsPizza = handlesTypes.includes('pizza') && hasPizza;
    const wantsWings = handlesTypes.includes('wings') && hasWings;
    return wantsPizza || wantsWings;
  }, [kitchenSettings]);

  // ── Pusher Real-time Listener ────────────────────────────────
  useEffect(() => {
    let branchId: string | undefined = undefined;
    if (typeof window !== 'undefined') {
      const rawBranch = localStorage.getItem('rms_branch');
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          branchId = b._id;
        } catch (e) {}
      }
    }

    const pusher = getPusherClient();
    const channelName = branchId ? `orders-${branchId}` : 'orders';
    const channel = pusher.subscribe(channelName);

    // Bind to the 'new-order' event
    channel.bind('new-order', (data: any) => {
      console.log('Real-time order received via Pusher:', data);
      fetchOrders();

      const currentStation = stationFilterRef.current;
      // Audio beep ONLY on new order creation AND only for Make Table or Wings Station (never Cut Station)
      if (currentStation === 'make_table' || currentStation === 'wings_station') {
        if (isOrderRelevantToStation(data, currentStation)) {
          playKitchenNotificationSound();
          toast.success(`New Order Received: ${data.orderNumber ? '#' + data.orderNumber : ''}`, {
            duration: 4000,
            position: 'top-right',
            icon: '🍳'
          });
        }
      }
    });

    // Bind to the 'order-updated' event (Status changes -> NO audio beep)
    channel.bind('order-updated', (data: any) => {
      console.log('Real-time order updated via Pusher:', data);
      
      const existingOrder = ordersRef.current.find((o) => o._id === data._id);
      
      if (!existingOrder) {
        const isActiveStatus = ['pending', 'preparing', 'in_oven', 'ready'].includes(data.status);
        const bothStationsDone = data.makeTableStatus === 'completed' && data.wingsStatus === 'completed';
        if (data.kitchenCleared || !isActiveStatus || bothStationsDone) {
          console.log('Ignoring order-updated event in Kitchen View (order already not active/cleared).');
          return;
        }
      } else {
        const statusChanged = existingOrder.status !== data.status;
        const makeTableChanged = existingOrder.makeTableStatus !== data.makeTableStatus;
        const wingsChanged = existingOrder.wingsStatus !== data.wingsStatus;
        const kitchenClearedChanged = !!existingOrder.kitchenCleared !== !!data.kitchenCleared;
        
        if (!statusChanged && !makeTableChanged && !wingsChanged && !kitchenClearedChanged) {
          console.log('Ignoring order-updated event in Kitchen View (no status/station change).');
          return;
        }
      }
      
      // Re-fetch order list without audio beep on status update
      fetchOrders();
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [fetchOrders, isOrderRelevantToStation]);

  // ── LocalStorage Draft Cart Listener ──
  useEffect(() => {
    const loadDraft = () => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('rms_draft_cart');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setDraftCart(parsed);
        } catch {
          setDraftCart(null);
        }
      } else {
        setDraftCart(null);
      }
    };

    loadDraft();
    window.addEventListener('storage', loadDraft);
    return () => window.removeEventListener('storage', loadDraft);
  }, []);

  // ── Fetch Full Order Details for Modal ──
  const handleSelectOrder = async (order: Order) => {
    if (order.orderNumber === '#DRAFT') {
      setSelectedOrder(order);
      return;
    }
    const toastId = toast.loading('Loading order details...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${apiUrl}/orders/${order._id}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data);
      } else {
        toast.error('Failed to load order details');
      }
    } catch (err) {
      console.error('Error fetching order details in kitchen:', err);
      toast.error('Failed to load order details');
    } finally {
      toast.dismiss(toastId);
    }
  };

  // ── Status Mappings ──
  const getMappedStatus = (order: Order) => {
    if (order.orderNumber === '#DRAFT') return 'pending';
    if (order.status === 'pending') return 'confirmed';
    if (order.status === 'preparing') return 'preparing';
    if (order.status === 'in_oven') return 'in_oven';
    if (order.status === 'ready') return 'ready';
    return order.status;
  };

  // ── Calculate Counts ──
  const activeDraftCount = draftCart ? 1 : 0;
  
  // Totals for Statuses
  const countPending = activeDraftCount;
  const countConfirmed = orders.filter((o) => o.status === 'pending').length;
  const countPreparing = orders.filter((o) => o.status === 'preparing').length;
  const countInOven = orders.filter((o) => o.status === 'in_oven').length;
  const countReady = orders.filter((o) => o.status === 'ready').length;
  
  // countAll should only include placed orders (confirmed, preparing, in_oven, ready). Exclude pending draftCart.
  const countAll = countConfirmed + countPreparing + countInOven + countReady;

  // Totals for Order Types (Only count active DB orders, exclude pending draftCart)
  const countTakeout = orders.filter((o) => o.orderType === 'takeout' && o.orderSource === 'pos').length;
  const countDriveThrough = orders.filter((o) => o.orderType === 'drive-through' && o.orderSource === 'pos').length;
  const countDineIn = orders.filter((o) => o.orderType === 'dine-in' && o.orderSource === 'pos').length;
  const countDelivery = orders.filter((o) => o.orderType === 'delivery' && o.orderSource === 'pos').length;
  const countOnline = orders.filter((o) => o.orderSource === 'online').length;

  // Reset startIndex and focusedIndex on filter change
  useEffect(() => {
    setStartIndex(0);
    setFocusedIndex(0);
  }, [statusFilter, typeFilter, stationFilter]);

  // ── Filter and Sort All Candidates ──────────────────────────
  const filteredOrders = React.useMemo(() => {
    const candidates: Order[] = [];

    // Draft cart candidate (ONLY show in pending filter per request)
    if (draftCart) {
      const matchesStatus = statusFilter === 'pending';
      const matchesType = typeFilter === 'all' || typeFilter === draftCart.orderType;
      if (matchesStatus && matchesType) {
        candidates.push(draftCart);
      }
    }

    // DB orders candidates
    orders.forEach((o) => {
      const mapped = getMappedStatus(o);
      const matchesStatus = statusFilter === 'all' || statusFilter === mapped;
      
      let matchesType = false;
      if (typeFilter === 'all') {
        matchesType = true;
      } else if (typeFilter === 'online') {
        matchesType = o.orderSource === 'online';
      } else {
        matchesType = o.orderType === typeFilter && o.orderSource === 'pos';
      }

      let isVisibleTime = true;
      if (o.orderTiming === 'later' && o.scheduledAt) {
        const schedTime = new Date(o.scheduledAt).getTime();
        //Scheduled / Order Later Orders time set 30mins earlier to show order in kitchen
        if (schedTime - currentTime > 30 * 60 * 1000) {
          isVisibleTime = false;
        }
      }

      if (matchesStatus && matchesType && isVisibleTime) {
        candidates.push(o);
      }
    });

    const getItemKitchenLabel = (item: any): 'make_table' | 'wings_station' => {
      if (item.kitchenLabel === 'wings_station' || item.kitchenLabel === 'chicken') return 'wings_station';
      if (item.kitchenLabel === 'make_table' || item.kitchenLabel === 'pizza') return 'make_table';
      
      const lowerName = (item.name || '').toLowerCase();
      if (
        lowerName.includes('chicken') ||
        lowerName.includes('wings') ||
        lowerName.includes('strip') ||
        lowerName.includes('side') ||
        lowerName.includes('fries') ||
        lowerName.includes('drink') ||
        lowerName.includes('beverage')
      ) {
        return 'wings_station';
      }
      return 'make_table';
    };

    const getModStation = (mod: any): 'make_table' | 'wings_station' | null => {
      if (!mod.kitchenLabel) return null;
      if (mod.kitchenLabel === 'wings_station' || mod.kitchenLabel === 'chicken') return 'wings_station';
      if (mod.kitchenLabel === 'make_table' || mod.kitchenLabel === 'pizza') return 'make_table';
      return null;
    };

    const filterItemForStation = (item: any, targetStation: 'make_table' | 'wings_station'): any | null => {
      const baseLabel = getItemKitchenLabel(item);
      const mods = item.selectedModifiers || [];
      const hasExplicitModLabels = mods.some((m: any) => getModStation(m) !== null);

      if (!hasExplicitModLabels) {
        return baseLabel === targetStation ? item : null;
      }

      let currentRootStation: 'make_table' | 'wings_station' = baseLabel;
      const matchingMods = mods.filter((m: any) => {
        let s = getModStation(m);
        const isRootVal =
          m.isRoot !== undefined
            ? m.isRoot
            : !(
                m.groupName?.toLowerCase().includes("mix") ||
                m.groupName?.toLowerCase().includes("white & dark")
              );

        if (isRootVal) {
          if (s) {
            currentRootStation = s;
          } else {
            currentRootStation = baseLabel;
          }
        } else {
          if (!s) {
            s = currentRootStation;
          }
        }

        const finalStation = s || currentRootStation;
        return finalStation === targetStation;
      });

      const isBaseStationMatch = baseLabel === targetStation;
      const hasMatchingMods = matchingMods.length > 0;

      if (isBaseStationMatch || hasMatchingMods) {
        return {
          ...item,
          selectedModifiers: matchingMods,
        };
      }

      return null;
    };

    // ── Config-driven station filtering logic ──────────────────
    const stationFiltered: Order[] = [];
    const currentStationCfg: StationConfig | undefined = kitchenSettings.stations.find((s) => s.id === stationFilter);
    const makeTableCfg: StationConfig | undefined = kitchenSettings.stations.find((s) => s.id === 'make_table');
    const cutStationEnabled = kitchenSettings.stations.find((s) => s.id === 'cut_station')?.isEnabled ?? true;
    const makeTableNextStation = makeTableCfg ? makeTableCfg.nextStation : 'cut_station'; // null = no cut station, 'cut_station' = 3-station flow

    candidates.forEach((o) => {
      const items = o.items || [];
      const makeTableItems = items
        .map((item: any) => filterItemForStation(item, 'make_table'))
        .filter(Boolean);
      const wingsStationItems = items
        .map((item: any) => filterItemForStation(item, 'wings_station'))
        .filter(Boolean);

      const hasPizza = makeTableItems.length > 0;
      const hasWings = wingsStationItems.length > 0;

      const mtStatus = o.makeTableStatus || (o.status === 'in_oven' ? 'in_oven' : o.status === 'completed' ? 'completed' : o.status === 'preparing' ? 'preparing' : 'pending');
      const wStatus = o.wingsStatus || (o.status === 'completed' ? 'completed' : o.status === 'ready' ? 'ready' : o.status === 'preparing' ? 'preparing' : 'pending');

      const handlesTypes = currentStationCfg?.handlesItemTypes || (stationFilter === 'wings_station' ? ['wings'] : ['pizza']);
      const handlesPizza = handlesTypes.includes('pizza');
      const handlesWings = handlesTypes.includes('wings');

      let isPizzaActiveForStation = false;
      if (handlesPizza && hasPizza) {
        if (stationFilter === 'cut_station') {
          isPizzaActiveForStation = mtStatus === 'in_oven' || (statusFilter === 'ready' && mtStatus === 'completed');
        } else if (stationFilter === 'make_table' && makeTableNextStation === 'cut_station') {
          isPizzaActiveForStation = mtStatus === 'pending' || mtStatus === 'preparing';
        } else {
          // No cut station transfer for pizza
          isPizzaActiveForStation = mtStatus !== 'completed';
        }
      }

      let isWingsActiveForStation = false;
      if (handlesWings && hasWings) {
        isWingsActiveForStation = wStatus !== 'completed';
      }

      const isStationActive = isPizzaActiveForStation || isWingsActiveForStation;

      if (isStationActive) {
        let cardItems = items;
        if (handlesWings && !handlesPizza) {
          // Wings-only station (e.g. Wings Station): show only wings/sides items
          cardItems = wingsStationItems.length > 0 ? wingsStationItems : items;
        } else {
          // Pizza handling station (e.g. Make Station / Cut Station): show full order items (Pizza + Sides)
          cardItems = items;
        }
        stationFiltered.push({ ...o, items: cardItems });
      }
    });

    // Sort strictly by createdAt (oldest first)
    return stationFiltered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, draftCart, statusFilter, typeFilter, stationFilter, currentTime, kitchenSettings]);

  // Keep focusedIndex within valid bounds
  useEffect(() => {
    if (focusedIndex >= filteredOrders.length && filteredOrders.length > 0) {
      setFocusedIndex(filteredOrders.length - 1);
    }
  }, [filteredOrders.length, focusedIndex]);

  // Keyboard Navigation: ArrowLeft / ArrowRight to highlight card, Enter to open detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        selectedOrder ||
        isSidebarOpen ||
        (target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable))
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (filteredOrders.length === 0) return 0;
          const next = Math.min(filteredOrders.length - 1, prev + 1);
          if (next >= startIndex + visibleCardCount) {
            setStartIndex(next - visibleCardCount + 1);
          }
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (filteredOrders.length === 0) return 0;
          const next = Math.max(0, prev - 1);
          if (next < startIndex) {
            setStartIndex(next);
          }
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOrders[focusedIndex]) {
          handleSelectOrder(filteredOrders[focusedIndex]);
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        // Cycle only through enabled stations (config-driven)
        const enabledIds = kitchenSettings.stations.filter((s) => s.isEnabled).map((s) => s.id);
        if (enabledIds.length <= 1) return;
        setStationFilter((prev) => {
          const idx = enabledIds.indexOf(prev);
          return (enabledIds[(idx + 1) % enabledIds.length]) as any;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrder, isSidebarOpen, filteredOrders, focusedIndex, startIndex, visibleCardCount, handleSelectOrder, kitchenSettings]);

  const visibleOrders = filteredOrders.slice(startIndex, startIndex + visibleCardCount);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* ── Filter Controls Section (1 Line on Large Screens >= 1280px, 2 Clean Lines on Laptops/Tablets < 1280px) ── */}
      <div className="bg-white border-b border-neutral-200 px-3 md:px-5 py-2 md:py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 shadow-xs flex-shrink-0 select-none">
        {/* Status Pills (Left on Large Screens, Line 1 on Medium Screens) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          {[
            { id: "all", label: "All", count: countAll },
            { id: "pending", label: "Pending", count: countPending },
            { id: "confirmed", label: "Confirmed", count: countConfirmed },
            { id: "preparing", label: "Preparing", count: countPreparing },
            { id: "in_oven", label: "In Oven", count: countInOven },
            { id: "ready", label: "Ready", count: countReady },
          ].map((statusTab) => {
            const active = statusFilter === statusTab.id;
            return (
              <button
                key={statusTab.id}
                onClick={() => setStatusFilter(statusTab.id as any)}
                className={`flex-shrink-0 px-3 py-1 md:px-3.5 md:py-1.5 rounded-full text-[10px] md:text-[11px] lg:text-[12.5px] font-750 tracking-wide uppercase transition-all duration-150 cursor-pointer border ${
                  active
                    ? "bg-brand-primary border-brand-primary text-white shadow-sm shadow-brand-primary/15"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-brand-primary/30 hover:text-brand-primary hover:bg-orange-50/50"
                }`}
              >
                {statusTab.label} ({statusTab.count})
              </button>
            );
          })}
        </div>

        {/* Station Filters + Order Type Filters Container:
            - Large Screens (xl: >= 1280px): Flows in 1 single row along with Status Pills.
            - Medium Screens / DevTools (< 1280px): Placed together on Line 2 (Station Left, Order Type Right).
        */}
        <div className="flex items-center justify-between xl:justify-end gap-2 xl:gap-3 flex-wrap sm:flex-nowrap flex-shrink-0">
          {/* Station Filters — rendered dynamically from kitchenSettings */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200 flex-shrink-0">
            {enabledStations.map((stTab) => {
              const active = stationFilter === stTab.id;
              return (
                <button
                  key={stTab.id}
                  onClick={() => setStationFilter(stTab.id as any)}
                  className={`px-2.5 md:px-3 py-1 rounded-lg text-[10px] md:text-[11px] lg:text-[12.5px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer flex-shrink-0 ${
                    active
                      ? "bg-brand-primary text-white shadow-xs font-900"
                      : "text-neutral-700 hover:text-brand-primary hover:bg-white"
                  }`}
                >
                  {stTab.label}
                </button>
              );
            })}
          </div>

          {/* Order Type Filters */}
          <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-200 flex-shrink-0">
            {[
              { id: "all", label: "All Types", count: countAll },
              { id: "takeout", label: "Takeout", count: countTakeout },
              { id: "dine-in", label: "Dine In", count: countDineIn },
              { id: "delivery", label: "Delivery", count: countDelivery },
            ].map((typeTab) => {
              const active = typeFilter === typeTab.id;
              return (
                <button
                  key={typeTab.id}
                  onClick={() => setTypeFilter(typeTab.id as any)}
                  className={`flex-shrink-0 px-2 md:px-2.5 py-1 rounded-lg text-[10px] md:text-[11px] lg:text-[12.5px] font-700 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-brand-primary text-white shadow-xs"
                      : "text-neutral-550 hover:text-brand-primary"
                  }`}
                >
                  {typeTab.label} ({typeTab.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Cards Row with pagination arrows ── */}
      <div className="flex-1 p-3 md:p-4 lg:p-6 flex items-stretch justify-center gap-2 md:gap-4 min-h-0 bg-brand-bg select-none">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full border-4 border-brand-primary/10 animate-ping duration-1000" />
              <div className="w-12 h-12 rounded-full border-4 border-neutral-200 border-t-brand-primary animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-800 tracking-wider uppercase text-neutral-550 animate-pulse">
                Loading active queue
              </span>
              <span className="text-[9px] text-neutral-400 font-500">
                Please wait a moment...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Left Navigation Arrow */}
            {startIndex > 0 ? (
              <button
                onClick={() => setStartIndex((prev) => Math.max(0, prev - 1))}
                className="self-center w-8 h-8 md:w-12 md:h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Previous orders"
              >
                <ChevronLeft size={20} className="stroke-[3]" />
              </button>
            ) : (
              <div className="self-center w-8 h-8 md:w-12 md:h-12 flex-shrink-0" />
            )}

            {/* Responsive Grid: 1 col mobile / 2 cols small tablet / 3 cols tablet & small laptop / 4 cols large desktop */}
            <div className="flex-1 h-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5 items-stretch justify-start min-h-0">
              {visibleOrders.map((order, vIdx) => {
                const globalIndex = startIndex + vIdx;
                const isFocused = globalIndex === focusedIndex;
                return (
                  <div
                    key={order._id || order.orderNumber}
                    className="h-full flex flex-col min-h-0"
                  >
                    <KitchenOrderCard
                      order={order}
                      stationFilter={stationFilter}
                      isFocused={isFocused}
                      onClick={() => {
                        setFocusedIndex(globalIndex);
                        handleSelectOrder(order);
                      }}
                    />
                  </div>
                );
              })}

              {/* Empty placeholder slots */}
              {filteredOrders.length > 0 && visibleOrders.length < visibleCardCount && (
                Array.from({ length: visibleCardCount - visibleOrders.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-2 border-dashed border-neutral-200 rounded-xl"
                  />
                ))
              )}

              {/* If no orders matching filters */}
              {filteredOrders.length === 0 && (
                <div className="col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-4 flex-1 flex flex-col h-full bg-white/70 rounded-xl border-2 border-dashed border-neutral-300 p-6 items-center justify-center text-center text-neutral-400">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-3">
                    🍳
                  </div>
                  <p className="text-[13px] font-800 text-neutral-850 uppercase tracking-wide">Queue Clear</p>
                  <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px]">
                    No active orders.
                  </p>
                </div>
              )}
            </div>

            {/* Right Navigation Arrow */}
            {startIndex + visibleCardCount < filteredOrders.length ? (
              <button
                onClick={() => setStartIndex((prev) => Math.min(filteredOrders.length - visibleCardCount, prev + 1))}
                className="self-center w-8 h-8 md:w-12 md:h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="More orders"
              >
                <ChevronRight size={20} className="stroke-[3]" />
              </button>
            ) : (
              <div className="self-center w-8 h-8 md:w-12 md:h-12 flex-shrink-0" />
            )}
          </>
        )}
      </div>

      {/* Detail Modal Overlay */}
      <KitchenDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={fetchOrders}
        categoryFilter={stationFilter}
      />

      {/* Sidebar Drawer Component */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="kitchen"
        onSelectTab={(tabKey) => {
          if (tabKey === 'orders' || tabKey === 'dashboard' || tabKey === 'sales_summary' || tabKey === 'expense_payout') {
            window.location.href = `/employee/orders?tab=${tabKey}`;
          }
        }}
      />
    </div>
  );
}
