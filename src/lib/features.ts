// Lightweight, deterministic feature extraction from rule wording.
// Used by similarity (feature overlap) and by intake keyword triage.

export type TriggerType =
  | 'AT_FAULT_ACCIDENTS'
  | 'CRIMINAL_CONVICTION'
  | 'TRAFFIC_CONVICTION'
  | 'TRAFFIC_SANCTION'
  | 'IMPAIRED_DRIVING'
  | 'FRAUD'
  | 'MISREPRESENTATION'
  | 'NON_PAYMENT'
  | 'LICENCE_VALIDITY'
  | 'LICENCE_SUSPENSION'
  | 'LICENCE_EXPERIENCE'
  | 'COMMERCIAL_USE'
  | 'SPECIAL_USE'
  | 'RACING'
  | 'SALVAGE_REBUILT'
  | 'MODIFICATION'
  | 'VEHICLE_SPEC'
  | 'THEFT_RISK'
  | 'CLAIMS_HISTORY'
  | 'COVERAGE_HISTORY'
  | 'AGE'
  | 'ORIGIN_OR_LANGUAGE'
  | 'OCCUPATION_STATUS'
  | 'GEOGRAPHIC'
  | 'DISTANCE'
  | 'FINANCIAL'
  | 'CHARGES_OR_ALLEGATIONS'
  | 'CIVIL_DISPUTES'
  | 'WATCHLIST'
  | 'BELIEFS_OR_EXPRESSION'
  | 'ONLINE_CONDUCT'
  | 'HOUSEHOLD'
  | 'OWNERSHIP'
  | 'MONITORING_CONSENT'
  | 'ADMINISTRATIVE'
  | 'MEDICAL';

const TRIGGER_PATTERNS: [TriggerType, RegExp][] = [
  ['AT_FAULT_ACCIDENTS', /at-fault accident|accidents? and tickets|accidents or tickets/],
  ['CRIMINAL_CONVICTION', /criminal code conviction|convictions? for (auto )?insurance fraud|convicted of (insurance )?(fraud|a crime)/],
  ['TRAFFIC_CONVICTION', /minor conviction|speeding conviction|distracted driving conviction|conviction for racing|stunt driving|tickets/],
  ['TRAFFIC_SANCTION', /impound|demerit/],
  ['IMPAIRED_DRIVING', /impaired/],
  ['FRAUD', /fraud/],
  ['MISREPRESENTATION', /misrepresentation|inconsistent information/],
  ['NON_PAYMENT', /non-payment|unpaid premium|outstanding (unpaid )?premium|missed payments|failure to pay/],
  ['LICENCE_VALIDITY', /invalid|expired|improper class|valid canadian licen|valid licen/],
  ['LICENCE_SUSPENSION', /licen[cs]e[\w\s]{0,20}suspend|suspended licen|licen[cs]e suspension|surrender|denied a licen/],
  ['LICENCE_EXPERIENCE', /g1|g2|graduated licen|valid for less than|held a canadian driver/],
  ['COMMERCIAL_USE', /commercial|business|delivery|rideshare|car-sharing|tow a trailer|hazardous|driving instruction|carry cargo/],
  ['SPECIAL_USE', /police|security patrol|private investigation|emergency response|foster|not (originally )?designed|mobile dwelling/],
  ['RACING', /racetrack|\brace\b|racing|speed test|competition|modified for speed/],
  ['SALVAGE_REBUILT', /rebuilt|salvage|total loss|written off/],
  ['MODIFICATION', /modifi|aftermarket|customi[sz]ation|performance parts/],
  ['VEHICLE_SPEC', /engine displacement|weight rating|right-hand|autonomous|imported|years old|market value|red cars/],
  ['THEFT_RISK', /stolen/],
  ['CLAIMS_HISTORY', /not-at-fault claims|comprehensive claims|fraudulent claim|made a claim|claims? (on|within)/],
  ['COVERAGE_HISTORY', /lapse in auto insurance|coverage with a canadian|facility association|changed (insurance providers|insurers)|never had insurance/],
  ['AGE', /\bage of\b|under the age|over the age/],
  ['ORIGIN_OR_LANGUAGE', /born outside|primary language|citizenship|newcomer/],
  ['OCCUPATION_STATUS', /student|employed as|occupation|employment|self-employed|night shifts/],
  ['GEOGRAPHIC', /postal code|rural|province other|residential address|garaged|parks their vehicle|resides/],
  ['DISTANCE', /kilometres|commute|travel to the united states/],
  ['FINANCIAL', /credit score|bankruptcy|social assistance|disability benefits|proof of income/],
  ['CHARGES_OR_ALLEGATIONS', /charged with|accused|investigation|active warrant|restraining order/],
  ['CIVIL_DISPUTES', /litigation|lawsuit|ombudsman|complaint/],
  ['WATCHLIST', /watchlist|sanctions/],
  ['BELIEFS_OR_EXPRESSION', /advocated|political/],
  ['ONLINE_CONDUCT', /social media/],
  ['HOUSEHOLD', /household|married to|lives with|shares a residential|family member/],
  ['OWNERSHIP', /does not own|registered to a business|owns more than/],
  ['MONITORING_CONSENT', /telematics|consent to/],
  ['ADMINISTRATIVE', /email|p\.o\. box|refuses to disclose|re-register/],
  ['MEDICAL', /medical/],
];

export function detectTriggers(text: string): TriggerType[] {
  const t = text.toLowerCase();
  return TRIGGER_PATTERNS.filter(([, re]) => re.test(t)).map(([k]) => k);
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

function toNumber(s: string): number {
  return NUMBER_WORDS[s.toLowerCase()] ?? Number(s);
}

/** Count threshold such as "3 or more", "more than 3" (=> 4), "2 or more". Returns the first found. */
export function extractThreshold(text: string): number | null {
  const t = text.toLowerCase();
  const orMore = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten) or more\b/);
  if (orMore) return toNumber(orMore[1]);
  const moreThan = t.match(/\bmore than (\d+|one|two|three|four|five|six|seven|eight|nine|ten) (times|vehicles|licensed|individuals|days)/);
  if (moreThan) return toNumber(moreThan[1]) + 1;
  const plain = t.match(/\b(\d+) (at-fault|minor|cancellations|convictions|not-at-fault|comprehensive)/);
  if (plain) return Number(plain[1]);
  return null;
}

/** Lookback window in years, from "preceding N years", "within N months", "in N years", "over a N-year period". */
export function extractLookbackYears(text: string): number | null {
  const t = text.toLowerCase();
  const years = t.match(/(?:preceding|within|in|last|past) (\d+|one|two|three|four|five|ten) years?/);
  if (years) return toNumber(years[1]);
  const months = t.match(/(?:preceding|within|in|last|past) (\d+) months/);
  if (months) return Math.round((Number(months[1]) / 12) * 100) / 100;
  const period = t.match(/(\d+)-year period/);
  if (period) return Number(period[1]);
  return null;
}

export interface RuleFeatures {
  triggers: TriggerType[];
  threshold: number | null;
  lookbackYears: number | null;
  categories: string[];
}

export function extractFeatures(ruleText: string, categories: string[]): RuleFeatures {
  return {
    triggers: detectTriggers(ruleText),
    threshold: extractThreshold(ruleText),
    lookbackYears: extractLookbackYears(ruleText),
    categories: categories.map((c) => c.toLowerCase()),
  };
}
