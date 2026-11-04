import { useState } from 'react';
import { 
  Download, 
  FileCheck2, 
  ShieldCheck
} from 'lucide-react';

export function LaptopMockup() {
  const [activeTab, setActiveTab] = useState('costing');

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {/* 3D Composition Wrapper with realistic subtle perspective on desktop */}
      <div 
        className="relative mx-auto transition-transform duration-500 [transform-style:preserve-3d] lg:[perspective:1200px]"
      >
        {/* PODIUM BLOCK (Industrial charcoal cuboid with clean metallic border) */}
        <div 
          className="relative rounded-xl sm:rounded-2xl bg-[#111111] p-2.5 xs:p-3 sm:p-5 shadow-2xl border border-[#292D34] lg:[transform:rotateX(6deg)_rotateY(-7deg)_rotateZ(1.5deg)] lg:hover:[transform:rotateX(4deg)_rotateY(-4deg)_rotateZ(1deg)] transition-all duration-300"
          style={{ willChange: 'transform' }}
        >
          {/* Top Face Edge Highlight / Podium Bevel */}
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-r from-[#292D34] via-[#66301C] to-[#292D34]" />

          {/* LAPTOP CHASSIS (Precision Aluminum Dark Body) */}
          <div className="relative rounded-lg sm:rounded-xl bg-[#181818] p-1.5 xs:p-2 sm:p-3 shadow-xl border border-[#292D34]">
            
            {/* Display Top Bezel with Webcam Notch */}
            <div className="relative mb-2 flex items-center justify-between px-1.5 sm:px-2 pt-1 text-[10px] text-[#737373]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#333333]" />
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#333333]" />
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#333333]" />
                <span className="ml-2 font-mono text-[9px] text-[#737373] hidden md:inline">
                  fq-costing://workspace/rfq-2026-0884
                </span>
              </div>
              <div className="absolute left-1/2 top-1.5 -translate-x-1/2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#202020] ring-1 ring-[#333333]" />
                <span className="h-1 w-1 rounded-full bg-forge" />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-[#111111] border border-[#292D34] px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Snapshot
                </span>
              </div>
            </div>

            {/* SCREEN DISPLAY: FORGEQUOTE APPLICATION UI */}
            <div className="relative overflow-hidden rounded-lg bg-[#080808] text-[#F5F5F5] border border-[#292D34]">
              {/* App Navigation Bar */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 border-b border-[#292D34] bg-[#181818] px-2.5 py-2 sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded bg-forge text-white font-bold text-[9px] sm:text-[10px]">
                    FQ
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-display text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
                        RFQ-2026-0884
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold text-emerald-400">
                        Plant Approved
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-[#A3A3A3] truncate">
                      Aerotech Dynamics Inc. · AD-7741 Spindle Housing
                    </p>
                  </div>
                </div>

                {/* Tab buttons with smooth horizontal scroll */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 xs:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab('costing')}
                    className={`shrink-0 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-semibold transition-colors duration-150 ${
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
                    className={`shrink-0 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-semibold transition-colors duration-150 ${
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
                    className={`shrink-0 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-semibold transition-colors duration-150 ${
                      activeTab === 'scenarios'
                        ? 'bg-forge text-white'
                        : 'text-[#A3A3A3] hover:bg-[#202020] hover:text-[#F5F5F5]'
                    }`}
                  >
                    Scenarios
                  </button>
                </div>
              </div>

              {/* Specification Subheader */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 border-b border-[#292D34] bg-[#111111] px-2.5 py-1.5 sm:grid-cols-4 sm:px-4 text-[9px] sm:text-[10px]">
                <div className="min-w-0">
                  <span className="block text-[#737373] truncate">Material Grade</span>
                  <span className="font-semibold text-[#F5F5F5] truncate block">Ti-6Al-4V Gr.5</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[#737373] truncate">Gross Weight</span>
                  <span className="font-semibold text-[#F5F5F5] truncate block">14.25 kg</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[#737373] truncate">Annual Volume</span>
                  <span className="font-semibold text-[#F5F5F5] truncate block">12,500 pcs/yr</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[#737373] truncate">Rate Snapshot</span>
                  <span className="font-semibold text-forge truncate block">Locked (Rev 2.1)</span>
                </div>
              </div>

              {/* Main Workspace Tab Content */}
              <div className="p-2 sm:p-4 min-h-[190px] sm:min-h-[220px]">
                {activeTab === 'costing' && (
                  <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-[1.3fr_1fr]">
                    {/* Cost Breakdown Table */}
                    <div className="space-y-1 rounded-lg border border-[#292D34] bg-[#181818] p-2 sm:p-3 text-[10px] sm:text-[11px] min-w-0">
                      <div className="flex items-center justify-between pb-1 border-b border-[#292D34] font-semibold text-[#737373] text-[9px] sm:text-[10px] uppercase tracking-wider">
                        <span>Cost Element</span>
                        <span>Unit Value</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-[#292D34]/50 items-center gap-1.5">
                        <span className="text-[#A3A3A3] truncate">Material Cost</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$412.50</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-[#292D34]/50 items-center gap-1.5">
                        <span className="text-[#A3A3A3] truncate">5-Axis CNC Machining</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$285.00</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-[#292D34]/50 items-center gap-1.5">
                        <span className="text-[#A3A3A3] truncate">Overhead Rate (12%)</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$84.20</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-[#292D34]/50 items-center gap-1.5">
                        <span className="text-[#A3A3A3] truncate">Packaging & Freight</span>
                        <span className="font-mono font-semibold text-[#F5F5F5] shrink-0">$45.00</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-[#292D34]/50 items-center gap-1.5 text-emerald-400">
                        <span className="truncate">Scrap Credit Recovery</span>
                        <span className="font-mono font-semibold shrink-0">-$25.60</span>
                      </div>
                      <div className="flex justify-between pt-1 font-semibold text-forge items-center gap-1.5">
                        <span className="truncate">Target Margin (18%)</span>
                        <span className="font-mono font-bold shrink-0">$148.80</span>
                      </div>
                    </div>

                    {/* Summary Commercial Card */}
                    <div className="flex flex-col justify-between rounded-lg bg-[#111111] border border-[#292D34] p-2.5 sm:p-3 text-white shadow-sm min-w-0">
                      <div>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#A3A3A3] font-bold block">
                          Quoted Unit Price
                        </span>
                        <div className="mt-0.5 sm:mt-1 font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-forge">
                          $949.90
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-[#737373] block mt-0.5">
                          Base Cost: $801.10 · Margin: +$148.80
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#292D34] text-[9px] sm:text-[10px] space-y-1">
                        <div className="flex justify-between text-[#A3A3A3]">
                          <span>Annual Contract:</span>
                          <span className="font-mono font-bold text-[#F5F5F5]">$11.87M</span>
                        </div>
                        <div className="flex justify-between text-[#A3A3A3]">
                          <span>Status:</span>
                          <span className="text-emerald-400 font-bold">Approved</span>
                        </div>
                      </div>

                      <div className="mt-2.5 inline-flex items-center justify-center gap-1 rounded bg-forge/15 border border-[#66301C] py-1 text-center text-[9px] sm:text-[10px] font-bold text-forge">
                        <FileCheck2 size={12} />
                        Approved for Quotation PDF
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operations' && (
                  <div className="space-y-1.5 rounded-lg border border-[#292D34] bg-[#181818] p-2 sm:p-2.5 text-[9px] sm:text-[10px] overflow-x-auto">
                    <div className="min-w-[280px]">
                      <div className="flex items-center justify-between pb-1 border-b border-[#292D34] font-bold text-[#737373] uppercase tracking-wider">
                        <span>Seq / Operation</span>
                        <span>Machine</span>
                        <span>Cycle</span>
                        <span>Cost</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#292D34]/50">
                        <span className="font-semibold text-[#F5F5F5] truncate"><strong className="text-forge mr-1">10</strong>Rough Facing</span>
                        <span className="text-[#A3A3A3]">CNC-HMC</span>
                        <span className="font-mono">6.4m</span>
                        <span className="font-mono font-bold text-forge">$70.40</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#292D34]/50">
                        <span className="font-semibold text-[#F5F5F5] truncate"><strong className="text-forge mr-1">20</strong>Precision Boring</span>
                        <span className="text-[#A3A3A3]">5AX-MILL</span>
                        <span className="font-mono">14.2m</span>
                        <span className="font-mono font-bold text-forge">$156.20</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#292D34]/50">
                        <span className="font-semibold text-[#F5F5F5] truncate"><strong className="text-forge mr-1">30</strong>Ultrasonic Wash</span>
                        <span className="text-[#A3A3A3]">ULTRASONIC</span>
                        <span className="font-mono">3.1m</span>
                        <span className="font-mono font-bold text-forge">$27.90</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-semibold text-[#F5F5F5] truncate"><strong className="text-forge mr-1">40</strong>CMM QC Inspection</span>
                        <span className="text-[#A3A3A3]">ZEISS-QC</span>
                        <span className="font-mono">2.3m</span>
                        <span className="font-mono font-bold text-forge">$30.50</span>
                      </div>
                      <div className="pt-1.5 border-t border-[#292D34] flex justify-between font-bold text-[#F5F5F5] text-[10px]">
                        <span>Cycle: 26.0 min</span>
                        <span className="text-forge">Machining: $285.00</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'scenarios' && (
                  <div className="rounded-lg border border-[#292D34] bg-[#181818] p-2 sm:p-2.5 text-[9px] sm:text-[10px]">
                    <span className="block font-bold text-[#F5F5F5] mb-1.5">Deterministic Scenarios</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center p-1.5 rounded bg-[#111111] border border-[#292D34] gap-2">
                        <div className="min-w-0">
                          <strong className="block text-[#F5F5F5] truncate">5,000 units/yr</strong>
                          <span className="text-[8px] sm:text-[9px] text-[#737373] truncate block">Amortization: $45.10/pc</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#F5F5F5]">$995.00</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded bg-forge/10 border border-[#66301C] gap-2">
                        <div className="min-w-0">
                          <strong className="block text-forge truncate">12,500 units/yr (Baseline)</strong>
                          <span className="text-[8px] sm:text-[9px] text-[#A3A3A3] truncate block">Optimum capacity volume</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-forge">$949.90</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded bg-[#111111] border border-[#292D34] gap-2">
                        <div className="min-w-0">
                          <strong className="block text-[#F5F5F5] truncate">25,000 units/yr</strong>
                          <span className="text-[8px] sm:text-[9px] text-[#737373] truncate block">Volume material rebate</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#F5F5F5]">$898.40</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Footer Bar */}
              <div className="flex items-center justify-between border-t border-[#292D34] bg-[#111111] px-2.5 py-1 text-[9px] sm:text-[10px] text-[#A3A3A3]">
                <div className="flex items-center gap-1 font-medium truncate">
                  <ShieldCheck size={12} className="text-forge shrink-0" />
                  <span className="truncate">100% deterministic · Rev 2.1</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-semibold text-emerald-400">Approved</span>
                </div>
              </div>
            </div>

            {/* Laptop Keyboard Base / Hinge Accent */}
            <div className="mt-1.5 h-2 rounded-b-lg bg-[#202020] border-t border-[#292D34]" />
          </div>

          {/* WATERFALL CASCADE EXTENSION (Document Ready) */}
          <div className="mt-2 rounded-lg sm:rounded-xl bg-[#181818] p-2.5 sm:p-3.5 text-white border border-[#66301C]">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-forge text-white">
                  <FileCheck2 size={15} />
                </div>
                <div className="min-w-0">
                  <strong className="block font-display text-xs sm:text-sm tracking-tight text-[#F5F5F5] truncate">
                    Quotation Document Ready
                  </strong>
                  <span className="text-[9px] sm:text-[10px] text-[#A3A3A3] truncate block">
                    Audit trail locked · Signed by Plant & Commercial
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end xs:self-auto">
                <span className="rounded bg-[#080808] border border-[#292D34] px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono text-[#A3A3A3] font-semibold truncate max-w-[120px] sm:max-w-none">
                  FQ-QUOTE-2026-0418.PDF
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-forge px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white">
                  <Download size={10} />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Podium Front Face Label */}
          <div className="mt-2 text-center text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#737373] uppercase">
            ForgeQuote Real Costing Workspace
          </div>
        </div>
      </div>
    </div>
  );
}
