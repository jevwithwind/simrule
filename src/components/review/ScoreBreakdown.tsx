import { framework } from '../../data';
import type { ScoreResult } from '../../lib/scoring';

export default function ScoreBreakdown({ ai, human, changed }: { ai: ScoreResult; human: ScoreResult; changed: boolean }) {
  const t = framework.scoring.thresholds;
  return (
    <details className="group rounded-lg border border-[var(--color-line)] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-pine-900)]">
        <span>Score breakdown and formula</span>
        <span className="text-xs font-normal text-[var(--color-ink-muted)] group-open:hidden">Show</span>
        <span className="hidden text-xs font-normal text-[var(--color-ink-muted)] group-open:inline">Hide</span>
      </summary>
      <div className="space-y-3 border-t border-[var(--color-line)] px-3 py-3 text-sm">
        <table className="w-full text-xs">
          <caption className="sr-only">Score by Level</caption>
          <thead>
            <tr className="text-left text-[var(--color-ink-muted)]">
              <th className="py-1">Level</th>
              <th className="py-1 text-right">Weight</th>
              <th className="py-1 text-right">AI average</th>
              <th className="py-1 text-right">AI points</th>
              {changed && <th className="py-1 text-right">After human review</th>}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--color-line-soft)]">
              <td className="py-1">Level 1 (gate)</td>
              <td className="py-1 text-right" colSpan={changed ? 4 : 3}>
                Any fail is a hard stop; not scored
              </td>
            </tr>
            {ai.levels.map((l, i) => (
              <tr key={l.level} className="border-t border-[var(--color-line-soft)]">
                <td className="py-1">Level {l.level}</td>
                <td className="py-1 text-right">{l.weight}</td>
                <td className="py-1 text-right">{l.average.toFixed(2)}</td>
                <td className="py-1 text-right">{l.points.toFixed(1)}</td>
                {changed && <td className="py-1 text-right font-semibold">{human.levels[i].points.toFixed(1)}</td>}
              </tr>
            ))}
            <tr className="border-t border-[var(--color-line)] font-semibold">
              <td className="py-1">Total</td>
              <td />
              <td />
              <td className="py-1 text-right">{ai.score ?? 'n/a'}</td>
              {changed && <td className="py-1 text-right">{human.score ?? 'n/a'}</td>}
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-[var(--color-ink-muted)]">{framework.scoring.formula}</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-xs text-[var(--color-ink-muted)]">
          {framework.scoring.ruleOrder.map((r) => (
            <li key={r}>{r.replace(/^\d+\.\s*/, '')}</li>
          ))}
        </ol>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Thresholds: approve with conditions at {t.approveWithConditions} or above; request more information from {t.requestMoreInformation} to {t.approveWithConditions - 1}. Why this
          result: <span className="text-[var(--color-ink)]">{(changed ? human : ai).reasons.join(' ')}</span>
        </p>
      </div>
    </details>
  );
}
