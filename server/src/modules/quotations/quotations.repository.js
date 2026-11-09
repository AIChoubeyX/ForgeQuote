import { query } from '../../config/database.js';

export async function list(optionsOrStatus = {}, maybeUser = {}) {
  let status, search, fromDate, toDate, page, pageSize, sort, order, user;

  if (typeof optionsOrStatus === 'object' && optionsOrStatus !== null && !optionsOrStatus.role) {
    ({
      status,
      search,
      fromDate,
      toDate,
      page = 1,
      pageSize = 20,
      sort = 'issued_at',
      order = 'desc',
      user = {}
    } = optionsOrStatus);
  } else {
    status = optionsOrStatus;
    user = maybeUser || {};
    page = 1;
    pageSize = 1000;
    sort = 'created_at';
    order = 'desc';
  }

  const scopedOwner = user?.role === 'estimator' ? user.id : null;

  const baseFrom = `FROM quotations q
    JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
    JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
    JOIN rfq_parts p ON p.id = crv.rfq_part_id
    JOIN rfqs r ON r.id = p.rfq_id
    JOIN customers c ON c.id = r.customer_id`;

  const conditions = [
    `($1::uuid IS NULL OR r.owner_id = $1)`,
    `r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%'`
  ];
  const params = [scopedOwner];

  if (status) {
    params.push(status);
    conditions.push(`q.status = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(
      q.quotation_number ILIKE $${params.length} OR
      r.rfq_number ILIKE $${params.length} OR
      c.name ILIKE $${params.length} OR
      p.name ILIKE $${params.length}
    )`);
  }

  if (fromDate) {
    params.push(fromDate);
    conditions.push(`COALESCE(q.issued_at, q.approved_at, q.created_at) >= $${params.length}::timestamptz`);
  }

  if (toDate) {
    params.push(toDate);
    conditions.push(`COALESCE(q.issued_at, q.approved_at, q.created_at) <= ($${params.length}::date + interval '1 day')`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `SELECT 
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE q.status = 'issued')::int AS issued_count,
    COUNT(*) FILTER (WHERE q.status = 'approved')::int AS approved_count,
    COALESCE(SUM(((crv.calculations->'components'->>'sellingPrice')::numeric * p.annual_volume)), 0)::numeric AS total_value_sum
    ${baseFrom} ${whereClause}`;

  const countRes = await query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;
  const summary = {
    total,
    issued: countRes.rows[0]?.issued_count || 0,
    approved: countRes.rows[0]?.approved_count || 0,
    totalValueSum: Number(countRes.rows[0]?.total_value_sum || 0)
  };

  const sortColumnMap = {
    quotation_number: 'q.quotation_number',
    rfq_number: 'r.rfq_number',
    customer: 'c.name',
    customer_name: 'c.name',
    part_name: 'p.name',
    selling_price: "(crv.calculations->'components'->>'sellingPrice')::numeric",
    unit_price: "(crv.calculations->'components'->>'sellingPrice')::numeric",
    total_value: "((crv.calculations->'components'->>'sellingPrice')::numeric * p.annual_volume)",
    issued_at: 'COALESCE(q.issued_at, q.approved_at, q.created_at)',
    created_at: 'q.created_at'
  };

  const sortCol = sortColumnMap[sort] || 'COALESCE(q.issued_at, q.approved_at, q.created_at)';
  const sortDir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const currentPage = Math.max(1, Number(page) || 1);
  const limit = Math.max(1, Math.min(100, Number(pageSize) || 20));
  const offset = (currentPage - 1) * limit;

  const rowsParams = [...params, limit, offset];

  const selectCols = `
    q.id,
    q.quotation_number,
    q.status,
    q.approved_at,
    q.issued_at,
    q.created_at,
    cr.status AS commercial_status,
    cr.comment,
    cr.reviewed_at,
    cr.costing_revision_id,
    crv.revision,
    crv.calculations,
    p.name AS part_name,
    p.material,
    p.gross_weight,
    p.annual_volume,
    r.id AS rfq_id,
    r.rfq_number,
    c.name AS customer_name,
    (crv.calculations->'components'->>'sellingPrice')::numeric AS unit_price,
    ((crv.calculations->'components'->>'sellingPrice')::numeric * p.annual_volume)::numeric AS total_value,
    'INR' AS currency,
    (q.issued_at + INTERVAL '1 day' * COALESCE((q.snapshot->'company'->>'validityDays')::int, 30)) AS valid_until,
    (q.approved_at + INTERVAL '1 day' * COALESCE((q.snapshot->'company'->>'validityDays')::int, 30)) AS approved_valid_until,
    q.snapshot
  `;

  const rowsQuery = `SELECT ${selectCols} ${baseFrom} ${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT $${rowsParams.length - 1} OFFSET $${rowsParams.length}`;

  const rows = await query(rowsQuery, rowsParams);
  const totalPages = Math.ceil(total / limit) || 1;

  const resultRows = rows.rows;
  resultRows.total = total;
  resultRows.page = currentPage;
  resultRows.pageSize = limit;
  resultRows.totalPages = totalPages;
  resultRows.summary = summary;

  return resultRows;
}
