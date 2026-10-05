import type { Assessment } from '../src/lib/schema';
import type { LiveOutput } from '../src/lib/liveAssessment';

/** What the model would return for DR-005: the seeded findings without the fields Simrule adds. */
export function outputFrom(a: Assessment): LiveOutput {
  return {
    extracted: a.extracted,
    scope: a.scope,
    criteria: a.criteria.map(({ level: _l, label: _b, ...c }) => c) as LiveOutput['criteria'],
    precedents: a.precedents.filter((p) => /^(AP|FX|NC)-/.test(p.refId)).map(({ similarity: _s, ...p }) => p) as LiveOutput['precedents'],
    consumerImpact: a.consumerImpact,
    questionsForInsurer: a.questionsForInsurer,
    whatWouldChangeTheOutcome: a.whatWouldChangeTheOutcome,
    nextSteps: a.nextSteps,
    confidence: a.confidence,
    uncertainties: a.uncertainties,
  };
}

