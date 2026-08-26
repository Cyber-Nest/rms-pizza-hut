import { CartItem } from "./cart";

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  postalCode?: string;
  driverNotes?: string;
  lat?: number;
  lng?: number;
}

export interface VehicleInfo {
  vehicleNumber: string;
  customerName: string;
  phone: string;
}

export interface TableInfo {
  id: string;
  name: string;
  status: "available" | "occupied" | "reserved";
}

export interface SplitPayment {
  method: "cash" | "card" | "credit" | "debit";
  amount: number;
  personName?: string;
  cashGiven?: number;
  changeGiven?: number;
  transactionId?: string;
  cardBrand?: string;
  cardFunding?: string;
  cardLast4?: string;
}

export interface PromoApplied {
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  discountAmount: number;
}

export interface Order {
  hasPizza: boolean;
  hasWings: boolean;
  refundedAt: any;
  deliveryFee: number | undefined;
  tip?: number;
  kitchenCleared: any;
  _id?: string;
  orderNumber: string;
  orderType: "takeout" | "delivery" | "drive-through" | "dine-in";
  orderSource: "pos" | "online" | "doordash" | "skip" | "ubereats";
  table: TableInfo | null;
  customer: CustomerInfo | null;
  vehicle: VehicleInfo | null;
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  discountType: "none" | "promo" | "percentage" | "flat";
  promoCode: string;
  total: number;
  // Payment
  paymentTiming: "pay-now" | "pay-later";
  paymentType: "one-time" | "split";
  paymentStatus: "paid" | "unpaid" | "refunded";
  payments: SplitPayment[];
  // Scheduling
  orderTiming: "now" | "later";
  scheduledAt: string | null;
  dueAt?: string | null;
  notes: string;
  driverNotes?: string;
  status: "pending" | "preparing" | "in_oven" | "ready" | "completed" | "cancelled";
  makeTableStatus?: "pending" | "preparing" | "in_oven" | "ready" | "completed";
  wingsStatus?: "pending" | "preparing" | "ready" | "completed";
  receptionCompleted?: boolean;
  statusHistory?: Array<{ status: string; changedAt: string; note?: string; userName?: string }>;
  createdAt: string;
}
