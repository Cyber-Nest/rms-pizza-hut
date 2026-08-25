"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import PosNavbar from "@/modules/employee-pos/components/PosNavbar";
import POSSidebarDrawer from "@/modules/employee-pos/components/POSSidebarDrawer";
import EmployeePermissionGuard from "@/modules/employee-pos/components/EmployeePermissionGuard";
import {
  ShieldCheck,
  Users,
  RefreshCw,
  Save,
  Search,
  Shield,
  ChefHat,
  Truck,
  DollarSign,
  UserCheck,
  CheckSquare,
  Square,
  Check,
  Pencil,
  X,
} from "lucide-react";

// ─── Permission Definitions ───────────────────────────────────────────────────
interface PermissionDef {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  group: string;
  alwaysOn?: boolean;
}

const PERMISSION_DEFS: PermissionDef[] = [
  // Always On
  {
    key: "pos",
    label: "POS Terminal",
    shortLabel: "POS",
    description: "Access to POS main order terminal",
    group: "POS Terminal",
    alwaysOn: true,
  },

  // POS Routes
  {
    key: "kitchen",
    label: "Kitchen View",
    shortLabel: "Kitchen",
    description: "Kitchen preparation display system",
    group: "POS Routes",
  },
  {
    key: "orders",
    label: "Orders View",
    shortLabel: "Orders",
    description: "Orders main management console",
    group: "POS Routes",
  },
  {
    key: "reception_view",
    label: "Reception View",
    shortLabel: "Reception",
    description: "Order reception & customer handover board",
    group: "POS Routes",
  },
  {
    key: "delivery",
    label: "Delivery Dispatch",
    shortLabel: "Delivery",
    description: "Delivery orders and driver assignments",
    group: "POS Routes",
  },
  {
    key: "driver_drop",
    label: "Driver Drop",
    shortLabel: "Driver Drop",
    description: "Driver cash drop and settlement",
    group: "POS Routes",
  },
  {
    key: "vehicles",
    label: "Vehicle Nos",
    shortLabel: "Vehicles",
    description: "Vehicle number tracking",
    group: "POS Routes",
  },
  {
    key: "customers",
    label: "Customers",
    shortLabel: "Customers",
    description: "Customer database and order history",
    group: "POS Routes",
  },
  {
    key: "employees",
    label: "Employee Mgmt",
    shortLabel: "Employees",
    description: "Staff list, PIN management & roles",
    group: "POS Routes",
  },
  {
    key: "menus",
    label: "Menu Stock",
    shortLabel: "Menus",
    description: "Menu item availability & stock toggles",
    group: "POS Routes",
  },
  {
    key: "setting",
    label: "Settings",
    shortLabel: "Settings",
    description: "Branch tax, delivery fee & store settings",
    group: "POS Routes",
  },

  // Orders Sub-Tabs
  {
    key: "dashboard",
    label: "Orders Dashboard",
    shortLabel: "Dashboard",
    description: "Live order queue and metric cards",
    group: "Orders Page",
  },
  {
    key: "orders_list",
    label: "Orders / Transactions",
    shortLabel: "Orders",
    description: "Orders list and transaction history (same as Transactions in sidebar)",
    group: "Orders Page",
  },
  {
    key: "sales_summary",
    label: "Sales Summary",
    shortLabel: "Sales Sum.",
    description: "Daily sales metrics & cash deposit log",
    group: "Orders Page",
  },
  {
    key: "expense_payout",
    label: "Expense Payout",
    shortLabel: "Expenses",
    description: "Branch petty cash expense tracking",
    group: "Orders Page",
  },
  {
    key: "reports",
    label: "Reports Summary",
    shortLabel: "Reports",
    description: "Sales by category & payment method",
    group: "Orders Page",
  },
  {
    key: "item_sales",
    label: "Item Sales",
    shortLabel: "Item Sales",
    description: "Product quantity sales breakdown",
    group: "Orders Page",
  },
  {
    key: "hourly_sales",
    label: "Hourly Sales",
    shortLabel: "Hourly",
    description: "Sales volume peak hour analysis",
    group: "Orders Page",
  },
  {
    key: "cash_out_summary",
    label: "Cash-Out",
    shortLabel: "Cash Out",
    description: "Register register cash out summaries",
    group: "Orders Page",
  },
  {
    key: "monthly_sales_summary",
    label: "Monthly Sales",
    shortLabel: "Monthly",
    description: "Monthly revenue and tax aggregates",
    group: "Orders Page",
  },
  {
    key: "failed_transaction",
    label: "Failed Txns",
    shortLabel: "Failed Txns",
    description: "Declined and failed payment logs",
    group: "Orders Page",
  },
  {
    key: "refund_orders",
    label: "Refund Orders",
    shortLabel: "Refunds",
    description: "Refunded and voided order logs",
    group: "Orders Page",
  },
];

