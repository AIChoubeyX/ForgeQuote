export function StatusBadge({ status }) {
  const meta = {
    draft: {
      label: 'Draft',
      desc: 'RFQ registered. Required information may be incomplete; costing not yet submitted.',
      style: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    },
    in_progress: {
      label: 'In Progress',
      desc: 'Estimator is actively preparing costing and reviewing operations.',
      style: 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
    },
    pending_plant_review: {
      label: 'Pending Plant Review',
      desc: 'Costing finalized and locked. Waiting for Plant Head routing feasibility review.',
      style: 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
    },
    pending_review: {
      label: 'Pending Plant Review',
      desc: 'Costing finalized and locked. Waiting for Plant Head routing feasibility review.',
      style: 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
    },
    returned_for_revision: {
      label: 'Returned for Revision',
      desc: 'Reviewer returned submission with mandatory feedback. Estimator must create a new revision.',
      style: 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
    },
    changes_requested: {
      label: 'Returned for Revision',
      desc: 'Reviewer returned submission with mandatory feedback. Estimator must create a new revision.',
      style: 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
    },
    pending_sales_approval: {
      label: 'Pending Sales Approval',
      desc: 'Plant Head approved manufacturing route. Awaiting Sales Head commercial sign-off.',
      style: 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
    },
    ready_for_quote: {
      label: 'Ready for Quote',
      desc: 'Technical and commercial approvals complete. Approved quotation locked and ready to issue.',
      style: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    },
    approved: {
      label: 'Approved (Unissued)',
      desc: 'Technical and commercial approvals complete. Ready for formal quotation issuance.',
      style: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    },
    quoted: {
      label: 'Quoted',
      desc: 'Authoritative quotation document generated and formally issued to customer.',
      style: 'bg-[#181818] text-[#A3A3A3] border border-[#292D34]'
    },
    closed: {
      label: 'Closed',
      desc: 'RFQ lifecycle finalized or closed.',
      style: 'bg-[#111111] text-[#737373] border border-[#292D34]/50'
    },
    cancelled: {
      label: 'Cancelled',
      desc: 'RFQ cancelled with recorded authorization and reason.',
      style: 'bg-zinc-800 text-zinc-400 border border-zinc-700'
    }
  };

  const item = meta[status] || {
    label: (status || 'draft').replaceAll('_', ' '),
    desc: '',
    style: 'bg-[#181818] text-[#A3A3A3] border border-[#292D34]'
  };

  return (
    <span
      title={item.desc}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-help ${item.style}`}
    >
      {item.label}
    </span>
  );
}
