'use client';

import React, { useState, useMemo } from 'react';
import { Search, Trash2, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Till } from './settingsTypes';

interface TillSetupTabProps {
  tills: Till[];
  setTills: React.Dispatch<React.SetStateAction<Till[]>>;
}

export default function TillSetupTab({
  tills,
  setTills
}: TillSetupTabProps) {

  // Local States
  const [tillSearch, setTillSearch] = useState('');
  const [tillPage, setTillPage] = useState(1);
  const [tillLimit, setTillLimit] = useState(10);
  const [isTillAddOpen, setIsTillAddOpen] = useState(false);
  const [tillForm, setTillForm] = useState({
    tillNo: '',
    tillName: ''
  });

  // Operations
  const filteredTills = useMemo(() => {
    return tills.filter(t => 
      t.tillNo.toLowerCase().includes(tillSearch.toLowerCase()) ||
      t.tillName.toLowerCase().includes(tillSearch.toLowerCase())
    );
  }, [tills, tillSearch]);

  const paginatedTills = useMemo(() => {
    const start = (tillPage - 1) * tillLimit;
    return filteredTills.slice(start, start + tillLimit);
  }, [filteredTills, tillPage, tillLimit]);

  const handleAddTill = (closeAfter = false) => {
    if (!tillForm.tillNo || !tillForm.tillName) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Check if duplicate till no exists
    if (tills.some(t => t.tillNo === tillForm.tillNo)) {
      toast.error('Till Number already exists');
      return;
    }
    const newTill: Till = {
      tillNo: tillForm.tillNo,
      tillName: tillForm.tillName,
      createdDate: new Date().toLocaleString()
    };
    setTills([newTill, ...tills]);
    toast.success('Till Setup added successfully!');
    setTillForm({ tillNo: '', tillName: '' });
    if (closeAfter) setIsTillAddOpen(false);
  };

  const executeDeleteTill = (tillNo: string) => {
    setTills(tills.filter(t => t.tillNo !== tillNo));
    toast.success('Till Setup deleted successfully!');
  };

  const handleDeleteTill = (tillNo: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete Till {tillNo}?</p>
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
              executeDeleteTill(tillNo);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Till
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
            value={tillSearch}
            onChange={(e) => { setTillSearch(e.target.value); setTillPage(1); }}
            placeholder="Search by Keyword"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9.5 pr-4 py-2 text-[12px] text-neutral-700 focus:outline-none focus:border-brand-primary"
          />
          {tillSearch && (
            <button onClick={() => setTillSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setTillForm({ tillNo: '', tillName: '' });
            setIsTillAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#e31837] hover:bg-[#b9142d] text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Till Setup
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-100 rounded-xl">
        <table className="w-full border-collapse text-left text-xs font-medium text-neutral-700">
          <thead className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3 border-b border-neutral-200">Till No</th>
              <th className="px-5 py-3 border-b border-neutral-200">Till Name</th>
              <th className="px-5 py-3 border-b border-neutral-200">Created Date</th>
              <th className="px-5 py-3 border-b border-neutral-200 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {paginatedTills.length > 0 ? (
              paginatedTills.map((till, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono">{till.tillNo}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-800">{till.tillName}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-neutral-400">{till.createdDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleDeleteTill(till.tillNo)}
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
                  No data available in table
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Controls */}
      {tills.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-[11px] text-neutral-500 font-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={tillLimit}
              onChange={(e) => { setTillLimit(Number(e.target.value)); setTillPage(1); }}
              className="border border-neutral-200 rounded px-1.5 py-0.5 bg-neutral-50 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>entries</span>
          </div>

          <div>
            Showing {(tillPage - 1) * tillLimit + 1} to {Math.min(tillPage * tillLimit, filteredTills.length)} of {filteredTills.length} entries
          </div>

          <div className="flex items-center gap-1.5 select-none text-[10.5px]">
            <button
              disabled={tillPage === 1}
              onClick={() => setTillPage(p => Math.max(1, p - 1))}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
                tillPage === 1
                  ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ChevronLeft size={13} strokeWidth={2.5} />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full bg-brand-primary text-white font-800 cursor-pointer shadow-3xs border border-brand-primary"
            >
              {tillPage}
            </button>
            <button
              disabled={tillPage >= Math.ceil(filteredTills.length / tillLimit)}
              onClick={() => setTillPage(p => p + 1)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
                tillPage >= Math.ceil(filteredTills.length / tillLimit)
                  ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Add Till Setup Modal */}
      {isTillAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up font-sans">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-850 text-sm uppercase tracking-wider">Add Till Setup</h3>
              <button onClick={() => setIsTillAddOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Till No *</label>
                  <input
                    type="text"
                    value={tillForm.tillNo}
                    onChange={(e) => setTillForm({ ...tillForm, tillNo: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. 01"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Till Name *</label>
                  <input
                    type="text"
                    value={tillForm.tillName}
                    onChange={(e) => setTillForm({ ...tillForm, tillName: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. Till Main"
                  />
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex justify-end gap-2.5">
              <button
                onClick={() => handleAddTill(false)}
                className="px-5 py-2 rounded-lg border border-[#e31837] text-[#e31837] hover:bg-[#e31837]/10 text-xs font-800 transition-colors cursor-pointer active:scale-95"
              >
                Submit
              </button>
              <button
                onClick={() => handleAddTill(true)}
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
