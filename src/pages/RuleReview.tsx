import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertOctagon, ArrowLeft, ClipboardCheck, FileSearch, Info, ListChecks, MessageSquareQuote, ShieldAlert, Signpost } from 'lucide-react';
import { aiScores, framework, rulesById } from '../data';
import { useStore, assessmentFor } from '../store/store';
import { effectiveCriteria, humanScore } from '../lib/workflow';
import { runChecklist, checklistSummary } from '../lib/completeness';
import type { Evidence } from '../lib/schema';
import { AiTag, ConfidenceBadge, HumanTag, RecBadge, StageBadge, cx } from '../components/ui';
import Highlight from '../components/review/Highlight';
import ScoreBreakdown from '../components/review/ScoreBreakdown';
import CriteriaScorecard from '../components/review/CriteriaScorecard';
import SimilarRules from '../components/review/SimilarRules';
import ConsumerLens from '../components/review/ConsumerLens';
import DecisionPanel from '../components/review/DecisionPanel';
import AuditTimeline from '../components/review/AuditTimeline';
import UploadReview from '../components/review/UploadReview';
import NotFound from './NotFound';

export default function RuleReview() {
  const { id = '' } = useParams();
  const cases = useStore((s) => s.cases);
  const uploads = useStore((s) => s.uploads);
  const audit = useStore((s) => s.audit);
  const role = useStore((s) => s.role);
  const upload = uploads.find((u) => u.id === id);
  const rule = rulesById.get(id) ?? upload?.rule;
  const assessment = assessmentFor(id, uploads);
  const caseState = cases[id];
  const [active, setActive] = useState<Evidence | null>(null);
  const submissionRef = useRef<HTMLDivElement>(null);

  const events = useMemo(() => audit.filter((e) => e.caseId === id), [audit, id]);
  const criteria = useMemo(() => (assessment ? effectiveCriteria(assessment, caseState) : []), [assessment, caseState]);
  const ai = assessment ? (aiScores.get(id) ?? humanScore(assessment, undefined)) : null;
  const human = assessment ? humanScore(assessment, caseState) : null;

  if (!rule) return <NotFound />;
  if (upload && !assessment) return <UploadReview upload={upload} caseState={caseState} events={events} />;
  if (!assessment || !ai || !human || !caseState) return <NotFound />;

  const overrides = Object.keys(caseState.overrides).length;
  const changed = overrides > 0;
  const editable = caseState.stage === 'ANALYST_REVIEW';
  const l1Fails = assessment.criteria.filter((c) => c.level === 1 && c.status === 'fail');
  const isSeed = rulesById.has(id);
  const checklist = runChecklist(
    { insurer: rule.insurer, dateSubmitted: rule.dateSubmitted, ruleText: rule.ruleText, rationale: rule.rationale, category: rule.categoryLabel, ...(upload?.extraction ?? {}) },
    assessment.scope.inScope,
    isSeed,
  );
  const cs = checklistSummary(checklist);

  const onEvidence = (e: Evidence) => {
    setActive((cur) => (cur?.quote === e.quote ? null : e));
    submissionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--color-pine-800)] underline-offset-2 hover:underline">
          <ArrowLeft size={15} aria-hidden /> Back to queue
        </Link>
        <span className="text-xs text-[var(--color-ink-muted)]">
          Acting as <strong>{role}</strong>
        </span>
      </div>

      <header className="card p-5" data-tour="rule-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{rule.id}</h1>
              <StageBadge stage={caseState.stage} />
              {rule.categories.map((c) => (
                <span key={c} className="rounded-full bg-[var(--color-paper)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Submitted by <strong className="text-[var(--color-ink)]">{rule.insurer}</strong> on {rule.dateSubmitted} · fictional submission
            </p>
            <div ref={submissionRef} className="mt-3 space-y-3" data-testid="submission-text">
              <div>
                <div className="eyebrow flex items-center gap-1">
                  <Signpost size={12} aria-hidden /> Proposed decline rule
                </div>
                <p className="mt-1 font-serif text-lg leading-snug text-[var(--color-ink)]">
                  <Highlight text={rule.ruleText} quote={active?.source === 'ruleText' ? active.quote : null} />
                </p>
              </div>
              <div>
                <div className="eyebrow flex items-center gap-1">
                  <MessageSquareQuote size={12} aria-hidden /> Insurer's stated rationale
                </div>
                <p className="mt-1 text-sm leading-relaxed">
                  <Highlight text={rule.rationale} quote={active?.source === 'rationale' ? active.quote : null} />
                </p>
              </div>
              {active && (
                <p className="no-print text-xs text-[var(--color-gold-700)]" role="status">
                  Highlighting evidence: "{active.quote}".{' '}
                  <button type="button" className="underline" onClick={() => setActive(null)}>
                    Clear
                  </button>
                </p>
              )}
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-3 rounded-lg border border-[var(--color-gold-200)] bg-[var(--color-gold-100)]/40 p-4 sm:w-[340px]" aria-label="AI recommendation" data-tour="recommendation">
            <AiTag />
            <RecBadge rec={ai.recommendation} size="lg" />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-[var(--color-ink)]" data-testid="ai-score">
                {ai.score ?? 'n/a'}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">score out of 100 (Levels 2 to 4)</span>
            </div>
            <ConfidenceBadge confidence={assessment.confidence} />
            {ai.seniorReviewRequired && (
              <p className="flex items-start gap-1 text-xs font-semibold text-[var(--color-gold-700)]">
                <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> Senior review required: {ai.seniorReviewReasons.join(' ')}
              </p>
            )}
            <p className="text-xs text-[var(--color-ink-muted)]">Computed by Simrule's scoring code from the AI findings. The language model never writes the recommendation.</p>
            {changed && (
              <div className="rounded-md border border-[var(--color-pine-200)] bg-white p-2" data-testid="human-adjusted">
                <HumanTag>After {overrides} human override{overrides > 1 ? 's' : ''}</HumanTag>
                <div className="mt-1 flex items-center gap-2">
                  <RecBadge rec={human.recommendation} />
                  <span className="text-sm font-semibold tabular-nums">{human.score ?? 'n/a'}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
        <div className="mt-4">
          <ScoreBreakdown ai={ai} human={human} changed={changed} />
        </div>
      </header>

      {l1Fails.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border-2 border-[var(--color-stop-600)] bg-[var(--color-stop-50)] px-4 py-3 text-[var(--color-stop-700)]" data-testid="hard-stop">
          <AlertOctagon size={22} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Level 1 hard stop: the AI found a basic compliance failure</p>
            <p className="text-sm">
              Failed: {l1Fails.map((c) => c.label).join(' and ')}. Under the framework, Level 1 non-compliance is likely a full-stop refusal. A reviewer can still override with a reason; that triggers senior sign-off.
            </p>
          </div>
        </div>
      )}

      {caseState.stage === 'INTAKE' && (
        <section className="card border-l-4 border-l-[var(--color-pine-700)] p-4" aria-labelledby="intake-h">
          <h2 id="intake-h" className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck size={18} aria-hidden /> Intake and completeness check ({framework.completenessChecklist.label.toLowerCase()})
          </h2>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{framework.completenessChecklist.note}</p>
          <ChecklistTable rows={checklist} />
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            {cs.present} present, {cs.missing} missing, {cs.notInSummary} not part of the summary record. Missing items become questions for the insurer.
          </p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <FileSearch size={20} aria-hidden /> Findings by criterion
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Scope: {assessment.scope.inScope ? 'decline rule, in scope' : 'out of scope'}. {assessment.scope.note}
            </p>
          </div>
          {!editable && caseState.stage !== 'INTAKE' && (
            <p className="flex items-center gap-2 rounded-md bg-[var(--color-paper)] px-3 py-2 text-xs text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
              <Info size={14} aria-hidden /> Findings can be accepted or overridden only at the Analyst review stage. Current stage: {caseState.stage.replace(/_/g, ' ').toLowerCase()}.
            </p>
          )}
          <div className="lg:hidden">
            <ConsumerLens assessment={assessment} />
          </div>
          <CriteriaScorecard assessment={assessment} criteria={criteria} caseState={caseState} editable={editable} onEvidence={onEvidence} activeQuote={active?.quote ?? null} />
          <SimilarRules assessment={assessment} />
          <section className="card grid gap-4 p-4 md:grid-cols-3" aria-label="Next steps and questions">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ListChecks size={16} aria-hidden /> Next steps
              </h2>
              <ul className="mt-2 space-y-2 text-sm">
                {assessment.nextSteps.map((n) => (
                  <li key={n.action}>
                    <span className="font-medium">{n.action}</span>
                    <span className="block text-xs text-[var(--color-ink-muted)]">
                      Owner: {n.owner}. {n.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold">Questions for the insurer</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {assessment.questionsForInsurer.map((qq) => (
                  <li key={qq}>{qq}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold">What would change this recommendation</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {assessment.whatWouldChangeTheOutcome.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </section>
          <section className="card p-4 text-xs text-[var(--color-ink-muted)]" aria-label="Provenance">
            <h2 className="mb-1 text-base font-semibold">Provenance</h2>
            <p>
              Generated by {assessment.provenance.generatedBy} · prompt {assessment.provenance.promptVersion} · framework {assessment.provenance.frameworkVersion} · {assessment.provenance.generatedOn} · AI confidence{' '}
              {assessment.confidence}
            </p>
            {assessment.uncertainties.length > 0 && <p className="mt-1">Stated uncertainties: {assessment.uncertainties.join(' ')}</p>}
            {assessment.auditNotes && (
              <ul className="mt-1 list-disc pl-5">
                {assessment.auditNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className={cx('space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-4.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1')} aria-label="Consumer lens and decision">
          <div className="hidden lg:block">
            <ConsumerLens assessment={assessment} />
          </div>
          <DecisionPanel rule={rule} assessment={assessment} ai={ai} human={human} caseState={caseState} criteria={criteria} audit={events} />
          <AuditTimeline events={events} />
        </aside>
      </div>
    </div>
  );
}

export function ChecklistTable({ rows }: { rows: ReturnType<typeof runChecklist> }) {
  return (
    <table className="mt-2 w-full text-xs">
      <caption className="sr-only">Completeness checklist</caption>
      <thead>
        <tr className="text-left text-[var(--color-ink-muted)]">
          <th className="py-1">Item</th>
          <th className="py-1">Status</th>
          <th className="py-1">Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-[var(--color-line-soft)]">
            <td className="py-1 pr-2">{r.label}</td>
            <td className="py-1 pr-2 font-semibold">
              {r.state === 'present' ? '✓ Present' : r.state === 'missing' ? '✗ Missing' : '— Not in summary record'}
              {r.note && <span className="block font-normal text-[var(--color-ink-muted)]">{r.note}</span>}
            </td>
            <td className="py-1 text-[var(--color-ink-muted)]">{r.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
