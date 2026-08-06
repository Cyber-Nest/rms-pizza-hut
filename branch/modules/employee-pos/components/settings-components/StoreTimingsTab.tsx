import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, Edit3, Check, X } from 'lucide-react';
import { StoreTiming } from './settingsTypes';

interface StoreTimingsTabProps {
  storeTimings: StoreTiming[];
  setStoreTimings: React.Dispatch<React.SetStateAction<StoreTiming[]>>;
  isEmergencyClosed: boolean;
  setIsEmergencyClosed: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (e: React.FormEvent) => void;
}

export default function StoreTimingsTab({
  storeTimings,
  setStoreTimings,
  isEmergencyClosed,
  setIsEmergencyClosed,
  onSubmit
}: StoreTimingsTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleTimingFieldChange = (index: number, field: keyof StoreTiming, value: string) => {
    setStoreTimings(storeTimings.map((t, idx) => 
      idx === index ? { ...t, [field]: value } : t
    ));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
    setIsEditing(false);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      
      {/* Today Closed Switch */}
      <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
        isEmergencyClosed ? "bg-rose-50 border-rose-200" : "bg-neutral-50/80 border-neutral-200/80"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            isEmergencyClosed ? "bg-rose-600 text-white" : "bg-emerald-100 text-emerald-700"
          }`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wide">
              Emergency Today Restaurant Closed Override
            </h4>
            <p className="text-[11px] text-neutral-600 mt-0.5 font-medium">
              {isEmergencyClosed
                ? "Restaurant is currently marked CLOSED for today on Customer App"
                : "Restaurant is operating under normal weekly schedule"}
            </p>
          </div>
        </div>

        <label className={`relative inline-flex items-center shrink-0 ${isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
          <input
            type="checkbox"
            disabled={!isEditing}
            checked={isEmergencyClosed}
            onChange={(e) => setIsEmergencyClosed(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
          <span className="ml-2.5 text-xs font-bold text-neutral-800">
            {isEmergencyClosed ? "CLOSED TODAY" : "NORMAL SCHEDULE"}
          </span>
        </label>
      </div>
      
      {/* Timings Table */}
      <div className="overflow-x-auto border border-neutral-200/80 rounded-xl">
        <table className="w-full border-collapse text-left text-xs font-medium text-neutral-700">
          <thead className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-6 py-3 border-b border-neutral-200">Day</th>
              <th className="px-6 py-3 border-b border-neutral-200">Start Time</th>
              <th className="px-6 py-3 border-b border-neutral-200">End Time</th>
              <th className="px-6 py-3 border-b border-neutral-200">Is Holiday</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {storeTimings.map((t, idx) => (
              <tr key={t.day} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-800 text-neutral-800">{t.day}</td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={t.startTime}
                    onChange={(e) => handleTimingFieldChange(idx, 'startTime', e.target.value)}
                    className={`border rounded-xl px-4 py-1.5 text-xs text-neutral-800 focus:outline-none w-[140px] font-bold ${
                      isEditing
                        ? "bg-white border-neutral-300 focus:border-brand-primary ring-1 ring-brand-primary/10"
                        : "bg-neutral-100/70 border-neutral-200/60 cursor-not-allowed text-neutral-600"
                    }`}
                  />
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={t.endTime}
                    onChange={(e) => handleTimingFieldChange(idx, 'endTime', e.target.value)}
                    className={`border rounded-xl px-4 py-1.5 text-xs text-neutral-800 focus:outline-none w-[140px] font-bold ${
                      isEditing
                        ? "bg-white border-neutral-300 focus:border-brand-primary ring-1 ring-brand-primary/10"
                        : "bg-neutral-100/70 border-neutral-200/60 cursor-not-allowed text-neutral-600"
                    }`}
                  />
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="relative w-[110px]">
                    <select
                      disabled={!isEditing}
                      value={t.isHoliday}
                      onChange={(e) => handleTimingFieldChange(idx, 'isHoliday', e.target.value)}
                      className={`w-full border rounded-xl px-4 py-1.5 text-xs text-neutral-800 focus:outline-none appearance-none font-bold ${
                        isEditing
                          ? "bg-white border-neutral-300 focus:border-brand-primary cursor-pointer"
                          : "bg-neutral-100/70 border-neutral-200/60 cursor-not-allowed text-neutral-600"
                      }`}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Controls: Edit / Cancel & Submit Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            {/* <Edit3 size={14} /> */}
            <span>Edit Timings</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-full bg-[#8a1538] hover:bg-[#70102b] text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#8a1538]/20 flex items-center gap-1.5 active:scale-95"
            >
              <Check size={14} />
              <span>Submit</span>
            </button>
          </>
        )}
      </div>

    </form>
  );
}
