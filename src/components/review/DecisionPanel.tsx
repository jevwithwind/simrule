import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, CheckCircle2, FileDown, FileJson, Gavel, Printer, Send, ShieldCheck, Undo2, Wand2 } from 'lucide-react';
import { decisionLabel, framework, humaniseAuditText, recommendationLabel, stageLabel } from '../../data';
import type { Assessment, Criterion, Rule } from '../../lib/schema';
import type { ScoreResult } from '../../lib/scoring';
import { signOffTriggers, validatedCount, type AuditEvent, type CaseState, type DecisionKey, type Override } from '../../lib/workflow';
import { draftRationale } from '../../lib/rationale';
import { decisionRecordJson, decisionRecordMarkdown, download } from '../../lib/exporters';
import { useStore } from '../../store/store';
import { DecisionBadge, HumanTag, cx } from '../ui';

const STEPS = ['RECEIVED', 'INTAKE', 'AI_PRE_ASSESSMENT', 'ANALYST_REVIEW', 'SENIOR_SIGN_OFF', 'DECIDED', 'CLOSED'];
const triggerLabel = (k: string) => framework.seniorSignOffTriggers.find((t) => t.key === k)?.label ?? k;

export function WorkflowStepper({ stage }: { stage: string }) {
  const idx = STEPS.indexOf(stage === 'INFO_REQUESTED' ? 'ANALYST_REVIEW' : stage);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[11px]" aria-label="Workflow stage">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span
            className={cx(
              'rounded-full px-2 py-0.5 font-medium',
              i < idx && 'bg-[var(--color-pine-100)] text-[var(--color-pine-900)]',
              i === idx && 'bg-[var(--color-pine-900)] text-white',
              i > idx && 'bg-white text-[var(--color-ink-faint)] ring-1 ring-[var(--color-line)]',
            )}
            aria-current={i === idx ? 'step' : undefined}
          >
            {stageLabel(s)}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="text-[var(--color-ink-faint)]">›</span>}
        </li>
      ))}
      {stage === 'INFO_REQUESTED' && (
        <li className="flex items-center gap-1 rounded-full bg-[var(--color-gold-100)] px-2 py-0.5 font-semibold text-[var(--color-gold-700)]">
          <ArrowLeftRight size={11} aria-hidden /> Information requested (loops back to analyst review)
        </li>
      )}
    </ol>
  );
}

