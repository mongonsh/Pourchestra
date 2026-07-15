import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../src/client/scenes/MoonKoto.ts', import.meta.url);
const atlasUrl = new URL(
  '../src/client/assets/moon-koto/sand-grains-atlas.png',
  import.meta.url
);
const scene = await readFile(sceneUrl, 'utf8');

function methodSource(start, end) {
  const startIndex = scene.indexOf(start);
  const endIndex = scene.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing method: ${start}`);
  assert.notEqual(endIndex, -1, `Missing method boundary: ${end}`);
  return scene.slice(startIndex, endIndex);
}

test('falling sand uses the generated realistic single-grain atlas', async () => {
  const preload = methodSource('preload()', 'create()');
  const spawn = methodSource(
    'private spawnRow()',
    'private getRoomExitSlots()'
  );
  const atlas = await readFile(atlasUrl);

  assert.deepEqual(
    [...atlas.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );
  assert.ok(
    atlas.length > 500_000,
    'realistic grain atlas should not be a placeholder'
  );
  assert.match(preload, /load\.spritesheet\('sand-grain'/);
  assert.match(preload, /frameWidth: SAND_GRAIN_FRAME_SIZE/);
  assert.match(spawn, /\.image\(x, y, 'sand-grain', variant\)/);
  assert.match(spawn, /const variant = color \* 4/);
  assert.match(spawn, /const size = 0\.032/);
  assert.match(spawn, /Phaser\.BlendModes\.NORMAL/);
  assert.doesNotMatch(scene, /star-sand|createParticleTextures/);
});

test('sand Foley follows movement density, speed, impacts, and horizontal position', () => {
  const update = methodSource(
    'override update(',
    'private createEnvironment()'
  );
  const physicsAudio = methodSource(
    'private updateSandPhysicsAudio(',
    'private async loadSandPourSample('
  );
  const impacts = methodSource(
    'private registerSandImpact(',
    'private collectNoteRunes('
  );
  const collisions = methodSource(
    'private collidePeg(',
    'private registerSongHit('
  );
  const landing = methodSource(
    'private landParticle(',
    'private settleParticleInCup('
  );

  assert.match(update, /this\.updateSandPhysicsAudio\(delta\)/);
  assert.match(physicsAudio, /Math\.hypot\(particle\.vx, particle\.vy\)/);
  assert.match(physicsAudio, /activeCount \/ 95/);
  assert.match(physicsAudio, /this\.sandImpactEnergy/);
  assert.match(physicsAudio, /gain\.gain\.setTargetAtTime/);
  assert.match(physicsAudio, /panner\.pan\.setTargetAtTime/);
  assert.match(physicsAudio, /playbackRate\.setTargetAtTime/);
  assert.match(impacts, /speed \/ 620/);
  assert.match(impacts, /\(x - WIDTH \/ 2\)/);
  assert.match(impacts, /this\.emitImpactFoley\(speed, x, pan\)/);
  assert.match(impacts, /nowMs - this\.lastSandImpactSoundAt < 32/);
  assert.match(impacts, /source\.start\(now, offset, duration\)/);
  assert.match(impacts, /gain\.gain\.linearRampToValueAtTime/);
  assert.match(collisions, /this\.registerSandImpact/);
  assert.match(landing, /this\.registerSandImpact\(Math\.abs\(particle\.vy\)/);
});

test('begin flow types the rules and then plays a room reveal animation', () => {
  const begin = methodSource(
    'private beginExpedition()',
    'private showInstructionPopup()'
  );
  const tutorial = methodSource(
    'private showInstructionPopup()',
    'private showRoomStartAnimation()'
  );
  const roomStart = methodSource(
    'private showRoomStartAnimation()',
    'private showIntro()'
  );
  const typingAudio = methodSource(
    'private playTypewriterTick(',
    'private ensureAudio()'
  );

  assert.match(begin, /this\.showInstructionPopup\(\)/);
  assert.match(tutorial, /this\.phase = 'tutorial'/);
  assert.match(tutorial, /delay: 24/);
  assert.match(tutorial, /this\.playTypewriterTick\(characterIndex\)/);
  assert.match(tutorial, /ENTER \$\{ROOM_NAMES\[this\.verse\]/);
  assert.match(roomStart, /this\.phase = 'room-start'/);
  assert.match(roomStart, /AWAKENING THE SAND/);
  assert.match(roomStart, /PATH READY · AIM THE BRIDGES/);
  assert.match(roomStart, /this\.phase = 'planning'/);
  assert.match(typingAudio, /mechanicalNoise/);
  assert.match(typingAudio, /highpass\.frequency\.value = 1_050/);
});
