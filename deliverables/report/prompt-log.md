# Prompt and iteration log

Every significant prompt, revision and iteration in the Simrule build. Newest entries at the bottom. The report's Methodology section is built from this log.

## 1. Build brief (Phase 0)

- **Prompt:** Kevin's "Claude Code Build Brief: Simrule" (phases 1-7, ground rules, sanity anchors).
- **Tool:** Claude Code (cloud session) as sole engineer, analyst and writer.
- **Key constraints taken from the brief:** advisory-only AI; deterministic scoring separate from model judgment; no unverified section-level citations; fictional data labelled on every screen; static site, no backend.

## 2. Source extraction (Phase 1)

- **What I did:** Converted the framework PDF with `pdftotext -layout` and read all 12 slides. Read the rules `.docx` (not Markdown as the brief expected) and wrote `scripts/parse-rules.ts` with `mammoth`.
- **Result:** 100 rules, 10 insurers x 10 rules, dates 2024-06-05 to 2024-11-30, 23 distinct category labels after splitting compound categories on "/".
- **Change from plan:** sources were at the repo root; moved to `/source`.

## 3. Regulatory research (Phase 1)

- **Attempt:** WebFetch on ontario.ca/laws (Human Rights Code), fsrao.ca (Filing Guidelines for Underwriting Rules), ohrc.on.ca and laws-lois.justice.gc.ca.
- **Result:** all four domains returned `EGRESS_BLOCKED` from the environment's network proxy.
- **What changed:** Web search snippets were used for orientation only (for example that Take All Comers derives from Insurance Act ss. 237-238, that Reg. 664 restricts credit information, that FSRA restricts administrative licence lapses and coverage lapses). None of these is marked verified. `knowledge/citations.json` stores every legal reference with `verified: false` and `section: null`, and keeps the section a human should check in a separate `sectionToConfirm` field that the app never displays as a citation. Framework-deck references are marked verified because they were checked against the supplied PDF.
- **Lesson:** the citation registry design (id-only citations, verified flag) made the blocked fetch a contained problem rather than a reason to guess section numbers.

## 4. Similarity design (Phase 1)

- **v1:** TF-IDF cosine on rule text (stop words, light stemming) blended 0.65/0.35 with a feature-overlap score (category Jaccard, trigger-type Jaccard, threshold and lookback closeness).
- **Problem found:** the first trigger taxonomy had broad buckets (`VEHICLE_CONDITION`, `LICENCE_STATUS`, `COMMERCIAL_OR_SPECIAL_USE`). Feature overlap then dominated where text overlap was zero, producing ties (for example DR-052 salvage title tied with engine size and vehicle age rules) and false positives ("email address" matched as geographic; "suspension lowering kits" matched licence suspension).
- **v2:** split into 36 narrower trigger types (for example `SALVAGE_REBUILT`, `MODIFICATION`, `LICENCE_SUSPENSION`, `LICENCE_EXPERIENCE`, `ORIGIN_OR_LANGUAGE`) and tightened the regular expressions.
- **Check:** DR-012's top candidate is AP-07 (racetrack precedent) at 0.896; DR-001's is AP-02 (2 or more at-fault accidents) at 0.988; DR-013's is NC-05 (changed insurers non-compliant example) at 0.557.

## 5. Assessment prompt v1 and pilot (Phase 2)

- **Prompt:** `prompts/assessment-prompt.md` v1: role (AI analyst, advisory only), framework, issue codes, citation registry, precedent registry, similarity candidates, and 7 rules (no recommendation output, verbatim quotes, cite by id, state uncertainty, same/similar/materially different for candidates, flag pending similar submissions, keep the consumer visible).
- **Authoring set-up:** findings are written in a compact form (`data/authoring/*.ts`) and expanded mechanically by `scripts/expand-assessments.ts`, which adds criterion labels and levels from `framework.json`, similarity scores from the index, and provenance. All judgments (status, severity, codes, reasoning, evidence, precedent relations) are in the drafts.
- **Pilot set (10):** DR-001, DR-002, DR-005, DR-007, DR-008, DR-011, DR-012, DR-013, DR-057, DR-096 (8 anchors plus a vague-scope rule and a non-risk-relevant rule).
- **Result:** 1 of 10 passed `scripts/validate-assessments.ts`; 9 failed. Recommendations from scoring were already directionally right (3 approve with conditions, 2 request more information, 5 decline), but the findings behind them were not good enough to show a reviewer. Archived in `data/authoring/archive/` (`pilot-v1.ts`, validation and score output).

## 6. Critical review of the v1 pilot and revision to v2

