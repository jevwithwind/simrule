import { useId, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  FileQuestion,
  Info,
  Route,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { citationsById, issueCodesByCode, recommendationLabel, stageLabel, decisionLabel } from '../data';
import type { Severity, Status } from '../lib/schema';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const STATUS: Record<Status, { label: string; icon: ReactNode; cls: string }> = {
  pass: { label: 'Meets standard', icon: <CheckCircle2 size={14} aria-hidden />, cls: 'bg-[var(--color-pass-bg)] text-[var(--color-pass-fg)]' },
  concern: { label: 'Concern', icon: <AlertTriangle size={14} aria-hidden />, cls: 'bg-[var(--color-concern-bg)] text-[var(--color-concern-fg)]' },
  fail: { label: 'Does not meet', icon: <XCircle size={14} aria-hidden />, cls: 'bg-[var(--color-fail-bg)] text-[var(--color-fail-fg)]' },
  insufficient_information: { label: 'Insufficient info', icon: <CircleHelp size={14} aria-hidden />, cls: 'bg-[var(--color-insuf-bg)] text-[var(--color-insuf-fg)]' },
};

export function StatusBadge({ status, compact }: { status: Status; compact?: boolean }) {
  const s = STATUS[status];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', s.cls)}>
      {s.icon}
      {compact ? <span className="sr-only">{s.label}</span> : s.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const bars = severity === 'high' ? 3 : severity === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)]" title={`Severity: ${severity}`}>
      <span className="inline-flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cx('w-[4px] rounded-sm', i <= bars ? 'bg-[var(--color-ink-muted)]' : 'bg-[var(--color-line)]')} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      <span className="capitalize">{severity}</span>
    </span>
  );
}

const REC: Record<string, { icon: ReactNode; cls: string }> = {
  APPROVE_WITH_CONDITIONS: { icon: <BadgeCheck size={15} aria-hidden />, cls: 'border-[#1f8a5c] text-[#145c3d] bg-[#e7f4ee]' },
  REQUEST_MORE_INFORMATION: { icon: <FileQuestion size={15} aria-hidden />, cls: 'border-[#c9a227] text-[#6e4d00] bg-[#fbf3d9]' },
  RECOMMEND_DECLINE: { icon: <Ban size={15} aria-hidden />, cls: 'border-[#5b4a8b] text-[#3f3166] bg-[#efecf7]' },
  OUT_OF_SCOPE: { icon: <Route size={15} aria-hidden />, cls: 'border-[#5d6b78] text-[#3d4852] bg-[#eef1f4]' },
  ESCALATED: { icon: <ShieldAlert size={15} aria-hidden />, cls: 'border-[#5d6b78] text-[#3d4852] bg-[#eef1f4]' },
};

export function RecBadge({ rec, size = 'sm' }: { rec: string; size?: 'sm' | 'lg' }) {
  const r = REC[rec] ?? REC.OUT_OF_SCOPE;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md border font-semibold whitespace-nowrap', r.cls, size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2 py-0.5 text-xs')}>
      {r.icon}
      {rec === 'ESCALATED' ? 'Escalated' : recommendationLabel(rec)}
    </span>
  );
}

export function DecisionBadge({ option }: { option: string }) {
  const map: Record<string, string> = { APPROVE_WITH_CONDITIONS: 'APPROVE_WITH_CONDITIONS', REQUEST_INFORMATION: 'REQUEST_MORE_INFORMATION', DECLINE: 'RECOMMEND_DECLINE', ESCALATE: 'ESCALATED', ROUTE_OUT_OF_SCOPE: 'OUT_OF_SCOPE' };
  const r = REC[map[option]] ?? REC.OUT_OF_SCOPE;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', r.cls)}>
      {r.icon}
      {decisionLabel(option)}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-white px-2 py-0.5 text-xs font-medium whitespace-nowrap text-[var(--color-ink-muted)]">
      {stageLabel(stage)}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-medium', confidence === 'low' ? 'text-[var(--color-concern-fg)]' : 'text-[var(--color-ink-muted)]')}>
      {confidence === 'low' && <AlertTriangle size={13} aria-hidden />}
      Confidence: <span className="capitalize">{confidence}</span>
    </span>
  );
}

/** Accessible tooltip: shown on hover and keyboard focus, described by aria-describedby. */
export function Tip({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={cx('relative inline-flex', className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span tabIndex={0} aria-describedby={id} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} className="inline-flex rounded">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cx(
          'pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 w-72 rounded-md bg-[var(--color-pine-950)] px-3 py-2 text-xs leading-snug font-normal text-white shadow-lg',
          open ? 'block' : 'hidden',
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function IssueChip({ code }: { code: string }) {
  const def = issueCodesByCode.get(code);
  return (
    <Tip
      label={
        <>
          <span className="block font-semibold">{def?.label ?? code}</span>
          <span className="mt-1 block opacity-90">Level {def?.level} · default severity {def?.defaultSeverity}</span>
          <span className="mt-1 block opacity-90">What the insurer could do: {def?.remedy}</span>
        </>
      }
    >
      <span className="inline-flex cursor-help items-center gap-1 rounded border border-[var(--color-line)] bg-[var(--color-paper)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink)]">
        {code}
      </span>
    </Tip>
  );
}

export function CitationBadge({ id }: { id: string }) {
  const c = citationsById.get(id);
  if (!c) return null;
  const href = c.url.startsWith('http') ? c.url : undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-xs">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[var(--color-pine-800)] underline decoration-[var(--color-pine-200)] underline-offset-2 hover:decoration-[var(--color-pine-700)]">
          {c.instrument}
          {c.section ? `, ${c.section}` : ''}
          <ExternalLink size={11} aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <span className="text-[var(--color-ink)]">
          {c.instrument}
          {c.section ? `, ${c.section}` : ''}
        </span>
      )}
      {c.verified ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-pass-bg)] px-1.5 text-[10px] font-semibold text-[var(--color-pass-fg)]">
          <CheckCircle2 size={10} aria-hidden /> verified
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-concern-bg)] px-1.5 text-[10px] font-semibold text-[var(--color-concern-fg)]">
          <Info size={10} aria-hidden /> section not verified
        </span>
      )}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function AiTag({ children = 'AI recommendation (advisory)' }: { children?: ReactNode }) {
  return <span className="ai-tag">{children}</span>;
}

export function HumanTag({ children = 'Human decision' }: { children?: ReactNode }) {
  return <span className="human-tag">{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-muted)]">{children}</div>;
}
