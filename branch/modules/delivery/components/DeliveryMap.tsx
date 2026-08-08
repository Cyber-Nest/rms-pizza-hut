"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import { useDeliveryStore } from "../store/deliveryStore";
import {
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  LocateFixed,
  Truck,
  MapPin,
  Package,
  Navigation,
  Car,
} from "lucide-react";

// ─── Fix default marker icons for webpack/next.js ───
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// ─── Custom SVG Icons ───
function createDriverIcon(
  color: string,
  bearing: number = 0,
  isReturning: boolean = false,
) {
  const size = 40;
  const glowSize = size + 16;
  const pulseColor = isReturning ? "#8B5CF6" : color;
  const borderStyle = isReturning ? "dashed" : "solid";

  const html = `
    <div class="driver-marker-wrapper" style="width: ${glowSize}px; height: ${glowSize}px; position: relative;">
      <!-- Animated pulse ring -->
      <div class="driver-pulse-ring" style="
        position: absolute; inset: 0;
        border-radius: 50%;
        border: 2px ${borderStyle} ${pulseColor};
        opacity: 0.5;
        animation: driverPulse 2s ease-out infinite;
      "></div>
      <!-- Main icon circle -->
      <div style="
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: white;
        border: 3px solid ${color};
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
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
    popupAnchor: [0, -(glowSize / 2)],
    className: "",
  });
}

function createRestaurantIcon() {
  const html = `
    <div class="restaurant-marker-enhanced" style="width: 48px; height: 58px; position: relative; filter: drop-shadow(0 6px 16px rgba(227,24,55,0.25));">
      <!-- Pulsing glow beneath -->
      <div style="
        position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
        width: 24px; height: 8px;
        background: radial-gradient(ellipse, rgba(227,24,55,0.3) 0%, transparent 70%);
        animation: restaurantGlow 2s ease-in-out infinite;
      "></div>
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58" style="width: 100%; height: 100%;">
        <!-- Gradient defs -->
        <defs>
          <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#a91d47"/>
            <stop offset="100%" style="stop-color:#e31837"/>
          </linearGradient>
          <filter id="pinShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/>
          </filter>
        </defs>
        <!-- Pin Shape -->
        <path d="M24 0C10.7 0 0 10.7 0 24c0 18 24 34 24 34s24-16 24-34C48 10.7 37.3 0 24 0z" fill="url(#pinGrad)" stroke="white" stroke-width="2.5" filter="url(#pinShadow)"/>
        <!-- Inner glow circle -->
        <circle cx="24" cy="22" r="14" fill="rgba(255,255,255,0.15)"/>
        <!-- Store Icon -->
        <g transform="translate(12, 12) scale(1)" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
        </g>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [48, 58],
    iconAnchor: [24, 58],
    popupAnchor: [0, -58],
    className: "",
  });
}

function createDeliveryIcon(
  orderNumber: string,
  isSelected: boolean = false,
  driverColor?: string,
) {
  const digits = orderNumber.replace(/\D/g, "") || orderNumber;
  const size = isSelected ? 44 : 38;
  const color = driverColor || "#16A34A"; // default green if no driver is assigned

  const html = `
    <div style="width: ${size}px; height: ${size + 10}px; position: relative; filter: drop-shadow(0 4px 10px ${color}40);">
      ${
        isSelected
          ? `<div style="
        position: absolute; inset: -6px; border-radius: 50%;
        border: 2.5px solid ${color};
        opacity: 0.5;
        animation: driverPulse 1.5s ease-out infinite;
      "></div>`
          : ""
      }
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 40 50" style="width: 100%; height: 100%;">
        <path d="M20 0C9 0 0 9 0 20c0 14 20 30 20 30s20-16 20-30C40 9 31 0 20 0z" fill="${color}" stroke="white" stroke-width="2.5"/>
        <text x="20" y="24" fill="white" font-size="12" font-weight="900" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" letter-spacing="-0.03em">${digits}</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 10)],
    className: "",
  });
}

