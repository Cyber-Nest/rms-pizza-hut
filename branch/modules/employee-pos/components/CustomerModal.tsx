"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Bell, Keyboard, Check, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { usePosStore } from "../store/pos.store";

// Helper function to geocode manual address inputs (Primary: Canada with postal code, Fallback: Global)
const geocodeManualAddress = async (
  address: string,
  postalCode?: string,
): Promise<{ lat: number; lng: number } | null> => {
  const cleanAddr = (address || "").trim();
  const cleanPostal = (postalCode || "").trim();
  if (!cleanAddr) return null;

  const combinedQuery = `${cleanAddr}${cleanPostal ? " " + cleanPostal : ""}`;

  try {
    // 1. Primary Priority: Search in CANADA first (with postal code if provided)
    const caQuery = `${combinedQuery}, Canada`;
    const resCa = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&addressdetails=1&limit=1&q=${encodeURIComponent(caQuery)}`,
    );
    const jsonCa = await resCa.json();
    if (Array.isArray(jsonCa) && jsonCa.length > 0) {
      return { lat: parseFloat(jsonCa[0].lat), lng: parseFloat(jsonCa[0].lon) };
    }

    // Try Photon Canada
    const photonCa = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(caQuery)}&limit=3&bbox=-141.0,41.7,-52.6,83.1`,
    );
    const photonCaJson = await photonCa.json();
    if (photonCaJson?.features?.length > 0) {
      const caMatch = photonCaJson.features.find((f: any) => {
        const cc = (
          f.properties?.countrycode ||
          f.properties?.country_code ||
          ""
        ).toLowerCase();
        return cc === "ca" || f.properties?.country === "Canada";
      });
      if (caMatch) {
        const coords = caMatch.geometry.coordinates;
        return { lat: coords[1], lng: coords[0] };
      }
    }

    // 2. Secondary Priority: Fallback to GLOBAL (India, US, UK, etc.)
    const resGlobal = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(combinedQuery)}`,
    );
    const jsonGlobal = await resGlobal.json();
    if (Array.isArray(jsonGlobal) && jsonGlobal.length > 0) {
      return {
        lat: parseFloat(jsonGlobal[0].lat),
        lng: parseFloat(jsonGlobal[0].lon),
      };
    }

    const photonGlobal = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(combinedQuery)}&limit=1`,
    );
    const photonGlobalJson = await photonGlobal.json();
    if (photonGlobalJson?.features?.length > 0) {
      const coords = photonGlobalJson.features[0].geometry.coordinates;
      return { lat: coords[1], lng: coords[0] };
    }
  } catch (err) {
    console.warn("Manual Geocoding Error:", err);
  }

  return null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface FormValues {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  searchQuery: string;
  searchAddress: string;
}

interface AddressSuggestion {
  displayName: string;
  address: string;
  postalCode: string;
  lat: number;
  lng: number;
}



const KEYBOARD_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["Caps Lock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["@", ".", "z", "x", "c", "v", "b", "n", "m", ",", "/", "Shift"],
  ["Space"],
];

