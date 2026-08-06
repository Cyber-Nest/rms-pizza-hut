'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: string) => void;
}

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatPreviewDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const todayStr = getTodayString();
  if (dateStr === todayStr) return 'Today';
  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const isValidPartialTime = (val: string): boolean => {
  if (val.length === 0) return true;
  if (!/^[0-2]/.test(val[0])) return false;
  if (val.length > 1) {
    const limit = val[0] === '2' ? /[0-3]/ : /[0-9]/;
    if (!limit.test(val[1])) return false;
  }
  if (val.length > 2 && val[2] !== ':') return false;
  if (val.length > 3 && !/[0-5]/.test(val[3])) return false;
  if (val.length > 4 && !/[0-9]/.test(val[4])) return false;
  return true;
};

export default function OrderLaterModal({ isOpen, onClose, onConfirm }: OrderLaterModalProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedTime, setSelectedTime] = useState('10:00'); // default 10:00

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;

    // Validate 24h format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(selectedTime)) {
      toast.error('Please enter time in valid 24h format (HH:MM), e.g. 14:30 or 09:15');
      return;
    }

    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);

    const scheduled = new Date(year, month - 1, day, hours, minutes, 0, 0);
    onConfirm(scheduled.toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="bg-brand-primary px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-white" />
            <h3 className="text-[13px] font-700 text-white uppercase tracking-wide">Day & Hour of Pickup</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-all cursor-pointer"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-[11px] text-neutral-500 text-center font-500">Day & hours of pickup</p>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Selector */}
            <div>
              <label className="block text-[10px] font-600 text-neutral-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Calendar size={10} /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={getTodayString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 cursor-pointer"
              />
            </div>

            {/* Time Selector */}
            <div>
              <label className="block text-[10px] font-600 text-neutral-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                <Clock size={10} /> Time (HH:MM 24h)
              </label>
              <input
                type="text"
                maxLength={5}
                placeholder="14:30"
                value={selectedTime}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length > 4) val = val.slice(0, 4);
                  if (val.length > 2) {
                    val = val.slice(0, 2) + ':' + val.slice(2);
                  }
                  if (isValidPartialTime(val)) {
                    setSelectedTime(val);
                  }
                }}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-500 text-neutral-800 bg-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-neutral-500 font-500">Scheduled for</p>
            <p className="text-[13px] font-700 text-brand-primary mt-0.5">
              {formatPreviewDate(selectedDate)}, {selectedTime}
            </p>
            <p className="text-[9px] text-neutral-400 mt-0.5">This order will be prioritized in the queue at the scheduled time</p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-[12px] font-700 transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
