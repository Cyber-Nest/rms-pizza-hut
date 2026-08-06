"use client";

import React from "react";

export interface DriverCommissionSlipData {
  driverName?: string;
  reportDate?: string;
  reportTime?: string;
  commissionSales?: number;
  numberOfOrders?: number;
  ratePercent?: number;
  ratePerOrder?: number;
  totalBeforeCutoff?: number;
  bonus?: number;
  driverBaseCommission?: number;
  driverAdditionalCommission?: number;
  driverCommissionReason?: string;
  driverTotalCommission?: number;
  totalCommissionDue?: number;
  commissionPaid?: number;
  prepaidTipsPaid?: number;
  terminalTipsPaid?: number;
  totalTipsPaid?: number;
  totalDriverEarning?: number;
  totalPaid?: number;
}

interface ThermalDriverCommissionSlipProps {
  data?: DriverCommissionSlipData;
}

const fmt = (val?: number) => (typeof val === "number" && !isNaN(val) ? val.toFixed(2) : "0.00");

export default function ThermalDriverCommissionSlip({
  data,
}: ThermalDriverCommissionSlipProps) {
  if (!data) return null;

  const driverName = data.driverName || "DRIVER";
  const reportDate = data.reportDate || "";
  const reportTime = data.reportTime || "";
  
  const prepaidTipsPaid = fmt(data.prepaidTipsPaid);
  const terminalTipsPaid = fmt(data.terminalTipsPaid);
  const totalTipsPaid = fmt(data.totalTipsPaid ?? ((data.prepaidTipsPaid || 0) + (data.terminalTipsPaid || 0)));
  
  const numberOfOrders = data.numberOfOrders ?? 0;
  const driverBaseCommission = fmt(data.driverBaseCommission ?? (numberOfOrders * 6.00));
  const addlCommNum = data.driverAdditionalCommission ?? data.bonus ?? 0;
  const driverAdditionalCommission = fmt(addlCommNum);
  const driverTotalCommission = fmt(data.driverTotalCommission ?? (parseFloat(driverBaseCommission) + addlCommNum));
  const totalPaid = fmt(data.totalPaid ?? data.totalDriverEarning ?? ((data.prepaidTipsPaid || 0) + (data.terminalTipsPaid || 0) + parseFloat(driverTotalCommission)));

  return (
    <div className="thermal-receipt-container font-mono text-neutral-900 text-[11px] leading-tight select-none">
      <div className="w-[80mm] max-w-full bg-white p-4 mx-auto border border-dashed border-neutral-300 shadow-sm print:shadow-none print:border-none">
        
        {/* Banner Box Header */}
        <div className="text-center font-800 text-[11px] leading-snug tracking-wider">
          <p className="overflow-hidden whitespace-nowrap text-neutral-400">
            ****************************************
          </p>
          <p className="flex justify-between px-2 font-900 text-xs">
            <span>**</span>
            <span>Driver Earning Report</span>
            <span>**</span>
          </p>
          <p className="flex justify-between px-2 uppercase font-900">
            <span>**</span>
            <span>{driverName}</span>
            <span>**</span>
          </p>
          <p className="flex justify-between px-2 text-[10px] font-700 text-neutral-600">
            <span>**</span>
            <span>
              {reportDate} {reportTime}
            </span>
            <span>**</span>
          </p>
          <p className="overflow-hidden whitespace-nowrap text-neutral-400">
            ****************************************
          </p>
        </div>

        {/* Simplified Breakdown */}
        <div className="py-3 space-y-2 text-[11px]">
          
          {/* TIPS SECTION */}
          <div className="space-y-1">
            <div className="flex justify-between font-600">
              <span>Prepaid Tips</span>
              <span className="font-700">{prepaidTipsPaid}</span>
            </div>

            <div className="flex justify-between font-600">
              <span>Terminal Tips</span>
              <span className="font-700">{terminalTipsPaid}</span>
            </div>

            <div className="flex justify-between font-800 border-t border-dotted border-neutral-300 pt-1 text-neutral-900">
              <span>Total Tips</span>
              <span>{totalTipsPaid}</span>
            </div>
          </div>

          {/* COMMISSION SECTION */}
          <div className="pt-2 border-t border-dashed border-neutral-300 space-y-1">
            <div className="flex justify-between font-600">
              <span>Driver Base commission</span>
              <span className="font-700">{driverBaseCommission}</span>
            </div>

            {addlCommNum > 0 && (
              <div className="flex justify-between font-700 text-amber-900">
                <span>Driver Additional commission</span>
                <span>{driverAdditionalCommission}</span>
              </div>
            )}

            <div className="flex justify-between font-800 border-t border-dotted border-neutral-300 pt-1 text-neutral-900">
              <span>Driver Total Commission</span>
              <span>{driverTotalCommission}</span>
            </div>
          </div>

          {/* TOTAL DRIVER EARNING GRAND TOTAL */}
          <div className="flex justify-between font-900 text-[12.5px] pt-3 border-t-2 border-b-2 border-black py-1.5 mt-2">
            <span>Total Driver Earning</span>
            <span className="font-900">${totalPaid}</span>
          </div>

        </div>

        {/* Driver Signature Line */}
        <div className="pt-4 pb-2 space-y-4 text-[10.5px]">
          <p className="font-600 leading-snug text-neutral-800">
            I have received the above amount in cash.
          </p>
          <div className="pt-2">
            <p className="font-700">Signature: __________________________</p>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="text-center font-800 text-[10px] pt-1">
          <p className="overflow-hidden whitespace-nowrap text-neutral-400">
            ****************************************
          </p>
        </div>

      </div>
    </div>
  );
}
