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
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
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
    <div className="flex min-h-screen bg-[#080808] text-[#F5F5F5]">
      {/* Sidebar Navigation */}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-20 flex w-64 -translate-x-full flex-col bg-[#080808] border-r border-[#292D34] p-5 text-[#A3A3A3] transition-transform duration-200 md:static md:translate-x-0 ${open ? 'translate-x-0' : ''}`}
      >
        <button
          aria-label="Close navigation"
          className="absolute right-4 top-4 min-h-11 text-[#A3A3A3] hover:text-[#F5F5F5] md:hidden"
          onClick={() => setOpen(false)}
        >
          <X size={18} />
        </button>
        
        <Logo />
        
        <p className="mb-2 mt-12 px-2 text-[10px] uppercase tracking-[.18em] text-[#737373] font-bold">
          Manufacturing Workspace
        </p>

        <div className="space-y-1">
          {userNav.map(({ label, to, icon: Icon }) => {
            const active = isNavItemActive(to, location.pathname);
            return (
              <NavLink
                className={() =>
                  `flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ${
                    active
                      ? 'bg-[#FF5A1F]/15 text-[#FF5A1F] border-l-2 border-forge font-semibold'
                      : 'text-[#A3A3A3] hover:bg-[#181818] hover:text-[#F5F5F5]'
                  }`
                }
                to={to}
                onClick={() => setOpen(false)}
                key={to}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="mt-auto border-t border-[#292D34] pt-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-forge text-sm font-bold text-white">
              {user.name[0]}
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-xs text-[#F5F5F5]">{user.name}</strong>
              <small className="text-[11px] text-[#737373]">{roles[user.role] || 'Unknown role'}</small>
            </div>
          </div>
          <button
            className="flex min-h-11 w-full items-center gap-2 text-sm text-[#A3A3A3] hover:text-[#FF5A1F] transition-colors"
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
          className="fixed inset-0 z-10 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        <header className="flex min-h-16 sm:min-h-20 items-center justify-between border-b border-[#292D34] bg-[#111111]/95 backdrop-blur-md px-4 sm:px-6 md:px-10 min-w-0 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Open navigation"
              aria-expanded={open}
              className="min-h-11 text-[#A3A3A3] hover:text-[#F5F5F5] focus-visible:text-forge md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="font-display font-semibold text-[#F5F5F5] md:hidden truncate">ForgeQuote</span>
          </div>
          <div className="ml-auto text-right text-xs sm:text-sm text-[#A3A3A3] min-w-0 pl-2">
            <span className="font-semibold text-[#F5F5F5] truncate block sm:inline">{user.name}</span>
            <span className="ml-1 sm:ml-2 text-xs text-[#737373] inline-block">({roles[user.role] || 'Unknown role'})</span>
          </div>
        </header>
        
        <div className="flex-1 min-w-0 w-full max-w-full bg-[#080808]">
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}
