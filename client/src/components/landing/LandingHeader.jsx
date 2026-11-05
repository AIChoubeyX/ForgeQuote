import { useState, useEffect } from 'react';
import { ArrowRight, Menu, X, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Handle escape key and prevent background scroll when open
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#292D34] bg-[#080808]/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand: ForgeQuote at top-left, with ForgeQuote™ product badge */}
        <Link 
          to="/" 
          className="group flex items-center gap-2.5 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge rounded-lg p-1 -m-1 min-w-0"
          aria-label="ForgeQuote Homepage"
          onClick={() => setMobileOpen(false)}
        >
          {/* Logo Mark: FQ */}
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#181818] border border-[#292D34] text-white shadow-sm group-hover:border-forge transition-colors">
            <span className="font-display text-base sm:text-lg font-black tracking-wider text-white">
              <span className="text-forge font-extrabold mr-0.5">F</span>Q
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5] truncate">
                FORGEQUOTE
              </span>
              <span className="hidden xs:inline-flex rounded bg-forge/15 border border-[#66301C] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider text-forge uppercase shrink-0">
                ForgeQuote™
              </span>
            </div>
            <span className="hidden sm:block text-[10px] sm:text-[11px] font-medium tracking-wider text-[#737373] uppercase truncate">
              Manufacturing Quotation Engineering
            </span>
          </div>
        </Link>

        {/* Desktop Navigation (>= 1024px) */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-[#A3A3A3]">
          <a href="#workflow" className="transition-colors hover:text-forge focus-visible:text-forge py-2">
            Workflow
          </a>
          <a href="#capabilities" className="transition-colors hover:text-forge focus-visible:text-forge py-2">
            Capabilities
          </a>
          <a href="#governance" className="transition-colors hover:text-forge focus-visible:text-forge py-2">
            Governance
          </a>
          <div className="h-4 w-px bg-[#292D34]" aria-hidden="true" />
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-forge px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#E94B13] focus-visible:bg-[#E94B13]"
          >
            <span>Sign In</span>
            <ArrowRight size={15} />
          </Link>
        </nav>

        {/* Mobile / Tablet Hamburger Toggle (< 1024px) */}
        {/* <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#292D34] bg-[#181818] text-[#F5F5F5] transition hover:bg-[#202020] hover:border-[#737373] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button> */}
      </div>

      {/* Mobile / Tablet Full Drawer & Backdrop */}
      {mobileOpen && (
        <div 
          id="mobile-navigation" 
          className="fixed inset-x-0 top-[64px] sm:top-[80px] bottom-0 z-50 flex flex-col bg-[#080808]/98 backdrop-blur-xl border-t border-[#292D34] lg:hidden overflow-y-auto transition-all"
        >
          <div className="mx-auto w-full max-w-lg px-5 py-6 flex flex-col flex-1 justify-between">
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-2">
              <span className="eyebrow text-[#737373] text-[10px] mb-2 px-3">
                Navigation
              </span>
              <a
                href="#workflow"
                className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-semibold text-[#F5F5F5] hover:bg-[#181818] hover:text-forge transition-colors min-h-12 border border-transparent hover:border-[#292D34]"
                onClick={() => setMobileOpen(false)}
              >
                <span>Workflow</span>
                <span className="text-xs text-[#737373]">01–04 Lifecycle</span>
              </a>
              <a
                href="#capabilities"
                className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-semibold text-[#F5F5F5] hover:bg-[#181818] hover:text-forge transition-colors min-h-12 border border-transparent hover:border-[#292D34]"
                onClick={() => setMobileOpen(false)}
              >
                <span>Capabilities</span>
                <span className="text-xs text-[#737373]">Engine & AI</span>
              </a>
              <a
                href="#governance"
                className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-semibold text-[#F5F5F5] hover:bg-[#181818] hover:text-forge transition-colors min-h-12 border border-transparent hover:border-[#292D34]"
                onClick={() => setMobileOpen(false)}
              >
                <span>Governance</span>
                <span className="text-xs text-[#737373]">Audit & RBAC</span>
              </a>
            </nav>

            <div className="mt-8 pt-6 border-t border-[#292D34] space-y-4">
              <Link
                to="/login"
                className="button button-primary w-full justify-center min-h-12 text-base font-bold shadow-lg shadow-forge/20"
                onClick={() => setMobileOpen(false)}
              >
                Sign In to Workspace <ArrowRight size={18} />
              </Link>
              
              <div className="flex items-center justify-center gap-2 text-xs text-[#737373] text-center pt-2">
                <ShieldCheck size={14} className="text-forge shrink-0" />
                <span>AS9100 / ISO 9001 Auditable Quoting</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
