// Consistency audit over all 100 assessments (brief section 7.4).
// 1. High-similarity pairs with different recommendations: is the difference explained in precedents[]?
// 2. Issue codes carrying contradictory statuses on the same criterion.
// 3. Pending similar submissions from other insurers not flagged with PENDING_SIMILAR_SUBMISSION.
// Writes data/audit-results.json (the before and after counts summarised in deliverables/process/consistency-audit.md). Pass --label=before|after.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Assessment, Rule } from '../src/lib/schema';
import { scoreAssessment } from '../src/lib/scoring';
import { SimilarityIndex, type SimDoc } from '../src/lib/similarity';

export const PAIR_THRESHOLD = 0.35;
const NEUTRAL_CODES = new Set(['PRECEDENT_APPROVED_MATCH', 'PENDING_SIMILAR_SUBMISSION']);

const rules: Rule[] = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const precedents = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents as { id: string; ruleText: string; categories: string[] }[];
const byRule = new Map(rules.map((r) => [r.id, r]));
const assessments = new Map<string, Assessment>();
for (const f of readdirSync('data/assessments').filter((f) => f.endsWith('.json'))) {
  const a: Assessment = JSON.parse(readFileSync(join('data/assessments', f), 'utf8'));
  assessments.set(a.id, a);
}
const recs = new Map([...assessments].map(([id, a]) => [id, scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence }).recommendation]));

const docs: SimDoc[] = [
  ...rules.map((r) => ({ id: r.id, text: r.ruleText, categories: r.categories, kind: 'submission' as const })),
  ...precedents.map((p) => ({ id: p.id, text: p.ruleText, categories: p.categories, kind: 'precedent' as const })),
];
const index = new SimilarityIndex(docs);

// 1. Pairs
interface PairFinding { a: string; b: string; similarity: number; recA: string; recB: string; explained: boolean; explainedBy: string[] }
const pairs: PairFinding[] = [];
const seen = new Set<string>();
for (const r of rules) {
  for (const s of index.query({ id: r.id, text: r.ruleText, categories: r.categories })) {
    if (s.kind !== 'submission' || s.score < PAIR_THRESHOLD) continue;
    const key = [r.id, s.id].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const recA = recs.get(r.id)!;
    const recB = recs.get(s.id)!;
    if (recA === recB) continue;
    const explainedBy: string[] = [];
    if (assessments.get(r.id)!.precedents.some((p) => p.refId === s.id && p.explanation.length > 40)) explainedBy.push(r.id);
    if (assessments.get(s.id)!.precedents.some((p) => p.refId === r.id && p.explanation.length > 40)) explainedBy.push(s.id);
    pairs.push({ a: r.id, b: s.id, similarity: s.score, recA, recB, explained: explainedBy.length > 0, explainedBy });
  }
}
pairs.sort((x, y) => y.similarity - x.similarity);

// 2. Contradictory statuses for the same (criterion, issue code)
interface CodeFinding { criterion: string; code: string; statuses: Record<string, string[]> }
const codeMap = new Map<string, Record<string, string[]>>();
for (const a of assessments.values()) {
  for (const c of a.criteria) {
    for (const code of c.issueCodes) {
      const k = `${c.key}::${code}`;
      const entry = codeMap.get(k) ?? {};
      const sk = `${c.status}/${c.severity}`;
      (entry[sk] ??= []).push(a.id);
      codeMap.set(k, entry);
    }
  }
}
const codeFindings: CodeFinding[] = [];
for (const [k, statuses] of codeMap) {
  const [criterion, code] = k.split('::');
  const keys = Object.keys(statuses);
  const hasPass = keys.some((s) => s.startsWith('pass/'));
  const hasFailHigh = keys.includes('fail/high');
  const hasLowConcern = keys.includes('concern/low');
  const contradictory = (hasPass && !NEUTRAL_CODES.has(code)) || (hasFailHigh && hasLowConcern);
  if (contradictory) codeFindings.push({ criterion, code, statuses });
}

// 3. Missing pending-similar flags
interface PendingFinding { id: string; other: string; similarity: number }
const missingPending: PendingFinding[] = [];
for (const a of assessments.values()) {
  const insurer = byRule.get(a.id)!.insurer;
  const market = a.criteria.find((c) => c.key === 'L1_MARKET')!;
  for (const p of a.precedents) {
    if (!p.refId.startsWith('DR-')) continue;
    if (p.relation === 'materially_different') continue;
    if (byRule.get(p.refId)!.insurer === insurer) continue;
    if (p.similarity < PAIR_THRESHOLD) continue;
    if (!market.issueCodes.includes('PENDING_SIMILAR_SUBMISSION')) missingPending.push({ id: a.id, other: p.refId, similarity: p.similarity });
  }
}

const label = (process.argv.find((x) => x.startsWith('--label=')) ?? '--label=current').split('=')[1];
const summary = {
  label,
  pairsDifferentOutcome: pairs.length,
  pairsUnexplained: pairs.filter((p) => !p.explained).length,
  contradictoryCodeGroups: codeFindings.length,
  missingPendingFlags: missingPending.length,
};
console.log(summary);

const resultsPath = 'data/audit-results.json';
const history = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')) : {};
history[label] = { summary, pairs, codeFindings, missingPending };
writeFileSync(resultsPath, JSON.stringify(history, null, 1) + '\n');
if (process.argv.includes('--list')) {
  for (const p of pairs.filter((x) => !x.explained)) console.log('UNEXPLAINED', p.a, p.recA, '<>', p.b, p.recB, p.similarity);
  for (const c of codeFindings) console.log('CODE', c.criterion, c.code, JSON.stringify(c.statuses));
  for (const m of missingPending) console.log('PENDING', m.id, '->', m.other, m.similarity);
}
