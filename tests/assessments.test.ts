import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import framework from '../knowledge/framework.json';
import { AssessmentSchema, validateAssessmentContent, ALL_CRITERIA } from '../src/lib/schema';
import { scoreAssessment } from '../src/lib/scoring';

const rules = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const citations = JSON.parse(readFileSync('knowledge/citations.json', 'utf8')).citations;
const precedents = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents;
const known = {
  citationIds: new Set<string>(citations.map((c: any) => c.id)),
  issueCodes: new Set<string>(framework.issueCodes.map((c) => c.code)),
  refIds: new Set<string>([...precedents.map((p: any) => p.id), ...rules.map((r: any) => r.id)]),
};
const files = readdirSync('data/assessments').filter((f) => f.endsWith('.json'));
const load = (id: string) => JSON.parse(readFileSync(`data/assessments/${id}.json`, 'utf8'));

describe('assessments', () => {
  it('has one assessment per rule', () => {
    expect(files).toHaveLength(100);
  });

  it.each(files)('%s passes schema and content validation', (f) => {
    const a = AssessmentSchema.parse(JSON.parse(readFileSync(`data/assessments/${f}`, 'utf8')));
    const rule = rules.find((r: any) => r.id === a.id);
    expect(validateAssessmentContent(a, rule, known)).toEqual([]);
    expect(a.criteria.map((c) => c.key).sort()).toEqual([...ALL_CRITERIA].sort());
  });

  it('never cites a section number for an unverified citation', () => {
    for (const c of citations) if (!c.verified) expect(c.section).toBeNull();
  });

  it('matches the sanity anchors', () => {
    const rec = (id: string) => {
      const a = load(id);
      return scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence }).recommendation;
    };
    expect(rec('DR-012')).toBe('APPROVE_WITH_CONDITIONS');
    expect(rec('DR-001')).toBe('APPROVE_WITH_CONDITIONS');
    expect(rec('DR-006')).toBe('APPROVE_WITH_CONDITIONS');
    expect(rec('DR-005')).toBe('RECOMMEND_DECLINE');
    expect(rec('DR-007')).toBe('RECOMMEND_DECLINE');
    expect(rec('DR-002')).toBe('REQUEST_MORE_INFORMATION');
    expect(rec('DR-096')).toBe('RECOMMEND_DECLINE');
    expect(rec('DR-100')).toBe('RECOMMEND_DECLINE');
    const dr008 = load('DR-008');
    expect(dr008.criteria.flatMap((c: any) => c.issueCodes)).toContain('COPYCAT_REFERENCE');
  });
});
