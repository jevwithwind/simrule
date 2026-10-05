// Client-side document parsing for intake: PDF (pdf.js), DOCX (mammoth), TXT and MD.
// Then splits a document into one or more candidate rules for the reviewer to confirm.

export interface ExtractedRule {
  insurer: string;
  dateSubmitted: string;
  ruleText: string;
  rationale: string;
  categoryLabel: string;
  definitions: string;
  actuarial: string;
  consumerNotice: string;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = '';
      const lines: string[] = [];
      for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
        line += item.str ?? '';
        if (item.hasEOL) {
          lines.push(line);
          line = '';
        }
      }
      if (line) lines.push(line);
      pages.push(lines.join('\n'));
    }
    return pages.join('\n\n');
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return res.value;
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) return file.text();
  throw new Error('Unsupported file type. Use PDF, DOCX, TXT or MD.');
}

const LABELS: { key: keyof ExtractedRule | 'ruleStart'; re: string }[] = [
  { key: 'insurer', re: "(?:Submitting Insurer|Insurer(?: name)?)" },
  { key: 'dateSubmitted', re: '(?:Date Submitted|Submission Date|Date)' },
  { key: 'ruleText', re: '(?:Proposed Decline Rule|Proposed Rule|Rule Text|Decline Rule)' },
  { key: 'rationale', re: "(?:Insurer's Stated Rationale|Insurer’s Stated Rationale|Stated Rationale|Rationale)" },
  { key: 'categoryLabel', re: '(?:Rule Category|Category)' },
  { key: 'definitions', re: '(?:Definitions?(?: of terms)?)' },
  { key: 'actuarial', re: '(?:Actuarial (?:Support|Analysis|Data|Evidence))' },
  { key: 'consumerNotice', re: '(?:Consumer (?:Notice|Communication))' },
];

const empty = (): ExtractedRule => ({ insurer: '', dateSubmitted: '', ruleText: '', rationale: '', categoryLabel: '', definitions: '', actuarial: '', consumerNotice: '' });

function normalise(text: string): string {
  return text.replace(/\r/g, '').replace(/[‘’]/g, "'").replace(/\*\*/g, '').replace(/[ \t]+/g, ' ');
}

const LABEL_RE = new RegExp(`(${LABELS.map((l) => l.re).join('|')})\\s*:\\s*`, 'gi');

function keyFor(label: string): keyof ExtractedRule | null {
  const def = LABELS.find((l) => new RegExp(`^${l.re}$`, 'i').test(label));
  return def && def.key !== 'ruleStart' ? (def.key as keyof ExtractedRule) : null;
}

/** Removes a trailing heading such as "Rule 2", "DR-014" or "## Submission B" that belongs to the next rule. */
function tidy(value: string): string {
  return value
    .replace(/\n\s*(?:#+\s*)?(?:Rule|Submission|Filing|DR-)\s*[\w-]*\s*[.:)]?\s*$/i, '')
    .replace(/\s*DR-\d{3}\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits a document into candidate rules. Detects several rules per document. */
export function splitRules(raw: string): ExtractedRule[] {
  const text = normalise(raw);
  const hits = [...text.matchAll(LABEL_RE)].map((m) => ({ key: keyFor(m[1]), start: m.index!, end: m.index! + m[0].length }));
  if (hits.some((h) => h.key === 'ruleText')) {
    const rules: ExtractedRule[] = [];
    const defaults: Partial<ExtractedRule> = {};
    let cur: ExtractedRule = empty();
    let explicit = new Set<string>();
    hits.forEach((h, i) => {
      if (!h.key) return;
      const value = tidy(text.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : undefined));
      const startsNew = cur.ruleText && (h.key === 'ruleText' || h.key === 'insurer' || h.key === 'dateSubmitted');
      if (startsNew) {
        rules.push(cur);
        cur = { ...empty(), ...defaults };
        explicit = new Set();
      }
      if (!rules.length && !cur.ruleText && (h.key === 'insurer' || h.key === 'dateSubmitted')) defaults[h.key] = value;
      if (!explicit.has(h.key)) {
        cur[h.key] = value;
        explicit.add(h.key);
      }
    });
    rules.push(cur);
    return rules.map(clean).filter((r) => r.ruleText.length > 10);
  }
  // Unlabelled text: every sentence that starts with "Decline", "Refuse" or "Deny" is treated as a rule.
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim());
  return sentences.filter((x) => /^(decline|refuse|deny)\b/i.test(x)).map((x) => clean({ ...empty(), ruleText: x }));
}

function clean(r: ExtractedRule): ExtractedRule {
  return {
    ...r,
    dateSubmitted: r.dateSubmitted.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? r.dateSubmitted,
  };
}
