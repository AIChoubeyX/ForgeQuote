import { query } from '../../config/database.js';

export async function list(req, res) {
  const result = await query(`SELECT ae.id,ae.entity_type,ae.entity_id,ae.action,ae.metadata,ae.created_at,
    u.name AS actor_name,u.role AS actor_role
    FROM audit_events ae LEFT JOIN users u ON u.id=ae.actor_id
    ORDER BY ae.created_at DESC LIMIT 200`);
  res.json({ data: result.rows });
}
