import { ArrowDown, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LaptopMockup } from './LaptopMockup.jsx';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#080808] pb-12 pt-6 sm:pb-20 sm:pt-10 md:pb-24 md:pt-12 lg:pb-32 lg:pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* TOP ROW: Large Bold Headline */}
        <div className="relative mb-8 sm:mb-12 lg:mb-16">
          <div className="flex flex-col lg:items-end">
            {/* Highlighted Label */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#66301C] bg-[#181818] px-3 py-1 text-[11px] sm:text-xs font-bold tracking-wider text-forge uppercase mb-3 max-w-full">
              <span className="h-2 w-2 rounded-full bg-forge shrink-0" />
              <span className="truncate">MANUFACTURING QUOTATION MANAGEMENT</span>
            </div>

            {/* Main Headline: Bold, Block-structured, Space Grotesk */}
            <h1 className="font-display text-3xl xs:text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight text-[#F5F5F5] leading-[1.02] sm:leading-[0.98] lg:text-right">
              <span className="block">INTELLIGENT</span>
              <span className="block text-forge">QUOTATION</span>
              <span className="block">ENGINEERING</span>
            </h1>
          </div>

          {/* Directional Curved Dashed Annotation (Desktop Only) */}
          <div className="absolute -bottom-10 left-1/3 hidden lg:block pointer-events-none select-none z-10" aria-hidden="true">
            <svg width="240" height="130" viewBox="0 0 240 130" fill="none" className="text-forge">
              <defs>
                <marker
                  id="arrow-curve"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#FF5A1F" />
                </marker>
              </defs>
              <path
                d="M 210 10 C 130 15, 60 45, 30 115"
                stroke="#FF5A1F"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                markerEnd="url(#arrow-curve)"
              />
              <text x="50" y="55" fill="#FF5A1F" fontSize="11" fontWeight="700" letterSpacing="0.08em" className="font-mono uppercase">
                TRACEABLE COST REVISION
              </text>
            </svg>
          </div>
        </div>

        {/* BOTTOM ROW: Responsive Laptop Mockup + Supporting Copy */}
        <div className="grid gap-8 sm:gap-10 lg:gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          
          {/* MOCKUP CONTAINER */}
          <div className="relative order-2 lg:order-1 min-w-0">
            <LaptopMockup />
          </div>

          {/* BESIDE THE LAPTOP: Supporting Copy & Action CTAs */}
          <div className="order-1 lg:order-2 space-y-5 sm:space-y-6 lg:pl-6 min-w-0">
            
            <div>
              <p className="eyebrow mb-2">Deterministic Financial Core</p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-[#F5F5F5] leading-tight">
                From RFQ to Ready-to-Send Quotation.
              </h2>
            </div>

            <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-[#A3A3A3]">
              Transform customer requirements into traceable manufacturing costs and approved quotations through one connected workflow.
            </p>

            {/* Value bullets */}
            <ul className="space-y-3 pt-1 text-xs sm:text-sm text-[#A3A3A3]">
              <li className="flex items-start gap-2.5 sm:gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>
                  <strong className="text-[#F5F5F5]">Zero rate drift:</strong> Effective-dated rate masters lock raw material, machine hours, and scrap at the revision timestamp.
                </span>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>
                  <strong className="text-[#F5F5F5]">Dual sign-off governance:</strong> Plant Heads inspect routing cycle times; Sales Heads govern commercial discount thresholds.
                </span>
              </li>
              <li className="flex items-start gap-2.5 sm:gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>
                  <strong className="text-[#F5F5F5]">Human authority decisive:</strong> AI assists document parsing and routing checks, while human decision-makers hold full release authority.
                </span>
              </li>
            </ul>

            {/* CTAs: Stacked full-width on mobile, row on tablet/desktop */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <a
                href="#workflow"
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-forge px-6 py-3 text-sm sm:text-base font-bold text-white transition-colors duration-150 hover:bg-[#E94B13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
              >
                <span>Explore the Workflow</span>
                <ArrowDown size={17} />
              </a>

              <Link
                to="/login"
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-[#292D34] bg-[#181818] px-6 py-3 text-sm sm:text-base font-bold text-[#F5F5F5] transition-colors duration-150 hover:border-[#66301C] hover:text-forge focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
              >
                <span>Sign In</span>
                <ArrowRight size={17} />
              </Link>
            </div>

            {/* Trust badge */}
            <div className="pt-2 flex items-center gap-2.5 text-xs text-[#737373] font-medium">
              <ShieldCheck size={16} className="text-forge shrink-0" />
              <span>Full audit history · AS9100 / ISO 9001 compliant revision trail</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