Problems found by reading the pilot output, each mapped to a v2 rule:

| # | Problem in v1 output | Example | v2 fix |
|---|---|---|---|
| 1 | Reasoning drifted from full sentences to one-word findings as the batch went on ("Clear.", "None.", "Fine."). | DR-008 onwards; 9 files failed the length check | Rule 8: 2-4 full sentences; validator enforces it |
| 2 | Most non-pass findings had no evidence quote, so nothing could be highlighted. | DR-011, DR-013, DR-057 | Rule 9: quote the words that caused the finding |
| 3 | A non-pass finding with no issue code. | DR-002 Level 4 | Rule 10 plus validator check |
| 4 | Human rights problem counted twice at Level 1 (legislation and human rights both failed). | DR-005 | Rule 11: keep Level 1 criteria separate |
| 5 | Market check claimed precedent support for a materially broader rule. | DR-057 matched to commercial use (AP-06); DR-002 matched to AP-01 despite a different trigger | Rule 14: pass only for same or similar trigger and not broader |
| 6 | "Consistent with industry practice" rationale not flagged. | DR-008 (sanity anchor) | Rule 16: copycat flag on rationale or trigger |
| 7 | Actuarial gap severity inconsistent (low for some approvable rules, medium for others, with no rule). | DR-001 vs DR-012 vs DR-057 | Rule 17: low only when a no-stricter precedent exists |
| 8 | Precedent explanations like "Near-identical wording." | DR-012 | Rule 18: name trigger, threshold, lookback, who is affected |
| 9 | Pending similar submission listed but not flagged with the issue code. | DR-001 vs DR-040 | Rule 15: `PENDING_SIMILAR_SUBMISSION` at similarity 0.35 or more |
| 10 | Consumer consequence "Residual market." with no explanation. | Most pilot files | Rule 19: compulsory insurance, Facility Association, cost, or stop driving |
| 11 | Charter never considered; risk of overstating it if added naively. | All | Rule 12: Charter applies to the regulator's approval, not the insurer |
| 12 | Unclear how to treat grounds the Code's insurance provision covers. | DR-007 | Rule 13: concern for age, sex, marital status, family status, disability; fail for other grounds |
| 13 | Questions, "what would change" and next steps often empty. | DR-008, DR-012 | Rule 20 plus validator check |

- **v2 re-run of the same 10 rules:** 10 of 10 passed validation. The recommendations did not change for any pilot rule, which shows the v1 problem was explanation quality, not direction.
- **Added for consistency:** `data/authoring/common.ts` gives standard wording for recurring situations (for example a Level 1 pass for a conduct-based trigger, or the actuarial gap). Same situation, same words: this is one of the consistency mechanisms.

## 7. Scoring calibration (once, then frozen)

- **Method:** `scripts/calibrate.ts` scored the 13 anchor rules under 5 weight sets (40/35/25 start, 35/40/25, 40/40/20, equal, 50/30/20) and 3 threshold pairs (75/50 start, 70/50, 80/55).
- **Result:** all 15 configurations matched all 13 anchors. The anchors are decided mostly by hard stops (Level 1 fails) and high-severity fails, so they cannot tell weightings apart. The smallest margin between a score-decided anchor and a threshold was 5.8 points with the starting values.
- **Decision:** keep the starting values (Level 2: 40, Level 3: 35, Level 4: 25; approve at 75 or above, request information at 50 to 74). Tuning further on 13 rules would be overfitting. Frozen in `knowledge/framework.json`.
- **Honest limitation:** the weights are lightly tested. They decide the outcome only for rules with no hard stop and no high-severity fail. Production use would need validation against historical regulator decisions.

## 8. Rule 17 clarification during batch 07

- **Problem found while assessing DR-060 (vehicle registered in another province):** read literally, v2 rule 17 made every rule without a precedent carry a medium-severity actuarial gap. Scoring treats a medium gap as material, so every novel rule would route to Request more information, including administrative rules whose basis is legal (jurisdiction, garaging address) and where no actuarial study could change the outcome.
- **Change:** rule 17 now says `low` also applies when the rule rests on a legal or administrative requirement rather than a statistical claim. This formalises the existing "or the data could change the outcome" clause; it is a clarification, not a new version.
- **Effect:** affects only administrative rules assessed from batch 07 on (DR-060, DR-072, DR-089). Earlier `low` findings all had a matching approved precedent, so no earlier finding changed.

## 9. Batch generation (batches 02 to 10)

