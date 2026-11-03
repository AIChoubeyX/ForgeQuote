import { useState } from 'react';
import { BarChart3, ClipboardList, LogOut, Menu, X, Settings, GitPullRequest, BadgeCheck, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';
import { api } from '../lib/api.js';

const roles = { estimator: 'Estimator', sales_head: 'Sales Head', plant_head: 'Plant Head', admin: 'Administrator' };
export const navigation = [
  { label: 'Dashboard', to: '/app', icon: BarChart3, roles: ['estimator', 'plant_head', 'sales_head', 'admin'] },
  { label: 'RFQ register', to: '/app/rfqs', icon: ClipboardList, roles: ['estimator', 'plant_head', 'sales_head', 'admin'] },
  { label: 'Routing reviews', to: '/app/routing-reviews', icon: GitPullRequest, roles: ['plant_head'] },
  { label: 'Commercial reviews', to: '/app/commercial-reviews', icon: BadgeCheck, roles: ['sales_head'] },
  { label: 'Rate Masters', to: '/app/rate-masters', icon: Settings, roles: ['admin', 'estimator', 'sales_head', 'plant_head'] },
  { label: 'Audit history', to: '/app/audit', icon: ShieldCheck, roles: ['admin'] },
  { label: 'Users', to: '/app/users', icon: ShieldCheck, roles: ['admin'] }
];
export function DashboardLayout({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  async function logout() { await api('/auth/logout', { method: 'POST' }); onLogout(); navigate('/'); }
  return <div className="flex min-h-screen overflow-x-hidden bg-slate-50"><aside aria-label="Primary navigation" className={`fixed inset-y-0 left-0 z-20 flex w-64 -translate-x-full flex-col bg-navy p-5 text-slate-300 transition md:static md:translate-x-0 ${open ? 'translate-x-0' : ''}`}><button aria-label="Close navigation" className="absolute right-4 top-4 min-h-11 text-white md:hidden" onClick={() => setOpen(false)}><X size={18} /></button><Logo light /><p className="mb-2 mt-14 px-2 text-[10px] uppercase tracking-[.15em] text-slate-500">Workspace</p>{navigation.filter(item => item.roles.includes(user.role)).map(({ label, to, icon: Icon }) => <NavLink className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-slate-700 hover:text-white ${isActive ? 'bg-slate-700 text-white' : ''}`} to={to} onClick={() => setOpen(false)} key={to}><Icon size={18} />{label}</NavLink>)}<div className="mt-auto border-t border-slate-700 pt-5"><div className="mb-5 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-forge text-sm text-white">{user.name[0]}</span><div><strong className="block text-xs text-white">{user.name}</strong><small className="text-xs text-slate-400">{roles[user.role] || 'Unknown role'}</small></div></div><button className="flex min-h-11 items-center gap-2 text-sm" onClick={logout}><LogOut size={17} />Sign out</button></div></aside>{open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-10 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)} />}<div className="min-w-0 flex-1"><header className="flex min-h-20 items-center border-b border-slate-200 bg-white px-5 md:px-10"><button aria-label="Open navigation" className="mr-4 min-h-11 text-slate-500 md:hidden" onClick={() => setOpen(true)}><Menu /></button><span className="font-display font-semibold md:hidden">ForgeQuote</span><div className="ml-auto text-right text-sm font-semibold text-slate-700">{user.name}<span className="ml-2 block font-normal text-slate-400 sm:inline">{roles[user.role] || 'Unknown role'}</span></div></header><Outlet /></div></div>;
}
