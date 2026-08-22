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

export default function KitchenDashboard() {
  // ── States ───────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [draftCart, setDraftCart] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing' | 'in_oven' | 'ready'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'takeout' | 'drive-through' | 'dine-in' | 'delivery' | 'online'>('all');
  const [stationFilter, setStationFilter] = useState<'cut_station' | 'make_table' | 'wings_station'>('make_table');
  const [branchMenuItems, setBranchMenuItems] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const ordersRef = useRef(orders);
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
      // Re-fetch all active orders in the background
      fetchOrders();
      // Show visual notification toast
      toast.success(`New Order Received: ${data.orderNumber ? '#' + data.orderNumber : ''}`, {
        duration: 4000,
        position: 'top-right',
        icon: '🍳'
      });
    });

    // Bind to the 'order-updated' event
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
      
      fetchOrders();
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [fetchOrders]);

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

  // Reset startIndex on filter change
  useEffect(() => {
    setStartIndex(0);
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
        if (schedTime - currentTime > 45 * 60 * 1000) {
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

    // Station filtering logic
    const stationFiltered: Order[] = [];
    candidates.forEach((o) => {
      const items = o.items || [];
      const hasPizza = items.some((item: any) => getItemKitchenLabel(item) === 'make_table');

      const mtStatus = o.makeTableStatus || (o.status === 'in_oven' ? 'in_oven' : o.status === 'completed' ? 'completed' : o.status === 'preparing' ? 'preparing' : 'pending');
      const wStatus = o.wingsStatus || (o.status === 'completed' ? 'completed' : o.status === 'ready' ? 'ready' : o.status === 'preparing' ? 'preparing' : 'pending');

      if (stationFilter === 'cut_station') {
        // Cut Station: ONLY show order if it contains Pizza item AND makeTableStatus is "in_oven"
        const isCutStationActive = mtStatus === 'in_oven' || (statusFilter === 'ready' && mtStatus === 'completed');
        if (hasPizza && isCutStationActive) {
          stationFiltered.push(o);
        }
      } else if (stationFilter === 'make_table') {
        // Make Station: Show ONLY Pizza items when makeTableStatus is pending or preparing (removes when in_oven or completed)
        const isMakeTableActive = mtStatus === 'pending' || mtStatus === 'preparing';
        if (isMakeTableActive) {
          const matchingItems = items.filter((item: any) => getItemKitchenLabel(item) === 'make_table');
          if (matchingItems.length > 0) {
            stationFiltered.push({
              ...o,
              items: matchingItems
            });
          }
        }
      } else if (stationFilter === 'wings_station') {
        // Wings Station: Show ONLY Wings items when wingsStatus is NOT completed
        const isWingsActive = wStatus !== 'completed';
        if (isWingsActive) {
          const matchingItems = items.filter((item: any) => getItemKitchenLabel(item) === 'wings_station');
          if (matchingItems.length > 0) {
            stationFiltered.push({
              ...o,
              items: matchingItems
            });
          }
        }
      }
    });

    // Sort strictly by createdAt (oldest first)
    return stationFiltered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, draftCart, statusFilter, typeFilter, stationFilter, currentTime]);

  const visibleOrders = filteredOrders.slice(startIndex, startIndex + 4);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* ── Filter Controls Section (Premium Low-Profile Segmented Controls) ── */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs flex-shrink-0 select-none">
        
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 items-center">
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
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-750 tracking-wide uppercase transition-all duration-150 cursor-pointer border ${
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

        {/* Kitchen Station Segment Bar */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
          {[
            { id: "cut_station", label: "Cut Station"},
            { id: "make_table", label: "Make Station"},
            { id: "wings_station", label: "Wings Station"},
          ].map((stTab) => {
            const active = stationFilter === stTab.id;
            return (
              <button
                key={stTab.id}
                onClick={() => setStationFilter(stTab.id as any)}
                className={`px-3.5 py-1 rounded-lg text-[11px] font-800 tracking-wide uppercase transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "bg-brand-primary text-white shadow-xs font-900"
                    : "text-neutral-700 hover:text-brand-primary hover:bg-white"
                }`}
              >
                {/* <span className="text-[12px]">{stTab.icon}</span> */}
                <span>{stTab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Order Types Segment Bar */}
        <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-200">
          {[
            { id: "all", label: "All Types", count: countAll },
            { id: "takeout", label: "Takeout", count: countTakeout },
            // { id: "drive-through", label: "Drive Thru", count: countDriveThrough },
            { id: "dine-in", label: "Dine In", count: countDineIn },
            { id: "delivery", label: "Delivery", count: countDelivery },
            // { id: "online", label: "Online", count: countOnline },
          ].map((typeTab) => {
            const active = typeFilter === typeTab.id;
            return (
              <button
                key={typeTab.id}
                onClick={() => setTypeFilter(typeTab.id as any)}
                className={`px-3 py-1 rounded-lg text-[10px] font-700 tracking-wide uppercase transition-all duration-150 cursor-pointer ${
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

      {/* ── Main Dashboard Cards Row with pagination arrows (height constrained to fill screen) ── */}
      <div className="flex-1 p-6 flex items-stretch justify-center gap-4 min-h-0 bg-brand-bg select-none">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute w-12 h-12 rounded-full border-4 border-brand-primary/10 animate-ping duration-1000" />
              {/* Inner spinning gradient ring */}
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
                className="self-center w-12 h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Previous orders"
              >
                <ChevronLeft size={24} className="stroke-[3]" />
              </button>
            ) : (
              // Invisible spacer of the same size to keep the cards centered when left button is absent
              <div className="self-center w-12 h-12 flex-shrink-0" />
            )}

            {/* Grid of 4 Cards */}
            <div className="flex-1 h-full grid grid-cols-4 gap-6 items-stretch justify-start min-h-0">
              {visibleOrders.map((order) => (
                <div
                  key={order._id || order.orderNumber}
                  className="h-full flex flex-col min-h-0"
                >
                  <KitchenOrderCard
                    order={order}
                    stationFilter={stationFilter}
                    onClick={() => handleSelectOrder(order)}
                  />
                </div>
              ))}

              {/* Empty outlines for remaining slots in the 4-column layout */}
              {filteredOrders.length > 0 && visibleOrders.length < 4 && (
                Array.from({ length: 4 - visibleOrders.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-2 border-dashed border-neutral-200 rounded-xl"
                  />
                ))
              )}

              {/* If no orders matching filters */}
              {filteredOrders.length === 0 && (
                <div className="col-span-4 flex-1 flex flex-col h-full bg-white/70 rounded-xl border-2 border-dashed border-neutral-300 p-6 items-center justify-center text-center text-neutral-400">
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
            {startIndex + 4 < filteredOrders.length ? (
              <button
                onClick={() => setStartIndex((prev) => Math.min(filteredOrders.length - 4, prev + 1))}
                className="self-center w-12 h-12 flex-shrink-0 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-brand-primary border border-neutral-200 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="More orders"
              >
                <ChevronRight size={24} className="stroke-[3]" />
              </button>
            ) : (
              // Invisible spacer of the same size to keep the cards centered when right button is absent
              <div className="self-center w-12 h-12 flex-shrink-0" />
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
