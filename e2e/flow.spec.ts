import { expect, test, type Page } from '@playwright/test';

const SHOTS = 'deliverables/demo/screenshots';
const SAMPLES = 'deliverables/demo/sample-submissions';

async function shot(page: Page, name: string, fullPage = true) {
  // The disclaimer footer is sticky; in a full-page capture it would float mid-page, so pin it to the end.
  if (fullPage) await page.addStyleTag({ content: 'footer { position: static !important; }' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
}

async function freshStart(page: Page) {
  await page.goto('./#/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('queue-table')).toBeVisible();
}

test.describe('Simrule end-to-end', () => {
  test('upload, triage, review, override, senior sign-off, audit, reset', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('dialog', (d) => void d.accept());

    await freshStart(page);
    await expect(page.getByText('Academic prototype for Ivey Online coursework')).toBeVisible();
    await shot(page, '01-dashboard');

    // 1. Upload a DOCX filing and confirm the extraction.
    await page.goto('./#/intake');
    await page.getByTestId('file-input').setInputFiles(`${SAMPLES}/pinegate-language-postal-rule.docx`);
    const preview = page.getByTestId('extraction-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('input[value="Pinegate Assurance"]')).toBeVisible();
    await shot(page, '02-intake-extraction');
    await page.getByTestId('confirm-extraction-0').check();

    // 2. Keyword triage flags the language proxy.
    await page.getByTestId('run-triage').click();
    const result = page.getByTestId('intake-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('PROXY_FOR_PROTECTED_GROUND');
    await expect(result).toContainText('low confidence');
    await shot(page, '03-intake-triage');
    await result.getByRole('link').first().click();
    await expect(page.getByText('Awaiting full AI assessment')).toBeVisible();
    await shot(page, '04-upload-review');

    // 3. Open rule reviews used in the demo.
    await page.goto('./#/rule/DR-005');
    await expect(page.getByTestId('hard-stop')).toBeVisible();
    await page.getByTestId('criterion-L1_HUMAN_RIGHTS').locator('button[title="Highlight these words in the submission"]').first().click();
    await expect(page.getByTestId('evidence-highlight').first()).toBeVisible();
    await shot(page, '05-rule-review-hard-stop');
    await page.goto('./#/rule/DR-012');
    await expect(page.getByText('AP-07').first()).toBeVisible();
    await shot(page, '06-rule-review-precedent');

    // 4. Override a criterion on DR-071; the human score updates live.
    await page.goto('./#/rule/DR-071');
    await expect(page.getByTestId('ai-score')).toBeVisible();
    await page.getByTestId('override-L3_ACTUARIAL').click();
    const form = page.getByTestId('override-form-L3_ACTUARIAL');
    await form.locator('select[name="status"]').selectOption('insufficient_information');
    await form.locator('select[name="severity"]').selectOption('low');
    await form.locator('select[name="reasonCode"]').selectOption({ index: 1 });
    await form.locator('textarea[name="note"]').fill('The loss data can be required as a filing condition rather than a reason to hold the file.');
    await form.getByRole('button', { name: 'Save override' }).click();
    await expect(page.getByTestId('human-adjusted')).toBeVisible();
    for (const lvl of [1, 2, 3, 4]) {
      const b = page.getByTestId(`accept-level-${lvl}`);
      if (await b.isEnabled()) await b.click();
    }
    await expect(page.getByTestId('validated-count')).toHaveText('15 of 15');

    // 5. Choosing an outcome that diverges from the AI triggers senior sign-off.
    const panel = page.getByTestId('decision-panel');
    await panel.locator('input[name="decision"][value="APPROVE_WITH_CONDITIONS"]').check();
    await expect(page.getByTestId('signoff-warning')).toBeVisible();
    await expect(page.getByTestId('signoff-warning')).toContainText(/differs from the AI|diverges/i);
    await page.getByTestId('draft-rationale').click();
    await page.getByTestId('ownership').check();
    await shot(page, '07-decision-panel-before-submit');
    await page.getByTestId('submit-decision').click();
    await expect(panel).toContainText('Sent for senior sign-off');

    // 6. Switch role and sign off.
    await page.getByTestId('role-switcher').selectOption('Senior reviewer');
    await page.getByTestId('signoff-note').fill('Agree: the actuarial evidence can be a filing condition. Approved with conditions.');
    await shot(page, '08-senior-sign-off');
    await page.getByTestId('sign-off').click();
    await expect(page.getByTestId('decision-recorded')).toBeVisible();

    // 7. The audit trail holds the override, the proposal and the sign-off.
    const audit = page.getByTestId('audit-timeline');
    await expect(audit).toContainText('Senior sign-off');
    await expect(audit).toContainText('Demo senior reviewer (you)');
    await expect(audit).toContainText('Overrode L3_ACTUARIAL');
    await expect(audit).toContainText('Decision differs from the AI recommendation');
    await shot(page, '09-decision-recorded-audit');

    // 8. Remaining screens.
    await page.goto('./#/consistency');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await shot(page, '10-consistency');
    await page.locator('a[href*="#/compare/"]').first().click();
    await expect(page).toHaveURL(/#\/compare\//);
    await shot(page, '11-compare');
    await page.goto('./#/precedents');
    await shot(page, '12-precedents');
    await page.goto('./#/how-it-works');
    await shot(page, '13-how-it-works');
    await page.goto('./#/');
    await page.getByRole('button', { name: 'Guided demo' }).click();
    await expect(page.getByTestId('tour')).toBeVisible();
    await shot(page, '14-guided-demo', false);
    await page.getByRole('button', { name: 'Close guided demo' }).click();

    // 9. Reset restores the seeded queue.
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByTestId('reset-demo').click();
    await page.goto('./#/rule/DR-071');
    await expect(page.getByTestId('validated-count')).toHaveText('0 of 15');
    await expect(page.getByTestId('decision-recorded')).toHaveCount(0);
    await page.goto('./#/intake');
    await page.goto('./#/rule/UP-1');
    await expect(page.getByText('Awaiting full AI assessment')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('multi-rule text filing splits into two out-of-scope rules', async ({ page }) => {
    await freshStart(page);
    await page.goto('./#/intake');
    await page.getByTestId('file-input').setInputFiles(`${SAMPLES}/northlake-optional-coverage-rules.txt`);
    await expect(page.getByTestId('confirm-extraction-1')).toBeVisible();
    await page.getByTestId('confirm-extraction-0').check();
    await page.getByTestId('confirm-extraction-1').check();
    await page.getByTestId('run-triage').click();
    const result = page.getByTestId('intake-result');
    await expect(result.getByText('Out of scope: eligibility rule')).toHaveCount(2);
  });

  test('PDF filing extracts labelled fields', async ({ page }) => {
    await freshStart(page);
    await page.goto('./#/intake');
    await page.getByTestId('file-input').setInputFiles(`${SAMPLES}/harbourline-fraud-conviction-rule.pdf`);
    const preview = page.getByTestId('extraction-preview');
    await expect(preview.locator('input[value="Harbourline Mutual"]')).toBeVisible();
    await expect(preview.locator('textarea').first()).toHaveValue(/auto insurance fraud/);
  });

  test('mobile layouts', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await freshStart(page);
    await shot(page, '15-mobile-dashboard');
    await page.goto('./#/rule/DR-005');
    await expect(page.getByTestId('hard-stop')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await shot(page, '16-mobile-rule-review');
  });
});
