import React, { useState, useEffect } from "react";
import {
  X, User, Phone, Mail, MapPin, KeyRound, Briefcase, ChevronDown, Eye, EyeOff,
  ShieldCheck, CheckSquare, Square, Check
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

interface EmployeeData {
  _id?: string;
  employeeId?: string;
  name: string;
  role: "manager" | "supervisor" | "driver" | "cashier" | "chef" | "crew-member";
  phone?: string;
  email?: string;
  address?: string;
  pin?: string;
  isActive?: boolean;
  permissions?: Record<string, boolean>;
}

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: EmployeeData | null;
}

const PERMISSION_OPTIONS = [
  // POS Main Routes
  { key: 'pos',                   label: 'POS Terminal',          group: 'POS Main Routes', alwaysOn: true },
  { key: 'kitchen',               label: 'Kitchen View',          group: 'POS Main Routes' },
  { key: 'orders',                label: 'Orders View',           group: 'POS Main Routes' },
  { key: 'reception_view',        label: 'Reception View',        group: 'POS Main Routes' },
  { key: 'delivery',              label: 'Delivery',              group: 'POS Main Routes' },
  { key: 'driver_drop',           label: 'Driver Drop',           group: 'POS Main Routes' },
  { key: 'vehicles',              label: 'Vehicle Number',        group: 'POS Main Routes' },
  { key: 'customers',             label: 'Customers',             group: 'POS Main Routes' },
  { key: 'employees',             label: 'Employee Management',   group: 'POS Main Routes' },
  { key: 'attendance_report',     label: 'Attendance Report',     group: 'POS Main Routes' },
  { key: 'menus',                 label: 'Menus',                 group: 'POS Main Routes' },
  { key: 'setting',               label: 'Settings',              group: 'POS Main Routes' },
  // Orders Page Sub-Tabs
  { key: 'dashboard',             label: 'Dashboard',             group: 'Orders Page Tabs' },
  { key: 'orders_list',           label: 'Orders / Transactions', group: 'Orders Page Tabs' },
  { key: 'sales_summary',         label: 'Sales Summary',         group: 'Orders Page Tabs' },
  { key: 'expense_payout',        label: 'Expense / Payout',      group: 'Orders Page Tabs' },
  { key: 'reports',               label: 'Reports',               group: 'Orders Page Tabs' },
  { key: 'item_sales',            label: 'Item Sales',            group: 'Orders Page Tabs' },
  { key: 'hourly_sales',          label: 'Hourly Sales',          group: 'Orders Page Tabs' },
  { key: 'cash_out_summary',      label: 'Cash Out Summary',      group: 'Orders Page Tabs' },
  { key: 'monthly_sales_summary', label: 'Monthly Sales',         group: 'Orders Page Tabs' },
  { key: 'failed_transaction',    label: 'Failed Transactions',   group: 'Orders Page Tabs' },
  { key: 'refund_orders',         label: 'Refund Orders',         group: 'Orders Page Tabs' },
];

