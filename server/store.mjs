import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function createStore(directory) {
  await mkdir(path.join(directory, 'artifacts'), { recursive: true });
  const file = path.join(directory, 'state.json');
  let state;
  try {
    state = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Cannot read saved history: ${error.message}`);
    state = { version: 1, jobs: [], baselines: [] };
  }
  if (state.version !== 1 || !Array.isArray(state.jobs) || !Array.isArray(state.baselines))
    throw new Error('Saved history has an unsupported format.');
  let pending = Promise.resolve();
  const save = () => {
    const snapshot = JSON.stringify(state, null, 2);
    // A failed save rejects its caller but must not poison later queued writes.
    pending = pending
      .catch(() => {})
      .then(async () => {
        await writeFile(`${file}.tmp`, snapshot);
        await rename(`${file}.tmp`, file);
      });
    return pending;
  };
  let recovered = false;
  for (const job of state.jobs) {
    if (job.status === 'running' || job.status === 'queued') {
      job.status = 'error';
      job.error = 'The server stopped before this comparison finished. Run it again.';
      recovered = true;
    }
  }
  if (recovered) await save();
  return { state, save, directory };
}
