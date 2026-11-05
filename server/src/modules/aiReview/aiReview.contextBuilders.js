import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import { can } from '../../shared/authorization.js';

export async function buildCostingReviewContext({ costingRevisionId, rfqId, user }) {
  if (!can(user, 'costing:read')) {
    throw new AppError(403, 'You do not have permission to view costing reviews');
  }

  let revisionRow = null;
  let partRow = null;

  if (costingRevisionId) {
    const revResult = await query(
      `SELECT cr.*, p.id AS part_id, p.name AS part_name, p.description AS part_description,
              p.material, p.gross_weight, p.annual_volume,
              r.id AS rfq_id, r.rfq_number, r.owner_id, r.received_date, r.due_date,
              c.id AS customer_id, c.name AS customer_name
       FROM costing_revisions cr
       JOIN rfq_parts p ON p.id = cr.rfq_part_id
       JOIN rfqs r ON r.id = p.rfq_id
       JOIN customers c ON c.id = r.customer_id
       WHERE cr.id = $1`,
      [costingRevisionId]
    );
    if (!revResult.rows[0]) {
      throw new AppError(404, 'Costing revision not found');
    }
    revisionRow = revResult.rows[0];
    partRow = {
      id: revisionRow.part_id,
      name: revisionRow.part_name,
      description: revisionRow.part_description,
      material: revisionRow.material,
      gross_weight: revisionRow.gross_weight,
      annual_volume: revisionRow.annual_volume
    };
  } else if (rfqId) {
    const partResult = await query(
      `SELECT p.id AS part_id, p.name AS part_name, p.description AS part_description,
              p.material, p.gross_weight, p.annual_volume,
              r.id AS rfq_id, r.rfq_number, r.owner_id, r.received_date, r.due_date,
              c.id AS customer_id, c.name AS customer_name
       FROM rfq_parts p
       JOIN rfqs r ON r.id = p.rfq_id
       JOIN customers c ON c.id = r.customer_id
       WHERE r.id = $1 ORDER BY p.id LIMIT 1`,
      [rfqId]
    );
    if (!partResult.rows[0]) {
      throw new AppError(404, 'RFQ not found');
    }
    const pr = partResult.rows[0];
    partRow = {
      id: pr.part_id,
      name: pr.part_name,
      description: pr.part_description,
      material: pr.material,
      gross_weight: pr.gross_weight,
      annual_volume: pr.annual_volume
    };

    const latestRev = await query(
      `SELECT * FROM costing_revisions WHERE rfq_part_id = $1 ORDER BY revision DESC LIMIT 1`,
      [pr.part_id]
    );
    if (latestRev.rows[0]) {
      revisionRow = { ...latestRev.rows[0], ...pr };
    } else {
      revisionRow = null;
    }
  } else {
    throw new AppError(400, 'Either costingRevisionId or rfqId must be provided');
  }

  const ownerId = revisionRow ? revisionRow.owner_id : (await query('SELECT owner_id FROM rfqs WHERE id=$1', [rfqId])).rows[0]?.owner_id;
  if (user.role === 'estimator' && ownerId && ownerId !== user.id) {
    throw new AppError(403, 'You do not have permission to view this costing record');
  }

  let operations = [];
  let historicalRevisions = [];
  let activeRates = [];

  if (revisionRow) {
    const opResult = await query(
      `SELECT co.*, rm.category AS machine_category
       FROM costing_operations co
       LEFT JOIN rate_master_versions rmv ON rmv.id = co.rate_version_id
       LEFT JOIN rate_masters rm ON rm.id = rmv.rate_master_id
       WHERE co.costing_revision_id = $1
       ORDER BY co.sequence ASC`,
      [revisionRow.id]
    );
    operations = opResult.rows;

    const histResult = await query(
      `SELECT id, revision, status, costing_date, calculations
       FROM costing_revisions
       WHERE rfq_part_id = $1 AND id <> $2
       ORDER BY revision DESC LIMIT 5`,
      [revisionRow.rfq_part_id, revisionRow.id]
    );
    historicalRevisions = histResult.rows;

    const costingDate = revisionRow.costing_date || new Date().toISOString().slice(0, 10);
    const rateResult = await query(
      `SELECT rm.code, rm.name, rm.category, rm.unit, rv.value, rv.id AS version_id
       FROM rate_masters rm
       JOIN rate_master_versions rv ON rv.rate_master_id = rm.id
       WHERE rv.status = 'active'
         AND rv.effective_from <= $1::date
         AND (rv.effective_to IS NULL OR rv.effective_to >= $1::date)`,
      [costingDate]
    );
    activeRates = rateResult.rows;
  }

  return {
    reviewType: 'costing_review',
    rfq: {
      id: revisionRow ? revisionRow.rfq_id : rfqId,
      rfqNumber: revisionRow?.rfq_number,
      customerName: revisionRow?.customer_name,
      ownerId
    },
    part: partRow ? {
      id: partRow.id,
      name: partRow.name,
      description: partRow.description,
      material: partRow.material,
      grossWeight: Number(partRow.gross_weight),
      annualVolume: Number(partRow.annual_volume)
    } : null,
    revision: revisionRow ? {
      id: revisionRow.id,
      revision: revisionRow.revision,
      status: revisionRow.status,
      costingDate: revisionRow.costing_date,
      inputs: revisionRow.inputs,
      calculations: revisionRow.calculations,
      rowVersion: revisionRow.row_version,
      operations: operations.map(op => ({
        id: op.id,
        sequence: op.sequence,
        operationName: op.operation_name,
        machineCode: op.machine_code,
        cycleTimeMinutes: Number(op.cycle_time_minutes),
        rateVersionId: op.rate_version_id,
        rateValue: Number(op.rate_value),
        rateUnit: op.rate_unit
      }))
    } : null,
    historicalRevisions: historicalRevisions.map(h => ({
      revision: h.revision,
      status: h.status,
      costingDate: h.costing_date,
      sellingPrice: h.calculations?.components?.sellingPrice,
      totalCost: h.calculations?.components?.totalManufacturingCost
    })),
    activeRates: activeRates.map(r => ({
      code: r.code,
      name: r.name,
      category: r.category,
      unit: r.unit,
      value: Number(r.value)
    }))
  };
}