export default function DecisionPanel({
  rule,
  assessment,
  ai,
  human,
  caseState,
  criteria,
  audit,
}: {
  rule: Rule;
  assessment: Assessment;
  ai: ScoreResult;
  human: ScoreResult;
  caseState: CaseState;
  criteria: (Criterion & { overridden?: Override })[];
  audit: AuditEvent[];
}) {
  const role = useStore((s) => s.role);
  const submitDecision = useStore((s) => s.submitDecision);
  const signOff = useStore((s) => s.signOff);
  const returnToAnalyst = useStore((s) => s.returnToAnalyst);
  const recordInsurerResponse = useStore((s) => s.recordInsurerResponse);
  const closeCase = useStore((s) => s.closeCase);
  const completeIntake = useStore((s) => s.completeIntake);

  const defaultOption: DecisionKey =
    ai.recommendation === 'APPROVE_WITH_CONDITIONS' ? 'APPROVE_WITH_CONDITIONS' : ai.recommendation === 'REQUEST_MORE_INFORMATION' ? 'REQUEST_INFORMATION' : ai.recommendation === 'OUT_OF_SCOPE' ? 'ROUTE_OUT_OF_SCOPE' : 'DECLINE';
  const [option, setOption] = useState<DecisionKey | ''>('');
  const [rationale, setRationale] = useState('');
  const [ownership, setOwnership] = useState(false);
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setOption('');
    setRationale('');
    setOwnership(false);
    setNote('');
  }, [rule.id, caseState.stage]);
  useEffect(() => setFlash(null), [rule.id]);

  const total = assessment.criteria.length;
  const done = validatedCount(assessment, caseState);
  const triggers = option ? signOffTriggers(option, assessment, ai, caseState) : [];
  const isSenior = role === 'Senior reviewer';
  const options = framework.decisionOptions.filter((d) => d.key !== 'ROUTE_OUT_OF_SCOPE' || ai.recommendation === 'OUT_OF_SCOPE');
  const blockers = [
    done < total && `Validate all findings (${done} of ${total} done).`,
    !option && 'Choose a decision.',
    rationale.trim().length < 40 && 'Write or draft a rationale.',
    !ownership && 'Confirm ownership of the rationale.',
  ].filter(Boolean) as string[];

  const recordInput = { rule, assessment, ai, human, caseState, audit, labels: { recommendation: recommendationLabel, decision: decisionLabel, stage: stageLabel, text: humaniseAuditText } };

  const exports = (
    <div className="flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-3">
      <button type="button" className="btn btn-secondary py-1 text-xs" onClick={() => download(`${rule.id}-decision-record.md`, decisionRecordMarkdown(recordInput), 'text/markdown')}>
        <FileDown size={13} aria-hidden /> Markdown
      </button>
      <button type="button" className="btn btn-secondary py-1 text-xs" onClick={() => download(`${rule.id}-decision-record.json`, decisionRecordJson(recordInput), 'application/json')}>
        <FileJson size={13} aria-hidden /> JSON
      </button>
      <button type="button" className="btn btn-secondary py-1 text-xs" onClick={() => window.print()}>
        <Printer size={13} aria-hidden /> Print or save PDF
      </button>
    </div>
  );

  const shownDecision = caseState.decision ?? caseState.proposed;

  return (
    <section className="card p-4" aria-labelledby="decision-h" data-tour="decision" data-testid="decision-panel">
      <h2 id="decision-h" className="flex items-center gap-2 text-lg font-semibold">
        <Gavel size={18} aria-hidden /> Decision workflow
      </h2>
      <div className="mt-2 mb-3">
        <WorkflowStepper stage={caseState.stage} />
      </div>

      {flash && (
        <div role="status" className="mb-3 flex items-start gap-2 rounded-md bg-[var(--color-pass-bg)] px-3 py-2 text-sm text-[var(--color-pass-fg)]">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden /> {flash}
        </div>
      )}

      {caseState.stage === 'INTAKE' && (
        <div className="space-y-2 text-sm">
          <p>This submission is at intake. Confirm the completeness check before the analyst review opens.</p>
          <button type="button" className="btn btn-primary" onClick={() => completeIntake(rule.id)}>
            <CheckCircle2 size={15} aria-hidden /> Complete intake check
          </button>
        </div>
      )}

      {caseState.stage === 'ANALYST_REVIEW' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (blockers.length || !option) return;
            const r = submitDecision(rule.id, { option, rationale: rationale.trim(), ownershipConfirmed: ownership });
            setFlash(r.needsSignOff ? 'Sent for senior sign-off. The decision is not final until a senior reviewer signs it off.' : 'Decision recorded and written to the audit trail.');
          }}
        >
          {caseState.returnedNote && (
            <div className="flex gap-2 rounded-md border border-[var(--color-gold-200)] bg-[var(--color-gold-100)] px-3 py-2 text-xs">
              <Undo2 size={14} className="mt-0.5 shrink-0" aria-hidden /> Returned by senior reviewer: {caseState.returnedNote}
            </div>
          )}
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold">Findings validated</span>
              <span className="tabular-nums" data-testid="validated-count">
                {done} of {total}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[var(--color-pine-100)]">
              <div className="h-1.5 rounded-full bg-[var(--color-pine-700)]" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Accept or override every AI finding before deciding. This keeps the human in the loop and avoids rubber-stamping.</p>
          </div>

          <fieldset>
            <legend className="label">Final decision (human)</legend>
            <div className="space-y-1">
              {options.map((o) => (
                <label key={o.key} className={cx('flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm', option === o.key ? 'border-[var(--color-pine-700)] bg-[var(--color-pine-50)]' : 'border-[var(--color-line)]')}>
                  <input type="radio" name="decision" value={o.key} checked={option === o.key} onChange={() => setOption(o.key as DecisionKey)} />
                  <span className="flex-1">{o.label}</span>
                  {o.key === defaultOption && <span className="ai-tag">Matches AI</span>}
                </label>
              ))}
            </div>
          </fieldset>

          {option && triggers.length > 0 && (
            <div className="rounded-md border border-[var(--color-gold-500)] bg-[var(--color-gold-100)] px-3 py-2 text-xs" role="note" data-testid="signoff-warning">
              <p className="flex items-center gap-1 font-semibold text-[var(--color-gold-700)]">
                <ShieldCheck size={14} aria-hidden /> Senior sign-off {isSenior ? 'applies (you are the senior reviewer)' : 'will be required'}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {triggers.map((t) => (
                  <li key={t}>{triggerLabel(t)}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="rationale" className="label">
                Decision rationale
              </label>
              <button
                type="button"
                className="btn btn-ghost py-0.5 text-xs"
                disabled={!option}
                onClick={() => option && setRationale(draftRationale({ rule, assessment, criteria, ai, human, option, caseState }))}
                data-testid="draft-rationale"
              >
                <Wand2 size={13} aria-hidden /> Draft from validated findings
              </button>
            </div>
            <textarea id="rationale" className="field min-h-[140px] text-xs leading-relaxed" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Draft from the validated findings, then edit in your own words." />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} data-testid="ownership" />
            <span>I have reviewed this rationale and take ownership of it.</span>
          </label>
          {blockers.length > 0 && (
            <ul className="space-y-0.5 text-xs text-[var(--color-ink-muted)]" aria-live="polite">
              {blockers.map((b) => (
                <li key={b} className="flex items-center gap-1">
                  <AlertTriangle size={12} aria-hidden /> {b}
                </li>
              ))}
            </ul>
          )}
          <button type="submit" className="btn btn-primary w-full justify-center" disabled={blockers.length > 0} data-testid="submit-decision">
            <Send size={15} aria-hidden /> {triggers.length && !isSenior ? 'Send for senior sign-off' : 'Record decision'}
          </button>
        </form>
      )}

      {caseState.stage === 'SENIOR_SIGN_OFF' && caseState.proposed && (
        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-[var(--color-line)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <HumanTag>Proposed by analyst</HumanTag>
              <DecisionBadge option={caseState.proposed.option} />
            </div>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {caseState.proposed.by} · {new Date(caseState.proposed.at).toLocaleString('en-CA')} · AI recommendation was {recommendationLabel(caseState.proposed.aiRecommendation)}
            </p>
            <p className="mt-2 text-xs font-semibold">Why sign-off is needed</p>
            <ul className="list-disc pl-5 text-xs">
              {caseState.proposed.triggers.map((t) => (
                <li key={t}>{triggerLabel(t)}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-semibold">Rationale</p>
            <p className="text-xs whitespace-pre-line">{caseState.proposed.rationale}</p>
          </div>
          {isSenior ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (note.trim().length < 5) return;
                signOff(rule.id, note.trim());
                setFlash('Signed off. The decision is recorded.');
              }}
            >
              <label className="block">
                <span className="label">Sign-off note (required)</span>
                <textarea className="field min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} data-testid="signoff-note" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={note.trim().length < 5} data-testid="sign-off">
                  <ShieldCheck size={15} aria-hidden /> Sign off and record decision
                </button>
                <button type="button" className="btn btn-secondary" disabled={note.trim().length < 5} onClick={() => returnToAnalyst(rule.id, note.trim())}>
                  <Undo2 size={15} aria-hidden /> Return to analyst
                </button>
              </div>
            </form>
          ) : (
            <p className="rounded-md bg-[var(--color-paper)] px-3 py-2 text-xs text-[var(--color-ink-muted)]">
              Waiting for a senior reviewer. In this demo, switch the role in the header to <strong>Senior reviewer</strong> to sign off.
            </p>
          )}
        </div>
      )}

      {caseState.stage === 'INFO_REQUESTED' && (
        <div className="space-y-3 text-sm">
          <p>Questions sent to {rule.insurer}:</p>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {(caseState.infoRequest?.questions ?? assessment.questionsForInsurer).map((qq) => (
              <li key={qq}>{qq}</li>
            ))}
          </ul>
          <label className="block">
            <span className="label">Insurer response summary</span>
            <textarea className="field min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For the demo, summarise what the insurer sent back." />
          </label>
          <button type="button" className="btn btn-secondary" disabled={note.trim().length < 5} onClick={() => recordInsurerResponse(rule.id, note.trim())}>
            <Undo2 size={15} aria-hidden /> Record response and return to analyst review
          </button>
        </div>
      )}

      {(caseState.stage === 'DECIDED' || caseState.stage === 'CLOSED') && caseState.decision && (
        <div className="space-y-2 text-sm" data-testid="decision-recorded">
          <div className="flex flex-wrap items-center gap-2">
            <HumanTag>Decision recorded</HumanTag>
            <DecisionBadge option={caseState.decision.option} />
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {caseState.decision.by} · {caseState.decision.role} · {new Date(caseState.decision.at).toLocaleString('en-CA')}
            {caseState.decision.signedOffBy && ` · Signed off by ${caseState.decision.signedOffBy}`}
          </p>
          <p className="text-xs whitespace-pre-line">{caseState.decision.rationale}</p>
          {caseState.stage === 'DECIDED' && (
            <button type="button" className="btn btn-secondary" onClick={() => closeCase(rule.id)}>
              Close case
            </button>
          )}
        </div>
      )}

      {shownDecision || caseState.stage !== 'INTAKE' ? <div className="mt-3">{exports}</div> : null}
    </section>
  );
}
