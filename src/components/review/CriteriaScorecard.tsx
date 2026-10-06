import { useState } from 'react';
import { Check, PenLine, Quote, Undo2 } from 'lucide-react';
import { criterionDefsByKey, framework } from '../../data';
import type { Assessment, Criterion, Evidence, Severity, Status } from '../../lib/schema';
import type { CaseState, Override } from '../../lib/workflow';
import { useStore } from '../../store/store';
import { CitationBadge, HumanTag, AiTag, IssueChip, SeverityBadge, StatusBadge, cx } from '../ui';

type EffCriterion = Criterion & { overridden?: Override };

const LEVEL_SCOPE: Record<number, string> = { 1: 'Required', 2: 'Stretch', 3: 'Stretch', 4: 'Stretch' };

export default function CriteriaScorecard({
  assessment,
  criteria,
  caseState,
  editable,
  onEvidence,
  activeQuote,
}: {
  assessment: Assessment;
  criteria: EffCriterion[];
  caseState?: CaseState;
  editable: boolean;
  onEvidence: (e: Evidence) => void;
  activeQuote: string | null;
}) {
  const acceptLevel = useStore((s) => s.acceptLevel);
  return (
    <div className="space-y-5" data-tour="criteria">
      {framework.levels.map((lvl) => {
        const items = criteria.filter((c) => c.level === lvl.level);
        const pending = items.filter((c) => !caseState?.accepted[c.key] && !caseState?.overrides[c.key]).length;
        return (
          <section key={lvl.level} className="card overflow-hidden" aria-labelledby={`lvl-${lvl.level}`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] bg-[var(--color-pine-50)] px-4 py-2.5">
              <div>
                <h3 id={`lvl-${lvl.level}`} className="text-base font-semibold">
                  Level {lvl.level}: {lvl.name}
                </h3>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {LEVEL_SCOPE[lvl.level]} · {lvl.scoringRole}
                </p>
              </div>
              {editable && (
                <button type="button" className="btn btn-secondary py-1 text-xs" disabled={!pending} onClick={() => acceptLevel(assessment.id, lvl.level)} data-testid={`accept-level-${lvl.level}`}>
                  <Check size={14} aria-hidden /> {pending ? `Accept remaining ${pending} AI finding${pending > 1 ? 's' : ''}` : 'All validated'}
                </button>
              )}
            </header>
            <ul className="divide-y divide-[var(--color-line-soft)]">
              {items.map((c) => (
                <CriterionRow key={c.key} c={c} original={assessment.criteria.find((x) => x.key === c.key)!} caseState={caseState} caseId={assessment.id} editable={editable} onEvidence={onEvidence} activeQuote={activeQuote} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function CriterionRow({
  c,
  original,
  caseState,
  caseId,
  editable,
  onEvidence,
  activeQuote,
}: {
  c: EffCriterion;
  original: Criterion;
  caseState?: CaseState;
  caseId: string;
  editable: boolean;
  onEvidence: (e: Evidence) => void;
  activeQuote: string | null;
}) {
  const accept = useStore((s) => s.acceptCriterion);
  const revert = useStore((s) => s.revertCriterion);
  const [editing, setEditing] = useState(false);
  const def = criterionDefsByKey.get(c.key);
  const accepted = caseState?.accepted[c.key];
  const isL4 = c.key === 'L4_PUBLIC_POLICY';
  const isMarket = c.key === 'L1_MARKET';

  return (
    <li className="px-4 py-3" data-testid={`criterion-${c.key}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{c.label}</h4>
          {def?.question && <p className="text-xs text-[var(--color-ink-muted)]">{def.question}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.overridden && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-faint)] line-through" title="Original AI finding">
              AI: {original.status.replace('_', ' ')} / {original.severity}
            </span>
          )}
          <StatusBadge status={c.status} />
          <SeverityBadge severity={c.severity} />
        </div>
      </div>

      {isL4 && (
        <p className="mt-1 text-xs font-semibold text-[var(--color-pine-900)]">
          Public policy concern? {framework.publicPolicyAnswers[c.status as keyof typeof framework.publicPolicyAnswers]}
        </p>
      )}
      {isMarket && c.status !== 'fail' && (
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Market check: {framework.marketCheckStatusMeaning[c.status as keyof typeof framework.marketCheckStatusMeaning]}</p>
      )}

      {c.issueCodes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Issue codes">
          {c.issueCodes.map((code) => (
            <IssueChip key={code} code={code} />
          ))}
        </div>
      )}

      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">{original.reasoning}</p>

      {original.evidence.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {original.evidence.map((e) => (
            <button
              key={`${e.source}-${e.quote}`}
              type="button"
              onClick={() => onEvidence(e)}
              aria-pressed={activeQuote === e.quote}
              className={cx(
                'inline-flex max-w-full items-start gap-1 rounded-md border px-2 py-1 text-left text-xs',
                activeQuote === e.quote ? 'border-[var(--color-gold-500)] bg-[var(--color-gold-100)]' : 'border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-gold-500)]',
              )}
              title="Highlight these words in the submission"
            >
              <Quote size={12} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">{e.source === 'ruleText' ? 'Rule' : 'Rationale'}:</span> "{e.quote}"
              </span>
            </button>
          ))}
        </div>
      )}

      {original.citationIds.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {original.citationIds.map((id) => (
            <CitationBadge key={id} id={id} />
          ))}
        </div>
      )}

      {c.overridden && (
        <div className="mt-2 rounded-md border border-[var(--color-pine-200)] bg-[var(--color-pine-50)] px-3 py-2 text-xs">
          <HumanTag>Human override</HumanTag>
          <p className="mt-1">
            <span className="font-semibold">{framework.overrideReasonCodes.find((r) => r.key === c.overridden!.reasonCode)?.label}:</span> {c.overridden.note}
          </p>
          <p className="mt-0.5 text-[var(--color-ink-muted)]">
            {c.overridden.by} · {new Date(c.overridden.at).toLocaleString('en-CA')}
          </p>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!c.overridden && !accepted && <AiTag>AI finding, not yet validated</AiTag>}
        {accepted && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-pass-fg)]">
            <Check size={13} aria-hidden /> Accepted by {accepted.by}
          </span>
        )}
        {editable && !editing && (
          <>
            {!accepted && !c.overridden && (
              <button type="button" className="btn btn-secondary py-1 text-xs" onClick={() => accept(caseId, c.key)} data-testid={`accept-${c.key}`}>
                <Check size={13} aria-hidden /> Accept
              </button>
            )}
            <button type="button" className="btn btn-ghost py-1 text-xs" onClick={() => setEditing(true)} data-testid={`override-${c.key}`}>
              <PenLine size={13} aria-hidden /> Override
            </button>
            {(accepted || c.overridden) && (
              <button type="button" className="btn btn-ghost py-1 text-xs" onClick={() => revert(caseId, c.key)}>
                <Undo2 size={13} aria-hidden /> Undo
              </button>
            )}
          </>
        )}
      </div>
      {editing && <OverrideForm caseId={caseId} c={c} onClose={() => setEditing(false)} />}
    </li>
  );
}

function OverrideForm({ caseId, c, onClose }: { caseId: string; c: EffCriterion; onClose: () => void }) {
  const override = useStore((s) => s.overrideCriterion);
  const [status, setStatus] = useState<Status>(c.status);
  const [severity, setSeverity] = useState<Severity>(c.severity);
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const valid = reasonCode && note.trim().length >= 10;
  return (
    <form
      className="mt-3 rounded-lg border border-[var(--color-pine-200)] bg-[var(--color-pine-50)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        override(caseId, c.key, { status, severity, reasonCode, note: note.trim() });
        onClose();
      }}
      aria-label={`Override ${c.label}`}
      data-testid={`override-form-${c.key}`}
    >
      <p className="mb-2 text-xs text-[var(--color-ink-muted)]">An override needs a reason code and an explanation. The score recomputes immediately and the change is written to the audit trail.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label>
          <span className="label">New status</span>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value as Status)} name="status">
            <option value="pass">Meets standard</option>
            <option value="concern">Concern</option>
            <option value="fail">Does not meet standard</option>
            <option value="insufficient_information">Insufficient information</option>
          </select>
        </label>
        <label>
          <span className="label">Severity</span>
          <select className="field" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} name="severity">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span className="label">Reason code (required)</span>
          <select className="field" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} required name="reasonCode">
            <option value="">Choose a reason</option>
            {framework.overrideReasonCodes.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-2 block">
        <span className="label">Explanation (required, at least 10 characters)</span>
        <textarea className="field min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} required name="note" />
      </label>
      <div className="mt-2 flex gap-2">
        <button type="submit" className="btn btn-primary py-1 text-xs" disabled={!valid}>
          Save override
        </button>
        <button type="button" className="btn btn-ghost py-1 text-xs" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
