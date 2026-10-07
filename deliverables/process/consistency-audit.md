# Consistency audit

Run with `npx tsx scripts/consistency-audit.ts --label=before|after --list` over all 100 assessments. Raw results: `data/audit-results.json`. Changes made by the audit are explicit patches in `data/authoring/audit-fixes.ts`, applied by the expander and recorded in each changed assessment's `auditNotes` field, which the app shows on the rule review screen.

## Summary

| Check | Before | After |
|---|---|---|
| Similar pairs (similarity 0.35 or more) with different recommendations | 16 | 16 |
| ...of which no explanation existed (automated check) | 1 | 0 |
| ...of which the explanation did not say why the outcomes differ (manual review) | 8 | 0 |
| Issue-code groups with mixed statuses (same criterion and code) | 9 | 9 |
| ...of which no written explanation of the spread | 9 | 0 |
| ...of which a finding was actually misapplied and fixed | 2 | 0 |
| Pending similar submissions from other insurers listed but not flagged | 29 flags in 22 assessments | 0 |
| Assessments changed by the audit | n/a | 29 (38 changes) |
| Recommendations changed by the audit | n/a | 0 |

The audit changed explanations, flags and two findings. It did not change any recommendation. That is the expected result for a consistency audit: the deterministic scoring had already put similar rules in the same place, and the audit found gaps in how that was explained.

## Check 1: similar pairs with different outcomes

Sixteen pairs of submissions with similarity of 0.35 or more received different recommendations. Every one was reviewed. The automated check (does either assessment list the other with an explanation?) found one pair with nothing at all: DR-040 and DR-048. A manual read of the other 15 found 8 whose explanation described what the rules shared but not why the outcomes differed. Fourteen comparisons were rewritten or added.

| Pair | Outcomes | Material difference recorded |
|---|---|---|
| DR-026 / DR-058 | Decline / Request information | Household size is a family-status proxy; a suspended household member is a real access risk that a driver exclusion could fix. |
| DR-014 / DR-074 | Approve / Decline | Applicant's own fraud conviction versus a partner's conviction (already explained). |
| DR-019 / DR-097 | Request information / Decline | Old vehicles are a limited group needing data; "imported from outside North America" as written reaches most overseas-built cars. |
| DR-026 / DR-089 | Decline / Approve | Refusing large households versus requiring disclosure (already explained). |
| DR-040 / DR-048 | Approve / Request information | DR-040 fits FX-04; DR-048 lowers the conviction count below the approved AP-03. |
| DR-051 / DR-065 | Approve / Request information | Two serious speeding convictions fit FX-04; one distracted-driving conviction is stricter than any approved pattern. |
| DR-060 / DR-064 | Approve / Request information | Registration jurisdiction is clear; "permanent" address is undefined (already explained). |
| DR-054 / DR-084 | Request information / Approve | Unproven collision-risk claim versus a commercial product boundary. |
| DR-016 / DR-084 | Request information / Approve | Claims-cost threshold without data versus a classification boundary. |
| DR-064 / DR-072 | Request information / Approve | Undefined "permanent" versus a narrow no-physical-address test (already explained). |
| DR-003 / DR-020 | Approve / Request information | Primary delivery use matches the precedent; an unsupported weekly visit count reaches occasional business use. |
| DR-008 / DR-042 | Approve / Decline | Conviction versus charge (already explained). |
| DR-054 / DR-097 | Request information / Decline | Narrow group needing data versus overbroad wording. |
| DR-022 / DR-044 | Request information / Approve | Past cancellations anywhere versus a current debt to the same insurer (AP-11). |
| DR-039 / DR-072 | Decline / Approve | Email has no rating reason; a physical address is needed to rate garaging (already explained). |
| DR-058 / DR-089 | Request information / Approve | Refusal versus disclosure (already explained). |

## Check 2: issue codes with mixed statuses

Nine (criterion, issue code) groups carry more than one status, for example `ACCESSIBILITY_IMPACT` at Level 2 appears as low concern, medium fail and high fail. No group had an issue code attached to a pass finding (other than the two neutral precedent codes). Each spread was reviewed:

