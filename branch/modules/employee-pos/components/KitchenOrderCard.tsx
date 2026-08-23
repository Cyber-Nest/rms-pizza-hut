"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Order } from "../types";

interface KitchenOrderCardProps {
  order: Order;
  onClick: () => void;
  stationFilter?: "cut_station" | "make_table" | "wings_station";
}

interface GroupedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  isRoot: boolean;
  quantity: number;
}

const getGroupedModifiers = (modifiers: any[]): GroupedModifier[] => {
  if (!modifiers) return [];
  const result: GroupedModifier[] = [];

  modifiers.forEach((mod) => {
    const isRootVal =
      mod.isRoot !== undefined
        ? mod.isRoot
        : !(
            mod.groupName?.toLowerCase().includes("mix") ||
            mod.groupName?.toLowerCase().includes("white & dark")
          );

    if (isRootVal) {
      const existingRoot = result.find(
        (g) => g.isRoot && g.groupId === mod.groupId && g.optionId === mod.optionId,
      );
      if (existingRoot) {
        existingRoot.quantity += 1;
      } else {
        result.push({
          groupId: mod.groupId,
          groupName: mod.groupName,
          optionId: mod.optionId,
          optionName: mod.optionName,
          price: mod.price,
          isRoot: true,
          quantity: 1,
        });
      }
    } else {
      let lastRootIndex = -1;
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].isRoot) {
          lastRootIndex = i;
          break;
        }
      }

      const existingSub = result
        .slice(lastRootIndex + 1)
        .find(
          (g) => !g.isRoot && g.groupId === mod.groupId && g.optionId === mod.optionId,
        );

      if (existingSub) {
        existingSub.quantity += 1;
      } else {
        result.push({
          groupId: mod.groupId,
          groupName: mod.groupName,
          optionId: mod.optionId,
          optionName: mod.optionName,
          price: mod.price,
          isRoot: false,
          quantity: 1,
        });
      }
    }
  });

  return result;
};