// ─── Map Auto-Fit Component ───
function MapBoundsUpdater() {
  const map = useMap();
  const drivers = useDeliveryStore((s) => s.drivers);
  const orders = useDeliveryStore((s) => s.orders);
  const restaurantLocation = useDeliveryStore((s) => s.restaurantLocation);
  const selectedOrderId = useDeliveryStore((s) => s.selectedOrderId);
  const selectedDriverId = useDeliveryStore((s) => s.selectedDriverId);
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    // If an order is newly selected, zoom to it
    if (selectedOrderId && selectedOrderId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedOrderId;
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order) {
        const points: L.LatLngExpression[] = [
          [order.coordinates.lat, order.coordinates.lng],
        ];
        // Also include driver if assigned
        if (order.assignedDriverId) {
          const driver = drivers.find((d) => d.id === order.assignedDriverId);
          if (driver && driver.currentLocation?.lat) {
            points.push([
              driver.currentLocation.lat,
              driver.currentLocation.lng,
            ]);
          }
        }
        // Include restaurant (if valid coordinates configured)
        if (
          restaurantLocation.coordinates.lat &&
          restaurantLocation.coordinates.lng
        ) {
          points.push([
            restaurantLocation.coordinates.lat,
            restaurantLocation.coordinates.lng,
          ]);
        }

        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
      return;
    }

    if (!selectedOrderId) {
      prevSelectedRef.current = null;
    }
  }, [
    selectedOrderId,
    selectedDriverId,
    map,
    orders,
    drivers,
    restaurantLocation,
  ]);

  return null;
}

// ─── Animated Driver Marker ───
interface AnimatedDriverMarkerProps {
  driver: any;
}

