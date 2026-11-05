import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';

describe('Authoritative RFQ Lifecycle, Status Governance & Estimator Permissions Suite', () => {
  let estimatorUser;
  let otherEstimatorUser;
  let plantHeadUser;
  let salesHeadUser;
  let adminUser;

  let estimatorToken;
  let otherEstimatorToken;
  let plantHeadToken;
  let salesHeadToken;
  let adminToken;

  let customerId;
  let testRfqId;
  let testPartId;
  let revision1Id;
  let revision2Id;
  let commercialReviewId;
  let quotationId;

  beforeAll(async () => {
    const usersRes = await query('SELECT id, email, role FROM users');
    estimatorUser = usersRes.rows.find(u => u.role === 'estimator');
    plantHeadUser = usersRes.rows.find(u => u.role === 'plant_head');
    salesHeadUser = usersRes.rows.find(u => u.role === 'sales_head');
    adminUser = usersRes.rows.find(u => u.role === 'admin');

    expect(estimatorUser).toBeDefined();
    expect(plantHeadUser).toBeDefined();
    expect(salesHeadUser).toBeDefined();
    expect(adminUser).toBeDefined();

    // Create a secondary estimator to test isolation
    const otherEstEmail = `other.estimator.${Date.now()}@forgequote.test`;
    const otherEstRes = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Other Estimator', $1, 'hashed', 'estimator') RETURNING id`,
      [otherEstEmail]
    );
    otherEstimatorUser = otherEstRes.rows[0];

    estimatorToken = jwt.sign({ sub: estimatorUser.id }, env.jwtSecret);
    otherEstimatorToken = jwt.sign({ sub: otherEstimatorUser.id }, env.jwtSecret);
    plantHeadToken = jwt.sign({ sub: plantHeadUser.id }, env.jwtSecret);
    salesHeadToken = jwt.sign({ sub: salesHeadUser.id }, env.jwtSecret);
    adminToken = jwt.sign({ sub: adminUser.id }, env.jwtSecret);

    const custRes = await query('SELECT id FROM customers LIMIT 1');
    customerId = custRes.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (testRfqId) {
        await query('DELETE FROM ai_reviews WHERE rfq_id = $1', [testRfqId]);
      }
      if (quotationId) {
        await query('DELETE FROM quotation_documents WHERE quotation_id = $1', [quotationId]);
        await query('DELETE FROM quotations WHERE id = $1', [quotationId]);
      }
      if (testPartId) {
        await query('DELETE FROM commercial_reviews WHERE costing_revision_id IN (SELECT id FROM costing_revisions WHERE rfq_part_id = $1)', [testPartId]);
        await query('DELETE FROM costing_operations WHERE costing_revision_id IN (SELECT id FROM costing_revisions WHERE rfq_part_id = $1)', [testPartId]);
        await query('DELETE FROM costing_revisions WHERE rfq_part_id = $1', [testPartId]);
      }
      if (testRfqId) {
        await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [testRfqId]);
        await query('DELETE FROM rfqs WHERE id = $1', [testRfqId]);
      }
      if (otherEstimatorUser) {
        await query('DELETE FROM users WHERE id = $1', [otherEstimatorUser.id]);
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // 1. RFQ Registration starts strictly in 'draft'
  it('1. Newly created RFQ starts strictly in "draft" status regardless of requested payload status', async () => {
    const rfqNumber = `GOV-RFQ-${Date.now()}`;
    const res = await request(app)
      .post('/api/rfqs')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        rfqNumber,
        customerId,
        assignedEstimatorId: estimatorUser.id,
        receivedDate: '2026-11-01',
        dueDate: '2026-11-20',
        status: 'ready_for_quote', // Malicious attempt to jump straight to ready_for_quote
        sourceNotes: 'Lifecycle governance test',
        part: {
          name: 'Precision Rotor Shaft',
          description: 'Turned alloy steel rotor component',
          material: 'Aluminium 6061',
          grossWeight: 4.5,
          annualVolume: 2000
        }
      });

    expect(res.status).toBe(201);
    testRfqId = res.body.data.id;
    expect(res.body.data.status).toBe('draft');

    const dbRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(dbRow.rows[0].status).toBe('draft');

    const partRes = await query('SELECT id FROM rfq_parts WHERE rfq_id = $1', [testRfqId]);
    testPartId = partRes.rows[0].id;
  });

  // 2. Estimator cannot manipulate status directly via PUT /api/rfqs/:id
  it('2. Estimator cannot directly manipulate status through RFQ update payload manipulation', async () => {
    const res = await request(app)
      .put(`/api/rfqs/${testRfqId}`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        rfqNumber: `GOV-RFQ-MOD-${Date.now()}`,
        customerId,
        assignedEstimatorId: estimatorUser.id,
        receivedDate: '2026-11-01',
        dueDate: '2026-11-20',
        status: 'quoted', // Malicious payload attempt to jump to quoted
        sourceNotes: 'Updated notes',
        part: {
          name: 'Precision Rotor Shaft',
          description: 'Updated description',
          material: 'Aluminium 6061',
          grossWeight: 4.5,
          annualVolume: 2000
        }
      });

    expect(res.status).toBe(200);
    // Status must remain 'draft'
    expect(res.body.data.status).toBe('draft');

    const dbRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(dbRow.rows[0].status).toBe('draft');
  });

  // 3. Saving a costing draft moves RFQ to 'in_progress'
  it('3. Saving a costing draft moves RFQ status from "draft" to "in_progress"', async () => {
    const draftRes = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        materialWeight: 4.5,
        operations: [
          { sequence: 1, operationName: 'CNC Turning', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: 12 },
          { sequence: 2, operationName: 'Induction Hardening', machineCode: 'MACHINE-HYDRAULIC-LIFT', cycleTimeMinutes: 6 }
        ]
      });

    expect(draftRes.status).toBe(201);
    revision1Id = draftRes.body.data.id;
    expect(draftRes.body.data.revision).toBe(1);
    expect(draftRes.body.data.status).toBe('draft');

    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('in_progress');
  });

  // 4. Repeated draft saves update revision in-place without creating redundant revision numbers
  it('4. Repeated draft saves update the draft revision in-place without incrementing revision number', async () => {
    const updateDraftRes = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        materialWeight: 4.5,
        operations: [
          { sequence: 1, operationName: 'CNC Turning & Facing', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: 14 }
        ]
      });

    expect(updateDraftRes.status).toBe(201);
    expect(updateDraftRes.body.data.id).toBe(revision1Id);
    expect(updateDraftRes.body.data.revision).toBe(1);

    const countRes = await query('SELECT count(*)::int AS count FROM costing_revisions WHERE rfq_part_id = $1', [testPartId]);
    expect(countRes.rows[0].count).toBe(1);
  });

  // 5. Unassigned estimator cannot modify another estimator's costing
  it('5. Unassigned estimator cannot save drafts on another estimator\'s RFQ', async () => {
    const unauthRes = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${otherEstimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        materialWeight: 4.5,
        operations: [{ sequence: 1, operationName: 'Turning', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: 10 }]
      });

    expect(unauthRes.status).toBe(403);
  });

  // 6. Submitting finalized costing locks revision, moves RFQ to 'pending_plant_review', and triggers AI pre-review
  it('6. Finalizing costing locks revision, moves RFQ to "pending_plant_review", and triggers AI pre-review', async () => {
    const submitRes = await request(app)
      .post(`/api/costing/${revision1Id}/submit`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('pending_review');

    // RFQ status is now 'pending_plant_review'
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('pending_plant_review');

    // AI Review record was created for routing pre-review
    const aiReviewRow = await query(
      `SELECT id, status, review_type FROM ai_reviews WHERE costing_revision_id = $1 AND review_type = 'routing_review'`,
      [revision1Id]
    );
    expect(aiReviewRow.rows.length).toBeGreaterThanOrEqual(1);
  });

  // 7. Estimator cannot modify locked costing after submission (immutability)
  it('7. Estimator cannot edit costing after submission (409 Conflict)', async () => {
    const editRes = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        materialWeight: 4.5,
        operations: [{ sequence: 1, operationName: 'Turning', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: 20 }]
      });

    expect(editRes.status).toBe(409);
  });

  // 8. Estimator cannot approve route or commercial reviews (RBAC)
  it('8. Estimator cannot approve Plant Head review or Sales Head review (403 Forbidden)', async () => {
    // Estimator attempts plant routing decision
    const fakePlantRes = await request(app)
      .post(`/api/routing-reviews/${revision1Id}/decision`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({ decision: 'approved', comment: 'Estimator rogue approval' });
    expect(fakePlantRes.status).toBe(403);

    // Estimator attempts rate master creation
    const fakeRateRes = await request(app)
      .post('/api/rate-masters')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({ code: 'ROGUE-RATE', name: 'Rogue Rate', category: 'machine_hour', unit: 'INR/hour' });
    expect(fakeRateRes.status).toBe(403);
  });

  // 9. Plant Head returning for revision requires a mandatory comment and sets 'returned_for_revision'
  it('9. Plant Head returning for revision requires explanation and transitions RFQ to "returned_for_revision"', async () => {
    const queueRes = await request(app)
      .get('/api/routing-reviews?status=pending_review')
      .set('Cookie', `forgequote_token=${plantHeadToken}`);
    const queueItem = queueRes.body.data.find(r => r.id === revision1Id);
    expect(queueItem).toBeDefined();

    // Rejection without comment should be rejected (400)
    const rejectNoComment = await request(app)
      .post(`/api/routing-reviews/${revision1Id}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({ decision: 'changes_requested', comment: '   ', rowVersion: queueItem.row_version });
    expect(rejectNoComment.status).toBe(400);

    // Valid return with mandatory comment
    const validReturnRes = await request(app)
      .post(`/api/routing-reviews/${revision1Id}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        decision: 'changes_requested',
        comment: 'Cycle time for turning is underestimated; increase to 18 minutes for roughing pass.',
        rowVersion: queueItem.row_version
      });

    expect(validReturnRes.status).toBe(200);
    expect(validReturnRes.body.data.status).toBe('changes_requested');

    // RFQ status transitioned to 'returned_for_revision'
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('returned_for_revision');
  });

  // 10. Estimator creates Revision 2 after valid return (Revision 1 remains preserved and immutable)
  it('10. Estimator creates Revision 2 after return; Revision 1 remains preserved and immutable', async () => {
    const rev2Res = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        materialWeight: 4.5,
        operations: [
          { sequence: 1, operationName: 'CNC Turning Rough + Finish', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: 18 }
        ]
      });

    expect(rev2Res.status).toBe(201);
    revision2Id = rev2Res.body.data.id;
    expect(rev2Res.body.data.revision).toBe(2);
    expect(rev2Res.body.data.status).toBe('draft');

    // RFQ status transitioned back to 'in_progress'
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('in_progress');

    // Revision 1 remains unchanged in database
    const rev1Db = await query('SELECT revision, status, review_comment FROM costing_revisions WHERE id = $1', [revision1Id]);
    expect(rev1Db.rows[0].revision).toBe(1);
    expect(rev1Db.rows[0].status).toBe('changes_requested');
    expect(rev1Db.rows[0].review_comment).toContain('underestimated');
  });

  // 11. Estimator submits Revision 2 -> Plant Head approves -> RFQ transitions to 'pending_sales_approval'
  it('11. Estimator submits Revision 2 and Plant Head approves -> RFQ transitions to "pending_sales_approval"', async () => {
    // Estimator submits revision 2
    const submitRev2 = await request(app)
      .post(`/api/costing/${revision2Id}/submit`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);
    expect(submitRev2.status).toBe(200);

    const rfqPendingPlant = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqPendingPlant.rows[0].status).toBe('pending_plant_review');

    // Plant Head retrieves queue
    const queueRes = await request(app)
      .get('/api/routing-reviews?status=pending_review')
      .set('Cookie', `forgequote_token=${plantHeadToken}`);
    const item = queueRes.body.data.find(r => r.id === revision2Id);
    expect(item).toBeDefined();

    // Plant Head approves route
    const plantApproveRes = await request(app)
      .post(`/api/routing-reviews/${revision2Id}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Updated 18 min cycle time approved.',
        rowVersion: item.row_version
      });

    expect(plantApproveRes.status).toBe(200);
    expect(plantApproveRes.body.data.status).toBe('approved');

    // Authoritative lifecycle check: RFQ MUST BE 'pending_sales_approval', NOT 'ready_for_quote'
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('pending_sales_approval');

    const commRes = await query('SELECT id, status, row_version FROM commercial_reviews WHERE costing_revision_id = $1', [revision2Id]);
    expect(commRes.rows.length).toBe(1);
    expect(commRes.rows[0].status).toBe('pending');
    commercialReviewId = commRes.rows[0].id;
  });

  // 12. Sales Head approves commercial review -> RFQ transitions to 'ready_for_quote' (NOT 'quoted')
  it('12. Sales Head approves commercial review -> RFQ transitions to "ready_for_quote" (NOT "quoted")', async () => {
    const commReviewDb = await query('SELECT id, row_version FROM commercial_reviews WHERE id = $1', [commercialReviewId]);

    const salesApproveRes = await request(app)
      .post(`/api/commercial-reviews/${commercialReviewId}/decision`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Target commercial margin of 18% confirmed.',
        rowVersion: commReviewDb.rows[0].row_version
      });

    expect(salesApproveRes.status).toBe(200);
    quotationId = salesApproveRes.body.data.quotation?.id;
    expect(quotationId).toBeDefined();

    // Quotation is approved (unissued)
    const quotDb = await query('SELECT status, issued_at FROM quotations WHERE id = $1', [quotationId]);
    expect(quotDb.rows[0].status).toBe('approved');
    expect(quotDb.rows[0].issued_at).toBeNull();

    // RFQ is ready_for_quote, NOT quoted
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('ready_for_quote');
  });

  // 13. Ready for Quote transitions to 'quoted' ONLY after explicit quotation issuance
  it('13. RFQ transitions to "quoted" ONLY after explicit quotation issuance via POST /api/quotations/:id/issue', async () => {
    const issueRes = await request(app)
      .post(`/api/quotations/${quotationId}/issue`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`);

    expect(issueRes.status).toBe(200);
    expect(issueRes.body.data.status).toBe('issued');
    expect(issueRes.body.data.issued_at).toBeDefined();

    // RFQ is now authoritative 'quoted'
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqRow.rows[0].status).toBe('quoted');
  });

  // 14. RFQ Register list query includes accurate columns and role-aware owner
  it('14. RFQ Register list endpoint returns authoritative columns, costing revision, and owner', async () => {
    const listRes = await request(app)
      .get('/api/rfqs?search=Precision%20Rotor%20Shaft')
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(listRes.status).toBe(200);
    const row = listRes.body.data.find(r => r.id === testRfqId);
    expect(row).toBeDefined();
    expect(row.status).toBe('quoted');
    expect(row.costing_revision).toBe(2);
    expect(row.customer_name).toBeDefined();
    expect(row.part_name).toBe('Precision Rotor Shaft');
    expect(row.current_owner).toBe('Sales Team');
  });
});
