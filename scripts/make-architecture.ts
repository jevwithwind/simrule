/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// Builds the one-page architecture diagram: SVG (hand laid out, explicit coordinates), PNG (resvg) and PDF
// (Chromium, US Letter landscape). Also copies the SVG to public/ so the How it works page can embed it.
// Run: npx tsx scripts/make-architecture.ts
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { chromium } from '@playwright/test';

const OUT = 'deliverables/architecture';
mkdirSync(OUT, { recursive: true });

// Page: 11 x 8.5 in at 150 units per inch. 17 units = 8.2 pt when printed full page (minimum used).
const W = 1650;
const H = 1275;
const FONT = 'Arial, Liberation Sans, Helvetica, sans-serif';
const C = {
  ink: '#1d2a26',
  muted: '#4a5752',
  pine: '#05473a',
  pine700: '#136b58',
  pineBg: '#e7f2ed',
  gold: '#b08a14',
  goldBg: '#fbf4dc',
  purple: '#5b4a8b',
  purpleBg: '#efecf6',
  grey: '#6b7280',
  greyBg: '#f2f1ed',
  lane: ['#faf8f3', '#ffffff'],
};

// Grid: 6 content columns.
const X0 = 205;
const COLW = 212;
const GAP = 23.6;
const col = (i: number) => X0 + i * (COLW + GAP);
const span = (i: number, n: number) => n * COLW + (n - 1) * GAP;

const LANES = [
  { name: ['Insurer', '(applicant)'], y: 120, h: 170 },
  { name: ['AI services'], y: 290, h: 305 },
  { name: ['Human', 'reviewers'], y: 595, h: 255 },
  { name: ['Records and', 'accountability'], y: 850, h: 225 },
];

type Kind = 'insurer' | 'ai' | 'code' | 'human' | 'record';
const STYLE: Record<Kind, { fill: string; stroke: string; dash?: string }> = {
  insurer: { fill: C.greyBg, stroke: C.grey },
  ai: { fill: C.goldBg, stroke: C.gold, dash: '7 5' },
  code: { fill: '#ffffff', stroke: C.pine },
  human: { fill: C.pineBg, stroke: C.pine700 },
  record: { fill: C.purpleBg, stroke: C.purple },
};

interface Box {
  id: string;
  n?: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string[];
  body?: string[];
  proto?: string[];
  prod?: string[];
  badges?: ('H' | 'A' | 'KB')[];
  /** Put Prototype and Production in a second column (wide boxes). */
  split?: boolean;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const parts: string[] = [];
const add = (s: string) => parts.push(s);

function text(x: number, y: number, s: string, o: { size?: number; weight?: number; fill?: string; anchor?: string; italic?: boolean } = {}) {
  add(
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size ?? 17}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? C.ink}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`,
  );
}

function badge(x: number, y: number, b: 'H' | 'A' | 'KB') {
  if (b === 'H') {
    add(`<circle cx="${x}" cy="${y}" r="13" fill="${C.goldBg}" stroke="${C.gold}" stroke-width="2.5"/>`);
    text(x, y + 6, 'H', { size: 17, weight: 700, fill: '#5c4700', anchor: 'middle' });
  } else if (b === 'A') {
    add(`<rect x="${x - 13}" y="${y - 13}" width="26" height="26" rx="5" fill="${C.purple}"/>`);
    text(x, y + 6, 'A', { size: 17, weight: 700, fill: '#ffffff', anchor: 'middle' });
  } else {
    add(`<rect x="${x - 19}" y="${y - 12}" width="38" height="24" rx="12" fill="#ffffff" stroke="${C.pine700}" stroke-width="2"/>`);
    text(x, y + 6, 'KB', { size: 15, weight: 700, fill: C.pine700, anchor: 'middle' });
  }
}

function box(b: Box) {
  const s = STYLE[b.kind];
  add(`<g data-box="${b.id}">`);
  add(`<rect data-frame="1" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2.5"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  const pad = 13;
  let y = b.y + 28;
  const tx = b.x + pad + (b.n ? 22 : 0);
  b.title.forEach((t, i) => {
    text(i === 0 ? tx : b.x + pad, y, t, { size: 19, weight: 700 });
    y += 23;
  });
  y += 2;
  for (const line of b.body ?? []) {
    text(b.x + pad, y, line, { size: 17, fill: C.ink });
    y += 21;
  }
  let px = b.x + pad;
  if (b.split) {
    px = b.x + b.w * 0.55;
    y = b.y + 28 + 23 * b.title.length + 2;
  }
  if (b.proto) {
    y += b.split ? 0 : 4;
    text(px, y, 'Prototype:', { size: 17, weight: 700, fill: C.muted });
    y += 21;
    for (const line of b.proto) {
      text(px, y, line, { size: 17, fill: C.muted });
      y += 21;
    }
  }
  if (b.prod) {
    y += 2;
    text(px, y, 'Production:', { size: 17, weight: 700, fill: C.pine });
    y += 21;
    for (const line of b.prod) {
      text(px, y, line, { size: 17, fill: C.pine });
      y += 21;
    }
  }
  add('</g>');
  if (b.n) {
    add(`<circle cx="${b.x + 2}" cy="${b.y + 2}" r="17" fill="${C.pine}" stroke="#ffffff" stroke-width="3"/>`);
    text(b.x + 2, b.y + 8, b.n, { size: 17, weight: 700, fill: '#ffffff', anchor: 'middle' });
  }
  (b.badges ?? []).forEach((bd, i) => {
    const widths = (b.badges ?? []).slice(i + 1).reduce((s2, x) => s2 + (x === 'KB' ? 44 : 32), 0);
    badge(b.x + b.w - 20 - widths - (bd === 'KB' ? 6 : 0), b.y + 2, bd);
  });
}

