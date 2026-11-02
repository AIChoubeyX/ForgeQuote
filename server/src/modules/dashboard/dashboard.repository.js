import { query } from '../../config/database.js';
export async function metrics() {
  const totals = await query(`SELECT count(*) FILTER (WHERE status NOT IN ('closed','quoted'))::int AS open,count(*) FILTER (WHERE due_date <= current_date + 7 AND status NOT IN ('closed','quoted'))::int AS due_soon,count(*) FILTER (WHERE status='ready_for_quote')::int AS pending_approval,count(*) FILTER (WHERE status='quoted')::int AS quoted FROM rfqs`);
  const recent = await query(`SELECT r.id,r.rfq_number,c.name AS customer_name,p.name AS part_name,r.status,r.due_date FROM rfqs r JOIN customers c ON c.id=r.customer_id JOIN rfq_parts p ON p.rfq_id=r.id ORDER BY r.created_at DESC LIMIT 5`);
  return { ...totals.rows[0], recent: recent.rows };
}
