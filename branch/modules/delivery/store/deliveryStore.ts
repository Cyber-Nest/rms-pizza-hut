import { create } from "zustand";
import axios from "axios";
import { getPusherClient } from "../../../lib/pusher";
import {
  DeliveryOrder,
  Driver,
  Vehicle,
  RestaurantLocation,
} from "../types/delivery";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const DEFAULT_RESTAURANT_COORDS = { lat: 22.1818, lng: 78.7618 };

function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Read restaurant info from rms_branch stored at login
const getRestaurantInfoFromStorage = (): { name: string; lat: number | null; lng: number | null } => {
  if (typeof window === "undefined") return { name: "Restaurant", lat: null, lng: null };
  try {
    const raw = localStorage.getItem("rms_branch");
    if (raw) {
      const b = JSON.parse(raw);
      const lat = b.lat && !isNaN(Number(b.lat)) && Number(b.lat) !== 0 ? Number(b.lat) : null;
      const lng = b.lng && !isNaN(Number(b.lng)) && Number(b.lng) !== 0 ? Number(b.lng) : null;
      return { name: b.name || "Restaurant", lat, lng };
    }
  } catch (e) {}
  return { name: "Restaurant", lat: null, lng: null };
};

const getBranchConfig = () => {
  if (typeof window === "undefined") return { withCredentials: true };
  try {
    const raw = localStorage.getItem("rms_branch");
    if (raw) {
      const b = JSON.parse(raw);
      const branchId = b._id || b.id || b.branchId;
      if (branchId) {
        return {
          withCredentials: true,
          headers: { "x-branch-id": branchId },
          params: { branchId, restaurantId: branchId },
        };
      }
    }
  } catch (e) {}
  return { withCredentials: true };
};


interface DeliveryState {
  // ── Data ──
  orders: DeliveryOrder[];
  drivers: Driver[];
  vehicles: Vehicle[];
  restaurantLocation: RestaurantLocation;

  // ── UI State ──
  activeTab: "orders" | "carriers" | "ta";
  activeFilter: "assign" | "en-route" | "delivered";
  carrierFilter: "available" | "en-route";
  selectedOrderId: string | null;
  selectedDriverId: string | null;
  vehicleModalOpen: boolean;

  // ── Computed Helpers ──
  getFilteredOrders: () => DeliveryOrder[];
  getFilteredDrivers: () => Driver[];
  getOrderCounts: () => { assign: number; enRoute: number; delivered: number };
  getCarrierCounts: () => { available: number; enRoute: number };
  getDriversWithVehicles: () => Driver[];

  // ── Actions ──
  setActiveTab: (tab: "orders" | "carriers" | "ta") => void;
  setActiveFilter: (filter: "assign" | "en-route" | "delivered") => void;
  setCarrierFilter: (filter: "available" | "en-route") => void;
  selectOrder: (orderId: string | null) => void;
  selectDriver: (driverId: string | null) => void;
  openVehicleModal: (driverId: string) => void;
  closeVehicleModal: () => void;
  setRestaurantLocation: (coords: { lat: number; lng: number }) => void;

  // ── API Actions ──
  fetchOrders: () => Promise<void>;
  fetchDrivers: () => Promise<void>;
  fetchVehicles: () => Promise<void>;
  assignDriver: (orderId: string, driverId: string) => Promise<void>;
  unassignDriver: (orderId: string) => Promise<void>;
  markDelivered: (orderId: string) => Promise<void>;
  assignVehicle: (driverId: string, vehicleId: string) => Promise<void>;
  unassignVehicle: (driverId: string) => Promise<void>;
  markDriverAvailable: (driverId: string) => Promise<void>;
  addVehicle: (number: string, label: string) => Promise<void>;
  updateVehicle: (id: string, number: string, label: string) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  // ── Real-Time Pusher Actions ──
  initPusher: () => void;
  cleanupPusher: () => void;
  loadRestaurantFromBranch: () => Promise<void>;
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  // ── Initial State ──
  orders: [],
  drivers: [],
  vehicles: [],
  restaurantLocation: (() => {
    const info = getRestaurantInfoFromStorage();
    return { name: info.name, coordinates: { lat: info.lat, lng: info.lng } };
  })(),
  activeTab: "orders",
  activeFilter: "assign",
  carrierFilter: "available",
  selectedOrderId: null,
  selectedDriverId: null,
  vehicleModalOpen: false,

