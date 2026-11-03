import { describe, expect, it } from 'vitest';
import { parseSource } from '../src/modules/aiIntake/documentParser.js';
import { confirmInput, extractionResult } from '../src/modules/aiIntake/aiIntake.validation.js';
import { normalizeExtraction } from '../src/modules/aiIntake/groqProvider.js';

describe('AI RFQ intake safeguards', () => {
  it('accepts bounded email text without inventing file metadata', async () => {
    const result = await parseSource({ emailText: 'RFQ: FQ-17\nMaterial: EN8\nAnnual volume: 1200' });
    expect(result.sourceType).toBe('email_text');
    expect(result.sourceText).toContain('Material: EN8');
    expect(result.filename).toBeNull();
  });

  it('rejects empty sources and unsupported binary content', async () => {
    await expect(parseSource({ emailText: '   ' })).rejects.toMatchObject({ status: 400 });
    await expect(parseSource({ file: { buffer: Buffer.from('not a document'), mimetype: 'text/plain', originalname: 'x.txt', size: 14 } })).rejects.toMatchObject({ status: 415 });
  });

  it('requires positive integer annual volume during confirmation', () => {
    const valid = {
      extractionId: '00000000-0000-0000-0000-000000000001',
      rfqNumber: 'FQ-17',
      customerId: '00000000-0000-0000-0000-000000000002',
      customerName: 'Apex Automotive',
      receivedDate: '2026-01-01',
      dueDate: '2026-01-10',
      assignedEstimatorId: '00000000-0000-0000-0000-000000000003',
      sourceNotes: '',
      part: { name: 'Housing', description: '', material: 'EN8', grossWeight: 2.4, annualVolume: 1200 }
    };
    expect(confirmInput.parse(valid).part.annualVolume).toBe(1200);
    expect(() => confirmInput.parse({ ...valid, part: { ...valid.part, annualVolume: 1200.5 } })).toThrow();
  });

  it('does not accept extraction fields without the explicit evidence shape', () => {
    expect(() => extractionResult.parse({ fields: {}, missingFields: [], conflicts: [], warnings: [], extractionStatus: 'review' })).toThrow();
  });

  it('normalizes raw and partially wrapped provider fields without inventing values', () => {
    const result = normalizeExtraction({
      customerName: 'Northstar Mobility Components Pvt. Ltd.',
      annualVolume: 180000,
      description: { value: 'Precision machined component', status: 'extracted', evidence: [{ source: 'RFQ', quote: 'Precision machined component' }] }
    });
    expect(extractionResult.parse(result).fields.annualVolume.value).toBe(180000);
    expect(result.fields.material.status).toBe('missing');
    expect(result.fields.description.evidence[0].quote).toBe('Precision machined component');
  });
});
