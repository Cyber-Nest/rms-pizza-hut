'use client';

import React, { useState, useMemo } from 'react';
import { Search, Eye, Edit2, Trash2, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Terminal } from './settingsTypes';

interface TerminalSetupTabProps {
  terminals: Terminal[];
  setTerminals: React.Dispatch<React.SetStateAction<Terminal[]>>;
}

export default function TerminalSetupTab({
  terminals,
  setTerminals
}: TerminalSetupTabProps) {

  // Local States
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [isTerminalAddOpen, setIsTerminalAddOpen] = useState(false);
  const [isTerminalEditOpen, setIsTerminalEditOpen] = useState(false);
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalPage, setTerminalPage] = useState(1);
  const [terminalLimit, setTerminalLimit] = useState(10);
  const [terminalForm, setTerminalForm] = useState({
    _id: '',
    realDevices: true,
    terminalName: '',
    terminalId: '',
    apiToken: '',
    storeId: ''
  });

  // Operations
  const filteredTerminals = useMemo(() => {
    return terminals.filter(t => 
      t.terminalName.toLowerCase().includes(terminalSearch.toLowerCase()) ||
      t.terminalId.toLowerCase().includes(terminalSearch.toLowerCase()) ||
      t.storeId.toLowerCase().includes(terminalSearch.toLowerCase())
    );
  }, [terminals, terminalSearch]);

  const paginatedTerminals = useMemo(() => {
    const start = (terminalPage - 1) * terminalLimit;
    return filteredTerminals.slice(start, start + terminalLimit);
  }, [filteredTerminals, terminalPage, terminalLimit]);

  const handleAddTerminal = (closeAfter = false) => {
    if (!terminalForm.terminalName || !terminalForm.terminalId || !terminalForm.apiToken || !terminalForm.storeId) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newTerminal: Terminal = {
      _id: String(Date.now()),
      realDevices: terminalForm.realDevices ? 'Yes' : 'No',
      terminalName: terminalForm.terminalName,
      terminalId: terminalForm.terminalId,
      apiToken: terminalForm.apiToken,
      storeId: terminalForm.storeId,
      createdDate: new Date().toLocaleString(),
      updatedDate: new Date().toLocaleString(),
      createdBy: 'Manager'
    };
    setTerminals([newTerminal, ...terminals]);
    toast.success('Terminal added successfully!');
    setTerminalForm({ _id: '', realDevices: true, terminalName: '', terminalId: '', apiToken: '', storeId: '' });
    if (closeAfter) setIsTerminalAddOpen(false);
  };

  const handleEditTerminalSave = () => {
    setTerminals(terminals.map(t => 
      t._id === terminalForm._id 
        ? {
            ...t,
            realDevices: terminalForm.realDevices ? 'Yes' : 'No',
            terminalName: terminalForm.terminalName,
            terminalId: terminalForm.terminalId,
            apiToken: terminalForm.apiToken,
            storeId: terminalForm.storeId,
            updatedDate: new Date().toLocaleString()
          }
        : t
    ));
    toast.success('Terminal updated successfully!');
    setIsTerminalEditOpen(false);
  };

  const executeDeleteTerminal = (id: string) => {
    setTerminals(terminals.filter(t => t._id !== id));
    toast.success('Terminal deleted successfully!');
  };

  const handleDeleteTerminal = (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1 text-xs">
        <p className="font-700 text-neutral-900">Are you sure you want to delete this terminal?</p>
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
              executeDeleteTerminal(id);
            }}
            className="px-2.5 py-1 font-700 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer shadow-sm"
          >
            Delete Terminal
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
            value={terminalSearch}
            onChange={(e) => { setTerminalSearch(e.target.value); setTerminalPage(1); }}
            placeholder="Search by Keyword"
            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9.5 pr-4 py-2 text-[12px] text-neutral-700 focus:outline-none focus:border-brand-primary"
          />
          {terminalSearch && (
            <button onClick={() => setTerminalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setTerminalForm({ _id: '', realDevices: true, terminalName: '', terminalId: '', apiToken: '', storeId: '' });
            setIsTerminalAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#e31837] hover:bg-[#b9142d] text-white text-[12px] font-800 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Terminal Setup
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-100 rounded-xl">
        <table className="w-full border-collapse text-left text-xs font-medium text-neutral-700">
          <thead className="bg-neutral-900 text-white font-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3 border-b border-neutral-200">Real Devices</th>
              <th className="px-5 py-3 border-b border-neutral-200">Terminal Name</th>
              <th className="px-5 py-3 border-b border-neutral-200">Terminal ID</th>
              <th className="px-5 py-3 border-b border-neutral-200">API Token</th>
              <th className="px-5 py-3 border-b border-neutral-200">Store ID</th>
              <th className="px-5 py-3 border-b border-neutral-200">Created Date</th>
              <th className="px-5 py-3 border-b border-neutral-200 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {paginatedTerminals.length > 0 ? (
              paginatedTerminals.map((term) => (
                <tr key={term._id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap">{term.realDevices}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-800">{term.terminalName}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono">{term.terminalId}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono text-neutral-500">{term.apiToken}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-neutral-500">{term.storeId}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-neutral-400">{term.createdDate}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* View Action */}
                      <button
                        onClick={() => { setSelectedTerminal(term); setIsTerminalModalOpen(true); }}
                        className="w-8 h-8 rounded-full bg-neutral-800 text-white hover:bg-neutral-900 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                        title="View details"
                      >
                        <Eye size={13} strokeWidth={2.5} />
                      </button>
                      {/* Edit Action */}
                      <button
                        onClick={() => {
                          setTerminalForm({
                            _id: term._id,
                            realDevices: term.realDevices === 'Yes',
                            terminalName: term.terminalName,
                            terminalId: term.terminalId,
                            apiToken: term.apiToken,
                            storeId: term.storeId
                          });
                          setIsTerminalEditOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-[#e31837] text-white hover:bg-[#b9142d] flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                        title="Edit"
                      >
                        <Edit2 size={13} strokeWidth={2.5} />
                      </button>
                      {/* Delete Action */}
                      <button
                        onClick={() => handleDeleteTerminal(term._id)}
                        className="w-8 h-8 rounded-full bg-red-650 text-white hover:bg-red-750 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-xs"
                        title="Delete"
                      >
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-neutral-400">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-[11px] text-neutral-500 font-600">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={terminalLimit}
            onChange={(e) => { setTerminalLimit(Number(e.target.value)); setTerminalPage(1); }}
            className="border border-neutral-200 rounded px-1.5 py-0.5 bg-neutral-50 focus:outline-none focus:border-brand-primary cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        <div>
          Showing {filteredTerminals.length > 0 ? (terminalPage - 1) * terminalLimit + 1 : 0} to {Math.min(terminalPage * terminalLimit, filteredTerminals.length)} of {filteredTerminals.length} entries {filteredTerminals.length !== terminals.length && `(filtered from ${terminals.length} total entries)`}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1.5 select-none text-[10.5px]">
          <button
            disabled={terminalPage === 1}
            onClick={() => setTerminalPage(p => Math.max(1, p - 1))}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
              terminalPage === 1
                ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
          </button>
          {Array.from({ length: Math.ceil(filteredTerminals.length / terminalLimit) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setTerminalPage(p)}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
                terminalPage === p 
                  ? 'bg-brand-primary text-white font-800 border border-brand-primary' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={terminalPage >= Math.ceil(filteredTerminals.length / terminalLimit)}
            onClick={() => setTerminalPage(p => p + 1)}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer active:scale-95 shadow-3xs ${
              terminalPage >= Math.ceil(filteredTerminals.length / terminalLimit)
                ? 'bg-transparent text-neutral-300 cursor-not-allowed'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* A. Terminal Detail Modal */}
      {isTerminalModalOpen && selectedTerminal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up font-sans">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-850 text-sm uppercase tracking-wider">Terminal Details</h3>
              <button onClick={() => setIsTerminalModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-neutral-100 pb-3">
                <div>
                  <span className="font-800 text-neutral-450 uppercase text-[9px] tracking-wide block">Terminal Name</span>
                  <span className="font-800 text-neutral-800 text-sm">{selectedTerminal.terminalName}</span>
                </div>
                <div>
                  <span className="font-800 text-neutral-450 uppercase text-[9px] tracking-wide block">Real Devices</span>
                  <span className="font-850 text-neutral-800">{selectedTerminal.realDevices}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-800 text-neutral-450 uppercase text-[9px] tracking-wide block">Terminal ID</span>
                  <span className="font-mono text-neutral-800 text-sm font-700 bg-neutral-50 px-2 py-1 rounded border border-neutral-200/50 block mt-1">{selectedTerminal.terminalId}</span>
                </div>
                <div>
                  <span className="font-800 text-neutral-450 uppercase text-[9px] tracking-wide block">API Token</span>
                  <span className="font-mono text-neutral-800 bg-neutral-50 px-2 py-1 rounded border border-neutral-200/50 block mt-1 break-all">{selectedTerminal.apiToken}</span>
                </div>
                <div>
                  <span className="font-800 text-neutral-450 uppercase text-[9px] tracking-wide block">Store ID</span>
                  <span className="text-neutral-700 font-750 block mt-1">{selectedTerminal.storeId}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-100 text-[10px] text-neutral-450 font-600">
                <div>
                  <span>Created: {selectedTerminal.createdDate}</span>
                  <span className="block">By: {selectedTerminal.createdBy}</span>
                </div>
                <div className="text-right">
                  <span>Updated: {selectedTerminal.updatedDate}</span>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => { setSelectedTerminal(null); setIsTerminalModalOpen(false); }}
                className="px-6 py-2 rounded-lg bg-[#e31837] text-white hover:bg-[#b9142d] text-xs font-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Add Terminal Setup Modal */}
      {isTerminalAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up font-sans">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-850 text-sm uppercase tracking-wider">Add Terminal Setup</h3>
              <button onClick={() => setIsTerminalAddOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Terminal Name *</label>
                  <input
                    type="text"
                    value={terminalForm.terminalName}
                    onChange={(e) => setTerminalForm({ ...terminalForm, terminalName: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. DELIVERY 03"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Terminal ID *</label>
                  <input
                    type="text"
                    value={terminalForm.terminalId}
                    onChange={(e) => setTerminalForm({ ...terminalForm, terminalId: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. A2080999"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">API Token *</label>
                  <input
                    type="text"
                    value={terminalForm.apiToken}
                    onChange={(e) => setTerminalForm({ ...terminalForm, apiToken: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="Enter API token key"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Store ID *</label>
                  <input
                    type="text"
                    value={terminalForm.storeId}
                    onChange={(e) => setTerminalForm({ ...terminalForm, storeId: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    placeholder="e.g. mogo120566"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTerminalForm({ ...terminalForm, realDevices: !terminalForm.realDevices })}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-250 cursor-pointer flex items-center ${
                      terminalForm.realDevices ? 'bg-[#16A34A]' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-250 ${
                      terminalForm.realDevices ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`} />
                  </button>
                  <span className="text-xs font-750 text-neutral-700">Real Devices?</span>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex justify-end gap-2.5">
              <button
                onClick={() => handleAddTerminal(false)}
                className="px-5 py-2 rounded-lg border border-[#e31837] text-[#e31837] hover:bg-[#e31837]/10 text-xs font-800 transition-colors cursor-pointer active:scale-95"
              >
                Submit
              </button>
              <button
                onClick={() => handleAddTerminal(true)}
                className="px-5 py-2 rounded-lg bg-[#e31837] hover:bg-[#b9142d] text-white text-xs font-800 transition-colors cursor-pointer"
              >
                Submit & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Edit Terminal Setup Modal */}
      {isTerminalEditOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up font-sans">
            <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-850 text-sm uppercase tracking-wider">Edit Terminal Setup</h3>
              <button onClick={() => setIsTerminalEditOpen(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Terminal Name *</label>
                  <input
                    type="text"
                    value={terminalForm.terminalName}
                    onChange={(e) => setTerminalForm({ ...terminalForm, terminalName: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Terminal ID *</label>
                  <input
                    type="text"
                    value={terminalForm.terminalId}
                    onChange={(e) => setTerminalForm({ ...terminalForm, terminalId: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">API Token *</label>
                  <input
                    type="text"
                    value={terminalForm.apiToken}
                    onChange={(e) => setTerminalForm({ ...terminalForm, apiToken: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-800 text-neutral-500 uppercase tracking-wider">Store ID *</label>
                  <input
                    type="text"
                    value={terminalForm.storeId}
                    onChange={(e) => setTerminalForm({ ...terminalForm, storeId: e.target.value })}
                    className="bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTerminalForm({ ...terminalForm, realDevices: !terminalForm.realDevices })}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-250 cursor-pointer flex items-center ${
                      terminalForm.realDevices ? 'bg-[#16A34A]' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-250 ${
                      terminalForm.realDevices ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`} />
                  </button>
                  <span className="text-xs font-750 text-neutral-700">Real Devices?</span>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 px-6 py-4 flex justify-end gap-2.5">
              <button
                onClick={handleEditTerminalSave}
                className="px-6 py-2 rounded-lg bg-[#e31837] hover:bg-[#b9142d] text-white text-xs font-800 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
