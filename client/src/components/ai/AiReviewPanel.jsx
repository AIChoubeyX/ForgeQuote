import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../../lib/api.js';

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
    <section className="panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-forge" />
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
            Read-only validation and advisory checks for this revision. Human decisions remain authoritative.
          </p>
        </div>
        <button
          className="button border border-[#292D34] bg-[#181818] text-[#F5F5F5] hover:border-forge hover:text-forge disabled:opacity-50 transition-colors"
          type="button"
          disabled={loading || !hasContextSource}
          onClick={review}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-forge" />
              Reviewing…
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
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#111111] border border-[#292D34] p-3 text-xs text-[#A3A3A3]">
          <Info size={15} className="mt-0.5 shrink-0 text-forge" />
          <span>Save a costing draft or select a submitted record before requesting AI review.</span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
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
        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#292D34]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#292D34]" />
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-[#111111] border border-[#292D34] p-3 text-sm text-[#A3A3A3]">
            <p className="font-medium text-[#F5F5F5]">Summary</p>
            <p className="mt-1 text-xs leading-relaxed text-[#A3A3A3]">{result.summary}</p>
          </div>

          {result.status === 'insufficient_evidence' && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-400">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
              <span>Insufficient context or incomplete mandatory inputs for a full review.</span>
            </div>
          )}

          {result.limitations && result.limitations.length > 0 && (
            <div className="rounded-lg border border-[#292D34] bg-[#111111] p-2.5 text-xs text-[#A3A3A3]">
              <strong className="block text-[#F5F5F5]">Review Limitations:</strong>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[#737373]">
                {result.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}

          {result.findings && result.findings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Findings ({result.findings.length})
              </p>
              {result.findings.map((item, index) => {
                const isCritical = item.severity === 'critical';
                const isWarning = item.severity === 'warning';
                return (
                  <div
                    className={`rounded-lg border p-3 text-xs ${
                      isCritical
                        ? 'border-[#EF4444]/30 bg-[#EF4444]/10'
                        : isWarning
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-[#292D34] bg-[#111111]'
                    }`}
                    key={`${item.code || item.title || index}-${index}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-[#EF4444]/20 text-[#EF4444]'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-[#FF5A1F]/20 text-[#FF5A1F]'
                      }`}>
                        {item.severity}
                      </span>
                      {item.code && (
                        <span className="font-mono text-[10px] text-[#737373]">
                          [{item.code}]
                        </span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        item.source === 'deterministic'
                          ? 'bg-[#292D34] text-[#A3A3A3]'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {item.source === 'deterministic' ? 'Verified Check' : 'AI Advisory'}
                      </span>
                    </div>

                    <strong className="block text-[#F5F5F5] text-xs">{item.title || item.message}</strong>
                    {item.title && item.title !== item.message && (
                      <p className="mt-1 text-[#A3A3A3]">{item.message}</p>
                    )}

                    {item.affectedRecord && (
                      <p className="mt-1 text-[11px] text-[#737373]">
                        <strong>Affected:</strong> {item.affectedRecord}
                      </p>
                    )}

                    {(item.evidence || item.basis) && (
                      <p className="mt-1 rounded bg-[#181818] p-1.5 font-mono text-[11px] text-[#A3A3A3] border border-[#292D34]">
                        <strong>Evidence:</strong> {item.evidence || item.basis}
                      </p>
                    )}

                    {item.recommendation && (
                      <p className="mt-1.5 text-xs text-forge font-medium">
                        → Action: {item.recommendation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="rounded-lg border border-[#292D34] bg-[#111111] p-3 text-xs">
              <strong className="block text-[#F5F5F5] text-xs mb-1">Recommended Next Steps</strong>
              <ul className="list-disc pl-4 space-y-1 text-[#A3A3A3]">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
