// Workflow model: case state, human overrides, sign-off triggers and the seeded demo state.
// Pure functions so the rules that decide when a human must sign off are testable.
import type { Assessment, Criterion, Rule, Severity, Status } from './schema';
import { scoreAssessment, type RecommendationKey, type ScoreResult } from './scoring';

export type Role = 'Analyst' | 'Senior reviewer';
export type StageKey = 'RECEIVED' | 'INTAKE' | 'AI_PRE_ASSESSMENT' | 'ANALYST_REVIEW' | 'INFO_REQUESTED' | 'SENIOR_SIGN_OFF' | 'DECIDED' | 'CLOSED';
export type DecisionKey = 'APPROVE_WITH_CONDITIONS' | 'REQUEST_INFORMATION' | 'DECLINE' | 'ESCALATE' | 'ROUTE_OUT_OF_SCOPE';
export type TriggerKey = 'DIVERGES_FROM_AI' | 'LEVEL1_OVERRIDDEN' | 'LOW_CONFIDENCE' | 'LEVEL1_CONCERN' | 'ESCALATED';

export const SEED_ACTOR = 'Demo Reviewer (seed)';

export interface Validation {
  by: string;
  role: Role;
  at: string;
}

export interface Override extends Validation {
  status: Status;
  severity: Severity;
  reasonCode: string;
  note: string;
}

export interface DecisionRecord {
  option: DecisionKey;
  rationale: string;
  ownershipConfirmed: boolean;
  by: string;
  role: Role;
  at: string;
  triggers: TriggerKey[];
  aiRecommendation: RecommendationKey;
  humanScore: number | null;
  signedOffBy?: string;
  signedOffAt?: string;
  signOffNote?: string;
}

export interface CaseState {
  id: string;
  stage: StageKey;
  accepted: Record<string, Validation>;
  overrides: Record<string, Override>;
  proposed?: DecisionRecord;
  decision?: DecisionRecord;
  infoRequest?: { questions: string[]; at: string; by: string };
  returnedNote?: string;
}

export interface AuditEvent {
  id: string;
  caseId: string;
  at: string;
  actor: string;
  role: Role | 'System' | 'AI (advisory)';
  action: string;
  detail?: string;
  before?: string;
  after?: string;
  reason?: string;
}

export const DECISION_TO_OUTCOME: Record<DecisionKey, RecommendationKey | null> = {
  APPROVE_WITH_CONDITIONS: 'APPROVE_WITH_CONDITIONS',
  REQUEST_INFORMATION: 'REQUEST_MORE_INFORMATION',
  DECLINE: 'RECOMMEND_DECLINE',
  ESCALATE: null,
  ROUTE_OUT_OF_SCOPE: 'OUT_OF_SCOPE',
};

/** AI findings with human overrides applied. Overridden findings keep a marker for display. */
export function effectiveCriteria(a: Assessment, c: CaseState | undefined): (Criterion & { overridden?: Override })[] {
  return a.criteria.map((crit) => {
    const o = c?.overrides[crit.key];
    return o ? { ...crit, status: o.status, severity: o.severity, overridden: o } : crit;
  });
}

export function humanScore(a: Assessment, c: CaseState | undefined): ScoreResult {
  return scoreAssessment({ inScope: a.scope.inScope, criteria: effectiveCriteria(a, c), confidence: a.confidence });
}

/** Which senior sign-off triggers a proposed decision sets off. */
export function signOffTriggers(option: DecisionKey, a: Assessment, ai: ScoreResult, c: CaseState | undefined): TriggerKey[] {
  const t: TriggerKey[] = [];
  if (option === 'ESCALATE') t.push('ESCALATED');
  else if (DECISION_TO_OUTCOME[option] !== ai.recommendation) t.push('DIVERGES_FROM_AI');
  if (c && Object.keys(c.overrides).some((k) => k.startsWith('L1_'))) t.push('LEVEL1_OVERRIDDEN');
  if (a.confidence === 'low') t.push('LOW_CONFIDENCE');
  if (a.criteria.some((x) => x.level === 1 && x.status === 'concern')) t.push('LEVEL1_CONCERN');
  return t;
}

export function validatedCount(a: Assessment, c: CaseState | undefined): number {
  if (!c) return 0;
  return a.criteria.filter((x) => c.accepted[x.key] || c.overrides[x.key]).length;
}

/** The outcome the consistency monitor uses: a human decision if one exists, otherwise the AI recommendation. */
export function currentOutcome(ai: ScoreResult, c: CaseState | undefined): { outcome: RecommendationKey | 'ESCALATED'; source: 'human' | 'proposed' | 'ai' } {
  if (c?.decision) return { outcome: DECISION_TO_OUTCOME[c.decision.option] ?? 'ESCALATED', source: 'human' };
  if (c?.proposed) return { outcome: DECISION_TO_OUTCOME[c.proposed.option] ?? 'ESCALATED', source: 'proposed' };
  return { outcome: ai.recommendation, source: 'ai' };
}

