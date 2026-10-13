import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { createApplication } from '../server/index.mjs';
async function setup(concurrency = 2, dataDir) {
  dataDir ||= await mkdtemp(path.join(tmpdir(), 'prism-test-'));
  const instance = await createApplication({ dataDir, concurrency });
  const server = instance.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    ...instance,
    server,
    base,
    dataDir,
    async stop(remove = true) {
      await new Promise((resolve) => server.close(resolve));
      await instance.close();
      if (remove) await rm(dataDir, { recursive: true, force: true });
    },
  };
}
async function post(base, route, body, headers = {}) {
  const response = await fetch(`${base}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function finished(base, id) {
  const until = Date.now() + 55_000;
  while (Date.now() < until) {
    const job = await (await fetch(`${base}/api/jobs/${id}`)).json();
    if (job.status === 'complete' || job.status === 'error') return job;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Job did not finish within its timeout.');
}
function smallPng() {
  const png = new PNG({ width: 10, height: 10 });
  png.data.fill(255);
  return PNG.sync.write(png).toString('base64');
}

test(
  'real URL capture → diff → concurrent acceptance → fixed baseline → persisted history',
  { timeout: 120_000 },
  async () => {
    let instance = await setup();
    try {
      const input = {
        name: 'Project settings API test',
        baselineUrl: `${instance.base}/demo/baseline`,
        candidateUrl: `${instance.base}/demo/candidate`,
        viewport: { width: 640, height: 480 },
        allowedPercent: 0,
      };
      const submission = await post(instance.base, '/api/jobs', input);
      assert.equal(submission.status, 202);
      const job = await finished(instance.base, submission.body.id);
      assert.equal(job.status, 'complete', job.error);
      assert.equal(job.result.passed, false);
      assert.ok(job.result.changedPixels > 1000);
      const png = await fetch(`${instance.base}/api/artifacts/${job.id}/diff.png`);
      assert.equal(png.status, 200);
      assert.match(png.headers.get('content-type'), /image\/png/);
      assert.ok((await png.arrayBuffer()).byteLength > 1000);
      const accepted = await Promise.all(
        Array.from({ length: 8 }, () => post(instance.base, `/api/jobs/${job.id}/accept`, {})),
      );
      assert.ok(accepted.every((item) => item.status === 201 || item.status === 200));
      assert.equal(
        new Set(accepted.map((item) => item.body.id)).size,
        1,
        'Acceptance is idempotent under concurrency',
      );
      assert.equal(instance.store.state.baselines.length, 1);
      const reference = accepted[0].body;
      const second = await post(instance.base, '/api/jobs', {
        ...input,
        baselineId: reference.id,
        viewport: { width: 1280, height: 800 },
        candidateUrl: `${instance.base}/demo/candidate`,
      });
      const zero = await finished(instance.base, second.body.id);
      assert.equal(zero.status, 'complete', zero.error);
      assert.equal(zero.result.changedPixels, 0);
      assert.equal(zero.result.passed, true);
      assert.deepEqual(zero.viewport, { width: 640, height: 480 });
      const original = await readFile(
        path.join(instance.dataDir, 'artifacts', job.id, 'baseline.png'),
      );
      const fixed = await readFile(
        path.join(instance.dataDir, 'artifacts', reference.id, 'baseline.png'),
      );
      assert.notDeepEqual(original, fixed, 'Accept does not overwrite original baseline');
      const directory = instance.dataDir;
      await instance.stop(false);
      instance = await setup(2, directory);
      const history = await (await fetch(`${instance.base}/api/jobs`)).json();
      assert.equal(history.jobs.length, 2);
      assert.equal(history.baselines.length, 1);
      assert.equal(history.jobs[0].result.changedPixels, 0);
    } finally {
      await instance.stop();
    }
  },
);

test('URL and upload validation, origin protection, and bounded admission under concurrent requests', async () => {
  const instance = await setup(0);
  try {
    const png = smallPng();
    const valid = { name: 'Upload', mode: 'upload', baselinePng: png, candidatePng: png };
    assert.equal(
      (
        await post(instance.base, '/api/jobs', {
          baselineUrl: 'file:///etc/passwd',
          candidateUrl: 'https://example.com',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(instance.base, '/api/jobs', {
          baselineUrl: 'https://user:password@example.com',
          candidateUrl: 'https://example.com',
        })
      ).status,
      400,
    );
    assert.equal(
      (await post(instance.base, '/api/jobs', { ...valid, baselinePng: 'a'.repeat(40) })).status,
      400,
    );
    assert.equal(
      (await post(instance.base, '/api/jobs', valid, { Origin: 'https://malicious.example' }))
        .status,
      403,
    );
    const results = await Promise.all(
      Array.from({ length: 30 }, () => post(instance.base, '/api/jobs', valid)),
    );
    assert.equal(results.filter((item) => item.status === 202).length, 20);
    assert.equal(results.filter((item) => item.status === 429).length, 10);
    assert.equal(instance.store.state.jobs.length, 20);
  } finally {
    await instance.stop();
  }
});

test('PNG upload produces a real comparison and interrupted jobs are recovered on startup', async () => {
  let instance = await setup();
  try {
    const png = smallPng();
    const submitted = await post(instance.base, '/api/jobs', {
      mode: 'upload',
      name: 'Same PNG',
      baselinePng: png,
      candidatePng: png,
      allowedPercent: 0,
    });
    const job = await finished(instance.base, submitted.body.id);
    assert.equal(job.status, 'complete', job.error);
    assert.equal(job.result.changedPixels, 0);
    assert.equal(job.result.totalPixels, 100);
    instance.store.state.jobs[0].status = 'running';
    await instance.store.save();
    const directory = instance.dataDir;
    await instance.stop(false);
    instance = await setup(2, directory);
    assert.equal(instance.store.state.jobs[0].status, 'error');
    assert.match(instance.store.state.jobs[0].error, /server stopped/);
  } finally {
    await instance.stop();
  }
});
