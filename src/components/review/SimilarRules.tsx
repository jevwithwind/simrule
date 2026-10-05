import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { aiScores, precedentsById, rulesById, stageLabel } from '../../data';
import type { Assessment } from '../../lib/schema';
import { currentOutcome } from '../../lib/workflow';
import { useStore } from '../../store/store';
import { RecBadge, StageBadge, cx } from '../ui';

const RELATION: Record<string, string> = { same: 'Same', similar: 'Similar', materially_different: 'Materially different' };

export default function SimilarRules({ assessment }: { assessment: Assessment }) {
  const cases = useStore((s) => s.cases);
  const pendingFlag = assessment.criteria.find((c) => c.key === 'L1_MARKET')?.issueCodes.includes('PENDING_SIMILAR_SUBMISSION');
  const myInsurer = rulesById.get(assessment.id)?.insurer;
  const items = [...assessment.precedents].sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  return (
    <section className="card p-4" aria-labelledby="similar-h" data-tour="similar">
      <h2 id="similar-h" className="text-lg font-semibold">
        Similar rules
      </h2>
      <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
        Compared by text similarity (TF-IDF) plus shared category, trigger, threshold and lookback. The AI says whether each is the same, similar or materially different, and why.
      </p>
      <ul className="space-y-3">
        {items.map((p) => {
          const prec = precedentsById.get(p.refId);
          const sub = rulesById.get(p.refId);
          const c = cases[p.refId];
          const ai = aiScores.get(p.refId);
          const out = ai ? currentOutcome(ai, c) : null;
          const otherInsurer = sub && sub.insurer !== myInsurer;
          const reviewTogether = sub && otherInsurer && pendingFlag && p.relation !== 'materially_different' && c?.stage !== 'DECIDED' && c?.stage !== 'CLOSED';
          return (
            <li key={p.refId} className="rounded-lg border border-[var(--color-line)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                {sub ? (
                  <Link to={`/rule/${p.refId}`} className="font-semibold text-[var(--color-pine-900)] underline underline-offset-2">
                    {p.refId}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--color-pine-900)]">{p.refId}</span>
                )}
                <span className="text-xs text-[var(--color-ink-muted)]">{sub ? `${sub.insurer} · pending submission` : prec?.type === 'approved_precedent' ? `${prec.insurer}, approved ${prec.approvalYear} (illustrative)` : prec?.type === 'illustrative_non_compliant' ? 'Framework non-compliant example' : 'Framework common decline rule'}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="rounded bg-[var(--color-paper)] px-1.5 py-0.5 text-xs font-semibold tabular-nums" title="Similarity score">
                    {Math.round(p.similarity * 100)}% similar
                  </span>
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      p.relation === 'materially_different' ? 'bg-[var(--color-insuf-bg)] text-[var(--color-insuf-fg)]' : 'bg-[var(--color-pine-100)] text-[var(--color-pine-900)]',
                    )}
                  >
                    {RELATION[p.relation]}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-sm italic text-[var(--color-ink)]">"{sub?.ruleText ?? prec?.ruleText}"</p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{p.explanation}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[var(--color-ink-muted)]">How it was decided:</span>
                {prec && (
                  <span className={cx('rounded px-1.5 py-0.5 font-semibold', prec.type === 'illustrative_non_compliant' ? 'bg-[var(--color-fail-bg)] text-white' : 'bg-[var(--color-pass-bg)] text-[var(--color-pass-fg)]')}>
                    {prec.outcome}
                  </span>
                )}
                {sub && out && (
                  <>
                    <StageBadge stage={c?.stage ?? 'ANALYST_REVIEW'} />
                    <RecBadge rec={out.outcome} />
                    <span className="text-[var(--color-ink-muted)]">{out.source === 'human' ? 'human decision' : out.source === 'proposed' ? 'proposed, awaiting sign-off' : 'AI recommendation, not yet decided'}</span>
                  </>
                )}
                {reviewTogether && (
                  <Link to={`/compare/${assessment.id}/${p.refId}`} className="btn btn-secondary ml-auto py-1 text-xs">
                    <Layers size={13} aria-hidden /> Review together
                  </Link>
                )}
              </div>
              {sub && c && <span className="sr-only">Stage {stageLabel(c.stage)}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
