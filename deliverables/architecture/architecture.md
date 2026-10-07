# Simrule solution architecture

Files: `simrule-architecture.svg` (master, hand laid out), `simrule-architecture.png` (2x, for slides and the report), `simrule-architecture.pdf` (one US Letter landscape page). Regenerate all three with `npx tsx scripts/make-architecture.ts`; the script fails if any label overflows its box. The SVG is also served at `architecture.svg` and shown on the app's How it works page.

> Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.

## How to read it

Four swimlanes, top to bottom: **Insurer (applicant)**, **AI services**, **Human reviewers**, **Records and accountability**. Numbered circles follow one submission through the review. The flow runs left to right through the AI lane, then right to left through the human lane, so each human step sits under the AI output it acts on.

| Marker | Meaning |
|---|---|
| Gold dashed box | AI component (advisory). Each one shows what the prototype uses and what production would need. |
| White box, solid green border | Deterministic code. Same in the prototype and in production. |
| Green box | Human step |
| Purple box | Record |
| **H** | Human touchpoint: a person validates, overrides or approves |
| **A** | Accountability control |
| **KB** | Reads the versioned knowledge base |
| Solid arrow | Review flow |
| Dashed purple arrow | Records and feedback loops |

## The flow

| Step | Lane | What happens | Prototype | Production |
|---|---|---|---|---|
| 1 Submit rule | Insurer | The insurer files a decline rule with its rationale, definitions and any data. | PDF, DOCX, TXT or MD upload, paste or form | Filing portal integration |
| 2 Intake and parsing | AI services | Finds each rule and its labelled fields in the document. | pdf.js and mammoth in the browser | Document AI with OCR and table extraction |
| Confirm extraction (**H**) | Human reviewers | The reviewer checks and edits the extracted fields before anything else runs. | Intake screen, confirmation checkbox per rule | Same |
| 3 Scope and completeness | AI services | Decline rule or eligibility rule? Runs the 12-item prototype checklist. | Keyword rules | Rules plus a trained classifier |
| 4 Structured extraction | AI services | Trigger, threshold, lookback, defined and undefined terms. | Batch output for the 100 seeded rules; keyword triage for uploads | Server-side model with a fixed schema |
| 5 Criteria assessment L1-L4 (**KB**, **A**) | AI services | 15 findings, each with status, severity, issue codes, 2-4 sentences of reasoning, verbatim evidence and citation ids. | 100 precomputed assessments, prompt v2, schema and content validation | Server-side model with retrieval over a versioned regulatory corpus |
| 6 Precedent similarity (**KB**) | AI services | Top 5 similar rules and precedents, each explained as same, similar or materially different. | TF-IDF cosine plus structured feature overlap | Embeddings with a vector store |
| 7 Deterministic scoring (**A**) | AI services | Level 1 gate, weights 40/35/25, approve with conditions at 75 or more, decline below 50. The code, not the model, sets the advisory recommendation. | `src/lib/scoring.ts` | Same code |
| 8 Recommendation panel (**H**) | Human reviewers | "AI recommendation (advisory)" with evidence, similar rules, consumer lens and next steps. | Rule review screen | Same |
| 9 Validate or override (**H**, **A**) | Human reviewers | Accept or override all 15 findings; an override needs a reason code and a note. | Criteria scorecard | Same, with role-based access |
| 10 Senior sign-off (**H**, **A**) | Human reviewers | Required when the decision differs from the AI, a Level 1 finding is overridden, confidence is low or the case is escalated. | Role switcher for the demo | Real roles and authentication |
| 11 Decision and rationale (**H**, **A**) | Human reviewers | A person decides. The rationale is final only after "I have reviewed this rationale and take ownership of it". The insurer receives the reasons, conditions or an information request. | Decision panel; Markdown, JSON and print export | Notice generated into the filing system |
| 12 Audit trail (**A**) | Records | Every action with time, person, role, before and after, and reason. | Browser storage | Secure records store with retention rules |
| 13 Precedent registry | Records | Decided rules become precedents for step 6. | Precedent library screen | Governed registry |
| 14 Consistency monitoring (**A**) | Records | Similar rules with different outcomes; overrides by issue code as a bias and drift signal. Alerts go back to reviewers. | Consistency monitor screen | Scheduled monitoring and reporting |
| Versioned knowledge base (**KB**, **A**) | Records | Framework 1.0.0, 25 issue codes, citation registry with verified flags, 25 precedents. | JSON files in the repository | Governed corpus with change control |
| Regulatory assistant chatbot, planned (**KB**) | Insurer and reviewers | Would answer insurers and reviewers from the same knowledge base, explaining the framework without ever predicting or deciding an approval. | Not built | Retrieval over the versioned corpus |

## Design choices the diagram makes visible

- **Judgment and scoring are separate.** The AI produces findings (step 5). Fixed code turns them into a recommendation (step 7). That is why step 7 is drawn as deterministic code, not as an AI box.
- **Humans sit under every AI output.** The extraction is confirmed before triage, every finding is validated before a decision, and divergence triggers a second person.
- **One knowledge base, one vocabulary.** The assessment and similarity search read the same framework, issue codes, citations and precedents (as a production chatbot would), so the app, diagram and report use the same names.
- **Records close the loop.** Decisions become precedents, and the consistency monitor feeds alerts back to the recommendation panel.
- **Prototype versus production is explicit.** Each AI box says what this static prototype does and what a production system would need, so the gap is honest rather than hidden.
