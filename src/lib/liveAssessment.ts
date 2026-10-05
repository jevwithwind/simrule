// Optional live AI assessment of an uploaded rule, run from the visitor's browser with their own API key.
// Same prompt (prompts/assessment-prompt.md, v2), same schema checks and same deterministic scoring as the
// 100 seeded assessments. The model returns findings only; Simrule's scoring code computes the recommendation.
import { z } from 'zod';
import promptMarkdown from '../../prompts/assessment-prompt.md?raw';
import { ALL_CRITERIA, AssessmentSchema, CONFIDENCE, OWNER, RELATION, SEVERITY, STATUS, validateAssessmentContent, type Assessment, type Citation, type Precedent, type Rule } from './schema';

type Framework = {
  version: string;
  levels: { level: number; name: string; evaluation: string; scoringRole: string; criteria: { key: string; label: string; question: string }[] }[];
  issueCodes: { code: string; label: string; level: number; defaultSeverity: string }[];
};

export interface LiveContext {
  framework: Framework;
  citations: Citation[];
  precedents: Precedent[];
  rulesById: Map<string, Rule>;
}

export interface SimilarCandidate {
  id: string;
  kind: 'submission' | 'precedent';
  score: number;
}

const nonEmpty = (xs: string[]) => xs as [string, ...string[]];

/** Output schema for structured outputs. Enums restrict criteria, issue codes, citations and references to known ids. */
export function liveOutputSchema(ctx: LiveContext, candidateIds: string[]) {
  const refIds = [...new Set([...candidateIds, ...ctx.precedents.map((p) => p.id)])];
  return z.object({
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
    criteria: z.array(
      z.object({
        key: z.enum(nonEmpty(ALL_CRITERIA)),
        status: z.enum(STATUS),
        severity: z.enum(SEVERITY),
        issueCodes: z.array(z.enum(nonEmpty(ctx.framework.issueCodes.map((c) => c.code)))),
        reasoning: z.string(),
        evidence: z.array(z.object({ source: z.enum(['ruleText', 'rationale']), quote: z.string() })),
        citationIds: z.array(z.enum(nonEmpty(ctx.citations.map((c) => c.id)))),
      }),
    ),
    precedents: z.array(z.object({ refId: z.enum(nonEmpty(refIds)), relation: z.enum(RELATION), explanation: z.string() })),
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
  });
}
export type LiveOutput = z.infer<ReturnType<typeof liveOutputSchema>>;

/** Fills the v1 base prompt and appends the v2 rules, exactly as used for the seeded assessments. */
export function buildSystemPrompt(ctx: LiveContext, rule: Rule, similar: SimilarCandidate[]): string {
  const v2Start = promptMarkdown.indexOf('### Additional rules in v2');
  const v1Start = promptMarkdown.indexOf('## v1');
  const v2Rules = promptMarkdown.slice(v2Start, promptMarkdown.indexOf('---', v2Start)).trim();
  const base = promptMarkdown.slice(promptMarkdown.indexOf('\n', v1Start) + 1).trim();

  const framework = ctx.framework.levels
    .map((l) => `Level ${l.level}: ${l.name}. ${l.evaluation} ${l.scoringRole}\n${l.criteria.map((c) => `- ${c.key} (${c.label}): ${c.question}`).join('\n')}`)
    .join('\n\n');
  const issueCodes = ctx.framework.issueCodes.map((c) => `- ${c.code} (Level ${c.level}, default ${c.defaultSeverity}): ${c.label}`).join('\n');
  // Only id, instrument and what it supports. Unconfirmed section numbers are never sent, so they cannot be cited.
  const citations = ctx.citations.map((c) => `- ${c.id}: ${c.instrument} (${c.verified ? 'verified' : 'unverified, do not cite a section number'}). Supports: ${c.supports}`).join('\n');
  const precedents = ctx.precedents
    .map((p) => `- ${p.id} [${p.type}${p.insurer ? `, ${p.insurer} ${p.approvalYear}` : ''}]: ${p.ruleText} Outcome: ${p.outcome}.`)
    .join('\n');
  const submission = [
    `id: ${rule.id}`,
    `insurer: ${rule.insurer || 'not stated'}`,
    `date submitted: ${rule.dateSubmitted || 'not stated'}`,
    `rule text: ${rule.ruleText}`,
    `rationale: ${rule.rationale || 'not supplied'}`,
    `categories: ${rule.categoryLabel || 'not stated'}`,
  ].join('\n');
  const candidates = similar
    .map((s) => {
      const text = s.kind === 'precedent' ? ctx.precedents.find((p) => p.id === s.id)?.ruleText : ctx.rulesById.get(s.id)?.ruleText;
      const insurer = s.kind === 'submission' ? ` (pending submission from ${ctx.rulesById.get(s.id)?.insurer})` : '';
      return `- ${s.id}${insurer}, similarity ${s.score.toFixed(2)}: ${text}`;
    })
    .join('\n');

  return `${base
    .replace('{{FRAMEWORK}}', framework)
    .replace('{{ISSUE_CODES}}', issueCodes)
    .replace('{{CITATIONS}}', citations)
    .replace('{{PRECEDENTS}}', precedents)
    .replace('{{SUBMISSION}}', submission)
    .replace('{{CANDIDATES}}', candidates)}\n\n${v2Rules}\n\nThe id and provenance fields are added by Simrule; omit them.`;
}

