import { query } from '../../config/database.js';
export async function metrics(user) {
  if (user.role === 'admin') {
    const result = await query(`SELECT
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(*)::int FROM users WHERE true) AS active_users,
      (SELECT count(*)::int FROM rate_master_versions WHERE effective_from > current_date AND status='active') AS upcoming_rates,
      (SELECT count(*)::int FROM rate_master_versions WHERE effective_from <= current_date AND (effective_to IS NULL OR effective_to >= current_date) AND status='active') AS current_rates`);
    return { role: user.role, ...result.rows[0], recent: [], state: 'ready' };
  }
  if (user.role === 'sales_head') {
    const result = await query(`SELECT count(*) FILTER (WHERE status='ready_for_quote')::int AS pending_approval,
      count(*) FILTER (WHERE status='quoted')::int AS approved_sent FROM rfqs`);
    return { role: user.role, ...result.rows[0], high_value: 0, recent: [], state: 'quotation_workflow_pending' };
  }
  if (user.role === 'plant_head') {
    const result = await query(`SELECT count(*) FILTER (WHERE status='pending_review')::int AS pending_routing,
      count(*) FILTER (WHERE status='pending_review' AND created_at < now() - interval '7 days')::int AS overdue_routing,
      count(*) FILTER (WHERE status IN ('approved','changes_requested') AND reviewed_at >= now() - interval '30 days')::int AS recently_reviewed,
      count(*) FILTER (WHERE status='changes_requested')::int AS routing_issues FROM costing_revisions`);
    return { role: user.role, ...result.rows[0], recent: [], state: 'ready' };
  }
  const totals = await query(`SELECT count(*) FILTER (WHERE owner_id=$1 AND status NOT IN ('closed','quoted'))::int AS open,
    count(*) FILTER (WHERE owner_id=$1 AND due_date < current_date AND status NOT IN ('closed','quoted'))::int AS overdue,
    count(*) FILTER (WHERE owner_id=$1 AND due_date >= current_date AND due_date <= current_date + 7 AND status NOT IN ('closed','quoted'))::int AS due_soon,
    count(*) FILTER (WHERE owner_id=$1 AND status='in_progress')::int AS awaiting_costing,
    count(*) FILTER (WHERE owner_id=$1 AND status='ready_for_quote')::int AS awaiting_routing FROM rfqs`, [user.id]);
  const recent = await query(`SELECT r.id,r.rfq_number,c.name AS customer_name,p.name AS part_name,r.status,r.due_date
    FROM rfqs r JOIN customers c ON c.id=r.customer_id JOIN rfq_parts p ON p.rfq_id=r.id
    WHERE r.owner_id=$1 ORDER BY r.created_at DESC LIMIT 5`, [user.id]);
  return { role: user.role, ...totals.rows[0], recent: recent.rows, state: 'ready' };
}
