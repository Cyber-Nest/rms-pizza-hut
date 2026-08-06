export interface DeliveryOrder {
  id: string;
  _id?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  coordinates: { lat: number; lng: number };
  status: 'assign' | 'en-route' | 'delivered';
  assignmentStatus?: string | null;
  assignedDriverId: string | null;
  duration: string;
  timeOrdered: string;
  createdAt?: string;
  orderTiming?: string;
  scheduledAt?: string | null;
  deliveredAt?: string | null;
  items: string[];
  total: number;
}

export interface Vehicle {
  id: string;
  _id?: string;
  number: string;
  label: string;
  isAssigned: boolean;
  assignedDriverId: string | null;
}

export interface Driver {
  id: string;
  _id?: string;
  driverId?: string;
  name: string;
  phone: string;
  status: 'available' | 'on-delivery' | 'returning' | 'offline';
  currentLocation: { lat: number; lng: number };
  color: string;
  activeOrders: string[];
  assignedVehicle: Vehicle | null;
  posCheckedIn?: boolean;
  bearing?: number; // bearing direction (0-360)
  speed?: number; // speed in km/h from GPS
  locationUpdatedAt?: number; // last updated timestamp
  lastEventTime?: number; // timestamp of previous event (for adaptive animation)
}

export interface RestaurantLocation {
  name: string;
  coordinates: { lat: number | null; lng: number | null };
}

