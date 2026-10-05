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
