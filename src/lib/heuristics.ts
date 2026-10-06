// Keyword triage for newly uploaded rules. LOW CONFIDENCE: a fast, explainable first pass only.
// It flags likely issue codes from wording so the reviewer knows where to look; the full AI
// assessment (or a human) must still assess every criterion.

export interface TriageFlag {
  code: string;
  level: 1 | 2 | 3 | 4;
  matched: string;
  why: string;
}

interface Pattern {
  code: string;
  level: 1 | 2 | 3 | 4;
  re: RegExp;
  why: string;
}

const PATTERNS: Pattern[] = [
  { code: 'HUMAN_RIGHTS_PROTECTED_GROUND', level: 1, re: /\b(born outside|place of (birth|origin)|citizenship|citizen of|racial\w*|ethnic|ancestry|religio\w*|creed|sexual orientation|gender identity|gender expression|marital status|pregnan\w*)\b/i, why: 'Wording names a protected ground under the Human Rights Code.' },
  { code: 'PROXY_FOR_PROTECTED_GROUND', level: 2, re: /\b(primary language|language (is|other)|surname|first name|name (matches|similar|that is similar)|similar to a name|postal code|neighbourhood|neighborhood|newcomer|immigra\w*|accent)\b/i, why: 'Wording uses a characteristic that often stands in for a protected ground.' },
  { code: 'HUMAN_RIGHTS_PROTECTED_GROUND', level: 1, re: /\b(under the age of|over the age of|age \d+|aged \d+|disabilit\w*|medical condition|diagnos\w*|family member under|children|single parent)\b/i, why: 'Wording uses age, disability or family status, which the Code allows in insurance only on reasonable and bona fide grounds.' },
  { code: 'PROHIBITED_FACTOR', level: 1, re: /\b(credit score|credit rating|credit history|bankrupt\w*|proof of income|income|lapse in (auto )?insurance|lapse in coverage|consecutive years of (auto )?insurance|unpaid fines|voluntar\w* surrender)\b/i, why: 'Wording uses a factor that Ontario rules or FSRA guidance restrict (credit information, coverage lapses, administrative lapses).' },
  { code: 'DISCRIMINATORY_IMPACT_NEW_DRIVERS', level: 2, re: /\b(g1|g2|graduated licen[cs]e|newly licensed|licen[cs]e (has been )?(valid|held) for less than|never (been )?insured|never had insurance|driving instruction)\b/i, why: 'Wording would decline newly licensed or inexperienced drivers.' },
  { code: 'DISCRIMINATORY_IMPACT_NEW_TO_CANADA', level: 2, re: /\b(new(comer)? to canada|canadian insurer|canadian licen[cs]e|foreign licen[cs]e|outside (of )?canada|recently arrived)\b/i, why: 'Wording would fall on drivers new to Canada.' },
  { code: 'ALLEGATION_NOT_CONVICTION', level: 3, re: /\b(charged|accused|alleged|investigation|warrant|restraining order|regardless of (whether )?(a )?conviction|without (a )?conviction|not convicted|suspected)\b/i, why: 'Wording relies on an allegation, charge or investigation rather than a conviction.' },
  { code: 'COPYCAT_REFERENCE', level: 3, re: /\b(another insurer|other insurers?|industry practice|consistent with (the )?industry|facility association|cancelled by (another|a previous))\b/i, why: 'Wording or rationale relies on another insurer\'s decision or on industry practice.' },
  { code: 'VAGUE_LANGUAGE', level: 3, re: /\b(may|might|similar to|reckless|unacceptable|excessive|frequent(ly)?|regular(ly)?|primarily|permanent|any (other )?reason|such as|etc\.?)\b/i, why: 'Wording contains open-ended terms that need a definition.' },
  { code: 'SUBJECTIVE_JUDGMENT', level: 3, re: /\b(in (our|the insurer'?s) (opinion|judgment|discretion)|deemed|appears to|social media|behaviour(al)? pattern|lifestyle)\b/i, why: 'Applying the rule appears to depend on the insurer\'s judgment.' },
  { code: 'PUBLIC_POLICY_CONFLICT', level: 4, re: /\b(complaint|ombudsman|litigation|lawsuit|advocat\w*|political|foster|volunteer|social assistance|child protective)\b/i, why: 'Wording penalises an activity or status that public policy protects or encourages.' },
  { code: 'NOT_RISK_RELEVANT', level: 3, re: /\b(email address|social media|employment|employed as|terminated|occupation|shift|homeowner'?s|tenant'?s)\b/i, why: 'Trigger does not obviously relate to driving behaviour, vehicle use or claims exposure.' },
];

const ELIGIBILITY_RE = /\b(optional coverage|optional coverages|coverage limit|limits? (of|above|over)|endorsement|collision coverage|comprehensive coverage|all perils|specified perils|opcf|rental (vehicle )?coverage|loss of use|waiver of depreciation|accident benefits? options?)\b/i;
const DECLINE_RE = /\b(decline to (insure|issue|offer|renew)|refuse to (insure|issue|renew)|will not (insure|issue)|decline (the )?(policy|application|applicant)|deny insurance|terminate)\b/i;

export interface TriageResult {
  flags: TriageFlag[];
  scope: { inScope: boolean; ruleType: 'decline' | 'eligibility' | 'unclear'; note: string };
  confidence: 'low';
  label: string;
}

export function keywordTriage(ruleText: string, rationale = ''): TriageResult {
  const text = `${ruleText} ${rationale}`;
  const flags: TriageFlag[] = [];
  const seen = new Set<string>();
  for (const p of PATTERNS) {
    const target = p.code === 'COPYCAT_REFERENCE' ? text : ruleText;
    const m = target.match(p.re);
    if (m && !seen.has(p.code)) {
      seen.add(p.code);
      flags.push({ code: p.code, level: p.level, matched: m[0], why: p.why });
    }
  }
  return { flags, scope: classifyScope(ruleText), confidence: 'low', label: 'Keyword triage, low confidence, full AI assessment pending' };
}

export function classifyScope(ruleText: string): TriageResult['scope'] {
  if (ELIGIBILITY_RE.test(ruleText)) {
    return { inScope: false, ruleType: 'eligibility', note: 'Wording refers to an optional coverage, coverage limit or endorsement rather than the whole policy. This looks like an eligibility rule, which is out of scope: route to the eligibility-rule process.' };
  }
  if (DECLINE_RE.test(ruleText)) return { inScope: true, ruleType: 'decline', note: 'Wording declines the policy itself. In scope as a decline rule.' };
  return { inScope: true, ruleType: 'unclear', note: 'Wording does not say clearly whether the whole policy or a coverage is declined. Reviewer should confirm scope.' };
}
