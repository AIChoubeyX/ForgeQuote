import { useState, useEffect } from 'react';
import { BarChart3, ClipboardList, LogOut, Menu, X, Settings, GitPullRequest, BadgeCheck, ShieldCheck, FileText } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';
import { api, setToken } from '../lib/api.js';

const roles = { estimator: 'Estimator', sales_head: 'Sales Head', plant_head: 'Plant Head', admin: 'Administrator' };
export const navigation = [
  { label: 'Dashboard', to: '/app', icon: BarChart3, roles: ['estimator', 'plant_head', 'sales_head', 'admin'] },
  { label: 'RFQ register', to: '/app/rfqs', icon: ClipboardList, roles: ['estimator', 'plant_head', 'sales_head', 'admin'] },
  { label: 'AI RFQ intake', to: '/app/rfqs/ai-intake', icon: ClipboardList, roles: ['estimator'] },
  { label: 'Routing reviews', to: '/app/routing-reviews', icon: GitPullRequest, roles: ['plant_head'] },
  { label: 'Commercial reviews', to: '/app/commercial-reviews', icon: BadgeCheck, roles: ['sales_head'] },
  { label: 'Quotation history', to: '/app/quotations', icon: FileText, roles: ['estimator', 'sales_head', 'admin'] },
  { label: 'Rate Masters', to: '/app/rate-masters', icon: Settings, roles: ['admin', 'estimator', 'sales_head', 'plant_head'] },
  { label: 'Audit history', to: '/app/audit', icon: ShieldCheck, roles: ['admin'] },
  { label: 'Users', to: '/app/users', icon: ShieldCheck, roles: ['admin'] }
];

export function DashboardLayout({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  // Close sidebar drawer on route navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function logout() { try { await api('/auth/logout', { method: 'POST' }); } catch {} setToken(null); onLogout(); navigate('/'); }

  const userNav = navigation.filter(item => item.roles.includes(user.role));

  function isNavItemActive(itemTo, pathname) {
    if (pathname === itemTo) return true;
    if (itemTo !== '/app' && pathname.startsWith(`${itemTo}/`)) {
      const hasMoreSpecificMatch = userNav.some(
        other => other.to !== itemTo && other.to.length > itemTo.length && (pathname === other.to || pathname.startsWith(`${other.to}/`))
      );
      return !hasMoreSpecificMatch;
    }
    return false;
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* Sidebar Navigation */}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-20 flex w-60 -translate-x-full flex-col bg-forge text-paper transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${open ? 'translate-x-0' : ''}`}
      >
        <button
          aria-label="Close navigation"
          className="absolute right-3 top-0.5 min-h-11 md:hidden"
          onClick={() => setOpen(false)}
        >
          <X size={18} />
        </button>

        <div className="flex h-12 shrink-0 items-center border-b border-paper/40 px-4">
          <Logo light />
        </div>

        <p className="px-4 pb-2 pt-6 text-xs">Manufacturing workspace</p>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-paper/40">
          {userNav.map(({ label, to, icon: Icon }) => {
            const active = isNavItemActive(to, location.pathname);
            return (
              <NavLink
                className={() =>
                  `flex min-h-11 items-center gap-3 border-b border-paper/20 px-4 py-2.5 text-sm transition-colors duration-150 ${
                    active ? 'bg-paper text-forge' : 'hover:bg-paper hover:text-forge'
                  }`
                }
                to={to}
                onClick={() => setOpen(false)}
                key={to}
              >
                <Icon size={17} strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="border-t border-paper/40 p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center bg-paper text-sm font-medium text-forge">
              {user.name[0]}
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-xs font-medium">{user.name}</strong>
              <small className="text-[11px]">{roles[user.role] || 'Unknown role'}</small>
            </div>
          </div>
          <button
            className="flex min-h-11 w-full items-center gap-2 text-sm transition-opacity hover:opacity-70"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {open && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-10 bg-forge/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        <header className="flex h-12 w-full min-w-0 items-center justify-between border-b border-line bg-paper px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              aria-expanded={open}
              className="min-h-11 text-ink md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="truncate font-display text-ink md:hidden">ForgeQuote</span>
          </div>
          <div className="ml-auto min-w-0 truncate pl-2 text-right text-xs text-ink sm:text-sm">
            {user.name}
            <span className="ml-2 text-xs text-ink-muted">{roles[user.role] || 'Unknown role'}</span>
          </div>
        </header>
        
        <div className="flex-1 min-w-0 w-full max-w-full bg-paper">
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}
