// Deterministic scoring. The language model writes findings per criterion; this code, not the model,
// turns findings into a recommendation. Weights and thresholds live in knowledge/framework.json.
import framework from '../../knowledge/framework.json';
import type { Severity, Status } from './schema';

export type RecommendationKey = 'APPROVE_WITH_CONDITIONS' | 'REQUEST_MORE_INFORMATION' | 'RECOMMEND_DECLINE' | 'OUT_OF_SCOPE';

export interface ScoringConfig {
  statusValues: Record<Status, number>;
  weights: Record<'2' | '3' | '4', number>;
  thresholds: { approveWithConditions: number; requestMoreInformation: number };
  materialInsufficientSeverities: Severity[];
}

export const DEFAULT_CONFIG: ScoringConfig = framework.scoring as ScoringConfig;

export interface ScoredCriterion {
  key: string;
  level: 1 | 2 | 3 | 4;
  status: Status;
  severity: Severity;
}

export interface LevelBreakdown {
  level: 2 | 3 | 4;
  weight: number;
  average: number;
  points: number;
  criteria: number;
}

export interface ScoreResult {
  recommendation: RecommendationKey;
  score: number | null;
  levels: LevelBreakdown[];
  reasons: string[];
  hardStop: boolean;
  materialInsufficient: string[];
  seniorReviewRequired: boolean;
  seniorReviewReasons: string[];
}

export function scoreLevels(criteria: ScoredCriterion[], config: ScoringConfig = DEFAULT_CONFIG): { score: number; levels: LevelBreakdown[] } {
  const levels: LevelBreakdown[] = ([2, 3, 4] as const).map((level) => {
    const items = criteria.filter((c) => c.level === level);
    const weight = config.weights[String(level) as '2' | '3' | '4'];
    const average = items.length ? items.reduce((s, c) => s + config.statusValues[c.status], 0) / items.length : 0;
    return { level, weight, average: round(average, 3), points: round(weight * average, 1), criteria: items.length };
  });
  const score = round(levels.reduce((s, l) => s + l.weight * l.average, 0), 1);
  return { score, levels };
}

export function scoreAssessment(
  input: { inScope: boolean; criteria: ScoredCriterion[]; confidence: 'high' | 'medium' | 'low' },
  config: ScoringConfig = DEFAULT_CONFIG,
): ScoreResult {
  const { criteria } = input;
  const seniorReviewReasons: string[] = [];
  if (input.confidence === 'low') seniorReviewReasons.push('AI confidence is low.');
  const l1Concerns = criteria.filter((c) => c.level === 1 && c.status === 'concern');
  if (l1Concerns.length) seniorReviewReasons.push(`Level 1 concern: ${l1Concerns.map((c) => c.key).join(', ')}.`);

  const { score, levels } = scoreLevels(criteria, config);
  const materialInsufficient = criteria
    .filter((c) => c.level > 1 && c.status === 'insufficient_information' && config.materialInsufficientSeverities.includes(c.severity))
    .map((c) => c.key);

  const base = { levels, materialInsufficient, seniorReviewRequired: seniorReviewReasons.length > 0, seniorReviewReasons };

  if (!input.inScope) {
    return { ...base, recommendation: 'OUT_OF_SCOPE', score: null, hardStop: false, reasons: ['Eligibility rule, not a decline rule: route to the eligibility-rule process.'] };
  }
  const l1Fails = criteria.filter((c) => c.level === 1 && c.status === 'fail');
  if (l1Fails.length) {
    return {
      ...base,
      recommendation: 'RECOMMEND_DECLINE',
      score,
      hardStop: true,
      reasons: [`Level 1 fail (${l1Fails.map((c) => c.key).join(', ')}): full-stop refusal under the framework.`],
    };
  }
  const highFails = criteria.filter((c) => c.level > 1 && c.status === 'fail' && c.severity === 'high');
  if (highFails.length) {
    return {
      ...base,
      recommendation: 'RECOMMEND_DECLINE',
      score,
      hardStop: false,
      reasons: [`High-severity fail at Levels 2-4 (${highFails.map((c) => c.key).join(', ')}).`],
    };
  }
  const t = config.thresholds;
  if (score < t.requestMoreInformation) {
    return { ...base, recommendation: 'RECOMMEND_DECLINE', score, hardStop: false, reasons: [`Score ${score} is below ${t.requestMoreInformation}.`] };
  }
  if (score < t.approveWithConditions || materialInsufficient.length) {
    const reasons: string[] = [];
    if (score < t.approveWithConditions) reasons.push(`Score ${score} is between ${t.requestMoreInformation} and ${t.approveWithConditions - 1}.`);
    if (materialInsufficient.length) reasons.push(`Material information gap that could change the outcome (${materialInsufficient.join(', ')}).`);
    return { ...base, recommendation: 'REQUEST_MORE_INFORMATION', score, hardStop: false, reasons };
  }
  return {
    ...base,
    recommendation: 'APPROVE_WITH_CONDITIONS',
    score,
    hardStop: false,
    reasons: [`Score ${score} is ${t.approveWithConditions} or above, with no hard stops or material information gaps.`],
  };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
