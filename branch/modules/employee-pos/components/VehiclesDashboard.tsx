'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Edit, Trash, Plus, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import PosNavbar from './PosNavbar';
import POSSidebarDrawer from './POSSidebarDrawer';
import { useDeliveryStore } from '../../delivery/store/deliveryStore';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToEdit?: { id: string; number: string; label: string } | null;
  onSave: (number: string, label: string) => Promise<void>;
}

function VehicleModal({ isOpen, onClose, vehicleToEdit, onSave }: VehicleModalProps) {
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vehicleToEdit) {
      setNumber(vehicleToEdit.number);
      setLabel(vehicleToEdit.label);
    } else {
      setNumber('');
      setLabel('');
    }
  }, [vehicleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !label.trim()) {
      toast.error('All fields are required.');
      return;
    }

    // Alphanumeric validation
    const alphanumericRegex = /^[a-zA-Z0-9 -]+$/;
    if (!alphanumericRegex.test(number)) {
      toast.error('Vehicle number must be alphanumeric (letters, numbers, space or hyphen only).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(number.trim().toUpperCase(), label.trim());
      toast.success(vehicleToEdit ? 'Vehicle updated successfully!' : 'Vehicle added successfully!');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Something went wrong.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up border border-neutral-200">
        {/* Modal Header */}
        <div className="bg-brand-primary text-white px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-850 text-xs uppercase tracking-wider flex items-center gap-2">
            <Car size={15} />
            <span>{vehicleToEdit ? 'Edit Vehicle' : 'Add New Vehicle'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-white/80 transition-colors flex items-center gap-0.5 cursor-pointer active:scale-95"
          >
            Close <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs font-600 text-neutral-700 bg-[#FAF9F5]">
            <div>
              <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-450 mb-1.5">
                Vehicle Label
              </label>
              <input
                type="text"
                placeholder="e.g. Car 1, Bike 2"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-[12px] text-neutral-700 focus:outline-none focus:border-brand-primary"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-800 uppercase tracking-wider text-neutral-450 mb-1.5">
                Vehicle Number 
              </label>
              <input
                type="text"
                placeholder="e.g. BXYZ 789, CAR-01"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-[12px] text-neutral-700 focus:outline-none focus:border-brand-primary uppercase"
                required
              />
            </div>


          </div>

          {/* Modal Footer */}
          <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex items-center justify-end gap-2.5 select-none">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[11px] font-800 uppercase rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 bg-brand-primary text-white text-[11px] font-800 uppercase rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VehiclesDashboard() {
  const vehicles = useDeliveryStore((s) => s.vehicles);
  const drivers = useDeliveryStore((s) => s.drivers);
  const fetchVehicles = useDeliveryStore((s) => s.fetchVehicles);
  const fetchDrivers = useDeliveryStore((s) => s.fetchDrivers);
  const addVehicle = useDeliveryStore((s) => s.addVehicle);
  const updateVehicle = useDeliveryStore((s) => s.updateVehicle);
  const deleteVehicle = useDeliveryStore((s) => s.deleteVehicle);

  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<{ id: string; number: string; label: string } | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchVehicles(), fetchDrivers()]);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Could not load vehicles data.');
    } finally {
      setLoading(false);
    }
  }, [fetchVehicles, fetchDrivers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        return v.number.toLowerCase().includes(kw) || v.label.toLowerCase().includes(kw);
      }
      return true;
    });
  }, [vehicles, searchKeyword]);

  // Pagination Calculations
  const totalEntries = filteredVehicles.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const activePage = currentPage > totalPages ? 1 : currentPage;
  const startIndex = (activePage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
  const visibleVehicles = filteredVehicles.slice(startIndex, endIndex);

  const handleSaveVehicle = async (number: string, label: string) => {
    if (editingVehicle) {
      await updateVehicle(editingVehicle.id, number, label);
    } else {
      await addVehicle(number, label);
    }
  };

  const executeDeleteVehicle = async (id: string) => {
    try {
      await deleteVehicle(id);
      toast.success('Vehicle deleted successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete vehicle.');
    }
  };

  const handleDeleteVehicle = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs max-w-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this vehicle?</p>
        <p className="text-[10.5px] text-neutral-600">If assigned to a driver, it will be unassigned.</p>
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
              executeDeleteVehicle(id);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Vehicle
          </button>
        </div>
      </div>
    ), { duration: 5000, position: 'top-center' });
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-brand-bg text-neutral-900 font-sans">
      {/* Navbar */}
      <PosNavbar onToggleSidebar={() => setIsSidebarOpen(true)} />

      {/* Control Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shadow-sm flex-shrink-0 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-900 text-neutral-900 tracking-tight leading-none min-w-[140px] flex items-center gap-2">
            <span>Vehicle Number</span>
            <span className="bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11px] font-extrabold rounded-md px-1.5 py-0.5 min-w-[22px] text-center">
              {vehicles.length}
            </span>
          </h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative w-[220px] sm:w-[280px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search By Number or Label"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-[12px] lg:text-[13.5px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-brand-primary hover:border-neutral-355 focus:bg-white transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Add Vehicle Button */}
          <button
            onClick={() => {
              setEditingVehicle(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[12px] lg:text-[13.5px] font-800 uppercase rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 bg-brand-bg flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 font-750 text-[12px] gap-2">
            <span className="animate-spin text-xl">⏳</span>
            <span>Fetching updated vehicle records...</span>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col min-h-0 font-sans select-none">
            
            {/* Table Container */}
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[400px]">
              <table className="w-full text-left text-[11px] lg:text-[13px] text-neutral-600 font-600 border-collapse table-auto">
                <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-550 text-[10px] lg:text-[11.5px] font-800 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-5 py-3.5">Vehicle Label</th>
                    <th className="px-5 py-3.5">Vehicle Number</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleVehicles.length > 0 ? (
                    visibleVehicles.map((vehicle, index) => {
                      const driver = drivers.find(
                        (d) => d.id === vehicle.assignedDriverId || d._id === vehicle.assignedDriverId
                      );

                      return (
                        <tr
                          key={vehicle.id || index}
                          className="hover:bg-orange-50/15 border-b border-neutral-100 transition-colors bg-white last:border-b-0"
                        >
                          {/* Label */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-800 uppercase border bg-brand-primary-light border-brand-primary-muted text-brand-primary">
                                <Car size={13} />
                              </div>
                              <span className="font-800 text-neutral-800 text-[11.5px] lg:text-[13.5px] uppercase">
                                {vehicle.label}
                              </span>
                            </div>
                          </td>

                          {/* Number */}
                          <td className="px-5 py-4 font-800 text-neutral-800 text-[11.5px] lg:text-[13.5px] uppercase tracking-wider font-mono">
                            {vehicle.number}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 font-700 text-neutral-600 text-[11.5px] lg:text-[13px]">
                            {vehicle.isAssigned && driver ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] lg:text-[11.5px] font-bold bg-red-50 text-red-600 border border-red-100">
                                Assigned to {driver.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] lg:text-[11.5px] font-bold bg-green-50 text-green-600 border border-green-100">
                                Available
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setEditingVehicle({ id: vehicle.id, number: vehicle.number, label: vehicle.label });
                                  setIsModalOpen(true);
                                }}
                                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-orange-50 border border-neutral-200 hover:border-brand-primary/30 text-neutral-500 hover:text-brand-primary flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                                title="Edit vehicle details"
                              >
                                <Edit size={12} strokeWidth={2.5} />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                                className="w-8 h-8 rounded-full bg-neutral-50 hover:bg-red-50 border border-neutral-200 hover:border-red-500/30 text-neutral-500 hover:text-red-650 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                                title="Delete vehicle"
                              >
                                <Trash size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center text-neutral-450 font-700">
                        No vehicles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-neutral-50/50 border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] lg:text-[12.5px] font-700 text-neutral-500 select-none">
              
              {/* Left Entries dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-450 font-550">Show</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-700 font-600 focus:outline-none focus:border-brand-primary cursor-pointer hover:border-neutral-300 transition-colors"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-neutral-450 font-550">entries</span>
              </div>

              {/* Middle count */}
              <div className="text-neutral-400 font-550 text-[11.5px]">
                {totalEntries > 0 ? (
                  <span>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</span>
                ) : (
                  <span>Showing 0 to 0 of 0 entries</span>
                )}
              </div>

              {/* Right pagination */}
              <div className="flex items-center gap-1">
                <button
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all ${
                    activePage === 1
                      ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer'
                  }`}
                >
                  &larr;
                </button>

                {Array.from({ length: totalPages }).map((_, pageIdx) => {
                  const pNum = pageIdx + 1;
                  const active = activePage === pNum;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all cursor-pointer text-[10.5px] ${
                        active
                          ? 'bg-brand-primary text-white shadow-sm border border-brand-primary'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={activePage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-800 transition-all ${
                    activePage === totalPages || totalPages === 0
                      ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer'
                  }`}
                >
                  &rarr;
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Sidebar Drawer Component */}
      <POSSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab="vehicles"
        onSelectTab={(tabKey) => {
          if (tabKey === 'orders' || tabKey === 'dashboard' || tabKey === 'sales_summary' || tabKey === 'expense_payout') {
            window.location.href = `/employee/orders?tab=${tabKey}`;
          }
        }}
      />

      {/* Add / Edit Vehicle Modal */}
      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVehicle(null);
        }}
        vehicleToEdit={editingVehicle}
        onSave={handleSaveVehicle}
      />
    </main>
  );
}
