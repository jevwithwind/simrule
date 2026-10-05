import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { outputFrom } from '../tests/fixtures';

// The live assessment is exercised against a mocked Claude API: no real key, no network call, no cost.
const dr005 = JSON.parse(readFileSync('data/assessments/DR-005.json', 'utf8'));
const rule = JSON.parse(readFileSync('data/rules.json', 'utf8')).find((r: { id: string }) => r.id === 'DR-005');
const FAKE_KEY = 'not-a-real-key-0000000000000000000000';

test('optional live assessment: off by default, key kept out of storage, result validated and scored', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let sawBrowserHeader = false;
  await page.route('https://api.anthropic.com/v1/messages**', async (route) => {
    const h = route.request().headers();
    sawBrowserHeader = h['anthropic-dangerous-direct-browser-access'] === 'true' && h['x-api-key'] === FAKE_KEY;
    const body = route.request().postDataJSON();
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.system).toContain('Additional rules in v2');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'text', text: JSON.stringify(outputFrom(dr005)) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    });
  });

  await page.goto('./#/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./#/intake');
  await page.getByRole('tab', { name: 'Paste text' }).click();
  await page.locator('#paste').fill(`Submitting Insurer: Test Insurer\nDate Submitted: 2024-12-10\nProposed Decline Rule: ${rule.ruleText}\nRationale: ${rule.rationale}\nRule Category: Demographic`);
  await page.getByRole('button', { name: 'Extract rules' }).click();
  await page.getByTestId('confirm-extraction-0').check();
  await page.getByTestId('run-triage').click();
  await page.getByTestId('intake-result').getByRole('link').first().click();

  const panel = page.getByTestId('live-assessment');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('live-key')).toHaveCount(0);
  await page.getByTestId('live-enable').check();
  await page.getByTestId('live-key').fill(FAKE_KEY);
  await page.screenshot({ path: 'deliverables/demo/screenshots/17-live-assessment-optional.png', fullPage: false });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(FAKE_KEY);

  await page.getByTestId('live-run').click();
  await expect(page.getByTestId('hard-stop')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('ai-score')).toBeVisible();
  expect(sawBrowserHeader).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(FAKE_KEY);
  await expect(page.getByTestId('audit-timeline')).toContainText('Live AI assessment');
  await page.mouse.move(5, 5);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'deliverables/demo/screenshots/18-live-assessment-result.png', fullPage: false });
  expect(errors).toEqual([]);
});
