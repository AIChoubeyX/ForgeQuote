import multer from 'multer';
import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import * as rfqs from '../rfqs/rfqs.service.js';
import * as repository from './aiIntake.repository.js';
import { assistanceInput, confirmInput } from './aiIntake.validation.js';
import { parseSource } from './documentParser.js';
import * as groq from './groqProvider.js';
import * as aiReviewService from '../aiReview/aiReview.service.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

export async function extract(req) {
  const source = await parseSource({ file: req.file, emailText: req.body.emailText });
  const result = await groq.extract(source.sourceText);
  const saved = await repository.insert({ ...source, actorId: req.user.id, result });
  await audit.record(
    { query },
    {
      actorId: req.user.id,
      entityType: 'ai_intake',
      entityId: saved.id,
      action: 'extraction_completed',
      metadata: { sourceType: source.sourceType, fieldCount: Object.keys(result.fields).length }
    }
  );
  return { id: saved.id, status: saved.status, result: saved.result, createdAt: saved.created_at };
}

export async function confirm(input, user) {
  const value = confirmInput.parse(input);
  const extraction = await repository.findForActor(value.extractionId, user.id);
  if (!extraction) throw new AppError(404, 'Extraction not found');
  if (extraction.status !== 'review') throw new AppError(409, 'This extraction has already been confirmed');

  // Authoritative server-side customer resolution:
  let customerId = value.customerId;
  if (!customerId) {
    const customer = await repository.getOrCreateCustomer(value.customerName);
    customerId = customer.id;
  } else {
    const customer = await repository.findCustomerById(customerId);
    if (!customer) {
      const created = await repository.getOrCreateCustomer(value.customerName);
      customerId = created.id;
    }
  }

  const rfq = await rfqs.save(
    {
      ...value,
      customerId,
      assignedEstimatorId: user.id,
      status: 'draft',
      sourceNotes: `${value.sourceNotes || ''}\nAI-assisted intake ${value.extractionId}`.trim()
    },
    user
  );

  const updated = await repository.confirm(value.extractionId, user.id, rfq.id);
  if (!updated) throw new AppError(409, 'Extraction confirmation was already completed');
  await audit.record(
    { query },
    {
      actorId: user.id,
      entityType: 'ai_intake',
      entityId: value.extractionId,
      action: 'confirmed',
      metadata: { rfqId: rfq.id, customerId, customerName: value.customerName }
    }
  );
  return rfq;
}

export async function suggestRouting(input, user) {
  const candidates = await repository.historicalParts(input, user.id);
  if (!candidates.length) {
    return {
      status: 'insufficient_evidence',
      suggestions: [],
      historicalCandidates: [],
      warnings: ['No relevant historical parts were found for this estimator.']
    };
  }
  const result = await groq.suggestRouting(input, candidates);
  return {
    ...result,
    historicalCandidates: candidates.map(candidate => ({
      rfqNumber: candidate.rfq_number,
      partName: candidate.name,
      material: candidate.material,
      operationId: candidate.operation_id,
      operationName: candidate.operation_name,
      machineCode: candidate.machine_code
    }))
  };
}

export async function assist(input, user) {
  const value = assistanceInput.parse(input);
  return aiReviewService.executeReview(value, user);
}
