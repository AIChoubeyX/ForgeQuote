import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo.jsx';
import { PixelField } from '../brand/PixelField.jsx';
import { CAPABILITIES, STAGES } from './content.js';

const TONES = ['#0B5DC3', '#1E66BE', '#054A9E', '#2A70C6'];

const MENUS = [
  {
    label: 'Workflow',
    title: 'Workflow',
    intro: 'Four gates from RFQ to issued quotation.',
    items: STAGES.map((stage, i) => ({ title: stage.title, text: stage.summary, href: `#stage-${i + 1}`, icon: stage.icon }))
  },
  {
    label: 'Capabilities',
    title: 'Capabilities',
    intro: 'Technical costing connected to commercial sign-off.',
    items: CAPABILITIES.slice(0, 4).map(item => ({ title: item.tag, text: item.title, href: '#capabilities', icon: item.icon }))
  }
];

const cellClass = 'flex h-12 items-center border-r px-3 text-sm transition-colors';

export function LandingHeader() {
  const [dark, setDark] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef(null);

  // The bar takes on the colour of whichever section is underneath it.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const under = [...document.querySelectorAll('[data-nav]')].filter((el) => {
        const { top, bottom } = el.getBoundingClientRect();
        return top <= 24 && bottom > 24;
      }).pop();
      setDark(under?.dataset.nav === 'dark');
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      // Hand focus back to whichever control opened the menu before it unmounts.
      headerRef.current?.querySelector('[aria-expanded="true"]')?.focus();
      setOpenMenu(null);
      setMobileOpen(false);
    };
    const onPointer = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpenMenu(null);
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onWiden = (event) => { if (event.matches) setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    desktop.addEventListener('change', onWiden);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      desktop.removeEventListener('change', onWiden);
    };
  }, []);

  // While the mobile menu is open the page behind it can't scroll or take focus.
  // The lock goes on <html>: on <body> it would break the sticky header.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const behind = [...headerRef.current.parentElement.children].filter(el => el !== headerRef.current);
    document.documentElement.style.overflow = 'hidden';
    behind.forEach((el) => { el.inert = true; });
    return () => {
      document.documentElement.style.overflow = '';
      behind.forEach((el) => { el.inert = false; });
    };
  }, [mobileOpen]);

  const closeOnFocusLeave = (event) => {
    if (event.relatedTarget && !headerRef.current?.contains(event.relatedTarget)) setOpenMenu(null);
  };

  const edge = dark ? 'border-paper/40' : 'border-line';
  const hover = dark ? 'hover:bg-paper hover:text-forge' : 'hover:bg-forge hover:text-paper';

  return (
    <header
      ref={headerRef}
      onBlur={closeOnFocusLeave}
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${edge} ${dark ? 'bg-forge text-paper' : 'bg-paper text-forge'}`}
    >
      <div className="flex h-12 items-stretch justify-between">
        <nav aria-label="Main navigation" className="flex min-w-0 items-stretch">
          <div className={`flex items-center border-r px-4 ${edge}`}>
            <Logo light={dark} />
          </div>
          {MENUS.map(item => (
            <Fragment key={item.label}>
              <button
                type="button"
                aria-expanded={openMenu === item.label}
                className={`hidden lg:flex gap-1.5 ${cellClass} ${edge} ${hover}`}
                onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
              >
                {item.label}
                <ChevronDown size={14} className={`transition-transform ${openMenu === item.label ? 'rotate-180' : ''}`} />
              </button>
              {/* Rendered straight after its trigger so the links come next in tab order. */}
              {openMenu === item.label && (
                <div
                  className={`absolute left-[calc(theme(spacing.4)+8.5rem)] top-full hidden w-[min(44rem,calc(100vw-12rem))] grid-cols-[13rem_1fr_1fr] border-x border-b lg:grid ${edge} ${dark ? 'bg-forge text-paper' : 'bg-paper text-forge'}`}
                >
                  <div className={`row-span-2 flex flex-col border-r ${edge}`}>
                    <div className="p-4">
                      <p className="text-xs">{item.title}</p>
                      <p className="mt-3 text-[15px] leading-snug">{item.intro}</p>
                    </div>
                    <div className="relative min-h-16 flex-1">
                      <PixelField cell={22} density={0.9} colors={TONES} />
                    </div>
                  </div>
                  {item.items.map(({ title, text, href, icon: Icon }, i) => (
                    <a
                      key={title}
                      href={href}
                      onClick={() => setOpenMenu(null)}
                      className={`flex items-start justify-between gap-3 p-4 transition-colors ${hover} ${i % 2 === 0 ? `border-r border-dashed ${edge}` : ''} ${i < 2 ? `border-b border-dashed ${edge}` : ''}`}
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-lg leading-tight">{title}</span>
                        <span className="mt-1.5 block text-xs leading-snug opacity-90">{text}</span>
                      </span>
                      <Icon size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </Fragment>
          ))}
          <a href="#governance" className={`hidden lg:flex ${cellClass} ${edge} ${hover}`} onClick={() => setOpenMenu(null)}>
            Governance
          </a>
        </nav>

        <div className="flex items-stretch">
          <Link
            to="/login"
            className={`hidden sm:flex items-center px-5 text-sm transition-colors ${dark ? 'bg-paper text-forge hover:bg-sunken' : 'bg-forge text-paper hover:bg-forge-hover'}`}
          >
            Sign in
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className={`flex w-12 items-center justify-center border-l lg:hidden ${edge}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col overflow-y-auto bg-forge text-paper lg:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col">
            {[
              ['Workflow', '#workflow', 'RFQ to quotation'],
              ['Capabilities', '#capabilities', 'Engine and AI'],
              ['Governance', '#governance', 'Roles and audit']
            ].map(([label, href, note]) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-16 items-center justify-between border-b border-paper/40 px-5 font-display text-2xl"
              >
                {label}
                <span className="font-sans text-xs">{note}</span>
              </a>
            ))}
          </nav>
          <div className="p-5">
            <Link to="/login" className="button button-invert w-full">Sign in</Link>
          </div>
          <div className="relative min-h-32 flex-1">
            <PixelField cell={28} density={0.4} />
          </div>
        </div>
      )}
    </header>
  );
}
