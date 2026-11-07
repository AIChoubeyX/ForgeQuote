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
          className="relative rounded-xl sm:rounded-2xl bg-paper p-2.5 xs:p-3 sm:p-5 shadow-2xl border border-line"
        >
          {/* Top Face Edge Highlight / Podium Bevel */}
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-r from-line via-line to-line" />

          {/* LAPTOP CHASSIS (Precision Aluminum Dark Body) */}
          <div className="relative rounded-lg sm:rounded-xl bg-surface p-1.5 xs:p-2 sm:p-3 shadow-xl border border-line">
            
            {/* Display Top Bezel with Webcam Notch */}
            <div className="relative mb-2 flex items-center justify-between px-1.5 sm:px-2 pt-1 text-[10px] text-ink-muted">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-sunken" />
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-sunken" />
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-sunken" />
                <span className="ml-2 font-mono text-[9px] text-ink-muted hidden md:inline">
                  fq-costing://workspace/rfq-2026-0884
                </span>
              </div>
              <div className="absolute left-1/2 top-1.5 -translate-x-1/2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sunken ring-1 ring-line" />
                <span className="h-1 w-1 rounded-full bg-forge" />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-paper border border-line px-1.5 py-0.5 text-[8px] sm:text-[9px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Live Snapshot
                </span>
              </div>
            </div>

            {/* SCREEN DISPLAY: FORGEQUOTE APPLICATION UI */}
            <div className="relative overflow-hidden rounded-lg bg-paper text-ink border border-line">
              {/* App Navigation Bar */}
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 border-b border-line bg-surface px-2.5 py-2 sm:px-4 sm:py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded bg-forge text-paper font-medium text-[9px] sm:text-[10px]">
                    FQ
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-display text-xs sm:text-sm font-normal text-ink truncate">
                        RFQ-2026-0884
                      </span>
                      <span className="shrink-0 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-medium text-emerald-700">
                        Plant Approved
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-ink-soft truncate">
                      Aerotech Dynamics Inc. · AD-7741 Spindle Housing
                    </p>
                  </div>
                </div>

                {/* Tab buttons with smooth horizontal scroll */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 xs:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab('costing')}
                    className={`shrink-0 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-medium transition-colors duration-150 ${
                      activeTab === 'costing'
                        ? 'bg-forge text-paper'
                        : 'text-ink-soft hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    Cost Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('operations')}
                    className={`shrink-0 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-medium transition-colors duration-150 ${
                      activeTab === 'operations'
                        ? 'bg-forge text-paper'
                        : 'text-ink-soft hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    Operations Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scenarios')}
                    className={`shrink-0 rounded px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-medium transition-colors duration-150 ${
                      activeTab === 'scenarios'
                        ? 'bg-forge text-paper'
                        : 'text-ink-soft hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    Scenarios
                  </button>
                </div>
              </div>

              {/* Specification Subheader */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 border-b border-line bg-paper px-2.5 py-1.5 sm:grid-cols-4 sm:px-4 text-[9px] sm:text-[10px]">
                <div className="min-w-0">
                  <span className="block text-ink-muted truncate">Material Grade</span>
                  <span className="font-medium text-ink truncate block">Ti-6Al-4V Gr.5</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-ink-muted truncate">Gross Weight</span>
                  <span className="font-medium text-ink truncate block">14.25 kg</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-ink-muted truncate">Annual Volume</span>
                  <span className="font-medium text-ink truncate block">12,500 pcs/yr</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-ink-muted truncate">Rate Snapshot</span>
                  <span className="font-medium text-forge truncate block">Locked (Rev 2.1)</span>
                </div>
              </div>

              {/* Main Workspace Tab Content */}
              <div className="p-2 sm:p-4 min-h-[190px] sm:min-h-[220px]">
                {activeTab === 'costing' && (
                  <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-[1.3fr_1fr]">
                    {/* Cost Breakdown Table */}
                    <div className="space-y-1 rounded-lg border border-line bg-surface p-2 sm:p-3 text-[10px] sm:text-[11px] min-w-0">
                      <div className="flex items-center justify-between pb-1 border-b border-line font-medium text-ink-muted text-[9px] sm:text-[10px]">
                        <span>Cost Element</span>
                        <span>Unit Value</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-line/50 items-center gap-1.5">
                        <span className="text-ink-soft truncate">Material Cost</span>
                        <span className="font-mono font-medium text-ink shrink-0">$412.50</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-line/50 items-center gap-1.5">
                        <span className="text-ink-soft truncate">5-Axis CNC Machining</span>
                        <span className="font-mono font-medium text-ink shrink-0">$285.00</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-line/50 items-center gap-1.5">
                        <span className="text-ink-soft truncate">Overhead Rate (12%)</span>
                        <span className="font-mono font-medium text-ink shrink-0">$84.20</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-line/50 items-center gap-1.5">
                        <span className="text-ink-soft truncate">Packaging & Freight</span>
                        <span className="font-mono font-medium text-ink shrink-0">$45.00</span>
                      </div>
                      <div className="flex justify-between py-0.5 sm:py-1 border-b border-line/50 items-center gap-1.5 text-emerald-700">
                        <span className="truncate">Scrap Credit Recovery</span>
                        <span className="font-mono font-medium shrink-0">-$25.60</span>
                      </div>
                      <div className="flex justify-between pt-1 font-medium text-forge items-center gap-1.5">
                        <span className="truncate">Target Margin (18%)</span>
                        <span className="font-mono font-medium shrink-0">$148.80</span>
                      </div>
                    </div>

                    {/* Summary Commercial Card */}
                    <div className="flex flex-col justify-between rounded-lg bg-paper border border-line p-2.5 sm:p-3 text-ink shadow-sm min-w-0">
                      <div>
                        <span className="text-[9px] sm:text-[10px] text-ink-soft font-medium block">
                          Quoted Unit Price
                        </span>
                        <div className="mt-0.5 sm:mt-1 font-display text-xl sm:text-2xl md:text-3xl font-normal tracking-tight text-forge">
                          $949.90
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-ink-muted block mt-0.5">
                          Base Cost: $801.10 · Margin: +$148.80
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-line text-[9px] sm:text-[10px] space-y-1">
                        <div className="flex justify-between text-ink-soft">
                          <span>Annual Contract:</span>
                          <span className="font-mono font-medium text-ink">$11.87M</span>
                        </div>
                        <div className="flex justify-between text-ink-soft">
                          <span>Status:</span>
                          <span className="text-emerald-700 font-medium">Approved</span>
                        </div>
                      </div>

                      <div className="mt-2.5 inline-flex items-center justify-center gap-1 rounded bg-forge/15 border border-line-strong py-1 text-center text-[9px] sm:text-[10px] font-medium text-forge">
                        <FileCheck2 size={12} />
                        Approved for Quotation PDF
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operations' && (
                  <div className="space-y-1.5 rounded-lg border border-line bg-surface p-2 sm:p-2.5 text-[9px] sm:text-[10px] overflow-x-auto">
                    <div className="min-w-[280px]">
                      <div className="flex items-center justify-between pb-1 border-b border-line font-medium text-ink-muted">
                        <span>Seq / Operation</span>
                        <span>Machine</span>
                        <span>Cycle</span>
                        <span>Cost</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-line/50">
                        <span className="font-medium text-ink truncate"><strong className="text-forge mr-1">10</strong>Rough Facing</span>
                        <span className="text-ink-soft">CNC-HMC</span>
                        <span className="font-mono">6.4m</span>
                        <span className="font-mono font-medium text-forge">$70.40</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-line/50">
                        <span className="font-medium text-ink truncate"><strong className="text-forge mr-1">20</strong>Precision Boring</span>
                        <span className="text-ink-soft">5AX-MILL</span>
                        <span className="font-mono">14.2m</span>
                        <span className="font-mono font-medium text-forge">$156.20</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-line/50">
                        <span className="font-medium text-ink truncate"><strong className="text-forge mr-1">30</strong>Ultrasonic Wash</span>
                        <span className="text-ink-soft">ULTRASONIC</span>
                        <span className="font-mono">3.1m</span>
                        <span className="font-mono font-medium text-forge">$27.90</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-medium text-ink truncate"><strong className="text-forge mr-1">40</strong>CMM QC Inspection</span>
                        <span className="text-ink-soft">ZEISS-QC</span>
                        <span className="font-mono">2.3m</span>
                        <span className="font-mono font-medium text-forge">$30.50</span>
                      </div>
                      <div className="pt-1.5 border-t border-line flex justify-between font-medium text-ink text-[10px]">
                        <span>Cycle: 26.0 min</span>
                        <span className="text-forge">Machining: $285.00</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'scenarios' && (
                  <div className="rounded-lg border border-line bg-surface p-2 sm:p-2.5 text-[9px] sm:text-[10px]">
                    <span className="block font-medium text-ink mb-1.5">Deterministic Scenarios</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center p-1.5 rounded bg-paper border border-line gap-2">
                        <div className="min-w-0">
                          <strong className="block text-ink truncate">5,000 units/yr</strong>
                          <span className="text-[8px] sm:text-[9px] text-ink-muted truncate block">Amortization: $45.10/pc</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-medium text-ink">$995.00</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded bg-forge/10 border border-line-strong gap-2">
                        <div className="min-w-0">
                          <strong className="block text-forge truncate">12,500 units/yr (Baseline)</strong>
                          <span className="text-[8px] sm:text-[9px] text-ink-soft truncate block">Optimum capacity volume</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-medium text-forge">$949.90</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-1.5 rounded bg-paper border border-line gap-2">
                        <div className="min-w-0">
                          <strong className="block text-ink truncate">25,000 units/yr</strong>
                          <span className="text-[8px] sm:text-[9px] text-ink-muted truncate block">Volume material rebate</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-medium text-ink">$898.40</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Footer Bar */}
              <div className="flex items-center justify-between border-t border-line bg-paper px-2.5 py-1 text-[9px] sm:text-[10px] text-ink-soft">
                <div className="flex items-center gap-1 font-medium truncate">
                  <ShieldCheck size={12} className="text-forge shrink-0" />
                  <span className="truncate">100% deterministic · Rev 2.1</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-medium text-emerald-700">Approved</span>
                </div>
              </div>
            </div>

            {/* Laptop Keyboard Base / Hinge Accent */}
            <div className="mt-1.5 h-2 rounded-b-lg bg-sunken border-t border-line" />
          </div>

          {/* WATERFALL CASCADE EXTENSION (Document Ready) */}
          <div className="mt-2 rounded-lg sm:rounded-xl bg-surface p-2.5 sm:p-3.5 text-ink border border-line-strong">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-forge text-paper">
                  <FileCheck2 size={15} />
                </div>
                <div className="min-w-0">
                  <strong className="block font-display font-normal text-xs sm:text-sm tracking-tight text-ink truncate">
                    Quotation Document Ready
                  </strong>
                  <span className="text-[9px] sm:text-[10px] text-ink-soft truncate block">
                    Audit trail locked · Signed by Plant & Commercial
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end xs:self-auto">
                <span className="rounded bg-paper border border-line px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono text-ink-soft font-medium truncate max-w-[120px] sm:max-w-none">
                  FQ-QUOTE-2026-0418.PDF
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-forge px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-paper">
                  <Download size={10} />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Podium Front Face Label */}
          <div className="mt-2 text-center text-[9px] sm:text-[10px] font-medium text-ink-muted">
            ForgeQuote Real Costing Workspace
          </div>
        </div>
      </div>
    </div>
  );
}
