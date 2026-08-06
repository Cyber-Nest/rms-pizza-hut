'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

interface DummyReportViewProps {
  title: string;
}

export default function DummyReportView({ title }: DummyReportViewProps) {
  return (
    <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-8 shadow-xs max-w-4xl select-none font-sans text-neutral-900">
      <h2 className="text-xl font-900 text-neutral-900 tracking-tight mb-4">{title}</h2>
      
      <div className="bg-neutral-50 border border-dashed border-neutral-350/80 rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-brand-primary-light rounded-full flex items-center justify-center mx-auto text-brand-primary border border-brand-primary/10">
          <BarChart3 size={32} />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="font-800 text-neutral-800 text-sm">Report Placeholder</h3>
          <p className="text-[11px] text-neutral-500 font-550 leading-relaxed">
            This is a placeholder for the <strong className="text-neutral-700">{title}</strong> page. Frontend layout is complete and connected. Backend aggregation pipeline and live database query statistics will be integrated in a future update.
          </p>
        </div>
        <div className="pt-2">
          <span className="px-3.5 py-1.5 bg-neutral-200 text-neutral-600 font-800 text-[10px] uppercase tracking-wider rounded-full">
            Under Development
          </span>
        </div>
      </div>
    </div>
  );
}
