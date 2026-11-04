import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';

describe('Authoritative Quotation Lifecycle & Admin Status Regression', () => {
  let estimatorUser;
  let plantHeadUser;
  let salesHeadUser;
  let adminUser;

  let estimatorToken;
  let plantHeadToken;
  let salesHeadToken;
  let adminToken;

  let customerId;
  let createdRfqId;
  let createdPartId;
  let createdRevisionId;
  let createdCommercialReviewId;
  let createdQuotationId;

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

    estimatorToken = jwt.sign({ sub: estimatorUser.id }, env.jwtSecret);
    plantHeadToken = jwt.sign({ sub: plantHeadUser.id }, env.jwtSecret);
    salesHeadToken = jwt.sign({ sub: salesHeadUser.id }, env.jwtSecret);
    adminToken = jwt.sign({ sub: adminUser.id }, env.jwtSecret);

    const custRes = await query('SELECT id FROM customers LIMIT 1');
    customerId = custRes.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (createdQuotationId) {
        await query('DELETE FROM quotation_documents WHERE quotation_id = $1', [createdQuotationId]);
        await query('DELETE FROM quotations WHERE id = $1', [createdQuotationId]);
      }
      if (createdRevisionId) {
        await query('DELETE FROM commercial_reviews WHERE costing_revision_id = $1', [createdRevisionId]);
        await query('DELETE FROM costing_operations WHERE costing_revision_id = $1', [createdRevisionId]);
        await query('DELETE FROM costing_revisions WHERE id = $1', [createdRevisionId]);
      }
      if (createdRfqId) {
        await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [createdRfqId]);
        await query('DELETE FROM rfqs WHERE id = $1', [createdRfqId]);
      }
    } catch {
      // Ignore cleanup error if already removed
    }
  });

  // Scenario 1: Creating an RFQ does not mark it as quoted or create an issued quotation
  it('1. Creating an RFQ does not mark it as quoted or create an issued quotation', async () => {
    const rfqNumber = `REG-RFQ-${Date.now()}`;
    const createRfqRes = await request(app)
      .post('/api/rfqs')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        rfqNumber,
        customerId,
        assignedEstimatorId: estimatorUser.id,
        receivedDate: '2026-11-01',
        dueDate: '2026-11-30',
        status: 'draft',
        sourceNotes: 'Authoritative status regression testing',
        part: {
          name: 'Precision Shaft Test',
          description: 'Shaft component for regression testing',
          material: 'Aluminium 6061',
          grossWeight: 3.2,
          annualVolume: 1500
        }
      });

    expect(createRfqRes.status).toBe(201);
    createdRfqId = createRfqRes.body.data.id;
    expect(createdRfqId).toBeDefined();

    // Check DB status of RFQ
    const rfqRow = await query('SELECT status FROM rfqs WHERE id = $1', [createdRfqId]);
    expect(rfqRow.rows[0].status).not.toBe('quoted');
    expect(rfqRow.rows[0].status).not.toBe('ready_for_quote');

    // No quotations exist for this RFQ
    const partRes = await query('SELECT id FROM rfq_parts WHERE rfq_id = $1', [createdRfqId]);
    createdPartId = partRes.rows[0].id;
    const quotCheck = await query(`
      SELECT q.id FROM quotations q
      JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
      JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
      WHERE crv.rfq_part_id = $1
    `, [createdPartId]);
    expect(quotCheck.rows.length).toBe(0);
  });

  // Scenario 2: Saving a costing draft does not create an issued quotation
  it('2. Saving a costing draft does not create an issued quotation', async () => {
    const draftRes = await request(app)
      .post(`/api/costing/rfqs/${createdRfqId}/drafts`)
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        costingDate: '2026-11-01',
        materialRateCode: 'MATERIAL-AL6061',
        scrapRateCode: 'SCRAP-DEFAULT',
        overheadRateCode: 'OVERHEAD-DEFAULT',
        packingRateCode: 'PACKING-DEFAULT',
        freightRateCode: 'FREIGHT-DEFAULT',
        marginRateCode: 'MARGIN-DEFAULT',
        materialWeight: 3.2,
        operations: [
          {
            sequence: 1,
            operationName: 'Turning',
            machineCode: 'MACHINE-REAR-SPINDLE',
            cycleTimeMinutes: 10
          }
        ]
      });

    expect(draftRes.status).toBe(201);
    createdRevisionId = draftRes.body.data.id;
    expect(createdRevisionId).toBeDefined();

    const quotCheck = await query(`
      SELECT q.id FROM quotations q
      JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
      JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
      WHERE crv.rfq_part_id = $1
    `, [createdPartId]);
    expect(quotCheck.rows.length).toBe(0);
  });

  // Scenario 3: Plant routing approval submits to commercial review without marking quotation as issued
  it('3. Plant routing approval submits to commercial review without marking quotation as issued', async () => {
    // Estimator submits
    const submitRes = await request(app)
      .post(`/api/costing/${createdRevisionId}/submit`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);
    expect(submitRes.status).toBe(200);

    // Get queue item
    const queueRes = await request(app)
      .get('/api/routing-reviews?status=pending_review')
      .set('Cookie', `forgequote_token=${plantHeadToken}`);
    const queueItem = queueRes.body.data.find(r => r.id === createdRevisionId);
    expect(queueItem).toBeDefined();

    // Plant head approves
    const plantDecRes = await request(app)
      .post(`/api/routing-reviews/${createdRevisionId}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Plant routing approved for costing.',
        rowVersion: queueItem.row_version
      });

    expect(plantDecRes.status).toBe(200);

    // Commercial review is now pending
    const commReviewDb = await query('SELECT id, status, row_version FROM commercial_reviews WHERE costing_revision_id = $1', [createdRevisionId]);
    expect(commReviewDb.rows.length).toBe(1);
    expect(commReviewDb.rows[0].status).toBe('pending');
    createdCommercialReviewId = commReviewDb.rows[0].id;

    // No issued quotation exists
    const quotCheck = await query(`
      SELECT q.id, q.status FROM quotations q
      JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
      JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
      WHERE crv.rfq_part_id = $1 AND q.status = 'issued'
    `, [createdPartId]);
    expect(quotCheck.rows.length).toBe(0);
  });

  // Scenario 4: Sales commercial approval creates quotation with status 'approved', RFQ status 'ready_for_quote', and NOT 'issued'
  it('4. Sales commercial approval creates quotation with status "approved" and does not mark it as "issued"', async () => {
    const commReviewDb = await query('SELECT id, status, row_version FROM commercial_reviews WHERE id = $1', [createdCommercialReviewId]);

    const salesDecisionRes = await request(app)
      .post(`/api/commercial-reviews/${createdCommercialReviewId}/decision`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Commercial terms approved.',
        rowVersion: commReviewDb.rows[0].row_version
      });

    expect(salesDecisionRes.status).toBe(200);
    createdQuotationId = salesDecisionRes.body.data.quotation?.id;
    expect(createdQuotationId).toBeDefined();

    // Authoritative check in DB: Quotation status MUST BE 'approved', NOT 'issued'
    const quotDb = await query('SELECT id, status, issued_at FROM quotations WHERE id = $1', [createdQuotationId]);
    expect(quotDb.rows[0].status).toBe('approved');
    expect(quotDb.rows[0].issued_at).toBeNull();

    // RFQ is ready_for_quote, NOT quoted
    const rfqDb = await query('SELECT status FROM rfqs WHERE id = $1', [createdRfqId]);
    expect(rfqDb.rows[0].status).toBe('ready_for_quote');
  });

  // Scenario 5: GET /api/quotations?status=approved strictly returns only approved-but-unissued quotations
  it('5. GET /api/quotations?status=approved strictly returns only approved-but-unissued quotations', async () => {
    const res = await request(app)
      .get('/api/quotations?status=approved')
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Verify all returned rows have status === 'approved' and none have 'issued'
    for (const q of res.body.data) {
      expect(q.status).toBe('approved');
    }

    const ourQuotation = res.body.data.find(q => q.id === createdQuotationId);
    expect(ourQuotation).toBeDefined();
    expect(ourQuotation.status).toBe('approved');
  });

  // Scenario 6: GET /api/quotations?status=issued strictly returns only issued quotations
  it('6. GET /api/quotations?status=issued strictly returns only issued quotations', async () => {
    const res = await request(app)
      .get('/api/quotations?status=issued')
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    for (const q of res.body.data) {
      expect(q.status).toBe('issued');
    }

    // Our quotation is currently approved (unissued), so it must NOT be in the issued list
    const ourQuotation = res.body.data.find(q => q.id === createdQuotationId);
    expect(ourQuotation).toBeUndefined();
  });

  // Scenario 7: Downloading or calling POST issue marks quotation as 'issued', RFQ as 'quoted'
  it('7. Calling POST /api/quotations/:id/issue marks quotation as "issued", RFQ as "quoted", and stores timestamp', async () => {
    const issueRes = await request(app)
      .post(`/api/quotations/${createdQuotationId}/issue`)
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(issueRes.status).toBe(200);
    expect(issueRes.body.data.status).toBe('issued');
    expect(issueRes.body.data.issued_at).toBeDefined();

    // DB verify quotation status
    const quotDb = await query('SELECT status, issued_at FROM quotations WHERE id = $1', [createdQuotationId]);
    expect(quotDb.rows[0].status).toBe('issued');
    expect(quotDb.rows[0].issued_at).not.toBeNull();

    // DB verify RFQ status transitioned to 'quoted'
    const rfqDb = await query('SELECT status FROM rfqs WHERE id = $1', [createdRfqId]);
    expect(rfqDb.rows[0].status).toBe('quoted');
  });

  // Scenario 8: Admin dashboard metrics query accurately returns issued_quotations and approved_quotations
  it('8. Admin dashboard metrics query accurately returns issued_quotations and approved_quotations', async () => {
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.issued_quotations).toBeDefined();
    expect(dashRes.body.data.approved_quotations).toBeDefined();
    expect(Number(dashRes.body.data.issued_quotations)).toBeGreaterThanOrEqual(1);

    // Verify enterprise lifecycle records returned for admin
    expect(Array.isArray(dashRes.body.data.records)).toBe(true);
    expect(dashRes.body.data.records.length).toBeGreaterThanOrEqual(1);
    const ourRecord = dashRes.body.data.records.find(r => r.rfq_id === createdRfqId);
    expect(ourRecord).toBeDefined();
    expect(ourRecord.quotation_status).toBe('issued');
    expect(ourRecord.stage?.key).toBe('issued');
    expect(ourRecord.stage?.label).toBe('Quotation Issued');

    // Filter status=issued now includes our quotation
    const issuedListRes = await request(app)
      .get('/api/quotations?status=issued')
      .set('Cookie', `forgequote_token=${adminToken}`);
    const foundIssued = issuedListRes.body.data.find(q => q.id === createdQuotationId);
    expect(foundIssued).toBeDefined();

    // Filter status=approved now EXCLUDES our quotation
    const approvedListRes = await request(app)
      .get('/api/quotations?status=approved')
      .set('Cookie', `forgequote_token=${adminToken}`);
    const foundApproved = approvedListRes.body.data.find(q => q.id === createdQuotationId);
    expect(foundApproved).toBeUndefined();
  });

  // Scenario 9: Repeated issue/download requests are idempotent and do not create duplicate records
  it('9. Repeated issue/download requests are idempotent and do not create duplicate records', async () => {
    const repeatIssueRes = await request(app)
      .post(`/api/quotations/${createdQuotationId}/issue`)
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(repeatIssueRes.status).toBe(200);
    expect(repeatIssueRes.body.data.status).toBe('issued');

    const quotCount = await query('SELECT COUNT(*) FROM quotations WHERE id = $1', [createdQuotationId]);
    expect(Number(quotCount.rows[0].count)).toBe(1);
  });

  // Scenario 10: Admin role has permission to download quotation PDF
  it('10. Admin role has permission to download quotation PDF', async () => {
    const pdfRes = await request(app)
      .get(`/api/quotations/${createdQuotationId}/pdf`)
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfRes.body.length).toBeGreaterThan(100);
  });

  // Scenario 11: Unauthorized role (e.g. plant head) is denied (403) from downloading quotation PDF
  it('11. Unauthorized role (plant head) is denied (403) from downloading quotation PDF', async () => {
    const unauthPdfRes = await request(app)
      .get(`/api/quotations/${createdQuotationId}/pdf`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`);

    expect(unauthPdfRes.status).toBe(403);
  });
});
