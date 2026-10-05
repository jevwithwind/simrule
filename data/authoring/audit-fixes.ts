// Changes made by the consistency audit (scripts/consistency-audit.ts), applied by the expander after the
// batch drafts. Kept as explicit patches so every audit-driven change is visible and counted.
// See deliverables/report/consistency-audit.md for the before/after numbers.

export interface PrecedentPatch {
  id: string;
  refId: string;
  relation: 'same' | 'similar' | 'materially_different';
  explanation: string;
  reason: string;
}

export interface FindingPatch {
  id: string;
  key: string;
  severity?: 'low' | 'medium' | 'high';
  removeCodes?: string[];
  addCodes?: string[];
  reasoning?: string;
  reason: string;
}

/** Check 3: pending similar submissions from other insurers (similarity 0.35 or more) that were listed but not flagged. */
export const PENDING_FLAGS: { id: string; others: string[] }[] = [
  { id: 'DR-003', others: ['DR-070', 'DR-020'] },
  { id: 'DR-007', others: ['DR-038'] },
  { id: 'DR-016', others: ['DR-084'] },
  { id: 'DR-018', others: ['DR-024'] },
  { id: 'DR-019', others: ['DR-097'] },
  { id: 'DR-020', others: ['DR-003'] },
  { id: 'DR-024', others: ['DR-018'] },
  { id: 'DR-026', others: ['DR-058'] },
  { id: 'DR-031', others: ['DR-082', 'DR-059'] },
  { id: 'DR-034', others: ['DR-096'] },
  { id: 'DR-038', others: ['DR-007'] },
  { id: 'DR-054', others: ['DR-097', 'DR-068'] },
  { id: 'DR-058', others: ['DR-026'] },
  { id: 'DR-059', others: ['DR-031', 'DR-082'] },
  { id: 'DR-060', others: ['DR-064'] },
  { id: 'DR-064', others: ['DR-072', 'DR-060', 'DR-078'] },
  { id: 'DR-068', others: ['DR-054'] },
  { id: 'DR-072', others: ['DR-064'] },
  { id: 'DR-078', others: ['DR-064'] },
  { id: 'DR-084', others: ['DR-016'] },
  { id: 'DR-096', others: ['DR-034'] },
  { id: 'DR-097', others: ['DR-019', 'DR-054'] },
];

