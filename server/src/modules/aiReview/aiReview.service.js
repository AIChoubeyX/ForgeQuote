import { pool } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import { canonicalReviewType } from './aiReview.validation.js';
import * as contextBuilders from './aiReview.contextBuilders.js';
import * as deterministic from './aiReview.deterministic.js';
import * as groqClient from './aiReview.groqClient.js';
import * as repository from './aiReview.repository.js';

// Short-lived in-memory cache keyed by `${reviewType}:${targetId}:${version}`
const reviewCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

function getCached(key) {
  const entry = reviewCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    reviewCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  reviewCache.set(key, { data, timestamp: Date.now() });
}

export async function executeReview(input, user) {
  const rawType = input.reviewType || input.feature;
  if (!rawType) throw new AppError(400, 'reviewType or feature is required');
  const reviewType = canonicalReviewType(rawType);

  let context = null;
  let rfqId = input.rfqId;
  let costingRevisionId = input.costingRevisionId;
  let commercialReviewId = input.commercialReviewId;
  let targetVersion = null;

  // 1. Build context from authoritative persisted records
  if (reviewType === 'costing_review') {
    context = await contextBuilders.buildCostingReviewContext({
      costingRevisionId,
      rfqId,
      user
    });
    rfqId = context.rfq?.id || rfqId;
    costingRevisionId = context.revision?.id || costingRevisionId;
    targetVersion = context.revision?.rowVersion || context.revision?.revision || '1';
  } else if (reviewType === 'routing_review') {
    // If only rfqId passed or costingRevisionId passed
    if (!costingRevisionId && input.context?.id) {
      costingRevisionId = input.context.id;
    }
    context = await contextBuilders.buildRoutingReviewContext({
      costingRevisionId,
      user
    });
    rfqId = context.rfq?.id || rfqId;
    targetVersion = context.revision?.rowVersion || '1';
  } else if (reviewType === 'commercial_review') {
    if (!commercialReviewId && input.context?.id) {
      commercialReviewId = input.context.id;
    }
    context = await contextBuilders.buildCommercialReviewContext({
      commercialReviewId,
      costingRevisionId,
      user
    });
    rfqId = context.rfq?.id || rfqId;
    costingRevisionId = context.costingRevision?.id || costingRevisionId;
    commercialReviewId = context.commercialReview?.id || commercialReviewId;
    targetVersion = context.commercialReview?.rowVersion || '1';
  } else {
    throw new AppError(400, `Unsupported review type: ${reviewType}`);
  }

  // 1.5 Authoritative Workflow-Based AI Access Control & Stage Validation
  const rfqLifecycleStatus = context.rfq?.status;

  if (reviewType === 'costing_review') {
    // Estimator costing review
    if (user.role !== 'estimator' && user.role !== 'admin') {
      throw new AppError(403, 'AI costing suggestions can only be requested by estimators');
    }

    const revStatus = context.revision?.status;
    if (revStatus === 'pending_review' || revStatus === 'approved') {
      throw new AppError(409, 'AI suggestions are locked for this submitted costing revision.');
    }
    if (revStatus === 'changes_requested') {
      throw new AppError(409, 'AI suggestions are locked for this returned costing revision. Create a new revision to request AI suggestions.');
    }

    if (rfqLifecycleStatus && !['draft', 'in_progress', 'returned_for_revision'].includes(rfqLifecycleStatus)) {
      throw new AppError(409, 'AI review is disabled because this RFQ has moved to the next workflow stage.');
    }
  } else if (reviewType === 'routing_review') {
    // Plant Head routing review
    if (user.role === 'estimator' && !input.isSubmissionPrecheck) {
      throw new AppError(403, 'Estimators cannot independently trigger routing reviews');
    }

    const revStatus = context.revision?.status;
    if (revStatus === 'approved' || revStatus === 'changes_requested') {
      throw new AppError(409, 'AI review is complete for this workflow stage.');
    }

    if (
      rfqLifecycleStatus &&
      ['pending_sales_approval', 'ready_for_quote', 'quoted', 'closed', 'cancelled'].includes(rfqLifecycleStatus)
    ) {
      throw new AppError(409, 'AI review is disabled because this RFQ has moved to the next workflow stage.');
    }
  } else if (reviewType === 'commercial_review') {
    // Sales Head commercial review
    if (user.role !== 'sales_head' && user.role !== 'admin') {
      throw new AppError(403, 'Commercial AI reviews can only be requested by the sales head');
    }

    const commStatus = context.commercialReview?.status;
    if (commStatus === 'approved' || commStatus === 'changes_requested') {
      throw new AppError(409, 'AI review is complete for this workflow stage.');
    }

    if (
      rfqLifecycleStatus &&
      ['ready_for_quote', 'quoted', 'closed', 'cancelled'].includes(rfqLifecycleStatus)
    ) {
      throw new AppError(409, 'AI review is disabled because this RFQ has moved to the next workflow stage.');
    }
  }

  // Check cache (scoped to reviewType, role, target entity and row version)
  const cacheKey = `${reviewType}:${user.role}:${costingRevisionId || commercialReviewId || rfqId}:${targetVersion}`;
  const cached = getCached(cacheKey);
  if (cached && !input.forceLive) {
    return cached;
  }

  // 2. Run deterministic validation
  let deterministicFindings = [];
  if (reviewType === 'costing_review') {
    deterministicFindings = deterministic.validateCosting(context);
  } else if (reviewType === 'routing_review') {
    deterministicFindings = deterministic.validateRouting(context);
  } else if (reviewType === 'commercial_review') {
    deterministicFindings = deterministic.validateCommercial(context);
  }

  // Check if critical blockers prevent model call (e.g. draft not saved or 0 operations)
  const hasFatalBlocker = deterministicFindings.some(f =>
    ['COSTING_DRAFT_NOT_SAVED', 'ROUTING_NO_OPERATIONS', 'COMMERCIAL_NO_COSTING_REVISION'].includes(f.code)
  );

  let finalReview;

  if (hasFatalBlocker) {
    const fatal = deterministicFindings.find(f =>
      ['COSTING_DRAFT_NOT_SAVED', 'ROUTING_NO_OPERATIONS', 'COMMERCIAL_NO_COSTING_REVISION'].includes(f.code)
    );
    finalReview = {
      reviewType,
      status: 'insufficient_evidence',
      summary: fatal.message,
      findings: deterministicFindings,
      recommendations: [fatal.recommendation].filter(Boolean),
      limitations: ['Context is incomplete; please address mandatory prerequisites before requesting AI analysis.'],
      metadata: { deterministicOnly: true }
    };
  } else {
    // 3. Call Groq for synthesis and advisory insights
    let aiResult;
    try {
      aiResult = await groqClient.callGroqReview({
        reviewType,
        context,
        deterministicFindings,
        correlationId: input.correlationId
      });
    } catch (groqError) {
      // If Groq fails (e.g. rate limit, provider down, or unparseable response),
      // we do NOT fail the review; return deterministic findings with a clear limitation note
      if (deterministicFindings.length > 0) {
        finalReview = {
          reviewType,
          status: 'completed',
          summary: `Deterministic review completed. (AI model advisory was unavailable: ${groqError.message})`,
          findings: deterministicFindings,
          recommendations: deterministicFindings.map(f => f.recommendation).filter(Boolean),
          limitations: [`AI model synthesis unavailable: ${groqError.message}`],
          metadata: { deterministicOnly: true, providerError: groqError.message }
        };
      } else {
        throw groqError;
      }
    }

    if (!finalReview) {
      // 4. Merge deterministic findings with model findings
      const existingCodes = new Set(deterministicFindings.map(f => f.code));
      const modelFindings = (aiResult.findings || []).map((f, idx) => {
        const rawCode = (f.code || `AI_OBSERVATION_${idx + 1}`).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const code = existingCodes.has(rawCode) ? `${rawCode}_AI` : rawCode;
        const severity = ['critical', 'warning', 'info'].includes(f.severity?.toLowerCase())
          ? f.severity.toLowerCase()
          : 'info';

        return {
          code,
          severity,
          title: f.title || 'Model Observation',
          message: f.message || f.explanation || 'No detailed message provided.',
          affectedRecord: f.affectedRecord || f.affectedField,
          evidence: f.evidence || f.basis,
          recommendation: f.recommendation,
          source: 'ai_analysis'
        };
      });

      const mergedFindings = [...deterministicFindings, ...modelFindings];
      const hasCritical = mergedFindings.some(f => f.severity === 'critical');

      finalReview = {
        reviewType,
        status: hasCritical && deterministicFindings.some(f => f.severity === 'critical') ? 'insufficient_evidence' : 'completed',
        summary: aiResult.summary,
        findings: mergedFindings,
        recommendations: aiResult.recommendations || [],
        limitations: aiResult.limitations || [],
        metadata: aiResult.modelMetadata || {}
      };
    }
  }

  // 5. Persist to audit log and ai_reviews table
  if (rfqId) {
    try {
      await repository.insertReview({
        reviewType,
        rfqId,
        costingRevisionId: costingRevisionId || null,
        commercialReviewId: commercialReviewId || null,
        revisionNumber: context.revision?.revision || context.costingRevision?.revision || null,
        actorId: user.id,
        status: finalReview.status,
        summary: finalReview.summary,
        findings: finalReview.findings,
        recommendations: finalReview.recommendations,
        limitations: finalReview.limitations,
        modelMetadata: finalReview.metadata
      });

      await audit.record({ query: pool.query.bind(pool) }, {
        actorId: user.id,
        entityType: reviewType,
        entityId: costingRevisionId || commercialReviewId || rfqId,
        action: 'ai_review_performed',
        metadata: {
          status: finalReview.status,
          findingsCount: finalReview.findings.length,
          criticalCount: finalReview.findings.filter(f => f.severity === 'critical').length
        }
      });
    } catch (persistErr) {
      console.warn('Failed to persist AI review history:', persistErr.message);
    }
  }

  // Cache result
  setCached(cacheKey, finalReview);
  return finalReview;
}

export async function getReviewHistory({ rfqId, costingRevisionId, commercialReviewId, user }) {
  return repository.listReviews({ rfqId, costingRevisionId, commercialReviewId });
}

