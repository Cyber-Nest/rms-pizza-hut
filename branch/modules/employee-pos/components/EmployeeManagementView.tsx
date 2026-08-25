"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import PosNavbar from "./PosNavbar";
import POSSidebarDrawer from "./POSSidebarDrawer";
import CreateEmployeeModal from "./CreateEmployeeModal";
import {
  Users,
  UserPlus,
  Search,
  ChevronDown,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Shield,
  ChefHat,
  Truck,
  DollarSign,
  UserCheck,
} from "lucide-react";

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  role: "manager" | "supervisor" | "driver" | "cashier" | "chef" | "crew-member";
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

// Role Badge Color Mapping (Frontend Only)
const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case "manager":
      return {
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Shield,
        label: "Manager",
      };
    case "supervisor":
      return {
        bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Shield,
        label: "Supervisor",
      };
    case "chef":
      return {
        bg: "bg-orange-50 text-orange-700 border-orange-200",
        icon: ChefHat,
        label: "Chef",
      };
    case "driver":
      return {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Truck,
        label: "Driver",
      };
    case "cashier":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: DollarSign,
        label: "Cashier",
      };
    case "crew-member":
    default:
      return {
        bg: "bg-neutral-100 text-neutral-700 border-neutral-200",
        icon: UserCheck,
        label: "Crew Member",
      };
  }
};

export default function EmployeeManagementView() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [activeFilter, setActiveFilter] = useState("true"); // default show active

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

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

  const fetchEmployees = useCallback(async () => {
    const branchId = getBranchId();
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await axios.get(`${apiUrl}/employees`, {
        params: {
          branchId,
          role: selectedRole || undefined,
          isActive: activeFilter || undefined,
          search: search || undefined,
        },
      });

      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching employees:", err);
      toast.error(err.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [search, selectedRole, activeFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreateNew = () => {
    setEmployeeToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsModalOpen(true);
  };

  const executeToggleActive = async (emp: Employee) => {
    const branchId = getBranchId();
    if (!branchId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      if (emp.isActive) {
        await axios.delete(`${apiUrl}/employees/${emp._id}`, { params: { branchId } });
        toast.success(`Employee ${emp.name} deactivated`);
      } else {
        await axios.patch(`${apiUrl}/employees/${emp._id}`, { branchId, isActive: true });
        toast.success(`Employee ${emp.name} reactivated`);
      }
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleToggleActive = (emp: Employee) => {
    const actionText = emp.isActive ? "deactivate" : "reactivate";
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to {actionText} {emp.name}?</p>
        <div className="flex items-center justify-end gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 font-600 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeToggleActive(emp);
            }}
            className={`px-2.5 py-1 font-700 text-white rounded-lg cursor-pointer shadow-sm ${
              emp.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            Confirm {actionText}
          </button>
        </div>
      </div>
    ), { duration: 5000, position: "top-center" });
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* POS Top Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* Edge-to-Edge Top Control Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px] flex items-center gap-2">
            <span>Employee Management</span>
            {/* <span className="bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11px] font-extrabold rounded-md px-1.5 py-0.5 min-w-[22px] text-center">
              {employees.length}
            </span> */}
          </h1>
        </div>

        {/* Filters and Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative w-[220px] sm:w-[280px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, ID, Phone..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] lg:text-[13.5px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary hover:border-neutral-355 focus:bg-white transition-all"
            />
          </div>

          {/* Role Select Filter */}
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] lg:text-[13.5px] font-600 text-neutral-700 hover:border-neutral-355 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
            >
              <option value="">All Roles</option>
              <option value="manager">Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="cashier">Cashier</option>
              <option value="chef">Chef</option>
              <option value="driver">Driver</option>
              <option value="crew-member">Crew Member</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Status Select Filter */}
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-8 py-1.5 text-[12px] lg:text-[13.5px] font-600 text-neutral-700 hover:border-neutral-355 focus:outline-none focus:border-brand-primary cursor-pointer transition-all"
            >
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
              <option value="">All Status</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchEmployees}
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
            title="Refresh Employees"
          >
            <RefreshCw size={14} />
          </button>

          {/* Add Employee CTA Button */}
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-[11px] font-800 uppercase tracking-wide transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <UserPlus size={14} />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Main Table Area (Edge-to-Edge Full Width Container) */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <div className="w-8 h-8 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
              <span className="text-xs font-700 text-neutral-500">Loading branch employees...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Users size={36} className="text-neutral-300 stroke-1" />
              <p className="text-xs font-700 text-neutral-600">No employees found</p>
              <p className="text-[11px] text-neutral-400">Click "Add New Employee" above to register staff.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100 text-[11px] lg:text-[12.5px] font-800 uppercase tracking-wider text-neutral-500">
                    <th className="py-3.5 px-5">EMP ID</th>
                    <th className="py-3.5 px-5">Employee Name</th>
                    <th className="py-3.5 px-5">Role</th>
                    <th className="py-3.5 px-5">Contact Details</th>
                    <th className="py-3.5 px-5">Address</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs lg:text-[13px]">
                  {employees.map((emp) => {
                    const roleBadge = getRoleBadgeStyle(emp.role);
                    const RoleIcon = roleBadge.icon;

                    return (
                      <tr key={emp._id} className="hover:bg-neutral-50/80 transition-colors">
                        {/* EMP ID */}
                        <td className="py-4 px-5 font-mono font-800 text-neutral-900">
                          <span className="bg-neutral-100 px-2.5 py-1 rounded-md text-neutral-700 border border-neutral-200">
                            {emp.employeeId}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-4 px-5">
                          <div className="font-800 text-neutral-900 text-[13px] lg:text-[14.5px]">{emp.name}</div>
                          <div className="text-[10px] lg:text-[11.5px] text-neutral-400 font-500">4-digit PIN set</div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] lg:text-[12.5px] font-800 border ${roleBadge.bg}`}>
                            <RoleIcon size={12} />
                            <span>{roleBadge.label}</span>
                          </span>
                        </td>

                        {/* Contact Details */}
                        <td className="py-4 px-5 space-y-0.5">
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-neutral-700 font-600">
                              <Phone size={11} className="text-neutral-400" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                          {emp.email && (
                            <div className="flex items-center gap-1.5 text-neutral-500 font-500 text-[11px] lg:text-[12.5px]">
                              <Mail size={11} className="text-neutral-400" />
                              <span>{emp.email}</span>
                            </div>
                          )}
                          {!emp.phone && !emp.email && (
                            <span className="text-neutral-400 font-500 text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Address */}
                        <td className="py-4 px-5 text-neutral-600 font-500 max-w-[200px] truncate">
                          {emp.address ? (
                            <div className="flex items-center gap-1.5" title={emp.address}>
                              <MapPin size={11} className="text-neutral-400 shrink-0" />
                              <span className="truncate">{emp.address}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          {emp.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-800 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle size={11} />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-800 text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                              <XCircle size={11} />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEdit(emp)}
                              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                              title="Edit Employee"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(emp)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                emp.isActive
                                  ? "border-red-200 hover:bg-red-50 text-red-600"
                                  : "border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                              }`}
                              title={emp.isActive ? "Deactivate Employee" : "Reactivate Employee"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* Sidebar Drawer */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="employees"
        onSelectTab={() => {}}
      />

      {/* Create / Edit Employee Modal */}
      <CreateEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEmployees}
        employeeToEdit={employeeToEdit}
      />
    </main>
  );
}