// ---------------------------------------------------------------------------------------------
// Seed state: 70 Analyst review, 10 Intake, 8 Information requested, 7 Senior sign-off, 5 Decided.

const DECIDED_SEED: [string, DecisionKey][] = [
  ['DR-014', 'APPROVE_WITH_CONDITIONS'],
  ['DR-029', 'APPROVE_WITH_CONDITIONS'],
  ['DR-044', 'APPROVE_WITH_CONDITIONS'],
  ['DR-081', 'DECLINE'],
  ['DR-092', 'DECLINE'],
];
const SIGN_OFF_SEED: [string, DecisionKey][] = [
  ['DR-007', 'DECLINE'],
  ['DR-010', 'DECLINE'],
  ['DR-033', 'APPROVE_WITH_CONDITIONS'],
  ['DR-045', 'DECLINE'],
  ['DR-062', 'DECLINE'],
  ['DR-085', 'REQUEST_INFORMATION'],
  ['DR-097', 'REQUEST_INFORMATION'],
];
const INFO_SEED = ['DR-002', 'DR-016', 'DR-022', 'DR-057', 'DR-064', 'DR-073', 'DR-075', 'DR-088'];
/** Rules the guided demo and screen recording rely on; never seeded away from Analyst review. */
export const DEMO_RULES = ['DR-001', 'DR-005', 'DR-008', 'DR-011', 'DR-012', 'DR-013', 'DR-071'];

const SEED_OVERRIDES: Record<string, Record<string, Omit<Override, 'by' | 'role' | 'at'>>> = {
  'DR-085': {
    L2_CLEAR_COMMUNICATION: {
      status: 'concern',
      severity: 'medium',
      reasonCode: 'EVIDENCE_WEIGHT',
      note: 'A correction step can be made a condition of approval, so this is fixable rather than a failure of the rule itself.',
    },
    L3_NOT_SUBJECTIVE: {
      status: 'concern',
      severity: 'medium',
      reasonCode: 'EVIDENCE_WEIGHT',
      note: 'A materiality test would make the rule objective; treat as a concern to be fixed in a redraft.',
    },
  },
  'DR-097': {
    L2_ACCESSIBLE: {
      status: 'concern',
      severity: 'medium',
      reasonCode: 'ADDITIONAL_CONTEXT',
      note: 'The rationale shows the insurer means private grey-market imports. Reading the rule as intended, the affected group is small. Confirm wording with the insurer.',
    },
  },
};

const SEED_RATIONALE: Record<string, string> = {
  'DR-085': 'I propose requesting information rather than declining. The concern about misrepresentation is legitimate, and the defects (no materiality test, no chance to correct) can be fixed in a redraft. This differs from the AI recommendation, so it needs senior sign-off.',
  'DR-097': 'I propose requesting information. Read literally the rule is overbroad, but the rationale shows the insurer means uncertified private imports. We should ask the insurer to confirm and narrow the wording before deciding. This differs from the AI recommendation.',
};

function seedTime(dayOffset: number, hour = 10): string {
  const d = new Date(Date.UTC(2024, 11, 2 + dayOffset, hour, 15, 0));
  return d.toISOString();
}

