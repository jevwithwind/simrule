import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { aiScores, assessmentsById, framework, rulesById } from '../data';
import { useStore } from '../store/store';
import { currentOutcome, effectiveCriteria } from '../lib/workflow';
import { RecBadge, StageBadge, StatusBadge, cx } from '../components/ui';
import NotFound from './NotFound';

export default function Compare() {
  const { a = '', b = '' } = useParams();
  const cases = useStore((s) => s.cases);
  const ids = [a, b];
  const rules = ids.map((id) => rulesById.get(id));
  const assess = ids.map((id) => assessmentsById.get(id));
  if (rules.some((r) => !r) || assess.some((x) => !x)) return <NotFound />;
  const crit = ids.map((id, i) => effectiveCriteria(assess[i]!, cases[id]));
  const link = assess[0]!.precedents.find((p) => p.refId === b) ?? assess[1]!.precedents.find((p) => p.refId === a);

  return (
    <div className="space-y-5">
      <Link to={`/rule/${a}`} className="inline-flex items-center gap-1 text-sm text-[var(--color-pine-800)] underline-offset-2 hover:underline">
        <ArrowLeft size={15} aria-hidden /> Back to {a}
      </Link>
      <div>
        <div className="eyebrow">Review together</div>
        <h1 className="text-3xl font-bold">
          {a} and {b}
        </h1>
        {link && (
          <p className="mt-2 max-w-4xl text-sm">
            <strong>Why these are compared ({Math.round(link.similarity * 100)}% similar, {link.relation.replace('_', ' ')}):</strong> {link.explanation}
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {ids.map((id, i) => {
          const r = rules[i]!;
          const ai = aiScores.get(id)!;
          const out = currentOutcome(ai, cases[id]);
          return (
            <section key={id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/rule/${id}`} className="text-xl font-semibold text-[var(--color-pine-900)] underline underline-offset-2">
                  {id}
                </Link>
                <StageBadge stage={cases[id]?.stage ?? 'ANALYST_REVIEW'} />
              </div>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {r.insurer} · {r.dateSubmitted}
              </p>
              <p className="mt-2 font-serif text-lg">{r.ruleText}</p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{r.rationale}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="ai-tag">AI</span>
                <RecBadge rec={ai.recommendation} />
                <span className="text-sm tabular-nums">score {ai.score ?? 'n/a'}</span>
                {out.source !== 'ai' && (
                  <>
                    <span className="human-tag">{out.source === 'human' ? 'Human decision' : 'Proposed'}</span>
                    <RecBadge rec={out.outcome} />
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <section className="card overflow-x-auto p-4">
        <h2 className="mb-2 text-lg font-semibold">Findings side by side</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-ink-muted)]">
              <th className="py-1">Criterion</th>
              <th className="py-1">{a}</th>
              <th className="py-1">{b}</th>
            </tr>
          </thead>
          <tbody>
            {framework.levels.flatMap((l) =>
              l.criteria.map((c) => {
                const x = crit[0].find((k) => k.key === c.key)!;
                const y = crit[1].find((k) => k.key === c.key)!;
                const differs = x.status !== y.status;
                return (
                  <tr key={c.key} className={cx('border-t border-[var(--color-line-soft)]', differs && 'bg-[var(--color-gold-100)]/50')}>
                    <td className="py-1.5 pr-2">
                      <span className="text-xs text-[var(--color-ink-muted)]">L{l.level}</span> {c.label}
                      {differs && <span className="ml-1 text-xs font-semibold text-[var(--color-gold-700)]">differs</span>}
                    </td>
                    <td className="py-1.5 pr-2">
                      <StatusBadge status={x.status} />
                    </td>
                    <td className="py-1.5">
                      <StatusBadge status={y.status} />
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
