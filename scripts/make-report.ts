// Builds the written report: DOCX with the docx package and PDF with LibreOffice.
// Run: npx tsx scripts/make-report.ts
// Every number in the text comes from PROGRESS.md > Numbers or prompt-log.md.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const OUT = 'deliverables/report';
const FONT = 'Arial';
const PINE = '05473A';
const MUTED = '4A5752';

// ---------- Inline markup ----------
// A paragraph is a list of pieces: plain text, { b } bold, { i } italic, { link: [text, url] }.
type Piece = string | { b: string } | { i: string } | { link: [string, string] };

function runs(pieces: Piece[], size = 22) {
  return pieces.map((p) => {
    if (typeof p === 'string') return new TextRun({ text: p, font: FONT, size });
    if ('b' in p) return new TextRun({ text: p.b, bold: true, font: FONT, size });
    if ('i' in p) return new TextRun({ text: p.i, italics: true, font: FONT, size });
    return new ExternalHyperlink({ link: p.link[1], children: [new TextRun({ text: p.link[0], style: 'Hyperlink', font: FONT, size })] });
  });
}

const para = (pieces: Piece[], o: { after?: number; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ children: runs(pieces, o.size), spacing: { after: o.after ?? 100, line: 252 }, alignment: o.align });
const bullet = (pieces: Piece[]) => new Paragraph({ children: runs(pieces), bullet: { level: 0 }, spacing: { after: 50, line: 252 } });
const h1 = (t: string, pageBreakBefore = false) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore, children: [new TextRun({ text: t, font: FONT })], spacing: { before: 160, after: 80 } });
const h2 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })], spacing: { before: 100, after: 50 } });

function table(header: string[], rows: string[][], widths: number[]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9D3C4' };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const cell = (t: string, head = false, w = 0) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: head ? { type: ShadingType.CLEAR, fill: 'E7F2ED', color: 'auto' } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: head, font: FONT, size: 19 })], spacing: { after: 0, line: 240 } })],
    });
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    borders,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, true, widths[i])) }), ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, false, widths[i])) }))],
  });
}

// ---------- Content ----------
const LIVE = 'https://jevwithwind.github.io/simrule/';
const REPO = 'https://github.com/jevwithwind/simrule';
const DISCLAIMER =
  'Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.';

const header = [
  new Paragraph({ children: [new TextRun({ text: 'Simrule: AI-Assisted Review of Auto Insurance Underwriting Decline Rules', bold: true, font: FONT, size: 32, color: PINE })], spacing: { after: 60 } }),
  para(['Kazumi Li  |  AI Prototyping for Business Innovation (Ivey Online, delivered on Uplimit), Weeks 4-5 Innovation Challenge  |  October 15, 2026'], { size: 19, after: 30 }),
  para([{ b: 'Live app: ' }, { link: [LIVE, LIVE] }, '   ', { b: 'Code: ' }, { link: [REPO, REPO] }], { size: 19, after: 30 }),
  new Paragraph({
    children: [new TextRun({ text: DISCLAIMER, italics: true, font: FONT, size: 17, color: MUTED })],
    spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PINE, space: 4 } },
  }),
];

// Page 1: Executive Summary (about half a page), then a page break before each later section.
const executive = [
  h1('1. Executive Summary'),
  para([
    "Under Ontario's Take All Comers rule, an auto insurer may decline a consumer only on grounds the regulator has approved. Each proposed decline rule therefore controls access to insurance that drivers are legally required to hold. Review is document-heavy and judgment-heavy, and similar rules from different insurers can receive different outcomes.",
  ]),
  para([
    { b: 'Simrule' },
    ' is a working prototype of an AI-assisted review workbench, deployed as a static web app. It covers the path from submission to decision: document upload with reviewer-confirmed extraction; a compliance dashboard over 100 fictional submissions; a flagging system that assesses each rule against 15 criteria in the framework’s four Levels, with issue codes, verbatim evidence and citations; a recommendation panel with similar rules, consumer impact and next steps; and a decision workflow with per-finding validation, override reasons, senior sign-off and an audit trail.',
  ]),
  para([
    'The central design decision is that the language model never sets the recommendation. It produces structured findings; a deterministic scoring function converts them into an advisory recommendation; a reviewer makes and owns the decision. Across the 100 test rules this gives 21 approve with conditions, 22 request more information and 57 recommend decline, each with reasoning on every criterion and explained precedents.',
  ]),
  para([
    'The expected impact is a faster first pass that starts from structured evidence, one standard applied across insurers, and a complete record of who decided what and why. The prototype does not replace legal or policy judgment, and its legal citations are not yet verified.',
  ]),
];

