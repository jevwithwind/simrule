// Builds data/similarity-candidates.json: top 5 similar rules for each submission
// (against the precedent registry and the other 99 submissions). Run before generating assessments.
import { readFileSync, writeFileSync } from 'node:fs';
import { SimilarityIndex, topCandidates, type SimDoc } from '../src/lib/similarity';
import type { Precedent, Rule } from '../src/lib/schema';

const rules: Rule[] = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const precedents: Precedent[] = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents;

export function buildIndex(): SimilarityIndex {
  const docs: SimDoc[] = [
    ...rules.map((r) => ({ id: r.id, text: r.ruleText, categories: r.categories, kind: 'submission' as const })),
    ...precedents.map((p) => ({ id: p.id, text: p.ruleText, categories: p.categories, kind: 'precedent' as const })),
  ];
  return new SimilarityIndex(docs);
}

const index = buildIndex();
const byId = new Map(rules.map((r) => [r.id, r]));
const out = rules.map((r) => {
  const results = index.query({ id: r.id, text: r.ruleText, categories: r.categories });
  const candidates = topCandidates(results, 5).map((c) => ({
    ...c,
    insurer: c.kind === 'submission' ? byId.get(c.id)!.insurer : precedents.find((p) => p.id === c.id)!.insurer,
    sameInsurer: c.kind === 'submission' ? byId.get(c.id)!.insurer === r.insurer : false,
  }));
  return { id: r.id, features: index.getFeatures(r.id), candidates };
});

writeFileSync('data/similarity-candidates.json', JSON.stringify(out, null, 1) + '\n');
const dr012 = out.find((o) => o.id === 'DR-012')!;
console.log('DR-012 top candidates:', dr012.candidates.map((c) => `${c.id} ${c.score}`).join(', '));
console.log(`Wrote ${out.length} candidate sets.`);
