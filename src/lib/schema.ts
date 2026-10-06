import { z } from 'zod';

export const STATUS = ['pass', 'concern', 'fail', 'insufficient_information'] as const;
export const SEVERITY = ['low', 'medium', 'high'] as const;
export const RELATION = ['same', 'similar', 'materially_different'] as const;
export const OWNER = ['Analyst', 'Senior reviewer', 'Insurer'] as const;
export const CONFIDENCE = ['high', 'medium', 'low'] as const;

export const REQUIRED_CRITERIA: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['L1_LEGISLATION', 'L1_HUMAN_RIGHTS', 'L1_MARKET'],
  2: ['L2_ACCURATE', 'L2_NO_DISCRIMINATION', 'L2_ACCESSIBLE', 'L2_COST_MITIGATION', 'L2_BALANCED', 'L2_CLEAR_COMMUNICATION'],
  3: ['L3_NOT_SUBJECTIVE', 'L3_NOT_ARBITRARY', 'L3_RISK_LINK', 'L3_ACTUARIAL', 'L3_DEFINITION'],
  4: ['L4_PUBLIC_POLICY'],
};
export const ALL_CRITERIA = Object.values(REQUIRED_CRITERIA).flat();

export const EvidenceSchema = z.object({
  source: z.enum(['ruleText', 'rationale']),
  quote: z.string().min(1),
});

export const CriterionSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  key: z.string(),
  label: z.string(),
  status: z.enum(STATUS),
  severity: z.enum(SEVERITY),
  issueCodes: z.array(z.string()),
  reasoning: z.string().min(20),
  evidence: z.array(EvidenceSchema),
  citationIds: z.array(z.string()),
});

export const PrecedentLinkSchema = z.object({
  refId: z.string(),
  similarity: z.number().min(0).max(1),
  relation: z.enum(RELATION),
  explanation: z.string().min(10),
});

export const AssessmentSchema = z.object({
  id: z.string().regex(/^DR-\d{3}$|^UP-\d+$/),
  extracted: z.object({
    trigger: z.string(),
    thresholdCount: z.number().nullable(),
    lookbackYears: z.number().nullable(),
    populationAffected: z.string(),
    ruleType: z.enum(['decline', 'eligibility', 'unclear']),
    definedTerms: z.array(z.string()),
    undefinedTerms: z.array(z.string()),
  }),
  scope: z.object({ inScope: z.boolean(), note: z.string() }),
  criteria: z.array(CriterionSchema),
  precedents: z.array(PrecedentLinkSchema),
  consumerImpact: z.object({
    whoCouldBeRefused: z.string(),
    likelyConsequence: z.string(),
    vulnerableGroups: z.array(z.string()),
    severity: z.enum(SEVERITY),
  }),
  questionsForInsurer: z.array(z.string()),
  whatWouldChangeTheOutcome: z.array(z.string()),
  nextSteps: z.array(z.object({ action: z.string(), owner: z.enum(OWNER), reason: z.string() })),
  confidence: z.enum(CONFIDENCE),
  uncertainties: z.array(z.string()),
  provenance: z.object({
    generatedBy: z.string(),
    promptVersion: z.string(),
    frameworkVersion: z.string(),
    generatedOn: z.string(),
  }),
  auditNotes: z.array(z.string()).optional(),
});

export type Status = (typeof STATUS)[number];
export type Severity = (typeof SEVERITY)[number];
export type Relation = (typeof RELATION)[number];
export type Criterion = z.infer<typeof CriterionSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type PrecedentLink = z.infer<typeof PrecedentLinkSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;

export interface Rule {
  id: string;
  insurer: string;
  dateSubmitted: string;
  ruleText: string;
  rationale: string;
  categories: string[];
  categoryLabel: string;
}

export interface Precedent {
  id: string;
  type: 'approved_precedent' | 'framework_common_example' | 'illustrative_non_compliant' | 'reviewer_decision';
  ruleText: string;
  insurer: string | null;
  approvalYear: number | null;
  categories: string[];
  illustrative: boolean;
  outcome: string;
  source: string;
  level?: number;
  reason?: string;
}

export interface Citation {
  id: string;
  instrument: string;
  section: string | null;
  sectionToConfirm: string | null;
  url: string;
  verified: boolean;
  retrievedOn: string | null;
  supports: string;
}

/** Structural checks that zod cannot express: required criteria, verbatim quotes, known ids. */
export function validateAssessmentContent(
  a: Assessment,
  rule: Pick<Rule, 'ruleText' | 'rationale'>,
  known: { citationIds: Set<string>; issueCodes: Set<string>; refIds: Set<string> },
): string[] {
  const errors: string[] = [];
  const keys = a.criteria.map((c) => c.key);
  for (const k of ALL_CRITERIA) {
    if (!keys.includes(k)) errors.push(`missing criterion ${k}`);
  }
  if (new Set(keys).size !== keys.length) errors.push('duplicate criterion keys');
  for (const c of a.criteria) {
    const expectedLevel = Number(c.key.slice(1, 2));
    if (c.level !== expectedLevel) errors.push(`${c.key}: level ${c.level} does not match key`);
    for (const e of c.evidence) {
      const hay = e.source === 'ruleText' ? rule.ruleText : rule.rationale;
      if (!hay.includes(e.quote)) errors.push(`${c.key}: quote not verbatim in ${e.source}: "${e.quote}"`);
    }
    for (const id of c.citationIds) if (!known.citationIds.has(id)) errors.push(`${c.key}: unknown citation ${id}`);
    for (const code of c.issueCodes) if (!known.issueCodes.has(code)) errors.push(`${c.key}: unknown issue code ${code}`);
    if (c.status !== 'pass' && c.issueCodes.length === 0 && c.key !== 'L1_MARKET') {
      errors.push(`${c.key}: non-pass status needs at least one issue code`);
    }
    const sentences = c.reasoning.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0).length;
    if (sentences < 2 || sentences > 4) errors.push(`${c.key}: reasoning has ${sentences} sentences (need 2-4)`);
  }
  for (const p of a.precedents) if (!known.refIds.has(p.refId)) errors.push(`unknown precedent ref ${p.refId}`);
  if (a.nextSteps.length === 0) errors.push('no next steps');
  return errors;
}
