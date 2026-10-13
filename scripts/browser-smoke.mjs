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
const recordMotion = process.env.PRISM_RECORD_VIDEO === '1';
const motionDir = recordMotion ? await mkdtemp(path.join(tmpdir(), 'prism-motion-')) : undefined;
const page = await browser.newPage({
  viewport: { width: 1512, height: 1160 },
  ...(recordMotion ? { recordVideo: { dir: motionDir, size: { width: 1280, height: 982 } } } : {}),
});
const pauseForMotion = async (milliseconds = 700) => {
  if (recordMotion) await page.waitForTimeout(milliseconds);
};
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(base);
  await page.getByRole('heading', { name: 'Visual comparisons' }).waitFor();
  await pauseForMotion(800);
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await page
    .locator('.review-heading .status-pill')
    .filter({ hasText: 'Changes detected' })
    .waitFor({ timeout: 60_000 });
  await Promise.all(
    ['Baseline browser screenshot', 'Candidate browser screenshot'].map((name) =>
      page.getByAltText(name, { exact: true }).evaluate((image) => image.decode()),
    ),
  );
  assert.ok(instance.store.state.jobs[0].result.changedPixels > 1000);
  await pauseForMotion(850);
  await page.getByRole('tab', { name: 'Side by side', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page.getByRole('tab', { name: 'Difference', exact: true }).getAttribute('aria-selected'),
    'true',
  );
  await page.getByAltText(/Difference map/).waitFor();
  await pauseForMotion();
  await page.getByRole('tab', { name: 'Overlay', exact: true }).click();
  await page.getByRole('slider', { name: 'Candidate opacity' }).fill('70');
  await pauseForMotion();
  await page.getByRole('tab', { name: 'Swipe', exact: true }).click();
  await page.getByRole('slider', { name: 'Comparison divider' }).fill('30');
  await pauseForMotion();
  await page.getByRole('tab', { name: 'Side by side', exact: true }).click();
  await pauseForMotion();
  await page.evaluate(() => document.fonts.ready);
  await mkdir('docs', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/screenshot.png', fullPage: true, animations: 'disabled' });
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
  await pauseForMotion(900);
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
  await page
    .getByAltText('Baseline uploaded PNG', { exact: true })
    .evaluate((image) => image.decode());
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false,
    'Mobile view must not overflow',
  );
  await page.screenshot({ path: 'docs/mobile.png', fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, []);
  console.log(
    `Browser story passed: real URL capture (${firstJob.result.changedPercent.toFixed(3)}% changed), all 4 views, baseline acceptance, zero-diff rerun, PNG upload, history, responsive 390px viewport, no page errors.`,
  );
} finally {
  const video = recordMotion ? page.video() : null;
  if (video) {
    await page.context().close();
    await video.saveAs('docs/motion-demo.webm');
    await rm(motionDir, { recursive: true, force: true });
  }
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await instance.close();
  await rm(dataDir, { recursive: true, force: true });
}
