// Validates every data/assessments/DR-xxx.json: zod schema, all 15 criteria present, verbatim evidence
// quotes, known citation ids, known issue codes, known precedent ids, 2-4 sentence reasoning.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import framework from '../knowledge/framework.json';
import { AssessmentSchema, validateAssessmentContent, type Rule } from '../src/lib/schema';

const rules: Rule[] = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const citations = JSON.parse(readFileSync('knowledge/citations.json', 'utf8')).citations as { id: string }[];
const precedents = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents as { id: string }[];

const known = {
  citationIds: new Set(citations.map((c) => c.id)),
  issueCodes: new Set(framework.issueCodes.map((c) => c.code)),
  refIds: new Set([...precedents.map((p) => p.id), ...rules.map((r) => r.id)]),
};

const files = readdirSync('data/assessments').filter((f) => f.endsWith('.json')).sort();
let failures = 0;
let noEvidence = 0;
for (const f of files) {
  const raw = JSON.parse(readFileSync(join('data/assessments', f), 'utf8'));
  const parsed = AssessmentSchema.safeParse(raw);
  if (!parsed.success) {
    failures++;
    console.log(`${f}: schema errors`, parsed.error.issues.slice(0, 5));
    continue;
  }
  const rule = rules.find((r) => r.id === parsed.data.id);
  if (!rule) {
    failures++;
    console.log(`${f}: no matching rule`);
    continue;
  }
  const errors = validateAssessmentContent(parsed.data, rule, known);
  if (parsed.data.precedents.some((p) => p.refId === parsed.data.id)) errors.push('compares rule with itself');
  if (parsed.data.questionsForInsurer.length < 1) errors.push('needs at least one question for the insurer');
  if (parsed.data.whatWouldChangeTheOutcome.length < 1) errors.push('needs at least one item in whatWouldChangeTheOutcome');
  if (parsed.data.nextSteps.length < 2) errors.push('needs at least two next steps');
  if (parsed.data.precedents.length < 1) errors.push('needs at least one precedent comparison');
  const l3a = parsed.data.criteria.find((c) => c.key === 'L3_ACTUARIAL');
  if (l3a && l3a.severity === 'high') errors.push('L3_ACTUARIAL severity must not be high (prompt v2 rule 17)');
  for (const c of parsed.data.criteria) if (c.status !== 'pass' && c.evidence.length === 0) noEvidence++;
  if (errors.length) {
    failures++;
    console.log(`${f}:\n  - ${errors.join('\n  - ')}`);
  }
}
console.log(`Validated ${files.length} assessments: ${files.length - failures} passed, ${failures} failed.`);
console.log(`Non-pass findings without an evidence quote (allowed, e.g. absence of data): ${noEvidence}`);
if (failures) process.exit(1);
