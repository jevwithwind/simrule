# Simrule

**AI-assisted regulatory review of auto insurance underwriting decline rules. Advisory only: humans decide.**

Live prototype: https://jevwithwind.github.io/simrule/

> Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.

Built for *AI Prototyping for Business Innovation* (Ivey Online, delivered on Uplimit), Weeks 4 to 5 Innovation Challenge.

## What Simrule does

A regulator's analyst receives proposed decline rules from auto insurers and has to decide whether each one may be used. Simrule gives that analyst a review workbench:

- **Document upload.** Drop in a PDF, DOCX, TXT or Markdown filing, or paste or type it. Simrule extracts each rule; the reviewer checks and confirms the extraction before anything else runs.
- **Compliance dashboard.** A queue of 100 fictional submissions from 10 fictional insurers, with the AI recommendation, score, hard stops, consumer impact and age, plus charts of outcomes and issue codes.
- **Flagging.** Every rule is assessed against 15 criteria in 4 levels (basic compliance, fair consumer outcomes, risk and objectivity, public policy). Each finding carries a status, severity, issue codes, 2 to 4 sentences of reasoning, verbatim evidence and citations.
- **Recommendation panel.** Approve with conditions, request more information, or recommend decline. Deterministic scoring code computes the recommendation from the findings; the language model never writes it.
- **Similar rules.** For every rule, the closest precedents and pending submissions, with an explanation of why each is the same, similar or materially different.
- **Decision workflow.** The analyst accepts or overrides every finding (an override needs a reason code and a note), chooses a decision, drafts a rationale and confirms ownership of it. Divergence from the AI, a Level 1 override, low confidence or an escalation sends the case to a senior reviewer. Every action lands in an audit trail that can be exported.

## The four principles and where you can see them

| Principle | Where it appears in the product |
|---|---|
| **Human-in-the-loop**: AI augments, never replaces. | Reviewer confirms every extraction at intake. Accept or Override on all 15 criteria, with a mandatory reason. A decision cannot be recorded until every finding is validated and the reviewer ticks "I have reviewed this rationale and take ownership of it". Senior sign-off when the decision differs from the AI, a Level 1 finding is overridden, or confidence is low. A role switcher shows who can do what. |
| **Transparency**: show why, not just what. | Every AI output is labelled "AI recommendation (advisory)". Score breakdown by level with the formula visible. Evidence quotes are highlighted in the rule text. Citation badges say "verified" or "section not verified". Prompt and framework versions are shown. The How it works page publishes the weights and thresholds. |
| **Consistency**: similar applications are treated similarly. | One framework and one issue-code list for all 100 rules. Deterministic scoring. A similar-rules panel on every rule, "Review together" for pending look-alikes, and a consistency monitor that flags similar rules with different outcomes and tracks which findings reviewers override most. |
| **Consumer protection**: keep the consumer visible. | A consumer lens on every rule (who could be refused, likely consequence, vulnerable groups). Level 2 fair-outcome criteria and the Level 4 public policy filter. A standard condition that declined consumers are told the reason and how to correct errors. Consumer impact is a queue column and a sort key. |

## Try it in five minutes

1. Open the live link and press **Guided demo** in the header. It walks through the queue, a Level 1 hard stop (DR-005), a rule with a close approved precedent (DR-012), a human override (DR-071) and the consistency monitor.
2. Go to **Intake** and upload one of the sample filings in [`deliverables/demo/sample-submissions/`](deliverables/demo/sample-submissions/).
3. Open **DR-071**, override the actuarial finding, approve, and watch the senior sign-off trigger. Switch the role to *Senior reviewer* to sign it off.
4. Use the **⋯ (More actions)** menu, then **Reset demo data**, to start again. Your work is saved only in your own browser.

## Run it locally

Requires Node.js 20.19 or later (22 recommended).

```bash
npm install
npm run dev          # development server
npm test             # 134 unit tests (vitest)
npm run build        # type-check and build the static site into /docs
npm run e2e          # Playwright end-to-end and axe accessibility checks (uses the built site)
```

Data pipeline scripts (already run; outputs are committed): `npm run parse-rules`, `npm run similarity`, `npm run expand`, `npm run validate`, `npm run score`, `npm run audit`.

## How it is built

- **Static site, no backend.** React 19, TypeScript, Vite, Tailwind CSS. Built into `/docs` and served by GitHub Pages from the `main` branch `/docs` folder. No GitHub Actions.
- **Knowledge layer.** `knowledge/framework.json` (levels, criteria, issue codes, scoring, workflow vocabulary), `knowledge/precedents.json` (illustrative precedents) and `knowledge/citations.json` (every reference, with a verified flag).
- **Assessments.** `data/assessments/DR-001.json` to `DR-100.json`, written with a versioned prompt (`prompts/assessment-prompt.md`), validated against a schema and content rules, then audited for consistency. See `deliverables/process/prompt-log.md`.
- **Scoring.** `src/lib/scoring.ts`. Level 1 is a gate (any fail is a hard stop). Levels 2 to 4 are weighted 40, 35 and 25. Approve with conditions at 75 or above; request more information at 50 to 74 or when a material information gap exists; recommend decline below 50 or on any high-severity fail.
- **Similarity.** `src/lib/similarity.ts`. TF-IDF cosine on the rule wording blended with structured feature overlap (categories, trigger types, thresholds, lookbacks).

## Companion deliverables

| Deliverable | Files |
|---|---|
| Written report | `deliverables/report/Simrule-report.docx` and `.pdf`; regenerate with `npm run report` (needs LibreOffice) |
| Architecture diagram | `deliverables/architecture/` (SVG, PNG, PDF, `architecture.md`); regenerate with `npm run architecture` |
| Demo assets | `deliverables/demo/` (screen-recording script, sample filings, screenshots, accessibility report) |
| Process records | `deliverables/process/` (prompt and iteration log, consistency audit, spot check, items to verify) and `PROGRESS.md` |

The optional chatbot and avatar video were not built. The architecture diagram shows the chatbot as a planned production component.

## Honest limitations

- Legal citations could not be checked against the official sources from the build environment, so every legal reference is marked "section not verified". See [`deliverables/process/VERIFY.md`](deliverables/process/VERIFY.md).
- The 100 assessments were generated once and frozen; new uploads get keyword triage (low confidence) and similarity search only, and wait for a full assessment.
- **Optional live assessment (stretch).** On an uploaded rule, a visitor can tick "run it now with your own Anthropic API key". It is off by default. The key is held in that page's memory only (never in browser storage, the store or the audit trail) and is sent directly from the browser to Anthropic's API. The response must match a strict output schema whose enums only allow known criteria, issue codes, citations and precedents; quotes that are not word for word are dropped; Simrule's scoring code, not the model, computes the recommendation; and the rule then goes to Analyst review like any other. Tested end to end against a mocked API.
- The scoring weights were checked against 13 anchor rules but not against real regulatory decisions.
- Data is stored only in the visitor's browser. There are no accounts, and roles are a demonstration switch, not access control.

## Repository map

```
source/          original brief materials (rules, framework deck)
knowledge/       framework, precedents, citations
data/            parsed rules, assessments, scores, similarity, audit results
prompts/         assessment prompt (versioned)
scripts/         parsing, similarity, expansion, validation, scoring, audit, samples
src/             web app
tests/, e2e/     unit, end-to-end and accessibility tests
docs/            built site (GitHub Pages)
deliverables/    report, architecture diagram, demo assets, process records
```
