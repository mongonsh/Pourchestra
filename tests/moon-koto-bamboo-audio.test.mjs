import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scene = await readFile(
  new URL('../src/client/scenes/MoonKoto.ts', import.meta.url),
  'utf8'
);
const phaserInput = await readFile(
  new URL('../node_modules/phaser/src/input/InputPlugin.js', import.meta.url),
  'utf8'
);

function methodSource(start, end) {
  const startIndex = scene.indexOf(start);
  const endIndex = scene.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing method: ${start}`);
  assert.notEqual(endIndex, -1, `Missing method boundary: ${end}`);
  return scene.slice(startIndex, endIndex);
}

test('bridge drags use bamboo feedback while tap rotation plays koto', () => {
  const bridges = methodSource(
    'private createBridges()',
    'private finishBridgeGesture('
  );
  const finish = methodSource(
    'private finishBridgeGesture(',
    'private restoreBridgeScale('
  );

  assert.doesNotMatch(bridges, /playBambooSound\(\s*'touch'/);
  assert.match(bridges, /const distance = Phaser\.Math\.Distance\.Between/);
  assert.match(bridges, /const speed = \(distance \/ elapsed\) \* 1_000/);
  assert.match(bridges, /now - bridge\.lastWoodSoundAt >= 72/);
  assert.match(bridges, /playBambooSound\(\s*'friction'/);
  assert.match(finish, /playKotoPluck\(/);
  assert.match(finish, /playBambooSound\(\s*'settle'/);
  assert.match(finish, /Phaser\.Math\.Clamp\(moved \/ 130, 0\.2, 0\.82\)/);
  assert.doesNotMatch(bridges + finish, /playSeaGlass/);
});

test('Phaser dragend cannot consume the pointerup that rotates a bridge', () => {
  const bridges = methodSource(
    'private createBridges()',
    'private finishBridgeGesture('
  );

  assert.match(
    bridges,
    /container\.on\('dragend',[\s\S]*this\.time\.delayedCall\(0,[\s\S]*this\.finishBridgeGesture\(bridge, false\)/
  );
  assert.doesNotMatch(
    bridges,
    /container\.on\('dragend', \(\) => \{\s*this\.finishBridgeGesture\(bridge, false\);\s*\}\)/
  );
  const mouseUp = phaserInput.slice(
    phaserInput.indexOf('case CONST.MOUSE_UP:'),
    phaserInput.indexOf('case CONST.TOUCH_START:')
  );
  assert.ok(
    mouseUp.indexOf('processDragUpEvent(pointer)') <
      mouseUp.indexOf('processUpEvents(pointer)'),
    'Phaser must dispatch dragend before pointerup for this regression to apply'
  );
});

test('sand impacts excite the bridge without creating an audio machine gun', () => {
  const collision = methodSource(
    'private collideBridge(',
    'private registerSongHit('
  );

  assert.match(collision, /const impactSpeed = Math\.abs/);
  assert.match(collision, /impactSpeed > 72/);
  assert.match(collision, /time - bridge\.lastWoodSoundAt > 145/);
  assert.match(collision, /playBambooSound\(\s*'impact'/);
  assert.match(collision, /Phaser\.Math\.Clamp\(impactSpeed \/ 520/);
});

test('bamboo timbre follows angle, bridge identity, intensity, and stereo position', () => {
  const audio = methodSource(
    'private synthesizeBambooSound(',
    'private playTypewriterTick('
  );

  assert.match(audio, /type BambooSoundKind|kind: BambooSoundKind/);
  assert.match(audio, /safeBridge \* 21/);
  assert.match(audio, /Math\.abs\(angle\) \* 0\.52/);
  assert.match(
    audio,
    /const pan = Phaser\.Math\.Clamp\(\(x \/ WIDTH\) \* 2 - 1/
  );
  assert.match(audio, /kind === 'friction'/);
  assert.match(audio, /kind === 'settle'/);
  assert.match(audio, /kind === 'impact'/);
  assert.match(audio, /noiseFilter\.type = 'bandpass'/);
  assert.match(audio, /body\.type = 'triangle'/);
  assert.match(audio, /overtone\.frequency\.value/);
});

test('the first koto click waits for browser audio and sample loading', () => {
  const audio = methodSource(
    'private playKotoPluck(',
    'private playBambooSound('
  );

  assert.match(audio, /context\.state === 'suspended'/);
  assert.match(audio, /context\s*\.resume\(\)\s*\.then/);
  assert.match(audio, /this\.kotoSamplesLoading/);
  assert.match(audio, /this\.playKotoPluck\(/);
  assert.match(audio, /context\.createBufferSource\(\)/);
  assert.match(audio, /source\.buffer = sample/);
  assert.match(audio, /if \(context\.state === 'running'\)/);
});

test('koto pitch changes with both bridge identity and bridge angle', () => {
  const audio = methodSource(
    'private playKotoPluck(',
    'private playBambooSound('
  );

  assert.match(audio, /const angleStep = Math\.round\(\(angle \+ 75\) \/ 30\)/);
  assert.match(audio, /\(angleStep \+ safeBridge\) % KOTO_SAMPLE_URLS\.length/);
  assert.match(audio, /source\.playbackRate\.value/);
});

test('real koto samples use a warm quiet bus with a natural tail', () => {
  const pluck = methodSource(
    'private playKotoPluck(',
    'private getKotoAudioBus('
  );
  const bus = methodSource(
    'private getKotoAudioBus(',
    'private playBambooSound('
  );

  assert.match(pluck, /source\.buffer = sample/);
  assert.match(pluck, /source\.playbackRate\.value = 1/);
  assert.match(pluck, /Math\.min\(2\.85, sample\.duration\)/);
  assert.match(pluck, /const peak = 0\.07 \+ energy \* 0\.03/);
  assert.match(pluck, /const attack = 0\.026/);
  assert.match(pluck, /const tailFade = 0\.55/);
  assert.match(pluck, /lowpass\.frequency\.value = 2_800 \+ energy \* 500/);
  assert.match(pluck, /-0\.45,\s*0\.45/);
  assert.match(pluck, /gain\.gain\.linearRampToValueAtTime\(peak/);
  assert.match(pluck, /\.connect\(kotoBus\)/);
  assert.doesNotMatch(pluck, /createOscillator/);

  assert.match(bus, /context\.createDynamicsCompressor\(\)/);
  assert.match(bus, /softener\.type = 'highshelf'/);
  assert.match(bus, /softener\.gain\.value = -5\.5/);
  assert.match(bus, /warmth\.type = 'peaking'/);
  assert.match(bus, /roomDelay\.delayTime\.value = 0\.065/);
  assert.match(bus, /roomGain\.gain\.value = 0\.075/);
  assert.match(bus, /compressor\.ratio\.value = 3\.5/);
});
