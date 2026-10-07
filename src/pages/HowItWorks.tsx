import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Calculator, ExternalLink, Scale, UserCheck } from 'lucide-react';
import { assessments, citations, framework, precedents, rules } from '../data';
import { CitationBadge, SectionTitle } from '../components/ui';

const ICONS: Record<string, React.ReactNode> = {
  HUMAN_IN_THE_LOOP: <UserCheck size={18} aria-hidden />,
  TRANSPARENCY: <Bot size={18} aria-hidden />,
  CONSISTENCY: <Scale size={18} aria-hidden />,
  CONSUMER_PROTECTION: <Calculator size={18} aria-hidden />,
};

export default function HowItWorks() {
  const w = framework.scoring.weights;
  const t = framework.scoring.thresholds;
  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div>
        <div className="eyebrow">Transparency</div>
        <h1 className="text-3xl font-bold">How Simrule works</h1>
        <p className="mt-2 text-base text-[var(--color-ink-muted)]">
          Simrule helps a regulatory analyst review auto insurers' proposed underwriting decline rules, the exceptions to Ontario's Take All Comers requirement. An AI partner reads each submission, structures it,
          checks it against a four-level framework, compares it with precedents and similar submissions, and drafts reasons. A person validates every finding and makes every decision.
        </p>
      </div>

      <section aria-labelledby="principles-h">
        <SectionTitle title="The four principles, and where you can see them" />
        <div className="grid gap-4 md:grid-cols-2">
          {framework.productPrinciples.map((p) => (
            <article key={p.key} className="card p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <span className="text-[var(--color-gold-600)]">{ICONS[p.key]}</span> {p.name}
              </h3>
              <p className="mt-1 text-sm">{p.summary}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-[var(--color-ink-muted)]">
                {p.whereInProduct.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="split-h" className="card p-5">
        <SectionTitle title="Judgment and scoring are kept apart" />
        <ol className="grid items-stretch gap-2 text-sm md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          <Step n={1} title="AI findings" body="For each of 15 criteria the AI records a status, severity, issue codes, 2-4 sentences of reasoning, verbatim evidence quotes and citation ids. It never writes a recommendation." />
          <Arrow />
          <Step n={2} title="Deterministic scoring" body="Fixed, published code turns the findings into a recommendation. Same findings, same answer, every time." />
          <Arrow />
          <Step n={3} title="Human validation" body="The analyst accepts or overrides each finding with a reason code. The score recomputes live and the change is logged." />
          <Arrow />
          <Step n={4} title="Human decision" body="The analyst decides and owns the rationale. Divergence from the AI, Level 1 overrides or low confidence send it to a senior reviewer." />
        </ol>
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          Why: if a language model wrote the recommendation, two similar rules could get different answers for no visible reason. Separating judgment (what is wrong with this rule) from scoring (what that adds up
          to) makes every recommendation explainable and repeatable, and gives reviewers a precise place to disagree.
        </p>
      </section>

      <section aria-label="Solution architecture" className="card p-5" data-testid="architecture">
        <SectionTitle title="Solution architecture">
          <a className="btn btn-secondary py-1 text-xs" href="./architecture.svg" target="_blank" rel="noreferrer">
            <ExternalLink size={13} aria-hidden /> Open full size
          </a>
        </SectionTitle>
        <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
          Four swimlanes: insurer, AI services, human reviewers, and records and accountability. Each AI box shows what this prototype uses and what production would need. H marks a human touchpoint; A marks an accountability control.
        </p>
        <figure className="overflow-x-auto">
          <img
            src="./architecture.svg"
            width={1650}
            height={1275}
            className="h-auto w-full min-w-[720px] rounded-md border border-[var(--color-line)]"
            alt="Simrule architecture. 1 insurer submits a rule. AI services: 2 intake and parsing, 3 scope and completeness, 4 structured extraction, 5 criteria assessment L1 to L4 with retrieval over a versioned knowledge base, 6 precedent similarity, 7 deterministic scoring. Human reviewers: confirm extraction, 8 recommendation panel, 9 validate or override, 10 senior sign-off, 11 decision and rationale. Records: 12 audit trail, 13 precedent registry, 14 consistency monitoring, plus the versioned knowledge base. A chatbot answers insurers and reviewers from the same knowledge base."
          />
        </figure>
      </section>

      <section aria-labelledby="levels-h" className="card p-5">
        <SectionTitle title="The framework: four Levels, fifteen criteria" />
        <div className="space-y-4">
          {framework.levels.map((l) => (
            <div key={l.level}>
              <h3 className="text-base font-semibold">
                Level {l.level}: {l.name} <span className="font-sans text-xs font-normal text-[var(--color-ink-muted)]">· {l.required ? 'Required' : 'Stretch'} · {l.scoringRole}</span>
              </h3>
              <p className="text-sm text-[var(--color-ink-muted)]">{l.evaluation}</p>
              <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                {l.criteria.map((c) => (
                  <li key={c.key}>
                    <strong>{c.label}.</strong> {c.question}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">Source: {framework.source.title} (academic deck, extracted from the PDF).</p>
      </section>

      <section aria-labelledby="scoring-h" className="card p-5">
        <SectionTitle title="Weights and thresholds" />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                  <th className="py-1">Part</th>
                  <th className="py-1 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--color-line-soft)]">
                  <td className="py-1">Level 2 weight (principles)</td>
                  <td className="py-1 text-right">{w['2']}</td>
                </tr>
                <tr className="border-t border-[var(--color-line-soft)]">
                  <td className="py-1">Level 3 weight (risk, objectivity, definitions)</td>
                  <td className="py-1 text-right">{w['3']}</td>
                </tr>
                <tr className="border-t border-[var(--color-line-soft)]">
                  <td className="py-1">Level 4 weight (public policy)</td>
                  <td className="py-1 text-right">{w['4']}</td>
                </tr>
                <tr className="border-t border-[var(--color-line-soft)]">
                  <td className="py-1">Values: pass / concern / insufficient / fail</td>
                  <td className="py-1 text-right">1 / 0.5 / 0.5 / 0</td>
                </tr>
                <tr className="border-t border-[var(--color-line-soft)]">
                  <td className="py-1">Approve with conditions</td>
                  <td className="py-1 text-right">{t.approveWithConditions}+</td>
                </tr>
                <tr className="border-t border-[var(--color-line-soft)]">
                  <td className="py-1">Request more information</td>
                  <td className="py-1 text-right">
                    {t.requestMoreInformation} to {t.approveWithConditions - 1}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{framework.scoring.calibration} All 15 tested configurations matched all 13 sanity anchors, so the starting values were kept.</p>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {framework.scoring.ruleOrder.map((r) => (
              <li key={r}>{r.replace(/^\d+\.\s*/, '')}</li>
            ))}
            <li>Senior review is flagged when AI confidence is low or any Level 1 criterion is a concern.</li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="codes-h" className="card p-5">
        <SectionTitle title={`Issue codes (${framework.issueCodes.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-muted)]">
                <th className="py-1">Code</th>
                <th className="py-1">Meaning</th>
                <th className="py-1">Level</th>
                <th className="py-1">What the insurer could do</th>
              </tr>
            </thead>
            <tbody>
              {framework.issueCodes.map((c) => (
                <tr key={c.code} className="border-t border-[var(--color-line-soft)] align-top">
                  <td className="py-1.5 pr-2 font-mono text-xs">{c.code}</td>
                  <td className="py-1.5 pr-2">{c.label}</td>
                  <td className="py-1.5 pr-2">{c.level}</td>
                  <td className="py-1.5 text-[var(--color-ink-muted)]">{c.remedy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="workflow-h" className="card p-5">
        <SectionTitle title="Workflow and human checkpoints" />
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {framework.workflowStages.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-pine-100)] px-3 py-1 font-medium text-[var(--color-pine-900)]">
                {s.label} <span className="text-xs font-normal text-[var(--color-ink-muted)]">({s.owner})</span>
              </span>
              {i < framework.workflowStages.length - 1 && <ArrowRight size={14} aria-hidden className="text-[var(--color-ink-faint)]" />}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Information requested loops back to Analyst review when the insurer responds.</p>
        <h3 className="mt-3 text-base font-semibold">Senior sign-off triggers</h3>
        <ul className="list-disc pl-5 text-sm">
          {framework.seniorSignOffTriggers.map((s) => (
            <li key={s.key}>{s.label}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="data-h" className="card p-5">
        <SectionTitle title="Data provenance" />
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{rules.length} fictional decline rules from 10 fictional insurers, supplied with the assignment.</li>
          <li>
            {assessments.length} AI assessments precomputed in a batch run by Claude (Anthropic) during the build, using prompt v2 (prompts/assessment-prompt.md). Each was schema-validated, checked for verbatim
            evidence quotes and known citation ids, scored by the code above and passed through a consistency audit. In production this step would run server-side on each new submission.
          </li>
          <li>{precedents.length} precedent records: approved rules and examples from the framework deck. Insurer names and approval years on approved precedents are invented and marked illustrative.</li>
          <li>Similarity: TF-IDF cosine on rule wording (65%) plus overlap in category, trigger type, threshold and lookback (35%).</li>
          <li>
            Citations: {citations.filter((c) => c.verified).length} verified against the supplied framework PDF; {citations.filter((c) => !c.verified).length} legal references unverified because the official
            sites were blocked from the build environment. Unverified references are cited at instrument level with a "section not verified" badge.
          </li>
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--color-pine-900)]">Citation registry ({citations.length})</summary>
          <ul className="mt-2 space-y-2 text-sm">
            {citations.map((c) => (
              <li key={c.id}>
                <span className="font-mono text-xs">{c.id}</span> <CitationBadge id={c.id} />
                <span className="block text-xs text-[var(--color-ink-muted)]">{c.supports}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section aria-labelledby="limits-h" className="card p-5">
        <SectionTitle title="Limitations" />
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Prototype only: no authentication, no server, and state lives in your browser (reset from the header menu).</li>
          <li>Legal references could not be verified against official sources; see deliverables/process/VERIFY.md.</li>
          <li>Assessments are precomputed; new uploads get keyword triage only (low confidence) until a full assessment runs. An optional live assessment is available on an uploaded rule with your own API key: off by default, the key stays in page memory only, and the output goes through the same validation and scoring.</li>
          <li>The weights were calibrated on 13 anchor rules and have not been validated against historical regulator decisions.</li>
          <li>The same AI wrote the findings and the spot check, so agreement there is weak evidence. Human analysts must validate.</li>
          <li>English only; production would need French-language service.</li>
        </ul>
      </section>

      <p className="text-sm">
        <Link to="/" className="underline">
          Back to the dashboard
        </Link>
      </p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
      <div className="text-xs font-semibold text-[var(--color-gold-700)]">Step {n}</div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{body}</p>
    </li>
  );
}

function Arrow() {
  return (
    <li aria-hidden className="hidden items-center justify-center md:flex">
      <ArrowRight size={18} className="text-[var(--color-ink-faint)]" />
    </li>
  );
}
