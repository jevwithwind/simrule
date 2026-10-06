import { History } from 'lucide-react';
import type { AuditEvent } from '../../lib/workflow';
import { cx } from '../ui';
import { humaniseAuditText as h, humaniseFinding } from '../../data';

export default function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="card p-4" aria-labelledby="audit-h" data-testid="audit-timeline">
      <h2 id="audit-h" className="flex items-center gap-2 text-lg font-semibold">
        <History size={18} aria-hidden /> Audit trail
      </h2>
      <p className="mb-2 text-xs text-[var(--color-ink-muted)]">Every action, newest first: time, who, role, what changed and why.</p>
      <ol className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {sorted.map((e) => (
          <li key={e.id} className="border-l-2 border-[var(--color-line)] pl-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold text-[var(--color-ink)]">{h(e.action)}</span>
            </div>
            <div className="text-[var(--color-ink-muted)]">
              {new Date(e.at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
              <span className={cx(e.role === 'AI (advisory)' && 'text-[var(--color-gold-700)]')}>
                {e.actor} · {e.role}
              </span>
            </div>
            {e.detail && <div className="mt-0.5 text-[var(--color-ink)]">{h(e.detail)}</div>}
            {(e.before || e.after) && (
              <div className="mt-0.5">
                {e.before && <span className="text-[var(--color-ink-muted)] line-through">{humaniseFinding(e.before)}</span>} {e.after && <span>→ {humaniseFinding(e.after)}</span>}
              </div>
            )}
            {e.reason && <div className="mt-0.5 italic">Reason: {h(e.reason)}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
