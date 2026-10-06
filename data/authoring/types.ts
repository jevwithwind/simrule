// Compact authoring format used by the batch AI analyst. Expanded by scripts/expand-assessments.ts.
// Evidence strings start with "R:" (verbatim from the rule text) or "J:" (verbatim from the insurer's rationale).

export type S = 'pass' | 'concern' | 'fail' | 'insuf';
export type V = 'low' | 'med' | 'high';

/** [status, severity, issueCodes, reasoning (2-4 sentences), evidence, citationIds] */
export type CriterionTuple = [S, V, string[], string, string[], string[]];

export interface Draft {
  id: string;
  /** Prompt version used for this draft. */
  pv: 'v1' | 'v2';
  /** [trigger, thresholdCount, lookbackYears, populationAffected, ruleType, definedTerms, undefinedTerms] */
  x: [string, number | null, number | null, string, 'decline' | 'eligibility' | 'unclear', string[], string[]];
  /** [inScope, note] */
  scope: [boolean, string];
  c: Record<string, CriterionTuple>;
  /** [refId, relation, explanation] */
  p: [string, 'same' | 'similar' | 'materially_different', string][];
  /** [whoCouldBeRefused, likelyConsequence, vulnerableGroups, severity] */
  ci: [string, string, string[], V];
  q: string[];
  w: string[];
  ns: [string, 'Analyst' | 'Senior reviewer' | 'Insurer', string][];
  conf: 'high' | 'medium' | 'low';
  u: string[];
}
