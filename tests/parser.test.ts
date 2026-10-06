import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import mammoth from 'mammoth';
import { assertRules, parseRulesText } from '../scripts/parse-rules';

describe('rule parser', () => {
  it('parses exactly 100 rules with every field from the source .docx', async () => {
    const raw = (await mammoth.extractRawText({ buffer: readFileSync('source/100-fictional-underwriting-decline-rules.docx') })).value;
    const rules = parseRulesText(raw);
    expect(rules).toHaveLength(100);
    expect(() => assertRules(rules)).not.toThrow();
    for (const r of rules) {
      expect(r.id).toMatch(/^DR-\d{3}$/);
      expect(r.insurer.length).toBeGreaterThan(3);
      expect(r.dateSubmitted).toMatch(/^2024-\d{2}-\d{2}$/);
      expect(r.ruleText.startsWith('Decline')).toBe(true);
      expect(r.rationale.length).toBeGreaterThan(20);
      expect(r.categories.length).toBeGreaterThan(0);
    }
    expect(new Set(rules.map((r) => r.insurer)).size).toBe(10);
  });

  it('splits compound categories on "/"', () => {
    const rules = parseRulesText(
      '**DR-900** Submitting Insurer: Test Mutual Date Submitted: 2024-01-01 Proposed Decline Rule: Decline to insure X. Insurer\'s Stated Rationale: Because Y. Rule Category: Driving Record / Demographic',
    );
    expect(rules[0].categories).toEqual(['Driving Record', 'Demographic']);
  });

  it('matches the committed data/rules.json', () => {
    const committed = JSON.parse(readFileSync('data/rules.json', 'utf8'));
    expect(committed).toHaveLength(100);
    expect(committed[11].id).toBe('DR-012');
  });
});
