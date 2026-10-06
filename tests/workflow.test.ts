import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Assessment } from '../src/lib/schema';
import { scoreAssessment } from '../src/lib/scoring';
import { buildSeedState, signOffTriggers, humanScore, type CaseState } from '../src/lib/workflow';
import { splitRules } from '../src/lib/parseDocs';

const rules = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const assessments: Assessment[] = readdirSync('data/assessments').map((f) => JSON.parse(readFileSync(`data/assessments/${f}`, 'utf8')));
const ai = new Map(assessments.map((a) => [a.id, scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence })]));
const get = (id: string) => assessments.find((a) => a.id === id)!;

describe('workflow', () => {
  it('seeds the queue as 70 / 10 / 8 / 7 / 5', () => {
    const { cases, audit } = buildSeedState(assessments, rules, ai);
    const count = (s: string) => Object.values(cases).filter((c) => c.stage === s).length;
    expect(count('ANALYST_REVIEW')).toBe(70);
    expect(count('INTAKE')).toBe(10);
    expect(count('INFO_REQUESTED')).toBe(8);
    expect(count('SENIOR_SIGN_OFF')).toBe(7);
    expect(count('DECIDED')).toBe(5);
    expect(audit.filter((e) => e.role !== 'System' && e.role !== 'AI (advisory)').every((e) => e.actor === 'Demo Reviewer (seed)')).toBe(true);
  });

  it('requires senior sign-off when the decision diverges from the AI', () => {
    const a = get('DR-071');
    expect(ai.get('DR-071')!.recommendation).toBe('REQUEST_MORE_INFORMATION');
    expect(signOffTriggers('APPROVE_WITH_CONDITIONS', a, ai.get('DR-071')!, undefined)).toContain('DIVERGES_FROM_AI');
    expect(signOffTriggers('REQUEST_INFORMATION', a, ai.get('DR-071')!, undefined)).toEqual([]);
  });

  it('requires senior sign-off when a Level 1 finding is overridden or the AI flagged a Level 1 concern', () => {
    const a = get('DR-012');
    const c: CaseState = { id: 'DR-012', stage: 'ANALYST_REVIEW', accepted: {}, overrides: { L1_MARKET: { status: 'pass', severity: 'low', reasonCode: 'OTHER', note: 'test override', by: 't', role: 'Analyst', at: '' } } };
    expect(signOffTriggers('APPROVE_WITH_CONDITIONS', a, ai.get('DR-012')!, c)).toContain('LEVEL1_OVERRIDDEN');
    expect(signOffTriggers('DECLINE', get('DR-007'), ai.get('DR-007')!, undefined)).toContain('LEVEL1_CONCERN');
  });

  it('recomputes the score live from human overrides', () => {
    const a = get('DR-071');
    const c: CaseState = { id: 'DR-071', stage: 'ANALYST_REVIEW', accepted: {}, overrides: { L3_ACTUARIAL: { status: 'insufficient_information', severity: 'low', reasonCode: 'EVIDENCE_WEIGHT', note: 'Data can be a condition.', by: 't', role: 'Analyst', at: '' } } };
    expect(humanScore(a, c).recommendation).toBe('APPROVE_WITH_CONDITIONS');
  });
});

describe('document splitting', () => {
  it('detects several labelled rules in one document and shares the header insurer', () => {
    const rules = splitRules('Submitting Insurer: Test Co\nDate Submitted: 2024-12-01\nRule 1\nProposed Decline Rule: Decline to insure any vehicle used for racing.\nRationale: Risk.\nRule 2\nProposed Decline Rule: Decline to offer optional collision coverage on old vehicles.\nRationale: Value.');
    expect(rules).toHaveLength(2);
    expect(rules[1].insurer).toBe('Test Co');
    expect(rules[0].ruleText).toBe('Decline to insure any vehicle used for racing.');
  });

  it('falls back to sentences that start with Decline', () => {
    expect(splitRules('Memo. Decline to insure any applicant under 30. Thanks.')).toHaveLength(1);
  });
});
