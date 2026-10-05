// Runs deterministic scoring over every assessment and writes data/scores.json plus a summary.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Assessment } from '../src/lib/schema';
import { scoreAssessment } from '../src/lib/scoring';

const files = readdirSync('data/assessments').filter((f) => f.endsWith('.json')).sort();
const out: Record<string, ReturnType<typeof scoreAssessment>> = {};
const dist: Record<string, number> = {};
const conf: Record<string, number> = {};
let senior = 0;
let hardStops = 0;
for (const f of files) {
  const a: Assessment = JSON.parse(readFileSync(join('data/assessments', f), 'utf8'));
  const r = scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence });
  out[a.id] = r;
  dist[r.recommendation] = (dist[r.recommendation] ?? 0) + 1;
  conf[a.confidence] = (conf[a.confidence] ?? 0) + 1;
  if (r.seniorReviewRequired) senior++;
  if (r.hardStop) hardStops++;
}
writeFileSync('data/scores.json', JSON.stringify(out, null, 1) + '\n');
console.log('Recommendations:', dist);
console.log('Confidence:', conf);
console.log(`Senior review flagged: ${senior}; Level 1 hard stops: ${hardStops}; total: ${files.length}`);
if (process.argv.includes('--list')) {
  for (const [id, r] of Object.entries(out)) console.log(id, r.recommendation, r.score, r.hardStop ? 'HARD-STOP' : '', r.seniorReviewRequired ? 'SENIOR' : '');
}
