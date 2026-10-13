import { chromium } from 'playwright';

const STABLE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}`;

export async function capturePair(job, baselineBuffer) {
  const browser = await chromium.launch({ headless: true });
  let timer;
  async function capture(url) {
    const context = await browser.newContext({
      viewport: job.viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'en-US',
      timezoneId: 'UTC',
      serviceWorkers: 'block',
      acceptDownloads: false,
    });
    try {
      await context.route('**/*', async (route) => {
        const protocol = new URL(route.request().url()).protocol;
        if (
          protocol !== 'http:' &&
          protocol !== 'https:' &&
          protocol !== 'data:' &&
          protocol !== 'blob:'
        )
          return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      page.on('dialog', (dialog) => dialog.dismiss());
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      if (response && response.status() >= 400)
        throw new Error(`Capture returned HTTP ${response.status()} for ${url}.`);
      await page.addStyleTag({ content: STABLE_CSS });
      await page.evaluate(() =>
        Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]),
      );
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((image) =>
            image.complete
              ? Promise.resolve()
              : Promise.race([
                  new Promise((resolve) => {
                    image.addEventListener('load', resolve, { once: true });
                    image.addEventListener('error', resolve, { once: true });
                  }),
                  new Promise((resolve) => setTimeout(resolve, 3000)),
                ]),
          ),
        ),
      );
      await page.waitForTimeout(500);
      return await page.screenshot({
        type: 'png',
        animations: 'disabled',
        caret: 'hide',
        timeout: 10_000,
        fullPage: false,
      });
    } finally {
      await context.close();
    }
  }
  try {
    return await Promise.race([
      Promise.all([
        baselineBuffer ? Promise.resolve(baselineBuffer) : capture(job.baselineUrl),
        capture(job.candidateUrl),
      ]),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Capture exceeded its 45 second time limit.')),
          45_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    await browser.close();
  }
}
