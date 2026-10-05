import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import type { UploadedSubmission } from '../../store/store';
import { useStore } from '../../store/store';
import { citations, framework, precedents, rulesById } from '../../data';
import { assembleAssessment, buildSystemPrompt, liveOutputSchema, type LiveContext } from '../../lib/liveAssessment';
import { LiveAssessmentError, requestLiveAssessment } from '../../lib/liveClient';
import { AiTag } from '../ui';

const ctx: LiveContext = { framework, citations, precedents, rulesById };

/**
 * Optional live assessment for an uploaded rule (off by default). The visitor's API key is held in this
 * component's memory only: never written to storage, the store, the audit trail or a log, and dropped when the
 * page changes. Without a key, the rule waits for a full assessment, as described below.
 */
export default function LiveAssessment({ upload }: { upload: UploadedSubmission }) {
  const attach = useStore((s) => s.attachLiveAssessment);
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  // Cancel any request and forget the key when the reviewer leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function run() {
    setError(null);
    setProblems([]);
    setElapsed(0);
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const similar = upload.similar.slice(0, 5);
      const out = await requestLiveAssessment({
        apiKey: apiKey.trim(),
        system: buildSystemPrompt(ctx, upload.rule, similar),
        ruleId: upload.id,
        schema: liveOutputSchema(ctx, similar.map((s) => s.id)),
        signal: controller.signal,
      });
      const result = assembleAssessment(out, upload.rule, similar, ctx, new Date().toISOString().slice(0, 10));
      if (!result.assessment) {
        setProblems(result.errors);
        setError('The AI output failed Simrule’s validation, so it was not added. Nothing was changed.');
        return;
      }
      setApiKey('');
      attach(upload.id, result.assessment);
    } catch (e) {
      setError(e instanceof LiveAssessmentError ? e.message : 'Something went wrong. Nothing was changed.');
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <section className="card p-4" aria-labelledby={`live-${upload.id}`} data-testid="live-assessment">
      <h2 id={`live-${upload.id}`} className="flex items-center gap-2 text-lg font-semibold">
        <Bot size={18} aria-hidden /> Full AI assessment
      </h2>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Full assessments are precomputed for the 100 seeded rules. In production this step would run server-side with the same prompt (<code>prompts/assessment-prompt.md</code>), the same validation and the same deterministic scoring, and the rule would then move to Analyst review.
      </p>

      <label className="mt-3 flex items-start gap-2 text-sm font-semibold">
        <input type="checkbox" className="mt-1" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} data-testid="live-enable" />
        <span>
          Optional: run it now with your own Anthropic API key
          <span className="block text-xs font-normal text-[var(--color-ink-muted)]">Off by default. Only for visitors who want to see the live pipeline.</span>
        </span>
      </label>

      {enabled && (
        <div className="mt-3 space-y-3 rounded-md border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-sm">
          <ul className="space-y-1 text-xs">
            <li className="flex gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--color-pine-700)]" aria-hidden />
              Your key stays in this page’s memory only. It is never saved to your browser storage, the audit trail or this site, and it is forgotten when you leave the page or the run succeeds.
            </li>
            <li className="flex gap-2">
              <KeyRound size={14} className="mt-0.5 shrink-0 text-[var(--color-pine-700)]" aria-hidden />
              Your browser sends the filing and your key directly to Anthropic’s API. Usage is billed to your account (one run is typically well under one US dollar). Use a key with a spending limit and do not use this on a shared computer.
            </li>
            <li className="flex gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--color-gold-700)]" aria-hidden />
              The result is advisory. Simrule checks it against the schema, drops any quote that is not word for word, computes the recommendation itself, and sends the rule to Analyst review, where every finding still needs a human.
            </li>
          </ul>
          <label className="block">
            <span className="label">Anthropic API key</span>
            <input
              type="password"
              className="field font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-..."
              data-lpignore="true"
              data-1p-ignore="true"
              data-testid="live-key"
              disabled={running}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary" disabled={running || apiKey.trim().length < 20} onClick={() => void run()} data-testid="live-run">
              {running ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Bot size={15} aria-hidden />}
              {running ? `Assessing… ${elapsed}s` : 'Run live assessment'}
            </button>
            {running && (
              <button type="button" className="btn btn-secondary" onClick={() => abortRef.current?.abort()}>
                <X size={15} aria-hidden /> Cancel
              </button>
            )}
            {!running && apiKey && (
              <button type="button" className="btn btn-ghost" onClick={() => setApiKey('')}>
                Forget key
              </button>
            )}
            <AiTag>AI recommendation (advisory)</AiTag>
          </div>
          {running && <p className="text-xs text-[var(--color-ink-muted)]" role="status">A careful assessment of 15 criteria usually takes one to three minutes.</p>}
          {error && (
            <div role="alert" className="rounded-md border border-[var(--color-stop-600)] bg-[var(--color-stop-50)] text-[var(--color-stop-700)] px-3 py-2 text-xs" data-testid="live-error">
              <p className="font-semibold">{error}</p>
              {problems.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {problems.slice(0, 8).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