function arrow(d: string, o: { dashed?: boolean; color?: string; width?: number } = {}) {
  const color = o.color ?? C.pine;
  const marker = color === C.purple ? 'url(#headPurple)' : 'url(#head)';
  add(`<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${(o.width ?? 2.5) + 5}" stroke-linejoin="round"/>`);
  add(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${o.width ?? 2.5}" stroke-linejoin="round"${o.dashed ? ' stroke-dasharray="8 6"' : ''} marker-end="${marker}"/>`);
}

// ---------- Page frame ----------
add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">`);
add('<title id="t">Simrule solution architecture</title>');
add(
  '<desc id="d">Swimlane diagram. An insurer submits a decline rule. AI services parse it, check scope and completeness, extract fields, assess 15 criteria with retrieval over a versioned knowledge base, find similar precedents, and deterministic code computes an advisory recommendation. Human reviewers confirm the extraction, validate or override each finding, obtain senior sign-off when required, and own the decision and rationale. Every action goes to an audit trail; decisions become precedents that feed similarity search and consistency monitoring. A chatbot answers insurers and reviewers from the same knowledge base.</desc>',
);
add(
  `<defs><marker id="head" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.pine}"/></marker><marker id="headPurple" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.purple}"/></marker></defs>`,
);
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

text(40, 56, 'Simrule: AI-assisted review of auto insurance decline rules', { size: 34, weight: 700, fill: C.pine });
text(40, 92, 'Solution architecture. The AI advises; people decide; every step is recorded. Numbers follow the review flow.', { size: 19, fill: C.muted });

// ---------- Lanes ----------
LANES.forEach((l, i) => {
  add(`<rect x="40" y="${l.y}" width="1585" height="${l.h}" fill="${C.lane[i % 2]}" stroke="#d9d3c4" stroke-width="1.5"/>`);
  add(`<rect x="40" y="${l.y}" width="150" height="${l.h}" fill="${C.pine}"/>`);
  l.name.forEach((n, j) => text(115, l.y + l.h / 2 - (l.name.length - 1) * 12 + j * 24 + 6, n, { size: 20, weight: 700, fill: '#ffffff', anchor: 'middle' }));
});

// ---------- Boxes ----------
const ins = { y: 138, h: 134 };
const ai = { y: 308, h: 266 };
const hum = { y: 615, h: 213 };
const rec = { y: 870, h: 188 };

const boxes: Box[] = [
  { id: 'submit', n: '1', kind: 'insurer', x: col(0), y: ins.y, w: COLW, h: ins.h, title: ['Submit rule'], body: ['Rule wording,', 'rationale, terms, data', '(PDF, DOCX or text)'] },
  { id: 'notice', kind: 'insurer', x: col(1), y: ins.y, w: COLW, h: ins.h, title: ['Receive decision'], body: ['From step 11:', 'reasons, conditions', 'or a request for', 'more information'] },
  {
    id: 'chatbot',
    kind: 'ai',
    x: col(3),
    y: ins.y,
    w: span(3, 3),
    h: ins.h,
    title: ['Regulatory assistant chatbot (planned)'],
    body: ['Would answer insurers and reviewers', 'from the same knowledge base;', 'explains the framework, never', 'predicts or decides an approval.'],
    proto: ['Not built'],
    prod: ['Retrieval over the corpus'],
    split: true,
    badges: ['KB'],
  },
  {
    id: 'intake',
    n: '2',
    kind: 'ai',
    x: col(0),
    y: ai.y,
    w: COLW,
    h: ai.h,
    title: ['Intake and parsing'],
    body: ['Finds each rule and', 'its labelled fields'],
    proto: ['pdf.js and mammoth', 'in the browser'],
    prod: ['Document AI with', 'OCR and tables'],
  },
  {
    id: 'scope',
    n: '3',
    kind: 'ai',
    x: col(1),
    y: ai.y,
    w: COLW,
    h: ai.h,
    title: ['Scope and', 'completeness'],
    body: ['Decline rule or', 'eligibility rule?', '12-item checklist'],
    proto: ['Keyword rules'],
    prod: ['Rules plus a', 'trained classifier'],
  },
  {
    id: 'extract',
    n: '4',
    kind: 'ai',
    x: col(2),
    y: ai.y,
    w: COLW,
    h: ai.h,
    title: ['Structured', 'extraction'],
    body: ['Trigger, threshold,', 'lookback, terms'],
    proto: ['Batch output; keyword', 'triage for uploads'],
    prod: ['Server-side model', 'with a fixed schema'],
  },
  {
    id: 'assess',
    n: '5',
    kind: 'ai',
    x: col(3),
    y: ai.y,
    w: COLW,
    h: ai.h,
    title: ['Criteria', 'assessment L1-L4'],
    body: ['15 findings, verbatim', 'evidence, citations'],
    proto: ['100 batch results,', 'prompt v2, schema'],
    prod: ['Server-side model', 'with retrieval over', 'a versioned corpus'],
    badges: ['KB', 'A'],
  },
  {
    id: 'similar',
    n: '6',
    kind: 'ai',
    x: col(4),
    y: ai.y,
    w: COLW,
    h: ai.h,
    title: ['Precedent', 'similarity'],
    body: ['Top 5 similar rules', 'with reasons'],
    proto: ['TF-IDF plus', 'feature overlap'],
    prod: ['Embeddings with', 'a vector store'],
    badges: ['KB'],
  },
  {
    id: 'score',
    n: '7',
    kind: 'code',
    x: col(5),
    y: ai.y,
    w: COLW,
    h: ai.h,
    title: ['Deterministic', 'scoring'],
    body: ['Level 1 gate; weights', '40, 35, 25; approve', 'at 75, decline', 'below 50', 'Code, not the model,', 'sets the advisory', 'recommendation'],
    badges: ['A'],
  },
  {
    id: 'confirm',
    kind: 'human',
    x: col(0),
    y: hum.y,
    w: COLW,
    h: hum.h,
    title: ['Confirm', 'extraction'],
    body: ['Reviewer checks and', 'edits the fields', 'before triage runs'],
    badges: ['H'],
  },
  {
    id: 'panel',
    n: '8',
    kind: 'human',
    x: col(5),
    y: hum.y,
    w: COLW,
    h: hum.h,
    title: ['Recommendation', 'panel'],
    body: ['AI recommendation', '(advisory): evidence,', 'similar rules,', 'consumer lens,', 'next steps'],
    badges: ['H'],
  },
  {
    id: 'validate',
    n: '9',
    kind: 'human',
    x: col(4),
    y: hum.y,
    w: COLW,
    h: hum.h,
    title: ['Validate or', 'override'],
    body: ['Accept or override', 'all 15 findings;', 'override needs a', 'reason code and note'],
    badges: ['H', 'A'],
  },
  {
    id: 'signoff',
    n: '10',
    kind: 'human',
    x: col(3),
    y: hum.y,
    w: COLW,
    h: hum.h,
    title: ['Senior sign-off'],
    body: ['When the decision', 'differs from the AI,', 'a Level 1 finding is', 'overridden, or', 'confidence is low'],
    badges: ['H', 'A'],
  },
  {
    id: 'decide',
    n: '11',
    kind: 'human',
    x: col(2),
    y: hum.y,
    w: COLW,
    h: hum.h,
    title: ['Decision and', 'rationale'],
    body: ['A person decides;', 'the rationale is final', 'only after the', 'reviewer confirms', 'ownership'],
    badges: ['H', 'A'],
  },
  {
    id: 'kb',
    kind: 'record',
    x: col(0),
    y: rec.y,
    w: span(0, 2),
    h: rec.h,
    title: ['Versioned knowledge base'],
    body: ['Framework 1.0.0, 25 issue codes, citation', 'registry with verified flags, 25 precedents'],
    proto: ['JSON files in the repository'],
    prod: ['Governed corpus with change control'],
    badges: ['KB', 'A'],
  },
  {
    id: 'audit',
    n: '12',
    kind: 'record',
    x: col(2),
    y: rec.y,
    w: span(2, 2),
    h: rec.h,
    title: ['Audit trail'],
    body: ['Every action: time, person, role, before', 'and after, reason. Markdown or JSON export.'],
    proto: ['Stored in the browser'],
    prod: ['Secure records store with retention'],
    badges: ['A'],
  },
  {
    id: 'registry',
    n: '13',
    kind: 'record',
    x: col(4),
    y: rec.y,
    w: COLW,
    h: rec.h,
    title: ['Precedent', 'registry'],
    body: ['Decided rules', 'become precedents', 'for step 6'],
  },
  {
    id: 'monitor',
    n: '14',
    kind: 'record',
    x: col(5),
    y: rec.y,
    w: COLW,
    h: rec.h,
    title: ['Consistency', 'monitoring'],
    body: ['Similar rules with', 'different outcomes;', 'overrides by code', '(bias and drift)'],
    badges: ['A'],
  },
];

// ---------- Arrows (drawn first so boxes sit on top) ----------
const mid = (b: Box) => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: b.x + b.w, b: b.y + b.h });
const by = Object.fromEntries(boxes.map((b) => [b.id, b])) as Record<string, Box>;
const flowY = ai.y + 46;
const humY = hum.y + 46;

