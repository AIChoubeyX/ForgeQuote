import { Logo } from '../components/ui/Logo.jsx';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return <div className="min-h-screen bg-white"><nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6"><Logo /><Link className="font-semibold text-forge" to="/login">Sign in</Link></nav><Outlet /></div>;
}
