"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getPusherClient } from "../lib/pusher";
import { LocateFixed, Navigation, MapPin, Phone, Plus, Minus, Maximize2, Minimize2 } from "lucide-react";

// --- Map Interaction Tracker ---
interface MapEventTrackerProps {
  onInteraction: () => void;
}

function MapEventTracker({ onInteraction }: MapEventTrackerProps) {
  useMapEvents({
    dragstart: onInteraction,
    zoomstart: onInteraction,
  });
  return null;
}

// --- Geolocation Helpers ---
const toRad = (value: number) => (value * Math.PI) / 180;
const toDeg = (value: number) => (value * 180) / Math.PI;

const getDistanceMeters = (
  pos1: { lat: number; lng: number },
  pos2: { lat: number; lng: number },
) => {
  const R = 6371000;
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) *
      Math.cos(toRad(pos2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getBearing = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) => {
  const dLng = toRad(to.lng - from.lng);
  const fromLatRad = toRad(from.lat);
  const toLatRad = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// --- Custom Icons ---
function createDriverIcon(color: string, bearing: number) {
  const size = 38;
  const glowSize = size + 16;
  const html = `
    <div style="width: ${glowSize}px; height: ${glowSize}px; position: relative;">
      <div style="
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 2px solid ${color};
        opacity: 0.5;
        animation: driverPulse 2s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: white;
        border: 2.5px solid ${color};
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="
          width: 90%; height: 90%;
          border-radius: 50%;
          background: ${color};
          display: flex; align-items: center; justify-content: center;
        ">
          <img src="/car1.png" style="width: 105%; height: 105%; object-fit: contain;" />
        </div>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [glowSize, glowSize],
    iconAnchor: [glowSize / 2, glowSize / 2],
    className: "",
  });
}

function createPinIcon(color: string, label: string) {
  const html = `
    <div style="width: 32px; height: 42px; position: relative;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 40 50">
        <path d="M20 0C9 0 0 9 0 20c0 14 20 30 20 30s20-16 20-30C40 9 31 0 20 0z" fill="${color}" stroke="white" stroke-width="2.5"/>
        <text x="20" y="24" fill="white" font-size="11" font-weight="900" text-anchor="middle" font-family="sans-serif">${label}</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    className: "",
  });
}

// --- Map Bounds & Follow Controller ---
interface BoundsControllerProps {
  driverPos: [number, number] | null;
  customerCoords: { lat: number; lng: number };
  restaurantCoords: { lat: number; lng: number };
  autoFollow: boolean;
}

function BoundsController({
  driverPos,
  customerCoords,
  restaurantCoords,
  autoFollow,
}: BoundsControllerProps) {
  const map = useMap();
  const initRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    if (!initRef.current) {
      // First fit bounds to restaurant and customer
      const bounds = L.latLngBounds([
        [restaurantCoords.lat, restaurantCoords.lng],
        [customerCoords.lat, customerCoords.lng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
      initRef.current = true;
    } else if (autoFollow && driverPos) {
      // Auto follow driver
      map.panTo(driverPos, { animate: true, duration: 1 });
    }
  }, [map, driverPos, autoFollow, customerCoords, restaurantCoords]);

  return null;
}

// Sub-component to fix Leaflet map grey area bug when container resizes
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Invalidate size after animation finishes
    const timerId = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timerId);
  }, [map]);
  return null;
}

// --- Main Map Component ---
interface DeliveryTrackingMapInnerProps {
  orderId: string;
  driverInfo: any;
  customerCoords: { lat: number; lng: number };
  restaurantCoords: { lat: number; lng: number };
  onDeliveryComplete: () => void;
}

