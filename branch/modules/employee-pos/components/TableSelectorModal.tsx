'use client';

import React from 'react';
import { X, TableProperties } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePosStore } from '../store/pos.store';
import { TableInfo } from '../types';

const DUMMY_TABLES: TableInfo[] = [
  { id: 't1', name: 'Table 1', status: 'available' },
  { id: 't2', name: 'Table 2', status: 'occupied'  },
  { id: 't3', name: 'Table 3', status: 'reserved'  },
  { id: 't4', name: 'Table 4', status: 'available' },
  { id: 't5', name: 'Table 5', status: 'available' },
  { id: 't6', name: 'Table 6', status: 'available' },
];

const STATUS_STYLES: Record<TableInfo['status'], string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 cursor-pointer',
  occupied:  'border-red-200 bg-red-50 text-red-500 opacity-70 cursor-not-allowed',
  reserved:  'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 cursor-pointer',
};

const STATUS_DOT: Record<TableInfo['status'], string> = {
  available: 'bg-emerald-500',
  occupied:  'bg-red-400',
  reserved:  'bg-amber-500',
};

export default function TableSelectorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedTable, setTable } = usePosStore();
  if (!isOpen) return null;

  const handleSelect = (t: TableInfo) => {
    if (t.status === 'occupied') { 
      toast.error('This table is occupied. Choose another.'); 
      return; 
    }
    setTable(t); onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-[13px] font-700 text-neutral-900">Select Dining Table</h3>
            <p className="text-[9.5px] text-neutral-400 font-500 mt-0.5">Choose an available or reserved table</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all cursor-pointer">
            <X size={13} />
          </button>
        </div>

        {/* Table Grid */}
        <div className="p-5 grid grid-cols-3 gap-3">
          {DUMMY_TABLES.map((table) => {
            const isActive = selectedTable?.id === table.id;
            return (
              <button
                key={table.id}
                onClick={() => handleSelect(table)}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-95 ${
                  isActive
                    ? 'border-brand-primary bg-orange-50 ring-2 ring-brand-primary/30'
                    : STATUS_STYLES[table.status]
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center border shadow-sm ${isActive ? 'border-brand-primary/30' : 'border-neutral-200'}`}>
                  <TableProperties size={18} className={isActive ? 'text-brand-primary' : 'text-neutral-500'} />
                </div>
                <span className={`text-[11px] font-700 ${isActive ? 'text-brand-primary' : ''}`}>{table.name}</span>
                {/* Status dot */}
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-primary' : STATUS_DOT[table.status]}`} />
                  <span className="text-[8px] font-600 uppercase tracking-wide text-neutral-500">{table.status}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend + Actions */}
        <div className="flex items-center justify-between px-5 pb-5 gap-3">
          <div className="flex items-center gap-3 text-[9px] font-500 text-neutral-400">
            {[['bg-emerald-500', 'Available'], ['bg-amber-500', 'Reserved'], ['bg-red-400', 'Occupied']].map(([dot, label]) => (
              <div key={label} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {selectedTable && (
              <button onClick={() => { setTable(null); onClose(); }}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-[10px] font-600 text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer">
                Clear
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-700 hover:bg-brand-primary-hover transition-all cursor-pointer shadow-sm">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
