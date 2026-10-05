// Assembles a draft decision rationale from the human-validated findings. The reviewer edits it and
// must confirm ownership before the decision can be recorded.
import framework from '../../knowledge/framework.json';
import type { Assessment, Criterion, Rule } from './schema';
import type { ScoreResult } from './scoring';
import type { CaseState, DecisionKey, Override } from './workflow';

const decisionText: Record<DecisionKey, string> = {
  APPROVE_WITH_CONDITIONS: 'approve the rule with conditions',
  REQUEST_INFORMATION: 'request further information from the insurer before deciding',
  DECLINE: 'decline the rule',
  ESCALATE: 'escalate the rule for senior review',
  ROUTE_OUT_OF_SCOPE: 'return the rule as out of scope and route it to the eligibility-rule process',
};

const codeLabel = (code: string) => framework.issueCodes.find((c) => c.code === code)?.label ?? code;

export function draftRationale(opts: {
  rule: Rule;
  assessment: Assessment;
  criteria: (Criterion & { overridden?: Override })[];
  ai: ScoreResult;
  human: ScoreResult;
  option: DecisionKey;
  caseState?: CaseState;
}): string {
  const { rule, assessment, criteria, ai, human, option } = opts;
  const lines: string[] = [];
  lines.push(
    `Decision: ${decisionText[option]}. ${rule.id}, submitted by ${rule.insurer} on ${rule.dateSubmitted}, proposes: "${rule.ruleText}"`,
  );
  const fails = criteria.filter((c) => c.status === 'fail');
  const concerns = criteria.filter((c) => c.status === 'concern');
  const gaps = criteria.filter((c) => c.status === 'insufficient_information');
  const hardStop = fails.some((c) => c.level === 1);
  if (hardStop) lines.push('The rule fails Level 1 basic compliance, which the framework treats as a full-stop refusal.');
  if (fails.length) {
    lines.push(
      `Findings that do not meet the standard: ${fails
        .map((c) => `${c.label} (Level ${c.level}; ${c.issueCodes.map(codeLabel).join(', ') || 'no code'})`)
        .join('; ')}.`,
    );
  }
  if (concerns.length) lines.push(`Concerns: ${concerns.map((c) => c.label).join('; ')}.`);
  if (gaps.length) lines.push(`Information gaps: ${gaps.map((c) => c.label).join('; ')}.`);
  const overrides = criteria.filter((c) => c.overridden);
  if (overrides.length) {
    lines.push(
      `Reviewer overrides of the AI findings: ${overrides
        .map((c) => `${c.label} changed to ${c.status.replace('_', ' ')} (${c.overridden!.reasonCode}: ${c.overridden!.note})`)
        .join('; ')}.`,
    );
  }
  const prec = assessment.precedents.slice(0, 2).map((p) => `${p.refId} (${p.relation.replace('_', ' ')}): ${p.explanation}`);
  if (prec.length) lines.push(`Comparable rules considered: ${prec.join(' ')}`);
  lines.push(
    `Consumer impact: ${assessment.consumerImpact.whoCouldBeRefused} ${assessment.consumerImpact.likelyConsequence}`,
  );
  if (option === 'APPROVE_WITH_CONDITIONS') lines.push(`Conditions: ${framework.standardConditions.join(' ')}`);
  if (option === 'REQUEST_INFORMATION') lines.push(`Questions for the insurer: ${assessment.questionsForInsurer.join(' ')}`);
  lines.push(
    `The AI recommendation (advisory) was "${framework.recommendations.find((r) => r.key === ai.recommendation)?.label}" with a score of ${ai.score ?? 'n/a'}. After human validation the score is ${human.score ?? 'n/a'}. This decision was made by the reviewer named in the record.`,
  );
  return lines.join('\n\n');
}
