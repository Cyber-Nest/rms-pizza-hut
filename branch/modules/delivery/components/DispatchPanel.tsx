'use client';

import React from 'react';
import { Package, Users, Timer, TrendingUp, Clock, CheckCircle, Truck } from 'lucide-react';
import { useDeliveryStore } from '../store/deliveryStore';
import OrderCard from './OrderCard';
import CarriersPanel from './CarriersPanel';

export default function DispatchPanel() {
  const activeTab = useDeliveryStore((s) => s.activeTab);
  const setActiveTab = useDeliveryStore((s) => s.setActiveTab);
  const activeFilter = useDeliveryStore((s) => s.activeFilter);
  const setActiveFilter = useDeliveryStore((s) => s.setActiveFilter);
  const getFilteredOrders = useDeliveryStore((s) => s.getFilteredOrders);
  const getOrderCounts = useDeliveryStore((s) => s.getOrderCounts);
  const orders = useDeliveryStore((s) => s.orders);

  const [currentTime, setCurrentTime] = React.useState(Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const visibleOrdersList = React.useMemo(() => {
    return orders.filter(o => {
      if (o.orderTiming === 'later' && o.scheduledAt) {
        const schedTime = new Date(o.scheduledAt).getTime();
        if (schedTime - currentTime > 45 * 60 * 1000) {
          return false;
        }
      }
      return true;
    });
  }, [orders, currentTime]);

  const counts = {
    assign: visibleOrdersList.filter((o) => o.status === "assign").length,
    enRoute: visibleOrdersList.filter((o) => o.status === "en-route").length,
    delivered: visibleOrdersList.filter((o) => o.status === "delivered").length,
  };
  
  const filteredOrders = React.useMemo(() => {
    return visibleOrdersList.filter(o => o.status === activeFilter);
  }, [visibleOrdersList, activeFilter]);

  // TA (Turnaround) tab dummy stats
  const deliveredOrders = visibleOrdersList.filter((o) => o.status === 'delivered');
  const avgDeliveryTime = deliveredOrders.length > 0 ? '18 min' : '--';
  const totalDelivered = deliveredOrders.length;
  const enRouteCount = visibleOrdersList.filter((o) => o.status === 'en-route').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-neutral-200 bg-neutral-50 px-1">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 hover:bg-brand-primary/5 border-b-2 border-transparent transition-all cursor-pointer ${
            activeTab === 'orders' ? 'text-brand-primary border-b-brand-primary' : ''
          }`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={15} />
          Orders
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 hover:bg-brand-primary/5 border-b-2 border-transparent transition-all cursor-pointer ${
            activeTab === 'carriers' ? 'text-brand-primary border-b-brand-primary' : ''
          }`}
          onClick={() => setActiveTab('carriers')}
        >
          <Users size={15} />
          Carriers
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 hover:bg-brand-primary/5 border-b-2 border-transparent transition-all cursor-pointer ${
            activeTab === 'ta' ? 'text-brand-primary border-b-brand-primary' : ''
          }`}
          onClick={() => setActiveTab('ta')}
        >
          <Timer size={15} />
          TA
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <>
            {/* Status Filters */}
            <div className="flex gap-1.5 px-3.5 py-3 border-b border-neutral-100">
              <button
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all cursor-pointer ${
                  activeFilter === 'assign'
                    ? 'bg-brand-primary text-white border-brand-primary hover:bg-brand-primary-hover hover:border-brand-primary-hover'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
                }`}
                onClick={() => setActiveFilter('assign')}
              >
                Assign ({counts.assign})
              </button>
              <button
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all cursor-pointer ${
                  activeFilter === 'en-route'
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
                }`}
                onClick={() => setActiveFilter('en-route')}
              >
                En Route ({counts.enRoute})
              </button>
              <button
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all cursor-pointer ${
                  activeFilter === 'delivered'
                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
                }`}
                onClick={() => setActiveFilter('delivered')}
              >
                Delivered ({counts.delivered})
              </button>
            </div>

            {/* Order Cards */}
            <div className="flex-1 overflow-y-auto p-2.5 pb-36 flex flex-col gap-1.5">
              {filteredOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-neutral-400 text-sm py-10">
                  <Package size={36} strokeWidth={1.2} />
                  <p>No {activeFilter} orders</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </>
        )}

        {/* ── CARRIERS TAB ── */}
        {activeTab === 'carriers' && <CarriersPanel />}

        {/* ── TA (Turnaround) TAB ── */}
        {activeTab === 'ta' && (
          <div className="p-3.5 flex flex-col gap-2.5 overflow-y-auto">
            <div className="flex items-center gap-3.5 bg-white border border-neutral-200 rounded-xl p-4 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-neutral-500">Avg. Delivery Time</span>
                <span className="text-xl font-extrabold text-neutral-900 leading-tight tracking-tight">{avgDeliveryTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-3.5 bg-white border border-neutral-200 rounded-xl p-4 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 bg-green-50 text-green-600">
                <CheckCircle size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-neutral-500">Total Delivered</span>
                <span className="text-xl font-extrabold text-neutral-900 leading-tight tracking-tight">{totalDelivered}</span>
              </div>
            </div>
            <div className="flex items-center gap-3.5 bg-white border border-neutral-200 rounded-xl p-4 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 bg-orange-50/70 text-orange-600">
                <Truck size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-neutral-500">Currently En Route</span>
                <span className="text-xl font-extrabold text-neutral-900 leading-tight tracking-tight">{enRouteCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-3.5 bg-white border border-neutral-200 rounded-xl p-4 shadow-xs hover:shadow-sm transition-shadow">
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 bg-brand-primary-light text-brand-primary">
                <TrendingUp size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-neutral-500">Total Orders Today</span>
                <span className="text-xl font-extrabold text-neutral-900 leading-tight tracking-tight">{visibleOrdersList.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
