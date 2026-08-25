"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { getPusherClient } from "../../../lib/pusher";
import {
  Store,
  Smartphone,
  RefreshCw,
  Clock,
  Utensils,
  CheckCircle2,
  TrendingUp,
  Inbox,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { Order } from "../types";

export default function ReceptionView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // ── Fetch Active Orders from API ──
  const fetchActiveOrders = useCallback(async () => {
    try {
      let branchId: string | undefined = undefined;
      if (typeof window !== "undefined") {
        const rawBranch = localStorage.getItem("rms_branch");
        if (rawBranch) {
          try {
            const b = JSON.parse(rawBranch);
            branchId = b._id;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/orders`, {
        params: {
          status: "pending,preparing,ready,completed",
          fields: "orderNumber,orderSource,orderType,status,receptionCompleted,createdAt,branchId",
          excludeReceptionCompleted: "true",
          ...(branchId ? { branchId } : {}),
        },
      });
      if (res.data.success) {
        // Filter out completed/cancelled or receptionCompleted orders
        const active = (res.data.data as Order[]).filter((o) => {
          if (o.receptionCompleted === true) {
            return false;
          }
          return ["pending", "preparing", "ready", "completed"].includes(o.status);
        });
        // Sort by status priority: Ready/Completed (1) > Preparing (2) > Pending (3). Then oldest first.
        const statusWeights: Record<string, number> = {
          ready: 1,
          completed: 1,
          preparing: 2,
          pending: 3,
        };
        active.sort((a, b) => {
          const weightA = statusWeights[a.status] || 99;
          const weightB = statusWeights[b.status] || 99;
          if (weightA !== weightB) {
            return weightA - weightB;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setOrders(active);
      }
    } catch (err) {
      console.error("Failed to fetch active orders in Reception View:", err);
      toast.error("Could not load active orders list.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Complete order by Cashier ──
  const handleCompleteOrder = async (orderId: string) => {
    setCompletingId(orderId);
    try {
      let activeEmpName = "Manager";
      if (typeof window !== "undefined") {
        const rawEmp = localStorage.getItem("rms_active_employee");
        if (rawEmp) {
          try {
            const emp = JSON.parse(rawEmp);
            if (emp && emp.name) activeEmpName = emp.name;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(`${apiUrl}/orders/${orderId}/status`, {
        status: "completed",
        note: "Order completed and handed over to customer via Reception View",
        receptionCompleted: true,
        userName: activeEmpName,
      });
      if (res.data.success) {
        toast.success("Order marked as completed!");
        fetchActiveOrders();
      } else {
        toast.error(res.data.message || "Failed to complete order.");
      }
    } catch (err) {
      console.error("Failed to complete order:", err);
      toast.error("Error completing order.");
    } finally {
      setCompletingId(null);
    }
  };

  // ── Hand over delivery order by Cashier ──
  const handleHandoverDelivery = async (orderId: string) => {
    setCompletingId(orderId);
    try {
      let activeEmpName = "Manager";
      if (typeof window !== "undefined") {
        const rawEmp = localStorage.getItem("rms_active_employee");
        if (rawEmp) {
          try {
            const emp = JSON.parse(rawEmp);
            if (emp && emp.name) activeEmpName = emp.name;
          } catch (e) {}
        }
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.patch(`${apiUrl}/orders/${orderId}/status`, {
        status: "ready", // KEEP status as ready
        note: "Order handed over to delivery driver",
        receptionCompleted: true, // This clears it from Reception View
        userName: activeEmpName,
      });
      if (res.data.success) {
        toast.success("Handed over to driver!");
        fetchActiveOrders();
      } else {
        toast.error(res.data.message || "Failed to handover order.");
      }
    } catch (err) {
      console.error("Failed to handover order:", err);
      toast.error("Error handing over order.");
    } finally {
      setCompletingId(null);
    }
  };

  // ── Initial Fetch ──
  useEffect(() => {
    fetchActiveOrders();
  }, [fetchActiveOrders]);

  // ── Pusher Real-time Listener ──
  useEffect(() => {
    let branchId: string | undefined = undefined;
    if (typeof window !== "undefined") {
      const rawBranch = localStorage.getItem("rms_branch");
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          branchId = b._id;
        } catch (e) {}
      }
    }

    const channelName = branchId ? `orders-${branchId}` : "orders";
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);

    // Listen for new orders
    channel.bind("new-order", (data: any) => {
      console.log("New order received in Reception View via Pusher:", data);
      fetchActiveOrders();
    });

    // Listen for status updates
    channel.bind("order-updated", (data: any) => {
      console.log(
        "Order status update received in Reception View via Pusher:",
        data,
      );
      const existingOrder = ordersRef.current.find((o) => o._id === data._id);
      if (existingOrder) {
        const statusChanged = existingOrder.status !== data.status;
        const receptionCompletedChanged =
          !!existingOrder.receptionCompleted !== !!data.receptionCompleted;
        if (!statusChanged && !receptionCompletedChanged) {
          console.log(
            "Ignoring order-updated event in Reception View (no status/reception change)."
          );
          return;
        }
      }
      fetchActiveOrders();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [fetchActiveOrders]);

  // ── Format Order Type and Platform ──
  const getFormattedOrderType = (order: Order) => {
    const source = order.orderSource ? order.orderSource.toLowerCase() : "pos";
    const type = order.orderType ? order.orderType.toLowerCase() : "takeout";

    // Format type text
    let typeLabel = type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    if (typeLabel === "Dinein") typeLabel = "Dine In";
    if (typeLabel === "Drivethrough") typeLabel = "Drive Thru";

    if (source === "doordash") {
      return `DoorDash - ${typeLabel}`;
    } else if (source === "skip") {
      return `Skip - ${typeLabel}`;
    } else if (source === "ubereats") {
      return `Uber Eats - ${typeLabel}`;
    } else if (source === "online") {
      return `Online - ${typeLabel}`;
    } else {
      return typeLabel;
    }
  };

  // ── Format Platform Badges ──
  const renderSourceBadge = (source: string) => {
    const src = source?.toLowerCase() || "pos";

    if (src === "pos") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1 bg-neutral-50 text-neutral-600 border-neutral-200">
          <Store size={10} />
          <span>POS</span>
        </span>
      );
    } else if (src === "doordash") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1 bg-red-50 text-red-750 border-red-200/60">
          <Smartphone size={10} />
          <span>DoorDash</span>
        </span>
      );
    } else if (src === "skip") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1 bg-orange-50 text-orange-755 border-orange-200/60">
          <Smartphone size={10} />
          <span>Skip</span>
        </span>
      );
    } else if (src === "ubereats") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1 bg-emerald-50 text-emerald-750 border-emerald-200/60">
          <Smartphone size={10} />
          <span>Uber Eats</span>
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] font-800 tracking-wider border uppercase inline-flex items-center gap-1 bg-sky-50 text-sky-700 border-sky-100">
          <Smartphone size={10} />
          <span>Online</span>
        </span>
      );
    }
  };

  // ── Status Badge Custom Styling ──
  const getStatusConfig = (status: string) => {
    const stat = status?.toLowerCase() || "pending";
    if (stat === "ready" || stat === "completed") {
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
        label: "Ready for Pickup",
        dot: "bg-emerald-500",
        icon: <CheckCircle2 size={12} className="text-emerald-600" />,
      };
    } else if (stat === "preparing") {
      return {
        bg: "bg-orange-50 text-orange-755 border-orange-200/60",
        label: "Preparing",
        dot: "bg-orange-500 animate-pulse",
        icon: <Utensils size={12} className="text-orange-600" />,
      };
    } else {
      return {
        bg: "bg-sky-50 text-sky-700 border-sky-200/60",
        label: "Pending (Kitchen)",
        dot: "bg-sky-500 animate-ping",
        icon: <Clock size={12} className="text-sky-600" />,
      };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden select-none">
      {/* Header section with stats & Refresh button */}
      <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="text-[13px] lg:text-[15px] font-850 uppercase tracking-wider text-neutral-800">
              Live Reception
            </h2>
            <p className="text-[10px] lg:text-[12px] font-600 text-neutral-450">
              Track incoming & kitchen-active orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 flex items-center gap-2 text-[11px] lg:text-[12.5px] font-750 text-neutral-650">
            <span>Active Orders:</span>
            <span className="bg-brand-primary text-white px-2 py-0.5 rounded-md text-[10px] font-800">
              {orders.length}
            </span>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchActiveOrders();
            }}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-brand-primary rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table container */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full border-3 border-neutral-200 border-t-brand-primary animate-spin" />
            <span className="text-[11px] font-750 text-neutral-500 uppercase tracking-wider animate-pulse">
              Loading active reception queue...
            </span>
          </div>
        ) : orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-neutral-400 bg-neutral-50/30">
            <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center border border-neutral-200 mb-3 shadow-2xs">
              <Inbox size={22} className="text-neutral-400" />
            </div>
            <h3 className="text-[13px] font-800 text-neutral-750 uppercase tracking-wide">
              Queue Clear
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1 max-w-[260px] text-center leading-relaxed">
              No orders are currently in the kitchen. 
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/70 text-neutral-500 font-800 text-[10px] lg:text-[11.5px] tracking-wider uppercase border-b border-neutral-200 sticky top-0 z-10 select-none">
                <th className="px-6 py-3.5">Order #</th>
                <th className="px-6 py-3.5">Source</th>
                <th className="px-6 py-3.5">Order Type</th>
                <th className="px-6 py-3.5 text-center">Order Status</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((order) => {
                const statusCfg = getStatusConfig(order.status);
                return (
                  <tr
                    key={order._id}
                    className="hover:bg-neutral-50/65 transition-colors cursor-pointer group"
                  >
                    {/* Order Number */}
                    <td className="px-6 py-4.5">
                      <span className="text-[13px] lg:text-[15px] font-800 text-neutral-850 group-hover:text-brand-primary transition-colors">
                        #{order.orderNumber}
                      </span>
                    </td>

                    {/* Order Source Badge */}
                    <td className="px-6 py-4.5">
                      {renderSourceBadge(order.orderSource)}
                    </td>

                    {/* Order Type */}
                    <td className="px-6 py-4.5">
                      <span className="text-[12.5px] lg:text-[14px] font-700 text-neutral-700">
                        {getFormattedOrderType(order)}
                      </span>
                    </td>

                    {/* Kitchen Status Badge */}
                    <td className="px-6 py-4.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] lg:text-[12px] font-800 border uppercase ${statusCfg.bg}`}
                      >
                        {/* <span
                          className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                        /> */}
                        {statusCfg.icon}
                        <span>{statusCfg.label}</span>
                      </span>
                    </td>

                    {/* Action Column */}
                    <td className="px-6 py-4.5 text-center">
                      {order.status === "completed" || (order.orderType === "delivery" && order.status === "ready") ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (order._id) {
                              if (order.orderType === "delivery" && order.status === "ready") {
                                handleHandoverDelivery(order._id);
                              } else {
                                handleCompleteOrder(order._id);
                              }
                            }
                          }}
                          disabled={completingId === order._id}
                          className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/35 hover:scale-105 active:scale-95 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          title={order.orderType === "delivery" && order.status === "ready" ? "Hand over to Driver" : "Complete Order & Handover"}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-350 italic font-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
