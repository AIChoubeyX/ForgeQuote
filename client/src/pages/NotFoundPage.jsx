import { Link } from 'react-router-dom';
export function NotFoundPage() { return <div className="grid min-h-screen place-items-center text-center"><div><h1 className="font-display text-5xl font-bold text-navy">404</h1><p className="my-3 text-slate-500">This page does not exist.</p><Link className="font-semibold text-forge" to="/">Return home</Link></div></div>; }