type EmployeePermissions = Record<string, boolean>;

interface Employee {
  _id: string;
  name: string;
  role: "manager" | "cashier" | "driver" | "kitchen_staff" | "receptionist";
  employeeId: string;
  permissions?: EmployeePermissions;
}

const buildDefaultPermissions = (): EmployeePermissions => {
  const map: EmployeePermissions = {};
  PERMISSION_DEFS.forEach((p) => {
    map[p.key] = p.alwaysOn ? true : false;
  });
  return map;
};

const mergePermissions = (saved?: EmployeePermissions): EmployeePermissions => {
  const base = buildDefaultPermissions();
  if (!saved) return base;
  return { ...base, ...saved };
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case "manager":
      return {
        label: "Manager",
        cls: "bg-purple-100 text-purple-700 border-purple-200",
        Icon: Shield,
      };
    case "cashier":
      return {
        label: "Cashier",
        cls: "bg-blue-100 text-blue-700 border-blue-200",
        Icon: DollarSign,
      };
    case "kitchen_staff":
      return {
        label: "Kitchen",
        cls: "bg-amber-100 text-amber-700 border-amber-200",
        Icon: ChefHat,
      };
    case "driver":
      return {
        label: "Driver",
        cls: "bg-green-100 text-green-700 border-green-200",
        Icon: Truck,
      };
    default:
      return {
        label: "Staff",
        cls: "bg-neutral-100 text-neutral-700 border-neutral-200",
        Icon: UserCheck,
      };
  }
};

