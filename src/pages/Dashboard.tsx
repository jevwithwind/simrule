import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, Columns3, GitCompareArrows, ListFilter, PenLine, Rows3, Search, UserCheck } from 'lucide-react';
import { categories, framework, insurers, issueCodes, similarPairs, stageLabel } from '../data';
import { useStore } from '../store/store';
import { buildQueue, sortRows, type QueueRow, type SortKey } from '../lib/queue';
import { RecBadge, StageBadge, cx, AiTag, SeverityBadge } from '../components/ui';
import { Meter, RecsByCategory, TopIssueCodes } from '../components/Charts';
import { DECISION_TO_OUTCOME } from '../lib/workflow';
import { assessmentsById } from '../data';

const STAGE_ORDER = ['INTAKE', 'AI_PRE_ASSESSMENT', 'ANALYST_REVIEW', 'INFO_REQUESTED', 'SENIOR_SIGN_OFF', 'DECIDED', 'CLOSED'] as const;

function Kpi({ label, value, sub, icon, tone = 'default', to }: { label: string; value: number | string; sub?: string; icon: React.ReactNode; tone?: 'default' | 'stop' | 'gold'; to?: string }) {
  const body = (
    <div className={cx('card h-full p-4', tone === 'stop' && 'border-[var(--color-stop-600)]/40', tone === 'gold' && 'border-[var(--color-gold-500)]/60')}>
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink-muted)]">
        <span className={cx(tone === 'stop' ? 'text-[var(--color-stop-600)]' : 'text-[var(--color-pine-700)]')}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-[var(--color-ink)]">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{sub}</div>}
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-[10px] hover:shadow-sm">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function Dashboard() {
  const cases = useStore((s) => s.cases);
  const uploads = useStore((s) => s.uploads);
  const rows = useMemo(() => buildQueue(cases, uploads), [cases, uploads]);

  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [rec, setRec] = useState('');
  const [sev, setSev] = useState('');
  const [ins, setIns] = useState('');
  const [cat, setCat] = useState('');
  const [code, setCode] = useState('');
  const [sort, setSort] = useState<SortKey>('risk');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return sortRows(
      rows.filter(
        (r) =>
          (!ql || `${r.id} ${r.insurer} ${r.ruleText}`.toLowerCase().includes(ql)) &&
          (!stage || r.stage === stage) &&
          (!rec || (rec === 'PENDING_AI' ? !r.aiRec : r.aiRec === rec)) &&
          (!sev || r.consumerSeverity === sev) &&
          (!ins || r.insurer === ins) &&
          (!cat || r.categories.includes(cat)) &&
          (!code || r.issueCodes.includes(code)),
      ),
      sort,
    );
  }, [rows, q, stage, rec, sev, ins, cat, code, sort]);

  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.stage] = (m[r.stage] ?? 0) + 1;
    return m;
  }, [rows]);

  const hardStops = rows.filter((r) => r.hardStop && r.stage !== 'DECIDED' && r.stage !== 'CLOSED').length;
  const seniorPending = stageCounts.SENIOR_SIGN_OFF ?? 0;
  const overrides = Object.values(cases).reduce((s, c) => s + Object.keys(c.overrides).length, 0);
  const consistency = useMemo(() => {
    const out = new Map(rows.map((r) => [r.id, r.outcome]));
    const diff = similarPairs.filter((p) => out.get(p.a) && out.get(p.b) && out.get(p.a) !== out.get(p.b));
    const explained = diff.filter(
      (p) => assessmentsById.get(p.a)?.precedents.some((x) => x.refId === p.b) || assessmentsById.get(p.b)?.precedents.some((x) => x.refId === p.a),
    );
    return { total: diff.length, unexplained: diff.length - explained.length };
  }, [rows]);

  const agreement = useMemo(() => {
    let accepted = 0;
    let overridden = 0;
    let decisions = 0;
    let agree = 0;
    for (const c of Object.values(cases)) {
      accepted += Object.keys(c.accepted).length;
      overridden += Object.keys(c.overrides).length;
      const d = c.decision ?? c.proposed;
      if (d && d.option !== 'ESCALATE') {
        decisions++;
        if (DECISION_TO_OUTCOME[d.option] === d.aiRecommendation) agree++;
      }
    }
    return { crit: accepted + overridden ? accepted / (accepted + overridden) : null, accepted, overridden, dec: decisions ? agree / decisions : null, decisions, agree };
  }, [cases]);

  const clear = () => {
    setQ('');
    setStage('');
    setRec('');
    setSev('');
    setIns('');
    setCat('');
    setCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Compliance dashboard</div>
          <h1 className="text-3xl font-bold">Decline-rule review queue</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--color-ink-muted)]">
            {rows.length} submissions from {insurers.length} fictional insurers. Every rule has an advisory AI pre-assessment; analysts validate each finding and humans make every decision.
          </p>
        </div>
        <Link to="/intake" className="btn btn-primary">
          Submit or upload a rule
        </Link>
      </div>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-tour="kpis">
        <div className="card col-span-2 p-4 md:col-span-3 xl:col-span-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink-muted)]">
            <ListFilter size={15} className="text-[var(--color-pine-700)]" aria-hidden /> In queue by stage
          </div>
          <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
            {STAGE_ORDER.map((s) => (
              <li key={s} className="flex items-start justify-between gap-2">
                <button type="button" className="text-left text-[var(--color-ink-muted)] underline-offset-2 hover:text-[var(--color-pine-900)] hover:underline" onClick={() => setStage(s)}>
                  {stageLabel(s)}
                </button>
                <span className="font-semibold tabular-nums">{stageCounts[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
        <Kpi label="Level 1 hard stops (open)" value={hardStops} sub="AI found a Level 1 fail" icon={<AlertOctagon size={15} aria-hidden />} tone="stop" />
        <Kpi label="Senior sign-offs pending" value={seniorPending} sub="Divergence, Level 1 or escalation" icon={<UserCheck size={15} aria-hidden />} tone="gold" />
        <Kpi label="Human overrides" value={overrides} sub="Findings changed by reviewers" icon={<PenLine size={15} aria-hidden />} />
        <Kpi label="Consistency alerts" value={consistency.total} sub={`${consistency.unexplained} without a recorded explanation`} icon={<GitCompareArrows size={15} aria-hidden />} to="/consistency" />
      </section>

      <section aria-label="Charts" className="grid gap-4 lg:grid-cols-[1.25fr_1.25fr_0.8fr]">
        <RecsByCategory rows={rows} />
        <TopIssueCodes rows={rows} />
        <section className="card flex flex-col gap-5 p-4" aria-label="AI and human agreement">
          <div>
            <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">AI and human agreement</h3>
            <p className="text-xs text-[var(--color-ink-muted)]">Low agreement is a signal to check the model; very high agreement can signal rubber-stamping.</p>
          </div>
          <Meter value={agreement.crit} label="Findings accepted without change" detail={`${agreement.accepted} accepted, ${agreement.overridden} overridden`} />
          <Meter value={agreement.dec} label="Decisions matching the AI recommendation" detail={`${agreement.agree} of ${agreement.decisions} decisions and proposals`} />
        </section>
      </section>

      <section aria-label="Review queue" className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Queue</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[var(--color-ink-muted)]">Sort</span>
              <select className="field w-auto py-1" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort queue">
                <option value="risk">Risk (hard stops, consumer impact, score)</option>
                <option value="age">Age in queue</option>
                <option value="cluster">Similarity cluster</option>
                <option value="id">Rule id</option>
              </select>
            </label>
            <div className="flex rounded-md border border-[var(--color-line)] p-0.5" role="group" aria-label="Queue view">
              <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className={cx('btn px-2 py-1', view === 'table' ? 'btn-primary' : 'btn-ghost')}>
                <Rows3 size={15} aria-hidden /> Table
              </button>
              <button type="button" aria-pressed={view === 'kanban'} onClick={() => setView('kanban')} className={cx('btn px-2 py-1', view === 'kanban' ? 'btn-primary' : 'btn-ghost')}>
                <Columns3 size={15} aria-hidden /> Kanban
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" role="search">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">Search</span>
            <Search size={15} className="absolute top-2.5 left-2.5 text-[var(--color-ink-faint)]" aria-hidden />
            <input className="field pl-8" placeholder="Search id, insurer or wording" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Select label="Stage" value={stage} onChange={setStage} options={STAGE_ORDER.map((s) => [s, stageLabel(s)])} />
          <Select label="AI recommendation" value={rec} onChange={setRec} options={[...framework.recommendations.map((r) => [r.key, r.label] as [string, string]), ['PENDING_AI', 'Awaiting full AI assessment']]} />
          <Select label="Consumer impact" value={sev} onChange={setSev} options={[['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
          <Select label="Insurer" value={ins} onChange={setIns} options={insurers.map((i) => [i, i])} />
          <Select label="Category" value={cat} onChange={setCat} options={categories.map((c) => [c, c])} />
          <Select label="Issue code" value={code} onChange={setCode} options={issueCodes.map((c) => [c.code, c.code])} />
        </div>
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <span aria-live="polite">
            Showing {filtered.length} of {rows.length}
          </span>
          <button type="button" className="underline underline-offset-2" onClick={clear}>
            Clear filters
          </button>
        </div>

        {view === 'table' ? <QueueTable rows={filtered} /> : <Kanban rows={filtered} />}
      </section>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className={cx('field', value && 'border-[var(--color-pine-700)] bg-[var(--color-pine-50)]')} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{label}: all</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function OutcomeCell({ r }: { r: QueueRow }) {
  if (!r.aiRec) return <span className="text-xs text-[var(--color-ink-muted)]">Awaiting full AI assessment</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <RecBadge rec={r.aiRec} />
      {r.outcomeSource !== 'ai' && r.outcome && r.outcome !== r.aiRec && (
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          Human {r.outcomeSource === 'proposed' ? 'proposal' : 'decision'} differs
        </span>
      )}
    </div>
  );
}

function QueueTable({ rows }: { rows: QueueRow[] }) {
  return (
    <div className="max-h-[720px] overflow-auto rounded-md border border-[var(--color-line-soft)]">
      <table className="w-full min-w-[980px] text-sm" data-testid="queue-table">
        <caption className="sr-only">Submissions in the review queue</caption>
        <thead>
          <tr className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-surface)] text-left text-xs text-[var(--color-ink-muted)]">
            <th scope="col" className="py-2 pr-3 pl-2">Rule</th>
            <th scope="col" className="py-2 pr-3">Proposed decline rule</th>
            <th scope="col" className="py-2 pr-3">Stage</th>
            <th scope="col" className="py-2 pr-3">
              <AiTag>AI recommendation</AiTag>
            </th>
            <th scope="col" className="py-2 pr-3 text-right">Score</th>
            <th scope="col" className="py-2 pr-3">Flags</th>
            <th scope="col" className="py-2 pr-3">Consumer impact</th>
            <th scope="col" className="py-2 text-right">Age (days)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--color-line-soft)] align-top hover:bg-[var(--color-pine-50)]">
              <td className="py-2 pr-3 pl-2 whitespace-nowrap">
                <Link to={`/rule/${r.id}`} className="font-semibold text-[var(--color-pine-900)] underline decoration-[var(--color-pine-200)] underline-offset-2 hover:decoration-[var(--color-pine-700)]">
                  {r.id}
                </Link>
                <div className="text-xs text-[var(--color-ink-muted)]">{r.insurer}</div>
              </td>
              <td className="max-w-[420px] py-2 pr-3">
                <p className="line-clamp-2">{r.ruleText}</p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{r.categories.join(' · ')}</p>
              </td>
              <td className="py-2 pr-3">
                <StageBadge stage={r.stage} />
              </td>
              <td className="py-2 pr-3">
                <OutcomeCell r={r} />
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.score ?? '—'}</td>
              <td className="py-2 pr-3">
                <div className="flex flex-col gap-1 text-xs">
                  {r.hardStop && (
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-stop-600)]">
                      <AlertOctagon size={13} aria-hidden /> Level 1 hard stop
                    </span>
                  )}
                  {r.seniorFlag && (
                    <span className="inline-flex items-center gap-1 text-[var(--color-gold-700)]">
                      <UserCheck size={13} aria-hidden /> Senior review
                    </span>
                  )}
                  {r.overrides > 0 && (
                    <span className="inline-flex items-center gap-1 text-[var(--color-pine-800)]">
                      <PenLine size={13} aria-hidden /> {r.overrides} override{r.overrides > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 pr-3">{r.consumerSeverity ? <SeverityBadge severity={r.consumerSeverity} /> : '—'}</td>
              <td className="py-2 text-right tabular-nums">{r.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kanban({ rows }: { rows: QueueRow[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGE_ORDER.map((s) => {
        const col = rows.filter((r) => r.stage === s);
        return (
          <section key={s} className="w-64 shrink-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]" aria-label={stageLabel(s)}>
            <h3 className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2 font-sans text-sm font-semibold text-[var(--color-ink)]">
              {stageLabel(s)} <span className="rounded-full bg-white px-2 text-xs">{col.length}</span>
            </h3>
            <ul className="max-h-[520px] space-y-2 overflow-y-auto p-2">
              {col.map((r) => (
                <li key={r.id}>
                  <Link to={`/rule/${r.id}`} className="block rounded-md border border-[var(--color-line)] bg-white p-2 text-sm hover:border-[var(--color-pine-700)]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-pine-900)]">{r.id}</span>
                      {r.hardStop && <AlertOctagon size={14} className="text-[var(--color-stop-600)]" aria-label="Level 1 hard stop" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-ink-muted)]">{r.ruleText}</p>
                    <div className="mt-1">{r.aiRec ? <RecBadge rec={r.aiRec} /> : <span className="text-xs">Awaiting full AI assessment</span>}</div>
                  </Link>
                </li>
              ))}
              {!col.length && <li className="px-1 py-2 text-xs text-[var(--color-ink-faint)]">None</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
