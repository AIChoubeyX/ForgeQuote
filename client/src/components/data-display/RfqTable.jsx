import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge.jsx';

export function RfqTable({ rows, user, onSelect, onCosting }) {
  const navigate = useNavigate();
  const role = user?.role || 'estimator';

  function renderAction(row) {
    const status = row.status || 'draft';

    if (role === 'estimator') {
      if (status === 'draft') {
        return (
          <button
            className="text-xs font-medium text-forge hover:text-forge-hover transition-colors whitespace-nowrap"
            onClick={() => onCosting ? onCosting(row.id) : navigate(`/app/rfqs/${row.id}/costing`)}
          >
            Start costing →
          </button>
        );
      }
      if (status === 'in_progress') {
        return (
          <button
            className="text-xs font-medium text-orange-700 hover:text-orange-800 transition-colors whitespace-nowrap"
            onClick={() => onCosting ? onCosting(row.id) : navigate(`/app/rfqs/${row.id}/costing`)}
          >
            Continue costing →
          </button>
        );
      }
      if (status === 'pending_plant_review') {
        return (
          <button
            className="text-xs font-medium text-sky-700 hover:text-sky-800 transition-colors whitespace-nowrap"
            onClick={() => onCosting ? onCosting(row.id) : navigate(`/app/rfqs/${row.id}/costing`)}
          >
            View submission →
          </button>
        );
      }
      if (status === 'returned_for_revision') {
        return (
          <button
            className="text-xs font-medium text-rose-700 hover:text-rose-800 transition-colors whitespace-nowrap"
            onClick={() => onCosting ? onCosting(row.id) : navigate(`/app/rfqs/${row.id}/costing`)}
          >
            Revise costing →
          </button>
        );
      }
      if (status === 'pending_sales_approval') {
        return (
          <button
            className="text-xs font-medium text-purple-700 hover:text-purple-800 transition-colors whitespace-nowrap"
            onClick={() => onCosting ? onCosting(row.id) : navigate(`/app/rfqs/${row.id}/costing`)}
          >
            View status →
          </button>
        );
      }
      if (status === 'ready_for_quote') {
        return (
          <button
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap"
            onClick={() => onCosting ? onCosting(row.id) : navigate(`/app/rfqs/${row.id}/costing`)}
          >
            View approved →
          </button>
        );
      }
      if (status === 'quoted') {
        return (
          <button
            className="text-xs font-medium text-ink-soft hover:text-ink transition-colors whitespace-nowrap"
            onClick={() => navigate('/app/quotations')}
          >
            View quotation →
          </button>
        );
      }
    }

    if (role === 'plant_head') {
      if (status === 'pending_plant_review') {
        return (
          <button
            className="text-xs font-medium text-forge hover:text-forge-hover transition-colors whitespace-nowrap"
            onClick={() => navigate('/app/routing-reviews')}
          >
            Review route →
          </button>
        );
      }
      return (
        <button
          className="text-xs font-medium text-ink-soft hover:text-ink transition-colors whitespace-nowrap"
          onClick={() => navigate(`/app/rfqs/${row.id}/costing`)}
        >
          View route →
        </button>
      );
    }

    if (role === 'sales_head') {
      if (status === 'pending_sales_approval') {
        return (
          <button
            className="text-xs font-medium text-purple-700 hover:text-purple-800 transition-colors whitespace-nowrap"
            onClick={() => navigate('/app/commercial-reviews')}
          >
            Review commercials →
          </button>
        );
      }
      if (status === 'ready_for_quote') {
        return (
          <button
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap"
            onClick={() => navigate('/app/quotations')}
          >
            Issue quotation →
          </button>
        );
      }
      if (status === 'quoted') {
        return (
          <button
            className="text-xs font-medium text-ink-soft hover:text-ink transition-colors whitespace-nowrap"
            onClick={() => navigate('/app/quotations')}
          >
            View quotation →
          </button>
        );
      }
      return (
        <button
          className="text-xs font-medium text-ink-soft hover:text-ink transition-colors whitespace-nowrap"
          onClick={() => navigate(`/app/rfqs/${row.id}/costing`)}
        >
          View costing →
        </button>
      );
    }

    // Default admin / viewer
    return (
      <button
        className="text-xs font-medium text-ink-soft hover:text-forge transition-colors whitespace-nowrap"
        onClick={() => navigate(`/app/rfqs/${row.id}/costing`)}
      >
        View details →
      </button>
    );
  }

  function formatShortDate(val) {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return '—';
    }
  }

  return (
    <div className="table-scroll">
      <table className="w-full text-left text-sm min-w-[900px]">
        <thead className="text-xs text-ink-muted border-b border-line bg-paper">
          <tr>
            <th scope="col" className="px-3.5 py-3 font-medium">RFQ #</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Customer</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Part</th>
            <th scope="col" className="px-3.5 py-3 font-medium text-center">Costing Rev.</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Workflow Status</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Current Owner</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Due Date</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Last Updated</th>
            <th scope="col" className="px-3.5 py-3 font-medium">Available Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {rows.map(row => (
            <tr key={row.id || row.rfq_number} className="hover:bg-sunken transition-colors">
              <td className="px-3.5 py-3.5 font-medium text-ink">
                {onSelect ? (
                  <button
                    className="text-left text-ink hover:text-forge focus-visible:rounded-sm transition-colors"
                    onClick={() => onSelect(row.id)}
                    title="Edit RFQ header"
                  >
                    {row.rfq_number}
                  </button>
                ) : (
                  row.rfq_number
                )}
              </td>
              <td className="px-3.5 py-3.5 text-ink-soft">{row.customer_name}</td>
              <td className="px-3.5 py-3.5 text-ink">{row.part_name}</td>
              <td className="px-3.5 py-3.5 text-center font-mono text-xs text-ink-soft">
                {row.costing_revision ? `v${row.costing_revision}` : '—'}
              </td>
              <td className="px-3.5 py-3.5">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3.5 py-3.5 text-xs text-ink-soft">
                {row.current_owner || row.estimator_name || 'Estimator'}
              </td>
              <td className="px-3.5 py-3.5 text-xs text-ink-muted">
                {formatShortDate(row.due_date)}
              </td>
              <td className="px-3.5 py-3.5 text-xs text-ink-muted">
                {formatShortDate(row.updated_at || row.created_at)}
              </td>
              <td className="px-3.5 py-3.5">
                {renderAction(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
