// Expands the analyst's compact drafts (data/authoring/*.ts) into full assessment JSON files
// (data/assessments/DR-xxx.json). The expansion is mechanical: it adds criterion labels and levels
// from framework.json, similarity scores from the similarity index, and provenance. All judgments
// (status, severity, issue codes, reasoning, evidence, precedent relations) come from the drafts.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import framework from '../knowledge/framework.json';
import { ALL_CRITERIA, type Assessment, type Precedent, type Rule } from '../src/lib/schema';
import { SimilarityIndex, type SimDoc } from '../src/lib/similarity';
import type { Draft, CriterionTuple } from '../data/authoring/types';

const STATUS_MAP: Record<string, Assessment['criteria'][number]['status']> = {
  pass: 'pass',
  concern: 'concern',
  fail: 'fail',
  insuf: 'insufficient_information',
};
const SEV_MAP: Record<string, 'low' | 'medium' | 'high'> = { low: 'low', med: 'medium', high: 'high' };

const labels = new Map<string, string>();
for (const lvl of framework.levels) for (const c of lvl.criteria) labels.set(c.key, c.label);

const rules: Rule[] = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const precedents: Precedent[] = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents;
const docs: SimDoc[] = [
  ...rules.map((r) => ({ id: r.id, text: r.ruleText, categories: r.categories, kind: 'submission' as const })),
  ...precedents.map((p) => ({ id: p.id, text: p.ruleText, categories: p.categories, kind: 'precedent' as const })),
];
const index = new SimilarityIndex(docs);

const PROMPT_VERSION_DATES: Record<string, string> = { v1: '2026-10-05', v2: '2026-10-05' };

export function expandDraft(d: Draft): Assessment {
  const rule = rules.find((r) => r.id === d.id);
  if (!rule) throw new Error(`Unknown rule ${d.id}`);
  const sims = new Map(index.query({ id: d.id, text: rule.ruleText, categories: rule.categories }).map((s) => [s.id, s.score]));
  const criteria = ALL_CRITERIA.map((key) => {
    const t: CriterionTuple | undefined = d.c[key];
    if (!t) throw new Error(`${d.id}: missing ${key}`);
    const [status, sev, codes, reasoning, evidence, cites] = t;
    if (!STATUS_MAP[status]) throw new Error(`${d.id} ${key}: bad status ${status}`);
    if (!SEV_MAP[sev]) throw new Error(`${d.id} ${key}: bad severity ${sev}`);
    return {
      level: Number(key[1]) as 1 | 2 | 3 | 4,
      key,
      label: labels.get(key)!,
      status: STATUS_MAP[status],
      severity: SEV_MAP[sev],
      issueCodes: codes,
      reasoning: reasoning.replace(/\s+/g, ' ').trim(),
      evidence: evidence.map((e) => ({ source: e.startsWith('J:') ? ('rationale' as const) : ('ruleText' as const), quote: e.slice(2) })),
      citationIds: cites,
    };
  });
  const [trigger, thresholdCount, lookbackYears, populationAffected, ruleType, definedTerms, undefinedTerms] = d.x;
  return {
    id: d.id,
    extracted: { trigger, thresholdCount, lookbackYears, populationAffected, ruleType, definedTerms, undefinedTerms },
    scope: { inScope: d.scope[0], note: d.scope[1] },
    criteria,
    precedents: d.p.map(([refId, relation, explanation]) => ({ refId, similarity: sims.get(refId) ?? 0, relation, explanation })),
    consumerImpact: { whoCouldBeRefused: d.ci[0], likelyConsequence: d.ci[1], vulnerableGroups: d.ci[2], severity: SEV_MAP[d.ci[3]] },
    questionsForInsurer: d.q,
    whatWouldChangeTheOutcome: d.w,
    nextSteps: d.ns.map(([action, owner, reason]) => ({ action, owner, reason })),
    confidence: d.conf,
    uncertainties: d.u,
    provenance: {
      generatedBy: 'Claude (batch AI analyst, Claude Code build session)',
      promptVersion: d.pv,
      frameworkVersion: framework.version,
      generatedOn: PROMPT_VERSION_DATES[d.pv] ?? '2026-10-05',
    },
  };
}

async function main() {
  const dir = resolve('data/authoring');
  const files = readdirSync(dir).filter((f) => /^batch-.*\.ts$/.test(f)).sort();
  mkdirSync('data/assessments', { recursive: true });
  let count = 0;
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const drafts: Draft[] = mod.default;
    for (const d of drafts) {
      writeFileSync(join('data/assessments', `${d.id}.json`), JSON.stringify(expandDraft(d), null, 2) + '\n');
      count++;
    }
  }
  console.log(`Expanded ${count} drafts from ${files.length} batch files.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
