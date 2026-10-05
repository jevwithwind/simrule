// Static data layer: rules, precomputed AI assessments, knowledge base. Everything ships with the static build.
import rulesJson from '../../data/rules.json';
import frameworkJson from '../../knowledge/framework.json';
import precedentsJson from '../../knowledge/precedents.json';
import citationsJson from '../../knowledge/citations.json';
import candidatesJson from '../../data/similarity-candidates.json';
import type { Assessment, Citation, Precedent, Rule } from '../lib/schema';
import { scoreAssessment, type ScoreResult } from '../lib/scoring';
import { SimilarityIndex, type SimDoc } from '../lib/similarity';

export const framework = frameworkJson;
export type Framework = typeof frameworkJson;

export const rules: Rule[] = rulesJson as Rule[];
export const rulesById = new Map(rules.map((r) => [r.id, r]));

const assessmentModules = import.meta.glob('../../data/assessments/*.json', { eager: true, import: 'default' }) as Record<string, Assessment>;
export const assessments: Assessment[] = Object.values(assessmentModules).sort((a, b) => a.id.localeCompare(b.id));
export const assessmentsById = new Map(assessments.map((a) => [a.id, a]));

export const precedents: Precedent[] = precedentsJson.precedents as Precedent[];
export const precedentsById = new Map(precedents.map((p) => [p.id, p]));

export const citations: Citation[] = citationsJson.citations as Citation[];
export const citationsById = new Map(citations.map((c) => [c.id, c]));

export const issueCodes = framework.issueCodes;
export const issueCodesByCode = new Map(issueCodes.map((c) => [c.code, c]));

export const criterionDefs = framework.levels.flatMap((l) => l.criteria.map((c) => ({ ...c, level: l.level as 1 | 2 | 3 | 4, levelName: l.name })));
export const criterionDefsByKey = new Map(criterionDefs.map((c) => [c.key, c]));

export const stages = framework.workflowStages;
export type StageKey = 'RECEIVED' | 'INTAKE' | 'AI_PRE_ASSESSMENT' | 'ANALYST_REVIEW' | 'INFO_REQUESTED' | 'SENIOR_SIGN_OFF' | 'DECIDED' | 'CLOSED';
export const stageLabel = (k: string) => stages.find((s) => s.key === k)?.label ?? k;

export const recommendationLabel = (k: string) => framework.recommendations.find((r) => r.key === k)?.label ?? k;
export const decisionLabel = (k: string) => framework.decisionOptions.find((d) => d.key === k)?.label ?? k;

export interface CandidateSet {
  id: string;
  candidates: { id: string; kind: 'submission' | 'precedent'; score: number; insurer: string | null; sameInsurer: boolean }[];
}
export const candidatesById = new Map((candidatesJson as CandidateSet[]).map((c) => [c.id, c]));

/** AI recommendation for every seeded rule, computed by the deterministic scoring code from the AI findings. */
export const aiScores = new Map<string, ScoreResult>(
  assessments.map((a) => [a.id, scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence })]),
);

/** Similarity index over submissions and precedents, used by intake triage and the consistency monitor. */
export const similarityIndex = new SimilarityIndex([
  ...rules.map((r) => ({ id: r.id, text: r.ruleText, categories: r.categories, kind: 'submission' as const })),
  ...precedents.map((p) => ({ id: p.id, text: p.ruleText, categories: p.categories, kind: 'precedent' as const })),
] satisfies SimDoc[]);

/** Pairs of submissions with similarity of 0.35 or more (the threshold used by the consistency audit). */
export const PAIR_THRESHOLD = 0.35;
export const similarPairs: { a: string; b: string; similarity: number }[] = (() => {
  const seen = new Set<string>();
  const out: { a: string; b: string; similarity: number }[] = [];
  for (const r of rules) {
    for (const s of similarityIndex.query({ id: r.id, text: r.ruleText, categories: r.categories })) {
      if (s.kind !== 'submission' || s.score < PAIR_THRESHOLD) continue;
      const key = [r.id, s.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const [a, b] = [r.id, s.id].sort();
      out.push({ a, b, similarity: s.score });
    }
  }
  return out.sort((x, y) => y.similarity - x.similarity);
})();

/** Connected components of similar pairs, used for the "similarity cluster" sort. */
export const clusterOf: Map<string, number> = (() => {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  for (const r of rules) parent.set(r.id, r.id);
  for (const p of similarPairs) parent.set(find(p.a), find(p.b));
  const roots = new Map<string, number>();
  const out = new Map<string, number>();
  for (const r of rules) {
    const root = find(r.id);
    if (!roots.has(root)) roots.set(root, roots.size + 1);
    out.set(r.id, roots.get(root)!);
  }
  return out;
})();

/** Fixed "as of" date for queue ageing; the fictional submissions date from June to November 2024. */
export const DEMO_TODAY = '2024-12-16';
export function daysInQueue(dateSubmitted: string): number {
  return Math.round((Date.parse(DEMO_TODAY) - Date.parse(dateSubmitted)) / 86_400_000);
}

export const insurers = [...new Set(rules.map((r) => r.insurer))].sort();
export const categories = [...new Set(rules.flatMap((r) => r.categories))].sort();
