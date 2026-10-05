import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';

const ROUTES = ['#/', '#/intake', '#/rule/DR-005', '#/rule/DR-012', '#/rule/DR-071', '#/compare/DR-012/AP-07', '#/consistency', '#/precedents', '#/how-it-works'];

test('axe: no serious or critical WCAG 2.1 AA violations on the main screens', async ({ page }) => {
  const rows: string[] = [];
  const blocking: string[] = [];
  await page.goto('./#/');
  await page.evaluate(() => localStorage.clear());
  for (const route of ROUTES) {
    await page.goto(`./${route}`);
    await page.waitForTimeout(600);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const v = res.violations;
    rows.push(`| \`${route}\` | ${res.passes.length} | ${v.length ? v.map((x) => `${x.id} (${x.impact}, ${x.nodes.length})`).join('; ') : 'none'} |`);
    for (const x of v) if (x.impact === 'serious' || x.impact === 'critical') blocking.push(`${route}: ${x.id} ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
  }
  writeFileSync(
    'deliverables/demo/accessibility-report.md',
    `# Accessibility check (axe-core)\n\nAutomated scan with @axe-core/playwright against WCAG 2.0 and 2.1 A and AA rules, run by \`npx playwright test e2e/a11y.spec.ts\` on the production build. Automated checks catch roughly a third of accessibility issues; keyboard and screen-reader checks are still needed.\n\n| Screen | Rules passed | Violations (impact, nodes) |\n|---|---|---|\n${rows.join('\n')}\n\nKnown design decision: the request-more-information chart colour (#c9a227) is under 3:1 against the surface, so every chart ships a legend, tooltips and a table view, and status is never shown by colour alone.\n`,
  );
  expect(blocking).toEqual([]);
});
