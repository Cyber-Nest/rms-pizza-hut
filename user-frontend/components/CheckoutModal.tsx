"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CreditCard,
  ArrowRight,
  AlertCircle,
  ShoppingBag,
  Locate,
  Truck,
  Heart,
  Tag,
} from "lucide-react";
import { CartItem } from "../types";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import axios from "axios";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { isBranchCurrentlyOpen, generateValidTimeSlotsForBranch } from "../lib/storeTimingUtils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51PxxxxxxxxxYOUR_TEST_KEYxxxxxxxx",
);

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBranch: any;
  cartItems: CartItem[];
  orderType: "delivery" | "takeout";
  setOrderType: (type: "delivery" | "takeout") => void;
  address: string;
  setAddress: (addr: string) => void;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  onSubmit: (orderPayload: any) => Promise<void>;
  isSubmitting?: boolean;
}

export default function CheckoutModal(props: CheckoutModalProps) {
  if (!props.isOpen) return null;
  return (
    <Elements stripe={stripePromise}>
      <CheckoutModalInner {...props} />
    </Elements>
  );
}

function CheckoutModalInner({
  isOpen,
  onClose,
  selectedBranch,
  cartItems,
  orderType,
  setOrderType,
  address,
  setAddress,
  subtotal,
  tax,
  deliveryFee,
  total,
  onSubmit,
  isSubmitting = false,
}: CheckoutModalProps) {
  const { branchTaxRate } = useCart();
  // Customer details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressInput, setAddressInput] = useState(address);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Promo state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setValidatingPromo(true);
    setPromoError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const branchId = selectedBranch?._id || selectedBranch?.id;
      const res = await axios.post(`${apiUrl}/promos/validate`, {
        code: promoCodeInput.trim(),
        channel: "online",
        branchId,
        subtotal,
        items: cartItems,
      });

      if (res.data.success && res.data.data) {
        setAppliedPromo(res.data.data);
        toast.success(`Promo "${res.data.data.code}" applied! -$${res.data.data.discountAmount.toFixed(2)}`);
      } else {
        setPromoError(res.data.message || "Invalid promo code.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to validate promo code.";
      setPromoError(msg);
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError("");
  };

  const promoDiscountAmount = useMemo(() => {
    return appliedPromo ? Number(appliedPromo.discountAmount || 0) : 0;
  }, [appliedPromo]);

  const discountedSubtotal = useMemo(() => {
    return Math.max(0, (subtotal || 0) - promoDiscountAmount);
  }, [subtotal, promoDiscountAmount]);

  const calculatedTax = useMemo(() => {
    const rate = (branchTaxRate || 5) / 100;
    return Math.round(discountedSubtotal * rate * 100) / 100;
  }, [discountedSubtotal, branchTaxRate]);

  // Tip state ($0, $1, $3, $5, $10, custom)
  const [tipOption, setTipOption] = useState<"0" | "1" | "3" | "5" | "10" | "custom">("3");
  const [customTipInput, setCustomTipInput] = useState("");

  const tipAmount = useMemo(() => {
    if (tipOption === "custom") {
      const parsed = parseFloat(customTipInput);
      return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100;
    }
    return parseFloat(tipOption) || 0;
  }, [tipOption, customTipInput]);

  const finalTotal = useMemo(() => {
    return Math.round((discountedSubtotal + calculatedTax + (orderType === "delivery" ? (deliveryFee || 0) : 0) + tipAmount) * 100) / 100;
  }, [discountedSubtotal, calculatedTax, orderType, deliveryFee, tipAmount]);

  const getTodayLocalString = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  };

  // Evaluate real-time store timing status
  const branchStatus = useMemo(() => {
    return isBranchCurrentlyOpen(selectedBranch);
  }, [selectedBranch]);

  // Timing states
  const [timingMode, setTimingMode] = useState<"now" | "later">("now");
  const [selectedDate, setSelectedDate] = useState<string>(
    getTodayLocalString(),
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  // Force timingMode to 'later' if store is currently closed/unopened
  useEffect(() => {
    if (!branchStatus.isOpen) {
      setTimingMode("later");
    }
  }, [branchStatus.isOpen]);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "stripe"
  >("stripe");
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [isCardFocused, setIsCardFocused] = useState(false);

  // GPS locating state
  const [isLocating, setIsLocating] = useState(false);

  // Form validity validator
  const isFormInvalid = useMemo(() => {
    if (!name.trim()) return true;
    if (!phone.trim() || phone.trim().replace(/\D/g, "").length !== 10)
      return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) return true;
    if (orderType === "delivery" && !addressInput.trim()) return true;
    if (timingMode === "later" && (!selectedDate || !selectedTimeSlot))
      return true;
    if (paymentMethod === "stripe" && !isCardComplete) return true;
    return false;
  }, [
    name,
    phone,
    email,
    orderType,
    addressInput,
    timingMode,
    selectedDate,
    selectedTimeSlot,
    paymentMethod,
    isCardComplete,
  ]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    toast.loading("Fetching your location...", { id: "locating" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en-US,en;q=0.9",
              },
            },
          );

          if (response.data && response.data.display_name) {
            const fullAddress = response.data.display_name;
            setAddressInput(fullAddress);
            toast.success("Location updated!", { id: "locating" });
          } else {
            setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            toast.success("Coordinates captured!", { id: "locating" });
          }
        } catch (error) {
          console.error("Error reverse geocoding location:", error);
          setAddressInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success("Coordinates captured (Reverse geocoding failed)!", {
            id: "locating",
          });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        let errorMsg = "Failed to get your location";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg =
            "Location permission denied. Please allow location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location position unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out.";
        }
        toast.error(errorMsg, { id: "locating" });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Sync addressInput with context address
  useEffect(() => {
    setAddressInput(address);
  }, [address]);

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

  // Generate 15-minute time slots dynamically based on branch operating hours
  const timeSlots = useMemo(() => {
    return generateValidTimeSlotsForBranch(selectedBranch, selectedDate);
  }, [selectedBranch, selectedDate]);

  // Select first slot by default when timeSlots change
  useEffect(() => {
    if (timeSlots.length > 0 && !selectedTimeSlot) {
      setSelectedTimeSlot(timeSlots[0]);
    }
  }, [timeSlots, selectedTimeSlot]);

  const stripe = useStripe();
  const elements = useElements();
  const [isStripeProcessing, setIsStripeProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Please enter your name");
    if (!phone.trim() || phone.replace(/\D/g, "").length !== 10)
      return toast.error("Please enter a valid 10-digit phone number");
    if (!email.trim()) return toast.error("Please enter your email");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return toast.error("Please enter a valid email address");
    if (orderType === "delivery" && !addressInput.trim())
      return toast.error("Please enter a delivery address");

    let lat = coords?.lat || null;
    let lng = coords?.lng || null;

    if (orderType === "delivery" && !lat && !lng) {
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=1`
        );
        if (response.data && response.data.length > 0) {
          lat = parseFloat(response.data[0].lat);
          lng = parseFloat(response.data[0].lon);
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }

    // Parse scheduled date if timingMode is 'later'
    let scheduledAt: Date | null = null;
    let dueAt: Date | null = null;

    if (timingMode === "later" && selectedTimeSlot) {
      const [time, modifier] = selectedTimeSlot.split(" ");
      let [hoursStr, minutesStr] = time.split(":");
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const targetDate = new Date(selectedDate + "T00:00:00");
      targetDate.setHours(hours, minutes, 0, 0);
      scheduledAt = targetDate;
      dueAt = targetDate;
    } else {
      // ASAP order: due time is current time + prep estimation
      // Let's set default due date to 30 mins from now
      const targetDate = new Date();
      targetDate.setMinutes(targetDate.getMinutes() + 30);
      dueAt = targetDate;
    }

    let paymentIntentId = "";
    let paymentStatus = "unpaid";

    if (paymentMethod === "stripe") {
      if (!stripe || !elements) {
        return toast.error("Stripe has not loaded yet. Please try again.");
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      setIsStripeProcessing(true);
      const toastId = toast.loading("Initiating secure card payment...");

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

        // 1. Create PaymentIntent on the backend
        const response = await axios.post(
          `${apiUrl}/payments/create-payment-intent`,
          {
            amount: finalTotal,
          },
        );

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to initialize transaction",
          );
        }

        const { clientSecret, paymentIntentId: piId } = response.data;
        paymentIntentId = piId;

        toast.loading("Confirming card payment details...", { id: toastId });

        // 2. Confirm card payment with Stripe
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: name,
              phone: phone,
              email: email || undefined,
            },
          },
        });

        if (result.error) {
          throw new Error(
            result.error.message || "Payment authorization failed",
          );
        }

        if (result.paymentIntent?.status === "succeeded") {
          paymentStatus = "paid";
          toast.success("Payment verified successfully!", { id: toastId });
        } else {
          throw new Error("Payment was not completed successfully.");
        }
      } catch (error: any) {
        toast.error(error.message || "Stripe payment failed.", { id: toastId });
        setIsStripeProcessing(false);
        return;
      } finally {
        setIsStripeProcessing(false);
      }
    }

    // Save address back to context if it was updated
    if (orderType === "delivery" && addressInput !== address) {
      setAddress(addressInput);
    }

    // Construct the Mongoose Order Payload
    const orderPayload = {
      orderType: orderType, // backend will need this, e.g. "takeout" or "delivery"
      orderSource: "online",
      items: cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        image: item.image || "",
        basePrice: item.basePrice,
        selectedModifiers: item.selectedModifiers,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        note: item.note || "",
        kitchenLabel: item.kitchenLabel || 'chicken',
      })),
      subtotal: subtotal,
      discount: promoDiscountAmount,
      discountType: appliedPromo ? "promo" : "none",
      promoCode: appliedPromo ? appliedPromo.code : "",
      tax: calculatedTax,
      taxRate: (branchTaxRate || 5) / 100,
      deliveryFee: orderType === "delivery" ? deliveryFee : 0,
      tip: tipAmount,
      total: finalTotal,
      paymentTiming: paymentMethod === "stripe" ? "pay-now" : "pay-later", // Stripe is paid immediately
      paymentType: "one-time",
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod, // stripe, cash, or card (terminal)
      paymentIntentId: paymentIntentId || undefined,
      payments: [],
      orderTiming: timingMode,
      scheduledAt: scheduledAt,
      dueAt: dueAt,
      customer: {
        name: name,
        phone: phone,
        email: email || "",
        address: orderType === "delivery" ? addressInput : "",
        lat: orderType === "delivery" ? lat : null,
        lng: orderType === "delivery" ? lng : null,
      },
      notes: notes,
      status: "pending",
    };

    onSubmit(orderPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
      />

      {/* Slide-over Container */}
      <div className="relative w-full md:max-w-[34rem] h-[92vh] md:h-full bg-white rounded-t-3xl md:rounded-t-none md:rounded-l-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-slide-up-mobile md:animate-drawer-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <ShoppingBag size={15} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                Checkout
              </p>
              <h3 className="text-xs font-black text-neutral-900 leading-tight mt-1">
                Complete Your Order
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0 no-scrollbar pb-24"
        >
          {/* Order Mode Toggle */}
          <div className="space-y-2">
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
              Order Option
            </label>
            <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-xl border border-neutral-200/50">
              <button
                type="button"
                onClick={() => setOrderType("takeout")}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  orderType === "takeout"
                    ? "bg-white text-neutral-800 shadow-sm border border-neutral-200/20"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <ShoppingBag
                  size={13}
                  className={
                    orderType === "takeout"
                      ? "text-brand-primary"
                      : "text-neutral-400"
                  }
                />
                <span>Takeout</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType("delivery")}
                className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  orderType === "delivery"
                    ? "bg-white text-neutral-800 shadow-sm border border-neutral-200/20"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Truck
                  size={13}
                  className={
                    orderType === "delivery"
                      ? "text-brand-primary"
                      : "text-neutral-400"
                  }
                />
                <span>Delivery</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
              Contact Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                  Full Name *
                </label>
                <div className="relative">
                  <User
                    size={13}
                    className="absolute left-3 top-3 text-neutral-400"
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, ""); // Strip out numbers
                      const capitalized = val
                        .split(" ")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");
                      setName(capitalized);
                    }}
                    placeholder="Enter your name"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone
                    size={13}
                    className="absolute left-3 top-3 text-neutral-400"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(val);
                    }}
                    placeholder="Enter 10-digit number"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                {phone.length > 0 && phone.length < 10 && (
                  <p className="text-[9.5px] text-red-500 font-semibold mt-1">
                    Must be exactly 10 digits (Current: {phone.length}/10)
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                Email Address *
              </label>
              <div className="relative">
                <Mail
                  size={13}
                  className="absolute left-3 top-3 text-neutral-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address (Conditional) */}
          {orderType === "delivery" && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
                Delivery Destination
              </h4>
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                  Delivery Address *
                </label>
                <div className="relative flex items-center">
                  <MapPin
                    size={13}
                    className="absolute left-3 text-brand-primary"
                  />
                  <input
                    type="text"
                    required
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Enter apartment, street address, Strathmore, AB"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    title="Use GPS current location"
                    className="absolute right-3 p-1.5 text-neutral-400 hover:text-brand-primary disabled:text-neutral-300 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Locate
                      size={14}
                      className={
                        isLocating ? "animate-spin text-brand-primary" : ""
                      }
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timing & Scheduling */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 pb-1">
              Timing Preferences
            </h4>

            {!branchStatus.isOpen && (
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-amber-800 text-[11px] font-medium leading-relaxed">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-900">ASAP Ordering Unavailable</span>
                  <span>{branchStatus.reason}. Immediate (ASAP) order is disabled. Please select a valid time slot below to schedule your order.</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!branchStatus.isOpen}
                onClick={() => branchStatus.isOpen && setTimingMode("now")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  !branchStatus.isOpen
                    ? "opacity-40 bg-neutral-100 border-neutral-200 cursor-not-allowed"
                    : timingMode === "now"
                    ? "border-brand-primary bg-orange-50/20 ring-1 ring-brand-primary cursor-pointer"
                    : "border-neutral-200 bg-white hover:bg-neutral-50 cursor-pointer"
                }`}
              >
                <Clock
                  size={15}
                  className={
                    timingMode === "now" && branchStatus.isOpen
                      ? "text-brand-primary"
                      : "text-neutral-400"
                  }
                />
                <span className="text-[10.5px] font-bold mt-1 text-neutral-800">
                  ASAP
                </span>
                <span className="text-[8.5px] text-neutral-400 mt-0.5">
                  {orderType === "delivery"
                    ? "Prep + 1h Delivery"
                    : "Ready in 40-45m"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingMode("later")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  timingMode === "later"
                    ? "border-brand-primary bg-orange-50/20 ring-1 ring-brand-primary"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <Clock
                  size={15}
                  className={
                    timingMode === "later"
                      ? "text-brand-primary"
                      : "text-neutral-400"
                  }
                />
                <span className="text-[10.5px] font-bold mt-1 text-neutral-800">
                  Schedule Later
                </span>
                <span className="text-[8.5px] text-neutral-400 mt-0.5">
                  Select time slot
                </span>
              </button>
            </div>

            {/* Date & Time selection if scheduling for later */}
            {timingMode === "later" && (
              <div className="space-y-3 animate-scale-up">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-neutral-550 uppercase tracking-wide">
                    Select Date *
                  </label>
                  <input
                    type="date"
                    min={getTodayLocalString()}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTimeSlot("");
                    }}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-700 font-bold focus:outline-none focus:border-brand-primary cursor-pointer"
                  />
                </div>

                {/* Time slot dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-neutral-550 uppercase tracking-wide">
                    Select Time Slot *
                  </label>
                  {timeSlots.length > 0 ? (
                    <select
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-700 font-bold focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value="" disabled hidden>
                        -- Select time --
                      </option>
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5 p-3 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-semibold">
                      <AlertCircle size={12} />
                      <span>No time slots available for this date.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stripe Card Element Input */}
          <div className="space-y-2 animate-scale-up p-4 bg-neutral-50 border border-neutral-200/60 rounded-2xl">
            <label className="block text-[9px] font-bold text-neutral-555 uppercase tracking-wide">
              Credit or Debit Card Details *
            </label>
            <div
              className={`bg-white border rounded-xl px-3.5 py-3.5 shadow-3xs transition-all duration-200 ${
                isCardFocused
                  ? "border-brand-primary ring-2 ring-brand-primary/10"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <CardElement
                onFocus={() => setIsCardFocused(true)}
                onBlur={() => setIsCardFocused(false)}
                onChange={(e) => setIsCardComplete(e.complete)}
                options={{
                  hidePostalCode: true,
                  style: {
                    base: {
                      fontSize: "13.5px",
                      color: "#262626",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      "::placeholder": {
                        color: "#a3a3a3",
                      },
                    },
                    invalid: {
                      color: "#dc2626",
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* TIP SELECTION SECTION */}
          <div className="space-y-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={13} className="text-brand-primary fill-brand-primary/20" />
                <span>Add Tip for Driver</span>
              </label>
              {tipAmount > 0 && (
                <span className="text-xs font-black text-brand-primary">
                  +${tipAmount.toFixed(2)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: "No Tip", value: "0" },
                { label: "$1", value: "1" },
                { label: "$3", value: "3" },
                { label: "$5", value: "5" },
                { label: "$10", value: "10" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setTipOption(preset.value as any);
                    setCustomTipInput("");
                  }}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                    tipOption === preset.value
                      ? "bg-brand-primary text-white border-brand-primary shadow-sm shadow-brand-primary/20 scale-[1.02]"
                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/80"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Tip Input */}
            {/* <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                Custom Tip ($):
              </span>
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="e.g. 7.50"
                value={customTipInput}
                onChange={(e) => {
                  setCustomTipInput(e.target.value);
                  setTipOption("custom");
                }}
                className={`w-full pl-32 pr-4 py-2 bg-neutral-50/80 border rounded-xl text-xs font-bold text-neutral-800 focus:outline-none focus:bg-white transition-all ${
                  tipOption === "custom"
                    ? "border-brand-primary ring-2 ring-brand-primary/10"
                    : "border-neutral-200"
                }`}
              />
            </div> */}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
              {orderType === "delivery"
                ? "Delivery Instructions (Optional)"
                : "Special Prep Notes (Optional)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                orderType === "delivery"
                  ? "E.g., Leave at the door, call when arrived..."
                  : "E.g., Extra napkins, plastic utensils..."
              }
              rows={2}
              className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none"
            />
          </div>

          {/* PROMO CODE APPLY SECTION */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Have a Promo Code?</span>
              {appliedPromo && (
                <span className="text-[9.5px] font-bold text-emerald-600">
                  -${appliedPromo.discountAmount.toFixed(2)} OFF
                </span>
              )}
            </label>

            {appliedPromo ? (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-emerald-600" />
                  <div>
                    <p className="text-xs font-black text-emerald-900 font-mono">
                      {appliedPromo.code}
                    </p>
                    <p className="text-[9.5px] text-emerald-700 font-semibold">
                      Saving ${appliedPromo.discountAmount.toFixed(2)} on your order
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-[10px] font-extrabold text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      setPromoError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyPromo();
                      }
                    }}
                    placeholder="Enter Promo Code (e.g. WELCOME50)"
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-neutral-800 uppercase tracking-wider focus:outline-none focus:border-brand-primary placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={validatingPromo || !promoCodeInput.trim()}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {validatingPromo ? "Validating..." : "Apply"}
                </button>
              </div>
            )}

            {promoError && (
              <p className="text-[10px] text-red-500 font-bold bg-red-50 border border-red-100 rounded-lg p-2">
                ⚠️ {promoError}
              </p>
            )}
          </div>

          {/* Pricing Totals box */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/50 space-y-2">
            <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {promoDiscountAmount > 0 && (
              <div className="flex justify-between text-[10px] text-amber-600 font-bold">
                <span>Promo Discount ({appliedPromo?.code})</span>
                <span>-${promoDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {orderType === "delivery" && (
              <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
              <span>GST ({branchTaxRate}%)</span>
              <span>${calculatedTax.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-[10px] text-brand-primary font-bold">
                <span>Tip (Driver)</span>
                <span>+${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black text-neutral-800 border-t border-neutral-200/70 pt-2">
              <span>Total Amount</span>
              <span className="text-sm text-brand-primary">
                ${finalTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </form>

        {/* Footer Fixed Placed Order Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-100 bg-white flex items-center justify-between gap-4 z-20">
          <div className="min-w-0">
            <p className="text-[8px] text-neutral-400 font-extrabold uppercase tracking-wide">
              Total Order Price
            </p>
            <p className="text-[14px] font-black text-neutral-800">
              ${finalTotal.toFixed(2)}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isFormInvalid || isSubmitting || isStripeProcessing}
            className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              isFormInvalid || isSubmitting || isStripeProcessing
                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                : "bg-brand-primary hover:bg-brand-primary-hover text-white shadow-lg shadow-brand-primary/10 active:scale-[0.98] cursor-pointer"
            }`}
          >
            {isSubmitting || isStripeProcessing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>
                  {isStripeProcessing
                    ? "Processing Payment..."
                    : "Placing Order..."}
                </span>
              </>
            ) : (
              <>
                <span>
                  Place {orderType === "delivery" ? "Delivery" : "Pickup"} Order
                </span>
                <ArrowRight size={13} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
