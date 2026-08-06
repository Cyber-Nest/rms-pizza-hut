"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Flame,
  MapPin,
  Store,
  ThumbsUp,
  XCircle,
  ChevronRight,
  Phone,
  RotateCw,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import DeliveryTrackingMap from "./DeliveryTrackingMap";
import { getPusherClient } from "../lib/pusher";

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Order payload/document
  selectedBranch?: any;
  onDismiss: () => void;
  autoOpenMap?: boolean;
}

type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export default function OrderStatusModal({
  isOpen,
  onClose,
  order,
  selectedBranch,
  onDismiss,
  autoOpenMap = false,
}: OrderStatusModalProps) {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>("pending");
  const [liveOrder, setLiveOrder] = useState<any>(order);
  const [isSimulated, setIsSimulated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [showFullScreenMap, setShowFullScreenMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [restaurantCoords, setRestaurantCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Geolocation error in user-frontend:", err)
      );
    }
  }, []);

  // Fetch restaurant branch GPS coordinates for map tracking
  useEffect(() => {
    const branchObj = selectedBranch || (typeof liveOrder?.branchId === "object" ? liveOrder.branchId : null);
    if (branchObj?.settings?.mainSettings?.latitude && branchObj?.settings?.mainSettings?.longitude) {
      const lat = Number(branchObj.settings.mainSettings.latitude);
      const lng = Number(branchObj.settings.mainSettings.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        setRestaurantCoords({ lat, lng });
        return;
      }
    }
    if (branchObj?.lat && branchObj?.lng) {
      const lat = Number(branchObj.lat);
      const lng = Number(branchObj.lng);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        setRestaurantCoords({ lat, lng });
        return;
      }
    }

    const bId = branchObj?._id || branchObj?.id || (typeof liveOrder?.branchId === "string" ? liveOrder.branchId : null);
    if (bId) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      axios.get(`${apiUrl}/branches/settings`, { params: { branchId: bId } })
        .then((res) => {
          if (res.data.success && res.data.data?.mainSettings) {
            const ms = res.data.data.mainSettings;
            const lat = Number(ms.latitude);
            const lng = Number(ms.longitude);
            if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
              setRestaurantCoords({ lat, lng });
            }
          }
        })
        .catch((err) => console.warn("Could not fetch branch coords for OrderStatusModal:", err));
    }
  }, [selectedBranch, liveOrder?.branchId]);

  // Sync state with order prop
  useEffect(() => {
    if (order) {
      setLiveOrder(order);
      setCurrentStatus(order.status || "pending");
    }
  }, [order]);

  // Handle autoOpenMap when driver assignment and order status are loaded
  useEffect(() => {
    if (
      isOpen &&
      autoOpenMap &&
      liveOrder?.orderType === "delivery" &&
      driverInfo?.assigned &&
      currentStatus === "ready"
    ) {
      setShowFullScreenMap(true);
    }
  }, [isOpen, autoOpenMap, liveOrder, driverInfo, currentStatus]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fetch status once on mount/open
  useEffect(() => {
    const orderId = order?._id || order?.id;
    if (isOpen && orderId) {
      const isMock = String(orderId).startsWith("mock-");

      if (!isMock) {
        const fetchOnce = async () => {
          try {
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await axios.get(`${apiUrl}/orders/${orderId}`);
            if (res.data.success && res.data.data) {
              setLiveOrder(res.data.data);
              setCurrentStatus(res.data.data.status);
            }
          } catch (err) {
            console.warn("Initial status check failed:", err);
          }
        };
        fetchOnce();

        // Fetch driver details if it's a delivery order
        if (order?.orderType === "delivery") {
          const fetchDriver = async () => {
            try {
              const apiUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
              const res = await axios.get(
                `${apiUrl}/delivery/track/${orderId}`,
              );
              if (res.data.success && res.data.data) {
                setDriverInfo(res.data.data);
              }
            } catch (err) {
              console.warn("Driver tracking fetch failed:", err);
            }
          };
          fetchDriver();
        }
      } else if (isMock) {
        setIsSimulated(true);
      }
    }
  }, [isOpen, order?._id, order?.id, order?.orderType]);

  // Pusher subscription for real-time status and driver updates
  useEffect(() => {
    const orderId = order?._id || order?.id;
    if (!isOpen || !orderId || String(orderId).startsWith('mock-')) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-order-${orderId}`);

    // Listen for order updates (status, kitchenCleared, etc.)
    channel.bind("order-updated", (data: any) => {
      console.log("Real-time order status update received via Pusher:", data);
      if (data.status) {
        setCurrentStatus(data.status);
      }
      setLiveOrder((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: data.status ?? prev.status,
          kitchenCleared: data.kitchenCleared ?? prev.kitchenCleared,
          receptionCompleted: data.receptionCompleted ?? prev.receptionCompleted,
        };
      });
    });

    // Listen for driver assignments
    channel.bind("delivery-assigned", (data: any) => {
      console.log("Real-time driver assigned update received via Pusher:", data);
      setDriverInfo({
        assigned: true,
        assignmentId: data.assignmentId || null,
        status: "assigned",
        assignedAt: data.assignedAt,
        driver: {
          _id: data.driverId,
          name: data.driverName,
          color: data.driverColor,
          phone: data.driverPhone || null,
        },
      });
    });

    // Listen for en-route and delivered driver status updates
    channel.bind("delivery-status-update", (data: any) => {
      console.log("Real-time delivery status update received via Pusher:", data);
      setDriverInfo((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: data.status,
        };
      });
      if (data.status === "delivered") {
        setCurrentStatus("completed");
        setLiveOrder((prev: any) => (prev ? { ...prev, status: "completed" } : prev));
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-order-${orderId}`);
    };
  }, [isOpen, order?._id, order?.id]);

  // Simulation mode loop (only for demo/mock orders)
  useEffect(() => {
    if (!isOpen || !isSimulated) return;

    const statusCycle: OrderStatus[] = [
      "pending",
      "preparing",
      "ready",
      "completed",
    ];
    let currentIdx = statusCycle.indexOf(currentStatus);
    if (currentIdx === -1) currentIdx = 0;

    const simulateInterval = setInterval(() => {
      if (currentIdx < statusCycle.length - 1) {
        currentIdx += 1;
        const nextStatus = statusCycle[currentIdx];
        setCurrentStatus(nextStatus);

        // Update local status in liveOrder object
        setLiveOrder((prev: any) => ({
          ...prev,
          status: nextStatus,
        }));
      } else {
        clearInterval(simulateInterval);
      }
    }, 15000); // Advance status every 15s in simulation mode

    return () => clearInterval(simulateInterval);
  }, [isOpen, isSimulated, currentStatus]);

  const handleRefresh = async () => {
    const orderId = liveOrder?._id || liveOrder?.id;
    if (!orderId || String(orderId).startsWith("mock-")) return;

    setIsRefreshing(true);
    const toastId = toast.loading("Refreshing order status...");
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/orders/${orderId}`);
      if (res.data.success && res.data.data) {
        setLiveOrder(res.data.data);
        setCurrentStatus(res.data.data.status);
        toast.success("Status updated!", { id: toastId });
      } else {
        toast.error("Failed to update status", { id: toastId });
      }
    } catch (err) {
      console.error("Error refreshing order:", err);
      toast.error("Failed to update status", { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen || !liveOrder) return null;

  const isDelivery = liveOrder.orderType === "delivery";

  const branchName =
    selectedBranch?.name ||
    (typeof liveOrder.branchId === "object" ? liveOrder.branchId?.name : null) ||
    liveOrder.branchName ||
    "Restaurant Branch";

  const branchAddress =
    selectedBranch?.address ||
    (typeof liveOrder.branchId === "object" ? liveOrder.branchId?.address : null) ||
    liveOrder.branchAddress ||
    "Main City Location";

  const branchPhone =
    selectedBranch?.phone ||
    (typeof liveOrder.branchId === "object" ? liveOrder.branchId?.phone : null) ||
    liveOrder.branchPhone ||
    "(587) 365-5401";

  const cleanPhoneTel = branchPhone.replace(/\D/g, "") || "5873655401";

  // Helper for tracking steps
  const steps = [
    {
      key: "pending",
      label: "Order Placed",
      description: "Received & waiting for confirmation",
      icon: Clock,
      color: "text-amber-500 bg-amber-50 border-amber-200",
    },
    {
      key: "preparing",
      label: "Preparing",
      description: "Kitchen is cooking your meal",
      icon: Flame,
      color: "text-orange-500 bg-orange-50 border-orange-200",
    },
    {
      key: isDelivery ? "ready" : "ready", // ready = out for delivery or ready for pickup
      label: isDelivery ? "Out for Delivery" : "Ready for Pickup",
      description: isDelivery
        ? "Estimated arrival: ~1 hour"
        : `Pickup at ${branchName} counter`,
      icon: isDelivery ? MapPin : Store,
      color: "text-blue-500 bg-blue-50 border-blue-200",
    },
    {
      key: "completed",
      label: "Delivered",
      description: "Thank you for ordering!",
      icon: ThumbsUp,
      color: "text-emerald-500 bg-emerald-50 border-emerald-200",
    },
  ];

  const getStatusIndex = (status: OrderStatus) => {
    if (status === "cancelled") return -1;
    if (status === "completed") return 3;
    if (status === "ready") {
      if (isDelivery && !driverInfo?.assigned) {
        return 1; // Keep at "Preparing" if driver not assigned yet
      }
      return 2;
    }
    if (status === "preparing") return 1;
    return 0; // pending
  };

  const formatScheduledTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const dayName = days[d.getDay()];
      const monthName = months[d.getMonth()];
      const dateNum = d.getDate();

      let hours = d.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = String(d.getMinutes()).padStart(2, "0");

      return `${dayName}, ${monthName} ${dateNum} at ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  const currentStepIdx = getStatusIndex(currentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in"
      />

      {/* Modal Shell */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl z-10 animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-neutral-800">
              Live Order Tracker
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isSimulated && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-brand-primary cursor-pointer active:scale-95 transition-all"
                title="Refresh order status"
              >
                <RotateCw
                  size={12}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Hero Banner */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-sm font-black text-neutral-900">
              {currentStatus === "completed"
                ? "Order Completed!"
                : currentStatus === "cancelled"
                  ? "Order Cancelled"
                  : "Order Placed Successfully!"}
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
              Order No: #
              {liveOrder.orderNumber ||
                "Online-" + Math.floor(100 + Math.random() * 900)}
            </p>
            {liveOrder.orderTiming === "later" && liveOrder.scheduledAt && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 text-brand-primary rounded-xl text-[9px] font-extrabold uppercase tracking-wider">
                <Clock size={11} strokeWidth={2.5} />
                <span>
                  Scheduled for: {formatScheduledTime(liveOrder.scheduledAt)}
                </span>
              </div>
            )}
            {isSimulated && (
              <span className="inline-block bg-neutral-100 text-neutral-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-neutral-200 mt-1">
                Demo Simulation Mode
              </span>
            )}
          </div>

          {/* Cancelled Alert */}
          {currentStatus === "cancelled" ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700">
              <XCircle className="flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-xs font-bold">This order was cancelled</p>
                <p className="text-[10px] opacity-90 mt-0.5">
                  Please contact the branch at {branchPhone} for assistance.
                </p>
              </div>
            </div>
          ) : (
            /* Progress Tracker timeline */
            <div className="relative pl-7 ml-4 py-2">
              {steps.map((step, idx) => {
                const isActive = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="relative pb-6 last:pb-0">
                    {/* Line connecting to next step */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute left-[-29px] top-[26px] bottom-0 w-[2px] ${
                          idx < currentStepIdx
                            ? "bg-emerald-500"
                            : "bg-neutral-100"
                        }`}
                      />
                    )}

                    {/* Circle Anchor indicator */}
                    <div
                      className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-brand-primary border-brand-primary text-white scale-110 shadow-md shadow-brand-primary/20"
                          : isActive
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-neutral-200 text-neutral-400"
                      }`}
                    >
                      <StepIcon size={12} strokeWidth={2.5} />
                    </div>

                    <div className="space-y-0.5">
                      <h4
                        className={`text-xs font-black transition-colors ${
                          isActive ? "text-neutral-800" : "text-neutral-400"
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p
                        className={`text-[9.5px] font-medium transition-colors ${
                          isActive ? "text-neutral-500" : "text-neutral-400"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Delivery Tracking Map Button */}
          {isDelivery && driverInfo?.assigned && currentStatus === "ready" && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowFullScreenMap(true)}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-brand-primary/10"
              >
                <MapPin size={15} />
                <span>Track Live Delivery on Map</span>
              </button>

              {/* Driver Details */}
              {driverInfo.driver && (
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Your Driver
                    </p>
                    <p className="text-sm font-black text-neutral-800">
                      {driverInfo.driver.name}
                    </p>
                  </div>
                  {driverInfo.driver.phone && (
                    <a
                      href={`tel:${driverInfo.driver.phone}`}
                      className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-sm"
                      title="Call Driver"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delivery Specific notice */}
          {isDelivery && currentStatus === "preparing" && (
            <div className="bg-orange-50/40 border border-orange-100/50 p-3.5 rounded-2xl text-[10px] text-neutral-600 font-semibold space-y-1">
              <p className="text-brand-primary uppercase text-[8.5px] font-black tracking-wider">
                Estimated Delivery Notice
              </p>
              <p className="leading-relaxed">
                Strathmore Branch offers flat-rate delivery. The courier will
                deliver your food within{" "}
                <span className="text-brand-primary">1 hour</span> of food
                preparation completion.
              </p>
            </div>
          )}

          {/* Order Summary details */}
          <div className="border border-neutral-100 rounded-2xl overflow-hidden bg-neutral-50/50">
            <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200/50 flex justify-between text-[9px] font-black text-neutral-500 uppercase tracking-widest">
              <span>Order Summary</span>
              <span>{isDelivery ? "Delivery" : "Pickup"}</span>
            </div>

            <div className="p-4 space-y-3">
              <div className="divide-y divide-neutral-100 max-h-[140px] overflow-y-auto pr-0.5 no-scrollbar">
                {liveOrder.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="py-2 flex justify-between text-xs font-semibold text-neutral-700 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 pr-4">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-neutral-400 ml-1">
                        x{item.quantity}
                      </span>
                    </div>
                    <span className="text-neutral-800 font-bold">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="border-t border-neutral-200/90 pt-3 space-y-1.5 text-[10.5px] font-bold text-neutral-450">
                <div className="flex justify-between">
                  <span>Sub Total</span>
                  <span className="text-neutral-700 font-mono">
                    ${(liveOrder.subtotal ?? 0).toFixed(2)}
                  </span>
                </div>
                {(() => {
                  const taxRatePercentage = liveOrder.taxRate
                    ? Math.round(liveOrder.taxRate * 100)
                    : liveOrder.subtotal > 0 && liveOrder.tax
                    ? Math.round((liveOrder.tax / liveOrder.subtotal) * 100)
                    : 5;
                  return (
                    <div className="flex justify-between">
                      <span>GST ({taxRatePercentage}%)</span>
                      <span className="text-neutral-700 font-mono">
                        ${(liveOrder.tax ?? 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
                {((liveOrder.deliveryFee as number | undefined) ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="text-neutral-700 font-mono">
                      +${(liveOrder.deliveryFee as number).toFixed(2)}
                    </span>
                  </div>
                )}
                {((liveOrder.tip as number | undefined) ?? 0) > 0 && (
                  <div className="flex justify-between text-brand-primary">
                    <span>Driver Tip</span>
                    <span className="font-mono">
                      +${(liveOrder.tip as number).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-200 pt-3 flex justify-between items-center text-xs font-black text-neutral-800">
                <span>Total Amount Paid</span>
                <span className="text-sm text-brand-primary">
                  ${liveOrder.total?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer delivery / pickup location card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
            <div className="space-y-1">
              <p className="text-[8.5px] font-black text-neutral-400 uppercase tracking-wider">
                Customer Details
              </p>
              <p className="text-xs font-bold text-neutral-800">
                {liveOrder.customer?.name}
              </p>
              <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                <Phone size={10} />
                {liveOrder.customer?.phone}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[8.5px] font-black text-neutral-400 uppercase tracking-wider">
                {isDelivery ? "Delivery Address" : "Pickup Location"}
              </p>
              {isDelivery ? (
                <p className="text-[10px] text-neutral-700 font-medium leading-tight">
                  {liveOrder.customer?.address}
                </p>
              ) : (
                <div className="text-[10px] text-neutral-700 font-semibold space-y-0.5">
                  <p className="text-brand-primary font-bold">
                    {branchName} Counter
                  </p>
                  <p className="text-neutral-500 leading-tight">
                    {branchAddress}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button when order is completed or cancelled */}
          {(currentStatus === "completed" || currentStatus === "cancelled") && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 animate-fade-in"
            >
              <span>Dismiss & Track New Order</span>
            </button>
          )}
        </div>

        {/* Footer Support Info */}
        <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500 font-semibold flex-shrink-0">
          <div>
            <span className="text-neutral-700 font-bold block">Need help with your order?</span>
            <span className="text-[9.5px] text-neutral-400 font-medium leading-tight">{branchName} · {branchAddress}</span>
          </div>
          <a
            href={`tel:${cleanPhoneTel}`}
            className="flex items-center gap-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary px-3.5 py-1.5 rounded-xl transition-all font-extrabold cursor-pointer text-xs shrink-0"
          >
            <Phone size={13} />
            <span>Call Branch</span>
          </a>
        </div>
      </div>

      {/* ── FULL SCREEN MAP OVERLAY ── */}
      {showFullScreenMap && isDelivery && driverInfo?.assigned && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-fade-in">
          {/* Header */}
          <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">
                Order #{liveOrder.orderNumber}
              </p>
              <h3 className="text-xs font-black text-neutral-100 mt-1 leading-tight">
                Live Delivery Tracking
              </h3>
            </div>
            <button
              onClick={() => setShowFullScreenMap(false)}
              className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Map Content */}
          <div className="flex-1 relative">
            <DeliveryTrackingMap
              orderId={liveOrder._id || liveOrder.id}
              driverInfo={driverInfo.driver}
              customerCoords={
                liveOrder.customer?.lat && liveOrder.customer?.lng
                  ? { lat: Number(liveOrder.customer.lat), lng: Number(liveOrder.customer.lng) }
                  : userLocation || restaurantCoords || { lat: 22.1818, lng: 78.7618 }
              }
              restaurantCoords={restaurantCoords || { lat: 22.1818, lng: 78.7618 }}
              onDeliveryComplete={() => {
                setCurrentStatus("completed");
                setLiveOrder((prev: any) => ({ ...prev, status: "completed" }));
                setShowFullScreenMap(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
