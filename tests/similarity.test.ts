import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SimilarityIndex, topCandidates, tokenize } from '../src/lib/similarity';

const rules = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const precedents = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents;
const index = new SimilarityIndex([
  ...rules.map((r: any) => ({ id: r.id, text: r.ruleText, categories: r.categories, kind: 'submission' as const })),
  ...precedents.map((p: any) => ({ id: p.id, text: p.ruleText, categories: p.categories, kind: 'precedent' as const })),
]);
const query = (id: string) => {
  const r = rules.find((x: any) => x.id === id);
  return index.query({ id, text: r.ruleText, categories: r.categories });
};

describe('similarity', () => {
  it('ranks the racetrack precedent AP-07 first for DR-012', () => {
    const top = query('DR-012')[0];
    expect(top.id).toBe('AP-07');
    expect(top.score).toBeGreaterThan(0.8);
  });

  it('ranks the approved 2-accident rule first for DR-001', () => {
    expect(query('DR-001')[0].id).toBe('AP-02');
  });

  it('matches DR-013 to the non-compliant insurer-switching example', () => {
    expect(query('DR-013')[0].id).toBe('NC-05');
  });

  it('always includes at least one precedent in the top candidates', () => {
    for (const r of rules) {
      expect(topCandidates(query(r.id), 5).some((c) => c.kind === 'precedent')).toBe(true);
    }
  });

  it('normalises licence and license spellings', () => {
    expect(tokenize('invalid license')).toEqual(tokenize('invalid licence'));
  });
});
