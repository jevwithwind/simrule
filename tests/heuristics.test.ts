import { describe, expect, it } from 'vitest';
import { keywordTriage, classifyScope } from '../src/lib/heuristics';

describe('keyword triage (low confidence)', () => {
  it('flags DR-005-style language wording as a protected-ground proxy', () => {
    const t = keywordTriage('Decline to insure any applicant whose primary language is not English or French.');
    expect(t.flags.map((f) => f.code)).toContain('PROXY_FOR_PROTECTED_GROUND');
    expect(t.confidence).toBe('low');
    expect(t.label).toMatch(/low confidence/);
  });

  it('flags place of birth as a protected ground', () => {
    expect(keywordTriage('Decline to insure any applicant born outside of Canada.').flags.map((f) => f.code)).toContain('HUMAN_RIGHTS_PROTECTED_GROUND');
  });

  it('does not treat a motor race as a protected ground', () => {
    expect(keywordTriage('Decline to insure any vehicle used in any organized race, speed test, or competition.').flags.map((f) => f.code)).not.toContain('HUMAN_RIGHTS_PROTECTED_GROUND');
  });

  it('flags charges without conviction and copycat rationales', () => {
    expect(keywordTriage('Decline any applicant charged with but not convicted of an offence.').flags.map((f) => f.code)).toContain('ALLEGATION_NOT_CONVICTION');
    expect(keywordTriage('Decline to insure X.', 'This rule is consistent with industry practice.').flags.map((f) => f.code)).toContain('COPYCAT_REFERENCE');
  });

  it('classifies optional-coverage rules as out-of-scope eligibility rules', () => {
    expect(classifyScope('Decline to offer optional collision coverage on any vehicle more than 15 years old.').inScope).toBe(false);
    expect(classifyScope('Decline to insure any applicant with 3 or more at-fault accidents.').inScope).toBe(true);
  });
});
