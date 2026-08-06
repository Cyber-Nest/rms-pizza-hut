'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Bell, Keyboard, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usePosStore } from '../store/pos.store';

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

const MOCK_CUSTOMERS = [
  { firstName: 'Yogesh', lastName: 'Kumar', phone: '9999999999', email: 'yogesh@gmail.com', address: '789 Cyber Nest Street, Toronto, ON', postalCode: 'M5V 2T6' },
  { firstName: 'John', lastName: 'Doe', phone: '1234567890', email: 'john@example.com', address: '123 Main Street, Vancouver, BC', postalCode: 'V6B 2W9' },
  { firstName: 'Jane', lastName: 'Smith', phone: '9876543210', email: 'jane@example.com', address: '456 Queen Road, Montreal, QC', postalCode: 'H3B 3A7' },
  { firstName: 'Rahul', lastName: 'Sharma', phone: '9876543211', email: 'rahul@sharma.com', address: '12-B Gandhi Colony, New Delhi', postalCode: '110001' }
];

const MOCK_ADDRESSES = [
  '123 Main Street, Toronto, ON',
  '456 Queen Road, Vancouver, BC',
  '789 Cyber Nest Street, Richmond Hill, ON',
  '12 Gandhi Road, New Delhi, DL',
  '555 University Avenue, Toronto, ON',
  '777 Blue Jays Way, Toronto, ON'
];

const KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['Caps Lock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['@', '.', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '/', 'Shift'],
  ['Space']
];