  // ── Computed Helpers ──
  getFilteredOrders: () => {
    const { orders, activeFilter } = get();
    return orders.filter((o) => o.status === activeFilter);
  },

  getFilteredDrivers: () => {
    const { drivers, carrierFilter } = get();
    if (carrierFilter === "available") {
      // Show POS checked-in drivers (both available and offline-but-checked-in)
      return drivers.filter(
        (d) => d.posCheckedIn && (d.status === "available" || d.status === "offline")
      );
    }
    return drivers.filter(
      (d) => d.status === "on-delivery" || d.status === "returning",
    );
  },

  getOrderCounts: () => {
    const { orders } = get();
    return {
      assign: orders.filter((o) => o.status === "assign").length,
      enRoute: orders.filter((o) => o.status === "en-route").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  },

  getCarrierCounts: () => {
    const { drivers } = get();
    return {
      available: drivers.filter(
        (d) => d.posCheckedIn && (d.status === "available" || d.status === "offline")
      ).length,
      enRoute: drivers.filter(
        (d) => d.status === "on-delivery" || d.status === "returning",
      ).length,
    };
  },

  getDriversWithVehicles: () => {
    const { drivers } = get();
    return drivers.filter(
      (d) => Boolean(d.posCheckedIn) && d.assignedVehicle !== null,
    );
  },

  // ── Local UI State Actions ──
  setActiveTab: (tab) => set({ activeTab: tab, selectedOrderId: null }),
  setActiveFilter: (filter) => set({ activeFilter: filter, selectedOrderId: null }),
  setCarrierFilter: (filter) => set({ carrierFilter: filter }),
  selectOrder: (orderId) => set({ selectedOrderId: orderId }),
  selectDriver: (driverId) => set({ selectedDriverId: driverId }),
  openVehicleModal: (driverId) => set({ vehicleModalOpen: true, selectedDriverId: driverId }),
  closeVehicleModal: () => set({ vehicleModalOpen: false, selectedDriverId: null }),
  setRestaurantLocation: (coords) =>
    set((state) => ({
      restaurantLocation: { ...state.restaurantLocation, coordinates: coords },
    })),
  loadRestaurantFromBranch: async () => {
    const localInfo = getRestaurantInfoFromStorage();
    set({
      restaurantLocation: {
        name: localInfo.name,
        coordinates: { lat: localInfo.lat, lng: localInfo.lng },
      },
    });

    // Step 2: Fetch LATEST coords from backend settings API
    try {
      let branchId: string | null = null;
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("rms_branch");
        if (raw) {
          const b = JSON.parse(raw);
          branchId = b._id || b.id || b.branchId || null;
        }
      }
      if (!branchId) return;

      const res = await axios.get(`${API_URL}/branches/settings`, {
        params: { branchId },
        withCredentials: true,
      });

      if (res.data.success && res.data.data?.mainSettings) {
        const ms = res.data.data.mainSettings;
        const lat = Number(ms.latitude);
        const lng = Number(ms.longitude);

        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          // Update store with fresh backend coordinates
          set((state) => ({
            restaurantLocation: {
              name: state.restaurantLocation.name, // keep name from localStorage
              coordinates: { lat, lng },
            },
          }));

          // Also sync rms_branch localStorage so future reads are correct
          try {
            if (typeof window !== "undefined") {
              const raw = localStorage.getItem("rms_branch");
              if (raw) {
                const b = JSON.parse(raw);
                b.lat = lat;
                b.lng = lng;
                localStorage.setItem("rms_branch", JSON.stringify(b));
              }
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      // Silently fallback — localStorage values already applied above
      console.warn("[DeliveryStore] Could not fetch latest restaurant coords from API:", err);
    }
  },

  // ── API Actions ──
  fetchOrders: async () => {
    try {
      const config = getBranchConfig();
      const res = await axios.get(`${API_URL}/delivery/orders`, config);
      if (res.data.success) {
        // Map backend properties if needed (backend matches frontend mostly)
        const mappedOrders = res.data.data.map((o: any) => ({
          ...o,
          id: o._id, // map Mongo _id to id
          coordinates: o.coordinates?.lat ? o.coordinates : DEFAULT_RESTAURANT_COORDS,
        }));
        set({ orders: mappedOrders });
      }
    } catch (err) {
      console.error("Error fetching delivery orders:", err);
    }
  },

  fetchDrivers: async () => {
    try {
      const config = getBranchConfig();
      const res = await axios.get(`${API_URL}/delivery/drivers`, config);
      if (res.data.success) {
        const mappedDrivers = res.data.data.map((d: any) => ({
          ...d,
          id: d._id,
          currentLocation: d.currentLocation?.lat ? d.currentLocation : null,
        }));
        set({ drivers: mappedDrivers });
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  },

  fetchVehicles: async () => {
    try {
      const config = getBranchConfig();
      const res = await axios.get(`${API_URL}/delivery/vehicles`, config);
      if (res.data.success) {
        const mappedVehicles = res.data.data.map((v: any) => ({
          ...v,
          id: v._id,
        }));
        set({ vehicles: mappedVehicles });
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  },

  assignDriver: async (orderId, driverId) => {
    try {
      const config = getBranchConfig();
      const res = await axios.post(`${API_URL}/delivery/assign`, {
        orderId,
        driverId,
      }, config);
      if (res.data.success) {
        // Re-fetch to sync state across dashboard
        await Promise.all([get().fetchOrders(), get().fetchDrivers()]);
      }
    } catch (err) {
      console.error("Error assigning driver:", err);
    }
  },

  unassignDriver: async (orderId) => {
    try {
      const config = getBranchConfig();
      const res = await axios.post(`${API_URL}/delivery/unassign`, {
        orderId,
      }, config);
      if (res.data.success) {
        await Promise.all([get().fetchOrders(), get().fetchDrivers()]);
      }
    } catch (err) {
      console.error("Error unassigning driver:", err);
    }
  },

  markDelivered: async (orderId) => {
    try {
      const config = getBranchConfig();
      const res = await axios.post(`${API_URL}/delivery/deliver`, { orderId }, config);
      if (res.data.success) {
        await Promise.all([get().fetchOrders(), get().fetchDrivers()]);
      }
    } catch (err) {
      console.error("Error marking delivery delivered:", err);
    }
  },

  assignVehicle: async (driverId, vehicleId) => {
    try {
      const config = getBranchConfig();
      const res = await axios.post(`${API_URL}/delivery/vehicles/assign`, {
        driverId,
        vehicleId,
      }, config);
      if (res.data.success) {
        await Promise.all([get().fetchDrivers(), get().fetchVehicles()]);
        set({ vehicleModalOpen: false, selectedDriverId: null });
      }
    } catch (err) {
      console.error("Error assigning vehicle:", err);
    }
  },

  unassignVehicle: async (driverId) => {
    try {
      const config = getBranchConfig();
      const res = await axios.delete(`${API_URL}/delivery/vehicles/unassign/${driverId}`, config);
      if (res.data.success) {
        await Promise.all([get().fetchDrivers(), get().fetchVehicles()]);
      }
    } catch (err) {
      console.error("Error unassigning vehicle:", err);
    }
  },

  addVehicle: async (number, label) => {
    try {
      const config = getBranchConfig();
      const res = await axios.post(`${API_URL}/delivery/vehicles`, { number, label }, config);
      if (res.data.success) {
        await get().fetchVehicles();
      }
    } catch (err) {
      console.error("Error adding vehicle:", err);
      throw err;
    }
  },

  updateVehicle: async (id, number, label) => {
    try {
      const config = getBranchConfig();
      const res = await axios.put(`${API_URL}/delivery/vehicles/${id}`, { number, label }, config);
      if (res.data.success) {
        await Promise.all([get().fetchVehicles(), get().fetchDrivers()]);
      }
    } catch (err) {
      console.error("Error updating vehicle:", err);
      throw err;
    }
  },

  deleteVehicle: async (id) => {
    try {
      const config = getBranchConfig();
      const res = await axios.delete(`${API_URL}/delivery/vehicles/${id}`, config);
      if (res.data.success) {
        await Promise.all([get().fetchVehicles(), get().fetchDrivers()]);
      }
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      throw err;
    }
  },

  markDriverAvailable: async (driverId) => {
    try {
      const config = getBranchConfig();
      const res = await axios.post(`${API_URL}/delivery/driver/${driverId}/complete-active`, {}, config);
      if (res.data.success) {
        await Promise.all([get().fetchDrivers(), get().fetchOrders()]);
      }
    } catch (err) {
      console.error("Error marking driver available:", err);
    }
  },

  // ── Real-Time Pusher Actions ──
  initPusher: () => {
    let branchId = "default";
    try {
      const raw = localStorage.getItem("rms_branch");
      if (raw) {
        const b = JSON.parse(raw);
        branchId = b._id || b.id || b.branchId || "default";
      }
    } catch (e) {}

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-restaurant-${branchId}`);
    const ordersChannel = pusher.subscribe(`orders-${branchId}`);

    // Listen for new-order and order-updated from user-frontend
    ordersChannel.bind("new-order", (data: any) => {
      get().fetchOrders();
    });
    ordersChannel.bind("order-updated", (data: any) => {
      get().fetchOrders();
    });

    // 1. Listen for Pusher location events (both client events & server-relay fallback)
    const handleLocationUpdate = (data: any) => {
      const { driverId, lat, lng, bearing, speed } = data;
      set((state) => {
        const updatedDrivers = state.drivers.map((d) => {
          if (d.id === driverId || d._id === driverId) {
            return {
              ...d,
              currentLocation: { lat, lng },
              bearing,
              speed: speed || 0,
              lastEventTime: d.locationUpdatedAt || Date.now(),
              locationUpdatedAt: Date.now(),
            };
          }
          return d;
        });
        return { drivers: updatedDrivers };
      });

      // ── Automated Geofence Checks (100m Customer Deliver & 150m Base Return) ──
      if (lat !== undefined && lng !== undefined) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        const { orders, drivers, restaurantLocation } = get();
        const driver = drivers.find((d) => d.id === driverId || d._id === driverId);

        if (driver) {
          // 1. Customer Proximity Check (100 Meters)
          if (driver.status === "on-delivery" || driver.status === "returning") {
            const activeOrders = orders.filter(
              (o) =>
                (o.status === "en-route" || o.status === "assign") &&
                (o.assignedDriverId === driverId || o.assignedDriverId === driver._id)
            );

            activeOrders.forEach((o) => {
              if (o.coordinates && o.coordinates.lat && o.coordinates.lng) {
                const distM = calculateHaversineMeters(
                  numLat,
                  numLng,
                  Number(o.coordinates.lat),
                  Number(o.coordinates.lng)
                );
                if (distM <= 100) {
                  get().markDelivered(o.id);
                }
              }
            });
          }

          // 2. Restaurant Base Return Proximity Check (150 Meters)
          if (driver.status === "returning") {
            const restCoords = restaurantLocation?.coordinates;
            if (restCoords && restCoords.lat && restCoords.lng) {
              const distRestM = calculateHaversineMeters(
                numLat,
                numLng,
                Number(restCoords.lat),
                Number(restCoords.lng)
              );
              if (distRestM <= 150) {
                get().markDriverAvailable(driver.id);
              }
            }
          }
        }
      }
    };

    channel.bind("client-driver-location", handleLocationUpdate);

    // 2. Listen for Server-triggered assignment status events with optimistic state updates (Option B)
    channel.bind("delivery-assigned", (data: any) => {
      if (!data || !data.orderId) {
        get().fetchOrders();
        get().fetchDrivers();
        return;
      }

      set((state) => {
        const updatedOrders = state.orders.map((o) => {
          if (o.id === data.orderId || o._id === data.orderId) {
            if (data.unassigned) {
              return {
                ...o,
                status: "assign" as const,
                assignedDriverId: null,
                assignmentStatus: null,
              };
            }
            return {
              ...o,
              status: "en-route" as const,
              assignedDriverId: data.driverId || o.assignedDriverId,
              assignmentStatus: "assigned",
            };
          }
          return o;
        });

        const updatedDrivers = state.drivers.map((d) => {
          if (data.driverId && (d.id === data.driverId || d._id === data.driverId)) {
            if (data.unassigned) {
              const activeOrders = (d.activeOrders || []).filter(
                (oid) => oid !== data.orderId
              );
              return {
                ...d,
                activeOrders,
                status: activeOrders.length === 0 ? ("available" as const) : d.status,
              };
            }
            const activeOrders = Array.from(
              new Set([...(d.activeOrders || []), data.orderId])
            );
            return {
              ...d,
              status: "on-delivery" as const,
              activeOrders,
            };
          }
          return d;
        });

        return { orders: updatedOrders, drivers: updatedDrivers };
      });

      // Fallback: If order or driver was not present in local state, fetch from server
      const { orders, drivers } = get();
      const hasOrder = orders.some((o) => o.id === data.orderId || o._id === data.orderId);
      const hasDriver = data.driverId ? drivers.some((d) => d.id === data.driverId || d._id === data.driverId) : true;
      if (!hasOrder || !hasDriver) {
        get().fetchOrders();
        get().fetchDrivers();
      }
    });

    channel.bind("delivery-status-update", (data: any) => {
      if (!data || !data.orderId) {
        get().fetchOrders();
        get().fetchDrivers();
        return;
      }

      set((state) => {
        const updatedOrders = state.orders.map((o) => {
          if (o.id === data.orderId || o._id === data.orderId) {
            const isDeliveredOrCompleted =
              data.status === "delivered" || data.status === "completed";
            return {
              ...o,
              status: isDeliveredOrCompleted ? ("delivered" as const) : ("en-route" as const),
              assignmentStatus: data.status,
              deliveredAt: isDeliveredOrCompleted ? data.timestamp || new Date().toISOString() : o.deliveredAt,
            };
          }
          return o;
        });

        const updatedDrivers = state.drivers.map((d) => {
          if (data.driverId && (d.id === data.driverId || d._id === data.driverId)) {
            const activeOrders = (d.activeOrders || []).filter((oid) => oid !== data.orderId);
            let nextStatus = d.status;
            if (data.status === "delivered") {
              nextStatus = activeOrders.length === 0 ? "returning" : "on-delivery";
            } else if (data.status === "completed") {
              nextStatus = activeOrders.length === 0 ? "available" : "on-delivery";
            }
            return {
              ...d,
              activeOrders,
              status: nextStatus,
            };
          }
          return d;
        });

        return { orders: updatedOrders, drivers: updatedDrivers };
      });
    });

    channel.bind("driver-status-change", (data: any) => {
      if (!data || !data.driverId) {
        get().fetchDrivers();
        return;
      }

      set((state) => {
        const updatedDrivers = state.drivers.map((d) => {
          if (d.id === data.driverId || d._id === data.driverId) {
            return {
              ...d,
              status: data.status,
              activeOrders: data.status === "available" ? [] : d.activeOrders,
            };
          }
          return d;
        });
        return { drivers: updatedDrivers };
      });
    });
  },

  cleanupPusher: () => {
    let branchId = "default";
    try {
      const raw = localStorage.getItem("rms_branch");
      if (raw) {
        const b = JSON.parse(raw);
        branchId = b._id || b.id || b.branchId || "default";
      }
    } catch (e) {}

    const pusher = getPusherClient();
    pusher.unsubscribe(`private-restaurant-${branchId}`);
    pusher.unsubscribe(`orders-${branchId}`);
  },
}));