export default function CustomerModal({ isOpen, onClose }: Props) {
  const { setCustomer, selectedCustomer } = usePosStore();
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [activeField, setActiveField] = useState<keyof FormValues | null>(null);
  const [capsLock, setCapsLock] = useState(false);
  const [addressTab, setAddressTab] = useState<"auto" | "manual">("auto");
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = React.useRef<AbortController | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(
    selectedCustomer?.lat && selectedCustomer?.lng
      ? { lat: selectedCustomer.lat, lng: selectedCustomer.lng }
      : null,
  );

  const nameParts = (selectedCustomer?.name || "").trim().split(/\s+/);
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";

  const { register, handleSubmit, reset, setValue, getValues, watch } =
    useForm<FormValues>({
      defaultValues: {
        phone: selectedCustomer?.phone || "",
        email: (selectedCustomer as any)?.email || "",
        firstName: initialFirstName,
        lastName: initialLastName,
        address: selectedCustomer?.address || "",
        postalCode: selectedCustomer?.postalCode || "",
        searchQuery: "",
        searchAddress: "",
      },
    });

  const watchSearchQuery = watch("searchQuery");
  const watchSearchAddress = watch("searchAddress");

  // Sync with changes when opening
  useEffect(() => {
    if (isOpen) {
      const nameParts = (selectedCustomer?.name || "").trim().split(/\s+/);
      const first = nameParts[0] || "";
      const last = nameParts.slice(1).join(" ") || "";
      reset({
        phone: selectedCustomer?.phone || "",
        email: (selectedCustomer as any)?.email || "",
        firstName: first,
        lastName: last,
        address: selectedCustomer?.address || "",
        postalCode: selectedCustomer?.postalCode || "",
        searchQuery: "",
        searchAddress: "",
      });
      setSelectedCoords(
        selectedCustomer?.lat && selectedCustomer?.lng
          ? { lat: selectedCustomer.lat, lng: selectedCustomer.lng }
          : null,
      );
      setActiveField("phone");
    }
  }, [isOpen, selectedCustomer, reset]);

  const addressCacheRef = React.useRef<Map<string, AddressSuggestion[]>>(
    new Map(),
  );

  // Lightning Fast Canada-Only Autocomplete (Nominatim structured search + cache + AbortController)
  useEffect(() => {
    const query = (watchSearchAddress || "").trim();
    if (query.length < 2) {
      setAddressSuggestions([]);
      return;
    }

    const cacheKey = query.toLowerCase();

    // 0ms instant response from cache
    if (addressCacheRef.current.has(cacheKey)) {
      setAddressSuggestions(addressCacheRef.current.get(cacheKey)!);
      return;
    }

    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        // Nominatim structured Canada search (countrycodes=ca ensures ONLY Canada results)
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ca&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          signal: abortController.signal,
          headers: { "Accept-Language": "en" },
        });
        const json = await res.json();

        if (Array.isArray(json) && json.length > 0) {
          const parsed: AddressSuggestion[] = json.map((item: any) => {
            const addr = item.address || {};
            const houseNumber = addr.house_number || "";
            const road =
              addr.road || addr.street || addr.pedestrian || addr.footway || "";
            const streetStr = houseNumber ? `${houseNumber} ${road}` : road;
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.suburb ||
              addr.county ||
              "";
            const province = addr.state || "";
            const postcode = addr.postcode || "";
            const parts = [
              streetStr || item.name || "",
              city,
              province,
              postcode,
              "Canada",
            ].filter(Boolean);
            const fullAddr = parts.join(", ");
            return {
              displayName: fullAddr,
              address: fullAddr,
              postalCode: postcode,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            };
          });

          // Deduplicate
          const seen = new Set<string>();
          const unique = parsed.filter((item) => {
            const key = item.address.toLowerCase().slice(0, 40);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          addressCacheRef.current.set(cacheKey, unique);
          setAddressSuggestions(unique);
        } else {
          setAddressSuggestions([]);
        }
      } catch (err: any) {
        if (err.name !== "AbortError")
          console.error("Autocomplete error:", err);
      } finally {
        if (!abortController.signal.aborted) setIsSearchingAddress(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [watchSearchAddress]);

  const watchAddress = watch("address");
  const watchPostalCode = watch("postalCode");

  // Live Geocoding for manual address inputs (Canada Priority -> Global Fallback)
  useEffect(() => {
    if (
      addressTab !== "manual" ||
      !watchAddress ||
      watchAddress.trim().length < 3
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      const coords = await geocodeManualAddress(watchAddress, watchPostalCode);
      if (coords) {
        setSelectedCoords(coords);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [watchAddress, watchPostalCode, addressTab]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    const cleanPhone = data.phone.trim().replace(/\D/g, "");
    if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    const customerName =
      `${data.firstName || ""} ${data.lastName || ""}`.trim();
    const finalName = customerName || "No Name";

    let finalLat = selectedCoords?.lat || null;
    let finalLng = selectedCoords?.lng || null;

    // If manual address or lat/lng not set yet, perform Canada-priority geocoding lookup
    if (data.address && (!finalLat || !finalLng)) {
      const coords = await geocodeManualAddress(data.address, data.postalCode);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
      }
    }

    setCustomer({
      name: finalName,
      phone: cleanPhone,
      email: data.email || undefined,
      address: data.address || undefined,
      postalCode: data.postalCode || undefined,
      lat: finalLat || undefined,
      lng: finalLng || undefined,
    });
    toast.success(`Customer ${finalName} set for order.`);
    onClose();
  };

  // Validate & smart-sanitize the search field on every keystroke + auto-sync to phone/email
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setSearchError(null);

    // If purely digits → phone mode: cap at 10 and auto-sync to Enter Phone # field
    const digitsOnly = val.replace(/\D/g, "");
    if (/^\d*$/.test(val)) {
      val = digitsOnly.slice(0, 10);
      setValue("phone", val);
    } else if (val.includes("@") || /[a-zA-Z]/.test(val)) {
      // Auto-sync to Enter Email Address field
      setValue("email", val);
    }

    setValue("searchQuery", val);
  };

  const handleSearch = async (queryOverride?: string) => {
    const query = (queryOverride ?? watchSearchQuery ?? "").trim();
    setSearchError(null);

    if (!query || query.length < 3) {
      setSearchError("Enter at least 3 characters.");
      return;
    }

    const isPhone = /^\d+$/.test(query);
    const hasAt = query.includes("@");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (isPhone && query.length !== 10) {
      setSearchError("Phone number must be exactly 10 digits.");
      return;
    }

    if (hasAt && !emailRegex.test(query)) {
      setSearchError("Enter a valid email address (e.g. john@email.com).");
      return;
    }

    // Cancel any previous in-flight request
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const abort = new AbortController();
    searchAbortRef.current = abort;

    setIsSearchingCustomer(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(
        `${apiUrl}/orders/customers/search?query=${encodeURIComponent(query)}`,
        { signal: abort.signal, credentials: "include" },
      );
      if (abort.signal.aborted) return;
      const json = await res.json();
      if (json.success && json.data) {
        const found = json.data;
        setValue("phone", found.phone || "");
        setValue("email", found.email || "");
        setValue("firstName", found.firstName || "");
        setValue("lastName", found.lastName || "");
        setValue("address", found.address || "");
        setValue("postalCode", found.postalCode || "");
        toast.success(
          ` Customer loaded: ${found.firstName} ${found.lastName}`.trim(),
        );
      } else {
        toast.error("No customer found in our database.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Search failed. Please try again.");
      }
    } finally {
      if (!abort.signal.aborted) setIsSearchingCustomer(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleKeyPress = (key: string) => {
    if (!activeField) return;
    const currentVal = getValues(activeField) || "";

    let newVal = "";
    if (key === "Backspace") {
      newVal = currentVal.slice(0, -1);
    } else if (key === "Space") {
      newVal = currentVal + " ";
    } else if (key === "Tab") {
      const fields: (keyof FormValues)[] = [
        "searchQuery",
        "phone",
        "email",
        "firstName",
        "lastName",
        "searchAddress",
        "address",
        "postalCode",
      ];
      const idx = fields.indexOf(activeField);
      if (idx !== -1) {
        const nextField = fields[(idx + 1) % fields.length];
        setActiveField(nextField);
        const el = document.getElementsByName(nextField)[0];
        if (el) el.focus();
      }
      return;
    } else if (key === "Caps Lock" || key === "Shift") {
      setCapsLock(!capsLock);
      return;
    } else if (key === "Enter") {
      const el = document.activeElement as HTMLElement;
      if (el) el.blur();
      setActiveField(null);
      return;
    } else {
      const char = capsLock ? key.toUpperCase() : key.toLowerCase();
      newVal = currentVal + char;
    }

    if (activeField === "firstName" || activeField === "lastName") {
      newVal = newVal.replace(/[0-9]/g, ""); // Strip out numbers
      newVal = newVal
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    } else if (activeField === "phone") {
      newVal = newVal.replace(/\D/g, "").slice(0, 10); // Strip non-digits, limit 10
      const currentSearch = getValues("searchQuery") || "";
      if (!currentSearch || /^\d*$/.test(currentSearch)) {
        setValue("searchQuery", newVal);
      }
    } else if (activeField === "email") {
      const currentSearch = getValues("searchQuery") || "";
      if (!currentSearch || currentSearch.includes("@") || /[a-zA-Z]/.test(currentSearch)) {
        setValue("searchQuery", newVal);
      }
    } else if (activeField === "searchQuery") {
      const digitsOnly = newVal.replace(/\D/g, "");
      if (/^\d*$/.test(newVal)) {
        newVal = digitsOnly.slice(0, 10);
        setValue("phone", newVal);
      } else if (newVal.includes("@") || /[a-zA-Z]/.test(newVal)) {
        setValue("email", newVal);
      }
    }

    setValue(activeField, newVal);
  };

  const registerWithFocus = (name: keyof FormValues, options?: any) => {
    return {
      ...register(name, options),
      onFocus: () => setActiveField(name),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Dialog */}
      <div className="relative w-[940px] max-w-[95vw] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 border border-neutral-200 animate-scale-up font-sans">
        {/* Brand Primary Header */}
        <div className="bg-brand-primary py-2.5 px-5 flex items-center justify-between text-white flex-shrink-0">
          <h3 className="text-xs font-800 tracking-wider uppercase">
            ADD NEW CUSTOMER & ADDRESS
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-700 hover:text-orange-100 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            Close <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Compact container to prevent scrolling */}
        <div className="flex-1 overflow-y-auto max-h-[85vh] bg-[#FAF9F5]">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 px-5 py-2.5">
              {/* Left Column*/}
              <div className="bg-brand-primary-light/40 border border-brand-primary-muted/20 rounded-2xl px-4 py-4 space-y-3.5">
                <h4 className="text-[11px] font-700 text-neutral-600 text-center uppercase tracking-wide">
                  Search by phone number or email address
                </h4>

                <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
                  {/* Combined Search Input */}
                  <div className="col-span-2 space-y-1">
                    <div className="relative">
                      <input
                        {...registerWithFocus("searchQuery")}
                        onKeyDown={handleSearchKeyDown}
                        onChange={handleSearchChange}
                        placeholder="Phone (10 digits) or email address"
                        inputMode="text"
                        className={`w-full bg-white border rounded-full pl-4 pr-9 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-all ${
                          searchError
                            ? "border-red-400 focus:border-red-400 focus:ring-red-200/50"
                            : "border-neutral-200 focus:border-brand-primary focus:ring-brand-primary/10"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSearch()}
                        disabled={isSearchingCustomer}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-brand-primary rounded-full cursor-pointer transition-all disabled:opacity-60"
                      >
                        {isSearchingCustomer ? (
                          <svg
                            className="animate-spin w-3 h-3 text-brand-primary"
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
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <Search size={11} />
                        )}
                      </button>
                    </div>
                    {/* Inline validation hint */}
                    {searchError && (
                      <p className="text-[10px] font-600 text-red-500 pl-3 flex items-center gap-1">
                        <span className="text-red-400">⚠</span> {searchError}
                      </p>
                    )}
                    {/* Live character hint */}
                    {!searchError && watchSearchQuery && (
                      <p className="text-[10px] font-500 text-neutral-400 pl-3">
                        {/^\d*$/.test(watchSearchQuery)
                          ? `${watchSearchQuery.length}/10 digits`
                          : watchSearchQuery.includes("@")
                            ? "Email format detected"
                            : "Name search"}
                      </p>
                    )}
                  </div>

                  {/* Enter Phone  & Email */}
                  <div>
                    <input
                      {...registerWithFocus("phone", {
                        onChange: (e: any) => {
                          const val = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setValue("phone", val);
                          const currentSearch = getValues("searchQuery") || "";
                          if (!currentSearch || /^\d*$/.test(currentSearch)) {
                            setValue("searchQuery", val);
                          }
                        },
                      })}
                      placeholder="Enter Phone #"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      {...registerWithFocus("email", {
                        onChange: (e: any) => {
                          const val = e.target.value;
                          setValue("email", val);
                          const currentSearch = getValues("searchQuery") || "";
                          if (!currentSearch || currentSearch.includes("@") || /[a-zA-Z]/.test(currentSearch)) {
                            setValue("searchQuery", val);
                          }
                        },
                      })}
                      placeholder="Enter Email Address"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>

                  {/*First Name & Last Name */}
                  <div>
                    <input
                      {...registerWithFocus("firstName", {
                        onChange: (e: any) => {
                          const val = e.target.value.replace(/[0-9]/g, ""); // Strip numbers
                          const capitalized = val
                            .split(" ")
                            .map(
                              (word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ");
                          setValue("firstName", capitalized);
                        },
                      })}
                      placeholder="Enter First Name"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      {...registerWithFocus("lastName", {
                        onChange: (e: any) => {
                          const val = e.target.value.replace(/[0-9]/g, ""); // Strip numbers
                          const capitalized = val
                            .split(" ")
                            .map(
                              (word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ");
                          setValue("lastName", capitalized);
                        },
                      })}
                      placeholder="Enter Last Name"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-1">
                  <button
                    type="submit"
                    className="px-16 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-full text-[12px] font-800 uppercase tracking-wider shadow-md shadow-brand-primary/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Autocomplete Tabs */}
                <div className="flex items-center gap-4 border-b border-neutral-200/80 pb-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setAddressTab("auto")}
                    className={`text-[11px] font-700 pb-1 transition-all cursor-pointer ${
                      addressTab === "auto"
                        ? "text-red-500 border-b-2 border-red-500"
                        : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    Auto complete address?
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressTab("manual")}
                    className={`text-[11px] font-700 pb-1 transition-all cursor-pointer ${
                      addressTab === "manual"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    Add address manually?
                  </button>
                </div>

                {/* Address Search / Input */}
                {addressTab === "auto" ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        {...registerWithFocus("searchAddress")}
                        placeholder="Search By Address"
                        className="w-full bg-brand-primary-light/10 border border-neutral-200 rounded-lg pl-3 pr-8 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                      <Search
                        size={13}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                    </div>

                    {/* Filtered suggestions list */}
                    {isSearchingAddress && (
                      <div className="text-[10px] text-neutral-400 italic px-2 py-1">
                        Searching addresses...
                      </div>
                    )}
                    {addressSuggestions.length > 0 && (
                      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 shadow-md max-h-[160px] overflow-y-auto z-20">
                        {addressSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setValue("address", item.address);
                              if (item.postalCode)
                                setValue("postalCode", item.postalCode);
                              setValue("searchAddress", "");
                              setSelectedCoords({
                                lat: item.lat,
                                lng: item.lng,
                              });
                              setAddressSuggestions([]);
                              toast.success(
                                "Address & Pin coordinates captured!",
                              );
                            }}
                            className="w-full text-left px-3 py-2 text-[10.5px] font-500 text-neutral-800 hover:bg-brand-primary-light/50 transition-all flex items-center justify-between gap-2"
                          >
                            <span className="line-clamp-1">
                              {item.displayName}
                            </span>
                            <span className="text-[9px] font-700 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1">
                              <MapPin
                                size={10}
                                className="text-emerald-600 shrink-0"
                              />{" "}
                              Pinned
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[9.5px] font-700 text-neutral-500 uppercase tracking-wide mb-1 block">
                        Street Address
                      </label>
                      <input
                        {...registerWithFocus("address")}
                        placeholder="e.g. 123 Main St"
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-700 text-neutral-500 uppercase tracking-wide mb-1 block">
                        Postal Code
                      </label>
                      <input
                        {...registerWithFocus("postalCode")}
                        placeholder="M5V 2T6"
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Show current address selection - Compact */}
                <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl py-1.5 px-3 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-700 text-neutral-500 uppercase tracking-wider">
                      Active Address Detail
                    </span>
                    {selectedCoords ? (
                      <span className="text-[9px] font-700 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <MapPin
                          size={10}
                          className="text-emerald-600 shrink-0"
                        />
                        Pin Captured ({selectedCoords.lat.toFixed(4)},{" "}
                        {selectedCoords.lng.toFixed(4)})
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <MapPin size={10} className="text-amber-600 shrink-0" />
                        Auto Pin on Submit
                      </span>
                    )}
                  </div>
                  <div className="font-600 text-neutral-800 leading-tight">
                    {watch("address") || (
                      <span className="text-neutral-400 italic">
                        No address selected
                      </span>
                    )}
                  </div>
                  {watch("postalCode") && (
                    <div className="text-[9px] text-neutral-500">
                      Postal Code: {watch("postalCode")}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl py-2 px-3.5 shadow-sm">
                  {/* Keyboard Switch */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={keyboardEnabled}
                        onChange={(e) => setKeyboardEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                    <span className="text-[10px] font-700 text-red-500 uppercase tracking-wide flex items-center gap-1">
                      <Keyboard size={12} /> Keyboard On / Off
                    </span>
                  </div>

                  {/* Send Tracker */}
                  <button
                    type="button"
                    onClick={() =>
                      toast.success("Tracker link sent to customer device.")
                    }
                    className="text-[10px] font-700 text-red-500 uppercase tracking-wide flex items-center gap-1 cursor-pointer hover:text-red-600 transition-all active:scale-95"
                  >
                    <Bell size={12} className="animate-swing" /> Send Tracker
                  </button>
                </div>
              </div>
            </div>

            {/* Virtual Keyboard Section */}
            {keyboardEnabled && (
              <div className="border-t border-neutral-100 bg-neutral-100/50 py-2 px-4 select-none flex-shrink-0">
                <div className="flex flex-col gap-1 max-w-[820px] mx-auto">
                  {KEYBOARD_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex gap-1 justify-center">
                      {row.map((key) => {
                        let btnClass =
                          "h-11 rounded-lg font-700 text-[13px] transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 ";

                        if (key === "Backspace") {
                          btnClass +=
                            "w-24 bg-neutral-200 text-neutral-800 hover:bg-neutral-300";
                        } else if (key === "Tab") {
                          btnClass +=
                            "w-18 bg-neutral-200 text-neutral-800 hover:bg-neutral-300";
                        } else if (key === "Caps Lock") {
                          btnClass +=
                            "w-28 bg-neutral-200 text-neutral-800 hover:bg-neutral-300 " +
                            (capsLock
                              ? "border-brand-primary ring-1 ring-brand-primary"
                              : "");
                        } else if (key === "Enter") {
                          btnClass +=
                            "w-24 bg-brand-primary text-white hover:bg-brand-primary-hover border-none";
                        } else if (key === "Shift") {
                          btnClass +=
                            "w-24 bg-neutral-200 text-neutral-800 hover:bg-neutral-300";
                        } else if (key === "Space") {
                          btnClass += "w-[360px] hover:bg-neutral-50";
                        } else {
                          btnClass += "w-12";
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleKeyPress(key)}
                            className={btnClass}
                          >
                            {key === "Caps Lock" && capsLock
                              ? "CAPS ON"
                              : capsLock && key.length === 1
                                ? key.toUpperCase()
                                : key}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
