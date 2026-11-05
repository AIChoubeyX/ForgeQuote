import { query } from '../../config/database.js';

function deriveStage(row) {
  if (row.quotation_status === 'issued' || row.rfq_status === 'quoted') {
    return {
      key: 'issued',
      label: 'Quotation Issued',
      badgeColor: 'emerald',
      isIssued: true,
      isApproved: true
    };
  }
  if (row.quotation_status === 'approved' || row.rfq_status === 'ready_for_quote') {
    return {
      key: 'ready_for_quote',
      label: 'Ready for Quote',
      badgeColor: 'emerald',
      isIssued: false,
      isApproved: true
    };
  }
  if (row.rfq_status === 'pending_sales_approval' || row.commercial_status === 'pending') {
    return {
      key: 'pending_sales_approval',
      label: 'Pending Sales Approval',
      badgeColor: 'purple',
      isIssued: false,
      isApproved: false
    };
  }
  if (row.rfq_status === 'returned_for_revision' || row.commercial_status === 'changes_requested' || row.routing_status === 'changes_requested') {
    return {
      key: 'returned_for_revision',
      label: 'Returned for Revision',
      badgeColor: 'rose',
      isIssued: false,
      isApproved: false
    };
  }
  if (row.rfq_status === 'pending_plant_review' || row.routing_status === 'pending_review') {
    return {
      key: 'pending_plant_review',
      label: 'Pending Plant Review',
      badgeColor: 'sky',
      isIssued: false,
      isApproved: false
    };
  }
  if (row.rfq_status === 'in_progress' || row.revision_id) {
    return {
      key: 'in_progress',
      label: `In Progress (v${row.revision || 1})`,
      badgeColor: 'orange',
      isIssued: false,
      isApproved: false
    };
  }
  return {
    key: 'draft',
    label: 'Draft',
    badgeColor: 'amber',
    isIssued: false,
    isApproved: false
  };
}

