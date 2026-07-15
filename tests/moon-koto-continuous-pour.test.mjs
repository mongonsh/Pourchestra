import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../src/client/scenes/MoonKoto.ts', import.meta.url);
const scene = await readFile(sceneUrl, 'utf8');

function methodSource(start, end) {
  const startIndex = scene.indexOf(start);
  const endIndex = scene.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing method: ${start}`);
  assert.notEqual(endIndex, -1, `Missing method boundary: ${end}`);
  return scene.slice(startIndex, endIndex);
}

test('sand spawning lasts until the room is ready to resolve', () => {
  const update = methodSource(
    'override update(',
    'private createEnvironment()'
  );
  const interval = methodSource(
    'private getSpawnInterval()',
    'private setBridgeInteractivity('
  );

  assert.match(update, /this\.nextSpawnAt \+= this\.getSpawnInterval\(\)/);
  assert.doesNotMatch(update, /this\.nextSpawnAt \+= 18/);
  assert.match(update, /\$\{secondsLeft\}s · DRAG TO STEER/);
  assert.match(interval, /roomDuration - 1_800/);
  assert.match(interval, /grainRows - 1/);

  const roomDurations = [30_000, 32_000, 34_000, 36_000];
  const grainRows = [168, 180, 192, 204];
  for (let room = 0; room < roomDurations.length; room += 1) {
    const duration = roomDurations[room];
    const rows = grainRows[room];
    assert.ok(duration && rows);
    const intervalMs = (duration - 1_800) / (rows - 1);
    const finalReleaseAt = intervalMs * (rows - 1);
    assert.equal(finalReleaseAt, duration - 1_800);
    assert.ok(finalReleaseAt >= 28_200);
  }
});
