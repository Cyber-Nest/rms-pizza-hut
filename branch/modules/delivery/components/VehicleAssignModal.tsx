'use client';

import React from 'react';
import { X, Car, User } from 'lucide-react';
import { useDeliveryStore } from '../store/deliveryStore';

export default function VehicleAssignModal() {
  const vehicleModalOpen = useDeliveryStore((s) => s.vehicleModalOpen);
  const selectedDriverId = useDeliveryStore((s) => s.selectedDriverId);
  const drivers = useDeliveryStore((s) => s.drivers);
  const vehicles = useDeliveryStore((s) => s.vehicles);
  const closeVehicleModal = useDeliveryStore((s) => s.closeVehicleModal);
  const assignVehicle = useDeliveryStore((s) => s.assignVehicle);
  const unassignVehicle = useDeliveryStore((s) => s.unassignVehicle);

  if (!vehicleModalOpen || !selectedDriverId) return null;

  const driver = drivers.find((d) => d.id === selectedDriverId);
  if (!driver) return null;

  const handleSelect = (vehicleId: string) => {
    if (driver.assignedVehicle) {
      unassignVehicle(driver.id);
    }
    assignVehicle(driver.id, vehicleId);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[4px] flex items-center justify-center z-[1000] animate-fade-in"
      onClick={closeVehicleModal}
    >
      <div
        className="bg-white rounded-2xl w-[340px] max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-neutral-200">
          <button
            className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 hover:text-neutral-900 transition-colors cursor-pointer"
            onClick={closeVehicleModal}
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-neutral-900">
              {driver.name} {driver.driverId ? `(#${driver.driverId})` : ""}
            </span>
            <div
              className="w-[38px] h-[38px] rounded-full border-[2.5px] bg-neutral-100 flex items-center justify-center text-neutral-500"
              style={{
                borderColor:
                  driver.status === 'available'
                    ? '#16A34A'
                    : driver.status === 'returning'
                    ? '#EA580C'
                    : '#DC2626'
              }}
            >
              <User size={20} />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="px-[18px] pt-4 pb-2 text-base font-bold text-neutral-900 text-center">
          Select Vehicle
        </h3>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-2 gap-2 px-[18px] pb-5 pt-3">
          {vehicles.map((vehicle) => {
            const isAvailable = !vehicle.isAssigned || vehicle.assignedDriverId === driver.id;
            const isCurrentlyAssigned = vehicle.assignedDriverId === driver.id;

            return (
              <button
                key={vehicle.id}
                className={`flex items-center justify-center gap-2 px-2.5 py-3.5 rounded-xl border-2 transition-all font-sans cursor-pointer
                  ${isAvailable
                    ? isCurrentlyAssigned
                      ? 'border-green-600 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-yellow-500 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 hover:border-yellow-600 hover:scale-[1.03] hover:shadow-md'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-300 cursor-not-allowed'
                  }`}
                disabled={!isAvailable}
                onClick={() => isAvailable && handleSelect(vehicle.id)}
              >
                <span className="text-base font-extrabold">{vehicle.number}</span>
                <Car size={20} className="opacity-70" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
