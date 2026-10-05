// One-time calibration of scoring weights and thresholds against the sanity anchors (brief section 8).
// Run once after the anchors were assessed; the chosen values were then frozen in knowledge/framework.json.
import { readFileSync, existsSync } from 'node:fs';
import type { Assessment } from '../src/lib/schema';
import { DEFAULT_CONFIG, scoreAssessment, type RecommendationKey, type ScoringConfig } from '../src/lib/scoring';

const ANCHORS: Record<string, RecommendationKey[]> = {
  'DR-012': ['APPROVE_WITH_CONDITIONS'],
  'DR-001': ['APPROVE_WITH_CONDITIONS'],
  'DR-006': ['APPROVE_WITH_CONDITIONS'],
  'DR-005': ['RECOMMEND_DECLINE'],
  'DR-007': ['RECOMMEND_DECLINE'],
  'DR-011': ['RECOMMEND_DECLINE', 'REQUEST_MORE_INFORMATION'],
  'DR-010': ['RECOMMEND_DECLINE', 'REQUEST_MORE_INFORMATION'],
  'DR-013': ['RECOMMEND_DECLINE', 'REQUEST_MORE_INFORMATION'],
  'DR-002': ['REQUEST_MORE_INFORMATION'],
  'DR-008': ['APPROVE_WITH_CONDITIONS'],
  'DR-009': ['RECOMMEND_DECLINE', 'REQUEST_MORE_INFORMATION'],
  'DR-096': ['RECOMMEND_DECLINE'],
  'DR-100': ['RECOMMEND_DECLINE'],
};

const weightSets: [string, ScoringConfig['weights']][] = [
  ['A start 40/35/25', { '2': 40, '3': 35, '4': 25 }],
  ['B 35/40/25', { '2': 35, '3': 40, '4': 25 }],
  ['C 40/40/20', { '2': 40, '3': 40, '4': 20 }],
  ['D equal 33/33/34', { '2': 33, '3': 33, '4': 34 }],
  ['E 50/30/20', { '2': 50, '3': 30, '4': 20 }],
];
const thresholdSets: [string, ScoringConfig['thresholds']][] = [
  ['75/50 start', { approveWithConditions: 75, requestMoreInformation: 50 }],
  ['70/50', { approveWithConditions: 70, requestMoreInformation: 50 }],
  ['80/55', { approveWithConditions: 80, requestMoreInformation: 55 }],
];

const assessments = Object.keys(ANCHORS)
  .filter((id) => existsSync(`data/assessments/${id}.json`))
  .map((id) => JSON.parse(readFileSync(`data/assessments/${id}.json`, 'utf8')) as Assessment);

console.log(`Anchors assessed: ${assessments.length}/${Object.keys(ANCHORS).length}`);
console.log('config | anchors matched | min margin to a threshold (score-decided anchors only) | misses');
for (const [wn, weights] of weightSets) {
  for (const [tn, thresholds] of thresholdSets) {
    const cfg: ScoringConfig = { ...DEFAULT_CONFIG, weights, thresholds };
    let matched = 0;
    let minMargin = Infinity;
    const misses: string[] = [];
    for (const a of assessments) {
      const r = scoreAssessment({ inScope: a.scope.inScope, criteria: a.criteria, confidence: a.confidence }, cfg);
      if (ANCHORS[a.id].includes(r.recommendation)) matched++;
      else misses.push(`${a.id}->${r.recommendation}(${r.score})`);
      const scoreDecided = !r.hardStop && !r.reasons[0].startsWith('High-severity') && r.score !== null;
      if (scoreDecided) {
        const m = Math.min(Math.abs(r.score! - thresholds.approveWithConditions), Math.abs(r.score! - thresholds.requestMoreInformation));
        minMargin = Math.min(minMargin, m);
      }
    }
    console.log(`${wn} + ${tn} | ${matched}/${assessments.length} | ${minMargin.toFixed(1)} | ${misses.join(', ') || '-'}`);
  }
}
