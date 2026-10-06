import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import framework from '../knowledge/framework.json';
import type { Assessment, Rule } from '../src/lib/schema';
import { assembleAssessment, buildSystemPrompt, liveOutputSchema, type LiveContext } from '../src/lib/liveAssessment';
import { scoreAssessment } from '../src/lib/scoring';
import { outputFrom } from './fixtures';

const rules: Rule[] = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const ctx: LiveContext = {
  framework,
  citations: JSON.parse(readFileSync('knowledge/citations.json', 'utf8')).citations,
  precedents: JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents,
  rulesById: new Map(rules.map((r) => [r.id, r])),
};
const dr005: Assessment = JSON.parse(readFileSync('data/assessments/DR-005.json', 'utf8'));
const upload: Rule = { ...rules.find((r) => r.id === 'DR-005')!, id: 'UP-1' };
const similar = [{ id: 'NC-01', kind: 'precedent' as const, score: 0.5 }];

describe('live assessment pipeline (no network)', () => {
  it('fills every prompt placeholder and never sends unconfirmed section numbers', () => {
    const p = buildSystemPrompt(ctx, upload, similar);
    expect(p).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(p).toContain('Additional rules in v2');
    expect(p).toContain('primary language is not English or French');
    for (const c of ctx.citations) if (c.sectionToConfirm) expect(p).not.toContain(c.sectionToConfirm);
    expect(p).toContain('unverified, do not cite a section number');
  });

  it('accepts valid output and scores it with the same deterministic code', () => {
    const out = liveOutputSchema(ctx, similar.map((s) => s.id)).parse(outputFrom(dr005));
    const r = assembleAssessment(out, upload, similar, ctx, '2024-12-16');
    expect(r.errors).toEqual([]);
    expect(r.assessment?.id).toBe('UP-1');
    const a = r.assessment!;
    expect(scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence }).recommendation).toBe('RECOMMEND_DECLINE');
  });

  it('drops quotes that are not verbatim and records it', () => {
    const out = outputFrom(dr005);
    out.criteria[0].evidence = [...out.criteria[0].evidence, { source: 'ruleText', quote: 'words the filing never used' }];
    const r = assembleAssessment(out, upload, similar, ctx, '2024-12-16');
    expect(r.assessment).not.toBeNull();
    expect(r.notes.join(' ')).toContain('Removed 1 evidence quote');
  });

  it('rejects output that skips a criterion', () => {
    const out = outputFrom(dr005);
    out.criteria = out.criteria.filter((c) => c.key !== 'L4_PUBLIC_POLICY');
    const r = assembleAssessment(out, upload, similar, ctx, '2024-12-16');
    expect(r.assessment).toBeNull();
    expect(r.errors).toContain('missing criterion L4_PUBLIC_POLICY');
  });

  it('restricts citations and issue codes to known ids in the output schema', () => {
    const out = outputFrom(dr005);
    (out.criteria[0].citationIds as string[]).push('MADE_UP_ACT');
    expect(liveOutputSchema(ctx, []).safeParse(out).success).toBe(false);
  });
});
