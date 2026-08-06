'use client';

import React, { useState, useMemo } from 'react';
import { Search, Trash2, X, Plus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Holiday } from './settingsTypes';

interface HolidaysTabProps {
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
}

export default function HolidaysTab({
  holidays,
  setHolidays
}: HolidaysTabProps) {

  // Local States
  const [holidaySearch, setHolidaySearch] = useState('');
  const [holidayPage, setHolidayPage] = useState(1);
  const [holidayLimit, setHolidayLimit] = useState(10);
  const [isHolidayAddOpen, setIsHolidayAddOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    startDate: '',
    endDate: '',
    status: true
  });

  // Operations
  const filteredHolidays = useMemo(() => {
    return holidays.filter(item => 
      item.startDate.toLowerCase().includes(holidaySearch.toLowerCase()) ||
      item.endDate.toLowerCase().includes(holidaySearch.toLowerCase())
    );
  }, [holidays, holidaySearch]);

  const paginatedHolidays = useMemo(() => {
    const start = (holidayPage - 1) * holidayLimit;
    return filteredHolidays.slice(start, start + holidayLimit);
  }, [filteredHolidays, holidayPage, holidayLimit]);

  const handleAddHoliday = (closeAfter = false) => {
    if (!holidayForm.startDate || !holidayForm.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newHoliday: Holiday = {
      startDate: holidayForm.startDate,
      endDate: holidayForm.endDate,
      status: holidayForm.status,
      createdDate: new Date().toLocaleString()
    };
    setHolidays([newHoliday, ...holidays]);
    toast.success('Holiday added successfully!');
    setHolidayForm({
      startDate: '',
      endDate: '',
      status: true
    });
    if (closeAfter) setIsHolidayAddOpen(false);
  };

  const executeDeleteHoliday = (index: number) => {
    setHolidays(holidays.filter((_, idx) => idx !== index));
    toast.success('Holiday deleted successfully!');
  };

  const handleDeleteHoliday = (index: number) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this holiday?</p>
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
              executeDeleteHoliday(index);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Holiday
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
            value={holidaySearch}
            onChange={(e) => { setHolidaySearch(e.target.value); setHolidayPage(1); }}
            placeholder="Search by Date"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9.5 pr-4 py-2 text-[12px] text-neutral-700 focus:outline-none focus:border-brand-primary"
          />
          {holidaySearch && (
            <button onClick={() => setHolidaySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setHolidayForm({ startDate: '', endDate: '', status: true });
            setIsHolidayAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#8a1538] hover:bg-[#70102b] text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Holiday
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-100 rounded-xl">
        <table className="w-full border-collapse text-left text-xs font-medium text-neutral-700">
          <thead className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3 border-b border-neutral-200">Start Date</th>
              <th className="px-5 py-3 border-b border-neutral-200">End Date</th>
              <th className="px-5 py-3 border-b border-neutral-200">Created Date</th>
              <th className="px-5 py-3 border-b border-neutral-200 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {paginatedHolidays.length > 0 ? (
              paginatedHolidays.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap font-800">{item.startDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-800">{item.endDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-neutral-400">{item.createdDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleDeleteHoliday(idx)}
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
                <td colSpan={4} className="px-5 py-10 text-center text-neutral-400">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Holiday Modal */}
      {isHolidayAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up font-sans">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-850 text-sm uppercase tracking-wider">Add Holiday</h3>
              <button onClick={() => setIsHolidayAddOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
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
                      value={holidayForm.startDate}
                      onChange={(e) => setHolidayForm({ ...holidayForm, startDate: e.target.value })}
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
                      value={holidayForm.endDate}
                      onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                      className="custom-date-pill w-full bg-white border border-neutral-300 rounded-xl pl-4 pr-10 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary cursor-pointer focus:ring-1 focus:ring-brand-primary/20"
                    />
                    <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setHolidayForm({ ...holidayForm, status: !holidayForm.status })}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-250 cursor-pointer flex items-center ${
                      holidayForm.status ? 'bg-[#16A34A]' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-250 ${
                      holidayForm.status ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`} />
                  </button>
                  <span className="text-xs font-750 text-neutral-700">Status</span>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex justify-end gap-2.5">
              <button
                onClick={() => handleAddHoliday(false)}
                className="px-5 py-2 rounded-lg border border-[#8a1538] text-[#8a1538] hover:bg-[#8a1538]/10 text-xs font-800 transition-colors cursor-pointer active:scale-95"
              >
                Submit
              </button>
              <button
                onClick={() => handleAddHoliday(true)}
                className="px-5 py-2 rounded-lg bg-[#8a1538] hover:bg-[#70102b] text-white text-xs font-800 transition-colors cursor-pointer"
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
