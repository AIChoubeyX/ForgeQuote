import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Info,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { MarkdownRenderer } from '../ui/MarkdownRenderer.jsx';
import { formatCategory, formatFieldName, cleanEvidenceNumbers, formatEvidence } from '../../lib/formatters.js';

export function AiReviewPanel({
  feature = 'costing',
  reviewType,
  costingRevisionId,
  commercialReviewId,
  rfqId,
  context,
  contextEndpoint,
  isLocked = false,
  lockMessage = ''
}) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetType = reviewType || feature;
  const targetId = costingRevisionId || commercialReviewId || rfqId || context?.id;
  const rowVersion = context?.row_version || context?.rowVersion || context?.revision;
  const hasContextSource = Boolean(targetId || context || contextEndpoint);

  // In locked mode, load the saved historical snapshot from the audit log
  // In active mode, DO NOT auto-populate with stale history; require explicit user click for real live analysis
  useEffect(() => {
    let isMounted = true;

    async function loadHistoricalSnapshot() {
      if (!isLocked || !targetId) return;
      try {
        const queryParams = new URLSearchParams();
        if (costingRevisionId) queryParams.set('costingRevisionId', costingRevisionId);
        else if (commercialReviewId) queryParams.set('commercialReviewId', commercialReviewId);
        else if (rfqId) queryParams.set('rfqId', rfqId);
        else if (targetId) {
          queryParams.set(
            targetType === 'routing' || targetType === 'routing_review'
              ? 'costingRevisionId'
              : targetType === 'commercial' || targetType === 'commercial_review'
              ? 'commercialReviewId'
              : 'rfqId',
            targetId
          );
        }

        const res = await api(`/ai-reviews/history?${queryParams.toString()}`);
        if (isMounted && res.data && res.data.length > 0) {
          // Filter out any mock entries that may exist
          const validReviews = res.data.filter(
            r => !r.summary?.toLowerCase().includes('mocked groq')
          );
          const match =
            validReviews.find(
              r => r.review_type === targetType || r.review_type === `${targetType}_review`
            ) || validReviews[0];

          if (match) {
            setResult({
              status: match.status,
              summary: match.summary,
              findings: typeof match.findings === 'string' ? JSON.parse(match.findings) : match.findings,
              recommendations: typeof match.recommendations === 'string' ? JSON.parse(match.recommendations) : match.recommendations,
              limitations: typeof match.limitations === 'string' ? JSON.parse(match.limitations) : match.limitations,
              metadata: typeof match.model_metadata === 'string' ? JSON.parse(match.model_metadata) : (match.model_metadata || {}),
              isHistorical: true
            });
          }
        }
      } catch {
        // Silently ignore history fetch errors in read-only mode
      }
    }

    setResult(null);
    setError('');

    if (isLocked) {
      loadHistoricalSnapshot();
    }

    return () => {
      isMounted = false;
    };
  }, [targetId, rowVersion, targetType, isLocked]);

  async function review() {
    if (loading || isLocked) return;
    setLoading(true);
    setError('');
    try {
      let sourceContext = context;
      if (!sourceContext && contextEndpoint) {
        try {
          const res = await api(contextEndpoint);
          sourceContext = res.data;
        } catch {
          // Context endpoint optional fallback
        }
      }

      const payload = {
        reviewType: targetType,
        costingRevisionId: costingRevisionId || (targetType === 'routing' || targetType === 'routing_review' ? targetId : undefined),
        commercialReviewId: commercialReviewId || (targetType === 'commercial' || targetType === 'commercial_review' ? targetId : undefined),
        rfqId: rfqId || context?.rfq_id,
        context: sourceContext || (typeof context === 'object' ? context : undefined),
        forceLive: true
      };

      const response = await api('/ai-reviews', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'AI review failed');
    } finally {
      setLoading(false);
    }
  }

  const isRouting = targetType === 'routing' || targetType === 'routing_review';
  const isCommercial = targetType === 'commercial' || targetType === 'commercial_review';

  return (
    <section className="panel min-w-0 w-full border border-[#26262B] bg-[#121214] p-4 sm:p-5 rounded-xl shadow-sm" aria-label="AI review assistance">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0 w-full border-b border-[#26262B] pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forge/10 border border-forge/20 text-forge shrink-0">
              <Sparkles size={15} />
            </div>
            <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
              AI Review Assistance
            </h2>

            {result?.status && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                result.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                  : result.status === 'insufficient_evidence'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                  : 'bg-[#18181B] text-[#A1A1AA] border border-[#27272A]'
              }`}>
                {result.status === 'completed' && <CheckCircle2 size={12} />}
                {result.status === 'insufficient_evidence' && <AlertTriangle size={12} />}
                {result.status === 'completed' ? 'Analysis Complete' : result.status.replace('_', ' ')}
              </span>
            )}

            {result?.isHistorical && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#1F1F23] text-[#A1A1AA] border border-[#2E2E33]">
                Archived Snapshot
              </span>
            )}

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#71717A] ml-auto">
              <Cpu size={12} /> Groq AI Engine
            </span>
          </div>

          <p className="mt-1 text-xs text-[#71717A] leading-relaxed">
            Automated engineering validation & commercial checks. Human engineering decisions remain authoritative.
          </p>
        </div>

        {/* Header Action Button (only shown when locked, loading, or refreshing existing results; avoids duplicate button with hero card) */}
        {(result || isLocked || loading) && (
          <button
            className={`button transition-all duration-200 shrink-0 text-xs py-2 px-3 sm:px-4 self-start rounded-lg font-medium inline-flex items-center gap-2 ${
              isLocked
                ? 'bg-[#18181B] text-[#71717A] border border-[#27272A] opacity-60 cursor-not-allowed'
                : result
                ? 'bg-[#1F1F23] text-[#E4E4E7] border border-[#2E2E33] hover:border-forge hover:text-forge'
                : 'button-primary shadow-sm'
            }`}
            type="button"
            disabled={loading || !hasContextSource || isLocked}
            onClick={review}
            title={isLocked ? lockMessage || 'AI review is locked for this workflow stage' : ''}
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="animate-spin text-forge" />
                <span>Analyzing…</span>
              </>
            ) : isLocked ? (
              <>
                <ShieldAlert size={13} className="text-[#71717A]" />
                <span>Review Locked</span>
              </>
            ) : (
              <>
                <RefreshCw size={13} className="text-forge" />
                <span>Refresh Review</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Lock Notice Banner */}
      {isLocked && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#18181B] border border-[#27272A] p-3 text-xs text-[#A1A1AA]">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-[#E4E4E7]">Stage Completed: </span>
            <span>{lockMessage || 'AI review is disabled because this RFQ has moved to the next workflow stage.'}</span>
          </div>
        </div>
      )}

      {/* Missing Context Notice */}
      {!hasContextSource && !isLocked && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#18181B] border border-[#27272A] p-3 text-xs text-[#A1A1AA]">
          <Info size={15} className="mt-0.5 shrink-0 text-forge" />
          <span>Save a costing draft or select an active item to run the AI review.</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              className="font-semibold underline hover:text-white shrink-0 ml-2"
              type="button"
              onClick={review}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading Shimmer State */}
      {loading && !result && (
        <div className="mt-5 space-y-3.5">
          <div className="flex items-center gap-2 text-xs text-forge font-medium">
            <RefreshCw size={13} className="animate-spin" />
            <span>Analyzing manufacturing context with Groq AI…</span>
          </div>
          <div className="rounded-lg border border-[#26262B] bg-[#16161A] p-4 space-y-3 animate-pulse">
            <div className="h-4 w-1/3 rounded bg-[#26262B]" />
            <div className="h-3 w-5/6 rounded bg-[#202024]" />
            <div className="h-3 w-4/6 rounded bg-[#202024]" />
            <div className="h-16 w-full rounded bg-[#18181C]" />
          </div>
        </div>
      )}

      {/* Inviting State: Active Stage, No Analysis Triggered Yet */}
      {!result && !loading && !isLocked && (
        <div className="mt-4 rounded-xl border border-[#26262B] bg-gradient-to-br from-[#16161A] to-[#121214] p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-forge/10 border border-forge/20 text-forge mb-3">
            <Sparkles size={20} />
          </div>
          <h3 className="font-display text-sm font-semibold text-[#F5F5F5]">
            {isRouting
              ? 'Manufacturing Route & Machine Feasibility Review'
              : isCommercial
              ? 'Commercial Margin & Revenue Exposure Review'
              : 'Authoritative Costing & Rate Conformance Review'}
          </h3>
          <p className="mt-1 text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
            {isRouting
              ? 'Audit machine operation sequence, cycle times, and hourly rate assignments against manufacturing standards before plant approval.'
              : isCommercial
              ? 'Evaluate target gross margins, high-value commercial exposure, and annual volume scaling with Groq AI before quote release.'
              : 'Verify raw material cost, scrap deduction allowance, machine overhead allocation, and final selling price.'}
          </p>
          <button
            className="mt-4 button button-primary text-xs py-2 px-4 shadow-sm inline-flex items-center gap-2"
            type="button"
            onClick={review}
            disabled={loading || !hasContextSource}
          >
            <Sparkles size={14} />
            <span>Analyze with AI</span>
          </button>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="mt-5 space-y-4 min-w-0 w-full">
          {/* Executive Summary Card */}
          <div className="rounded-xl border border-[#27272A] border-l-4 border-l-forge bg-[#16161A] p-4 sm:p-5 text-xs sm:text-sm min-w-0 w-full shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[#26262B] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
                <Sparkles size={13} className="text-forge" />
                Executive Summary
              </span>
              <span className="text-[11px] font-mono text-[#71717A]">
                {result.metadata?.model || 'Groq AI'}
              </span>
            </div>
            <div className="text-[#D4D4D8] leading-relaxed break-words">
              <MarkdownRenderer content={cleanEvidenceNumbers(result.summary)} />
            </div>
          </div>

          {/* Insufficient Context Warning */}
          {result.status === 'insufficient_evidence' && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-400 min-w-0 w-full">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1 break-words">
                <strong className="block font-semibold">Insufficient Data for Complete Review</strong>
                <span className="mt-0.5 block leading-relaxed text-[#A1A1AA]">
                  Some input values or baseline rate versions are missing. Review findings below before final release.
                </span>
              </div>
            </div>
          )}

          {/* Findings List */}
          {result.findings && result.findings.length > 0 && (
            <div className="space-y-3 min-w-0 w-full">
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Observations & Validations ({result.findings.length})
                </span>
                <span className="text-[10px] text-[#71717A]">Ranked by severity</span>
              </div>

              {result.findings.map((item, index) => {
                const isCritical = item.severity === 'critical';
                const isWarning = item.severity === 'warning';
                const categoryLabel = formatCategory(item.code);
                const fieldLabel = formatFieldName(item.affectedRecord || item.affectedField);

                return (
                  <div
                    className={`rounded-xl border p-4 text-xs transition-all min-w-0 w-full ${
                      isCritical
                        ? 'border-rose-500/30 bg-rose-500/5'
                        : isWarning
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-[#26262B] bg-[#16161A]'
                    }`}
                    key={`${item.code || item.title || index}-${index}`}
                  >
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2.5 min-w-0">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-forge/15 text-forge border border-forge/30'
                      }`}>
                        {isCritical && <AlertCircle size={11} />}
                        {isWarning && <AlertTriangle size={11} />}
                        {!isCritical && !isWarning && <CheckCircle2 size={11} />}
                        {item.severity}
                      </span>

                      {categoryLabel && (
                        <span className="text-[11px] font-medium text-[#D4D4D8] bg-[#1F1F23] border border-[#2E2E33] px-2 py-0.5 rounded-md shrink-0">
                          {categoryLabel}
                        </span>
                      )}

                      <span className={`rounded-md px-2 py-0.5 text-[10px] shrink-0 ${
                        item.source === 'deterministic'
                          ? 'bg-[#18181B] text-[#71717A] border border-[#27272A]'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/25'
                      }`}>
                        {item.source === 'deterministic' ? 'Formula Check' : 'AI Analysis'}
                      </span>

                      {fieldLabel && (
                        <span className="ml-auto rounded-md bg-[#1F1F23] border border-[#2E2E33] px-2 py-0.5 text-[11px] text-forge font-medium shrink-0">
                          Field: {fieldLabel}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <strong className="block text-[#F5F5F5] text-sm font-semibold break-words mb-1">
                      {item.title || item.message}
                    </strong>

                    {/* Explanation */}
                    {item.title && item.title !== (item.message || item.explanation) && (
                      <div className="text-[#A1A1AA] leading-relaxed break-words">
                        <MarkdownRenderer content={cleanEvidenceNumbers(item.message || item.explanation)} />
                      </div>
                    )}

                    {/* Evidence Quote / Basis */}
                    {(item.evidence || item.basis) && (
                      <div className="mt-2.5 rounded-lg bg-[#121214] p-2.5 text-[11px] text-[#A1A1AA] border border-[#26262B] min-w-0 w-full">
                        <span className="block font-semibold text-[#71717A] text-[10px] uppercase tracking-wider mb-1">
                          Calculated Basis & Evidence:
                        </span>
                        <div className="font-mono text-[#D4D4D8] break-words">
                          {formatEvidence(item.evidence || item.basis)}
                        </div>
                      </div>
                    )}

                    {/* Actionable Recommendation */}
                    {item.recommendation &&
                      !['none', 'n/a', 'no action required', 'none.'].includes(item.recommendation.trim().toLowerCase()) && (
                      <div className="mt-2.5 rounded-lg bg-forge/10 border border-forge/25 p-2.5 text-xs text-[#E4E4E7] flex items-start gap-2">
                        <Lightbulb size={14} className="mt-0.5 shrink-0 text-forge" />
                        <div className="min-w-0 flex-1 break-words leading-relaxed">
                          <strong className="font-semibold text-forge">Recommended Action: </strong>
                          <span className="text-[#F5F5F5]">{cleanEvidenceNumbers(item.recommendation)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Limitations List */}
          {result.limitations && result.limitations.length > 0 && (
            <div className="rounded-xl border border-[#26262B] bg-[#16161A] p-3.5 text-xs min-w-0 w-full">
              <strong className="block text-[#A1A1AA] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                Review Assumptions & Audit Context
              </strong>
              <ul className="list-disc pl-4 space-y-1 text-[#71717A] break-words">
                {result.limitations.map((lim, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <MarkdownRenderer content={lim} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