export async function metrics(user) {
  if (user.role === 'admin') {
    const result = await query(`SELECT
      (SELECT count(*)::int FROM users) AS total_users,
      (SELECT count(*)::int FROM users WHERE true) AS active_users,
      (SELECT count(*)::int FROM rate_master_versions WHERE effective_from > current_date AND status='active') AS upcoming_rates,
      (SELECT count(*)::int FROM rate_master_versions WHERE effective_from <= current_date AND (effective_to IS NULL OR effective_to >= current_date) AND status='active') AS current_rates,
      (SELECT count(*)::int FROM quotations WHERE status='issued') AS issued_quotations,
      (SELECT count(*)::int FROM quotations WHERE status='approved') AS approved_quotations,
      (SELECT count(*)::int FROM quotations) AS total_quotations,
      (SELECT count(*)::int FROM rfqs WHERE status NOT IN ('closed','quoted','cancelled') AND rfq_number NOT LIKE 'AI-GOV-%' AND rfq_number NOT LIKE 'TEST-%') AS open_rfqs`);

    const records = await query(`SELECT 
      r.id AS rfq_id,
      r.rfq_number,
      r.status AS rfq_status,
      r.created_at AS rfq_created_at,
      r.due_date,
      c.name AS customer_name,
      p.id AS part_id,
      p.name AS part_name,
      p.material,
      p.gross_weight,
      p.annual_volume,
      u.name AS estimator_name,
      crv.id AS revision_id,
      crv.revision,
      crv.status AS routing_status,
      crv.calculations->'components'->>'sellingPrice' AS selling_price,
      cm.id AS commercial_review_id,
      cm.status AS commercial_status,
      q.id AS quotation_id,
      q.quotation_number,
      q.status AS quotation_status,
      q.issued_at,
      q.approved_at
    FROM rfqs r
    JOIN customers c ON c.id = r.customer_id
    JOIN rfq_parts p ON p.rfq_id = r.id
    LEFT JOIN users u ON u.id = r.owner_id
    LEFT JOIN LATERAL (
      SELECT id, revision, status, calculations, rfq_part_id
      FROM costing_revisions
      WHERE rfq_part_id = p.id
      ORDER BY revision DESC LIMIT 1
    ) crv ON true
    LEFT JOIN LATERAL (
      SELECT id, status, costing_revision_id
      FROM commercial_reviews
      WHERE costing_revision_id = crv.id
      ORDER BY created_at DESC LIMIT 1
    ) cm ON true
    LEFT JOIN LATERAL (
      SELECT id, quotation_number, status, issued_at, approved_at, commercial_review_id
      FROM quotations
      WHERE commercial_review_id = cm.id
      ORDER BY created_at DESC LIMIT 1
    ) q ON true
    WHERE r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%'
    ORDER BY r.created_at DESC`);

    const enrichedRecords = records.rows.map(row => ({
      ...row,
      stage: deriveStage(row)
    }));

    return { role: user.role, ...result.rows[0], records: enrichedRecords, recent: enrichedRecords, state: 'ready' };
  }
  if (user.role === 'sales_head') {
    const result = await query(`SELECT
      count(*) FILTER (WHERE cr.status='pending')::int AS pending_approval,
      count(*) FILTER (WHERE cr.status='approved' AND q.status='approved')::int AS approved_quotations,
      count(*) FILTER (WHERE cr.status='approved' AND q.status='issued')::int AS issued_quotations,
      count(*) FILTER (WHERE cr.status='changes_requested')::int AS returned_quotations,
      count(*) FILTER (WHERE cr.status='pending' AND (crv.calculations->'components'->>'sellingPrice')::numeric >= $1::numeric)::int AS high_value
      FROM commercial_reviews cr
      JOIN costing_revisions crv ON crv.id=cr.costing_revision_id
      JOIN rfq_parts p ON p.id=crv.rfq_part_id
      JOIN rfqs r ON r.id=p.rfq_id
      LEFT JOIN quotations q ON q.commercial_review_id=cr.id
      WHERE r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%'`, [process.env.QUOTATION_HIGH_VALUE_THRESHOLD || '100000']);
    return { role: user.role, ...result.rows[0], approved_sent: result.rows[0].issued_quotations, recent: [], state: 'ready' };
  }
  if (user.role === 'plant_head') {
    const result = await query(`SELECT count(*) FILTER (WHERE cr.status='pending_review')::int AS pending_routing,
      count(*) FILTER (WHERE cr.status='pending_review' AND cr.created_at < now() - interval '7 days')::int AS overdue_routing,
      count(*) FILTER (WHERE cr.status='approved')::int AS approved_routing,
      count(*) FILTER (WHERE cr.status='changes_requested')::int AS routing_issues 
      FROM costing_revisions cr
      JOIN rfq_parts p ON p.id=cr.rfq_part_id
      JOIN rfqs r ON r.id=p.rfq_id
      WHERE r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%'`);
    return { role: user.role, ...result.rows[0], recent: [], state: 'ready' };
  }
  const totals = await query(`SELECT count(*) FILTER (WHERE r.owner_id=$1 AND r.status NOT IN ('closed','quoted','cancelled'))::int AS open,
    count(*) FILTER (WHERE r.owner_id=$1 AND r.due_date < current_date AND r.status NOT IN ('closed','quoted','cancelled'))::int AS overdue,
    count(*) FILTER (WHERE r.owner_id=$1 AND r.due_date >= current_date AND r.due_date <= current_date + 7 AND r.status NOT IN ('closed','quoted','cancelled'))::int AS due_soon,
    count(*) FILTER (WHERE r.owner_id=$1 AND (r.status IN ('draft', 'in_progress') OR cr.status IS NULL OR cr.status='draft'))::int AS awaiting_costing,
    count(*) FILTER (WHERE r.owner_id=$1 AND (r.status = 'pending_plant_review' OR cr.status='pending_review'))::int AS awaiting_routing,
    count(*) FILTER (WHERE r.owner_id=$1 AND (r.status = 'returned_for_revision' OR cr.status='changes_requested' OR cm.status='changes_requested'))::int AS returned_correction,
    count(*) FILTER (WHERE r.owner_id=$1 AND (r.status = 'pending_sales_approval' OR cm.status='pending'))::int AS awaiting_commercial,
    count(*) FILTER (WHERE r.owner_id=$1 AND (r.status = 'ready_for_quote' OR q.status='approved'))::int AS approved_quotations,
    count(*) FILTER (WHERE r.owner_id=$1 AND (r.status = 'quoted' OR q.status='issued'))::int AS issued_quotations
    FROM rfqs r JOIN rfq_parts p ON p.rfq_id=r.id
    LEFT JOIN LATERAL (SELECT status FROM costing_revisions WHERE rfq_part_id=p.id ORDER BY revision DESC LIMIT 1) cr ON true
    LEFT JOIN LATERAL (SELECT c.status FROM commercial_reviews c JOIN costing_revisions x ON x.id=c.costing_revision_id WHERE x.rfq_part_id=p.id ORDER BY c.created_at DESC LIMIT 1) cm ON true
    LEFT JOIN LATERAL (SELECT q.status FROM quotations q JOIN commercial_reviews c ON c.id=q.commercial_review_id JOIN costing_revisions x ON x.id=c.costing_revision_id WHERE x.rfq_part_id=p.id ORDER BY q.created_at DESC LIMIT 1) q ON true
    WHERE r.owner_id=$1 AND r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%'`, [user.id]);
  const recent = await query(`SELECT r.id,r.rfq_number,c.name AS customer_name,p.name AS part_name,r.status,r.due_date
    FROM rfqs r JOIN customers c ON c.id=r.customer_id JOIN rfq_parts p ON p.rfq_id=r.id
    WHERE r.owner_id=$1 AND r.rfq_number NOT LIKE 'AI-GOV-%' AND r.rfq_number NOT LIKE 'TEST-%' ORDER BY r.created_at DESC LIMIT 5`, [user.id]);
  return { role: user.role, ...totals.rows[0], recent: recent.rows, state: 'ready' };
}
