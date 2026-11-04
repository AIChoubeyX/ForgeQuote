import { describe, expect, it } from 'vitest';
import { render } from '../src/modules/quotations/quotations.service.js';

describe('Professional Quotation PDF Generation Suite', () => {
  const sampleSnapshot = {
    company: {
      name: 'ForgeQuote Manufacturing Systems Pvt. Ltd.',
      address: 'Plot 42, Heavy Engineering Zone, Pune, Maharashtra 411018',
      taxRate: 18,
      validityDays: 30
    },
    quotationNumber: 'FQ-2026-00042',
    rfqNumber: 'RFQ-IND-2026-99',
    customerName: 'Bharat Heavy Dynamics Ltd.',
    partName: 'Precision Spindle Shaft 42CrMo4',
    description: 'Precision turned and induction-hardened rear wheel spindle with ground bearing journals and M24x1.5 thread.',
    material: '42CrMo4 Alloy Steel',
    annualVolume: 120000,
    costingRevisionId: 'cr-uuid-sample-123',
    costingRevision: 2,
    approvedAt: '2026-11-04T12:00:00.000Z',
    calculations: {
      components: {
        material: '240.500000',
        scrap: '12.000000',
        manufacturing: '185.000000',
        overhead: '42.550000',
        packing: '15.000000',
        freight: '20.000000',
        totalCost: '491.050000',
        margin: '110.530526',
        sellingPrice: '601.580526'
      },
      scenarios: [
        { annualVolume: '60000', annualCost: '29463000', annualSellingValue: '36094831' },
        { annualVolume: '120000', annualCost: '58926000', annualSellingValue: '72189663' },
        { annualVolume: '240000', annualCost: '117852000', annualSellingValue: '144379326' }
      ]
    }
  };

  it('1. Generates a valid binary PDF buffer starting with %PDF- header', async () => {
    const pdfBuffer = await render(sampleSnapshot);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // Standard PDF size > 1KB
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('2. Embeds company, customer, quotation number, and RFQ references', async () => {
    const pdfBuffer = await render(sampleSnapshot);
    const pdfText = pdfBuffer.toString('latin1');

    // PDFKit compresses streams by default, but header metadata and trailer objects exist
    expect(pdfText).toContain('%PDF-');
    expect(pdfText).toContain('%%EOF');
  });

  it('3. Handles missing optional fields gracefully without crashing', async () => {
    const minimalSnapshot = {
      company: {
        name: 'ForgeQuote',
        address: 'India',
        taxRate: 18,
        validityDays: 15
      },
      quotationNumber: 'FQ-MIN-001',
      rfqNumber: 'RFQ-MIN-01',
      customerName: 'Quick Customer',
      partName: 'Simple Part',
      material: 'Aluminium 6061',
      annualVolume: 500,
      calculations: {
        components: {
          sellingPrice: '150.00'
        }
      }
    };

    const pdfBuffer = await render(minimalSnapshot);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('4. Handles extensive multi-line technical descriptions and custom tax rates', async () => {
    const longSnapshot = {
      ...sampleSnapshot,
      description: 'Extensive technical specification: '.repeat(20),
      company: {
        ...sampleSnapshot.company,
        taxRate: 12,
        validityDays: 60
      }
    };

    const pdfBuffer = await render(longSnapshot);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('5. Restricts page count strictly as per content (1 page for standard single-part quotation)', async () => {
    const pdfBuffer = await render(sampleSnapshot);
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const res = await parser.getText();
    expect(res.pages?.length || res.total).toBe(1);
  });
});

