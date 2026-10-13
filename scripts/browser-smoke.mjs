import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createApplication } from '../server/index.mjs';
const dataDir = await mkdtemp(path.join(tmpdir(), 'prism-browser-'));
const instance = await createApplication({ dataDir });
const server = instance.app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 1160 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(base);
  await page.getByRole('heading', { name: 'Visual comparisons' }).waitFor();
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await page
    .locator('.review-heading .status-pill')
    .filter({ hasText: 'Changes detected' })
    .waitFor({ timeout: 60_000 });
  assert.ok(instance.store.state.jobs[0].result.changedPixels > 1000);
  await page.getByRole('tab', { name: 'Side by side', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page.getByRole('tab', { name: 'Difference', exact: true }).getAttribute('aria-selected'),
    'true',
  );
  await page.getByAltText(/Difference map/).waitFor();
  await page.getByRole('tab', { name: 'Overlay', exact: true }).click();
  await page.getByRole('slider', { name: 'Candidate opacity' }).fill('70');
  await page.getByRole('tab', { name: 'Swipe', exact: true }).click();
  await page.getByRole('slider', { name: 'Comparison divider' }).fill('30');
  await page.getByRole('tab', { name: 'Side by side', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await mkdir('docs', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/screenshot.png', fullPage: true });
  const firstJob = instance.store.state.jobs[0];
  for (const name of ['baseline', 'candidate', 'diff']) {
    const file = await readFile(path.join(dataDir, 'artifacts', firstJob.id, `${name}.png`));
    await (await import('node:fs/promises')).writeFile(`docs/demo-${name}.png`, file);
  }
  await page.getByRole('button', { name: 'Accept candidate', exact: true }).click();
  await page.getByRole('button', { name: 'Baseline accepted', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Baselines', exact: false }).click();
  await page.getByRole('button', { name: 'Use this baseline' }).click();
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await page
    .locator('.review-heading .status-pill')
    .filter({ hasText: 'Within tolerance' })
    .waitFor({ timeout: 60_000 });
  assert.equal(instance.store.state.jobs[0].result.changedPixels, 0);
  await page.getByRole('button', { name: 'Run history', exact: false }).click();
  assert.equal(await page.getByRole('row').count(), 3);
  await page.getByRole('button', { name: 'New comparison' }).click();
  await page.getByRole('button', { name: 'PNG files' }).click();
  const file = path.join(dataDir, 'artifacts', firstJob.id, 'candidate.png');
  const uploads = page.locator('input[type="file"]');
  await uploads.nth(0).setInputFiles(file);
  await uploads.nth(1).setInputFiles(file);
  const [uploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().endsWith('/api/jobs') && response.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Run comparison', exact: true }).click(),
  ]);
  const uploaded = await uploadResponse.json();
  await page
    .locator(`[data-job-id="${uploaded.id}"] .review-heading .status-pill`)
    .filter({ hasText: 'Within tolerance' })
    .waitFor({ timeout: 20_000 });
  assert.equal(instance.store.state.jobs[0].mode, 'upload');
  assert.equal(instance.store.state.jobs[0].result.changedPixels, 0);
  const uploadMetadata = await page
    .locator(`[data-job-id="${uploaded.id}"] .review-heading p`)
    .textContent();
  assert.match(uploadMetadata, /Uploaded PNGs/);
  assert.doesNotMatch(uploadMetadata, /Chromium/);
  await page.getByAltText('Baseline uploaded PNG', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false,
    'Mobile view must not overflow',
  );
  await page.screenshot({ path: 'docs/mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    `Browser story passed: real URL capture (${firstJob.result.changedPercent.toFixed(3)}% changed), all 4 views, baseline acceptance, zero-diff rerun, PNG upload, history, responsive 390px viewport, no page errors.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await instance.close();
  await rm(dataDir, { recursive: true, force: true });
}
