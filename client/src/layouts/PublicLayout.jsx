import { Logo } from '../components/ui/Logo.jsx';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="flex h-12 items-stretch justify-between border-b border-line pl-4">
        <div className="flex items-center"><Logo /></div>
        <Link className="flex items-center bg-forge px-5 text-sm text-paper transition-colors hover:bg-forge-hover" to="/login">
          Sign in
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
