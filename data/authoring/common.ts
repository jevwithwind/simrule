// Standard finding language for recurring situations. Using the same wording for the same situation
// is deliberate: it is part of how Simrule keeps similar rules treated similarly. Every helper takes
// rule-specific text so the reasoning still names what this rule does.
import type { CriterionTuple, V } from './types';

/** Level 1 legislation pass for a rule whose trigger no statute, regulation or guidance restricts. */
export function legisPass(trigger: string, evidence: string[] = []): CriterionTuple {
  return [
    'pass',
    'low',
    [],
    `No provision of the Insurance Act, its regulations, the UDAP Rule or FSRA guidance in the registry appears to bar a decline based on ${trigger}. Under Take All Comers the rule still needs the regulator's approval before the insurer may use it.`,
    evidence,
    ['INS_ACT', 'UDAP'],
  ];
}

/** Level 1 human rights pass for a conduct, vehicle or use-based trigger. */
export function hrPass(trigger: string, evidence: string[] = []): CriterionTuple {
  return [
    'pass',
    'low',
    [],
    `${cap(trigger)} is not a protected ground under the Human Rights Code. Nothing in the wording suggests it would act as a close proxy for one, because it applies to every applicant on the same factual basis.`,
    evidence,
    ['HRC'],
  ];
}

/** Level 1 market check when no approved precedent has a similar trigger. */
export function marketNone(extra = ''): CriterionTuple {
  return [
    'insuf',
    'low',
    [],
    `No approved precedent in the registry has the same or a similar trigger. The rule is assessed on its own merits under Levels 2 to 4.${extra ? ' ' + extra : ''}`,
    [],
    ['FW_APPROVED'],
  ];
}

/** Level 1 market check: same or similar approved precedent exists. */
export function marketMatch(reasoning: string, evidence: string[], pending = false): CriterionTuple {
  return ['pass', 'low', pending ? ['PRECEDENT_APPROVED_MATCH', 'PENDING_SIMILAR_SUBMISSION'] : ['PRECEDENT_APPROVED_MATCH'], reasoning, evidence, ['FW_APPROVED', 'FW_CONTEXT']];
}

/** Level 1 market check: closest match is an illustrative non-compliant example. */
export function marketNonCompliant(reasoning: string, evidence: string[], pending = false): CriterionTuple {
  return ['concern', 'high', pending ? ['PRECEDENT_NON_COMPLIANT_MATCH', 'PENDING_SIMILAR_SUBMISSION'] : ['PRECEDENT_NON_COMPLIANT_MATCH'], reasoning, evidence, ['FW_QUESTIONS']];
}

/** Level 3 actuarial support. No submission in the set includes actuarial data. */
export function actuarial(sev: V, detail: string, evidence: string[] = []): CriterionTuple {
  const tail =
    sev === 'low'
      ? 'Because a comparable approved rule exists and this one is no stricter, the gap is unlikely to change the outcome, but the analysis should be on file before approval.'
      : 'The analysis could change the outcome, so it should be obtained before a decision.';
  return ['insuf', sev, ['NO_ACTUARIAL_SUPPORT'], `${detail} No actuarial data or analysis is attached to the submission. ${tail}`, evidence, ['FW_QUESTIONS', 'FSRA_UW_FILING']];
}

/** Level 2 discrimination pass. */
export function discPass(trigger: string, evidence: string[] = []): CriterionTuple {
  return [
    'pass',
    'low',
    [],
    `${cap(trigger)} does not use a protected ground and is not a known proxy for one. The rule turns on the applicant's own conduct or vehicle, not on who they are.`,
    evidence,
    ['FW_PRINCIPLES'],
  ];
}

/** Level 2 clear communication pass for an objective, checkable trigger. */
export function commPass(trigger: string, evidence: string[] = []): CriterionTuple {
  return [
    'pass',
    'low',
    [],
    `A consumer could easily understand a decline based on ${trigger} and check the facts it relies on. The insurer can state the specific reason in plain language.`,
    evidence,
    ['FW_PRINCIPLES'],
  ];
}

/** Level 3 subjectivity pass for a recorded, verifiable fact. */
export function objPass(fact: string, evidence: string[] = []): CriterionTuple {
  return ['pass', 'low', [], `${cap(fact)} is a recorded, verifiable fact. Applying the rule does not require a judgment call by the insurer.`, evidence, []];
}

/** Level 4 public policy pass. */
export function policyPass(why: string): CriterionTuple {
  return ['pass', 'low', [], `No: nothing about this proposal appears inappropriate for a consumer protection regulator to approve. ${why}`, [], ['FSRA_ACT']];
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Standard consumer consequence sentence. */
export const RESIDUAL =
  'Auto insurance is compulsory, so a declined consumer must find another insurer or the residual market (Facility Association), usually at a higher premium, or stop driving.';
