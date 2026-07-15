import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scene = await readFile(
  new URL('../src/client/scenes/MoonKoto.ts', import.meta.url),
  'utf8'
);

function sourceBetween(start, end) {
  const startIndex = scene.indexOf(start);
  const endIndex = scene.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing source boundary: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source boundary: ${end}`);
  return scene.slice(startIndex, endIndex);
}

test('the first screen communicates the fantasy and has one primary action', () => {
  const intro = sourceBetween(
    'private showIntro()',
    'private createCommunitySongPreview('
  );
  const primaryActions = intro.match(/this\.createOverlayButton\(/g) ?? [];

  assert.match(intro, /GUIDE SAND\.\\nPLAY KOTO\./);
  assert.match(intro, /MATCH COLORS · COLLECT 3 NOTES/);
  assert.match(intro, /BUILD TODAY'S REDDIT SONG/);
  assert.match(intro, /PLAY TODAY'S SONG/);
  assert.equal(primaryActions.length, 1);
  assert.doesNotMatch(intro, /HEAR TODAY'S COMMUNITY SONG/);
});

test('the live HUD keeps only room, fill, notes, lives, and menu visible', () => {
  const hud = sourceBetween('private createHud()', 'private createBoard()');
  const updateHud = sourceBetween(
    'private updateHud()',
    'private updateSongPreviewButton()'
  );

  assert.match(hud, /ROOM 1\/4/);
  assert.match(hud, /FILL 0 \/ 35%/);
  assert.match(hud, /NOTES  ♪ 0\/3/);
  assert.match(hud, /♥ 3/);
  assert.match(hud, /new Phaser\.Geom\.Rectangle\(0, 0, 44, 44\)/);
  assert.match(hud, /this\.dayText[\s\S]*?\.setVisible\(false\)/);
  assert.match(hud, /this\.goalText[\s\S]*?\.setVisible\(false\)/);
  assert.match(updateHud, /ROOM \$\{this\.verse \+ 1\}/);
  assert.match(updateHud, /FILL \$\{score\}/);
});

test('the practice drop teaches tap, route, fill, note, and community impact', () => {
  const practice = sourceBetween(
    'private showInstructionPopup()',
    'private showRoomStartAnimation()'
  );

  assert.match(practice, /5-SECOND PRACTICE DROP/);
  assert.match(practice, /TAP THE GLOWING BAMBOO TO TURN THE PATH/);
  assert.match(practice, /drawPracticePath\(false\)/);
  assert.match(practice, /drawPracticePath\(true\)/);
  assert.match(practice, /const grainCount = 30/);
  assert.match(practice, /Math\.floor\(index \/ 8\)/);
  assert.match(practice, /PERFECT · YOUR SAND PLAYED D/);
  assert.match(
    practice,
    /this\.playKotoPluck\(0, WIDTH \/ 2 \+ 97, 0\.68, -75\)/
  );
  assert.match(practice, /YOUR NOTE JOINS TODAY'S REDDIT SONG/);
  assert.match(practice, /ENTER \$\{ROOM_NAMES\[this\.verse\]/);
  assert.match(practice, /this\.createOverlayHitZone\(/);
});

test('the action dock reveals only controls relevant to the current phase', () => {
  const dock = sourceBetween(
    'private createActionDock()',
    'private setupInput()'
  );
  const setup = sourceBetween(
    'private setupVerse(resetBridges: boolean)',
    'private createPegLayout()'
  );
  const pouring = sourceBetween('private startPour()', 'private spawnRow()');

  assert.match(dock, /TAP BAMBOO TO ROTATE · DRAG TO MOVE/);
  assert.match(dock, /this\.windButton[\s\S]*?\.setVisible\(false\)/);
  assert.match(dock, /this\.songPreviewButton[\s\S]*?\.setVisible\(false\)/);
  assert.match(setup, /this\.windButton\.setVisible\(false\)/);
  assert.match(setup, /POUR SAND  ▶/);
  assert.match(pouring, /this\.windButton\.setVisible\(true\)/);
  assert.match(pouring, /DRAG TO STEER/);
  assert.match(pouring, /TAP BAMBOO ANYTIME/);
});
