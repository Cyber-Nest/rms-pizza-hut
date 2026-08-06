'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DeliveryNavbar from './DeliveryNavbar';
import DispatchPanel from './DispatchPanel';
import VehicleAssignModal from './VehicleAssignModal';
import POSSidebarDrawer from '../../employee-pos/components/POSSidebarDrawer';

import { useDeliveryStore } from '../store/deliveryStore';

// Dynamic import for Leaflet (SSR not supported)
const DeliveryMap = dynamic(() => import('./DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-brand-bg text-neutral-500 text-sm font-medium">
      <div className="w-8 h-8 border-3 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
      <span>Loading Map...</span>
    </div>
  ),
});

export default function DeliveryDispatchDashboard() {
  const fetchOrders = useDeliveryStore((s) => s.fetchOrders);
  const fetchDrivers = useDeliveryStore((s) => s.fetchDrivers);
  const fetchVehicles = useDeliveryStore((s) => s.fetchVehicles);
  const initPusher = useDeliveryStore((s) => s.initPusher);
  const cleanupPusher = useDeliveryStore((s) => s.cleanupPusher);
  const loadRestaurantFromBranch = useDeliveryStore((s) => s.loadRestaurantFromBranch);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Load restaurant name + coords from branch profile (rms_branch localStorage)
    loadRestaurantFromBranch();

    // Initial data fetch
    fetchOrders();
    fetchDrivers();
    fetchVehicles();

    // Start Pusher listeners
    initPusher();

    return () => {
      cleanupPusher();
    };
  }, [fetchOrders, fetchDrivers, fetchVehicles, initPusher, cleanupPusher, loadRestaurantFromBranch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg select-none">
      <DeliveryNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[35%] min-w-[360px] max-w-[480px] flex flex-col border-r border-neutral-200 bg-white overflow-hidden">
          <DispatchPanel />
        </div>
        <div className="flex-1 w-[65%] relative overflow-hidden">
          <DeliveryMap />
        </div>
      </div>
      <VehicleAssignModal />
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="delivery"
        onSelectTab={() => {}}
      />
    </div>
  );
}
