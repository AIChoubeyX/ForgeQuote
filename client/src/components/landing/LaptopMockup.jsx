import { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  FileCheck2, 
  ShieldCheck
} from 'lucide-react';

export function LaptopMockup() {
  const [activeTab, setActiveTab] = useState('costing');

  return (
    <div className="relative w-full max-w-full overflow-hidden sm:overflow-visible">
      {/* 3D Composition Wrapper with realistic subtle perspective */}
      <div 
        className="relative mx-auto transition-transform duration-500 [transform-style:preserve-3d] lg:[perspective:1200px]"
      >
        {/* PODIUM BLOCK (Industrial charcoal cuboid with clean metallic border) */}
        <div 
          className="relative rounded-2xl bg-[#111111] p-3 sm:p-5 shadow-2xl border border-[#292D34] lg:[transform:rotateX(6deg)_rotateY(-7deg)_rotateZ(1.5deg)] lg:hover:[transform:rotateX(4deg)_rotateY(-4deg)_rotateZ(1deg)] transition-all duration-300"
          style={{ willChange: 'transform' }}
        >
          {/* Top Face Edge Highlight / Podium Bevel */}
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#292D34] via-[#66301C] to-[#292D34]" />

          {/* LAPTOP CHASSIS (Precision Aluminum Dark Body) */}
          <div className="relative rounded-xl bg-[#181818] p-2 sm:p-3 shadow-xl border border-[#292D34]">
            
            {/* Display Top Bezel with Webcam Notch */}
            <div className="relative mb-2 flex items-center justify-between px-2 pt-1 text-[10px] text-[#737373]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#333333]" />
                <span className="h-2 w-2 rounded-full bg-[#333333]" />
                <span className="h-2 w-2 rounded-full bg-[#333333]" />
                <span className="ml-2 font-mono text-[9px] text-[#737373] hidden sm:inline">
                  fq-costing://workspace/rfq-2026-0884
                </span>
              </div>
              <div className="absolute left-1/2 top-1.5 -translate-x-1/2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#202020] ring-1 ring-[#333333]" />
                <span className="h-1 w-1 rounded-full bg-forge" />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-[#111111] border border-[#292D34] px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Snapshot
                </span>
              </div>
            </div>

            {/* SCREEN DISPLAY: FORGEQUOTE APPLICATION UI */}
            <div className="relative overflow-hidden rounded-lg bg-[#080808] text-[#F5F5F5] border border-[#292D34]">
              {/* App Navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#292D34] bg-[#181818] px-3 py-2 sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-forge text-white font-bold text-[10px]">
                    FQ
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
                        RFQ-2026-0884
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        Plant Approved
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#A3A3A3] truncate">
                      Aerotech Dynamics Inc. · AD-7741 Spindle Housing
                    </p>
                  </div>
                </div>

                {/* Tab buttons */}
                <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('costing')}
                    className={`shrink-0 rounded px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors duration-150 ${
                      activeTab === 'costing'
                        ? 'bg-forge text-white'
                        : 'text-[#A3A3A3] hover:bg-[#202020] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Cost Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('operations')}
                    className={`shrink-0 rounded px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors duration-150 ${
                      activeTab === 'operations'
                        ? 'bg-forge text-white'
                        : 'text-[#A3A3A3] hover:bg-[#202020] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Operations Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scenarios')}
                    className={`shrink-0 rounded px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-colors duration-150 ${
                      activeTab === 'scenarios'
                        ? 'bg-forge text-white'
                        : 'text-[#A3A3A3] hover:bg-[#202020] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Volume Scenarios
                  </button>
                </div>
              </div>

              {/* Specification Subheader */}
              <div className="grid grid-cols-2 gap-2 border-b border-[#292D34] bg-[#111111] px-3 py-1.5 sm:grid-cols-4 sm:px-4 text-[10px]">
                <div className="min-w-0">
                  <span className="block text-[#737373]">Material Grade</span>
                  <span className="font-semibold text-[#F5F5F5] truncate block">Ti-6Al-4V Grade 5</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[#737373]">Gross Weight</span>
                  <span className="font-semibold text-[#F5F5F5]">14.25 kg</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[#737373]">Annual Volume</span>
                  <span className="font-semibold text-[#F5F5F5]">12,500 pcs/yr</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[#737373]">Rate Snapshot</span>
                  <span className="font-semibold text-forge">Locked (Rev 2.1)</span>
                </div>
              </div>

              {/* Main Workspace Tab Content */}
              <div className="p-2.5 sm:p-4 min-h-[220px]">
                {activeTab === 'costing' && (
                  <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
                    {/* Cost Breakdown Table */}
                    <div className="space-y-1 rounded-lg border border-[#292D34] bg-[#181818] p-2.5 sm:p-3 text-[11px] min-w-0">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#292D34] font-semibold text-[#737373] text-[10px] uppercase tracking-wider">
                        <span>Cost Element</span>
                        <span>Unit Value</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292D34]/50 items-center gap-2">
                        <span className="text-[#A3A3A3] truncate">Material Cost (Ti-6Al-4V)</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$412.50</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292D34]/50 items-center gap-2">
                        <span className="text-[#A3A3A3] truncate">5-Axis CNC Machining</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$285.00</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292D34]/50 items-center gap-2">
                        <span className="text-[#A3A3A3] truncate">Plant Overhead Rate (12%)</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$84.20</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292D34]/50 items-center gap-2">
                        <span className="text-[#A3A3A3] truncate">Packaging & Freight</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$45.00</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#292D34]/50 items-center gap-2 text-emerald-400">
                        <span className="truncate">Scrap Credit Recovery</span>
                        <span className="font-mono font-semibold shrink-0">-$25.60</span>
                      </div>
                      <div className="flex justify-between pt-1 font-semibold text-forge items-center gap-2">
                        <span className="truncate">Target Margin (18.0%)</span>
                        <span className="font-mono font-bold shrink-0">$148.80</span>
                      </div>
                    </div>

                    {/* Summary Commercial Card */}
                    <div className="flex flex-col justify-between rounded-lg bg-[#111111] border border-[#292D34] p-3 text-white shadow-sm min-w-0">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3] font-bold">
                          Quoted Unit Price
                        </span>
                        <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-forge">
                          $949.90
                        </div>
                        <span className="text-[10px] text-[#737373] block mt-0.5">
                          Base Cost: $801.10 · Margin: +$148.80
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#292D34] text-[10px] space-y-1">
                        <div className="flex justify-between text-[#A3A3A3]">
                          <span>Annual Contract:</span>
                          <span className="font-mono font-bold text-[#F5F5F5]">$11,873,750</span>
                        </div>
                        <div className="flex justify-between text-[#A3A3A3]">
                          <span>Sales Status:</span>
                          <span className="text-emerald-400 font-bold">Ready to Release</span>
                        </div>
                      </div>

                      <div className="mt-3 inline-flex items-center justify-center gap-1.5 rounded bg-forge/15 border border-[#66301C] py-1.5 text-center text-[10px] font-bold text-forge">
                        <FileCheck2 size={12} />
                        Approved for Quotation PDF
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operations' && (
                  <div className="space-y-2 rounded-lg border border-[#292D34] bg-[#181818] p-2.5 text-[10px] sm:text-[11px] overflow-x-auto">
                    <div className="min-w-[340px]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#292D34] font-bold text-[#737373] uppercase tracking-wider">
                        <span>Seq / Operation</span>
                        <span>Machine</span>
                        <span>Cycle</span>
                        <span>Cost</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#292D34]/50">
                        <span className="font-semibold text-[#F5F5F5]"><strong className="text-forge mr-1.5">10</strong>Rough Facing</span>
                        <span className="text-[#A3A3A3]">CNC-HMC-800</span>
                        <span className="font-mono">6.4m</span>
                        <span className="font-mono font-bold text-forge">$70.40</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#292D34]/50">
                        <span className="font-semibold text-[#F5F5F5]"><strong className="text-forge mr-1.5">20</strong>Precision Boring</span>
                        <span className="text-[#A3A3A3]">5AX-MILL-02</span>
                        <span className="font-mono">14.2m</span>
                        <span className="font-mono font-bold text-forge">$156.20</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#292D34]/50">
                        <span className="font-semibold text-[#F5F5F5]"><strong className="text-forge mr-1.5">30</strong>Ultrasonic Wash</span>
                        <span className="text-[#A3A3A3]">ULTRASONIC</span>
                        <span className="font-mono">3.1m</span>
                        <span className="font-mono font-bold text-forge">$27.90</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-semibold text-[#F5F5F5]"><strong className="text-forge mr-1.5">40</strong>CMM QC Inspection</span>
                        <span className="text-[#A3A3A3]">ZEISS-QC</span>
                        <span className="font-mono">2.3m</span>
                        <span className="font-mono font-bold text-forge">$30.50</span>
                      </div>
                      <div className="pt-2 border-t border-[#292D34] flex justify-between font-bold text-[#F5F5F5] text-[11px]">
                        <span>Cycle Time: 26.0 min</span>
                        <span className="text-forge">Machining: $285.00</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'scenarios' && (
                  <div className="rounded-lg border border-[#292D34] bg-[#181818] p-2.5 sm:p-3 text-[11px]">
                    <span className="block font-bold text-[#F5F5F5] mb-2">Deterministic Annual Scenarios</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center p-2 rounded bg-[#111111] border border-[#292D34] gap-2">
                        <div className="min-w-0">
                          <strong className="block text-[#F5F5F5] truncate">5,000 units/yr</strong>
                          <span className="text-[10px] text-[#737373] truncate block">Amortization: $45.10/pc</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#F5F5F5]">$995.00</span>
                          <span className="block text-[10px] text-[#737373]">$4.97M</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-forge/10 border border-[#66301C] gap-2">
                        <div className="min-w-0">
                          <strong className="block text-forge truncate">12,500 units/yr (Baseline)</strong>
                          <span className="text-[10px] text-[#A3A3A3] truncate block">Optimum capacity volume</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-forge">$949.90</span>
                          <span className="block text-[10px] text-[#A3A3A3]">$11.87M</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-[#111111] border border-[#292D34] gap-2">
                        <div className="min-w-0">
                          <strong className="block text-[#F5F5F5] truncate">25,000 units/yr</strong>
                          <span className="text-[10px] text-[#737373] truncate block">Volume material rebate</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#F5F5F5]">$898.40</span>
                          <span className="block text-[10px] text-[#737373]">$22.46M</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status & AI Review Footer Bar */}
              <div className="flex items-center justify-between border-t border-[#292D34] bg-[#111111] px-3 py-1.5 text-[10px] text-[#A3A3A3]">
                <div className="flex items-center gap-1.5 font-medium truncate">
                  <ShieldCheck size={13} className="text-forge shrink-0" />
                  <span className="truncate">100% deterministic rates · Rev 2.1</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[#737373] hidden sm:inline">Plant:</span>
                  <span className="font-semibold text-emerald-400">D. Patel (Approved)</span>
                </div>
              </div>
            </div>

            {/* Laptop Keyboard Base / Hinge Accent */}
            <div className="mt-2 h-2.5 rounded-b-lg bg-[#202020] border-t border-[#292D34]" />
          </div>

          {/* WATERFALL CASCADE EXTENSION (Industrial Orange & Charcoal) */}
          <div className="mt-2 rounded-xl bg-[#181818] p-3 text-white border border-[#66301C] sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forge text-white">
                  <FileCheck2 size={16} />
                </div>
                <div className="min-w-0">
                  <strong className="block font-display text-xs sm:text-sm tracking-tight text-[#F5F5F5] truncate">
                    Quotation Document Ready
                  </strong>
                  <span className="text-[10px] sm:text-[11px] text-[#A3A3A3] truncate block">
                    Audit trail locked · Signed by Plant & Commercial Head
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded bg-[#080808] border border-[#292D34] px-2 py-1 text-[9px] sm:text-[10px] font-mono text-[#A3A3A3] font-semibold truncate max-w-[140px] sm:max-w-none">
                  FQ-QUOTE-2026-0418.PDF
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-forge px-2 py-1 text-[10px] sm:text-[11px] font-bold text-white">
                  <Download size={11} />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Podium Front Face Label */}
          <div className="mt-2 text-center text-[10px] font-semibold tracking-wider text-[#737373] uppercase">
            ForgeQuote Real Costing Workspace · Perspective View
          </div>
        </div>
      </div>
    </div>
  );
}