const methodology = [
  h1('2. Methodology', true),
  para(['I used Claude Code as the build environment instead of Bolt, Lovable or Replit, because the project needed a data pipeline, automated tests and version control alongside the interface. The optional chatbot and avatar video were not built.'], { after: 80 }),
  table(
    ['Component', 'Approach', 'Rationale'],
    [
      ['Web app', 'React, TypeScript and Vite; static build on GitHub Pages', 'No backend; state stays in the browser.'],
      ['100 assessments', 'Claude as a batch analyst under a versioned prompt; schema and content validation', 'Every rule gets a complete assessment that can be checked.'],
      ['Recommendation', 'Deterministic scoring function over the findings', 'Identical findings give identical results.'],
      ['Similar rules', 'TF-IDF cosine blended with structured feature overlap', 'Transparent and runs client-side; embeddings in production.'],
      ['Architecture', 'Hand-laid SVG exported to PNG and PDF', 'One page showing human controls and the production path.'],
    ],
    [1800, 3900, 3660],
  ),
  h2('Approaches that worked'),
  bullet([{ b: 'Schema-first prompting. ' }, 'A schema plus content rules (all 15 criteria, 2 to 4 sentences of reasoning, at least one question for the insurer and two next steps). The validator, not inspection, decided when the prompt was ready.']),
  bullet([{ b: 'A fixed issue-code taxonomy. ' }, '25 codes (21 from the brief, 4 added) shared by the dashboard, consistency monitor and decision records.']),
  bullet([{ b: 'Judgment separated from scoring. ' }, 'Level 1 is a gate; Levels 2 to 4 are weighted 40, 35 and 25; thresholds are 75 and 50. All 15 weight and threshold variants tested matched the 13 anchor rules, so the starting values were frozen.']),
  bullet([{ b: 'Evidence and citation controls. ' }, 'All 940 evidence quotes are checked as exact substrings. Citations come only from a registry with a verified flag; official legal sites were unreachable from the build environment, so the 21 legal references stay at instrument level.']),
  h2('Iteration'),
  para([
    'Prompt v1, piloted on 10 rules, passed validation once: the recommendations were already right, but reasoning collapsed to one-word findings and evidence was missing. I mapped 13 defects to 13 new rules (v2); the re-run passed 10 of 10 with no recommendation changing. In the full run, 9 of the remaining 90 failed first-pass validation, all for single-sentence reasoning. Similarity needed a second version: coarse trigger categories produced ties and false matches until I split them into 36 trigger types. A consistency audit then found 29 missing pending-submission flags, 9 explanations that did not say why similar rules diverged, and 2 misapplied findings; 38 edits across 29 assessments cleared them with no recommendation change. A 15-rule spot check agreed on 12, partly on 1 and disagreed on 2, which I left as override candidates rather than tuning findings. Finally, 134 unit tests, 6 end-to-end tests and an axe accessibility scan caught 4 defects that type-checking missed, including PDF upload failing in Chromium.',
  ]),
];

