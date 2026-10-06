import { Users } from 'lucide-react';
import type { Assessment } from '../../lib/schema';
import { SeverityBadge } from '../ui';

export default function ConsumerLens({ assessment }: { assessment: Assessment }) {
  const ci = assessment.consumerImpact;
  return (
    <section className="card border-l-4 border-l-[var(--color-gold-500)] p-4" aria-labelledby="consumer-h" data-tour="consumer">
      <div className="flex items-center justify-between gap-2">
        <h2 id="consumer-h" className="flex items-center gap-2 text-lg font-semibold">
          <Users size={18} aria-hidden /> Consumer lens
        </h2>
        <SeverityBadge severity={ci.severity} />
      </div>
      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="label">Who could be refused</dt>
          <dd>{ci.whoCouldBeRefused}</dd>
        </div>
        <div>
          <dt className="label">Likely consequence</dt>
          <dd>{ci.likelyConsequence}</dd>
        </div>
        {ci.vulnerableGroups.length > 0 && (
          <div>
            <dt className="label">Groups most affected</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {ci.vulnerableGroups.map((g) => (
                <span key={g} className="rounded-full bg-[var(--color-gold-100)] px-2 py-0.5 text-xs text-[var(--color-gold-700)]">
                  {g}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
