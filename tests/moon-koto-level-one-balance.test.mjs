import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../src/client/scenes/MoonKoto.ts', import.meta.url);
const scene = await readFile(sceneUrl, 'utf8');

function sourceBetween(start, end) {
  const startIndex = scene.indexOf(start);
  const endIndex = scene.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source boundary: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source boundary: ${end}`);
  return scene.slice(startIndex, endIndex);
}

test('level one is a forgiving practice room with aligned colors', () => {
  const setup = sourceBetween(
    'private setupVerse(resetBridges: boolean)',
    'private createPegLayout()'
  );

  assert.match(scene, /const VERSE_TARGETS = \[35, 62, 66, 70\]/);
  assert.match(scene, /PRACTICE · FIND 3 NOTES · GUIDE COLORS HOME/);
  assert.match(setup, /this\.verse === 0/);
  assert.match(setup, /\? \[0, 1, 2, 3\]/);
});

test('the daily Reddit song is the opening hook rather than a hidden reward', () => {
  const intro = sourceBetween(
    'private showIntro()',
    'private createCommunitySongPreview('
  );
  const communityPreview = sourceBetween(
    'private createCommunitySongPreview(',
    'private createCeremonyOverlay('
  );

  assert.match(intro, /ONE SONG · BUILT BY REDDIT/);
  assert.match(intro, /PLAY TODAY'S SONG/);
  assert.match(intro, /BUILD TODAY'S REDDIT SONG/);
  assert.match(intro, /4 ROOMS/);
  assert.match(communityPreview, /this\.state\.chorus/);
  assert.match(communityPreview, /MORE UNLOCK/);
  assert.match(communityPreview, /'♪'/);
});

test('level one starts with a forecast-verified winning bridge arrangement', () => {
  const roomBridges = sourceBetween(
    'const ROOM_BRIDGES = [',
    'const NOTE_LABELS'
  );
  const createBridges = sourceBetween(
    'private createBridges()',
    'private restoreBridgeScale('
  );

  assert.match(roomBridges, /\{ x: 159, y: 359, angle: 75 \}/);
  assert.match(roomBridges, /\{ x: 281, y: 334, angle: 45 \}/);
  assert.match(roomBridges, /\{ x: 236, y: 247, angle: -45 \}/);
  assert.match(createBridges, /const initial = ROOM_BRIDGES\[0\]/);
});