const limitations = [
  h1('3. Limitations and Risks', true),
  h2('Gaps between prototype and production'),
  bullet([{ b: 'Inference. ' }, 'The 100 assessments are precomputed and frozen. New uploads get keyword triage only, unless a user supplies their own API key for the optional live assessment. Production needs server-side inference with retrieval over a versioned regulatory corpus, with cost and latency monitoring.']),
  bullet([{ b: 'Security and records. ' }, 'There is no authentication, roles are a demo switch, and data lives in browser storage. Confidential filings need access control, encryption and a retention policy.']),
  bullet([{ b: 'Integration and validation. ' }, "There is no link to the regulator's filing systems, and the scoring weights were checked only against 13 anchor rules, not back-tested on historical decisions."]),
  bullet([{ b: 'Coverage. ' }, 'English only, no accessibility testing with real reviewers, and no ongoing monitoring of model quality.']),
  h2('Risks before deployment'),
  bullet([{ b: 'Citation errors. ' }, 'Models can invent or misstate references. Citations are restricted to ids in a registry with a verified flag; the 21 legal references still need checking (VERIFY.md).']),
  bullet([{ b: 'Automation bias. ' }, 'Reviewers may accept findings without reading them. A decision is blocked until all 15 findings are validated, and the dashboard reports the acceptance rate and treats very high agreement as a warning.']),
  bullet([{ b: 'Missed proxy discrimination. ' }, 'Language, postal code or benefit status can track protected grounds. Keyword triage catches explicit wording only; disparate-impact testing and reviewer judgment are still required.']),
  bullet([{ b: 'Gaming. ' }, 'Insurers could draft rules around the issue codes while keeping the same effect. Reviewers must judge substance, and the taxonomy needs maintenance.']),
  bullet([{ b: 'Correlated errors in evaluation. ' }, 'The same AI drafted the assessments and ran the consistency audit, so its mistakes can be correlated. The 15-rule spot check is small and was done by the builder, not an independent reviewer.']),
  bullet([{ b: 'Shallow text matching. ' }, 'TF-IDF similarity misses rules that mean the same thing in different words, and keyword triage can misfire: in testing, "race" in "organized race" was flagged as a protected ground until the pattern was fixed.']),
  bullet([{ b: 'Drift. ' }, 'Models, guidance and markets change. Each assessment records its prompt and framework versions so it can be re-run, and the consistency monitor tracks overrides by issue code.']),
  bullet([{ b: 'Privacy. ' }, 'Filings may contain personal information. The optional live assessment sends text to an external API and must stay off for confidential material.']),
  h2('Human oversight'),
  para([
    'Every step that can change an outcome needs a person. The reviewer confirms each extraction, then accepts or overrides all 15 findings, with a reason code and note for each override. Senior sign-off is required when the decision differs from the AI, a Level 1 finding is overridden, confidence is low, a Level 1 concern is raised or the case is escalated. The rationale is final only after the reviewer confirms "I have reviewed this rationale and take ownership of it". Every action is logged with time, actor, role, before and after values, and reason.',
  ]),
];

const reflection = [
  h1('4. Personal Reflection', true),
  para([
    'My background is quantitative finance: I model limit order book data and judge models by out-of-sample error. ',
    'Building Simrule changed what I think AI is for in a regulated industry: its main value is not deciding faster, but making each judgment explicit enough for a person to check. ',
    'The pilot showed this. The first prompt already reached the right recommendations on all 10 pilot rules, yet 9 of the 10 assessments failed validation because the reasoning and evidence were too thin to show a reviewer. ',
    'For a regulator, a correct answer that cannot be explained has no value, so I now see transparency as the product rather than an add-on feature. ',
    'Separating findings from a deterministic scoring rule is what made the system auditable: the same findings always give the same recommendation, and a reviewer can point to the exact finding they dispute.',
  ]),
  para([
    'I am a CEMS MIM student, currently on exchange in London. The project used the same toolkit a quant team relies on: a specified schema, a validation harness, thresholds calibrated against anchor cases, and an audit of outputs for consistency. ',
    'I want to work in quantitative or AI roles in Japan, where I expect model governance to be at least as demanding as in this project. ',
    'I plan to carry three habits from Simrule into that work: write the schema cautiously before the prompt, keep model judgment separate from the rule that acts on it, and test a model’s explanations as rigorously as its accuracy. ',
    'In trading research I would apply the same split, letting a model propose signals with evidence while transparent, versioned code decides how they are used, so a risk committee can audit both. ',
    'I also want to design the audit trail first rather than last, because its accuracy and integrity matter most: it is the feature that makes everything else trustworthy.',
  ]),
  para([
    'What surprised me most was how often the checks I trusted were too weak to keep the AI in line. ',
    'An automated consistency check passed 15 of 16 similar pairs with different outcomes, yet reading them showed that 8 explanations described the similarity without saying why the outcomes differed. The end-to-end test, not the unit tests, found that PDF upload failed in Chromium because a library called a JavaScript method the browser does not yet support. ',
    'I was also surprised that the hardest problems were not technical: deciding how severe a missing actuarial study should be, or when a postal code becomes a proxy, needed judgment I could only write down after seeing many cases. ',
    'The actuarial-severity rule had to be clarified at batch 7 because, read literally, it would have sent every new administrative rule to an information request. The consistency audit ended with 38 edits across 29 assessments and no change to any recommendation: the problems were in the explanations, not the scores. ',
    'The lesson I take away is that trust in AI is earned by making disagreement easy: a reviewer must read the output line by line, or at least block by block, see the evidence, override it with a reason, and know that someone else will check.',
  ]),
];