export default function KitchenOrderCard({
  order,
  onClick,
  stationFilter,
}: KitchenOrderCardProps) {
  const [elapsedMins, setElapsedMins] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      let createdTime = new Date(order.createdAt).getTime();
      if (order.orderTiming === "later" && order.scheduledAt) {
        createdTime = new Date(order.scheduledAt).getTime() - 45 * 60000;
      }
      const diffMs = Date.now() - createdTime;
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      setElapsedMins(diffMins);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isUnpaid = order.paymentStatus === "unpaid";
  const isDraft = order.orderNumber === "#DRAFT";

  const PLATFORM_LABELS: Record<string, string> = {
    doordash: "DoorDash",
    skip: "Skip",
    ubereats: "Uber Eats",
    online: "Online",
  };

  const orderTypeLabel =
    {
      takeout: "Takeout",
      "drive-through": "Drive-Through",
      "dine-in": "Dine-In",
      delivery: "Delivery",
    }[order.orderType] || order.orderType;

  const formattedType = PLATFORM_LABELS[order.orderSource]
    ? `${PLATFORM_LABELS[order.orderSource]} - ${order.orderType === "delivery" ? "Delivery" : "Takeout"}`
    : orderTypeLabel;

  // Status Colors Mapping
  const statusColorMap: Record<string, string> = {
    pending: "bg-brand-primary",
    preparing: "bg-amber-500",
    in_oven: "bg-orange-600",
    ready: "bg-emerald-500",
    completed: "bg-neutral-400",
    cancelled: "bg-red-500",
  };
  const statusBarBg = isDraft
    ? "bg-amber-500"
    : statusColorMap[order.status] || "bg-neutral-300";

  const typeBadgeClass =
    order.orderSource === "doordash"
      ? "bg-red-50 text-red-600 border-red-100 font-bold"
      : order.orderSource === "skip"
        ? "bg-orange-50 text-orange-600 border-orange-100 font-bold"
        : order.orderSource === "ubereats"
          ? "bg-green-50 text-green-600 border-green-100 font-bold"
          : order.orderSource === "online"
            ? "bg-rose-50 text-rose-600 border-rose-100 font-bold"
            : {
                takeout: "bg-orange-50 text-brand-primary border-orange-100",
                "drive-through":
                  "bg-purple-50 text-purple-600 border-purple-100",
                "dine-in": "bg-blue-50 text-blue-600 border-blue-100",
                delivery: "bg-amber-50 text-amber-700 border-amber-100",
              }[order.orderType] ||
              "bg-neutral-50 text-neutral-600 border-neutral-100";

  // If order is older than 15 mins, mark as delayed
  const isDelayed = !isDraft && elapsedMins >= 15 && order.status !== "ready";

  return (
    <div
      onClick={onClick}
      className={`flex flex-col h-full min-h-0 bg-white rounded-xl border border-neutral-200 overflow-hidden cursor-pointer hover:border-brand-primary/40 hover:shadow-lg transition-all duration-200 select-none ${
        isDraft ? "border-dashed border-amber-400 bg-amber-50/20" : ""
      }`}
    >
      {/* ── Status Top Accent Border ── */}
      <div className={`h-1.5 w-full ${statusBarBg}`} />

      {/* ── Ticket Header ── */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-white">
        <div className="flex flex-col gap-0.5">
          <span className="font-800 text-[13px] text-neutral-800 tracking-wide">
            {order.orderNumber}
          </span>
          <span className="text-[10px] text-neutral-400 font-500">
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full border text-[9px] font-700 uppercase tracking-wider ${typeBadgeClass}`}
        >
          {formattedType}
        </span>
      </div>

      {/* ── Ticket Body (Items List) ── */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4 min-h-0">
        <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-2.5">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="text-[12px] pb-2 border-b border-neutral-100 last:border-b-0 last:pb-0"
            >
              {/* Item Title & Qty */}
              <div className="flex items-start gap-2">
                <span className="w-6 h-6 flex-shrink-0 rounded-full bg-orange-50 border border-orange-100 text-[12px] font-800 text-brand-primary flex items-center justify-center">
                  {item.quantity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <p className="text-neutral-800 font-700 text-[15px] leading-tight truncate">
                        {item.name}
                      </p>
                      {(() => {
                        const hasWingsMods =
                          item.kitchenLabel === "wings_station" ||
                          item.kitchenLabel === "chicken" ||
                          (item.selectedModifiers || []).some((m: any) => {
                            if (
                              m.kitchenLabel === "wings_station" ||
                              m.kitchenLabel === "chicken"
                            )
                              return true;
                            const name = (
                              (m.groupName || "") +
                              " " +
                              (m.optionName || "")
                            ).toLowerCase();
                            return (
                              name.includes("wing") ||
                              name.includes("side") ||
                              name.includes("chicken") ||
                              name.includes("strip") ||
                              name.includes("bites") ||
                              name.includes("dessert") ||
                              name.includes("dip") ||
                              name.includes("frosting") ||
                              name.includes("brownie")
                            );
                          });

                        if (!hasWingsMods) return null;

                        return (
                          <span
                            className={`text-[8px] font-800 px-1 py-0.2 rounded border uppercase flex-shrink-0 ${
                              order.wingsStatus === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : order.wingsStatus === "ready"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : order.wingsStatus === "preparing"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            Wings:{" "}
                            {order.wingsStatus === "completed"
                              ? "Done"
                              : order.wingsStatus === "ready"
                                ? "Ready"
                                : order.wingsStatus === "preparing"
                                  ? "Prep"
                                  : "Pending"}
                          </span>
                        );
                      })()}
                    </div>
                    <span className="text-[12.5px] font-800 text-neutral-700 flex-shrink-0">
                      $
                      {(
                        item.totalPrice ?? item.basePrice * item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>

                  {/* Modifiers */}
                  {item.selectedModifiers &&
                    item.selectedModifiers.length > 0 && (
                      <div className="pl-2.5 mt-1 border-l-2 border-neutral-200 flex flex-col gap-0.5">
                        {getGroupedModifiers(item.selectedModifiers).map(
                          (mod, modIdx) => (
                            <div
                              key={modIdx}
                              className="text-[12.5px] leading-tight text-neutral-600"
                            >
                              {mod.isRoot ? (
                                <div className="mt-1">
                                  {/* <span className="text-[10.5px] font-800 text-neutral-400 uppercase tracking-wider">
                                  {mod.groupName}
                                </span> */}
                                  <div className="flex justify-between items-baseline font-600 text-neutral-700">
                                    {mod.optionName.trim().startsWith("-") ||
                                    mod.optionName
                                      .toLowerCase()
                                      .includes("no ") ? (
                                      <span className="text-red-600 font-800 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 inline-block my-0.5 shadow-xs">
                                        {mod.optionName}
                                      </span>
                                    ) : (
                                      <span>{mod.optionName}</span>
                                    )}
                                    {mod.quantity > 1 && (
                                      <span className="font-700 text-neutral-900 text-[11px]">
                                        x{mod.quantity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-baseline text-neutral-500 font-500 text-[11.5px] italic pl-1.5">
                                  <span>{mod.optionName}</span>
                                  {mod.quantity > 1 && (
                                    <span className="font-600 text-neutral-600 text-[10px]">
                                      x{mod.quantity}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                  {/* Custom Note */}
                  {item.note && (
                    <p className="text-[9.5px] text-amber-800 font-600 italic mt-1.5 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/50">
                      Note: {item.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Level Delivery / Prep Note */}
        {order.notes && (
          <div className="text-[10px] text-amber-900 font-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 leading-snug">
            <span className="font-900 uppercase text-[8.5px] block text-amber-800 tracking-wider">
              Note / Instructions:
            </span>
            "{order.notes}"
          </div>
        )}
      </div>

      {/* ── Ticket Footer ── */}
      <div className="px-4 py-3 bg-neutral-50/50 border-t border-neutral-100 flex flex-col gap-2 text-[11px]">
        {/* Row 1: Status Badge & Price */}
        <div className="flex justify-between items-center">
          {isDraft ? (
            <span className="px-2 py-0.5 rounded-full border border-amber-250 bg-amber-50 text-amber-700 text-[9px] font-700 uppercase tracking-wide">
              POS Drafting
            </span>
          ) : stationFilter === "wings_station" ? (
            order.wingsStatus === "completed" ||
            order.wingsStatus === "ready" ||
            (order.status === "ready" && !order.makeTableStatus) ? (
              <span className="px-2 py-0.5 rounded-full border border-emerald-250 bg-emerald-50 text-emerald-700 text-[9px] font-700 uppercase tracking-wide">
                {order.orderType === "delivery" ? "Ready Delv" : "Ready Pick"}
              </span>
            ) : order.wingsStatus === "preparing" ||
              order.status === "preparing" ? (
              <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-[9px] font-700 uppercase tracking-wide">
                Preparing
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-brand-primary text-[9px] font-700 uppercase tracking-wide animate-pulse">
                Confirmed
              </span>
            )
          ) : order.makeTableStatus === "in_oven" ||
            order.status === "in_oven" ? (
            <span className="px-2 py-0.5 rounded-full border border-orange-300 bg-orange-100 text-orange-700 text-[9px] font-800 uppercase tracking-wide">
              In Oven
            </span>
          ) : order.makeTableStatus === "ready" || order.status === "ready" ? (
            <span className="px-2 py-0.5 rounded-full border border-emerald-250 bg-emerald-50 text-emerald-700 text-[9px] font-700 uppercase tracking-wide">
              {order.orderType === "delivery" ? "Ready Delv" : "Ready Pick"}
            </span>
          ) : order.makeTableStatus === "preparing" ||
            order.status === "preparing" ? (
            <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-[9px] font-700 uppercase tracking-wide">
              Preparing
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-brand-primary text-[9px] font-700 uppercase tracking-wide animate-pulse">
              Confirmed
            </span>
          )}
          <span className="font-800 text-neutral-800 text-[13px]">
            ${order.total.toFixed(2)}
          </span>
        </div>

        {/* Row 2: Payment & Timer */}
        <div className="flex justify-between items-center">
          {isUnpaid ? (
            <span className="px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 text-[8.5px] font-700 uppercase tracking-wide">
              Unpaid
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 text-[8.5px] font-700 uppercase tracking-wide">
              Paid
            </span>
          )}

          {!isDraft && (
            <div
              className={`flex items-center gap-1 text-[10px] font-600 ${isDelayed ? "text-red-600 font-700 animate-pulse" : "text-neutral-400"}`}
            >
              <Clock size={11} className={isDelayed ? "animate-bounce" : ""} />
              <span>
                {elapsedMins} Min{elapsedMins !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