export default function DeliveryTrackingMapInner({
  orderId,
  driverInfo,
  customerCoords,
  restaurantCoords,
  onDeliveryComplete,
}: DeliveryTrackingMapInnerProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [bearing, setBearing] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [freshness, setFreshness] = useState<"live" | "updating" | "offline">(
    "updating",
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleRecenterOrFollow = () => {
    setAutoFollow(true);
    if (mapRef.current) {
      if (driverPos) {
        mapRef.current.panTo(driverPos, { animate: true, duration: 1 });
      } else {
        const bounds = L.latLngBounds([
          [restaurantCoords.lat, restaurantCoords.lng],
          [customerCoords.lat, customerCoords.lng],
        ]);
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const prevPosRef = useRef<[number, number] | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());

  // Pusher setup for real-time tracking via client events (browser-to-browser)
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-order-${orderId}`);

    // Listen for driver location (client events or server-relay fallback)
    const handleDriverLocation = (data: any) => {
      const targetLat = data.lat;
      const targetLng = data.lng;

      setLastUpdate(Date.now());
      setBearing(data.bearing || 0);

      // Cancel any active interpolation animation to prevent concurrent frame fighting
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // ─── Adaptive animation duration ───
      const now = Date.now();
      const timeSinceLast = now - lastEventTimeRef.current;
      lastEventTimeRef.current = now;
      // Fill 85% of the gap between events — no freeze zone
      // Clamp between 1s min and 8s max for safety
      const duration = Math.max(1000, Math.min(timeSinceLast * 0.85, 8000));

      // Interpolate transition
      const fromLat = prevPosRef.current ? prevPosRef.current[0] : targetLat;
      const fromLng = prevPosRef.current ? prevPosRef.current[1] : targetLng;

      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Linear easing for steady, constant-speed movement
        const lat = fromLat + (targetLat - fromLat) * progress;
        const lng = fromLng + (targetLng - fromLng) * progress;

        setDriverPos([lat, lng]);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          prevPosRef.current = [targetLat, targetLng];
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    channel.bind("client-driver-location", handleDriverLocation);

    // Listen for server status triggers
    channel.bind("delivery-status-update", (data: any) => {
      if (data.status === "delivered") {
        onDeliveryComplete();
      }
    });

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      channel.unbind_all();
      pusher.unsubscribe(`private-order-${orderId}`);
    };
  }, [orderId, onDeliveryComplete]);

  // Track location freshness (green/yellow/red status)
  useEffect(() => {
    if (!lastUpdate) return;

    const interval = setInterval(() => {
      const diff = Date.now() - lastUpdate;
      if (diff < 30000) {
        setFreshness("live");
      } else if (diff < 120000) {
        setFreshness("updating");
      } else {
        setFreshness("offline");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  const mapCenter: [number, number] = [
    (restaurantCoords.lat + customerCoords.lat) / 2,
    (restaurantCoords.lng + customerCoords.lng) / 2,
  ];

  const driverIcon = createDriverIcon(driverInfo?.color || "#3B82F6", bearing);
  const restaurantIcon = createPinIcon("#8a1538", "Store");
  const customerIcon = createPinIcon("#16A34A", "You");

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-neutral-100">
      <MapContainer
        center={mapCenter}
        zoom={13}
        zoomControl={false}
        className="w-full h-full z-10"
        ref={mapRef}
      >
        <MapResizer />
        <MapEventTracker onInteraction={() => setAutoFollow(false)} />
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}"
          maxZoom={20}
        />

        <BoundsController
          driverPos={driverPos}
          customerCoords={customerCoords}
          restaurantCoords={restaurantCoords}
          autoFollow={autoFollow}
        />

        {/* Restaurant Pin */}
        <Marker
          position={[restaurantCoords.lat, restaurantCoords.lng]}
          icon={restaurantIcon}
        />

        {/* Customer Address Pin */}
        <Marker
          position={[customerCoords.lat, customerCoords.lng]}
          icon={customerIcon}
        />

        {/* Driver Live Marker */}
        {driverPos && <Marker position={driverPos} icon={driverIcon} />}
      </MapContainer>

      {/* ─── Map Control Buttons Stack (Top Right) ─── */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-950 hover:shadow-md active:scale-95 transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Zoom in"
        >
          <Plus size={18} className="sm:size-4" strokeWidth={2.5} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-950 hover:shadow-md active:scale-95 transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Zoom out"
        >
          <Minus size={18} className="sm:size-4" strokeWidth={2.5} />
        </button>
        <div className="h-0.5" />
        <button
          onClick={handleRecenterOrFollow}
          className={`relative w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-950 hover:shadow-md active:scale-95 transition-all cursor-pointer border shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
            !autoFollow && driverPos
              ? "border-amber-500/80 text-amber-600 bg-amber-50/90"
              : "border-neutral-200/80"
          }`}
          title={!autoFollow ? "Enable driver follow" : "Recenter map"}
        >
          <LocateFixed size={18} className="sm:size-4" strokeWidth={2.5} />
          {!autoFollow && driverPos && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white animate-pulse" />
          )}
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-950 hover:shadow-md active:scale-95 transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Toggle fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 size={18} className="sm:size-4" strokeWidth={2.5} />
          ) : (
            <Maximize2 size={18} className="sm:size-4" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Driver info overlay (bottom sheet on mobile, card on desktop) */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-30 bg-white/95 backdrop-blur-md border border-neutral-200/50 p-3.5 rounded-2xl shadow-xl flex items-center gap-3 sm:min-w-[280px]">
        <div
          className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
          style={{ backgroundColor: driverInfo?.color || "#8a1538" }}
        >
          <Navigation size={15} className="rotate-45" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-extrabold text-neutral-800 leading-tight truncate">
            {driverInfo?.name || "Driver Assigned"}
          </h4>
          <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide truncate block">
            {driverInfo?.vehicleNumber
              ? `Vehicle #${driverInfo.vehicleNumber}`
              : "En Route"}
          </span>
        </div>

        {driverInfo?.phone && (
          <a
            href={`tel:${driverInfo.phone}`}
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-sm shrink-0"
            title="Call Driver"
          >
            <Phone size={15} />
          </a>
        )}

        {/* Freshness Status Indicator */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-neutral-100">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                freshness === "live"
                  ? "bg-emerald-400"
                  : freshness === "updating"
                    ? "bg-amber-400"
                    : "bg-red-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                freshness === "live"
                  ? "bg-emerald-500"
                  : freshness === "updating"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            ></span>
          </span>
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
            {freshness === "live"
              ? "Live"
              : freshness === "updating"
                ? "Buffering"
                : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}