const png = readFileSync('deliverables/architecture/simrule-architecture.png');
const appendix = [
  h1('Appendix: Architecture and AI-Use Disclosure', true),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({ type: 'png', data: png, transformation: { width: 624, height: 482 }, altText: { title: 'Simrule architecture', description: 'Swimlane architecture diagram of Simrule', name: 'architecture' } })],
    spacing: { after: 60 },
  }),
  para(
    [
      { b: 'Figure 1. ' },
      'Solution architecture. Numbered steps follow one submission through four swimlanes; H marks human touchpoints and A marks accountability controls. Full size: deliverables/architecture/simrule-architecture.pdf and the How it works page of the live app.',
    ],
    { size: 19, after: 160 },
  ),
  h2('AI-use disclosure'),
  para([
    'Claude Code (Anthropic) was the engineering and analysis partner. Working from my written brief, it wrote the application code and tests, generated the 100 structured assessments under a versioned prompt (recommendations come from the deterministic scoring code, not the model), produced the architecture diagram and screen-recording script, and drafted this report from the project logs (PROGRESS.md and prompt-log.md). All figures come from those logs. Legal references were not verified against official sources; they are listed in VERIFY.md. ',
    'I reviewed the outputs, made the final design decisions, and rewrote the personal reflection in my own words.',
  ]),
];

// ---------- Document ----------
const doc = new Document({
  creator: 'Kazumi Li',
  title: 'Simrule: AI-Assisted Review of Auto Insurance Underwriting Decline Rules',
  description: 'Written report for AI Prototyping for Business Innovation (Ivey Online)',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 27, bold: true, color: PINE }, paragraph: { spacing: { before: 160, after: 80 }, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 23, bold: true, color: '136B58' }, paragraph: { spacing: { before: 100, after: 50 }, keepNext: true } },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1417, bottom: 1417, left: 1417, right: 1417, footer: 600 }, // 2.5 cm
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Simrule report  |  academic prototype, fictional data  |  page ', font: FONT, size: 16, color: MUTED }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
                new TextRun({ text: ' of ', font: FONT, size: 16, color: MUTED }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children: [...header, ...executive, ...methodology, ...limitations, ...reflection, ...appendix],
    },
  ],
});

const docxPath = `${OUT}/Simrule-report.docx`;
writeFileSync(docxPath, await Packer.toBuffer(doc));
execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', OUT, docxPath], { stdio: 'ignore', timeout: 180_000 });
const pdfPath = `${OUT}/Simrule-report.pdf`;
if (!existsSync(pdfPath)) throw new Error('PDF conversion failed');

// Page checks: Executive Summary on page 1, then one page each for Methodology, Limitations and Risks,
// Personal Reflection and the appendix. A section that spills over pushes the next heading down a page.
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdfPath]).toString())![1]);
const expected: [string, number][] = [
  ['1. Executive Summary', 1],
  ['2. Methodology', 2],
  ['3. Limitations and Risks', 3],
  ['4. Personal Reflection', 4],
  ['Appendix: Architecture', 5],
];
const startPage = new Map<string, number>();
for (let i = 1; i <= pages; i++) {
  const t = execFileSync('pdftotext', ['-f', String(i), '-l', String(i), pdfPath, '-']).toString();
  for (const [h] of expected) if (t.includes(h) && !startPage.has(h)) startPage.set(h, i);
}
const words = execFileSync('pdftotext', [pdfPath, '-']).toString().split(/\s+/).filter(Boolean).length;
console.log(JSON.stringify({ pages, words, sections: Object.fromEntries(startPage) }));
const misplaced = expected.filter(([h, p]) => startPage.get(h) !== p);
if (misplaced.length) {
  console.error('Section page layout broken:', misplaced.map(([h, p]) => `${h} expected on page ${p}, found on ${startPage.get(h)}`).join('; '));
  process.exit(1);
}
if (pages > 5) {
  console.error('Report exceeds 5 pages');
  process.exit(1);
}
