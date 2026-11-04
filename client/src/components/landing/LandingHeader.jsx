import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#292D34] bg-[#080808]/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Brand: Forge Code at top-left */}
        <Link 
          to="/" 
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge rounded-lg p-1 -m-1"
          aria-label="Forge Code Homepage"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#181818] border border-[#292D34] text-white shadow-sm group-hover:border-forge transition-colors">
            <span className="font-display text-xl font-black tracking-tight text-white">
              <span className="text-forge font-extrabold mr-0.5">F</span>C
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-[#F5F5F5]">FORGE CODE</span>
              <span className="hidden sm:inline-flex rounded bg-forge/15 border border-[#66301C] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-forge uppercase">
                ForgeQuote™
              </span>
            </div>
            <span className="text-[11px] font-medium tracking-wider text-[#737373] uppercase">
              Manufacturing Quotation Engineering
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden items-center gap-8 text-sm font-semibold text-[#A3A3A3] md:flex">
          <a href="#workflow" className="transition-colors hover:text-forge focus-visible:text-forge">
            Workflow
          </a>
          <a href="#capabilities" className="transition-colors hover:text-forge focus-visible:text-forge">
            Capabilities
          </a>
          <a href="#governance" className="transition-colors hover:text-forge focus-visible:text-forge">
            Governance
          </a>
          <div className="h-4 w-px bg-[#292D34]" aria-hidden="true" />
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-forge px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#E94B13] focus-visible:bg-[#E94B13]"
          >
            <span>Sign In</span>
            <ArrowRight size={15} />
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#292D34] bg-[#181818] text-[#F5F5F5] transition hover:bg-[#202020] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#292D34] bg-[#111111] px-5 py-5 md:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
            <a
              href="#workflow"
              className="rounded-md px-3 py-2 text-base font-semibold text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#181818]"
              onClick={() => setMobileOpen(false)}
            >
              Workflow
            </a>
            <a
              href="#capabilities"
              className="rounded-md px-3 py-2 text-base font-semibold text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#181818]"
              onClick={() => setMobileOpen(false)}
            >
              Capabilities
            </a>
            <a
              href="#governance"
              className="rounded-md px-3 py-2 text-base font-semibold text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#181818]"
              onClick={() => setMobileOpen(false)}
            >
              Governance
            </a>
            <div className="mt-2 pt-3 border-t border-[#292D34]">
              <Link
                to="/login"
                className="button button-primary w-full justify-center"
                onClick={() => setMobileOpen(false)}
              >
                Sign In to Workspace <ArrowRight size={16} />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
