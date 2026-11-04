import { Link } from 'react-router-dom';

export function Logo({ light = false }) {
  return (
    <Link className="flex items-center gap-2 font-display text-xl font-bold text-[#F5F5F5] hover:opacity-90 transition-opacity" to="/">
      <span className="rounded-lg bg-forge px-2 py-1 text-xs text-white font-black tracking-wider">
        FQ
      </span>
      <span>ForgeQuote</span>
    </Link>
  );
}
