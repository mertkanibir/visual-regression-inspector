import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { comparePngs, readPng } from '../server/compare.mjs';
export function image(width = 10, height = 10, color = [255, 255, 255, 255]) {
  const png = new PNG({ width, height });
  for (let index = 0; index < png.data.length; index += 4) png.data.set(color, index);
  return PNG.sync.write(png);
}
test('identical images have no changed pixels and pass at zero tolerance', () => {
  const result = comparePngs(image(), image(), 0);
  assert.equal(result.changedPixels, 0);
  assert.equal(result.changedPercent, 0);
  assert.equal(result.passed, true);
});
test('a known full-image regression uses the configured percentage tolerance', () => {
  const baseline = image();
  const candidate = image(10, 10, [0, 0, 0, 255]);
  const result = comparePngs(baseline, candidate, 99);
  assert.equal(result.changedPixels, 100);
  assert.equal(result.totalPixels, 100);
  assert.equal(result.changedPercent, 100);
  assert.equal(result.passed, false);
  assert.equal(comparePngs(baseline, candidate, 100).passed, true);
  assert.equal(readPng(result.diff).width, 10);
});
test('dimension differences and invalid tolerances produce actionable errors', () => {
  assert.throws(() => comparePngs(image(), image(9, 10)), /Image sizes differ/);
  assert.throws(() => comparePngs(image(), image(), NaN), /Allowed change/);
  assert.throws(() => comparePngs(image(), image(), -1), /Allowed change/);
});
test('PNG type, byte, pixel limits are checked before decoding', () => {
  assert.throws(() => readPng(Buffer.from('not a png')), /valid PNG/);
  assert.throws(() => readPng(Buffer.alloc(5_000_001)), /5 MB/);
  const png = image();
  png.writeUInt32BE(4_000_000, 16);
  assert.throws(() => readPng(png), /3 million pixels/);
});
