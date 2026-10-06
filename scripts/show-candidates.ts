// Prints rule text, rationale and similarity candidates for a list of ids (analyst working aid).
import { readFileSync } from 'node:fs';
const rules = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const cands = JSON.parse(readFileSync('data/similarity-candidates.json', 'utf8'));
const prec = JSON.parse(readFileSync('knowledge/precedents.json', 'utf8')).precedents;
for (const id of process.argv.slice(2)) {
  const r = rules.find((x: any) => x.id === id);
  const c = cands.find((x: any) => x.id === id);
  console.log(`\n${id} [${r.insurer}] ${r.categoryLabel}\n  RULE: ${r.ruleText}\n  WHY: ${r.rationale}`);
  for (const k of c.candidates) {
    const t = k.kind === 'precedent' ? prec.find((p: any) => p.id === k.id).ruleText : rules.find((x: any) => x.id === k.id).ruleText;
    console.log(`  - ${k.id} ${k.score} (${k.insurer ?? 'framework'}${k.sameInsurer ? ', SAME insurer' : ''}): ${t.slice(0, 110)}`);
  }
}