export interface AssembleResult {
  assessment: Assessment | null;
  errors: string[];
  notes: string[];
}

/** Turns the model output into a Simrule assessment and runs the same checks as the seeded assessments. */
export function assembleAssessment(out: LiveOutput, rule: Rule, similar: SimilarCandidate[], ctx: LiveContext, generatedOn: string): AssembleResult {
  const labels = new Map(ctx.framework.levels.flatMap((l) => l.criteria.map((c) => [c.key, c.label] as const)));
  const notes: string[] = [];
  let dropped = 0;
  const criteria = out.criteria.map((c) => {
    const evidence = c.evidence.filter((e) => {
      const ok = (e.source === 'ruleText' ? rule.ruleText : rule.rationale).includes(e.quote);
      if (!ok) dropped++;
      return ok;
    });
    return { ...c, level: Number(c.key.slice(1, 2)) as 1 | 2 | 3 | 4, label: labels.get(c.key) ?? c.key, evidence };
  });
  if (dropped) notes.push(`Removed ${dropped} evidence quote${dropped === 1 ? '' : 's'} that did not match the filing word for word.`);

  const candidate = {
    id: rule.id,
    extracted: out.extracted,
    scope: out.scope,
    criteria,
    precedents: out.precedents.map((p) => ({ ...p, similarity: similar.find((s) => s.id === p.refId)?.score ?? 0 })),
    consumerImpact: out.consumerImpact,
    questionsForInsurer: out.questionsForInsurer,
    whatWouldChangeTheOutcome: out.whatWouldChangeTheOutcome,
    nextSteps: out.nextSteps,
    confidence: out.confidence,
    uncertainties: out.uncertainties,
    provenance: { generatedBy: 'Live AI assessment (visitor API key)', promptVersion: 'v2', frameworkVersion: ctx.framework.version, generatedOn },
    auditNotes: notes.length ? notes : undefined,
  };

  const parsed = AssessmentSchema.safeParse(candidate);
  if (!parsed.success) return { assessment: null, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`), notes };
  const errors = validateAssessmentContent(parsed.data, rule, {
    citationIds: new Set(ctx.citations.map((c) => c.id)),
    issueCodes: new Set(ctx.framework.issueCodes.map((c) => c.code)),
    refIds: new Set([...ctx.precedents.map((p) => p.id), ...ctx.rulesById.keys()]),
  });
  // Sentence-count problems are shown to the reviewer as warnings rather than discarding a paid run.
  const warnings = errors.filter((e) => e.includes('sentences'));
  const blocking = errors.filter((e) => !e.includes('sentences'));
  if (warnings.length) notes.push(...warnings.map((w) => `Check: ${w}.`));
  if (blocking.length) return { assessment: null, errors: blocking, notes };
  return { assessment: { ...parsed.data, auditNotes: notes.length ? notes : undefined }, errors: [], notes };
}
