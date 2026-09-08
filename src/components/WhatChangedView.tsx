import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface WhatChangedViewProps {
  onInvestigate: () => void;
  onSimulateSolutions: () => void;
}

export const WhatChangedView: React.FC<WhatChangedViewProps> = ({
  onInvestigate,
  onSimulateSolutions,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const snapshotChanges = [
    {
      id: 'c1',
      title: 'New Procurement Commitment (Shakti PCB)',
      type: 'OUTFLOW',
      amount: '-₹4.5L',
      timing: 'Due Oct 16 (Day 15)',
      impact: 'High Outflow',
      icon: TrendingDown,
      color: 'text-[#EF4444]',
      bgColor: isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]',
    },
    {
      id: 'c2',
      title: 'TechCorp Receivable Delayed by Supplier Shock',
      type: 'TIMING',
      amount: '+12 Days Shift',
      timing: 'Expected Oct 28 -> Nov 09',
      impact: 'Inflow Delay',
      icon: Clock,
      color: 'text-[#EAB308]',
      bgColor: isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]',
    },
    {
      id: 'c3',
      title: 'Additional Microcontroller Raw Material Order',
      type: 'INVENTORY',
      amount: '-₹1.2L',
      timing: 'Paid Oct 20',
      impact: 'Working Capital Lockup',
      icon: Layers,
      color: 'text-[#EAB308]',
      bgColor: isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* SECTION 1: EARLY WARNING BANNER */}
      <div className={`p-5 rounded-2xl border ${
        isLight ? 'bg-[#FAFAFA] border-[#EF4444]/40 text-[#171717]' : 'bg-[#0A0A0A] border-[#EF4444]/40 text-[#EDEDED]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2.5 py-0.5 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444] text-[10px]">
                  CASHSHOCK WARNING
                </span>
                <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Autonomous Early Detection</span>
              </div>
              <h2 className={`text-base font-semibold mt-1 ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
                Projected Cash Floor Breach in 19 Days
              </h2>
              <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
                A newly detected supplier commitment of <strong>₹18.0L</strong> will cause your cleared cash balance to drop to <strong>₹2.2L</strong> on Day 19 (Deficit: <strong>₹2.8L</strong>). Primary cause: Supplier payment occurs 27 days before expected customer collection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onInvestigate}
              className={`px-4 py-2 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]' : 'bg-[#111111] border-[#222222] text-[#EDEDED] hover:bg-[#1A1A1A]'
              }`}
            >
              Waterfall Breakdown
            </button>
            <button
              onClick={onSimulateSolutions}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] flex items-center gap-1.5 ${
                isLight ? 'bg-[#171717] text-[#FFFFFF] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] hover:opacity-90'
              }`}
            >
              Simulate Solutions <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: SNAPSHOT COMPARISON - YESTERDAY VS TODAY */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
      }`}>
        <div className={`flex justify-between items-center border-b pb-3 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
          <div>
            <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              <RefreshCw className="w-4 h-4 text-[#A1A1AA]" />
              Financial Position Differential
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              Automated differential analysis between yesterday's snapshot and today's live feed
            </p>
          </div>

          <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
          }`}>
            Sync #CS-20261001-A
          </span>
        </div>

        {/* Yesterday vs Today Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {/* Yesterday */}
          <div className={`p-4 rounded-xl border space-y-2 transition-all duration-150 hover:-translate-y-0.5 ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
          }`}>
            <div className="flex justify-between items-center">
              <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Yesterday (Oct 13)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#22C55E]/30 text-[#22C55E]">
                STABLE
              </span>
            </div>

            <div>
              <span className={`text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Min Projected Cash</span>
              <div className="text-xl font-semibold text-[#22C55E] mt-0.5">₹6.20L</div>
            </div>

            <div className={`text-[11px] pt-1.5 border-t flex justify-between ${
              isLight ? 'border-[#EAEAEA] text-[#666666]' : 'border-[#222222] text-[#A1A1AA]'
            }`}>
              <span>Above ₹5.0L Floor</span>
              <span>Surplus: +₹1.2L</span>
            </div>
          </div>

          {/* Today */}
          <div className="p-4 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 space-y-2 transition-all duration-150 hover:-translate-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-[#EF4444]">Today Live (Oct 14)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#EF4444]/30 text-[#EF4444]">
                BREACH
              </span>
            </div>

            <div>
              <span className={`text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Min Projected Cash</span>
              <div className="text-xl font-semibold text-[#EF4444] mt-0.5">₹3.10L</div>
            </div>

            <div className="text-[11px] pt-1.5 border-t border-[#EF4444]/20 flex justify-between text-[#EF4444]">
              <span>Deficit -₹1.9L Below Floor</span>
              <span>Breach: Day 19</span>
            </div>
          </div>
        </div>

        {/* What Changed Root Causes */}
        <div className="space-y-2 pt-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Pipeline Variations
          </h4>

          <div className="space-y-2">
            {snapshotChanges.map((change) => {
              const Icon = change.icon;
              return (
                <div
                  key={change.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between font-sans transition-all duration-150 hover:-translate-y-0.5 ${change.bgColor}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${change.color}`} />
                    <div>
                      <div className={`text-xs font-medium ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{change.title}</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
                        {change.timing} • {change.impact}
                      </div>
                    </div>
                  </div>

                  <div className={`text-xs font-semibold font-mono ${change.color}`}>
                    {change.amount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
