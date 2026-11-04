import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#292D34] bg-[#111111] text-[#A3A3A3]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] pb-10 border-b border-[#292D34]">
          
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forge text-white font-display font-black text-lg">
                FQ
              </div>
              <div>
                <span className="font-display text-xl font-bold tracking-tight text-[#F5F5F5] block">
                  FORGE CODE
                </span>
                <span className="text-xs text-[#737373] font-medium tracking-wider uppercase">
                  ForgeQuote™ Manufacturing System
                </span>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-sm text-[#A3A3A3] leading-relaxed">
              Industrial quotation management connecting RFQ document intake, deterministic cost estimation, plant routing approvals, and commercial quotation release.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-forge font-medium">
              <ShieldCheck size={16} />
              <span>Deterministic Financial Calculation Engine</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#F5F5F5] mb-4">
              Platform Workflow
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors">
                  01 — RFQ Intake & AI Extraction
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors">
                  02 — Cost Estimation & Rate Masters
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors">
                  03 — Plant Routing Review
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors">
                  04 — Sales Commercial Sign-off
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-forge transition-colors">
                  PDF Quotation Generation
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#F5F5F5] mb-4">
              Workspace Access
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="inline-flex items-center gap-1 text-forge font-semibold hover:text-[#E94B13] transition-colors">
                  Sign In to Workspace <ArrowUpRight size={14} />
                </Link>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-forge transition-colors">
                  Platform Capabilities
                </a>
              </li>
              <li>
                <a href="#governance" className="hover:text-forge transition-colors">
                  Governance & Compliance
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[#737373]">
          <div>
            © {new Date().getFullYear()} Forge Code Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Deterministic financial costing</span>
            <span>·</span>
            <span>Role-governed approvals</span>
            <span>·</span>
            <span>Audit traceable</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