/** Check 1: similar pairs with different outcomes whose explanation was missing or did not say why the outcomes differ. */
export const PRECEDENT_PATCHES: PrecedentPatch[] = [
  {
    id: 'DR-040', refId: 'DR-048', relation: 'similar',
    explanation: 'Pending Lakeshore Indemnity rule combines 2 non-payment cancellations with 1 minor conviction. DR-048 needs only 1 conviction where the approved AP-03 needs 2, so it is stricter than the precedent and needs data (request more information). DR-040 has no payment element and fits the framework pattern FX-04, so it can be approved with conditions.',
    reason: 'No explanation existed for a 0.431-similarity pair with different outcomes.',
  },
  {
    id: 'DR-048', refId: 'DR-040', relation: 'similar',
    explanation: 'Pending Birchwood Insurance Group rule: 1 at-fault accident plus 2 or more minor convictions in 3 years, which fits FX-04 and is approvable with conditions. DR-048 differs because it lowers the conviction count below the approved AP-03 while relying on payment history, so it needs supporting data first.',
    reason: 'No explanation existed for a 0.431-similarity pair with different outcomes.',
  },
  {
    id: 'DR-026', refId: 'DR-058', relation: 'similar',
    explanation: 'Pending Lakeshore Indemnity rule declines when a household member has a suspended licence. Both judge the applicant by others in the home, but the outcomes differ: DR-026 refuses on household size, a family-status proxy (high-severity fail, so decline), while DR-058 targets vehicle access by a person barred from driving and could be fixed with a driver exclusion (request more information).',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-019', refId: 'DR-097', relation: 'similar',
    explanation: 'Pending Maplewood Mutual rule declines imported vehicles under 15 years old. Both use vehicle age, but DR-097 as written could cover most overseas-built vehicles (high-severity accessibility fail, so decline), while DR-019 affects a smaller group of old vehicles and turns on data the insurer could supply (request more information).',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-097', refId: 'DR-019', relation: 'similar',
    explanation: 'Pending Granite Mutual Insurance rule declines vehicles over 25 years old. Both use vehicle age thresholds; DR-019 reaches a limited group and needs data, while DR-097\'s undefined "imported" wording reaches far more owners, which is why DR-097 is a decline as written.',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-051', refId: 'DR-065', relation: 'similar',
    explanation: 'Pending Beacon Fire & Casualty rule declines a single distracted-driving conviction in 2 years. DR-051 needs 2 serious speeding convictions in 3 years, which fits the approved pattern FX-04; DR-065 declines on one conviction, which is stricter than approved patterns and needs data. That is why DR-051 is approvable and DR-065 is a request for information.',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-065', refId: 'DR-051', relation: 'similar',
    explanation: 'Pending Clearwater General Insurance rule needs 2 serious speeding convictions in 3 years, which fits the approved pattern FX-04 and is approvable. DR-065 declines on a single conviction, which is stricter than any approved pattern, so it needs supporting data first.',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-054', refId: 'DR-084', relation: 'materially_different',
    explanation: 'Same insurer (Grandview Insurance Group) declines vehicles over 4,500 kg on personal policies. DR-084 rests on a product boundary (heavy vehicles need commercial coverage) and is approvable; DR-054 rests on an unproven collision-risk claim, so it needs data first.',
    reason: 'No explanation on this side of a 0.401-similarity pair with different outcomes.',
  },
  {
    id: 'DR-016', refId: 'DR-084', relation: 'similar',
    explanation: 'Pending Grandview Insurance Group rule declines vehicles over 4,500 kg gross weight on personal policies. Both use a vehicle specification threshold, but DR-084 rests on a classification boundary that needs no claims data (approvable), while DR-016 rests on claims-cost data the insurer cites but has not supplied (request more information).',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-084', refId: 'DR-016', relation: 'similar',
    explanation: 'Pending Ridgeline Insurance Co. engine-size rule. Both use a vehicle specification threshold; DR-084 directs heavy vehicles to suitable commercial coverage, which is a product boundary, while DR-016 refuses on a claims-cost claim that still needs data.',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-003', refId: 'DR-020', relation: 'similar',
    explanation: 'Pending Birchwood Insurance Group rule declines home-based business owners making more than 3 client visits a week. DR-003 is limited to primary delivery use, which matches the commercial-use precedent (approvable); DR-020 sets an unsupported weekly count that reaches occasional business use, so it needs data.',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-054', refId: 'DR-097', relation: 'similar',
    explanation: 'Pending Maplewood Mutual rule declines recent imports from outside North America. Many right-hand drive vehicles are such imports, but the outcomes differ: DR-054 affects a small group and turns on data (request more information), while DR-097\'s wording could reach most overseas-built vehicles (decline as written).',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-097', refId: 'DR-054', relation: 'similar',
    explanation: 'Pending Grandview Insurance Group right-hand drive rule. Both concern imported vehicles; DR-054 is narrow and needs data, while DR-097 is a decline as written because its undefined wording reaches mainstream vehicles.',
    reason: 'Explanation described the similarity but not why the outcomes differ.',
  },
  {
    id: 'DR-022', refId: 'DR-044', relation: 'materially_different',
    explanation: 'Pending Grandview Insurance Group rule declines current unpaid premiums owed to the same insurer group, which matches AP-11 and can be cured by paying (approvable). DR-022 declines on past cancellations anywhere without the driving element approved rules require, so it needs data first.',
    reason: 'No explanation on this side of a 0.358-similarity pair with different outcomes.',
  },
];

/** Check 2: findings changed after reviewing issue codes with contradictory or misapplied statuses. */
export const FINDING_PATCHES: FindingPatch[] = [
  {
    id: 'DR-049', key: 'L3_NOT_SUBJECTIVE', severity: 'high',
    reason: 'COPYCAT_REFERENCE on L3_NOT_SUBJECTIVE is high severity where the trigger is another insurer\'s judgment (DR-009, DR-056, DR-086). DR-049 had the same defect at medium.',
  },
  {
    id: 'DR-063', key: 'L3_NOT_SUBJECTIVE', removeCodes: ['COPYCAT_REFERENCE'],
    reasoning: 'Whether a dismissal was "for cause" is the employer\'s view and is often disputed. The rule relies on another party\'s judgment, not a verifiable fact.',
    reason: 'COPYCAT_REFERENCE means reliance on another insurer\'s actions; an employer is not an insurer. SUBJECTIVE_JUDGMENT already covers the defect.',
  },
];
