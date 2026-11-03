import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool, query } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import * as groqClient from '../src/modules/aiReview/aiReview.groqClient.js';
import { executeReview } from '../src/modules/aiReview/aiReview.service.js';
import { calculateCost } from '../src/modules/costing/costing.calculator.js';
import { AppError } from '../src/shared/errors.js';

describe('AI Review Module Integration Tests', () => {
  let estimatorUser;
  let plantHeadUser;
  let salesHeadUser;
  let estimatorToken;
  let plantHeadToken;
  let salesHeadToken;

  let testRfqId;
  let testPartId;
  let testRevisionId;
  let testCommercialReviewId;

  beforeEach(async () => {
    const usersRes = await query('SELECT id, email, role FROM users');
    estimatorUser = usersRes.rows.find(u => u.role === 'estimator');
    plantHeadUser = usersRes.rows.find(u => u.role === 'plant_head');
    salesHeadUser = usersRes.rows.find(u => u.role === 'sales_head');

    estimatorToken = jwt.sign({ sub: estimatorUser.id }, env.jwtSecret);
    plantHeadToken = jwt.sign({ sub: plantHeadUser.id }, env.jwtSecret);
    salesHeadToken = jwt.sign({ sub: salesHeadUser.id }, env.jwtSecret);

    const custRes = await query('SELECT id FROM customers LIMIT 1');
    const customerId = custRes.rows[0].id;

    const rfqRes = await query(
      `INSERT INTO rfqs (rfq_number, customer_id, owner_id, received_date, due_date, status)
       VALUES ($1, $2, $3, '2026-11-01', '2026-11-20', 'in_progress')
       RETURNING id`,
      [`TEST-RFQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`, customerId, estimatorUser.id]
    );
    testRfqId = rfqRes.rows[0].id;

    const partRes = await query(
      `INSERT INTO rfq_parts (rfq_id, name, description, material, gross_weight, annual_volume)
       VALUES ($1, 'Flange Housing', 'Machined component', 'Aluminium 6061', 3.5, 5000)
       RETURNING id`,
      [testRfqId]
    );
    testPartId = partRes.rows[0].id;

    const costingDate = '2026-11-01';
    const rateRes = await query(
      `SELECT rv.id, rv.value, rm.code, rm.unit
       FROM rate_master_versions rv
       JOIN rate_masters rm ON rm.id = rv.rate_master_id
       WHERE rv.status = 'active' AND rm.category = 'machine_hour' LIMIT 2`
    );
    const mRate1 = rateRes.rows[0];
    const mRate2 = rateRes.rows[1] || mRate1;

    const operationsInput = [
      { sequence: 1, operationName: 'Facing and Centering', machineCode: mRate1.code, cycleTimeMinutes: 10, rateValue: Number(mRate1.value), rateUnit: mRate1.unit, rateVersionId: mRate1.id },
      { sequence: 2, operationName: 'CNC Turning', machineCode: mRate2.code, cycleTimeMinutes: 15, rateValue: Number(mRate2.value), rateUnit: mRate2.unit, rateVersionId: mRate2.id }
    ];

    const inputs = {
      costingDate,
      materialRateCode: 'MATERIAL-AL6061',
      scrapRateCode: 'SCRAP-DEFAULT',
      overheadRateCode: 'OVERHEAD-DEFAULT',
      packingRateCode: 'PACKING-DEFAULT',
      freightRateCode: 'FREIGHT-DEFAULT',
      marginRateCode: 'MARGIN-DEFAULT',
      materialWeight: 3.5,
      rates: {
        materialRateCode: { versionId: 'v1', value: 420, unit: 'INR/kg' },
        scrapRateCode: { versionId: 'v2', value: 3, unit: '%' },
        overheadRateCode: { versionId: 'v3', value: 12, unit: '%' },
        packingRateCode: { versionId: 'v4', value: 25, unit: 'INR/part' },
        freightRateCode: { versionId: 'v5', value: 15, unit: 'INR/part' },
        marginRateCode: { versionId: 'v6', value: 18, unit: '%' }
      }
    };

    const calculations = calculateCost({
      materialRate: 420,
      scrapRate: 3,
      overheadRate: 12,
      packingRate: 25,
      freightRate: 15,
      marginRate: 18,
      materialWeight: 3.5,
      annualVolume: 5000,
      operations: operationsInput
    });

    const revRes = await query(
      `INSERT INTO costing_revisions (rfq_part_id, revision, status, costing_date, inputs, calculations, created_by)
       VALUES ($1, 1, 'draft', $2, $3, $4, $5)
       RETURNING id`,
      [testPartId, costingDate, JSON.stringify(inputs), JSON.stringify(calculations), estimatorUser.id]
    );
    testRevisionId = revRes.rows[0].id;

    await query(
      `INSERT INTO costing_operations (costing_revision_id, sequence, operation_name, machine_code, cycle_time_minutes, rate_version_id, rate_value, rate_unit)
       VALUES
       ($1, 1, 'Facing and Centering', $2, 10, $3, $4, $5),
       ($1, 2, 'CNC Turning', $6, 15, $7, $8, $9)`,
      [
        testRevisionId,
        mRate1.code, mRate1.id, mRate1.value, mRate1.unit,
        mRate2.code, mRate2.id, mRate2.value, mRate2.unit
      ]
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    try {
      if (testRevisionId) {
        await query('DELETE FROM ai_reviews WHERE costing_revision_id = $1', [testRevisionId]);
        await query('DELETE FROM commercial_reviews WHERE costing_revision_id = $1', [testRevisionId]);
        await query('DELETE FROM costing_operations WHERE costing_revision_id = $1', [testRevisionId]);
        await query('DELETE FROM costing_revisions WHERE id = $1', [testRevisionId]);
      }
      if (testRfqId) {
        await query('DELETE FROM ai_reviews WHERE rfq_id = $1', [testRfqId]);
        await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [testRfqId]);
        await query('DELETE FROM rfqs WHERE id = $1', [testRfqId]);
      }
    } catch {
      // Ignore cleanup error if already removed
    }
  });

  it('performs Estimator Costing Review on complete persisted revision using mocked provider', async () => {
    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValueOnce({
      summary: 'The costing breakdown for Flange Housing is well-structured with standard aluminium material rates.',
      findings: [
        {
          code: 'MATERIAL_DOMINANCE',
          severity: 'info',
          title: 'Material Cost Dominance',
          explanation: 'Raw material represents dominant portion of net manufacturing cost.',
          evidence: 'Material: 1470 INR',
          recommendation: 'Evaluate scrap recovery efficiency.'
        }
      ],
      recommendations: ['Confirm annual batch sizes for volume scenario.'],
      limitations: ['Tooling amortisation not modelled.'],
      modelMetadata: { model: 'mocked-groq-model' }
    });

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId,
        rfqId: testRfqId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.reviewType).toBe('costing_review');
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.summary).toContain('Flange Housing');
    expect(res.body.data.findings.length).toBeGreaterThanOrEqual(1);

    const finding = res.body.data.findings.find(f => f.code === 'MATERIAL_DOMINANCE');
    expect(finding).toBeDefined();
    expect(finding.source).toBe('ai_analysis');
    expect(finding.severity).toBe('info');

    const dbCheck = await query('SELECT * FROM ai_reviews WHERE costing_revision_id = $1', [testRevisionId]);
    expect(dbCheck.rows.length).toBeGreaterThanOrEqual(1);
    expect(dbCheck.rows[0].review_type).toBe('costing_review');
    expect(dbCheck.rows[0].actor_id).toBe(estimatorUser.id);
  });

  it('performs Plant Head Routing Review with valid operations', async () => {
    await query("UPDATE costing_revisions SET status = 'pending_review' WHERE id = $1", [testRevisionId]);

    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValueOnce({
      summary: 'The 2-step machining route follows standard sequential turning operations with appropriate cycle times.',
      findings: [],
      recommendations: ['Verify CNC machine fixture clamping tolerances.'],
      limitations: [],
      modelMetadata: { model: 'mocked-groq-model' }
    });

    const res = await request(app)
      .post('/api/ai-reviews/routing_review')
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        costingRevisionId: testRevisionId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.summary).toContain('machining route');
    expect(res.body.data.recommendations).toContain('Verify CNC machine fixture clamping tolerances.');
  });

  it('detects missing machine rate and true duplicate operation in defective routing data', async () => {
    // Insert a 3rd operation that is an exact duplicate of operation 2 (same name, machine, and cycle time) but rate 0
    await query(
      `INSERT INTO costing_operations (costing_revision_id, sequence, operation_name, machine_code, cycle_time_minutes, rate_version_id, rate_value, rate_unit)
       SELECT $1, 3, operation_name, machine_code, cycle_time_minutes, rate_version_id, 0, rate_unit
       FROM costing_operations WHERE costing_revision_id = $1 AND sequence = 2`,
      [testRevisionId]
    );

    const result = await executeReview({
      reviewType: 'routing_review',
      costingRevisionId: testRevisionId
    }, plantHeadUser);

    expect(result.findings.some(f => f.code === 'ROUTING_MISSING_MACHINE_RATE')).toBe(true);
    expect(result.findings.some(f => f.code === 'ROUTING_DUPLICATE_OPERATION')).toBe(true);
  });

  it('performs Commercial Review on plant-approved revision', async () => {
    await query("UPDATE costing_revisions SET status = 'approved' WHERE id = $1", [testRevisionId]);

    const commRes = await query(
      `INSERT INTO commercial_reviews (costing_revision_id, status)
       VALUES ($1, 'pending')
       RETURNING id`,
      [testRevisionId]
    );
    testCommercialReviewId = commRes.rows[0].id;

    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValueOnce({
      summary: 'Quotation pricing provides healthy target margin on total manufacturing cost.',
      findings: [
        {
          code: 'HEALTHY_MARGIN',
          severity: 'info',
          title: 'Target Margin Met',
          explanation: 'Gross margin conforms to internal commercial targets.',
          recommendation: 'Proceed with quotation issuance.'
        }
      ],
      recommendations: ['Ensure payment terms match 30-day validity.'],
      limitations: [],
      modelMetadata: { model: 'mocked-groq-model' }
    });

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Cookie', `forgequote_token=${salesHeadToken}`)
      .send({
        reviewType: 'commercial_review',
        commercialReviewId: testCommercialReviewId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.findings.some(f => f.code === 'HEALTHY_MARGIN')).toBe(true);
    expect(res.body.data.findings.some(f => f.code === 'COMMERCIAL_PLANT_NOT_APPROVED')).toBe(false);
  });

  it('handles Groq provider rate-limiting and timeouts gracefully without crashing', async () => {
    vi.spyOn(groqClient, 'callGroqReview').mockRejectedValueOnce(
      new AppError(429, 'AI review is temporarily rate limited; please try again shortly')
    );

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: testRevisionId
      });

    expect(res.status).toBe(429);
    expect(res.body.error?.message).toContain('rate limit');
  });

  it('retrieves review history for authorized users', async () => {
    await query(
      `INSERT INTO ai_reviews (review_type, rfq_id, costing_revision_id, actor_id, status, summary, findings)
       VALUES ('costing_review', $1, $2, $3, 'completed', 'Historical review test', '[]'::jsonb)`,
      [testRfqId, testRevisionId, estimatorUser.id]
    );

    const res = await request(app)
      .get(`/api/ai-reviews/history?costingRevisionId=${testRevisionId}`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].summary).toBe('Historical review test');
  });

  it('enforces RBAC and rejects unauthorized review requests', async () => {
    const commRes = await query(
      `INSERT INTO commercial_reviews (costing_revision_id, status)
       VALUES ($1, 'pending')
       RETURNING id`,
      [testRevisionId]
    );

    const res = await request(app)
      .post('/api/ai-reviews')
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        reviewType: 'commercial_review',
        commercialReviewId: commRes.rows[0].id
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toContain('permission');
  });
});
