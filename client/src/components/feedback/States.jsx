export function LoadingState({ label = 'Loading…' }) { return <div className="py-16 text-center text-sm text-slate-500">{label}</div>; }
export function EmptyState({ title, message }) { return <div className="py-16 text-center"><h3 className="font-display text-lg font-semibold text-navy">{title}</h3><p className="mt-1 text-sm text-slate-500">{message}</p></div>; }
export function ErrorState({ message = 'Unable to load this page.' }) { return <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{message}</div>; }
