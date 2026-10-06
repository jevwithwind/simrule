// Builds queue rows for the dashboard from seeded rules, uploads and the current workflow state.
import { aiScores, assessmentsById, clusterOf, daysInQueue, rules } from '../data';
import type { UploadedSubmission } from '../store/store';
import type { CaseState, StageKey } from './workflow';
import { currentOutcome } from './workflow';
import type { Severity } from './schema';

export interface QueueRow {
  id: string;
  insurer: string;
  ruleText: string;
  categories: string[];
  dateSubmitted: string;
  age: number;
  stage: StageKey;
  aiRec: string | null;
  score: number | null;
  hardStop: boolean;
  seniorFlag: boolean;
  consumerSeverity: Severity | null;
  confidence: string | null;
  issueCodes: string[];
  cluster: number;
  outcome: string | null;
  outcomeSource: 'human' | 'proposed' | 'ai' | null;
  overrides: number;
  uploaded: boolean;
}

const SEV_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export function buildQueue(cases: Record<string, CaseState>, uploads: UploadedSubmission[]): QueueRow[] {
  const rows: QueueRow[] = rules.map((r) => {
    const a = assessmentsById.get(r.id)!;
    const ai = aiScores.get(r.id)!;
    const c = cases[r.id];
    const out = currentOutcome(ai, c);
    return {
      id: r.id,
      insurer: r.insurer,
      ruleText: r.ruleText,
      categories: r.categories,
      dateSubmitted: r.dateSubmitted,
      age: daysInQueue(r.dateSubmitted),
      stage: c?.stage ?? 'ANALYST_REVIEW',
      aiRec: ai.recommendation,
      score: ai.score,
      hardStop: ai.hardStop,
      seniorFlag: ai.seniorReviewRequired,
      consumerSeverity: a.consumerImpact.severity,
      confidence: a.confidence,
      issueCodes: [...new Set(a.criteria.filter((x) => x.status !== 'pass').flatMap((x) => x.issueCodes))],
      cluster: clusterOf.get(r.id) ?? 0,
      outcome: out.outcome,
      outcomeSource: out.source,
      overrides: Object.keys(c?.overrides ?? {}).length,
      uploaded: false,
    };
  });
  for (const u of uploads) {
    const c = cases[u.id];
    rows.push({
      id: u.id,
      insurer: u.rule.insurer || 'Unknown insurer',
      ruleText: u.rule.ruleText,
      categories: u.rule.categories,
      dateSubmitted: u.rule.dateSubmitted,
      age: 0,
      stage: c?.stage ?? 'AI_PRE_ASSESSMENT',
      aiRec: null,
      score: null,
      hardStop: false,
      seniorFlag: false,
      consumerSeverity: null,
      confidence: null,
      issueCodes: u.triage.flags.map((f) => f.code),
      cluster: 0,
      outcome: null,
      outcomeSource: null,
      overrides: 0,
      uploaded: true,
    });
  }
  return rows;
}

export type SortKey = 'risk' | 'age' | 'cluster' | 'id';

export function sortRows(rows: QueueRow[], key: SortKey): QueueRow[] {
  const r = [...rows];
  switch (key) {
    case 'risk':
      return r.sort(
        (a, b) =>
          Number(b.hardStop) - Number(a.hardStop) ||
          (SEV_RANK[b.consumerSeverity ?? ''] ?? 0) - (SEV_RANK[a.consumerSeverity ?? ''] ?? 0) ||
          (a.score ?? 101) - (b.score ?? 101) ||
          a.id.localeCompare(b.id),
      );
    case 'age':
      return r.sort((a, b) => b.age - a.age || a.id.localeCompare(b.id));
    case 'cluster': {
      const size = new Map<number, number>();
      for (const x of r) size.set(x.cluster, (size.get(x.cluster) ?? 0) + 1);
      return r.sort((a, b) => (size.get(b.cluster) ?? 0) - (size.get(a.cluster) ?? 0) || a.cluster - b.cluster || a.id.localeCompare(b.id));
    }
    default:
      return r.sort((a, b) => a.id.localeCompare(b.id));
  }
}
