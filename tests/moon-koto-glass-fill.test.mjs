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

test('glass packing begins on the inner floor and rises toward the rim', () => {
  const settle = methodSource(
    'private settleParticleInCup(',
    'private getCupPackingPosition('
  );
  const packing = methodSource(
    'private getCupPackingPosition(',
    'private spillParticleToGround('
  );

  assert.match(scene, /const CUP_INNER_FLOOR_Y = CUP_Y \+ 34/);
  assert.match(scene, /const CUP_INNER_RIM_Y = CUP_Y - 35/);
  assert.match(settle, /this\.getCupPackingPosition\(cup, count\)/);
  assert.match(scene, /const GRAINS_PER_STREAM_TICK = 2/);
  assert.match(scene, /const CUP_GRAIN_ROW_HEIGHT = 3\.15/);
  assert.match(packing, /const rowCapacity = 9/);
  assert.match(packing, /const spacing = 4/);
  assert.match(packing, /CUP_INNER_FLOOR_Y - row \* CUP_GRAIN_ROW_HEIGHT/);
  assert.match(packing, /Math\.max\(CUP_INNER_RIM_Y \+ 6, packedY\)/);
});

test('every settled grain is horizontally contained by its glass wall', () => {
  const packing = methodSource(
    'private getCupPackingPosition(',
    'private spillParticleToGround('
  );
  const frameSize = Number(
    scene.match(/const SAND_GRAIN_FRAME_SIZE = ([\d.]+);/)?.[1]
  );
  const scale = Number(
    scene.match(/const CUP_SETTLED_GRAIN_SCALE = ([\d.]+);/)?.[1]
  );
  const innerHalfWidth = Number(
    scene.match(/const CUP_INNER_HALF_WIDTH = ([\d.]+);/)?.[1]
  );
  const grainRadius = (frameSize * scale) / 2;

  assert.ok(Number.isFinite(grainRadius));
  assert.ok(grainRadius < innerHalfWidth);
  assert.match(
    scene,
    /const CUP_PACKING_HALF_WIDTH =\s*CUP_INNER_HALF_WIDTH -\s*\(SAND_GRAIN_FRAME_SIZE \* CUP_SETTLED_GRAIN_SCALE\) \/ 2/
  );
  assert.match(packing, /const targetX = Phaser\.Math\.Clamp\(/);
  assert.match(packing, /cupCenter - CUP_PACKING_HALF_WIDTH/);
  assert.match(packing, /cupCenter \+ CUP_PACKING_HALF_WIDTH/);
});

test('each stream tick emits a dense pair of physical grains', () => {
  const spawn = methodSource('private spawnRow()', 'private getRoomExitSlots()');

  assert.match(
    spawn,
    /for\s*\(\s*let grain = 0;\s*grain < GRAINS_PER_STREAM_TICK;\s*grain \+= 1\s*\)/
  );
  assert.match(spawn, /this\.particles\.push\(/);
});

test('settled grains render behind the glass wall and cannot overflow its rim', () => {
  const vessels = methodSource(
    'private createCupsAndSources()',
    'private createActionDock()'
  );
  const settle = methodSource(
    'private settleParticleInCup(',
    'private getCupPackingPosition('
  );

  assert.match(vessels, /setDepth\(16\)/);
  assert.match(settle, /setDepth\(15\)/);
  assert.match(settle, /scale: CUP_SETTLED_GRAIN_SCALE/);
  assert.match(settle, /x: target\.x/);
  assert.match(settle, /y: target\.y/);
});