function AnimatedDriverMarker({ driver }: AnimatedDriverMarkerProps) {
  const [pos, setPos] = useState<[number, number]>([
    driver.currentLocation?.lat || 22.1818,
    driver.currentLocation?.lng || 78.7618,
  ]);
  const prevPosRef = useRef<[number, number]>([
    driver.currentLocation?.lat || 22.1818,
    driver.currentLocation?.lng || 78.7618,
  ]);
  const lastAnimStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const targetLat = driver.currentLocation?.lat || 22.1818;
    const targetLng = driver.currentLocation?.lng || 78.7618;

    if (!targetLat || !targetLng) return;

    const fromLat = prevPosRef.current[0];
    const fromLng = prevPosRef.current[1];

    // Skip animation if position hasn't changed (stationary driver)
    if (
      Math.abs(targetLat - fromLat) < 0.000001 &&
      Math.abs(targetLng - fromLng) < 0.000001
    ) {
      return;
    }

    // ─── Adaptive animation duration ───
    // Calculate how long since the last event, then fill 85% of that gap with animation.
    const now = Date.now();
    const timeSinceLast = now - lastAnimStartRef.current;
    lastAnimStartRef.current = now;

    // Clamp between 1s min and 8s max for safety
    const duration = Math.max(1000, Math.min(timeSinceLast * 0.85, 8000));

    let animationFrameId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear easing for steady, constant-speed movement (like Google Maps)
      const lat = fromLat + (targetLat - fromLat) * progress;
      const lng = fromLng + (targetLng - fromLng) * progress;

      setPos([lat, lng]);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        prevPosRef.current = [targetLat, targetLng];
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [driver.currentLocation.lat, driver.currentLocation.lng]);

  let carColor = "#16A34A"; // Green (Available)
  if (driver.status === "on-delivery") {
    carColor = "#DC2626"; // Red
  } else if (driver.status === "returning") {
    carColor = "#EA580C"; // Orange
  }

  const icon = createDriverIcon(
    carColor,
    driver.bearing || 0,
    driver.status === "returning",
  );

  return (
    <Marker position={pos} icon={icon}>
      <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
        <div className="font-semibold text-xs px-1">
          {driver.name} {driver.driverId ? `(#${driver.driverId})` : ""}
        </div>
      </Tooltip>
      <Popup className="delivery-popup">
        <div className="flex flex-col gap-1.5 p-3 px-4 min-w-[180px]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full border border-white flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: carColor }}
            >
              <Car size={14} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <strong className="text-[13px] font-bold text-neutral-900">
                {driver.name} {driver.driverId ? `(#${driver.driverId})` : ""}
              </strong>
              <span className="text-[10.5px] text-neutral-500 font-medium">
                {driver.status === "on-delivery"
                  ? `Delivering • ${driver.activeOrders?.length || 0} order(s)`
                  : driver.status === "returning"
                    ? "Returning to base"
                    : "● Available"}
              </span>
            </div>
          </div>
          {driver.assignedVehicle && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
                🚗 Vehicle #{driver.assignedVehicle.number}
              </span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Main Map Component ───
export default function DeliveryMap() {
  const drivers = useDeliveryStore((s) => s.drivers);
  const orders = useDeliveryStore((s) => s.orders);
  const restaurantLocation = useDeliveryStore((s) => s.restaurantLocation);
  const selectedOrderId = useDeliveryStore((s) => s.selectedOrderId);
  const selectOrder = useDeliveryStore((s) => s.selectOrder);
  const mapRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const visibleOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (o.orderTiming === "later" && o.scheduledAt) {
        const schedTime = new Date(o.scheduledAt).getTime();
        if (schedTime - currentTime > 45 * 60 * 1000) {
          return false;
        }
      }
      return true;
    });
  }, [orders, currentTime]);

  // Active orders (en-route)
  const enRouteOrders = visibleOrders.filter((o) => o.status === "en-route");
  const assignCount = visibleOrders.filter((o) => o.status === "assign").length;

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const center: [number, number] = [
    restaurantLocation.coordinates.lat && restaurantLocation.coordinates.lat !== 0
      ? restaurantLocation.coordinates.lat
      : 22.1818,
    restaurantLocation.coordinates.lng && restaurantLocation.coordinates.lng !== 0
      ? restaurantLocation.coordinates.lng
      : 78.7618,
  ];

  // Get active drivers (checked in today AND online/on-duty)
  const activeDrivers = drivers.filter(
    (d) =>
      Boolean(d.posCheckedIn) &&
      (d.status === "on-delivery" ||
        d.status === "available" ||
        d.status === "returning"),
  );

  // Apply radial offset to prevent overlapping markers at the restaurant or identical coordinates
  const jitteredDrivers = React.useMemo(() => {
    const enriched = activeDrivers
      .filter(
        (d) =>
          (d.currentLocation && d.currentLocation.lat) ||
          d.status === "available",
      )
      .map((driver) => ({
        ...driver,
        currentLocation:
          driver.currentLocation && driver.currentLocation.lat
            ? driver.currentLocation
            : {
                lat: restaurantLocation.coordinates.lat || 0,
                lng: restaurantLocation.coordinates.lng || 0,
              },
      }));

    const coordinateGroups: { [key: string]: typeof enriched } = {};
    enriched.forEach((driver) => {
      const lat = driver.currentLocation.lat || 0;
      const lng = driver.currentLocation.lng || 0;
      const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
      if (!coordinateGroups[key]) {
        coordinateGroups[key] = [];
      }
      coordinateGroups[key].push(driver);
    });

    return enriched.map((driver) => {
      const lat = driver.currentLocation.lat || 0;
      const lng = driver.currentLocation.lng || 0;
      const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
      const group = coordinateGroups[key];

      if (group.length > 1) {
        const index = group.findIndex(
          (d) => (d.id || d._id) === (driver.id || driver._id),
        );
        const angle = ((2 * Math.PI) / group.length) * index;
        const radius = 0.00015; // Shift by ~15 meters in a circle to de-overlap
        return {
          ...driver,
          currentLocation: {
            lat: lat + radius * Math.sin(angle),
            lng: lng + radius * Math.cos(angle),
          },
        };
      }
      return driver;
    });
  }, [activeDrivers, restaurantLocation.coordinates]);

  // Build polylines (driver → delivery destination OR driver → restaurant)
  const polylines = [
    // 1. Delivery active paths
    ...enRouteOrders.map((order) => {
      const driver = drivers.find(
        (d) =>
          d.id === order.assignedDriverId || d._id === order.assignedDriverId,
      );
      if (!driver || !driver.currentLocation?.lat) return null;

      const positions: [number, number][] = [
        [driver.currentLocation.lat, driver.currentLocation.lng],
        [order.coordinates.lat, order.coordinates.lng],
      ];

      return {
        id: order.id,
        positions,
        color: "#DC2626", // Red for active paths
        isReturning: false,
      };
    }),
    // 2. Returning paths (orange dashed lines back to restaurant)
    ...drivers
      .filter((d) => d.status === "returning")
      .map((driver) => {
        if (!driver.currentLocation?.lat) return null;
        return {
          id: `returning-${driver.id}`,
          positions: [
            [driver.currentLocation.lat, driver.currentLocation.lng] as [
              number,
              number,
            ],
            [
              restaurantLocation.coordinates.lat,
              restaurantLocation.coordinates.lng,
            ] as [number, number],
          ],
          color: "#EA580C", // Orange line for returning
          isReturning: true,
        };
      }),
  ].filter(Boolean);

  // Delivery destination markers
  const deliveryMarkers = visibleOrders.filter(
    (o) =>
      o.status === "en-route" ||
      o.status === "assign" ||
      (o.status === "delivered" && selectedOrderId === o.id),
  );

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.flyTo(center, 13, { duration: 0.8 });
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ background: "#f8fafc" }}
    >
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full z-[1]"
        zoomControl={false}
        ref={mapRef}
      >
        {/* Google Maps HD Crisp Roadmap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
        <MapBoundsUpdater />

        {restaurantLocation.coordinates.lat &&
          restaurantLocation.coordinates.lng &&
          !(
            restaurantLocation.coordinates.lat === 0 &&
            restaurantLocation.coordinates.lng === 0
          ) && (
            <Marker
              position={[
                restaurantLocation.coordinates.lat,
                restaurantLocation.coordinates.lng,
              ]}
              icon={createRestaurantIcon()}
            >
              <Popup className="delivery-popup">
                <div className="flex flex-col gap-1.5 p-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-primary/15 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#e31837"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                        <path d="M2 7h20" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <strong className="text-[13px] font-bold text-neutral-900">
                        {restaurantLocation.name}
                      </strong>
                      <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                        Base Station
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

        {/* Driver Markers */}
        {jitteredDrivers.map((driver) => (
          <AnimatedDriverMarker key={driver.id || driver._id} driver={driver} />
        ))}

        {/* Delivery Destination Markers */}
        {deliveryMarkers.map((order) => {
          const getOrderPinColor = () => {
            if (order.status === "delivered") {
              return "#059669"; // Emerald Green for Delivered Order Pin
            }
            if (order.status === "en-route") {
              return "#2563EB"; // Blue for En-Route Order Pin
            }
            let elapsedMins = 0;
            if (order.orderTiming === "later" && order.scheduledAt) {
              const showUpTime =
                new Date(order.scheduledAt).getTime() - 45 * 60000;
              elapsedMins = Math.floor((Date.now() - showUpTime) / 60000);
            } else {
              const start = order.createdAt
                ? new Date(order.createdAt).getTime()
                : Date.now();
              elapsedMins = Math.floor((Date.now() - start) / 60000);
            }
            if (elapsedMins >= 20) {
              return "#DC2626"; // Red if >= 20 mins
            }
            return order.orderTiming === "later" ? "#262626" : "#16A34A"; // Black for scheduled, Green for instant
          };
          const pinColor = getOrderPinColor();

          return (
            <Marker
              key={order.id}
              position={[order.coordinates.lat, order.coordinates.lng]}
              icon={createDeliveryIcon(
                order.orderNumber,
                selectedOrderId === order.id,
                pinColor,
              )}
              eventHandlers={{
                click: () => selectOrder(order.id),
              }}
            >
              <Popup className="delivery-popup">
                <div className="flex flex-col gap-1 p-3 px-4 min-w-[200px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <strong className="text-[13px] font-bold text-neutral-900">
                      {order.orderNumber}
                    </strong>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        order.status === "delivered"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : order.status === "en-route"
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}
                    >
                      {order.status === "delivered"
                        ? "Delivered"
                        : order.status === "en-route"
                        ? "En Route"
                        : "Pending"}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-600 leading-snug">
                    {order.deliveryAddress}
                  </span>
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-neutral-100">
                    <span className="text-[11px] text-neutral-500">
                      {order.customerName}
                    </span>
                    <span className="text-[11.5px] font-bold text-neutral-800">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polylines commented out  */}
        {/*polylines.map(
          (line) =>
            line && (
              <React.Fragment key={line.id}>
                <Polyline
                  positions={line.positions}
                  pathOptions={{
                    color: line.color,
                    weight: 8,
                    opacity: 0.15,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={line.positions}
                  pathOptions={{
                    color: line.color,
                    weight: 3.5,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </React.Fragment>
            )
        )
        */}
      </MapContainer>

      {/* ─── Map Zoom Controls (Right Side) ─── */}
      <div className="absolute top-4 right-4 z-[10] flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-950 hover:shadow-md transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Zoom in"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-955 hover:shadow-md transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Zoom out"
        >
          <Minus size={16} strokeWidth={2.5} />
        </button>
        <div className="h-1" />
        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-955 hover:shadow-md transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Recenter map"
        >
          <LocateFixed size={15} strokeWidth={2.5} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md text-neutral-700 flex items-center justify-center hover:bg-white hover:text-neutral-955 hover:shadow-md transition-all cursor-pointer border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          title="Toggle fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 size={15} strokeWidth={2.5} />
          ) : (
            <Maximize2 size={15} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* ─── Live Status Bar (Top Left) ─── */}
      <div className="absolute top-4 left-4 z-[10] flex items-center gap-2">
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md rounded-xl px-4 py-2.5 border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-bold text-neutral-800">LIVE</span>
          </div>
          <div className="w-px h-4 bg-neutral-200" />
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
            <Navigation size={11} className="text-blue-500" />
            <span className="font-bold text-neutral-800">
              {enRouteOrders.length}
            </span>
            <span>En Route</span>
          </div>
          <div className="w-px h-4 bg-neutral-200" />
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
            <Package size={11} className="text-amber-500" />
            <span className="font-bold text-neutral-800">{assignCount}</span>
            <span>Pending</span>
          </div>
        </div>
      </div>

      {/* ─── Glassmorphic Map Legend (Bottom Left) ─── */}
      <div className="absolute bottom-5 left-5 z-[10] map-legend-glass">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-3.5 px-4.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-neutral-200/80 min-w-[175px]">
          {/* Legend Header */}
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.15em] mb-2.5 pb-2 border-b border-neutral-100 flex items-center gap-1.5">
            <MapPin size={9} />
            Legend
          </div>

          {/* Restaurant */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-primary to-[#6b0f28] flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                <path d="M2 7h20" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-neutral-700">
              {restaurantLocation.name}
            </span>
          </div>

          {/* Drivers */}
          {activeDrivers.map((driver) => {
            let driverStatusColor = "#16A34A"; // Green (Available)
            if (driver.status === "on-delivery") {
              driverStatusColor = "#DC2626"; // Red
            } else if (driver.status === "returning") {
              driverStatusColor = "#EA580C"; // Orange
            }

            return (
              <div key={driver.id} className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm border border-white"
                  style={{ backgroundColor: driverStatusColor }}
                >
                  <Car size={10} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-neutral-700">
                  {driver.name} {driver.driverId ? `(#${driver.driverId})` : ""}
                </span>
              </div>
            );
          })}

          {/* Delivery Points */}
          <div className="flex items-center gap-2.5 mt-1 pt-1.5 border-t border-neutral-100">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-neutral-700">
              Delivery Points
            </span>
          </div>
        </div>
      </div>

      {/* ─── Active Deliveries Count Badge (Bottom Right) ─── */}
      <div className="absolute bottom-1 right-1 z-[10]">
        <div className="bg-white/90 backdrop-blur-md rounded-xl px-3.5 py-2 border border-neutral-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center gap-2">
          <Truck size={14} className="text-brand-primary" />
          <span className="text-[11px] font-bold text-neutral-700">
            {activeDrivers.filter((d) => d.status === "on-delivery").length}{" "}
            Driver
            {activeDrivers.filter((d) => d.status === "on-delivery").length !==
            1
              ? "s"
              : ""}{" "}
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
