# Simrule build progress

Resume rule: find the last phase marked done below and continue from the next one.

## Phases

- [x] Phase 1: research, scaffold, data and knowledge layer (done)
- [x] Phase 2: assessment generation, scoring, consistency audit, spot check (done)
- [ ] Phase 3: web app
- [ ] Phase 4: tests, sample submissions, end-to-end, screenshots
- [ ] Phase 5: static build into `/docs`, README
- [ ] Phase 6: companion deliverables (diagram, chatbot pack, avatar script, recording script, report)
- [ ] HARD STOP: final tests and build, push, pull request, handoff

## Decisions

1. Source files were at the repo root, not in `/source`. Moved them into `/source` with `git mv` to match the brief.
2. The rule list arrived as a `.docx` (`100-fictional-underwriting-decline-rules.docx`), not Markdown. `scripts/parse-rules.ts` reads the `.docx` with `mammoth` (raw text) and parses the same `DR-xxx Submitting Insurer: ... Rule Category: ...` pattern.
3. The "key principles" image was not in the repo. The four principles (human-in-the-loop, transparency, consistency, consumer protection) are taken from the brief text.

4. Stack: Vite 8, React 19, TypeScript 5.9 (pinned; npm offered 7.0 which is the new native compiler and was avoided for stability), Tailwind 4, Zustand 5, recharts 3, zod 4, vitest 5.
5. Citation registry keeps a `sectionToConfirm` field for the human checker. It is never rendered as a citation in the app; the app shows instrument plus "section not verified".
6. Framework-deck references (slides 3-12) are marked `verified: true` because they were checked against the supplied PDF, which is their source.
7. Issue code taxonomy has 25 codes: the 21 from the brief plus `PROHIBITED_FACTOR` (credit information, coverage lapses, administrative lapses), `LESS_RESTRICTIVE_ALTERNATIVE` (rating or an endorsement would do), `SUBJECTIVE_JUDGMENT` (Level 3 "is it subjective") and `PRIVACY_INTRUSION` (social media, child protection records).
8. Level 1 "Already exists in the market" status meaning: pass = approved precedent with same or similar intent; insufficient information (low) = no precedent, assessed on its own merits; concern = closest match is an illustrative non-compliant example. Level 1 does not add to the score; it is a gate.
9. "Material" insufficient information = an `insufficient_information` finding at Levels 2-4 with medium or high severity. This is how the AI signals that the gap could change the outcome; scoring then routes to Request more information.
10. Level 4 status maps to the framework's yes / no / maybe: pass = "No (nothing inappropriate)", concern or insufficient = "Maybe", fail = "Yes (conflicts with public policy)".
11. Similarity = 0.65 x TF-IDF cosine on rule text + 0.35 x feature overlap (categories 0.35, trigger types 0.45, threshold 0.1, lookback 0.1). Top 5 per rule, with the best precedent forced into the list if none made the top 5.
12. Precedents: 14 approved rules (AP-01 to AP-14) from slide 12 with invented insurers from a separate name set and illustrative approval years 2015-2023; 6 framework common examples (FX-01 to FX-06, slide 3); 5 illustrative non-compliant examples (NC-01 to NC-05, slide 5).
14. Scoring calibration (once): 15 weight/threshold configurations all matched the 13 anchors, so the starting values (40/35/25; 75/50) were kept and frozen. See prompt-log entry 7.
15. Findings are authored in compact form (`data/authoring/batch-*.ts`) and expanded mechanically; `common.ts` holds standard wording for recurring findings.
16. Rule 17 (actuarial severity) clarified during batch 07 so administrative rules whose basis is legal are not automatically routed to Request more information. Logged as prompt-log entry 8; no earlier finding changed.
17. Consistency-audit changes are applied as explicit patches (`data/authoring/audit-fixes.ts`) and recorded per assessment in `auditNotes`, shown in the app.
18. Scoring outcomes were never tuned by editing findings to hit an expected answer (DR-071, DR-085 left as scored; listed in spot-check as override candidates).
13. Added a fifth decision option, "Route to eligibility-rule process", used only when the AI recommendation is Out of scope.

## Open issues

1. **Fetch blocked.** The environment's network egress policy blocks `www.ontario.ca`, `www.fsrao.ca` and `www.ohrc.on.ca` (WebFetch returns EGRESS_BLOCKED). No citation could be verified against the official source, so every entry in `knowledge/citations.json` has `verified: false` and `section: null`. Web search result snippets were used only for orientation and are never presented as verified. Full list in `deliverables/VERIFY.md`.

## Numbers

- Rules parsed: 100 (10 insurers x 10). Category labels after splitting: 23.
- Precedent registry: 25 entries (14 approved, 6 framework common examples, 5 illustrative non-compliant).
- Issue codes: 25. Criteria per assessment: 15 (Level 1: 3, Level 2: 6, Level 3: 5, Level 4: 1).
- Citation registry: 28 entries; 7 verified (framework deck), 21 unverified (official sites blocked).
- Pilot v1: 1 of 10 passed validation; v2 re-run: 10 of 10 passed; recommendations unchanged between v1 and v2.
- Calibration: 15 configurations tested, 13 of 13 anchors matched in every one; minimum margin with frozen values 5.8 points.
- Assessments: 100 of 100 validated. Criterion findings: 1,500 (pass 551, concern 492, fail 278, insufficient information 179). Verbatim evidence quotes: 940. Citation references: 1,560.
- First-pass validation failures after v2: 9 of 90 (all single-sentence reasoning; fixed by splitting sentences).
- Recommendation distribution: Approve with conditions 21; Request more information 22; Recommend decline 57; Out of scope 0.
- Confidence distribution: high 64; medium 36; low 0.
- Level 1 hard stops: 13. Senior review flagged by the AI: 52 (any Level 1 concern or low confidence).
- Most frequent issue codes: NO_ACTUARIAL_SUPPORT 100, ACCESSIBILITY_IMPACT 100, PROXY_FOR_PROTECTED_GROUND 74, PUBLIC_POLICY_CONFLICT 69, WEAK_RISK_LINK 67.
- Consistency audit before -> after: unexplained different-outcome pairs 1 (+8 inadequate on manual review) -> 0; missing pending flags 29 (22 assessments) -> 0; mixed-status code groups without explanation 9 -> 0; findings misapplied 2 -> 0. Assessments changed by audit: 29 (38 changes). Recommendations changed: 0.
- Spot check (15 rules): 12 agree, 1 partial (DR-071), 2 disagree (DR-085, DR-097). Sanity anchors: 13 of 13 match.
- Similarity sanity: DR-012 top-1 = AP-07 (0.896); DR-001 top-1 = AP-02 (0.988); DR-013 top-1 = NC-05 (0.557).
