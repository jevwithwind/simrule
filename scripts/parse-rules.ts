// Parses the 100 fictional decline rules from the source .docx into data/rules.json.
// Usage: npm run parse-rules
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import mammoth from 'mammoth';

export interface ParsedRule {
  id: string;
  insurer: string;
  dateSubmitted: string;
  ruleText: string;
  rationale: string;
  categories: string[];
  categoryLabel: string;
}

const RULE_PATTERN =
  /(DR-\d{3})\s+Submitting Insurer:\s*(.+?)\s+Date Submitted:\s*(\d{4}-\d{2}-\d{2})\s+Proposed Decline Rule:\s*(.+?)\s+Insurer's Stated Rationale:\s*(.+?)\s+Rule Category:\s*(.+?)(?=\s*DR-\d{3}\s+Submitting Insurer:|\s*$)/gs;

export function parseRulesText(raw: string): ParsedRule[] {
  // Normalise typographic apostrophes and collapse whitespace so one regex covers .docx and .md sources.
  const text = raw.replace(/[‘’]/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ');
  const rules: ParsedRule[] = [];
  for (const m of text.matchAll(RULE_PATTERN)) {
    const categoryLabel = m[6].trim();
    rules.push({
      id: m[1],
      insurer: m[2].trim(),
      dateSubmitted: m[3],
      ruleText: m[4].trim(),
      rationale: m[5].trim(),
      categories: categoryLabel.split('/').map((c) => c.trim()).filter(Boolean),
      categoryLabel,
    });
  }
  return rules;
}

export function assertRules(rules: ParsedRule[]): void {
  if (rules.length !== 100) throw new Error(`Expected 100 rules, found ${rules.length}`);
  const ids = new Set<string>();
  for (const r of rules) {
    for (const key of ['id', 'insurer', 'dateSubmitted', 'ruleText', 'rationale'] as const) {
      if (!r[key]) throw new Error(`${r.id}: missing ${key}`);
    }
    if (r.categories.length === 0) throw new Error(`${r.id}: no categories`);
    if (ids.has(r.id)) throw new Error(`Duplicate id ${r.id}`);
    ids.add(r.id);
  }
}

async function main() {
  const sourceDir = join(process.cwd(), 'source');
  const file = readdirSync(sourceDir).find((f) => /decline-rules/i.test(f) && /\.(docx|md)$/i.test(f));
  if (!file) throw new Error('Rule source file not found in /source');
  const path = join(sourceDir, file);
  const raw = file.endsWith('.docx')
    ? (await mammoth.extractRawText({ buffer: readFileSync(path) })).value
    : readFileSync(path, 'utf8');
  const rules = parseRulesText(raw);
  assertRules(rules);
  writeFileSync(join(process.cwd(), 'data', 'rules.json'), JSON.stringify(rules, null, 2) + '\n');
  const insurers = new Set(rules.map((r) => r.insurer));
  console.log(`Parsed ${rules.length} rules from ${file}; ${insurers.size} insurers.`);
}

if (process.argv[1] && process.argv[1].endsWith('parse-rules.ts')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
