import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool, query } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import * as groqClient from '../src/modules/aiReview/aiReview.groqClient.js';

describe('Workflow-Based AI Access Control & Token Optimization Suite', () => {
  let estimatorUser;
  let plantHeadUser;
  let salesHeadUser;
  let adminUser;

  let estimatorToken;
  let plantHeadToken;
  let salesHeadToken;
  let adminToken;

  let testRfqId;
  let testPartId;
  let testRevisionId;
  let testCommercialReviewId;

  let groqSpy;

  beforeEach(async () => {
    // Spying on groqClient.callGroqReview to count invocations and monitor tokens
    groqSpy = vi.spyOn(groqClient, 'callGroqReview').mockResolvedValue({
      summary: 'Mocked Groq analysis completed safely with strict token controls.',
      findings: [
        {
          code: 'AI_OPTIMIZATION_VERIFIED',
          severity: 'info',
          title: 'Verification Observation',
          message: 'Target is within its active workflow lifecycle stage.',
          evidence: 'test-evidence',
          recommendation: 'Proceed with authorized manufacturing workflow.'
        }
      ],
      recommendations: ['Maintain workflow gates.'],
      limitations: ['Mock response for token optimization verification.'],
      modelMetadata: { model: 'mock-llama-70b', totalTokens: 420 }
    });

    const usersRes = await query('SELECT id, email, role FROM users');
    estimatorUser = usersRes.rows.find(u => u.role === 'estimator');
    plantHeadUser = usersRes.rows.find(u => u.role === 'plant_head');
    salesHeadUser = usersRes.rows.find(u => u.role === 'sales_head');
    adminUser = usersRes.rows.find(u => u.role === 'admin');

    estimatorToken = jwt.sign({ sub: estimatorUser.id }, env.jwtSecret);
    plantHeadToken = jwt.sign({ sub: plantHeadUser.id }, env.jwtSecret);
    salesHeadToken = jwt.sign({ sub: salesHeadUser.id }, env.jwtSecret);
    adminToken = jwt.sign({ sub: adminUser.id }, env.jwtSecret);

    const custRes = await query('SELECT id FROM customers LIMIT 1');
    const customerId = custRes.rows[0].id;

    const rfqRes = await query(
      `INSERT INTO rfqs (rfq_number, customer_id, owner_id, received_date, due_date, status)
       VALUES ($1, $2, $3, '2026-11-01', '2026-11-20', 'in_progress')
       RETURNING id`,
      [`AI-GOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, customerId, estimatorUser.id]
    );
    testRfqId = rfqRes.rows[0].id;

    const partRes = await query(
      `INSERT INTO rfq_parts (rfq_id, name, description, material, gross_weight, annual_volume)
       VALUES ($1, 'Spindle Arm', 'Precision machined arm', 'Aluminium 6061', 4.0, 3000)
       RETURNING id`,
      [testRfqId]
    );
    testPartId = partRes.rows[0].id;

    const rateRes = await query(
      `SELECT rv.id, rv.value, rm.code, rm.unit
       FROM rate_master_versions rv
       JOIN rate_masters rm ON rm.id = rv.rate_master_id
       WHERE rv.status = 'active' AND rm.category = 'machine_hour' LIMIT 2`
    );

    const revRes = await query(
      `INSERT INTO costing_revisions (
         rfq_part_id, revision, status, costing_date,
         created_by, inputs, calculations
       ) VALUES ($1, 1, 'draft', '2026-11-01', $2, $3, $4)
       RETURNING id`,
      [
        testPartId,
        estimatorUser.id,
        JSON.stringify({ materialWeight: 4.0, costingDate: '2026-11-01' }),
        JSON.stringify({
          components: {
            materialCost: 1600,
            scrapCost: 48,
            totalManufacturingCost: 350,
            overheadCost: 200,
            freightCost: 50,
            packingCost: 30,
            marginCost: 300,
            sellingPrice: 2482
          }
        })
      ]
    );
    testRevisionId = revRes.rows[0].id;

    await query(
      `INSERT INTO costing_operations (
         costing_revision_id, sequence, operation_name, machine_code,
         cycle_time_minutes, rate_version_id, rate_value, rate_unit
       ) VALUES ($1, 1, 'CNC Milling', $2, 12, $3, $4, $5)`,
      [testRevisionId, rateRes.rows[0].code, rateRes.rows[0].id, rateRes.rows[0].value, rateRes.rows[0].unit]
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Estimator can run AI review when draft
  it('1. Estimator can successfully run AI costing review when revision is in draft', async () => {
    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toContain('Mocked Groq analysis');
    expect(groqSpy).toHaveBeenCalledTimes(1);
  });

  // 2. Estimator CANNOT run AI review once submitted to Plant Head
  it('2. Estimator CANNOT trigger AI costing review after revision is submitted (409 Conflict, 0 Groq calls)', async () => {
    // Mark revision as pending_review and RFQ as pending_plant_review
    await query(`UPDATE costing_revisions SET status = 'pending_review' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'pending_plant_review' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/locked for this submitted costing revision/i);
    // CRITICAL: Groq was NEVER called -> ZERO tokens consumed!
    expect(groqSpy).toHaveBeenCalledTimes(0);
  });

  // 3. Estimator CANNOT run AI review once revision is approved
  it('3. Estimator CANNOT trigger AI costing review when revision is approved (409 Conflict, 0 Groq calls)', async () => {
    await query(`UPDATE costing_revisions SET status = 'approved' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'pending_sales_approval' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/locked for this submitted costing revision/i);
    expect(groqSpy).toHaveBeenCalledTimes(0);
  });

  // 4. Plant Head can run AI routing review when pending_review
  it('4. Plant Head can run AI routing review while route is awaiting review', async () => {
    await query(`UPDATE costing_revisions SET status = 'pending_review' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'pending_plant_review' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${plantHeadToken}`)
      .send({
        reviewType: 'routing_review',
        costingRevisionId: testRevisionId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toContain('Mocked Groq analysis');
    expect(groqSpy).toHaveBeenCalledTimes(1);
  });

  // 5. Plant Head CANNOT run AI routing review once route is approved
  it('5. Plant Head CANNOT run AI routing review once route is approved (409 Conflict, 0 Groq calls)', async () => {
    await query(`UPDATE costing_revisions SET status = 'approved' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'pending_sales_approval' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${plantHeadToken}`)
      .send({
        reviewType: 'routing_review',
        costingRevisionId: testRevisionId
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/AI review is complete for this workflow stage/i);
    expect(groqSpy).toHaveBeenCalledTimes(0);
  });

  // 6. Plant Head CANNOT run AI routing review once route is returned for changes
  it('6. Plant Head CANNOT run AI routing review once route is returned (409 Conflict, 0 Groq calls)', async () => {
    await query(`UPDATE costing_revisions SET status = 'changes_requested' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'returned_for_revision' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${plantHeadToken}`)
      .send({
        reviewType: 'routing_review',
        costingRevisionId: testRevisionId
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/AI review is complete for this workflow stage/i);
    expect(groqSpy).toHaveBeenCalledTimes(0);
  });

  // 7. Sales Head can run AI commercial review while pending
  it('7. Sales Head can run AI commercial review while commercial review is pending', async () => {
    await query(`UPDATE costing_revisions SET status = 'approved' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'pending_sales_approval' WHERE id = $1`, [testRfqId]);

    const commRes = await query(
      `INSERT INTO commercial_reviews (costing_revision_id, status)
       VALUES ($1, 'pending')
       RETURNING id`,
      [testRevisionId]
    );
    testCommercialReviewId = commRes.rows[0].id;

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${salesHeadToken}`)
      .send({
        reviewType: 'commercial_review',
        commercialReviewId: testCommercialReviewId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toContain('Mocked Groq analysis');
    expect(groqSpy).toHaveBeenCalledTimes(1);
  });

  // 8. Sales Head CANNOT run AI commercial review once approved
  it('8. Sales Head CANNOT run AI commercial review once approved (409 Conflict, 0 Groq calls)', async () => {
    await query(`UPDATE costing_revisions SET status = 'approved' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'ready_for_quote' WHERE id = $1`, [testRfqId]);

    const commRes = await query(
      `INSERT INTO commercial_reviews (costing_revision_id, status, reviewer_id, comment)
       VALUES ($1, 'approved', $2, 'Commercial terms approved')
       RETURNING id`,
      [testRevisionId, salesHeadUser.id]
    );
    testCommercialReviewId = commRes.rows[0].id;

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${salesHeadToken}`)
      .send({
        reviewType: 'commercial_review',
        commercialReviewId: testCommercialReviewId
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/complete for this workflow stage|disabled because this RFQ has moved/i);
    expect(groqSpy).toHaveBeenCalledTimes(0);
  });

  // 9. Administrator cannot bypass workflow restriction on locked costing revision
  it('9. Administrator CANNOT bypass workflow locks on completed/locked stages (409 Conflict, 0 Groq calls)', async () => {
    await query(`UPDATE costing_revisions SET status = 'approved' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'ready_for_quote' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/locked for this submitted costing revision/i);
    expect(groqSpy).toHaveBeenCalledTimes(0);
  });

  // 10. Previously generated AI results remain viewable via history endpoint
  it('10. Previously generated AI review results remain viewable via GET /api/ai-reviews/history', async () => {
    // Generate an initial review while in draft
    await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });

    // Move to approved
    await query(`UPDATE costing_revisions SET status = 'approved' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'quoted' WHERE id = $1`, [testRfqId]);

    // View history
    const historyRes = await request(app)
      .get(`/api/ai-reviews/history?costingRevisionId=${testRevisionId}`)
      .set('Authorization', `Bearer ${estimatorToken}`);

    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(historyRes.body.data[0].summary).toContain('Mocked Groq analysis');
  });

  // 11. New Revision created after Plant return restores AI access for Revision 2
  it('11. Revision 2 created after Plant return is eligible for AI suggestions while Revision 1 remains locked', async () => {
    // Rev 1 is returned
    await query(`UPDATE costing_revisions SET status = 'changes_requested' WHERE id = $1`, [testRevisionId]);
    await query(`UPDATE rfqs SET status = 'returned_for_revision' WHERE id = $1`, [testRfqId]);

    // Estimator creates Revision 2
    const rev2Res = await query(
      `INSERT INTO costing_revisions (
         rfq_part_id, revision, status, costing_date,
         created_by, inputs, calculations
       ) VALUES ($1, 2, 'draft', '2026-11-02', $2, $3, $4)
       RETURNING id`,
      [
        testPartId,
        estimatorUser.id,
        JSON.stringify({ materialWeight: 4.2, costingDate: '2026-11-02' }),
        JSON.stringify({ components: { sellingPrice: 2550 } })
      ]
    );
    const testRevision2Id = rev2Res.rows[0].id;
    await query(`UPDATE rfqs SET status = 'in_progress' WHERE id = $1`, [testRfqId]);

    groqSpy.mockClear();

    // 1. Revision 1 is STILL locked (409 Conflict)
    const resRev1 = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });
    expect(resRev1.status).toBe(409);
    expect(groqSpy).toHaveBeenCalledTimes(0);

    // 2. Revision 2 IS eligible (200 OK)
    const resRev2 = await request(app)
      .post('/api/ai-reviews')
      .set('Authorization', `Bearer ${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevision2Id,
        rfqId: testRfqId
      });
    expect(resRev2.status).toBe(200);
    expect(groqSpy).toHaveBeenCalledTimes(1);
  });
});
