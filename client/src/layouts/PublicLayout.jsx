import { Logo } from '../components/ui/Logo.jsx';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F5]">
      <nav className="mx-auto flex h-16 sm:h-20 max-w-6xl items-center justify-between px-4 sm:px-6 border-b border-[#292D34]">
        <Logo />
        <Link className="inline-flex items-center gap-1 font-semibold text-forge hover:text-[#E94B13] transition-colors text-sm sm:text-base" to="/login">
          Sign in →
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
