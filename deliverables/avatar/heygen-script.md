# HeyGen avatar script: Simrule

First person, as Kevin in the role of a regulatory analyst presenting to a senior executive. **363 words, about 2:25 at 150 words per minute** (target 2:20 to 2:40, 330 to 370 words).

> Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional. The script refers to "Ontario's auto insurance regulator" generically and never implies endorsement.

## Facts used (all from the build; see `PROGRESS.md` > Numbers)

| Claim in the script | Source in the repo |
|---|---|
| 100 fictional rules from 10 insurers | `data/rules.json` |
| 15 criteria in 4 levels; 1,500 findings | `knowledge/framework.json`; PROGRESS Numbers |
| Rule declining on primary language is a Level 1 human rights hard stop | `data/assessments/DR-005.json` |
| Racing rule matches an approved precedent | DR-012 top match AP-07 (similarity 0.896) |
| Senior sign-off when the decision differs from the AI | `src/lib/workflow.ts` sign-off triggers |
| Consistency audit: 38 fixes across 29 assessments, no recommendation changed | `deliverables/report/consistency-audit.md`; PROGRESS Numbers |
| Weights tested on 13 anchor rules, not real decisions | prompt-log entry 7 |
| Legal citations not yet verified | `deliverables/VERIFY.md` |

## Sections with timings

### 1. Problem hook (0:00-0:21, 53 words)

Every decline rule an insurer files decides who can buy auto insurance, and who cannot. In Ontario, you need insurance to drive. So an unfair rule can take away something people rely on. Analysts at Ontario's auto insurance regulator review long, document heavy filings, and similar rules can end up with different answers.

### 2. Solution concept (0:21-0:39, 46 words)

I built Simrule, a review workbench where AI is a partner, not a decision maker. The AI reads each rule and records findings against fifteen criteria in four levels. Then fixed, published code turns those findings into an advisory recommendation. A person always makes the decision.

### 3. Prototype walkthrough (0:39-1:23, 110 words)

Here is the dashboard. One hundred fictional rules from ten insurers, sorted by risk. This rule declines anyone whose primary language is not English or French. Simrule flags it as a human rights hard stop, and highlights the exact words behind the flag. Every finding shows its reasoning, evidence and sources. This racing rule matches an approved precedent, and Simrule explains what is the same and what is different. If I disagree with a finding, I override it and give a reason. When my decision differs from the AI, a senior reviewer must sign off. I confirm that I own the rationale, and every step lands in the audit trail.

### 4. How the app, chatbot and diagram work together (1:23-1:38, 36 words)

Three pieces work together. The app runs the review. A chatbot answers questions from reviewers and insurers, using the same knowledge base. The architecture diagram shows where people stay in control, and what production would need.

### 5. Impact on efficiency and fairness (1:38-1:57, 48 words)

In this prototype, all one hundred rules have a full assessment, with fifteen hundred findings. A consistency audit made thirty eight fixes across twenty nine assessments, without changing a single recommendation. Reviewers start from structured evidence, not a blank page, and similar rules are checked side by side.

### 6. Limitations and why human oversight matters (1:57-2:14, 44 words)

There are limits. The legal citations still need checking against official sources. The scoring weights were tested on thirteen rules, not on real decisions. And AI can miss subtle discrimination. That is why every finding needs a human, and why the audit trail matters.

### 7. Close (2:14-2:25, 26 words)

Simrule does not replace judgment. It makes judgment faster, more consistent, and easier to explain. I would welcome your support to test it with real reviewers.

## Scene table

Screenshots are in `deliverables/demo/screenshots/`. Most are full-page captures; crop to the top 1440 x 900 area (or the area named) when you upload them as HeyGen backgrounds. Keep the avatar on one side so the screen stays readable.

| # | Time | Section | Background visual | Avatar layout |
|---|---|---|---|---|
| 1 | 0:00-0:21 | Problem hook | `01-dashboard.png`, blurred or dimmed | Avatar centre |
| 2 | 0:21-0:39 | Solution concept | `deliverables/architecture/simrule-architecture.png` | Avatar bottom right, small |
| 3 | 0:39-0:50 | Walkthrough: dashboard | `01-dashboard.png` (top area: stage counts and charts) | Avatar bottom right, small |
| 4 | 0:50-1:02 | Walkthrough: hard stop and evidence | `05-rule-review-hard-stop.png` (top area with the highlighted words) | Avatar bottom right, small |
| 5 | 1:02-1:10 | Walkthrough: similar rules | `06-rule-review-precedent.png` (market check and similar rules) | Avatar bottom right, small |
| 6 | 1:10-1:18 | Walkthrough: override and sign-off | `07-decision-panel-before-submit.png`, then `08-senior-sign-off.png` | Avatar bottom right, small |
| 7 | 1:18-1:23 | Walkthrough: audit trail | `09-decision-recorded-audit.png` (audit trail panel) | Avatar bottom right, small |
| 8 | 1:23-1:38 | App, chatbot and diagram together | `13-how-it-works.png` (architecture section) | Avatar left |
| 9 | 1:38-1:57 | Impact | `10-consistency.png` | Avatar left |
| 10 | 1:57-2:14 | Limitations and oversight | `13-how-it-works.png` (limitations section) | Avatar centre |
| 11 | 2:14-2:25 | Close | `01-dashboard.png` | Avatar centre |

## Paste-ready block

Paste everything inside the box into HeyGen's script field. No stage directions, no em dashes, numbers written as words, short sentences for natural pauses.

```
Every decline rule an insurer files decides who can buy auto insurance, and who cannot. In Ontario, you need insurance to drive. So an unfair rule can take away something people rely on. Analysts at Ontario's auto insurance regulator review long, document heavy filings, and similar rules can end up with different answers.

I built Simrule, a review workbench where AI is a partner, not a decision maker. The AI reads each rule and records findings against fifteen criteria in four levels. Then fixed, published code turns those findings into an advisory recommendation. A person always makes the decision.

Here is the dashboard. One hundred fictional rules from ten insurers, sorted by risk. This rule declines anyone whose primary language is not English or French. Simrule flags it as a human rights hard stop, and highlights the exact words behind the flag. Every finding shows its reasoning, evidence and sources. This racing rule matches an approved precedent, and Simrule explains what is the same and what is different. If I disagree with a finding, I override it and give a reason. When my decision differs from the AI, a senior reviewer must sign off. I confirm that I own the rationale, and every step lands in the audit trail.

Three pieces work together. The app runs the review. A chatbot answers questions from reviewers and insurers, using the same knowledge base. The architecture diagram shows where people stay in control, and what production would need.

In this prototype, all one hundred rules have a full assessment, with fifteen hundred findings. A consistency audit made thirty eight fixes across twenty nine assessments, without changing a single recommendation. Reviewers start from structured evidence, not a blank page, and similar rules are checked side by side.

There are limits. The legal citations still need checking against official sources. The scoring weights were tested on thirteen rules, not on real decisions. And AI can miss subtle discrimination. That is why every finding needs a human, and why the audit trail matters.

Simrule does not replace judgment. It makes judgment faster, more consistent, and easier to explain. I would welcome your support to test it with real reviewers.
```