// 1 -> 2
arrow(`M ${mid(by.submit).cx} ${ins.y + ins.h} V ${ai.y - 2}`);
// 2 -> 3 -> 4 -> 5 -> 6 -> 7
for (const [a, b] of [
  ['intake', 'scope'],
  ['scope', 'extract'],
  ['extract', 'assess'],
  ['assess', 'similar'],
  ['similar', 'score'],
]) arrow(`M ${by[a].x + by[a].w} ${flowY} H ${by[b].x - 2}`);
// 2 <-> confirm extraction
add(`<path d="M ${mid(by.intake).cx} ${ai.y + ai.h + 2} V ${hum.y - 4}" fill="none" stroke="${C.pine}" stroke-width="2.5" marker-start="url(#head)" marker-end="url(#head)"/>`);
// 7 -> 8
arrow(`M ${mid(by.score).cx} ${ai.y + ai.h} V ${hum.y - 2}`);
// 8 -> 9 -> 10 -> 11 (right to left)
for (const [a, b] of [
  ['panel', 'validate'],
  ['validate', 'signoff'],
  ['signoff', 'decide'],
]) arrow(`M ${by[a].x} ${humY} H ${by[b].x + by[b].w + 2}`);
// 10, 11 -> audit trail
arrow(`M ${mid(by.decide).cx} ${hum.y + hum.h} V ${rec.y - 2}`, { dashed: true, color: C.purple });
arrow(`M ${mid(by.signoff).cx} ${hum.y + hum.h} V ${rec.y - 2}`, { dashed: true, color: C.purple });
// 12 -> 13 -> 14
arrow(`M ${by.audit.x + by.audit.w} ${rec.y + 60} H ${by.registry.x - 2}`, { dashed: true, color: C.purple });
arrow(`M ${by.registry.x + by.registry.w} ${rec.y + 60} H ${by.monitor.x - 2}`, { dashed: true, color: C.purple });
// 14 -> 8 consistency alerts
arrow(`M ${mid(by.monitor).cx} ${rec.y} V ${hum.y + hum.h + 2}`, { dashed: true, color: C.purple });
// chatbot -> reviewers (right channel)
arrow(`M ${by.chatbot.x + by.chatbot.w} ${ins.y + 40} H 1612 V ${hum.y + hum.h - 50} H ${by.panel.x + by.panel.w + 2}`, { dashed: true });

