import { Link } from 'react-router-dom';
import { ArrowLeft, Hourglass, Search } from 'lucide-react';
import { precedentsById, rulesById, issueCodesByCode } from '../../data';
import type { UploadedSubmission } from '../../store/store';
import type { AuditEvent, CaseState } from '../../lib/workflow';
import { StageBadge, IssueChip, AiTag } from '../ui';
import { ChecklistTable } from '../../pages/RuleReview';
import { WorkflowStepper } from './DecisionPanel';
import AuditTimeline from './AuditTimeline';
import LiveAssessment from './LiveAssessment';

export default function UploadReview({ upload, caseState, events }: { upload: UploadedSubmission; caseState?: CaseState; events: AuditEvent[] }) {
  const r = upload.rule;
  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-pine-800)] underline-offset-2 hover:underline">
        <ArrowLeft size={15} aria-hidden /> Back to queue
      </Link>
      <header className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold">{r.id}</h1>
          <StageBadge stage={caseState?.stage ?? 'AI_PRE_ASSESSMENT'} />
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-gold-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-gold-700)]">
            <Hourglass size={12} aria-hidden /> Awaiting full AI assessment
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {r.insurer || 'Unknown insurer'} · {r.dateSubmitted || 'no date'} · {upload.source.fileName ? `uploaded file ${upload.source.fileName}` : `entered by ${upload.source.method}`} · extraction confirmed by reviewer
        </p>
        <div className="mt-3">
          <WorkflowStepper stage={caseState?.stage ?? 'AI_PRE_ASSESSMENT'} />
        </div>
        <p className="mt-3 font-serif text-lg">{r.ruleText}</p>
        <p className="mt-2 text-sm">{r.rationale || <em>No rationale supplied.</em>}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4" aria-labelledby="triage-h">
          <h2 id="triage-h" className="text-lg font-semibold">
            Keyword triage
          </h2>
          <p className="mt-1">
            <AiTag>{upload.triage.label}</AiTag>
          </p>
          <p className="mt-2 text-sm">
            <strong>Scope:</strong> {upload.triage.scope.note}
          </p>
          {upload.triage.flags.length ? (
            <ul className="mt-3 space-y-2">
              {upload.triage.flags.map((f) => (
                <li key={f.code} className="rounded-md border border-[var(--color-line)] p-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <IssueChip code={f.code} />
                    <span className="text-xs text-[var(--color-ink-muted)]">Level {f.level}</span>
                  </div>
                  <p className="mt-1 text-xs">
                    Matched "<strong>{f.matched}</strong>". {f.why}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{issueCodesByCode.get(f.code)?.remedy}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">No keyword flags. That does not mean the rule is compliant: a full assessment of all 15 criteria is still needed.</p>
          )}
        </section>
        <section className="card p-4" aria-labelledby="sim-h">
          <h2 id="sim-h" className="flex items-center gap-2 text-lg font-semibold">
            <Search size={18} aria-hidden /> Most similar existing rules
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {upload.similar.map((s) => {
              const sub = rulesById.get(s.id);
              const p = precedentsById.get(s.id);
              return (
                <li key={s.id} className="rounded-md border border-[var(--color-line)] p-2">
                  <div className="flex items-center justify-between gap-2">
                    {sub ? (
                      <Link to={`/rule/${s.id}`} className="font-semibold text-[var(--color-pine-900)] underline underline-offset-2">
                        {s.id}
                      </Link>
                    ) : (
                      <span className="font-semibold">{s.id}</span>
                    )}
                    <span className="text-xs tabular-nums">{Math.round(s.score * 100)}% similar</span>
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)]">{sub?.ruleText ?? p?.ruleText}</p>
                  {p && <p className="text-xs font-semibold">{p.outcome}{p.insurer ? ` · ${p.insurer} ${p.approvalYear} (illustrative)` : ''}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card p-4" aria-labelledby="cl-h">
        <h2 id="cl-h" className="text-lg font-semibold">
          Completeness check (prototype checklist)
        </h2>
        <ChecklistTable rows={upload.checklist} />
      </section>

      <LiveAssessment upload={upload} />
      <AuditTimeline events={events} />
    </div>
  );
}