export default function CreateEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
}: CreateEmployeeModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<EmployeeData["role"]>("cashier");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ pos: true });

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name || "");
      setRole(employeeToEdit.role || "cashier");
      setPhone(employeeToEdit.phone || "");
      setEmail(employeeToEdit.email || "");
      setAddress(employeeToEdit.address || "");
      setPin("");
      setPermissions(employeeToEdit.permissions || { pos: true });
    } else {
      setName("");
      setRole("cashier");
      setPhone("");
      setEmail("");
      setAddress("");
      setPin("");
      setPermissions({ pos: true });
    }
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const getBranchId = () => {
    if (typeof window !== "undefined") {
      const rawBranch = localStorage.getItem("rms_branch");
      if (rawBranch) {
        try {
          const b = JSON.parse(rawBranch);
          return b._id || b.id;
        } catch (e) {}
      }
    }
    return null;
  };

  const handleSelectAllPerms = (select: boolean) => {
    const updated: Record<string, boolean> = { pos: true };
    PERMISSION_OPTIONS.forEach(p => {
      updated[p.key] = select;
    });
    setPermissions(updated);
  };

  // ── Orders cascade logic (same as permissions/page.tsx) ──
  const ORDERS_SUBTAB_KEYS = [
    "dashboard",
    "orders_list",
    "sales_summary",
    "expense_payout",
    "reports",
    "item_sales",
    "hourly_sales",
    "cash_out_summary",
    "monthly_sales_summary",
    "failed_transaction",
    "refund_orders",
  ];

  const handlePermissionToggle = (permKey: string, newValue: boolean) => {
    setPermissions(prev => {
      let updated = { ...prev, [permKey]: newValue };

      // When 'orders' main route is turned ON → auto-enable 'dashboard' sub-tab
      if (permKey === "orders" && newValue === true) {
        updated = { ...updated, dashboard: true };
      }

      // When 'orders' main route is turned OFF → disable all Orders sub-tabs
      if (permKey === "orders" && newValue === false) {
        ORDERS_SUBTAB_KEYS.forEach(k => { updated[k] = false; });
      }

      // When any sub-tab is turned ON → also ensure 'orders' parent is enabled
      if (ORDERS_SUBTAB_KEYS.includes(permKey) && newValue === true) {
        updated = { ...updated, orders: true };
      }

      // When a sub-tab is turned OFF → if all sub-tabs are now false, disable 'orders'
      if (ORDERS_SUBTAB_KEYS.includes(permKey) && newValue === false) {
        const anySubTabOn = ORDERS_SUBTAB_KEYS.some(k => k !== permKey && updated[k] === true);
        if (!anySubTabOn) {
          updated = { ...updated, orders: false };
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter employee name");
      return;
    }

    if (phone.trim()) {
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10) {
        toast.error("Phone number must be exactly 10 digits");
        return;
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!employeeToEdit && (!pin || !/^\d{4}$/.test(pin.trim()))) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    if (employeeToEdit && pin && !/^\d{4}$/.test(pin.trim())) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Branch session invalid. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

      if (employeeToEdit) {
        const payload: any = {
          branchId,
          name: name.trim(),
          role,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          permissions,
        };
        if (pin.trim()) {
          payload.pin = pin.trim();
        }

        const res = await axios.patch(
          `${apiUrl}/employees/${employeeToEdit._id}`,
          payload
        );
        if (res.data.success) {
          toast.success("Employee updated successfully");
          onSuccess();
          onClose();
        }
      } else {
        const payload = {
          branchId,
          name: name.trim(),
          role,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          pin: pin.trim(),
          permissions,
        };

        const res = await axios.post(`${apiUrl}/employees`, payload);
        if (res.data.success) {
          toast.success(`Employee ${res.data.data.employeeId} created successfully!`);
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const allSelected = PERMISSION_OPTIONS.every(p => permissions[p.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      {/* Dialog Box (Compact for Driver, 2-Column Wide for other roles) */}
      <div className={`relative w-full ${role === "driver" ? "max-w-md" : "max-w-3xl"} bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col font-sans transition-all`}>
        
        {/* Fixed Header */}
        <div className="bg-[#18181B] text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold shrink-0">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-900 tracking-wide text-white">
                {employeeToEdit ? "Edit Employee Account" : "Create New Employee Account"}
              </h3>
              <p className="text-[11px] text-neutral-400 font-500">
                {employeeToEdit ? `ID: ${employeeToEdit.employeeId}` : "Assign basic details, role passcode, and credentials"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Container (Scrollable Middle Content) */}
        <form id="create-emp-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className={`grid grid-cols-1 ${role === "driver" ? "" : "md:grid-cols-2"} gap-6`}>
            
            {/* ── Left Column: Basic Employee Info ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-neutral-100">
                <User size={15} className="text-brand-primary" />
                <h4 className="text-xs font-900 text-neutral-800 uppercase tracking-wider">
                  Basic Details & Credentials
                </h4>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Smith"
                    required
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs lg:text-sm font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as EmployeeData["role"])}
                    className="w-full pl-9 pr-9 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-700 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white appearance-none transition-all cursor-pointer"
                  >
                    <option value="manager">Manager (Full Access)</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="cashier">Cashier</option>
                    <option value="chef">Chef</option>
                    <option value="driver">Driver</option>
                    <option value="crew-member">Crew Member</option>
                  </select>
                  <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Phone & Email (2 Cols) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                    Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(587) 365-5401"
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                    />
                    <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.smith@gmail.com"
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                    />
                    <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>
              </div>

              {/* Address Field */}
              <div className="space-y-1">
                <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                  Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="231 Edgefield Pl, Strathmore, AB"
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-600 text-neutral-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              {/* 4-Digit PIN Input */}
              <div className="space-y-1 pt-1">
                <label className="block text-[11px] font-800 uppercase tracking-wider text-neutral-600">
                  4-Digit Passcode / PIN {!employeeToEdit && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder={employeeToEdit ? "Leave blank to keep unchanged" : "4-digit PIN (e.g. 1234)"}
                    required={!employeeToEdit}
                    className="w-full pl-9 pr-10 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-700 text-neutral-900 tracking-widest focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                  />
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer"
                    title={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 font-500">
                  Used for Check-In / Check-Out verification.
                </p>
              </div>
            </div>

            {/* ── Right Column: Tab Access & Permissions (Only shown for non-driver roles) ── */}
            {role !== "driver" && (
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-brand-primary" />
                    <h4 className="text-xs font-900 text-neutral-800 uppercase tracking-wider">
                      Tab Access Permissions
                    </h4>
                  </div>
                  {role !== "manager" && (
                    <button
                      type="button"
                      onClick={() => handleSelectAllPerms(!allSelected)}
                      className="text-[10px] font-800 text-brand-primary hover:underline flex items-center gap-1 cursor-pointer select-none"
                    >
                      {allSelected ? <Square size={11} /> : <CheckSquare size={11} />}
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {role === "manager" ? (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                    <p className="text-xs font-900 text-purple-800">Manager Role Active</p>
                    <p className="text-[11px] text-purple-700 font-500 leading-relaxed">
                      Managers automatically have complete bypass access to all terminal routes and orders page sub-tabs.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-4 overflow-y-auto pr-1 max-h-[340px]">
                    {/* POS Main Routes */}
                    <div>
                      <span className="text-[10px] font-900 text-amber-800 uppercase tracking-wider block mb-2">
                        POS Main Routes
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {PERMISSION_OPTIONS.filter(p => p.group === 'POS Main Routes').map(perm => {
                          const isAlwaysOn = (perm as any).alwaysOn === true;
                          const isChecked = isAlwaysOn ? true : !!permissions[perm.key];
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-700 select-none transition-all ${
                                isAlwaysOn
                                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 opacity-90 cursor-not-allowed"
                                  : isChecked
                                  ? "bg-brand-primary/5 border-brand-primary/40 text-brand-primary cursor-pointer"
                                  : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAlwaysOn}
                                onChange={(e) => !isAlwaysOn && handlePermissionToggle(perm.key, e.target.checked)}
                                className="w-3.5 h-3.5 accent-brand-primary rounded cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className="truncate flex-1">{perm.label}</span>
                              {isAlwaysOn && (
                                <span className="text-[9px] font-800 text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded shrink-0">
                                  Default
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Orders Page Sub-Tabs */}
                    <div>
                      <span className="text-[10px] font-900 text-blue-800 uppercase tracking-wider block mb-2">
                        Orders Page Sub-Tabs
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {PERMISSION_OPTIONS.filter(p => p.group === 'Orders Page Tabs').map(perm => {
                          const isChecked = !!permissions[perm.key];
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-700 cursor-pointer transition-all select-none ${
                                isChecked
                                  ? "bg-brand-primary/5 border-brand-primary/40 text-brand-primary"
                                  : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handlePermissionToggle(perm.key, e.target.checked)}
                                className="w-3.5 h-3.5 accent-brand-primary rounded"
                              />
                              <span className="truncate">{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </form>

        {/* Fixed Footer Actions Bar */}
        <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-3.5 flex items-center justify-end gap-3 shrink-0 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-neutral-200 text-xs font-700 text-neutral-600 hover:bg-neutral-100 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-emp-form"
            disabled={submitting}
            className="px-6 py-2 rounded-xl bg-brand-primary text-white text-xs font-800 hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{employeeToEdit ? "Update Employee" : "Create Employee"}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