export default function PermissionsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localPerms, setLocalPerms] = useState<{
    [empId: string]: EmployeePermissions;
  }>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const getBranchId = () => {
    if (typeof window === "undefined") return null;
    try {
      const b = JSON.parse(localStorage.getItem("rms_branch") || "{}");
      return b._id || null;
    } catch {
      return null;
    }
  };

  const fetchEmployees = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/employees`, {
        params: { branchId },
      });
      if (res.data?.success) {
        const emps: Employee[] = res.data.data;
        setEmployees(emps);
        const permsMap: { [empId: string]: EmployeePermissions } = {};
        emps.forEach((emp) => {
          permsMap[emp._id] = mergePermissions(
            emp.permissions as EmployeePermissions | undefined,
          );
        });
        setLocalPerms(permsMap);
      }
    } catch (err) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // All Orders sub-tab keys (including orders_list = Transactions)
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

  const handleToggle = (empId: string, permKey: string) => {
    setLocalPerms((prev) => {
      const current = prev[empId] || {};
      const newValue = !current[permKey];
      let updated = { ...current, [permKey]: newValue };

      // When 'orders' main route is toggled ON → auto-enable 'dashboard' sub-tab as default
      if (permKey === "orders" && newValue === true) {
        updated = { ...updated, dashboard: true };
      }

      // When 'orders' main route is toggled OFF → disable all Orders sub-tabs too
      if (permKey === "orders" && newValue === false) {
        ORDERS_SUBTAB_KEYS.forEach((k) => {
          updated[k] = false;
        });
      }

      // When any sub-tab is turned ON → also ensure 'orders' parent is enabled
      if (ORDERS_SUBTAB_KEYS.includes(permKey) && newValue === true) {
        updated = { ...updated, orders: true };
      }

      // When a sub-tab is turned OFF → if all sub-tabs are now false, also disable 'orders'
      if (ORDERS_SUBTAB_KEYS.includes(permKey) && newValue === false) {
        const anySubTabOn = ORDERS_SUBTAB_KEYS.some(
          (k) => k !== permKey && updated[k] === true
        );
        if (!anySubTabOn) {
          updated = { ...updated, orders: false };
        }
      }

      return { ...prev, [empId]: updated };
    });
  };

  const handleSelectAll = (empId: string, select: boolean) => {
    const newPerms: EmployeePermissions = {};
    PERMISSION_DEFS.forEach((p) => {
      newPerms[p.key] = p.alwaysOn ? true : select;
    });
    setLocalPerms((prev) => ({ ...prev, [empId]: newPerms }));
  };

  const handleSave = async (emp: Employee) => {
    const branchId = getBranchId();
    if (!branchId) {
      toast.error("Branch session invalid");
      return;
    }
    setSavingId(emp._id);
    try {
      const payload = localPerms[emp._id] || buildDefaultPermissions();
      const res = await axios.patch(
        `${apiUrl}/employees/${emp._id}/permissions?branchId=${branchId}`,
        { permissions: payload, branchId },
        { headers: { "x-branch-id": branchId, branchid: branchId } },
      );
      if (res.data?.success) {
        toast.success(`Permissions saved for ${emp.name}`);

        // ── Instantly sync localStorage if this is the active employee ──
        if (typeof window !== "undefined") {
          const rawActive = localStorage.getItem("rms_active_employee");
          if (rawActive) {
            try {
              const activeEmp = JSON.parse(rawActive);
              if (activeEmp && activeEmp._id === emp._id) {
                const updatedEmp = { ...activeEmp, permissions: payload };
                localStorage.setItem(
                  "rms_active_employee",
                  JSON.stringify(updatedEmp),
                );
                window.dispatchEvent(new Event("rms_active_employee_changed"));
                window.dispatchEvent(new Event("storage"));
              }
            } catch (e) {}
          }
        }

        fetchEmployees();
      } else {
        toast.error("Save failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error saving permissions");
    } finally {
      setSavingId(null);
    }
  };


  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <EmployeePermissionGuard permissionKey="employees">
      <div className="h-screen w-screen max-w-full overflow-hidden bg-neutral-50 flex flex-col font-sans">
        {/* Navbar */}
        <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

        {/* Sidebar */}
        <POSSidebarDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab="permissions"
          onSelectTab={() => {}}
        />

        {/* Top Controls Header Bar */}
        <div className="bg-white border-b border-neutral-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs shrink-0 select-none w-full max-w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center">
              <ShieldCheck size={18} className="text-brand-primary" />
            </div>
            <div>
              <h1 className="text-sm lg:text-base font-900 text-neutral-900 leading-tight">
                Employee Permissions Matrix
              </h1>
              <p className="text-[10.5px] lg:text-xs text-neutral-500 font-500">
                Manage tab and feature access control per staff member
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 text-xs border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:border-brand-primary/50 w-52 font-500 transition-all"
              />
            </div>
            <button
              onClick={fetchEmployees}
              className="p-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
              title="Reload Employees"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Main Content Body - STRICT OVERFLOW CONTROL */}
        <div className="flex-1 min-h-0 w-full max-w-full p-4 sm:p-6 overflow-hidden flex flex-col">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400">
              <div className="w-8 h-8 border-3 border-neutral-200 border-t-brand-primary rounded-full animate-spin" />
              <span className="text-xs font-700">
                Loading Permissions Matrix...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Users size={32} className="opacity-40" />
              <p className="text-xs font-700">No employees found</p>
            </div>
          ) : (
            /* Table Wrapper Card - Only THIS element handles horizontal & vertical scrolling */
            <div className="flex-1 min-h-0 w-full max-w-full bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-auto flex flex-col">
              <table className="w-full text-left border-collapse min-w-[1300px] relative">
                <thead>
                  {/* Category Headers Row */}
                  <tr className="bg-neutral-100/90 border-b border-neutral-200 text-[10px] lg:text-[11.5px] font-900 uppercase tracking-wider text-neutral-600 select-none sticky top-0 z-30">
                    <th className="px-4 py-2 sticky left-0 top-0 z-40 bg-neutral-100 border-r border-neutral-200/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[210px]">
                      Staff Details
                    </th>
                    <th
                      className="px-3 py-2 text-center bg-emerald-50/80 text-emerald-800 border-r border-neutral-200/80 min-w-[80px]"
                      colSpan={1}
                    >
                      Always On
                    </th>
                    <th
                      className="px-3 py-2 text-center bg-amber-50/80 text-amber-800 border-r border-neutral-200/80"
                      colSpan={
                        PERMISSION_DEFS.filter((p) => p.group === "POS Routes")
                          .length
                      }
                    >
                      POS Main Routes
                    </th>
                    <th
                      className="px-3 py-2 text-center bg-blue-50/80 text-blue-800 border-r border-neutral-200/80"
                      colSpan={
                        PERMISSION_DEFS.filter((p) => p.group === "Orders Page")
                          .length
                      }
                    >
                      Orders Page Sub-Tabs
                    </th>
                    <th className="px-4 py-2 text-right sticky right-0 top-0 z-40 bg-neutral-100 border-l border-neutral-200/80 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[130px]">
                      Actions
                    </th>
                  </tr>

                  {/* Individual Column Header Row */}
                  <tr className="bg-neutral-50 text-[10px] font-800 uppercase tracking-wider text-neutral-600 border-b border-neutral-200 select-none sticky top-[29px] z-30">
                    <th className="px-4 py-2 sticky left-0 z-40 bg-neutral-50 border-r border-neutral-200/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      Employee Name & Role
                    </th>
                    {PERMISSION_DEFS.map((perm) => (
                      <th
                        key={perm.key}
                        className="px-2 py-2 text-center border-r border-neutral-200/60 font-750 hover:bg-neutral-100 transition-colors"
                        title={`${perm.label}: ${perm.description}`}
                      >
                        <span className="text-[10px] lg:text-[11.5px] text-neutral-800 whitespace-nowrap">
                          {perm.shortLabel}
                        </span>
                      </th>
                    ))}
                     <th className="px-4 py-2 text-right sticky right-0 top-0 z-40 bg-neutral-50 border-l border-neutral-200/80 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                       Actions
                     </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filtered.map((emp) => {
                    const perms =
                      localPerms[emp._id] || buildDefaultPermissions();
                    const badge = getRoleBadge(emp.role);
                    const BadgeIcon = badge.Icon;
                    const isManager = emp.role === "manager";
                    const isSaving = savingId === emp._id;
                    const isEditing = editingId === emp._id;
                    const allSelected = PERMISSION_DEFS.every(
                      (p) => perms[p.key],
                    );

                    return (
                      <tr
                        key={emp._id}
                        className={`transition-colors ${
                          isEditing
                            ? "bg-amber-50/40 ring-1 ring-inset ring-amber-200"
                            : isManager
                            ? "bg-purple-50/15 hover:bg-purple-50/30"
                            : "hover:bg-neutral-50/80"
                        }`}
                      >
                        {/* Employee Column (Sticky Left) */}
                        <td className="px-4 py-2.5 sticky left-0 z-20 bg-white border-r border-neutral-200/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-900 shrink-0 ${
                                isManager
                                  ? "bg-purple-100 text-purple-700"
                                  : isEditing
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-brand-primary/10 text-brand-primary"
                              }`}
                            >
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-800 text-neutral-900 text-xs lg:text-sm truncate max-w-[100px]">
                                  {emp.name}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-800 border shrink-0 ${badge.cls}`}
                                >
                                  <BadgeIcon size={8} />
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-400 font-500 leading-none mt-0.5">
                                ID: {emp.employeeId}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Permission Checkbox Cells */}
                        {PERMISSION_DEFS.map((perm) => {
                          const isChecked = isManager
                            ? true
                            : !!perms[perm.key];
                          const isAlwaysOn =
                            perm.alwaysOn === true || isManager;
                          // Only interactive when this row is in edit mode
                          const isInteractive = isEditing && !isAlwaysOn;

                          return (
                            <td
                              key={perm.key}
                              className={`px-2 py-2 text-center border-r border-neutral-100 transition-colors ${
                                isChecked ? "bg-emerald-50/15" : ""
                              }`}
                              title={`${emp.name} → ${perm.label}`}
                            >
                              <div className="flex items-center justify-center">
                                <label
                                  className={`inline-flex items-center justify-center p-1 rounded-md transition-all ${
                                    isAlwaysOn
                                      ? "cursor-not-allowed opacity-75"
                                      : isInteractive
                                      ? "cursor-pointer hover:bg-amber-100"
                                      : "cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!isInteractive}
                                    onChange={() =>
                                      isInteractive &&
                                      handleToggle(emp._id, perm.key)
                                    }
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                      isChecked
                                        ? isAlwaysOn
                                          ? "bg-neutral-400 border-neutral-400"
                                          : "bg-emerald-600 border-emerald-600 shadow-2xs"
                                        : isInteractive
                                        ? "bg-white border-neutral-300 hover:border-amber-400"
                                        : "bg-neutral-50 border-neutral-200"
                                    }`}
                                  >
                                    {isChecked && (
                                      <Check
                                        size={11}
                                        strokeWidth={3}
                                        className="text-white"
                                      />
                                    )}
                                  </div>
                                </label>
                              </div>
                            </td>
                          );
                        })}

                        {/* Actions Column (Sticky Right) */}
                        <td className="px-3 py-2.5 sticky right-0 z-20 bg-white border-l border-neutral-200/80 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] text-right">
                          {isManager ? (
                            <span className="text-[10px] font-800 text-purple-600 bg-purple-50 border border-purple-200 px-2 py-1 rounded-lg">
                              Full Access
                            </span>
                          ) : isEditing ? (
                            /* ── Edit Mode: Select-All toggle + Save + Cancel ── */
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Select All / Deselect All */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleSelectAll(emp._id, !allSelected)
                                }
                                className="p-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                                title={allSelected ? "Deselect All" : "Select All"}
                              >
                                {allSelected ? (
                                  <Square size={13} />
                                ) : (
                                  <CheckSquare size={13} className="text-brand-primary" />
                                )}
                              </button>

                              {/* Save */}
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleSave(emp);
                                  setEditingId(null);
                                }}
                                disabled={isSaving}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-800 flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Save size={11} />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>

                              {/* Cancel */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  // Reset local changes by re-merging from original
                                  const original = employees.find((e) => e._id === emp._id);
                                  if (original) {
                                    setLocalPerms((prev) => ({
                                      ...prev,
                                      [emp._id]: mergePermissions(
                                        original.permissions as EmployeePermissions | undefined,
                                      ),
                                    }));
                                  }
                                }}
                                className="p-1 rounded-lg border border-neutral-200 hover:bg-red-50 hover:border-red-200 text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            /* ── View Mode: Edit button only ── */
                            <button
                              type="button"
                              onClick={() => setEditingId(emp._id)}
                              className="px-3 py-1 rounded-lg border border-neutral-200 hover:bg-brand-primary hover:text-white hover:border-brand-primary text-neutral-700 text-[11px] font-800 flex items-center gap-1.5 ml-auto transition-all cursor-pointer"
                            >
                              <Pencil size={11} />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EmployeePermissionGuard>
  );
}
