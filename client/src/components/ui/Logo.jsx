import { Link } from 'react-router-dom';

export function Logo({ light = false }) {
  return <Link className={`flex items-center gap-2 font-display text-xl font-bold ${light ? 'text-white' : 'text-navy'}`} to="/"><span className="rounded-lg bg-forge px-2 py-1 text-xs text-white">FQ</span>ForgeQuote</Link>;
}
