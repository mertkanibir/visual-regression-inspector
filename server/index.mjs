import express from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createStore } from './store.mjs';
import { comparePngs, readPng } from './compare.mjs';
import { capturePair } from './capture.mjs';
import { demoPage } from './demo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, 'Use an HTTP or HTTPS URL without embedded credentials.');
const viewportSchema = z.object({
  width: z.number().int().min(320).max(1920),
  height: z.number().int().min(240).max(1200),
});
const jobSchema = z
  .object({
    name: z.string().trim().min(1).max(80).default('Untitled comparison'),
    mode: z.enum(['url', 'upload']).default('url'),
    baselineUrl: safeUrl.optional(),
    candidateUrl: safeUrl.optional(),
    baselineId: z.uuid().optional(),
    viewport: viewportSchema.default({ width: 1280, height: 800 }),
    allowedPercent: z.number().min(0).max(100).default(0.5),
    baselinePng: z.string().max(6_700_000).optional(),
    candidatePng: z.string().max(6_700_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'url' && (!value.candidateUrl || (!value.baselineUrl && !value.baselineId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Provide baseline and candidate URLs, or a saved baseline.',
      });
    if (value.mode === 'upload' && (!value.baselinePng || !value.candidatePng || value.baselineId))
      ctx.addIssue({ code: 'custom', message: 'Upload two PNG files.' });
  });

export async function createApplication({
  dataDir = path.join(ROOT, '.prism'),
  concurrency = 2,
} = {}) {
  const store = await createStore(dataDir);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const hostname = req.hostname;
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname))
      return res.status(403).json({ error: 'Prism only accepts local hostnames.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      const allowed =
        origin && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
      if (origin && !allowed)
        return res.status(403).json({ error: 'Cross-site writes are blocked.' });
      if (!req.is('application/json'))
        return res.status(415).json({ error: 'Send application/json.' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '14mb' }));
  let active = 0;
  let admissions = 0;
  const acceptanceLocks = new Map();
  let closing = false;
  const queue = [];
  const executions = new Set();
  async function execute(task) {
    const { job, images } = task;
    const started = performance.now();
    try {
      job.status = 'running';
      await store.save();
      const directory = path.join(dataDir, 'artifacts', job.id);
      await mkdir(directory, { recursive: true });
      let buffers = images;
      if (job.mode === 'url') {
        const saved = job.baselineId
          ? store.state.baselines.find((item) => item.id === job.baselineId)
          : null;
        const baselineBuffer = saved
          ? await readFile(path.join(dataDir, 'artifacts', saved.id, 'baseline.png'))
          : null;
        buffers = await capturePair(job, baselineBuffer);
      }
      const result = comparePngs(buffers[0], buffers[1], job.allowedPercent);
      await Promise.all([
        writeFile(path.join(directory, 'baseline.png'), buffers[0]),
        writeFile(path.join(directory, 'candidate.png'), buffers[1]),
        writeFile(path.join(directory, 'diff.png'), result.diff),
      ]);
      const { diff, ...metrics } = result;
      job.result = metrics;
      job.status = 'complete';
      job.completedAt = new Date().toISOString();
      job.durationMs = Math.round(performance.now() - started);
      console.log(
        `[prism] ${job.id} complete: ${metrics.changedPercent.toFixed(3)}% changed in ${job.durationMs}ms`,
      );
    } catch (error) {
      job.status = 'error';
      job.error = String(error.message).includes("Executable doesn't exist")
        ? 'Chromium is missing. Run npx playwright install chromium, then try again.'
        : String(error.message).slice(0, 500);
      console.error(`[prism] ${job.id} failed: ${job.error}`);
    } finally {
      await store.save();
    }
  }
  function pump() {
    while (!closing && active < concurrency && queue.length) {
      active++;
      const task = queue.shift();
      const promise = execute(task)
        .catch((error) => console.error('[prism] Persistence failed:', error))
        .finally(() => {
          active--;
          executions.delete(promise);
          pump();
        });
      executions.add(promise);
    }
  }
  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, active, queued: queue.length, maxConcurrency: concurrency }),
  );
  app.get('/api/jobs', (_req, res) =>
    res.json({ jobs: store.state.jobs, baselines: store.state.baselines }),
  );
  app.get('/api/jobs/:id', (req, res) => {
    const job = store.state.jobs.find((item) => item.id === req.params.id);
    return job ? res.json(job) : res.status(404).json({ error: 'Comparison not found.' });
  });
  app.post('/api/jobs', async (req, res) => {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    if (queue.length + active + admissions >= 20)
      return res.status(429).json({ error: 'The queue is full. Wait for a comparison to finish.' });
    const input = parsed.data;
    let images;
    if (input.mode === 'upload') {
      try {
        if (
          ![input.baselinePng, input.candidatePng].every((value) =>
            /^[A-Za-z0-9+/]+={0,2}$/.test(value),
          )
        )
          throw new Error('Invalid PNG encoding.');
        images = [
          Buffer.from(input.baselinePng, 'base64'),
          Buffer.from(input.candidatePng, 'base64'),
        ];
        const decoded = images.map(readPng);
        if (decoded[0].width !== decoded[1].width || decoded[0].height !== decoded[1].height)
          throw new Error('Images must have matching dimensions.');
        input.viewport = { width: decoded[0].width, height: decoded[0].height };
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }
    if (input.baselineId) {
      const baseline = store.state.baselines.find((item) => item.id === input.baselineId);
      if (!baseline) return res.status(400).json({ error: 'Saved baseline not found.' });
      if (!viewportSchema.safeParse(baseline.viewport).success)
        return res.status(400).json({
          error:
            'This saved image is outside URL viewport limits (320–1920 × 240–1200). Compare PNGs with matching dimensions instead.',
        });
      input.viewport = baseline.viewport;
      input.baselineUrl = baseline.sourceUrl;
    }
    const { baselinePng, candidatePng, ...safeInput } = input;
    const job = {
      id: randomUUID(),
      ...safeInput,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    admissions++;
    try {
      store.state.jobs.unshift(job);
      await store.save();
      queue.push({ job, images });
    } finally {
      admissions--;
    }
    pump();
    return res.status(202).json(job);
  });
  app.post('/api/jobs/:id/accept', async (req, res) => {
    const job = store.state.jobs.find((item) => item.id === req.params.id);
    if (!job || job.status !== 'complete')
      return res.status(409).json({ error: 'Only a completed comparison can become a baseline.' });
    if (job.acceptedBaselineId)
      return res.json(store.state.baselines.find((item) => item.id === job.acceptedBaselineId));
    if (!acceptanceLocks.has(job.id)) {
      const operation = (async () => {
        const baseline = {
          id: randomUUID(),
          jobId: job.id,
          name: `${job.name} · accepted`,
          sourceUrl: job.candidateUrl || 'Uploaded PNG',
          viewport: { width: job.result.width, height: job.result.height },
          createdAt: new Date().toISOString(),
        };
        const directory = path.join(dataDir, 'artifacts', baseline.id);
        await mkdir(directory, { recursive: true });
        await copyFile(
          path.join(dataDir, 'artifacts', job.id, 'candidate.png'),
          path.join(directory, 'baseline.png'),
        );
        store.state.baselines.unshift(baseline);
        job.acceptedBaselineId = baseline.id;
        await store.save();
        return baseline;
      })();
      acceptanceLocks.set(job.id, operation);
    }
    try {
      return res.status(201).json(await acceptanceLocks.get(job.id));
    } finally {
      acceptanceLocks.delete(job.id);
    }
  });
  app.get('/api/artifacts/:id/:name', (req, res) => {
    const record =
      store.state.jobs.some((item) => item.id === req.params.id && item.status === 'complete') ||
      store.state.baselines.some((item) => item.id === req.params.id);
    if (!record || !['baseline.png', 'candidate.png', 'diff.png'].includes(req.params.name))
      return res.status(404).json({ error: 'Artifact not found.' });
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    return res.sendFile(path.resolve(dataDir, 'artifacts', req.params.id, req.params.name), {
      dotfiles: 'allow',
    });
  });
  app.use('/fonts', express.static(path.join(ROOT, 'public', 'fonts')));
  app.get('/demo/:variant', (req, res) => {
    if (!['baseline', 'candidate'].includes(req.params.variant))
      return res.status(404).send('Demo not found');
    res.type('html').send(demoPage(req.params.variant));
  });
  app.use(express.static(path.join(ROOT, 'dist')));
  app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint not found.' });
    return res.sendFile(path.join(ROOT, 'dist', 'index.html'));
  });
  app.use((error, _req, res, _next) => {
    console.error('[prism]', error.message);
    const status =
      error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({
      error:
        status === 413
          ? 'Upload exceeds the request size limit.'
          : status === 400
            ? 'Invalid JSON request.'
            : 'The server could not complete this request.',
    });
  });
  return {
    app,
    store,
    async close() {
      closing = true;
      await Promise.allSettled([...executions]);
      await store.save();
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4174);
  const instance = await createApplication({
    dataDir: process.env.PRISM_DATA_DIR || path.join(ROOT, '.prism'),
  });
  const server = instance.app.listen(port, '127.0.0.1', () =>
    console.log(`Prism server: http://127.0.0.1:${port}`),
  );
  const stop = async () => {
    server.close();
    await instance.close();
    process.exit(0);
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