export function buildSeedState(assessments: Assessment[], rules: Rule[], aiScores: Map<string, ScoreResult>): { cases: Record<string, CaseState>; audit: AuditEvent[] } {
  const cases: Record<string, CaseState> = {};
  const audit: AuditEvent[] = [];
  let n = 0;
  const log = (e: Omit<AuditEvent, 'id'>) => audit.push({ id: `seed-${++n}`, ...e });

  for (const a of assessments) {
    cases[a.id] = { id: a.id, stage: 'ANALYST_REVIEW', accepted: {}, overrides: {} };
    const ai = aiScores.get(a.id)!;
    log({ caseId: a.id, at: seedTime(-1, 9), actor: 'System', role: 'System', action: 'Submission received and parsed' });
    log({
      caseId: a.id,
      at: seedTime(-1, 9),
      actor: 'Simrule batch analyst',
      role: 'AI (advisory)',
      action: 'AI pre-assessment completed (advisory)',
      detail: `AI recommendation: ${ai.recommendation} (score ${ai.score ?? 'n/a'}), prompt ${a.provenance.promptVersion}, framework ${a.provenance.frameworkVersion}`,
    });
  }

  const acceptAll = (id: string, day: number) => {
    const a = assessments.find((x) => x.id === id)!;
    const c = cases[id];
    const ov = SEED_OVERRIDES[id] ?? {};
    for (const crit of a.criteria) {
      if (ov[crit.key]) {
        c.overrides[crit.key] = { ...ov[crit.key], by: SEED_ACTOR, role: 'Analyst', at: seedTime(day, 11) };
        log({
          caseId: id,
          at: seedTime(day, 11),
          actor: SEED_ACTOR,
          role: 'Analyst',
          action: `Overrode ${crit.key}`,
          before: `${crit.status} / ${crit.severity}`,
          after: `${ov[crit.key].status} / ${ov[crit.key].severity}`,
          reason: `${ov[crit.key].reasonCode}: ${ov[crit.key].note}`,
        });
      } else {
        c.accepted[crit.key] = { by: SEED_ACTOR, role: 'Analyst', at: seedTime(day, 10) };
      }
    }
    log({ caseId: id, at: seedTime(day, 10), actor: SEED_ACTOR, role: 'Analyst', action: 'Validated AI findings', detail: `${a.criteria.length - Object.keys(ov).length} accepted, ${Object.keys(ov).length} overridden` });
  };

  const makeDecision = (id: string, option: DecisionKey, day: number, by: Role): DecisionRecord => {
    const a = assessments.find((x) => x.id === id)!;
    const ai = aiScores.get(id)!;
    const hs = humanScore(a, cases[id]);
    return {
      option,
      rationale:
        SEED_RATIONALE[id] ??
        `Decision recorded after reviewing all ${a.criteria.length} AI findings. The decision follows the AI recommendation (${ai.recommendation}). Key findings: ${a.criteria
          .filter((x) => x.status === 'fail')
          .slice(0, 3)
          .map((x) => x.label)
          .join('; ') || 'no failed criteria'}.`,
      ownershipConfirmed: true,
      by: SEED_ACTOR,
      role: by,
      at: seedTime(day, 14),
      triggers: signOffTriggers(option, a, ai, cases[id]),
      aiRecommendation: ai.recommendation,
      humanScore: hs.score,
    };
  };

  DECIDED_SEED.forEach(([id, option], i) => {
    acceptAll(id, i);
    const d = makeDecision(id, option, i, 'Analyst');
    if (d.triggers.length) {
      d.signedOffBy = SEED_ACTOR;
      d.signedOffAt = seedTime(i + 1, 9);
      d.signOffNote = 'Senior sign-off: Level 1 concern reviewed; agree with the decision.';
    }
    cases[id].decision = d;
    cases[id].stage = 'DECIDED';
    log({ caseId: id, at: d.at, actor: SEED_ACTOR, role: 'Analyst', action: `Decision: ${option}`, detail: 'Ownership of the rationale confirmed' });
    if (d.signedOffBy) log({ caseId: id, at: d.signedOffAt!, actor: SEED_ACTOR, role: 'Senior reviewer', action: 'Senior sign-off recorded', reason: d.signOffNote });
  });

  SIGN_OFF_SEED.forEach(([id, option], i) => {
    acceptAll(id, i + 2);
    const p = makeDecision(id, option, i + 2, 'Analyst');
    cases[id].proposed = p;
    cases[id].stage = 'SENIOR_SIGN_OFF';
    log({
      caseId: id,
      at: p.at,
      actor: SEED_ACTOR,
      role: 'Analyst',
      action: `Proposed decision: ${option}`,
      detail: `Senior sign-off required: ${p.triggers.join(', ')}`,
    });
  });

  INFO_SEED.forEach((id, i) => {
    acceptAll(id, i + 3);
    const a = assessments.find((x) => x.id === id)!;
    const d = makeDecision(id, 'REQUEST_INFORMATION', i + 3, 'Analyst');
    if (d.triggers.length) {
      d.signedOffBy = SEED_ACTOR;
      d.signedOffAt = seedTime(i + 3, 15);
      d.signOffNote = `Senior sign-off: ${d.triggers.join(', ')} reviewed; agree to request information.`;
    }
    cases[id].decision = d;
    cases[id].infoRequest = { questions: a.questionsForInsurer, at: d.at, by: SEED_ACTOR };
    cases[id].stage = 'INFO_REQUESTED';
    if (d.signedOffBy) log({ caseId: id, at: d.signedOffAt!, actor: SEED_ACTOR, role: 'Senior reviewer', action: 'Senior sign-off recorded', reason: d.signOffNote });
    log({ caseId: id, at: d.at, actor: SEED_ACTOR, role: 'Analyst', action: 'Information requested from insurer', detail: a.questionsForInsurer.join(' | ') });
  });

  const used = new Set([...DECIDED_SEED.map((x) => x[0]), ...SIGN_OFF_SEED.map((x) => x[0]), ...INFO_SEED, ...DEMO_RULES]);
  const intake = [...rules]
    .filter((r) => !used.has(r.id))
    .sort((x, y) => y.dateSubmitted.localeCompare(x.dateSubmitted) || x.id.localeCompare(y.id))
    .slice(0, 10)
    .map((r) => r.id);
  for (const id of intake) {
    cases[id].stage = 'INTAKE';
    log({ caseId: id, at: seedTime(12, 8), actor: 'System', role: 'System', action: 'Queued for intake and completeness check' });
  }

  audit.sort((x, y) => x.at.localeCompare(y.at));
  return { cases, audit };
}
