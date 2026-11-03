import { query } from '../../config/database.js';
export async function list({ search, status, page, pageSize, sort, user }) {
  const scopedOwner = user.role === 'estimator' ? user.id : null;
  const params = [`%${search}%`, status || null, scopedOwner, pageSize, (page - 1) * pageSize];
  const rows = await query(`SELECT r.id,r.rfq_number,r.received_date,r.due_date,r.status,r.created_at,c.name AS customer_name,u.name AS estimator_name,p.name AS part_name FROM rfqs r JOIN customers c ON c.id=r.customer_id JOIN users u ON u.id=r.owner_id JOIN rfq_parts p ON p.rfq_id=r.id WHERE ($1='%%' OR r.rfq_number ILIKE $1 OR c.name ILIKE $1 OR p.name ILIKE $1) AND ($2::text IS NULL OR r.status=$2) AND ($3::uuid IS NULL OR r.owner_id=$3) ORDER BY ${sort === 'created_at' ? 'r.created_at' : 'r.due_date'} ASC LIMIT $4 OFFSET $5`, params);
  const count = await query(`SELECT count(*)::int AS count FROM rfqs r JOIN customers c ON c.id=r.customer_id JOIN rfq_parts p ON p.rfq_id=r.id WHERE ($1='%%' OR r.rfq_number ILIKE $1 OR c.name ILIKE $1 OR p.name ILIKE $1) AND ($2::text IS NULL OR r.status=$2) AND ($3::uuid IS NULL OR r.owner_id=$3)`, params.slice(0, 3));
  return { rows: rows.rows, total: count.rows[0].count };
}
export async function findById(id, client = { query }) {
  const result = await client.query(`SELECT r.*,c.name AS customer_name,u.name AS estimator_name,p.name AS part_name,p.description,p.material,p.gross_weight,p.annual_volume FROM rfqs r JOIN customers c ON c.id=r.customer_id JOIN users u ON u.id=r.owner_id JOIN rfq_parts p ON p.rfq_id=r.id WHERE r.id=$1`, [id]);
  return result.rows[0];
}
export async function findByNumber(number, client) { const result = await client.query('SELECT id FROM rfqs WHERE rfq_number=$1', [number]); return result.rows[0]; }
export async function insert(client, input) { const result = await client.query('INSERT INTO rfqs (rfq_number,customer_id,owner_id,received_date,due_date,status,source_notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [input.rfqNumber,input.customerId,input.assignedEstimatorId,input.receivedDate,input.dueDate,input.status,input.sourceNotes]); return result.rows[0]; }
export async function update(client, id, input) { const result = await client.query('UPDATE rfqs SET rfq_number=$1,customer_id=$2,owner_id=$3,received_date=$4,due_date=$5,status=$6,source_notes=$7,updated_at=now() WHERE id=$8 RETURNING *', [input.rfqNumber,input.customerId,input.assignedEstimatorId,input.receivedDate,input.dueDate,input.status,input.sourceNotes,id]); return result.rows[0]; }
export async function savePart(client, rfqId, part, update) { const sql = update ? 'UPDATE rfq_parts SET name=$1,description=$2,material=$3,gross_weight=$4,annual_volume=$5 WHERE rfq_id=$6' : 'INSERT INTO rfq_parts (name,description,material,gross_weight,annual_volume,rfq_id) VALUES ($1,$2,$3,$4,$5,$6)'; await client.query(sql, [part.name,part.description,part.material,part.grossWeight,part.annualVolume,rfqId]); }
