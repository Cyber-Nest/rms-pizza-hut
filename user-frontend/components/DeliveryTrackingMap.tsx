"use client";

import React from "react";
import dynamic from "next/dynamic";

const DeliveryTrackingMapInner = dynamic(
  () => import("./DeliveryTrackingMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[260px] bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center justify-center gap-2 text-neutral-400">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Loading Tracking Map...</span>
      </div>
    ),
  }
);

interface DeliveryTrackingMapProps {
  orderId: string;
  driverInfo: {
    name: string;
    color: string;
    vehicleNumber: string;
  } | null;
  customerCoords: { lat: number; lng: number };
  restaurantCoords: { lat: number; lng: number };
  onDeliveryComplete: () => void;
}

export default function DeliveryTrackingMap(props: DeliveryTrackingMapProps) {
  return <DeliveryTrackingMapInner {...props} />;
}
