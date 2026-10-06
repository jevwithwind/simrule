import { describe, expect, it } from 'vitest';
import { scoreAssessment, type ScoredCriterion } from '../src/lib/scoring';
import { REQUIRED_CRITERIA } from '../src/lib/schema';
import type { Status, Severity } from '../src/lib/schema';

function criteria(overrides: Record<string, [Status, Severity]> = {}): ScoredCriterion[] {
  return Object.entries(REQUIRED_CRITERIA).flatMap(([lvl, keys]) =>
    keys.map((key) => {
      const [status, severity] = overrides[key] ?? (['pass', 'low'] as [Status, Severity]);
      return { key, level: Number(lvl) as 1 | 2 | 3 | 4, status, severity };
    }),
  );
}

describe('deterministic scoring', () => {
  it('scores an all-pass rule at 100 and approves with conditions', () => {
    const r = scoreAssessment({ inScope: true, criteria: criteria(), confidence: 'high' });
    expect(r.score).toBe(100);
    expect(r.recommendation).toBe('APPROVE_WITH_CONDITIONS');
  });

  it('treats any Level 1 fail as a hard stop, whatever the score', () => {
    const r = scoreAssessment({ inScope: true, criteria: criteria({ L1_HUMAN_RIGHTS: ['fail', 'low'] }), confidence: 'high' });
    expect(r.recommendation).toBe('RECOMMEND_DECLINE');
    expect(r.hardStop).toBe(true);
    expect(r.score).toBe(100);
  });

  it('returns OUT_OF_SCOPE for eligibility rules', () => {
    const r = scoreAssessment({ inScope: false, criteria: criteria({ L1_LEGISLATION: ['fail', 'high'] }), confidence: 'high' });
    expect(r.recommendation).toBe('OUT_OF_SCOPE');
    expect(r.score).toBeNull();
  });

  it('declines on any high-severity fail at Levels 2 to 4', () => {
    const r = scoreAssessment({ inScope: true, criteria: criteria({ L4_PUBLIC_POLICY: ['fail', 'high'] }), confidence: 'high' });
    expect(r.recommendation).toBe('RECOMMEND_DECLINE');
    expect(r.hardStop).toBe(false);
  });

  it('applies the 75 and 50 threshold edges exactly', () => {
    // L4 fail (medium) removes 25 points: 75 exactly -> approve.
    const at75 = scoreAssessment({ inScope: true, criteria: criteria({ L4_PUBLIC_POLICY: ['fail', 'medium'] }), confidence: 'high' });
    expect(at75.score).toBe(75);
    expect(at75.recommendation).toBe('APPROVE_WITH_CONDITIONS');
    // Add one L3 concern (-3.5): 71.5 -> request more information.
    const below = scoreAssessment({ inScope: true, criteria: criteria({ L4_PUBLIC_POLICY: ['fail', 'medium'], L3_DEFINITION: ['concern', 'low'] }), confidence: 'high' });
    expect(below.score).toBe(71.5);
    expect(below.recommendation).toBe('REQUEST_MORE_INFORMATION');
    // L4 fail plus all of Level 3 failing (medium): 40 -> decline by score.
    const low = scoreAssessment({
      inScope: true,
      criteria: criteria({
        L4_PUBLIC_POLICY: ['fail', 'medium'],
        L3_NOT_SUBJECTIVE: ['fail', 'medium'],
        L3_NOT_ARBITRARY: ['fail', 'medium'],
        L3_RISK_LINK: ['fail', 'medium'],
        L3_ACTUARIAL: ['fail', 'medium'],
        L3_DEFINITION: ['fail', 'medium'],
      }),
      confidence: 'high',
    });
    expect(low.score).toBe(40);
    expect(low.recommendation).toBe('RECOMMEND_DECLINE');
  });

  it('routes a material information gap to request more information even with a high score', () => {
    const r = scoreAssessment({ inScope: true, criteria: criteria({ L3_ACTUARIAL: ['insufficient_information', 'medium'] }), confidence: 'high' });
    expect(r.score).toBe(96.5);
    expect(r.recommendation).toBe('REQUEST_MORE_INFORMATION');
    const lowGap = scoreAssessment({ inScope: true, criteria: criteria({ L3_ACTUARIAL: ['insufficient_information', 'low'] }), confidence: 'high' });
    expect(lowGap.recommendation).toBe('APPROVE_WITH_CONDITIONS');
  });

  it('flags senior review for low confidence or a Level 1 concern', () => {
    expect(scoreAssessment({ inScope: true, criteria: criteria(), confidence: 'low' }).seniorReviewRequired).toBe(true);
    expect(scoreAssessment({ inScope: true, criteria: criteria({ L1_HUMAN_RIGHTS: ['concern', 'medium'] }), confidence: 'high' }).seniorReviewRequired).toBe(true);
    expect(scoreAssessment({ inScope: true, criteria: criteria(), confidence: 'high' }).seniorReviewRequired).toBe(false);
  });
});
