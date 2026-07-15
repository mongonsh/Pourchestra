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

test('all four color-matched cups remain visible in every adventure room', () => {
  const configure = methodSource(
    'private configureRoomExits()',
    'private updateSourceOrder()'
  );
  const exits = methodSource(
    'private getRoomExitSlots()',
    'private getDestinationX('
  );

  assert.match(configure, /for \(let cup = 0; cup < COLOR_COUNT; cup \+= 1\)/);
  assert.match(configure, /setTexture\(`moon-bowl-\$\{cup\}`\)/);
  assert.match(
    configure,
    /setDisplaySize\(CUP_DISPLAY_SIZE, CUP_DISPLAY_SIZE\)/
  );
  assert.doesNotMatch(configure, /setVisible\(false\)/);
  assert.match(exits, /return CUP_CENTERS\.map/);
  assert.match(exits, /color === cup/);
  assert.doesNotMatch(exits, /if \(this\.verse/);
});

test('correct sand settles in cups while misses build visible ground piles', () => {
  const landing = methodSource(
    'private landParticle(',
    'private settleParticleInCup('
  );
  const settle = methodSource(
    'private settleParticleInCup(',
    'private spillParticleToGround('
  );
  const spill = methodSource(
    'private spillParticleToGround(',
    'private updateCupStatus()'
  );

  assert.match(landing, /this\.settleParticleInCup\(particle, cup, rescued\)/);
  assert.match(landing, /this\.spillParticleToGround\(particle\)/);
  assert.doesNotMatch(landing, /particle\.sprite\.destroy\(\)/);
  assert.match(settle, /CUP_CENTERS\[cup\]/);
  assert.match(settle, /setDepth\(15\)/);
  assert.match(spill, /SPILL_CENTERS/);
  assert.match(spill, /this\.spillPileCounts\[gap\] = count/);
  assert.match(spill, /onComplete: \(\) => particle\.sprite\.setDepth\(13\)/);
});

test('wrong sand does not count as cup contents or animate a cup', () => {
  const landing = methodSource(
    'private landParticle(',
    'private settleParticleInCup('
  );

  assert.ok(
    landing.indexOf('this.cupTotals[cup]') > landing.indexOf('if (correct)'),
    'cup totals should only increase inside the correct branch'
  );
  assert.match(
    landing,
    /const cupImage = correct \? this\.cupImages\[cup\] : undefined/
  );
  assert.match(landing, /if \(correct && time -/);
});