export async function buildRoutingReviewContext({ costingRevisionId, user }) {
  const isAuthorized = can(user, 'routing:review') || (user?.role === 'estimator' && can(user, 'ai:review'));
  if (!isAuthorized) {
    throw new AppError(403, 'You do not have permission to view routing reviews');
  }

  if (!costingRevisionId) {
    throw new AppError(400, 'costingRevisionId is required for routing review');
  }

  const result = await query(
    `SELECT cr.*, p.id AS part_id, p.name AS part_name, p.description AS part_description,
            p.material, p.gross_weight, p.annual_volume,
            r.id AS rfq_id, r.rfq_number, r.received_date, r.due_date,
            c.id AS customer_id, c.name AS customer_name,
            u.id AS estimator_id, u.name AS estimator_name
     FROM costing_revisions cr
     JOIN rfq_parts p ON p.id = cr.rfq_part_id
     JOIN rfqs r ON r.id = p.rfq_id
     JOIN customers c ON c.id = r.customer_id
     JOIN users u ON u.id = cr.created_by
     WHERE cr.id = $1`,
    [costingRevisionId]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Costing revision not found for routing review');
  }

  const row = result.rows[0];
  if (user?.role === 'estimator' && row.estimator_id !== user.id) {
    throw new AppError(403, 'You do not have permission to view this routing review');
  }

  const opResult = await query(
    `SELECT co.*, rm.name AS machine_name, rm.unit AS master_unit
     FROM costing_operations co
     LEFT JOIN rate_master_versions rmv ON rmv.id = co.rate_version_id
     LEFT JOIN rate_masters rm ON rm.id = rmv.rate_master_id
     WHERE co.costing_revision_id = $1
     ORDER BY co.sequence ASC`,
    [costingRevisionId]
  );

  return {
    reviewType: 'routing_review',
    rfq: {
      id: row.rfq_id,
      rfqNumber: row.rfq_number,
      customerName: row.customer_name
    },
    part: {
      id: row.part_id,
      name: row.part_name,
      description: row.part_description,
      material: row.material,
      grossWeight: Number(row.gross_weight),
      annualVolume: Number(row.annual_volume)
    },
    revision: {
      id: row.id,
      revision: row.revision,
      status: row.status,
      costingDate: row.costing_date,
      reviewComment: row.review_comment,
      reviewedAt: row.reviewed_at,
      rowVersion: row.row_version,
      estimatorName: row.estimator_name,
      operations: opResult.rows.map(op => ({
        id: op.id,
        sequence: op.sequence,
        operationName: op.operation_name,
        machineCode: op.machine_code,
        machineName: op.machine_name,
        cycleTimeMinutes: Number(op.cycle_time_minutes),
        rateVersionId: op.rate_version_id,
        rateValue: Number(op.rate_value),
        rateUnit: op.rate_unit || op.master_unit || 'INR/hour'
      }))
    }
  };
}

