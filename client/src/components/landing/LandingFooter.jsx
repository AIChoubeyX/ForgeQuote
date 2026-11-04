import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#292D34] bg-[#111111] text-[#A3A3A3]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid gap-8 sm:gap-10 grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] pb-8 sm:pb-10 border-b border-[#292D34]">
          
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forge text-white font-display font-black text-lg shadow-sm">
                FQ
              </div>
              <div>
                <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5] block">
                  FORGEQUOTE
                </span>
                <span className="text-[11px] sm:text-xs text-[#737373] font-medium tracking-wider uppercase block">
                  ForgeQuote™ Manufacturing System
                </span>
              </div>
            </div>

            <p className="max-w-sm text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
              Industrial quotation management connecting RFQ document intake, deterministic cost estimation, plant routing approvals, and commercial quotation release.
            </p>

            <div className="flex items-center gap-2 text-xs text-forge font-medium pt-1">
              <ShieldCheck size={16} className="shrink-0" />
              <span>Deterministic Financial Calculation Engine</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#F5F5F5] mb-3 sm:mb-4">
              Platform Workflow
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors py-1 inline-block">
                  01 — RFQ Intake & AI Extraction
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors py-1 inline-block">
                  02 — Cost Estimation & Rate Masters
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors py-1 inline-block">
                  03 — Plant Routing Review
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors py-1 inline-block">
                  04 — Sales Commercial Sign-off
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors py-1 inline-block">
                  PDF Quotation Generation
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#F5F5F5] mb-3 sm:mb-4">
              Workspace Access
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/login" className="inline-flex items-center gap-1.5 text-forge font-semibold hover:text-[#E94B13] transition-colors py-1">
                  Sign In to Workspace <ArrowUpRight size={14} />
                </Link>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-forge transition-colors py-1 inline-block">
                  Platform Capabilities
                </a>
              </li>
              <li>
                <a href="#governance" className="hover:text-forge transition-colors py-1 inline-block">
                  Governance & Compliance
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Natural wrapping to prevent overflow on mobile */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-xs text-[#737373]">
          <div>
            © {new Date().getFullYear()} ForgeQuote Technologies. All rights reserved.
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4 text-[11px] sm:text-xs">
            <span>Deterministic financial costing</span>
            <span aria-hidden="true">·</span>
            <span>Role-governed approvals</span>
            <span aria-hidden="true">·</span>
            <span>Audit traceable</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
