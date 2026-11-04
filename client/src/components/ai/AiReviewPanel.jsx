import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api.js';
import { MarkdownRenderer } from '../ui/MarkdownRenderer.jsx';

export function AiReviewPanel({
  feature = 'costing',
  reviewType,
  costingRevisionId,
  commercialReviewId,
  rfqId,
  context,
  contextEndpoint
}) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const targetType = reviewType || feature;
  const targetId = costingRevisionId || commercialReviewId || rfqId || context?.id;
  const rowVersion = context?.row_version || context?.rowVersion || context?.revision;
  const hasContextSource = Boolean(targetId || context || contextEndpoint);

  // Invalidate previous results when the target record or revision changes
  useEffect(() => {
    setResult(null);
    setError('');
  }, [targetId, rowVersion, targetType]);

  async function review() {
    setLoading(true);
    setError('');
    try {
      let sourceContext = context;
      if (!sourceContext && contextEndpoint) {
        try {
          const res = await api(contextEndpoint);
          sourceContext = res.data;
        } catch {
          // contextEndpoint might fail if record not saved yet
        }
      }

      const payload = {
        reviewType: targetType,
        costingRevisionId: costingRevisionId || (targetType === 'routing' ? targetId : undefined),
        commercialReviewId: commercialReviewId || (targetType === 'commercial' ? targetId : undefined),
        rfqId: rfqId || context?.rfq_id,
        context: sourceContext || (typeof context === 'object' ? context : undefined)
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

  return (
    <section className="panel" aria-label="AI review assistance">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-forge shrink-0" />
            <h2 className="font-display text-lg font-semibold text-[#F5F5F5]">AI review assistance</h2>
            {result?.status && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                result.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : result.status === 'insufficient_evidence'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-[#111111] text-[#A3A3A3] border border-[#292D34]'
              }`}>
                {result.status === 'completed' && <CheckCircle2 size={12} />}
                {result.status === 'insufficient_evidence' && <AlertTriangle size={12} />}
                {result.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#737373]">
            Advisory validation and domain checks for this revision. Human decisions remain authoritative.
          </p>
        </div>
        <button
          className="button border border-[#292D34] bg-[#181818] text-[#F5F5F5] hover:border-forge hover:text-forge disabled:opacity-50 transition-colors shrink-0"
          type="button"
          disabled={loading || !hasContextSource}
          onClick={review}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-forge" />
              Analyzing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-forge" />
              {result ? 'Refresh review' : 'Review with AI'}
            </span>
          )}
        </button>
      </div>

      {!hasContextSource && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#111111] border border-[#292D34] p-3 text-xs text-[#A3A3A3]">
          <Info size={15} className="mt-0.5 shrink-0 text-forge" />
          <span>Save a costing draft or select an active record to trigger an AI review.</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#EF4444]" />
              <span>{error}</span>
            </div>
            <button
              className="font-semibold underline hover:text-white"
              type="button"
              onClick={review}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && !result && (
        <div className="mt-4 space-y-2.5 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-[#202020]" />
          <div className="h-4 w-1/2 rounded bg-[#202020]" />
          <div className="h-20 w-full rounded bg-[#111111] border border-[#292D34]" />
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          {/* Executive Summary with Markdown Rendering */}
          <div className="rounded-lg bg-[#111111] border border-[#292D34] p-3.5 text-sm">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#292D34] mb-2">
              <strong className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">Executive Summary</strong>
              <span className="text-[11px] text-[#737373]">Automated Assessment</span>
            </div>
            <MarkdownRenderer content={result.summary} />
          </div>

          {result.status === 'insufficient_evidence' && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <strong className="block font-semibold">Insufficient Context for Comprehensive Review</strong>
                <span className="mt-0.5 block leading-relaxed text-[#A3A3A3]">
                  Some input values or baseline rate versions are missing. Review the limitations below before final sign-off.
                </span>
              </div>
            </div>
          )}

          {/* Limitations List */}
          {result.limitations && result.limitations.length > 0 && (
            <div className="rounded-lg border border-[#292D34] bg-[#111111] p-3 text-xs">
              <strong className="block text-[#F5F5F5] font-semibold mb-1.5">Review Limitations & Assumptions</strong>
              <ul className="list-disc pl-4 space-y-1 text-[#737373]">
                {result.limitations.map((lim, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <MarkdownRenderer content={lim} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Findings List */}
          {result.findings && result.findings.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                  Findings ({result.findings.length})
                </span>
                <span className="text-[10px] text-[#737373]">Ranked by severity</span>
              </div>

              {result.findings.map((item, index) => {
                const isCritical = item.severity === 'critical';
                const isWarning = item.severity === 'warning';
                return (
                  <div
                    className={`rounded-lg border p-3.5 text-xs transition-colors ${
                      isCritical
                        ? 'border-[#EF4444]/40 bg-[#EF4444]/10'
                        : isWarning
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-[#292D34] bg-[#111111]'
                    }`}
                    key={`${item.code || item.title || index}-${index}`}
                  >
                    {/* Header tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-[#EF4444]/20 text-[#EF4444]'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-[#FF5A1F]/20 text-forge'
                      }`}>
                        {isCritical && <AlertCircle size={11} />}
                        {isWarning && <AlertTriangle size={11} />}
                        {!isCritical && !isWarning && <Info size={11} />}
                        {item.severity}
                      </span>

                      {item.code && (
                        <span className="font-mono text-[10px] text-[#737373] bg-[#181818] border border-[#292D34] px-1.5 py-0.5 rounded">
                          {item.code}
                        </span>
                      )}

                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        item.source === 'deterministic'
                          ? 'bg-[#181818] text-[#A3A3A3] border border-[#292D34]'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}>
                        {item.source === 'deterministic' ? 'Verified Formula Check' : 'AI Advisory'}
                      </span>

                      {item.affectedRecord && (
                        <span className="ml-auto rounded bg-[#181818] border border-[#292D34] px-1.5 py-0.5 text-[10px] text-forge font-mono">
                          {item.affectedRecord}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <strong className="block text-[#F5F5F5] text-xs font-semibold">
                      {item.title || item.message}
                    </strong>

                    {/* Message / Explanation with Markdown */}
                    {item.title && item.title !== (item.message || item.explanation) && (
                      <div className="mt-1.5 text-[#A3A3A3]">
                        <MarkdownRenderer content={item.message || item.explanation} />
                      </div>
                    )}

                    {/* Evidence Quote / Basis */}
                    {(item.evidence || item.basis) && (
                      <div className="mt-2 rounded bg-[#181818] p-2 text-[11px] text-[#A3A3A3] border border-[#292D34]">
                        <span className="block font-semibold text-[#737373] text-[10px] uppercase tracking-wider mb-0.5">
                          Evidence / Basis:
                        </span>
                        <MarkdownRenderer content={item.evidence || item.basis} />
                      </div>
                    )}

                    {/* Actionable Recommendation */}
                    {item.recommendation && (
                      <div className="mt-2 text-xs text-forge font-medium flex items-start gap-1.5 bg-[#FF5A1F]/10 p-2 rounded border border-[#66301C]">
                        <span className="shrink-0 font-bold">→</span>
                        <div className="min-w-0">
                          <strong className="font-semibold text-forge">Recommendation: </strong>
                          <MarkdownRenderer content={item.recommendation} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actionable Recommendations List */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="rounded-lg border border-[#292D34] bg-[#111111] p-3 text-xs">
              <strong className="block text-[#F5F5F5] font-semibold mb-2">Recommended Verification Steps</strong>
              <ul className="list-disc pl-4 space-y-1.5 text-[#A3A3A3]">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <MarkdownRenderer content={rec} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Human Authority Advisory Banner */}
          <div className="flex items-center gap-2 rounded bg-[#181818] border border-[#292D34] px-3 py-2 text-[11px] text-[#737373]">
            <ShieldAlert size={14} className="text-forge shrink-0" />
            <span>AI guidance is strictly advisory. Pricing release requires human departmental authorization.</span>
          </div>
        </div>
      )}
    </section>
  );
}
