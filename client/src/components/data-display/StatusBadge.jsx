export function StatusBadge({ status }) {
  const styles = { ready_for_quote: 'bg-emerald-50 text-emerald-700', in_progress: 'bg-blue-50 text-blue-700', draft: 'bg-amber-50 text-amber-700', quoted: 'bg-slate-100 text-slate-600', closed: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || styles.draft}`}>{status.replaceAll('_', ' ')}</span>;
}
