import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStore } from '../server/store.mjs';

test('a real transient rename failure rejects its caller and later saves recover', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'prism-store-recovery-'));
  try {
    const store = await createStore(directory);
    store.state.jobs = [{ id: 'before', status: 'complete' }];
    await store.save();

    const file = path.join(directory, 'state.json');
    await rm(file);
    await mkdir(file);
    store.state.jobs = [{ id: 'failed', status: 'complete' }];
    await assert.rejects(store.save(), /EISDIR|EEXIST|ENOTEMPTY|directory/i);

    await rm(file, { recursive: true });
    store.state.jobs = [{ id: 'recovered', status: 'complete' }];
    await store.save();
    const reopened = await createStore(directory);
    assert.equal(reopened.state.jobs[0].id, 'recovered');
    assert.equal(reopened.state.version, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('concurrent saves serialize invocation snapshots in order after a failed write', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'prism-store-order-'));
  try {
    const store = await createStore(directory);
    const file = path.join(directory, 'state.json');
    await mkdir(file);
    await assert.rejects(store.save());
    await rm(file, { recursive: true });

    const completed = [];
    const saves = [];
    for (let index = 0; index < 30; index++) {
      store.state.jobs.push({ id: String(index), status: 'complete' });
      saves.push(store.save().then(() => completed.push(index)));
    }
    await Promise.all(saves);
    assert.deepEqual(
      completed,
      Array.from({ length: 30 }, (_, index) => index),
    );
    const persisted = JSON.parse(await readFile(file, 'utf8'));
    assert.deepEqual(
      persisted.jobs.map((job) => job.id),
      Array.from({ length: 30 }, (_, index) => String(index)),
    );
    const reopened = await createStore(directory);
    assert.deepEqual(reopened.state, persisted);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
