import { query } from '../../config/database.js';

export async function list({ search = '', status, workflow, page = 1, pageSize = 50, sort, user }) {
  const scopedOwner = user.role === 'estimator' ? user.id : null;
  const params = [`%${search}%`, status || null, scopedOwner, pageSize, (page - 1) * pageSize];

  const workflowFilters = {
    open: `r.status NOT IN ('closed','quoted','cancelled')`,
    draft: `r.status = 'draft'`,
    costing: `r.status IN ('draft', 'in_progress')`,
    in_progress: `r.status = 'in_progress'`,
    plant_review: `r.status = 'pending_plant_review'`,
    pending_plant_review: `r.status = 'pending_plant_review'`,
    returned: `r.status = 'returned_for_revision'`,
    returned_for_revision: `r.status = 'returned_for_revision'`,
    commercial: `r.status = 'pending_sales_approval'`,
    pending_sales_approval: `r.status = 'pending_sales_approval'`,
    ready_for_quote: `r.status = 'ready_for_quote'`,
    issued: `r.status = 'quoted'`,
    quoted: `r.status = 'quoted'`
  };

  const workflowFilter = workflowFilters[workflow] || 'TRUE';

  const from = `FROM rfqs r
    JOIN customers c ON c.id=r.customer_id
    JOIN users u ON u.id=r.owner_id
    JOIN rfq_parts p ON p.rfq_id=r.id
    LEFT JOIN LATERAL (
      SELECT id, revision, status, created_at, updated_at
      FROM costing_revisions
      WHERE rfq_part_id=p.id
      ORDER BY revision DESC LIMIT 1
    ) latest_costing ON TRUE
    LEFT JOIN LATERAL (
      SELECT c.id, c.status
      FROM commercial_reviews c
      JOIN costing_revisions x ON x.id=c.costing_revision_id
      WHERE x.rfq_part_id=p.id
      ORDER BY c.created_at DESC LIMIT 1
    ) latest_commercial ON TRUE
    LEFT JOIN LATERAL (
      SELECT q.id, q.status, q.quotation_number, q.issued_at
      FROM quotations q
      JOIN commercial_reviews c ON c.id=q.commercial_review_id
      JOIN costing_revisions x ON x.id=c.costing_revision_id
      WHERE x.rfq_part_id=p.id
      ORDER BY q.created_at DESC LIMIT 1
    ) latest_quotation ON TRUE`;

  const where = `WHERE ($1='%%' OR r.rfq_number ILIKE $1 OR c.name ILIKE $1 OR p.name ILIKE $1)
    AND ($2::text IS NULL OR r.status=$2)
    AND ($3::uuid IS NULL OR r.owner_id=$3)
    AND ${workflowFilter}
    AND r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%'`;

  const selectCols = `r.id, r.rfq_number, r.received_date, r.due_date, r.status, r.created_at, r.updated_at,
    c.name AS customer_name, u.name AS estimator_name, u.id AS owner_id,
    p.id AS part_id, p.name AS part_name,
    latest_costing.id AS costing_revision_id, latest_costing.revision AS costing_revision, latest_costing.status AS costing_status,
    latest_commercial.id AS commercial_review_id, latest_commercial.status AS commercial_status,
    latest_quotation.id AS quotation_id, latest_quotation.status AS quotation_status, latest_quotation.quotation_number,
    CASE
      WHEN r.status = 'pending_plant_review' THEN 'Plant Head'
      WHEN r.status = 'pending_sales_approval' THEN 'Sales Head'
      WHEN r.status = 'ready_for_quote' THEN 'Sales Head'
      WHEN r.status = 'quoted' THEN 'Sales Team'
      ELSE u.name
    END AS current_owner`;

  const rows = await query(
    `SELECT ${selectCols} ${from} ${where} ORDER BY ${sort === 'created_at' ? 'r.created_at DESC' : 'r.due_date ASC'} LIMIT $4 OFFSET $5`,
    params
  );

  const count = await query(`SELECT count(*)::int AS count ${from} ${where}`, params.slice(0, 3));
  return { rows: rows.rows, total: count.rows[0].count };
}

export async function findById(id, client = { query }) {
  const result = await client.query(
    `SELECT r.*, c.name AS customer_name, u.name AS estimator_name,
            p.id AS part_id, p.name AS part_name, p.description, p.material, p.gross_weight, p.annual_volume
     FROM rfqs r
     JOIN customers c ON c.id=r.customer_id
     JOIN users u ON u.id=r.owner_id
     JOIN rfq_parts p ON p.rfq_id=r.id
     WHERE r.id=$1`,
    [id]
  );
  return result.rows[0];
}

export async function findByNumber(number, client) {
  const result = await client.query('SELECT id FROM rfqs WHERE rfq_number=$1', [number]);
  return result.rows[0];
}

export async function insert(client, input) {
  const result = await client.query(
    'INSERT INTO rfqs (rfq_number, customer_id, owner_id, received_date, due_date, status, source_notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [input.rfqNumber, input.customerId, input.assignedEstimatorId, input.receivedDate, input.dueDate, input.status || 'draft', input.sourceNotes]
  );
  return result.rows[0];
}

export async function update(client, id, input) {
  const result = await client.query(
    'UPDATE rfqs SET rfq_number=$1, customer_id=$2, owner_id=$3, received_date=$4, due_date=$5, status=$6, source_notes=$7, updated_at=now() WHERE id=$8 RETURNING *',
    [input.rfqNumber, input.customerId, input.assignedEstimatorId, input.receivedDate, input.dueDate, input.status, input.sourceNotes, id]
  );
  return result.rows[0];
}

export async function savePart(client, rfqId, part, update) {
  const sql = update
    ? 'UPDATE rfq_parts SET name=$1, description=$2, material=$3, gross_weight=$4, annual_volume=$5 WHERE rfq_id=$6'
    : 'INSERT INTO rfq_parts (name, description, material, gross_weight, annual_volume, rfq_id) VALUES ($1,$2,$3,$4,$5,$6)';
  await client.query(sql, [part.name, part.description, part.material, part.grossWeight, part.annualVolume, rfqId]);
}