- **Process:** for each batch of 10, print the rule, rationale and top-5 similarity candidates (`scripts/show-candidates.ts`), write findings under prompt v2, expand, validate, score, review outliers, fix, commit.
- **First-pass validation:** 9 of the 90 non-pilot assessments failed validation on first run (batches 04 to 10), every time for the same reason: a reasoning field with a single long sentence joined by a comma or colon. Each was fixed by splitting the sentence; no finding changed.
- **Scoring surprises reviewed, not tuned:** DR-085 (inconsistent application information) scored 46.5 and became a decline when I had expected request more information; DR-071 (stunt driving, 5-year lookback) scored 93 but routes to request more information because rule 17 treats a lookback stricter than the precedent as a material data gap. In both cases I left the findings and the deterministic outcome alone rather than adjusting findings to hit an expected answer, and recorded them in the spot check as candidates for reviewer override.
- **Result:** 100 of 100 assessments pass validation; 1,500 criterion findings (551 pass, 492 concern, 278 fail, 179 insufficient information); 940 verbatim evidence quotes; recommendations 21 approve with conditions, 22 request more information, 57 recommend decline.

## 10. Consistency audit loop

- **Script:** `scripts/consistency-audit.ts` (similar pairs with different outcomes; mixed statuses for the same criterion and issue code; missing pending-similar flags).
- **Before:** 16 different-outcome pairs (1 with no explanation; a manual read found 8 more that described similarity but not the reason for the different outcome); 9 mixed-status code groups with no written explanation; 29 missing pending flags across 22 assessments.
- **Fixes:** applied as explicit patches in `data/authoring/audit-fixes.ts` and recorded in each assessment's `auditNotes`: 14 precedent comparisons rewritten or added, 22 market-check findings given the pending flag, 2 findings corrected (DR-049 severity aligned with the other copycat rules; DR-063 copycat code removed because an employer is not an insurer).
- **After:** 0 unexplained pairs, 0 missing flags, 9 code groups each with a written explanation. 29 assessments changed (38 changes). No recommendation changed.
- **Lesson:** the automated "is there an explanation?" check was too weak on its own: it passed 15 of 16 pairs, but reading them showed 8 explanations that never said why the outcomes differed.

## 11. Testing iteration (Phase 4)

- **Unit tests first (vitest, 129 tests):** parser (100 rules, every field), deterministic scoring (Level 1 hard stop, out of scope, the 75 and 50 edges, material information gap, senior-review flag), similarity anchors, keyword triage, all 100 assessments against the schema and content rules, workflow seeding and sign-off triggers. All passed on first run, which confirms the Phase 2 validators and the app share one source of truth.
- **End-to-end tests found what unit tests could not:**
  1. Uploading a PDF failed in Chromium with "getOrInsertComputed is not a function". The modern `pdfjs-dist` build uses a JavaScript method browsers do not ship yet. Switched to the legacy build, which includes the polyfill. A reviewer on an ordinary browser would have hit this in the demo.
  2. The audit trail showed raw keys such as `APPROVE_WITH_CONDITIONS` and `AI_MISREAD_RULE`. Not plain English, so the display and the Markdown export now map them to labels; the JSON export keeps the keys for traceability.
  3. At 390 px the dashboard toolbar and two tables pushed the page sideways. Fixed with wrapping and scroll containers; a test now fails on any horizontal scroll.
- **Accessibility (axe):** one serious issue on 5 screens (small uppercase labels under 4.5:1 contrast). Darkened the token; 0 violations on 9 screens.
- **Lesson:** the flow test is the closest thing to a real reviewer. Three of four bugs were invisible to type checks and unit tests.

## 12. Live assessment (stretch): same prompt, new guard rails

- **Prompt:** the live call fills the same v2 prompt (`prompts/assessment-prompt.md`) at run time with the framework, issue codes, citation registry, precedents, the uploaded rule and its similarity candidates. No new prompt version.
- **Change in what the model sees:** the citation registry sent to the model contains id, instrument, what it supports and a verified flag only. The unconfirmed section numbers kept for the human checker are never sent, so the model cannot cite them.
- **Constraint moved from words to schema:** in batch generation, "use only these codes and ids" was an instruction checked afterwards. In the live call it is enforced by structured outputs: the output schema's enums only allow the 15 criteria, the 25 issue codes, the 28 citation ids and known precedent ids.
- **Post-checks:** the same validator as the seeded assessments. Quotes that are not word for word are removed and noted; sentence-count problems are shown as warnings (rejecting a paid run for a five-sentence finding would waste the visitor's money); missing criteria or unknown ids reject the run.
- **Not done:** no live run was possible from the build environment (no key), so the call is tested against a mocked API. A real run should be spot-checked against the seeded assessment for the same rule before relying on it.

