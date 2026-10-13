import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const MAX_PIXELS = 3_000_000;
export const MAX_PNG_BYTES = 5_000_000;

export function readPng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > MAX_PNG_BYTES)
    throw new Error('PNG files must be at most 5 MB.');
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    buffer.length < 33 ||
    !buffer.subarray(0, 8).equals(signature) ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  )
    throw new Error('Please upload a valid PNG file.');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height || width * height > MAX_PIXELS)
    throw new Error('Images must contain at most 3 million pixels.');
  try {
    return PNG.sync.read(buffer, { checkCRC: true });
  } catch {
    throw new Error('Unable to decode PNG. The file may be damaged.');
  }
}

export function comparePngs(baselineBuffer, candidateBuffer, allowedPercent = 0.5) {
  if (!Number.isFinite(allowedPercent) || allowedPercent < 0 || allowedPercent > 100)
    throw new Error('Allowed change must be between 0 and 100%.');
  const baseline = readPng(baselineBuffer);
  const candidate = readPng(candidateBuffer);
  if (baseline.width !== candidate.width || baseline.height !== candidate.height)
    throw new Error(
      `Image sizes differ: baseline ${baseline.width}×${baseline.height}, candidate ${candidate.width}×${candidate.height}. Use matching dimensions.`,
    );
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const changedPixels = pixelmatch(
    baseline.data,
    candidate.data,
    diff.data,
    baseline.width,
    baseline.height,
    {
      threshold: 0.1,
      includeAA: false,
      alpha: 0.18,
      diffColor: [243, 74, 100],
      aaColor: [247, 204, 88],
    },
  );
  const totalPixels = baseline.width * baseline.height;
  const changedPercent = (changedPixels / totalPixels) * 100;
  return {
    diff: PNG.sync.write(diff),
    changedPixels,
    totalPixels,
    changedPercent,
    passed: changedPercent <= allowedPercent,
    width: baseline.width,
    height: baseline.height,
  };
}
