import { describe, expect, it, vi, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import * as groqClient from '../src/modules/aiReview/aiReview.groqClient.js';

describe('End-to-End ForgeQuote Workflow Verification', () => {
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
  let createdRevisionId;
  let createdCommercialReviewId;
  let createdQuotationId;

  beforeAll(async () => {
    // 1. Identify seeded accounts
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
    vi.restoreAllMocks();
    try {
      if (createdRevisionId) {
        await query('DELETE FROM ai_reviews WHERE costing_revision_id = $1', [createdRevisionId]);
        await query('DELETE FROM quotation_documents WHERE quotation_id = $1', [createdQuotationId]);
        await query('DELETE FROM quotations WHERE id = $1', [createdQuotationId]);
        await query('DELETE FROM commercial_reviews WHERE costing_revision_id = $1', [createdRevisionId]);
        await query('DELETE FROM costing_operations WHERE costing_revision_id = $1', [createdRevisionId]);
        await query('DELETE FROM costing_revisions WHERE id = $1', [createdRevisionId]);
      }
      if (createdRfqId) {
        await query('DELETE FROM ai_reviews WHERE rfq_id = $1', [createdRfqId]);
        await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [createdRfqId]);
        await query('DELETE FROM rfqs WHERE id = $1', [createdRfqId]);
      }
    } catch {
      // Ignore cleanup error if already removed
    }
  });

  it('executes full end-to-end lifecycle: RFQ -> Costing -> AI Review -> Routing -> Commercial -> Quotation PDF', async () => {
    // Step 1: Estimator creates a new RFQ
    const rfqNumber = `E2E-RFQ-${Date.now()}`;
    const createRfqRes = await request(app)
      .post('/api/rfqs')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        rfqNumber,
        customerId,
        assignedEstimatorId: estimatorUser.id,
        receivedDate: '2026-11-01',
        dueDate: '2026-11-25',
        status: 'in_progress',
        sourceNotes: 'E2E end-to-end verification enquiry',
        part: {
          name: 'High Precision Rotor Shaft',
          description: 'Custom machined rotor shaft',
          material: 'Aluminium 6061',
          grossWeight: 4.5,
          annualVolume: 2500
        }
      });

    expect(createRfqRes.status).toBe(201);
    createdRfqId = createRfqRes.body.data.id;
    expect(createdRfqId).toBeDefined();

    // Step 2: Estimator saves a complete costing draft with active rate codes and operations
    const saveDraftRes = await request(app)
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
        materialWeight: 4.5,
        operations: [
          {
            sequence: 1,
            operationName: 'Rough Machining',
            machineCode: 'MACHINE-REAR-SPINDLE',
            cycleTimeMinutes: 12
          },
          {
            sequence: 2,
            operationName: 'Finish Grinding',
            machineCode: 'MACHINE-GEAR-BLANK',
            cycleTimeMinutes: 8
          }
        ]
      });

    expect(saveDraftRes.status).toBe(201);
    createdRevisionId = saveDraftRes.body.data.id;
    expect(saveDraftRes.body.data.status).toBe('draft');
    expect(saveDraftRes.body.data.calculations?.components?.sellingPrice).toBeDefined();
    const authoritativeSellingPrice = Number(saveDraftRes.body.data.calculations.components.sellingPrice);
    expect(authoritativeSellingPrice).toBeGreaterThan(0);

    // Step 3: Estimator runs AI Costing Review
    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValueOnce({
      summary: `Costing revision 1 for High Precision Rotor Shaft establishes a baseline selling price of INR ${authoritativeSellingPrice}.`,
      findings: [
        {
          code: 'HEALTHY_STRUCTURE',
          severity: 'info',
          title: 'Balanced Cost Distribution',
          explanation: 'Manufacturing and material costs align with standard aerospace-grade machining.',
          evidence: `Selling price: INR ${authoritativeSellingPrice}`
        }
      ],
      recommendations: ['Confirm tool changeover cycle times.'],
      limitations: [],
      modelMetadata: { model: 'mocked-groq-model' }
    });

    const costingAiRes = await request(app)
      .post('/api/ai-reviews')
      .set('Cookie', `forgequote_token=${estimatorToken}`)
      .send({
        reviewType: 'costing_review',
        costingRevisionId: createdRevisionId,
        rfqId: createdRfqId
      });

    expect(costingAiRes.status).toBe(200);
    expect(costingAiRes.body.data.status).toBe('completed');
    expect(costingAiRes.body.data.summary).toContain('High Precision Rotor Shaft');

    // CRITICAL DOMAIN SAFEGARD: AI review did NOT modify the revision status or authoritative calculations!
    const draftCheck = await query('SELECT status, calculations FROM costing_revisions WHERE id = $1', [createdRevisionId]);
    expect(draftCheck.rows[0].status).toBe('draft');
    expect(Number(draftCheck.rows[0].calculations.components.sellingPrice)).toBe(authoritativeSellingPrice);

    // Step 4: Estimator explicitly submits route for Plant Head review
    const submitRes = await request(app)
      .post(`/api/costing/${createdRevisionId}/submit`)
      .set('Cookie', `forgequote_token=${estimatorToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('pending_review');

    // Step 5: Plant Head views the queue and performs AI Routing Review
    const queueRes = await request(app)
      .get('/api/routing-reviews?status=pending_review')
      .set('Cookie', `forgequote_token=${plantHeadToken}`);

    expect(queueRes.status).toBe(200);
    const inQueue = queueRes.body.data.find(r => r.id === createdRevisionId);
    expect(inQueue).toBeDefined();

    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValueOnce({
      summary: 'Route contains 2 well-defined machining stages with resolved machine rates.',
      findings: [],
      recommendations: ['Confirm spindle tooling availability.'],
      limitations: [],
      modelMetadata: { model: 'mocked-groq-model' }
    });

    const plantAiRes = await request(app)
      .post('/api/ai-reviews/routing_review')
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        costingRevisionId: createdRevisionId
      });

    expect(plantAiRes.status).toBe(200);
    expect(plantAiRes.body.data.status).toBe('completed');

    // CRITICAL: AI does NOT approve the route!
    const preDecisionCheck = await query('SELECT status FROM costing_revisions WHERE id = $1', [createdRevisionId]);
    expect(preDecisionCheck.rows[0].status).toBe('pending_review');

    // Step 6: Plant Head approves the route with mandatory comment
    const plantDecisionRes = await request(app)
      .post(`/api/routing-reviews/${createdRevisionId}/decision`)
      .set('Cookie', `forgequote_token=${plantHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Tooling capacity and spindle cycle times verified for production.',
        rowVersion: inQueue.row_version
      });

    expect(plantDecisionRes.status).toBe(200);
    expect(plantDecisionRes.body.data.status).toBe('approved');

    // Check that RFQ transitioned to pending_sales_approval and commercial review record created
    const rfqStatusCheck = await query('SELECT status FROM rfqs WHERE id = $1', [createdRfqId]);
    expect(rfqStatusCheck.rows[0].status).toBe('pending_sales_approval');

    const commReviewDb = await query('SELECT id, status, row_version FROM commercial_reviews WHERE costing_revision_id = $1', [createdRevisionId]);
    expect(commReviewDb.rows.length).toBe(1);
    expect(commReviewDb.rows[0].status).toBe('pending');
    createdCommercialReviewId = commReviewDb.rows[0].id;

    // Step 7: Sales Head performs AI Commercial Review
    vi.spyOn(groqClient, 'callGroqReview').mockResolvedValueOnce({
      summary: `Commercial quotation based on plant-approved route provides target margin with annual volume of 2500.`,
      findings: [
        {
          code: 'COMMERCIAL_APPROVED_ROUTE',
          severity: 'info',
          title: 'Plant Approval Confirmed',
          explanation: 'Route was verified and signed off by plant management.',
          recommendation: 'Approve quotation.'
        }
      ],
      recommendations: ['Validate 30-day price validity.'],
      limitations: [],
      modelMetadata: { model: 'mocked-groq-model' }
    });

    const salesAiRes = await request(app)
      .post('/api/ai-reviews')
      .set('Cookie', `forgequote_token=${salesHeadToken}`)
      .send({
        reviewType: 'commercial_review',
        commercialReviewId: createdCommercialReviewId
      });

    expect(salesAiRes.status).toBe(200);
    expect(salesAiRes.body.data.status).toBe('completed');
    expect(salesAiRes.body.data.findings.some(f => f.code === 'COMMERCIAL_PLANT_NOT_APPROVED')).toBe(false);

    // CRITICAL: AI does NOT approve quotation
    const commPreCheck = await query('SELECT status FROM commercial_reviews WHERE id = $1', [createdCommercialReviewId]);
    expect(commPreCheck.rows[0].status).toBe('pending');

    // Step 8: Sales Head approves quotation
    const salesDecisionRes = await request(app)
      .post(`/api/commercial-reviews/${createdCommercialReviewId}/decision`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`)
      .send({
        decision: 'approved',
        comment: 'Target margin and pricing approved for customer issuance.',
        rowVersion: commReviewDb.rows[0].row_version
      });

    expect(salesDecisionRes.status).toBe(200);
    expect(salesDecisionRes.body.data.review?.status).toBe('approved');
    createdQuotationId = salesDecisionRes.body.data.quotation?.id;
    expect(createdQuotationId).toBeDefined();

    const rfqCommercialCheck = await query('SELECT status FROM rfqs WHERE id = $1', [createdRfqId]);
    expect(rfqCommercialCheck.rows[0].status).toBe('ready_for_quote');

    // Step 9: Quotation PDF Generation & Download
    const pdfRes = await request(app)
      .get(`/api/quotations/${createdQuotationId}/pdf`)
      .set('Cookie', `forgequote_token=${salesHeadToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfRes.body.length).toBeGreaterThan(100);

    // Step 10: Verify AI Review History & Audit Events
    const historyRes = await request(app)
      .get(`/api/ai-reviews/history?costingRevisionId=${createdRevisionId}`)
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(2); // costing_review and routing_review both logged
    expect(historyRes.body.data.some(r => r.review_type === 'costing_review')).toBe(true);
    expect(historyRes.body.data.some(r => r.review_type === 'routing_review')).toBe(true);

    const auditRes = await request(app)
      .get('/api/audit-events')
      .set('Cookie', `forgequote_token=${adminToken}`);

    expect(auditRes.status).toBe(200);
    const events = auditRes.body.data;
    expect(events.some(e => e.action === 'draft_saved')).toBe(true);
    expect(events.some(e => e.action === 'submitted_for_routing_review')).toBe(true);
    expect(events.some(e => e.action === 'approved')).toBe(true);
  }, 30000);
});