export default function CustomerModal({ isOpen, onClose }: Props) {
  const { setCustomer, selectedCustomer } = usePosStore();
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [activeField, setActiveField] = useState<keyof FormValues | null>(null);
  const [capsLock, setCapsLock] = useState(false);
  const [addressTab, setAddressTab] = useState<'auto' | 'manual'>('auto');
  const [filteredAddresses, setFilteredAddresses] = useState<string[]>([]);

  const nameParts = (selectedCustomer?.name || '').trim().split(/\s+/);
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const { register, handleSubmit, reset, setValue, getValues, watch } = useForm<FormValues>({
    defaultValues: {
      phone: selectedCustomer?.phone || '',
      email: (selectedCustomer as any)?.email || '',
      firstName: initialFirstName,
      lastName: initialLastName,
      address: selectedCustomer?.address || '',
      postalCode: selectedCustomer?.postalCode || '',
      searchQuery: '',
      searchAddress: '',
    }
  });

  const watchSearchQuery = watch('searchQuery');
  const watchSearchAddress = watch('searchAddress');

  // Sync with changes when opening
  useEffect(() => {
    if (isOpen) {
      const nameParts = (selectedCustomer?.name || '').trim().split(/\s+/);
      const first = nameParts[0] || '';
      const last = nameParts.slice(1).join(' ') || '';
      reset({
        phone: selectedCustomer?.phone || '',
        email: (selectedCustomer as any)?.email || '',
        firstName: first,
        lastName: last,
        address: selectedCustomer?.address || '',
        postalCode: selectedCustomer?.postalCode || '',
        searchQuery: '',
        searchAddress: '',
      });
      setActiveField('phone');
    }
  }, [isOpen, selectedCustomer, reset]);

  // Autocomplete search addresses
  useEffect(() => {
    if (watchSearchAddress && watchSearchAddress.length > 1) {
      const filtered = MOCK_ADDRESSES.filter(addr => 
        addr.toLowerCase().includes(watchSearchAddress.toLowerCase())
      );
      setFilteredAddresses(filtered);
    } else {
      setFilteredAddresses([]);
    }
  }, [watchSearchAddress]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: FormValues) => {
    const cleanPhone = data.phone.trim().replace(/\D/g, "");
    if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    const customerName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const finalName = customerName || 'No Name';
    setCustomer({
      name: finalName,
      phone: cleanPhone,
      email: data.email || undefined,
      address: data.address || undefined,
      postalCode: data.postalCode || undefined,
    });
    toast.success(`Customer ${finalName} set for order.`);
    onClose();
  };

  const handleSearch = () => {
    const query = watchSearchQuery;
    if (!query) {
      toast.error('Please enter a phone number or email address to search.');
      return;
    }
    const cleanQuery = query.trim().toLowerCase();
    const found = MOCK_CUSTOMERS.find((c) => {
      return (
        c.phone.toLowerCase().includes(cleanQuery) ||
        c.email.toLowerCase().includes(cleanQuery)
      );
    });
    if (found) {
      setValue('phone', found.phone);
      setValue('email', found.email);
      setValue('firstName', found.firstName);
      setValue('lastName', found.lastName);
      setValue('address', found.address);
      setValue('postalCode', found.postalCode);
      toast.success(`Customer loaded: ${found.firstName} ${found.lastName}`);
    } else {
      toast.error('No customer found matching the query.');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleKeyPress = (key: string) => {
    if (!activeField) return;
    const currentVal = getValues(activeField) || '';

    let newVal = '';
    if (key === 'Backspace') {
      newVal = currentVal.slice(0, -1);
    } else if (key === 'Space') {
      newVal = currentVal + ' ';
    } else if (key === 'Tab') {
      const fields: (keyof FormValues)[] = [
        'searchQuery',
        'phone',
        'email',
        'firstName',
        'lastName',
        'searchAddress',
        'address',
        'postalCode'
      ];
      const idx = fields.indexOf(activeField);
      if (idx !== -1) {
        const nextField = fields[(idx + 1) % fields.length];
        setActiveField(nextField);
        const el = document.getElementsByName(nextField)[0];
        if (el) el.focus();
      }
      return;
    } else if (key === 'Caps Lock' || key === 'Shift') {
      setCapsLock(!capsLock);
      return;
    } else if (key === 'Enter') {
      const el = document.activeElement as HTMLElement;
      if (el) el.blur();
      setActiveField(null);
      return;
    } else {
      const char = capsLock ? key.toUpperCase() : key.toLowerCase();
      newVal = currentVal + char;
    }

    if (activeField === 'firstName' || activeField === 'lastName') {
      newVal = newVal.replace(/[0-9]/g, ""); // Strip out numbers
      newVal = newVal
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    } else if (activeField === 'phone') {
      newVal = newVal.replace(/\D/g, "").slice(0, 10); // Strip non-digits, limit 10
    }

    setValue(activeField, newVal);
  };

  const registerWithFocus = (name: keyof FormValues, options?: any) => {
    return {
      ...register(name, options),
      onFocus: () => setActiveField(name)
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
          <h3 className="text-xs font-800 tracking-wider uppercase">ADD NEW CUSTOMER & ADDRESS</h3>
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
                  <div className="relative col-span-2">
                    <input
                      {...registerWithFocus('searchQuery')}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search by phone number or email"
                      className="w-full bg-white border border-neutral-200 rounded-full pl-4 pr-9 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-brand-primary rounded-full cursor-pointer transition-all"
                    >
                      <Search size={11} />
                    </button>
                  </div>

                  {/* Enter Phone  & Email */}
                  <div>
                    <input
                      {...registerWithFocus('phone', {
                        onChange: (e: any) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setValue('phone', val);
                        }
                      })}
                      placeholder="Enter Phone #"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      {...registerWithFocus('email')}
                      placeholder="Enter Email Address"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>

                  {/*First Name & Last Name */}
                  <div>
                    <input
                      {...registerWithFocus('firstName', {
                        onChange: (e: any) => {
                          const val = e.target.value.replace(/[0-9]/g, ""); // Strip numbers
                          const capitalized = val
                            .split(" ")
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ");
                          setValue('firstName', capitalized);
                        }
                      })}
                      placeholder="Enter First Name"
                      className="w-full bg-white border border-neutral-200 rounded-full px-4 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      {...registerWithFocus('lastName', {
                        onChange: (e: any) => {
                          const val = e.target.value.replace(/[0-9]/g, ""); // Strip numbers
                          const capitalized = val
                            .split(" ")
                            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ");
                          setValue('lastName', capitalized);
                        }
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
                    onClick={() => setAddressTab('auto')}
                    className={`text-[11px] font-700 pb-1 transition-all cursor-pointer ${
                      addressTab === 'auto'
                        ? 'text-red-500 border-b-2 border-red-500'
                        : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Auto complete address?
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressTab('manual')}
                    className={`text-[11px] font-700 pb-1 transition-all cursor-pointer ${
                      addressTab === 'manual'
                        ? 'text-blue-500 border-b-2 border-blue-500'
                        : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    Add address manually?
                  </button>
                </div>

                {/* Address Search / Input */}
                {addressTab === 'auto' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        {...registerWithFocus('searchAddress')}
                        placeholder="Search By Address"
                        className="w-full bg-brand-primary-light/10 border border-neutral-200 rounded-lg pl-3 pr-8 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                      <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    </div>

                    {/* Filtered suggestions list */}
                    {filteredAddresses.length > 0 && (
                      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 shadow-sm max-h-[120px] overflow-y-auto">
                        {filteredAddresses.map((addr) => (
                          <button
                            key={addr}
                            type="button"
                            onClick={() => {
                              setValue('address', addr);
                              setValue('searchAddress', '');
                              setFilteredAddresses([]);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[10px] font-500 text-neutral-700 hover:bg-brand-primary-light/50 transition-all"
                          >
                            {addr}
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
                        {...registerWithFocus('address')}
                        placeholder="e.g. 123 Main St"
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9.5px] font-700 text-neutral-500 uppercase tracking-wide mb-1 block">
                        Postal Code
                      </label>
                      <input
                        {...registerWithFocus('postalCode')}
                        placeholder="M5V 2T6"
                        className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Show current address selection - Compact */}
                <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl py-1.5 px-3 text-[10px] space-y-1">
                  <div className="font-700 text-neutral-500 uppercase tracking-wider">Active Address Detail</div>
                  <div className="font-600 text-neutral-800 leading-tight">
                    {watch('address') || <span className="text-neutral-400 italic">No address selected</span>}
                  </div>
                  {watch('postalCode') && (
                    <div className="text-[9px] text-neutral-500">Postal Code: {watch('postalCode')}</div>
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
                    onClick={() => toast.success('Tracker link sent to customer device.')}
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
                        let btnClass = "h-11 rounded-lg font-700 text-[13px] transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 ";
                        
                        if (key === 'Backspace') {
                          btnClass += "w-24 bg-neutral-200 text-neutral-800 hover:bg-neutral-300";
                        } else if (key === 'Tab') {
                          btnClass += "w-18 bg-neutral-200 text-neutral-800 hover:bg-neutral-300";
                        } else if (key === 'Caps Lock') {
                          btnClass += "w-28 bg-neutral-200 text-neutral-800 hover:bg-neutral-300 " + (capsLock ? "border-brand-primary ring-1 ring-brand-primary" : "");
                        } else if (key === 'Enter') {
                          btnClass += "w-24 bg-brand-primary text-white hover:bg-brand-primary-hover border-none";
                        } else if (key === 'Shift') {
                          btnClass += "w-24 bg-neutral-200 text-neutral-800 hover:bg-neutral-300";
                        } else if (key === 'Space') {
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
                            {key === 'Caps Lock' && capsLock ? 'CAPS ON' : (capsLock && key.length === 1 ? key.toUpperCase() : key)}
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
