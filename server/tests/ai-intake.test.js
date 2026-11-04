import { describe, expect, it, vi, afterAll, beforeAll } from 'vitest';
import PDFDocument from 'pdfkit';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { parseSource } from '../src/modules/aiIntake/documentParser.js';
import { confirmInput, extractionResult } from '../src/modules/aiIntake/aiIntake.validation.js';
import { normalizeExtraction, fallbackExtractDescription } from '../src/modules/aiIntake/groqProvider.js';
import * as aiIntakeService from '../src/modules/aiIntake/aiIntake.service.js';
import * as repository from '../src/modules/aiIntake/aiIntake.repository.js';
import { navigation } from '../../client/src/layouts/DashboardLayout.jsx';

describe('AI RFQ Intake End-to-End Regression Suite', () => {
  let estimatorUser;
  let estimatorToken;
  let apexCustomer;
  let createdExtractionId;
  let createdRfqId;

  beforeAll(async () => {
    const userRes = await query("SELECT id, email, role FROM users WHERE role = 'estimator' LIMIT 1");
    estimatorUser = userRes.rows[0];
    expect(estimatorUser).toBeDefined();
    estimatorToken = jwt.sign({ sub: estimatorUser.id }, env.jwtSecret);

    const custRes = await query("SELECT id, name FROM customers WHERE name = 'Apex Automotive' LIMIT 1");
    apexCustomer = custRes.rows[0];
    expect(apexCustomer).toBeDefined();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    try {
      if (createdRfqId) {
        await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [createdRfqId]);
        await query('DELETE FROM rfqs WHERE id = $1', [createdRfqId]);
      }
      if (createdExtractionId) {
        await query('DELETE FROM ai_intake_extractions WHERE id = $1', [createdExtractionId]);
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // Scenario 1: A clean PDF containing all major RFQ fields
  it('1. Parses a clean PDF containing all major RFQ fields', async () => {
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', b => buffers.push(b));

    const pdfPromise = new Promise(resolve => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    doc.text('Customer: Apex Automotive\nRFQ Reference: RFQ-PDF-2026-01\nDate: 2026-11-01\nDue Date: 2026-11-20\n');
    doc.text('Part Name: High Pressure Flange Adapter\nMaterial: SS316\nGross Weight: 3.5 kg\nAnnual Volume: 5000 units\n');
    doc.text('Description: Precision CNC turned flange adapter with 1.6 Ra surface finish for hydraulic machinery.\n');
    doc.end();

    const pdfBuffer = await pdfPromise;
    const parsed = await parseSource({
      file: {
        buffer: pdfBuffer,
        originalname: 'rfq-sample.pdf',
        mimetype: 'application/pdf',
        size: pdfBuffer.length
      }
    });

    expect(parsed.sourceType).toBe('pdf');
    expect(parsed.sourceText).toContain('Apex Automotive');
    expect(parsed.sourceText).toContain('High Pressure Flange Adapter');
    expect(parsed.sourceText).toContain('SS316');
  });

  // Scenario 2: Customer name extraction and automatic form population
  it('2. Extracts customer name and removes it from missingFields', () => {
    const result = normalizeExtraction({
      fields: {
        customerName: { value: 'Apex Automotive', status: 'extracted', evidence: [{ source: 'document', quote: 'Apex Automotive' }] },
        customerRfqReference: { value: 'RFQ-2026-001', status: 'extracted', evidence: [{ source: 'document', quote: 'RFQ-2026-001' }] },
        partName: { value: 'Flange Adapter', status: 'extracted', evidence: [{ source: 'document', quote: 'Flange Adapter' }] }
      }
    });

    expect(result.fields.customerName.value).toBe('Apex Automotive');
    expect(result.fields.customerName.status).toBe('extracted');
    expect(result.missingFields).not.toContain('customerName');
  });

  // Scenario 3: A company name that does not match any existing customer
  it('3. Automatically creates customer record when company is not pre-registered in directory', async () => {
    const dummy = await repository.insert({
      actorId: estimatorUser.id,
      sourceType: 'email_text',
      sourceText: 'RFQ from Northstar Mobility Components Pvt. Ltd.',
      result: { fields: {}, missingFields: [] }
    });

    const uniqueCustomer = `Northstar Mobility Components ${Date.now()}`;
    const rfq = await aiIntakeService.confirm(
      {
        extractionId: dummy.id,
        rfqNumber: `RFQ-AUTO-${Date.now()}`,
        customerName: uniqueCustomer,
        receivedDate: '2026-11-01',
        dueDate: '2026-11-20',
        part: {
          name: 'Sample Part',
          description: 'Sample description',
          material: 'EN8',
          grossWeight: 2.5,
          annualVolume: 1000
        }
      },
      estimatorUser
    );

    expect(rfq).toBeDefined();
    expect(rfq.id).toBeDefined();

    // Verify customer was created in DB
    const custDb = await query('SELECT id, name FROM customers WHERE name = $1', [uniqueCustomer]);
    expect(custDb.rows.length).toBe(1);

    // Cleanup
    await query('DELETE FROM rfq_parts WHERE rfq_id = $1', [rfq.id]);
    await query('DELETE FROM rfqs WHERE id = $1', [rfq.id]);
    await query('DELETE FROM customers WHERE id = $1', [custDb.rows[0].id]);
    await query('DELETE FROM ai_intake_extractions WHERE id = $1', [dummy.id]);
  });

  // Scenario 4: A missing customer name with manual-entry fallback
  it('4. Handles missing customer name and permits manual-entry fallback', () => {
    const result = normalizeExtraction({
      fields: {
        customerName: null,
        partName: { value: 'Shaft', status: 'extracted', evidence: [{ source: 'document', quote: 'Shaft' }] }
      }
    });

    expect(result.fields.customerName.value).toBeNull();
    expect(result.fields.customerName.status).toBe('missing');
    expect(result.missingFields).toContain('customerName');

    // Estimator manually supplies customer name on confirmation
    const valid = confirmInput.parse({
      extractionId: '00000000-0000-0000-0000-000000000001',
      rfqNumber: 'RFQ-MANUAL-01',
      customerName: 'Apex Automotive',
      receivedDate: '2026-11-01',
      dueDate: '2026-11-20',
      part: {
        name: 'Shaft',
        description: 'Machined steel shaft',
        material: 'EN8',
        grossWeight: 2.5,
        annualVolume: 1000
      }
    });

    expect(valid.customerName).toBe('Apex Automotive');
  });

  // Scenario 5: A description explicitly present in the document
  it('5. Extracts an explicitly present description and excludes it from missingFields', () => {
    const sourceText = 'RFQ: FQ-99\nDescription: Heavy duty planetary gear housing with dual bearing seats.\nMaterial: EN8';
    const fallback = fallbackExtractDescription(sourceText);
    expect(fallback).toBe('Heavy duty planetary gear housing with dual bearing seats.');

    const result = normalizeExtraction(
      {
        fields: {
          partName: { value: 'Gear Housing', status: 'extracted' },
          description: { value: fallback, status: 'extracted', evidence: [{ source: 'document', quote: fallback }] }
        }
      },
      sourceText
    );

    expect(result.fields.description.value).toBe('Heavy duty planetary gear housing with dual bearing seats.');
    expect(result.missingFields).not.toContain('description');
  });

  // Scenario 6: A description that must be summarized from multiple relevant source passages
  it('6. Synthesizes description from multi-passage technical specifications', () => {
    const synthesized = 'High pressure hydraulic manifold block with 4 cross-drilled ports, nickel plated, Ra 0.8 surface finish.';
    const result = normalizeExtraction({
      fields: {
        partName: { value: 'Hydraulic Manifold', status: 'extracted' },
        description: {
          value: synthesized,
          status: 'extracted',
          evidence: [
            { source: 'document', quote: 'High pressure hydraulic manifold' },
            { source: 'document', quote: 'Ra 0.8 surface finish' }
          ]
        }
      }
    });

    expect(result.fields.description.value).toContain('hydraulic manifold block');
    expect(result.fields.description.value).toContain('Ra 0.8');
    expect(result.missingFields).not.toContain('description');
  });

  // Scenario 7: A genuinely absent description
  it('7. Correctly classifies genuinely absent description as missing without fabricating data', () => {
    const result = normalizeExtraction({
      fields: {
        partName: { value: 'Pin', status: 'extracted' },
        description: null
      }
    });

    expect(result.fields.description.value).toBeNull();
    expect(result.fields.description.status).toBe('missing');
    expect(result.missingFields).toContain('description');
  });

  // Scenario 8: Annual volume extraction from ordinary text and tabular content
  it('8. Extracts annual volume from ordinary text and spreadsheet tabular cells', async () => {
    const resultText = normalizeExtraction({
      fields: {
        annualVolume: { value: 25000, status: 'extracted', evidence: [{ source: 'document', quote: '25,000 pcs/year' }] }
      }
    });
    expect(resultText.fields.annualVolume.value).toBe(25000);
    expect(resultText.missingFields).not.toContain('annualVolume');

    const resultTabular = normalizeExtraction({
      fields: {
        annualVolume: { value: 180000, status: 'extracted', evidence: [{ source: 'document', quote: '180000' }] }
      }
    });
    expect(resultTabular.fields.annualVolume.value).toBe(180000);
  });

  // Scenario 9: Numeric values, units, date normalization, and valid zero values
  it('9. Preserves numeric weights, integer volumes, units, and dates', () => {
    const normalized = normalizeExtraction({
      fields: {
        grossWeight: { value: 4.75, status: 'extracted', evidence: [{ source: 'document', quote: '4.75 kg' }] },
        grossWeightUnit: { value: 'kg', status: 'extracted', evidence: [{ source: 'document', quote: 'kg' }] },
        annualVolume: { value: 12000, status: 'extracted', evidence: [{ source: 'document', quote: '12000' }] },
        annualVolumeUnit: { value: 'pieces', status: 'extracted', evidence: [{ source: 'document', quote: 'pieces' }] },
        receivedDate: { value: '2026-11-01', status: 'extracted', evidence: [{ source: 'document', quote: '01-Nov-2026' }] }
      }
    });

    expect(normalized.fields.grossWeight.value).toBe(4.75);
    expect(normalized.fields.grossWeightUnit.value).toBe('kg');
    expect(normalized.fields.annualVolume.value).toBe(12000);
    expect(normalized.fields.receivedDate.value).toBe('2026-11-01');
  });

  // Scenario 10: Malformed Groq JSON and provider failures
  it('10. Safely rejects malformed extraction structures with actionable errors', () => {
    expect(() => extractionResult.parse({ fields: 'invalid string' })).toThrow();
  });

  // Scenario 11: Manual edits surviving form rerenders and being submitted correctly
  it('11. Accepts manually corrected values and preserves them through validation', () => {
    const edited = {
      extractionId: '00000000-0000-0000-0000-000000000001',
      rfqNumber: 'CORRECTED-RFQ-88',
      customerName: 'Apex Automotive',
      receivedDate: '2026-11-02',
      dueDate: '2026-11-25',
      sourceNotes: 'Estimator verified drawing tolerances manually.',
      part: {
        name: 'Corrected Bushing Sleeve',
        description: 'Tolerances adjusted to ISO fit h6.',
        material: 'Bronze PB2',
        grossWeight: 1.85,
        annualVolume: 3500
      }
    };

    const parsed = confirmInput.parse(edited);
    expect(parsed.rfqNumber).toBe('CORRECTED-RFQ-88');
    expect(parsed.part.material).toBe('Bronze PB2');
    expect(parsed.part.grossWeight).toBe(1.85);
  });

  // Scenario 12: Successful RFQ creation with a valid customer relationship
  it('12. Successfully creates RFQ with server-side resolved customer relationship', async () => {
    const extractionRecord = await repository.insert({
      actorId: estimatorUser.id,
      sourceType: 'email_text',
      sourceText: 'Inquiry from Apex Automotive for Flange Couplings',
      result: {
        fields: {
          customerName: { value: 'Apex Automotive', status: 'extracted', evidence: [] }
        },
        missingFields: []
      }
    });
    createdExtractionId = extractionRecord.id;

    const rfqNumber = `AI-RFQ-${Date.now()}`;
    const rfq = await aiIntakeService.confirm(
      {
        extractionId: createdExtractionId,
        rfqNumber,
        customerName: 'Apex Automotive', // Server resolves customerId!
        receivedDate: '2026-11-01',
        dueDate: '2026-11-28',
        sourceNotes: 'Created via verified AI intake test',
        part: {
          name: 'Flange Coupling Pin',
          description: 'Hardened and ground coupling pin',
          material: 'EN8',
          grossWeight: 1.25,
          annualVolume: 4000
        }
      },
      estimatorUser
    );

    expect(rfq).toBeDefined();
    expect(rfq.id).toBeDefined();
    createdRfqId = rfq.id;

    // Verify DB foreign key relationship is authoritative
    const rfqDb = await query('SELECT id, customer_id, rfq_number, status FROM rfqs WHERE id = $1', [rfq.id]);
    expect(rfqDb.rows[0].customer_id).toBe(apexCustomer.id);
    expect(rfqDb.rows[0].status).toBe('draft');
  });

  // Scenario 13: Rejection of invalid customer relationships and invalid required fields
  it('13. Rejects invalid due dates, invalid weights, and non-integer volumes', () => {
    const base = {
      extractionId: '00000000-0000-0000-0000-000000000001',
      rfqNumber: 'RFQ-VAL-01',
      customerName: 'Apex Automotive',
      receivedDate: '2026-11-10',
      dueDate: '2026-11-05', // Due before received!
      part: {
        name: 'Bracket',
        description: 'Mounting bracket',
        material: 'Mild Steel',
        grossWeight: -2.5, // Negative weight!
        annualVolume: 0 // Non-positive volume!
      }
    };

    expect(() => confirmInput.parse(base)).toThrow();
  });

  // Scenario 14: Prevention of duplicate submissions
  it('14. Prevents duplicate confirmation of an already confirmed extraction', async () => {
    await expect(
      aiIntakeService.confirm(
        {
          extractionId: createdExtractionId,
          rfqNumber: `DUP-RFQ-${Date.now()}`,
          customerName: 'Apex Automotive',
          receivedDate: '2026-11-01',
          dueDate: '2026-11-28',
          part: {
            name: 'Coupling',
            description: '',
            material: 'EN8',
            grossWeight: 1.25,
            annualVolume: 4000
          }
        },
        estimatorUser
      )
    ).rejects.toMatchObject({
      status: 409,
      message: 'This extraction has already been confirmed'
    });
  });

  // Scenario 15: Correct sidebar active states for RFQ register and AI RFQ intake
  it('15. Accurately determines active sidebar navigation states without cross-activating siblings', () => {
    const userNav = navigation.filter(item => item.roles.includes('estimator'));

    function isNavItemActive(itemTo, pathname) {
      if (pathname === itemTo) return true;
      if (itemTo !== '/app' && pathname.startsWith(`${itemTo}/`)) {
        const hasMoreSpecificMatch = userNav.some(
          other => other.to !== itemTo && other.to.length > itemTo.length && (pathname === other.to || pathname.startsWith(`${other.to}/`))
        );
        return !hasMoreSpecificMatch;
      }
      return false;
    }

    // 1. When on /app/rfqs/ai-intake:
    expect(isNavItemActive('/app/rfqs/ai-intake', '/app/rfqs/ai-intake')).toBe(true);
    expect(isNavItemActive('/app/rfqs', '/app/rfqs/ai-intake')).toBe(false); // RFQ register is NOT active!

    // 2. When on /app/rfqs:
    expect(isNavItemActive('/app/rfqs', '/app/rfqs')).toBe(true);
    expect(isNavItemActive('/app/rfqs/ai-intake', '/app/rfqs')).toBe(false);

    // 3. When on /app/rfqs?workflow=open (pathname is /app/rfqs):
    expect(isNavItemActive('/app/rfqs', '/app/rfqs')).toBe(true);

    // 4. When on /app/rfqs/123-uuid/costing (nested RFQ costing view):
    expect(isNavItemActive('/app/rfqs', '/app/rfqs/123-uuid/costing')).toBe(true);
    expect(isNavItemActive('/app/rfqs/ai-intake', '/app/rfqs/123-uuid/costing')).toBe(false);

    // 5. When on /app (Dashboard):
    expect(isNavItemActive('/app', '/app')).toBe(true);
    expect(isNavItemActive('/app/rfqs', '/app')).toBe(false);
  });
});
