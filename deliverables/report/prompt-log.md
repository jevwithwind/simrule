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
