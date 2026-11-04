export function StatusBadge({ status }) {
  const styles = {
    ready_for_quote: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    in_progress: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    draft: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    quoted: 'bg-[#181818] text-[#A3A3A3] border border-[#292D34]',
    closed: 'bg-[#111111] text-[#737373] border border-[#292D34]/50',
    pending_review: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    changes_requested: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    overdue: 'bg-red-500/15 text-red-400 border border-red-500/30'
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] || styles.draft}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
