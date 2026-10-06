# Screen recording script (backup submission, about 4 to 5 minutes)

A click path that follows the in-app **Guided demo** (dashboard, a hard stop, a precedent match, override with senior sign-off, consistency monitor), with intake added at the start. Narration is short and can be read live or recorded over the video.

> Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.

## Before you record (2 minutes)

1. Open https://jevwithwind.github.io/simrule/ in a **private window**, 1440 x 900 or larger, browser zoom 100%.
2. Click **⋯ (More actions) → Reset demo data** and confirm, so the queue is in its seeded state.
3. Have `deliverables/demo/sample-submissions/pinegate-language-postal-rule.docx` ready to upload.
4. Start the recording on the dashboard. Move the mouse slowly; pause one second after each click.

## Click path

| # | Time | Screen and clicks | Say |
|---|---|---|---|
| 1 | 0:00-0:30 | **Dashboard.** Point to the footer disclaimer, the stage counts, the Level 1 hard stops tile and the two charts. Click **Table** on one chart, then **Chart** again. Scroll to the queue (sorted by risk). | "This is Simrule, a review workbench for auto insurance decline rules. The queue holds one hundred fictional rules from ten insurers. Every rule already has an AI pre-assessment, labelled advisory. People make every decision." |
| 2 | 0:30-1:05 | Click **Submit or upload a rule**. On **Upload a file**, choose the Pinegate DOCX. Show the extracted fields, tick the confirmation box, click **Run triage and add 1 to the queue**. Point to the PROXY_FOR_PROTECTED_GROUND flag and the "low confidence" label. | "An insurer filing can be uploaded as a PDF, Word file or text. Simrule extracts each rule, but nothing runs until I confirm the extraction. Keyword triage flags this rule as a likely proxy for a protected ground. It is labelled low confidence, because it is only a pointer." |
| 3 | 1:05-1:15 | Click **Guided demo** in the header. Read step 1, click **Next**. | "The guided demo walks through the key cases." |
| 4 | 1:15-1:55 | **DR-005** (primary language). Point to the red hard stop banner and the score breakdown. In Level 1, on the Human Rights Code finding, click the quoted evidence to highlight the words in the rule. Point to "section not verified" on a citation and to the Consumer lens. Click **Next**. | "This rule declines anyone whose primary language is not English or French. The AI found a Level 1 human rights problem, so the scoring code recommends decline as a hard stop. Every finding quotes the exact words it relies on. Citations that could not be checked against the official text are marked. The consumer lens shows who would be refused." |
| 5 | 1:55-2:30 | **DR-012** (racetrack). Point to the market check (approved precedent AP-07) and the **Similar rules** panel with its same, similar or materially different explanations. Click **Next**. | "This racing rule matches an approved precedent. Simrule explains what is the same and what differs. A match is a consideration, not a guarantee, so the other levels are still checked." |
| 6 | 2:30-3:40 | **DR-071** (stunt driving). On **Actuarial support** click **Override**: status Insufficient information, severity Low, reason "Weighs the evidence differently", note "Data can be a filing condition." Click **Save override** and point to the score and recommendation changing. Click **Accept remaining** on each Level. In the Decision workflow choose **Approve with conditions**; point to the senior sign-off warning. Click **Draft from validated findings**, tick **I have reviewed this rationale and take ownership of it**, click **Send for senior sign-off**. | "The AI asked for more information here. I disagree on one finding, so I override it with a reason code and a note. The score recomputes, and my change is marked as human. I accept the other findings, choose approve with conditions, and draft the rationale. Because my decision differs from the AI, it needs senior sign-off. It is not final until I confirm I own the rationale." |
| 7 | 3:40-4:05 | In the header switch **Role** to **Senior reviewer**. Type a sign-off note, click **Sign off and record decision**. Scroll to the **Audit trail**. Click **Markdown** to export the decision record. | "As the senior reviewer, I sign off. The audit trail shows every action: who, when, their role, what changed and why. The decision record can be exported." |
| 8 | 4:05-4:30 | Click **Next** in the tour to open the **Consistency monitor**. Point to similar rules with different outcomes and to the divergence by issue code (the override just made appears). Click **Finish**. | "The consistency monitor flags similar rules with different outcomes and shows which findings reviewers override most. That is how we catch drift and possible bias." |
| 9 | 4:30-4:55 | Open **How it works**. Scroll past the four principles, the judgment and scoring split, and the architecture diagram, to Limitations. | "How it works publishes the levels, weights, thresholds and issue codes, the architecture, and the limits. The AI advises. People decide, and every step is recorded." |

## After recording

- Trim dead time; keep the total between 3 and 5 minutes.
- Check the disclaimer footer is visible in at least the first and last scenes.
- Reset the demo data afterwards if others will use the same browser.