export async function buildCommercialReviewContext({ commercialReviewId, costingRevisionId, user }) {
  if (!can(user, 'commercial:review')) {
    throw new AppError(403, 'You do not have permission to view commercial reviews');
  }

  let commRow = null;
  if (commercialReviewId) {
    const result = await query(
      `SELECT cmr.id AS commercial_review_id, cmr.status AS commercial_status,
              cmr.comment AS commercial_comment, cmr.row_version AS commercial_row_version,
              cmr.reviewed_at AS commercial_reviewed_at,
              cr.*, p.id AS part_id, p.name AS part_name, p.description AS part_description,
              p.material, p.gross_weight, p.annual_volume,
              r.id AS rfq_id, r.rfq_number, r.received_date, r.due_date,
              c.id AS customer_id, c.name AS customer_name,
              q.id AS quotation_id, q.quotation_number
       FROM commercial_reviews cmr
       JOIN costing_revisions cr ON cr.id = cmr.costing_revision_id
       JOIN rfq_parts p ON p.id = cr.rfq_part_id
       JOIN rfqs r ON r.id = p.rfq_id
       JOIN customers c ON c.id = r.customer_id
       LEFT JOIN quotations q ON q.commercial_review_id = cmr.id
       WHERE cmr.id = $1`,
      [commercialReviewId]
    );
    commRow = result.rows[0];
  } else if (costingRevisionId) {
    const result = await query(
      `SELECT cmr.id AS commercial_review_id, cmr.status AS commercial_status,
              cmr.comment AS commercial_comment, cmr.row_version AS commercial_row_version,
              cmr.reviewed_at AS commercial_reviewed_at,
              cr.*, p.id AS part_id, p.name AS part_name, p.description AS part_description,
              p.material, p.gross_weight, p.annual_volume,
              r.id AS rfq_id, r.rfq_number, r.received_date, r.due_date,
              c.id AS customer_id, c.name AS customer_name,
              q.id AS quotation_id, q.quotation_number
       FROM costing_revisions cr
       JOIN rfq_parts p ON p.id = cr.rfq_part_id
       JOIN rfqs r ON r.id = p.rfq_id
       JOIN customers c ON c.id = r.customer_id
       LEFT JOIN commercial_reviews cmr ON cmr.costing_revision_id = cr.id
       LEFT JOIN quotations q ON q.commercial_review_id = cmr.id
       WHERE cr.id = $1`,
      [costingRevisionId]
    );
    commRow = result.rows[0];
  } else {
    throw new AppError(400, 'Either commercialReviewId or costingRevisionId is required');
  }

  if (!commRow) {
    throw new AppError(404, 'Commercial review record not found');
  }

  const opResult = await query(
    `SELECT co.* FROM costing_operations co WHERE co.costing_revision_id = $1 ORDER BY co.sequence ASC`,
    [commRow.id]
  );

  return {
    reviewType: 'commercial_review',
    commercialReview: {
      id: commRow.commercial_review_id,
      status: commRow.commercial_status || 'pending',
      comment: commRow.commercial_comment,
      rowVersion: commRow.commercial_row_version,
      quotationNumber: commRow.quotation_number,
      quotationId: commRow.quotation_id
    },
    rfq: {
      id: commRow.rfq_id,
      rfqNumber: commRow.rfq_number,
      customerName: commRow.customer_name
    },
    part: {
      id: commRow.part_id,
      name: commRow.part_name,
      description: commRow.part_description,
      material: commRow.material,
      grossWeight: Number(commRow.gross_weight),
      annualVolume: Number(commRow.annual_volume)
    },
    costingRevision: {
      id: commRow.id,
      revision: commRow.revision,
      status: commRow.status,
      costingDate: commRow.costing_date,
      calculations: commRow.calculations,
      inputs: commRow.inputs,
      operationsCount: opResult.rows.length
    },
    commercialConfig: {
      companyName: env.companyName,
      companyAddress: env.companyAddress,
      taxRate: Number(env.quotationTaxRate || 0),
      validityDays: Number(env.quotationValidityDays || 30),
      highValueThreshold: Number(env.quotationHighValueThreshold || 100000)
    }
  };
}

