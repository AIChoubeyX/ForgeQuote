import { StatusBadge } from './StatusBadge.jsx';

export function RfqTable({ rows, onSelect, onCosting }) {
  return (
    <div className="table-scroll">
      <table className="w-full text-left text-sm min-w-[600px]">
        <thead className="text-xs uppercase tracking-wide text-[#737373] border-b border-[#292D34]">
          <tr>
            <th scope="col" className="px-3 py-3">RFQ</th>
            <th scope="col" className="px-3 py-3">Customer</th>
            <th scope="col" className="px-3 py-3">Part</th>
            <th scope="col" className="px-3 py-3">Status</th>
            <th scope="col" className="px-3 py-3">Due</th>
            {onCosting && <th scope="col" className="px-3 py-3">Workspace</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id || row.rfq_number} className="border-t border-[#292D34] hover:bg-[#202020] transition-colors">
              <td className="px-3 py-4 font-semibold text-[#F5F5F5]">
                {onSelect ? (
                  <button className="text-left text-[#F5F5F5] hover:text-forge focus-visible:rounded-sm transition-colors" onClick={() => onSelect(row.id)}>
                    {row.rfq_number}
                  </button>
                ) : (
                  row.rfq_number
                )}
              </td>
              <td className="px-3 py-4 text-[#A3A3A3]">{row.customer_name}</td>
              <td className="px-3 py-4 text-[#A3A3A3]">{row.part_name}</td>
              <td className="px-3 py-4">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-4 text-[#737373]">
                {new Date(row.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </td>
              {onCosting && (
                <td className="px-3 py-4">
                  <button className="text-xs font-semibold text-forge hover:text-[#E94B13] transition-colors" onClick={() => onCosting(row.id)}>
                    Open costing →
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
