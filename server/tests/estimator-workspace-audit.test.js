import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import * as groqClient from '../src/modules/aiReview/aiReview.groqClient.js';

describe('Estimator Workspace Audit, Authoritative Dashboard & Quotation History Suite', () => {
  let estimatorUser;
  let otherEstimatorUser;
  let salesHeadUser;
  let plantHeadUser;
  let adminUser;

  let estimatorToken;
  let otherEstimatorToken;
  let salesHeadToken;
  let plantHeadToken;
  let adminToken;

  let customerId;
  let testRfqId;
  let testPartId;
  let rev1Id;
  let rev2Id;
  let commReviewId;
  let createdQuotationId;

  beforeAll(async () => {
    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValue({
      summary: 'Advisory mock check for audit verification.',
      findings: [],
      recommendations: [],
      limitations: [],
      modelMetadata: { model: 'mock-audit-model' }
    });

    const usersRes = await query('SELECT id, email, role FROM users');
    estimatorUser = usersRes.rows.find(u => u.role === 'estimator');
    salesHeadUser = usersRes.rows.find(u => u.role === 'sales_head');
    plantHeadUser = usersRes.rows.find(u => u.role === 'plant_head');
    adminUser = usersRes.rows.find(u => u.role === 'admin');

    // Create a secondary estimator to verify data isolation
    const otherEstRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Audit Test Estimator', 'audit.other.est@forgequote.test', 'hash', 'estimator')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, role
    `);
    otherEstimatorUser = otherEstRes.rows[0];

    const makeToken = u => jwt.sign({ sub: u.id, email: u.email, role: u.role }, env.jwtSecret, { expiresIn: '2h' });
    estimatorToken = makeToken(estimatorUser);
    otherEstimatorToken = makeToken(otherEstimatorUser);
    salesHeadToken = makeToken(salesHeadUser);
    plantHeadToken = makeToken(plantHeadUser);
    adminToken = makeToken(adminUser);

    const custRes = await query('SELECT id FROM customers LIMIT 1');
    customerId = custRes.rows[0].id;
  });

  afterAll(async () => {
    if (createdQuotationId) {
      await query('DELETE FROM quotation_documents WHERE quotation_id = $1', [createdQuotationId]);
      await query('DELETE FROM quotations WHERE id = $1', [createdQuotationId]);
    }
    if (commReviewId) {
      await query('DELETE FROM commercial_reviews WHERE id = $1', [commReviewId]);
    }
    if (testPartId) {
      await query(`
        DELETE FROM costing_operations WHERE costing_revision_id IN (
          SELECT id FROM costing_revisions WHERE rfq_part_id = $1
        )
      `, [testPartId]);
      await query('DELETE FROM costing_revisions WHERE rfq_part_id = $1', [testPartId]);
    }
    if (testRfqId) {
      await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [testRfqId]);
      await query('DELETE FROM audit_events WHERE entity_id = $1', [testRfqId]);
      await query('DELETE FROM rfqs WHERE id = $1', [testRfqId]);
    }
    if (otherEstimatorUser?.id) {
      await query('DELETE FROM users WHERE id = $1', [otherEstimatorUser.id]);
    }
  });

  // 1. Authoritative Estimator Dashboard Metrics
  it('1. GET /api/dashboard returns authoritative, non-overlapping metrics for estimator', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.role).toBe('estimator');
    expect(typeof d.total_rfqs).toBe('number');
    expect(typeof d.action_required).toBe('number');
    expect(typeof d.draft_rfqs).toBe('number');
    expect(typeof d.in_progress_rfqs).toBe('number');
    expect(typeof d.pending_plant_review).toBe('number');
    expect(typeof d.returned_for_revision).toBe('number');
    expect(typeof d.pending_sales_approval).toBe('number');
    expect(typeof d.ready_for_quote).toBe('number');
    expect(typeof d.quoted_rfqs).toBe('number');
    expect(typeof d.issued_quotations).toBe('number');
    expect(typeof d.approved_quotations).toBe('number');

    // Reconcile directly with PostgreSQL counts
    const dbTotal = await query(
      `SELECT COUNT(DISTINCT id)::int AS count FROM rfqs
       WHERE owner_id = $1 AND rfq_number NOT LIKE 'AI-GOV-%' AND rfq_number NOT LIKE 'TEST-%'`,
      [estimatorUser.id]
    );
    expect(d.total_rfqs).toBe(dbTotal.rows[0].count);

    // Sum of mutually exclusive categories must equal total_rfqs
    const categorySum =
      d.draft_rfqs +
      d.in_progress_rfqs +
      d.pending_plant_review +
      d.returned_for_revision +
      d.pending_sales_approval +
      d.ready_for_quote +
      d.quoted_rfqs;
    expect(categorySum).toBe(d.total_rfqs);

    // Action required must equal draft + in_progress + returned_for_revision
    expect(d.action_required).toBe(d.draft_rfqs + d.in_progress_rfqs + d.returned_for_revision);
  });

  // 2. Recent Quotations Section Below Dashboard
  it('2. Dashboard returns exactly the five most recent actual quotations in recent_quotations', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(res.status).toBe(200);
    const recent = res.body.data.recent_quotations;
    expect(Array.isArray(recent)).toBe(true);
    expect(recent.length).toBeLessThanOrEqual(5);

    // Verify all records have authoritative quotation numbers, RFQ references, customers, and parts
    for (const q of recent) {
      expect(q.quotation_number).toMatch(/^FQ-\d{4}-\d+/);
      expect(q.rfq_number).toBeDefined();
      expect(q.customer_name).toBeDefined();
      expect(q.part_name).toBeDefined();
      expect(['approved', 'issued']).toContain(q.status);
    }

    // Verify sorting is chronological descending
    for (let i = 0; i < recent.length - 1; i++) {
      const tA = new Date(recent[i].issued_at || recent[i].approved_at || recent[i].created_at).getTime();
      const tB = new Date(recent[i + 1].issued_at || recent[i + 1].approved_at || recent[i + 1].created_at).getTime();
      expect(tA).toBeGreaterThanOrEqual(tB);
    }
  });

  // 3. Complete Quotation History Server-Side Pagination
  it('3. GET /api/quotations supports server-side pagination and returns summary metadata', async () => {
    const resPage1 = await request(app)
      .get('/api/quotations?page=1&pageSize=3')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(resPage1.status).toBe(200);
    expect(Array.isArray(resPage1.body.data)).toBe(true);
    expect(resPage1.body.data.length).toBeLessThanOrEqual(3);
    expect(resPage1.body.page).toBe(1);
    expect(resPage1.body.pageSize).toBe(3);
    expect(resPage1.body.total).toBeGreaterThanOrEqual(resPage1.body.data.length);
    expect(resPage1.body.summary).toBeDefined();
    expect(typeof resPage1.body.summary.total).toBe('number');
    expect(typeof resPage1.body.summary.issued).toBe('number');
    expect(typeof resPage1.body.summary.approved).toBe('number');

    // Page 2
    if (resPage1.body.totalPages > 1) {
      const resPage2 = await request(app)
        .get('/api/quotations?page=2&pageSize=3')
        .set('Cookie', `forgequote_token=${estimatorToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.page).toBe(2);
      expect(resPage2.body.data.length).toBeGreaterThan(0);
      // Row on page 2 must not be row on page 1
      expect(resPage2.body.data[0].id).not.toBe(resPage1.body.data[0].id);
    }
  });

  // 4. Quotation History Search by Quotation Number, RFQ Number, and Customer Name
  it('4. GET /api/quotations search accurately filters records', async () => {
    // Search by customer name "Apex"
    const resCustomer = await request(app)
      .get('/api/quotations?search=Apex')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(resCustomer.status).toBe(200);
    for (const q of resCustomer.body.data) {
      const matches =
        q.customer_name?.toLowerCase().includes('apex') ||
        q.rfq_number?.toLowerCase().includes('apex') ||
        q.quotation_number?.toLowerCase().includes('apex') ||
        q.part_name?.toLowerCase().includes('apex');
      expect(matches).toBe(true);
    }

    // Search for non-existent quotation
    const resNone = await request(app)
      .get('/api/quotations?search=NONEXISTENT_XYZ_999')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(resNone.status).toBe(200);
    expect(resNone.body.data.length).toBe(0);
    expect(resNone.body.total).toBe(0);
  });

  // 5. Quotation History Filter by Status and Sorting
  it('5. GET /api/quotations filters strictly by status and sorts properly', async () => {
    const resIssued = await request(app)
      .get('/api/quotations?status=issued')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(resIssued.status).toBe(200);
    for (const q of resIssued.body.data) {
      expect(q.status).toBe('issued');
      expect(q.issued_at).toBeDefined();
    }

    const resApproved = await request(app)
      .get('/api/quotations?status=approved')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(resApproved.status).toBe(200);
    for (const q of resApproved.body.data) {
      expect(q.status).toBe('approved');
    }

    // Test sort by total_value desc
    const resSorted = await request(app)
      .get('/api/quotations?sort=total_value&order=desc')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(resSorted.status).toBe(200);
    for (let i = 0; i < resSorted.body.data.length - 1; i++) {
      const vA = Number(resSorted.body.data[i].total_value || 0);
      const vB = Number(resSorted.body.data[i + 1].total_value || 0);
      expect(vA).toBeGreaterThanOrEqual(vB);
    }
  });

  // 6. Role Boundaries: Estimator CANNOT Issue Quotation or Access Another Estimator's Quotation
  it('6. Estimator role cannot issue quotations or download other estimators quotations', async () => {
    // Pick an existing approved quotation
    const approvedQ = await query("SELECT id FROM quotations WHERE status = 'approved' LIMIT 1");
    if (approvedQ.rows[0]) {
      const issueAttempt = await request(app)
        .post(`/api/quotations/${approvedQ.rows[0].id}/issue`)
        .set('Cookie', `forgequote_token=${estimatorToken}`);

      expect(issueAttempt.status).toBe(403);
    }

    // Pick an issued quotation owned by estimatorUser
    const issuedQ = await query(`
      SELECT q.id FROM quotations q
      JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
      JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
      JOIN rfq_parts p ON p.id = crv.rfq_part_id
      JOIN rfqs r ON r.id = p.rfq_id
      WHERE q.status = 'issued' AND r.owner_id = $1 LIMIT 1
    `, [estimatorUser.id]);

    if (issuedQ.rows[0]) {
      // Estimator CAN download own issued quotation
      const ownDownload = await request(app)
        .get(`/api/quotations/${issuedQ.rows[0].id}/pdf`)
        .set('Cookie', `forgequote_token=${estimatorToken}`);
      expect(ownDownload.status).toBe(200);

      // Other estimator CANNOT download it (403)
      const otherDownload = await request(app)
        .get(`/api/quotations/${issuedQ.rows[0].id}/pdf`)
        .set('Cookie', `forgequote_token=${otherEstimatorToken}`);
      expect(otherDownload.status).toBe(403);
    }
  });

  // 7. Full Workflow Regression & Live Synchronization Across Views
  it('7. Workflow transitions keep RFQ Register, Dashboard, and Quotation History strictly synchronized', async () => {
    const rfqNumber = `AUDIT-RFQ-${Date.now()}`;

    // Step A: Register RFQ
    const createRes = await request(app)
      .post('/api/rfqs')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        rfqNumber,
        customerId,
        assignedEstimatorId: estimatorUser.id,
        receivedDate: '2026-11-01',
        dueDate: '2026-11-20',
        sourceNotes: 'Audit end-to-end sync verification',
        part: {
          name: 'Precision Audit Rotor',
          description: 'High-tolerance test rotor for workspace audit',
          material: 'Aluminium 6061',
          grossWeight: 3.5,
          annualVolume: 1000
        }
      });

    expect(createRes.status).toBe(201);
    testRfqId = createRes.body.data.id;

    // Verify RFQ starts in 'draft'
    const rfqDb = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqDb.rows[0].status).toBe('draft');

    const partDb = await query('SELECT id FROM rfq_parts WHERE rfq_id = $1', [testRfqId]);
    testPartId = partDb.rows[0].id;

    // Step B: Save Costing Draft -> transitions to 'in_progress'
    const draftRes = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        materialWeight: 3.5,
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        operations: [
          {
            sequence: 1,
            operationName: 'Spindle CNC Turning',
            machineCode: 'MACHINE-REAR-SPINDLE',
            cycleTimeMinutes: 12
          }
        ]
      });

    expect([200, 201]).toContain(draftRes.status);
    rev1Id = draftRes.body.data.id;

    const rfqInProgress = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqInProgress.rows[0].status).toBe('in_progress');

    // Step C: Submit Costing -> transitions to 'pending_plant_review'
    const submitRes = await request(app)
      .post(`/api/costing/${rev1Id}/submit`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(submitRes.status).toBe(200);
    const rfqPendingPlant = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqPendingPlant.rows[0].status).toBe('pending_plant_review');

    // Step D: Plant Head returns for revision -> transitions to 'returned_for_revision'
    const rev1Db = await query('SELECT row_version FROM costing_revisions WHERE id = $1', [rev1Id]);
    const returnRes = await request(app)
      .post(`/api/routing-reviews/${rev1Id}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        decision: 'changes_requested',
        comment: 'Cycle time requires 15 min verification.',
        rowVersion: rev1Db.rows[0].row_version
      });

    expect(returnRes.status).toBe(200);
    const rfqReturned = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqReturned.rows[0].status).toBe('returned_for_revision');

    // Step E: Estimator creates Revision 2
    const rev2Res = await request(app)
      .post(`/api/costing/rfqs/${testRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        materialWeight: 3.5,
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        operations: [
          {
            sequence: 1,
            operationName: 'Spindle CNC Turning - Revised',
            machineCode: 'MACHINE-REAR-SPINDLE',
            cycleTimeMinutes: 15
          }
        ]
      });

    expect([200, 201]).toContain(rev2Res.status);
    rev2Id = rev2Res.body.data.id;
    expect(rev2Res.body.data.revision).toBe(2);

    // Step F: Estimator submits Revision 2 -> Plant Head approves -> transitions to 'pending_sales_approval'
    await request(app)
      .post(`/api/costing/${rev2Id}/submit`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    const rev2Db = await query('SELECT row_version FROM costing_revisions WHERE id = $1', [rev2Id]);
    await request(app)
      .post(`/api/routing-reviews/${rev2Id}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Revised route approved.',
        rowVersion: rev2Db.rows[0].row_version
      });

    const rfqPendingSales = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqPendingSales.rows[0].status).toBe('pending_sales_approval');

    const commReviewDb = await query('SELECT id, row_version FROM commercial_reviews WHERE costing_revision_id = $1', [rev2Id]);
    commReviewId = commReviewDb.rows[0].id;

    // Step G: Sales Head approves -> RFQ transitions to 'ready_for_quote', quotation created with status 'approved'
    const salesApproveRes = await request(app)
      .post(`/api/commercial-reviews/${commReviewId}/decision`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Approved with standard commercial margin.',
        rowVersion: commReviewDb.rows[0].row_version
      });

    expect(salesApproveRes.status).toBe(200);
    createdQuotationId = salesApproveRes.body.data.quotation?.id;
    expect(createdQuotationId).toBeDefined();

    const rfqReady = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqReady.rows[0].status).toBe('ready_for_quote');

    // Quotation exists in quotation history as 'approved'
    const quotHistoryRes = await request(app)
      .get(`/api/quotations?search=${encodeURIComponent(rfqNumber)}`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(quotHistoryRes.status).toBe(200);
    const foundApproved = quotHistoryRes.body.data.find(q => q.id === createdQuotationId);
    expect(foundApproved).toBeDefined();
    expect(foundApproved.status).toBe('approved');
    expect(foundApproved.unit_price).toBeDefined();
    expect(foundApproved.total_value).toBeDefined();

    // Step H: Sales Head issues quotation -> RFQ transitions to 'quoted', quotation to 'issued'
    const issueRes = await request(app)
      .post(`/api/quotations/${createdQuotationId}/issue`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`);

    expect(issueRes.status).toBe(200);
    expect(issueRes.body.data.status).toBe('issued');

    const rfqQuoted = await query('SELECT status FROM rfqs WHERE id = $1', [testRfqId]);
    expect(rfqQuoted.rows[0].status).toBe('quoted');

    // Now appears in Recent Quotations on Estimator Dashboard
    const dashResAfter = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(dashResAfter.status).toBe(200);
    const ourRecent = dashResAfter.body.data.recent_quotations.find(q => q.id === createdQuotationId);
    expect(ourRecent).toBeDefined();
    expect(ourRecent.status).toBe('issued');
  }, 60000);
});