| Criterion / code | Why the spread is intended |
|---|---|
| L1 legislation / `PROHIBITED_FACTOR` | Fail (high) when the trigger is squarely a restricted factor (credit score DR-011, bankruptcy DR-036, income DR-066, coverage lapses DR-027 and DR-077, administrative or medical lapses DR-076, DR-090, DR-094). Concern when only part of the rule may fall inside the restriction (DR-002 roadside suspensions, DR-017 benefit receipt, DR-031 not-at-fault incidents, DR-033 expired licences). Low for DR-021, where the link to lapse guidance is indirect. |
| L2 accessibility / `ACCESSIBILITY_IMPACT` | Severity tracks how many consumers lose access and whether they can fix it themselves: low where a fix is in their hands or specialty cover exists, high where whole groups (an age band, a neighbourhood, everyone born abroad) are shut out. |
| L4 public policy / `PUBLIC_POLICY_CONFLICT` | Maps to the framework's yes / no / maybe: concern means "maybe", fail means "yes". Severity tracks how directly the rule cuts against a protected interest. |
| L2 discrimination / `PROXY_FOR_PROTECTED_GROUND` | Fail (high) for direct or close proxies (language, postal code, surname, credit, household size, investigations); concern for weaker correlations (occupation, payment history, application errors). DR-026 (household size, fail) and DR-099 (shared address, concern) differ because DR-026 counts family members while DR-099 turns on housemates' insurance choices. |
| L3 subjectivity / `SUBJECTIVE_JUDGMENT` | Fail (high) where the trigger is another insurer's judgment or an undefined "similar" or "reckless" test; fail (medium) where staff must judge something the insurer could define; concern (low) where a declared fact needs light verification. |
| L2 accessibility / `OVERBROAD_SCOPE` | Low for rules that reach a few extra cases (rebuilt vehicles with valid inspections); high for DR-097, whose wording reaches most overseas-built vehicles. |
| L3 risk link / `WEAK_RISK_LINK` | Concern for plausible but unproven links; fail where the rationale is speculation about motive (DR-013, DR-077) or the vehicle is not even used for the activity (DR-030). |
| L1 human rights / `PROXY_FOR_PROTECTED_GROUND` | Fail only for close proxies for grounds outside the Code's insurance provision (language, newcomer status, disability benefits). Concern (high) for name-matching and investigation rules that need a senior legal view; lower concern for indirect effects. |
| L2 discrimination / `DISCRIMINATORY_IMPACT_NEW_TO_CANADA` | Fail where the rule targets origin or Canadian history directly; concern where newcomers are affected incidentally (coverage lapses DR-027, re-registration deadline DR-075). |

Two findings were genuinely misapplied and were fixed:

1. **DR-049, L3 subjectivity:** `COPYCAT_REFERENCE` was medium severity, while the same defect (relying on another insurer's judgment) is high in DR-009, DR-056 and DR-086. Raised to high.
2. **DR-063, L3 subjectivity:** `COPYCAT_REFERENCE` was applied to an employer's dismissal decision. The code means reliance on another insurer's actions, so it was removed; `SUBJECTIVE_JUDGMENT` already covers the defect.

## Check 3: pending similar submissions

Prompt v2 rule 15 asks the analyst to flag similar pending submissions from other insurers (similarity 0.35 or more) so reviewers can assess them together. Twenty-nine such links in 22 assessments were listed in the similar-rules panel but not flagged on the market check. All 22 assessments now carry `PENDING_SIMILAR_SUBMISSION`, which drives the "Review together" button in the app.

## Clusters checked for consistent outcomes

| Cluster | Rules | Outcomes |
|---|---|---|
| Place of origin, language, citizenship | DR-005, DR-028, DR-053, DR-081 | All decline, all Level 1 hard stops |
| Credit and income information | DR-011, DR-036, DR-066 (DR-017 also disability) | All decline; three Level 1 hard stops |
| New drivers | DR-007, DR-018, DR-024, DR-046, DR-077, DR-098 | All decline |
| Administrative or medical licence lapses | DR-076, DR-090, DR-094 | Decline (hard stop); DR-002 and DR-033 differ because they may only partly involve administrative lapses |
| Reliance on another insurer's decision | DR-009, DR-056, DR-086 | All decline; DR-008 and DR-040 (rationale only) approve with a condition |
| Penalising claims or disputes | DR-015, DR-031, DR-059, DR-061, DR-082 | All decline |
| Household composition | DR-026, DR-074, DR-080, DR-099 decline; DR-058 request information; DR-089 approve | Differences explained above |
| Commercial use | DR-003, DR-035, DR-047, DR-070, DR-079, DR-095 approve; DR-020, DR-025, DR-057 request information; DR-098 decline | Line drawn at actual commercial use of the vehicle; unpaid family instruction (DR-098) is not commercial |
