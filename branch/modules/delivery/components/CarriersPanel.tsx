'use client';

import React from 'react';
import { Car, Phone, MapPin, Truck, User } from 'lucide-react';
import { useDeliveryStore } from '../store/deliveryStore';

export default function CarriersPanel() {
  const drivers = useDeliveryStore((s) => s.drivers);
  const carrierFilter = useDeliveryStore((s) => s.carrierFilter);
  const setCarrierFilter = useDeliveryStore((s) => s.setCarrierFilter);
  const getCarrierCounts = useDeliveryStore((s) => s.getCarrierCounts);
  const getFilteredDrivers = useDeliveryStore((s) => s.getFilteredDrivers);
  const openVehicleModal = useDeliveryStore((s) => s.openVehicleModal);
  const unassignVehicle = useDeliveryStore((s) => s.unassignVehicle);
  const selectDriver = useDeliveryStore((s) => s.selectDriver);
  const selectedDriverId = useDeliveryStore((s) => s.selectedDriverId);
  const markDriverAvailable = useDeliveryStore((s) => s.markDriverAvailable);

  const counts = getCarrierCounts();
  const filteredDrivers = getFilteredDrivers();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Carrier Filter Buttons */}
      <div className="flex gap-1.5 px-3.5 py-3 border-b border-neutral-100">
        <button
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all cursor-pointer ${
            carrierFilter === 'available'
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
          }`}
          onClick={() => setCarrierFilter('available')}
        >
          Available ({counts.available})
        </button>
        <button
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all cursor-pointer ${
            carrierFilter === 'en-route'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
          }`}
          onClick={() => setCarrierFilter('en-route')}
        >
          En Route ({counts.enRoute})
        </button>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-widest border-b border-neutral-100">
        <span>{carrierFilter === 'available' ? 'Available Drivers' : 'Drivers On Delivery'}</span>
        <span className="bg-neutral-100 text-neutral-600 text-[10px] px-2 py-0.5 rounded-full">{filteredDrivers.length}</span>
      </div>

      {/* Driver Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5">
        {filteredDrivers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-neutral-400 text-sm py-10">
            <Truck size={32} strokeWidth={1.2} />
            <p>No {carrierFilter === 'available' ? 'available' : 'en-route'} drivers</p>
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className={`bg-white border rounded-xl p-3 px-3.5 cursor-pointer transition-all animate-scale-up
                ${selectedDriverId === driver.id
                  ? 'border-brand-primary shadow-[0_0_0_1px_#e31837,0_3px_12px_rgba(227,24,55,0.08)]'
                  : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                }`}
              onClick={() => selectDriver(driver.id)}
            >
              {/* Top Row */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full border-[2.5px] bg-neutral-100 flex items-center justify-center text-neutral-500"
                    style={{
                      borderColor:
                        driver.status === 'available'
                          ? '#16A34A'
                          : driver.status === 'returning'
                          ? '#EA580C'
                          : '#DC2626'
                    }}
                  >
                    <User size={16} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] lg:text-[14.5px] font-semibold text-neutral-900">{driver.name}</span>
                      {driver.driverId && (
                        <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded font-mono">
                          #{driver.driverId}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-[11px] lg:text-[12.5px] text-neutral-500">
                      <Phone size={10} />
                      {driver.phone}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] lg:text-[11.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                    driver.status === 'available'
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : driver.status === 'offline'
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : driver.status === 'returning'
                      ? 'text-purple-600 bg-purple-50 border-purple-200'
                      : 'text-blue-600 bg-blue-50 border-blue-200'
                  }`}
                >
                  {driver.status === 'available'
                    ? 'Available'
                    : driver.status === 'offline'
                    ? 'Checked In · Awaiting App'
                    : driver.status === 'returning'
                    ? 'Returning'
                    : 'On Delivery'}
                </span>
              </div>

              {/* Vehicle Info */}
              <div className="flex flex-col gap-1.5">
                {driver.assignedVehicle ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11.5px] lg:text-[13px] font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-md">
                      <Car size={13} />
                      <span>Vehicle #{driver.assignedVehicle.number}</span>
                    </div>
                    {driver.status === 'available' && (
                      <div className="flex gap-1">
                        <button
                          className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVehicleModal(driver.id);
                          }}
                        >
                          Change
                        </button>
                        <button
                          className="px-2.5 py-0.5 text-[10.5px] font-semibold rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            unassignVehicle(driver.id);
                          }}
                        >
                          Unassign
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openVehicleModal(driver.id);
                    }}
                  >
                    <Car size={14} />
                    Assign Vehicle
                  </button>
                )}

                {driver.status === 'returning' && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-purple-600 font-semibold animate-pulse">
                      <MapPin size={11} />
                      <span>Returning...</span>
                    </div>
                    <button
                      className="px-2 py-0.5 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded transition-colors cursor-pointer"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await markDriverAvailable(driver.id);
                      }}
                    >
                      Mark Available
                    </button>
                  </div>
                )}

                {driver.activeOrders.length > 0 && driver.status === 'on-delivery' && (
                  <div className="flex items-center gap-1 text-[10.5px] text-blue-600 font-medium">
                    <MapPin size={11} />
                    <span>{driver.activeOrders.length} active order{driver.activeOrders.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
