import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2, BarChart3 } from 'lucide-react';
import { issueCodesByCode, recommendationLabel } from '../data';
import type { QueueRow } from '../lib/queue';

// Outcome colours: validated categorical set (adjacent CVD separation passes; gold is under 3:1 on the
// surface, so the chart always ships a legend, tooltips and a table view).
const OUTCOMES = [
  { key: 'APPROVE_WITH_CONDITIONS', color: '#1f8a5c' },
  { key: 'REQUEST_MORE_INFORMATION', color: '#c9a227' },
  { key: 'RECOMMEND_DECLINE', color: '#5b4a8b' },
] as const;
const SURFACE = '#fffdf8';
const GRID = '#ebe5d8';
const INK_MUTED = '#4a5752';

function ChartFrame({ title, subtitle, table, children }: { title: string; subtitle: string; table: React.ReactNode; children: React.ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="card flex flex-col p-4" aria-label={title}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
          <p className="text-xs text-[var(--color-ink-muted)]">{subtitle}</p>
        </div>
        <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
          {asTable ? <BarChart3 size={14} aria-hidden /> : <Table2 size={14} aria-hidden />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {asTable ? <div className="max-h-[300px] overflow-auto">{table}</div> : children}
    </section>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: number | string; color?: string }[] }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-[var(--color-ink)]">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-[var(--color-ink-muted)]">
          {r.color && <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} aria-hidden />}
          <span className="flex-1">{r.label}</span>
          <span className="font-semibold text-[var(--color-ink)] tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function RecsByCategory({ rows }: { rows: QueueRow[] }) {
  const data = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const r of rows) {
      if (!r.aiRec) continue;
      for (const c of r.categories) {
        const e = m.get(c) ?? { APPROVE_WITH_CONDITIONS: 0, REQUEST_MORE_INFORMATION: 0, RECOMMEND_DECLINE: 0 };
        e[r.aiRec] = (e[r.aiRec] ?? 0) + 1;
        m.set(c, e);
      }
    }
    type Row = { category: string; APPROVE_WITH_CONDITIONS: number; REQUEST_MORE_INFORMATION: number; RECOMMEND_DECLINE: number; total: number };
    const all: Row[] = [...m.entries()].map(([category, v]) => ({
      category,
      APPROVE_WITH_CONDITIONS: v.APPROVE_WITH_CONDITIONS ?? 0,
      REQUEST_MORE_INFORMATION: v.REQUEST_MORE_INFORMATION ?? 0,
      RECOMMEND_DECLINE: v.RECOMMEND_DECLINE ?? 0,
      total: (v.APPROVE_WITH_CONDITIONS ?? 0) + (v.REQUEST_MORE_INFORMATION ?? 0) + (v.RECOMMEND_DECLINE ?? 0),
    }));
    all.sort((a, b) => b.total - a.total);
    const top = all.slice(0, 9);
    const rest = all.slice(9);
    if (rest.length) {
      top.push({
        category: `Other (${rest.length} categories)`,
        APPROVE_WITH_CONDITIONS: rest.reduce((s, x) => s + x.APPROVE_WITH_CONDITIONS, 0),
        REQUEST_MORE_INFORMATION: rest.reduce((s, x) => s + x.REQUEST_MORE_INFORMATION, 0),
        RECOMMEND_DECLINE: rest.reduce((s, x) => s + x.RECOMMEND_DECLINE, 0),
        total: rest.reduce((s, x) => s + x.total, 0),
      });
    }
    return top;
  }, [rows]);

  return (
    <ChartFrame
      title="AI recommendations by rule category"
      subtitle="Count of rules. A rule with two categories counts in both."
      table={
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--color-ink-muted)]">
              <th className="py-1">Category</th>
              {OUTCOMES.map((o) => (
                <th key={o.key} className="py-1 text-right">
                  {recommendationLabel(o.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.category} className="border-t border-[var(--color-line-soft)]">
                <td className="py-1">{d.category}</td>
                {OUTCOMES.map((o) => (
                  <td key={o.key} className="py-1 text-right">
                    {(d as unknown as Record<string, number>)[o.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-muted)]" aria-label="Legend">
        {OUTCOMES.map((o) => (
          <li key={o.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: o.color }} aria-hidden />
            {recommendationLabel(o.key)}
          </li>
        ))}
      </ul>
      <div className="h-[290px]" role="img" aria-label="Stacked bar chart of AI recommendations by category. Use the Table button for the values.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis type="category" dataKey="category" width={128} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(5,71,58,0.06)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox title={String(label)} rows={OUTCOMES.map((o) => ({ label: recommendationLabel(o.key), value: Number(payload[0].payload[o.key]), color: o.color }))} />
                ) : null
              }
            />
            {OUTCOMES.map((o, i) => (
              <Bar key={o.key} dataKey={o.key} stackId="r" fill={o.color} stroke={SURFACE} strokeWidth={2} maxBarSize={20} radius={i === OUTCOMES.length - 1 ? [0, 4, 4, 0] : 0} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function TopIssueCodes({ rows }: { rows: QueueRow[] }) {
  const data = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.aiRec) for (const c of r.issueCodes) m.set(c, (m.get(c) ?? 0) + 1);
    return [...m.entries()]
      .filter(([c]) => c !== 'NO_ACTUARIAL_SUPPORT')
      .map(([code, count]) => ({ code, label: issueCodesByCode.get(code)?.label ?? code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);
  return (
    <ChartFrame
      title="Most frequent issue codes"
      subtitle="Rules with the code on a non-passing finding. Missing actuarial support (all 100 rules) is excluded."
      table={
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--color-ink-muted)]">
              <th className="py-1">Issue code</th>
              <th className="py-1 text-right">Rules</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.code} className="border-t border-[var(--color-line-soft)]">
                <td className="py-1">
                  <span className="font-mono">{d.code}</span>
                  <span className="block text-[var(--color-ink-muted)]">{d.label}</span>
                </td>
                <td className="py-1 text-right">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-[310px]" role="img" aria-label="Bar chart of the most frequent issue codes. Use the Table button for the values.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis type="category" dataKey="label" width={200} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} interval={0} />
            <Tooltip
              cursor={{ fill: 'rgba(5,71,58,0.06)' }}
              content={({ active, payload }) =>
                active && payload?.length ? <TooltipBox title={String(payload[0].payload.code)} rows={[{ label: 'Rules', value: Number(payload[0].value) }]} /> : null
              }
            />
            <Bar dataKey="count" fill="#136b58" maxBarSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', fontSize: 11, fill: INK_MUTED }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function Meter({ value, label, detail }: { value: number | null; label: string; detail: string }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
        <span className="text-2xl font-semibold text-[var(--color-ink)]">{value === null ? 'n/a' : `${pct}%`}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-[var(--color-pine-100)]" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-2 rounded-full bg-[var(--color-pine-700)]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{detail}</p>
    </div>
  );
}
