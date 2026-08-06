'use client';

import React, { useEffect, useState } from 'react';
import { getPusherClient } from '../../../lib/pusher';
import { X, ShoppingBag, Calendar } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
}

interface OnlineOrder {
  _id: string;
  orderNumber: string;
  orderSource: string;
  orderType: string;
  orderTiming: string;
  scheduledAt?: string | null;
  items: OrderItem[];
}

export default function OnlineOrderBanner() {
  const [activeOrder, setActiveOrder] = useState<OnlineOrder | null>(null);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds timer

  // Programmatic bell chime notification sound
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Note 1 (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.2);

      // Note 2 (A5, slightly delayed)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); 
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
    } catch (e) {
      console.warn('Audio play failed or blocked by browser user gesture policies:', e);
    }
  };

  // Subscribe to Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe('orders');

    channel.bind('new-order', (data: any) => {
      // ONLY trigger banner for Online Orders
      if (data.orderSource === 'online') {
        console.log('Online order received in POS banner:', data);
        setActiveOrder(data);
        setTimeLeft(30); // Reset timer to 30 seconds
        playChime(); // Play the audio alert
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('orders');
    };
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (!activeOrder) return;

    if (timeLeft <= 0) {
      setActiveOrder(null);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOrder, timeLeft]);

  if (!activeOrder) return null;

  // Format Scheduled Date Time if present
  const formatScheduledTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
    } catch {
      return isoString;
    }
  };

  const progressPercent = (timeLeft / 30) * 100;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          0% { transform: translateX(120%) scale(0.95); opacity: 0; }
          70% { transform: translateX(-5%) scale(1.01); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        .banner-animate {
          animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e5e5;
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #db2777;
        }
      `}</style>
      <div className="fixed top-20 right-5 z-50 max-w-[320px] w-full banner-animate select-none">
        {/* Main Card Container */}
        <div className="relative bg-white text-neutral-800 rounded-xl border border-neutral-200 shadow-xl overflow-hidden">
          
          {/* Header Row */}
          <div className="px-4 py-2.5 bg-neutral-50 flex items-center justify-between border-b border-neutral-200/50">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
              <span className="text-[10px] font-800 uppercase tracking-widest text-rose-600">
                Online Order
              </span>
            </div>
            <button 
              onClick={() => setActiveOrder(null)} 
              className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/70 p-1 rounded-md transition-all duration-150 cursor-pointer"
            >
              <X size={13} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-3">
            
            {/* Title & Type */}
            <div className="flex justify-between items-center">
              <h4 className="text-[15px] font-900 text-neutral-900 leading-none">
                Order #{activeOrder.orderNumber}
              </h4>
              <span className={`text-[9px] font-800 tracking-wider uppercase px-2 py-0.5 rounded ${
                activeOrder.orderType === 'delivery'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}>
                {activeOrder.orderType}
              </span>
            </div>

            {/* Scheduled Date Time */}
            {activeOrder.orderTiming === 'later' && activeOrder.scheduledAt && (
              <div className="flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/60">
                <Calendar size={12} className="stroke-[2.5] text-rose-600 flex-shrink-0" />
                <span className="font-600 leading-tight">Scheduled: {formatScheduledTime(activeOrder.scheduledAt)}</span>
              </div>
            )}

            {/* Items Summary list */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[9px] font-800 tracking-wider text-neutral-400 uppercase flex items-center gap-1.5 mb-1">
                <ShoppingBag size={11} className="stroke-[2.5]" /> Meals & Items
              </span>
              <div className="max-h-[110px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-neutral-100 last:border-0 text-neutral-700">
                    <span className="font-600 truncate max-w-[210px] text-neutral-800">{item.name}</span>
                    <span className="font-700 text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                      x{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Progress countdown bar */}
          <div className="w-full bg-neutral-100 h-1">
            <div 
              className="bg-rose-600 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

        </div>
      </div>
    </>
  );
}
