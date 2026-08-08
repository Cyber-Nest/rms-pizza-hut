'use client';

import React, { useState, useMemo } from 'react';
import { Search, Trash2, X, Plus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { TimingUpdate } from './settingsTypes';

interface StoreTimingsUpdateTabProps {
  timingsUpdates: TimingUpdate[];
  setTimingsUpdates: React.Dispatch<React.SetStateAction<TimingUpdate[]>>;
}

export default function StoreTimingsUpdateTab({
  timingsUpdates,
  setTimingsUpdates
}: StoreTimingsUpdateTabProps) {

  // Local States
  const [timingsUpdateSearch, setTimingsUpdateSearch] = useState('');
  const [timingsUpdatePage, setTimingsUpdatePage] = useState(1);
  const [timingsUpdateLimit, setTimingsUpdateLimit] = useState(10);
  const [isTimingUpdateAddOpen, setIsTimingUpdateAddOpen] = useState(false);
  const [timingUpdateForm, setTimingUpdateForm] = useState({
    startDate: '',
    endDate: '',
    startTime: '10:00 AM',
    endTime: '10:00 PM',
    status: true
  });

  // Operations
  const filteredTimingsUpdates = useMemo(() => {
    return timingsUpdates.filter(item => 
      item.startDate.toLowerCase().includes(timingsUpdateSearch.toLowerCase()) ||
      item.endDate.toLowerCase().includes(timingsUpdateSearch.toLowerCase())
    );
  }, [timingsUpdates, timingsUpdateSearch]);

  const paginatedTimingsUpdates = useMemo(() => {
    const start = (timingsUpdatePage - 1) * timingsUpdateLimit;
    return filteredTimingsUpdates.slice(start, start + timingsUpdateLimit);
  }, [filteredTimingsUpdates, timingsUpdatePage, timingsUpdateLimit]);

  const handleAddTimingUpdate = (closeAfter = false) => {
    if (!timingUpdateForm.startDate || !timingUpdateForm.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newUpdate: TimingUpdate = {
      startDate: timingUpdateForm.startDate,
      endDate: timingUpdateForm.endDate,
      startTime: timingUpdateForm.startTime,
      endTime: timingUpdateForm.endTime,
      status: timingUpdateForm.status,
      createdDate: new Date().toLocaleString()
    };
    setTimingsUpdates([newUpdate, ...timingsUpdates]);
    toast.success('Holiday Timing Update added successfully!');
    setTimingUpdateForm({
      startDate: '',
      endDate: '',
      startTime: '10:00 AM',
      endTime: '10:00 PM',
      status: true
    });
    if (closeAfter) setIsTimingUpdateAddOpen(false);
  };

  const executeDeleteTimingUpdate = (index: number) => {
    setTimingsUpdates(timingsUpdates.filter((_, idx) => idx !== index));
    toast.success('Timing update deleted successfully!');
  };

  const handleDeleteTimingUpdate = (index: number) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this timing update?</p>
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
              executeDeleteTimingUpdate(index);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Timing Update
          </button>
        </div>
      </div>
    ), { duration: 5000, position: 'top-center' });
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Add Action */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="relative w-full sm:w-[260px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={timingsUpdateSearch}
            onChange={(e) => { setTimingsUpdateSearch(e.target.value); setTimingsUpdatePage(1); }}
            placeholder="Search by Date"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9.5 pr-4 py-2 text-[12px] text-neutral-700 focus:outline-none focus:border-brand-primary"
          />
          {timingsUpdateSearch && (
            <button onClick={() => setTimingsUpdateSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setTimingUpdateForm({ startDate: '', endDate: '', startTime: '10:00 AM', endTime: '10:00 PM', status: true });
            setIsTimingUpdateAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#e31837] hover:bg-[#b9142d] text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Timing Update
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-100 rounded-xl">
        <table className="w-full border-collapse text-left text-xs font-medium text-neutral-700">
          <thead className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3 border-b border-neutral-200">Start Date</th>
              <th className="px-5 py-3 border-b border-neutral-200">End Date</th>
              <th className="px-5 py-3 border-b border-neutral-200">Start Time</th>
              <th className="px-5 py-3 border-b border-neutral-200">End Time</th>
              <th className="px-5 py-3 border-b border-neutral-200">Created Date</th>
              <th className="px-5 py-3 border-b border-neutral-200 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {paginatedTimingsUpdates.length > 0 ? (
              paginatedTimingsUpdates.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap font-800">{item.startDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-800">{item.endDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{item.startTime}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{item.endTime}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-neutral-400">{item.createdDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleDeleteTimingUpdate(idx)}
                      className="w-8 h-8 rounded-full bg-red-650 text-white hover:bg-red-750 flex items-center justify-center transition-all duration-150 active:scale-90 mx-auto cursor-pointer shadow-xs"
                      title="Delete"
                    >
                      <Trash2 size={13} strokeWidth={2.5} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Timing Update Modal */}
      {isTimingUpdateAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up font-sans">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-850 text-sm uppercase tracking-wider">Add Holiday</h3>
              <button onClick={() => setIsTimingUpdateAddOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Start Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={timingUpdateForm.startDate}
                      onChange={(e) => setTimingUpdateForm({ ...timingUpdateForm, startDate: e.target.value })}
                      className="custom-date-pill w-full bg-white border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary cursor-pointer focus:ring-1 focus:ring-brand-primary/20"
                    />
                    <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">End Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={timingUpdateForm.endDate}
                      onChange={(e) => setTimingUpdateForm({ ...timingUpdateForm, endDate: e.target.value })}
                      className="custom-date-pill w-full bg-white border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary cursor-pointer focus:ring-1 focus:ring-brand-primary/20"
                    />
                    <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Start Time</label>
                  <input
                    type="text"
                    value={timingUpdateForm.startTime}
                    onChange={(e) => setTimingUpdateForm({ ...timingUpdateForm, startTime: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">End Time</label>
                  <input
                    type="text"
                    value={timingUpdateForm.endTime}
                    onChange={(e) => setTimingUpdateForm({ ...timingUpdateForm, endTime: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. 10:00 PM"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTimingUpdateForm({ ...timingUpdateForm, status: !timingUpdateForm.status })}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-250 cursor-pointer flex items-center ${
                      timingUpdateForm.status ? 'bg-[#16A34A]' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-250 ${
                      timingUpdateForm.status ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`} />
                  </button>
                  <span className="text-xs font-750 text-neutral-700">Status</span>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex justify-end gap-2.5">
              <button
                onClick={() => handleAddTimingUpdate(false)}
                className="px-5 py-2 rounded-lg border border-[#e31837] text-[#e31837] hover:bg-[#e31837]/10 text-xs font-800 transition-colors cursor-pointer active:scale-95"
              >
                Submit
              </button>
              <button
                onClick={() => handleAddTimingUpdate(true)}
                className="px-5 py-2 rounded-lg bg-[#e31837] hover:bg-[#b9142d] text-white text-xs font-800 transition-colors cursor-pointer"
              >
                Submit & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