boxes.forEach(box);

// Arrow labels (placed in clear space).
text(mid(by.decide).cx + 8, rec.y - 6, 'logged', { size: 15, fill: C.purple, italic: true });
text(mid(by.signoff).cx + 8, rec.y - 6, 'logged', { size: 15, fill: C.purple, italic: true });
text(mid(by.monitor).cx + 8, rec.y - 6, 'alerts', { size: 15, fill: C.purple, italic: true });

// ---------- Legend ----------
const LY = 1092;
add(`<rect x="40" y="${LY}" width="1585" height="138" rx="10" fill="#ffffff" stroke="#d9d3c4" stroke-width="1.5"/>`);
text(60, LY + 30, 'Legend', { size: 19, weight: 700, fill: C.pine });
const legendBox = (x: number, y: number, k: Kind, label: string) => {
  const s = STYLE[k];
  add(`<rect x="${x}" y="${y - 16}" width="34" height="22" rx="5" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2.5"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  text(x + 44, y, label, { size: 17 });
};
legendBox(60, LY + 66, 'ai', 'AI component (advisory): shows Prototype and Production');
legendBox(60, LY + 98, 'code', 'Deterministic code (same in prototype and production)');
legendBox(60, LY + 128, 'human', 'Human step');
legendBox(300, LY + 128, 'record', 'Record');
const bx = 640;
badge(bx, LY + 60, 'H');
text(bx + 24, LY + 66, 'Human touchpoint: a person validates, overrides or approves');
badge(bx, LY + 92, 'A');
text(bx + 24, LY + 98, 'Accountability control: version stamps, override reasons, sign-off,');
text(bx + 24, LY + 119, 'ownership, audit trail, verified citations, bias and drift monitoring');
const kx = 1215;
badge(kx + 6, LY + 60, 'KB');
text(kx + 34, LY + 66, 'Reads the versioned knowledge base');
add(`<path d="M ${kx - 12} ${LY + 92} H ${kx + 26}" stroke="${C.pine}" stroke-width="2.5" marker-end="url(#head)"/>`);
text(kx + 34, LY + 98, 'Review flow (numbered steps)');
add(`<path d="M ${kx - 12} ${LY + 124} H ${kx + 26}" stroke="${C.purple}" stroke-width="2.5" stroke-dasharray="8 6" marker-end="url(#headPurple)"/>`);
text(kx + 34, LY + 130, 'Records and feedback loops');

text(
  40,
  1262,
  'Academic prototype for Ivey Online coursework. Not affiliated with or representative of the Financial Services Regulatory Authority of Ontario (FSRA). All insurer submissions and precedent records are fictional.',
  { size: 15, fill: C.muted },
);
add('</svg>');

const svg = parts.join('\n');
writeFileSync(`${OUT}/simrule-architecture.svg`, svg);
copyFileSync(`${OUT}/simrule-architecture.svg`, 'public/architecture.svg');

// PNG at 2x for crisp slides and the report.
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W * 2 }, font: { loadSystemFonts: true, defaultFontFamily: 'Liberation Sans' } }).render().asPng();
writeFileSync(`${OUT}/simrule-architecture.png`, png);

// PDF and an overflow check in Chromium.
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><head><style>@page{size:11in 8.5in;margin:0}html,body{margin:0}svg{display:block;width:11in;height:8.5in}</style></head><body>${svg}</body></html>`);
const overflow = await page.evaluate(() => {
  const problems: string[] = [];
  for (const g of document.querySelectorAll('g[data-box]')) {
    const frame = g.querySelector('rect[data-frame]')!.getBoundingClientRect();
    for (const t of g.querySelectorAll('text')) {
      const r = t.getBoundingClientRect();
      if (r.right > frame.right - 4 || r.bottom > frame.bottom - 2) problems.push(`${g.getAttribute('data-box')}: "${t.textContent}"`);
    }
  }
  return problems;
});
await page.pdf({ path: `${OUT}/simrule-architecture.pdf`, width: '11in', height: '8.5in', printBackground: true });
await browser.close();
if (overflow.length) {
  console.error('Text overflow:\n' + overflow.join('\n'));
  process.exit(1);
}
console.log('Wrote SVG, PNG and PDF to', OUT, 'and public/architecture.svg');
