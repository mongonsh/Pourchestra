import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sceneUrl = new URL('../src/client/scenes/MoonKoto.ts', import.meta.url);
const scene = await readFile(sceneUrl, 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const gameHtml = await readFile(
  new URL('../src/client/game.html', import.meta.url),
  'utf8'
);
const splashHtml = await readFile(
  new URL('../src/client/splash.html', import.meta.url),
  'utf8'
);

function methodSource(start, end) {
  const startIndex = scene.indexOf(start);
  const endIndex = scene.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing method: ${start}`);
  assert.notEqual(endIndex, -1, `Missing method boundary: ${end}`);
  return scene.slice(startIndex, endIndex);
}

test('the game presents Pourchestra as its single player-facing brand', () => {
  const hud = methodSource('private createHud()', 'private createBoard()');
  const menu = methodSource('private showGameMenu()', 'private closeGameMenu(');

  assert.match(hud, /'POURCHESTRA'/);
  assert.match(menu, /'POURCHESTRA MENU'/);
  assert.match(scene, /'PLAY KOTO WITH SAND'/);
  assert.match(readme, /^# Pourchestra$/m);
  assert.match(gameHtml, /<title>Pourchestra<\/title>/);
  assert.match(splashHtml, /<title>Pourchestra<\/title>/);
  assert.match(splashHtml, /<h1>POUR<em>CHESTRA<\/em><\/h1>/);

  for (const surface of [scene, readme, gameHtml, splashHtml]) {
    assert.doesNotMatch(surface, /Moon Tide|Moon Sand/i);
  }
});

test('bridge feedback preserves its authored display scale', () => {
  const createBridges = methodSource(
    'private createBridges()',
    'private restoreBridgeScale('
  );
  const restoreBridgeScale = methodSource(
    'private restoreBridgeScale(',
    'private createCupsAndSources()'
  );

  assert.match(createBridges, /const baseScaleX = image\.scaleX/);
  assert.match(createBridges, /const baseScaleY = image\.scaleY/);
  assert.match(createBridges, /scaleX: baseScaleX \* 1\.035/);
  assert.match(createBridges, /scaleY: baseScaleY \* 1\.035/);
  assert.match(createBridges, /new Phaser\.Geom\.Rectangle\(0, 0, 144, 54\)/);
  assert.doesNotMatch(createBridges, /scale[XY]:\s*1\s*[,}]/);
  assert.match(restoreBridgeScale, /scaleX: bridge\.baseScaleX/);
  assert.match(restoreBridgeScale, /scaleY: bridge\.baseScaleY/);
});

test('bridge direction stays adjustable while sand is pouring', () => {
  const createBridges = methodSource(
    'private createBridges()',
    'private finishBridgeGesture('
  );
  const finishGesture = methodSource(
    'private finishBridgeGesture(',
    'private isBridgeAdjustmentPhase()'
  );
  const adjustmentPhase = methodSource(
    'private isBridgeAdjustmentPhase()',
    'private restoreBridgeScale('
  );
  const interactivity = methodSource(
    'private setBridgeInteractivity(',
    'private startPour()'
  );
  const startPour = methodSource('private startPour()', 'private spawnRow()');
  const collision = methodSource(
    'private collideBridge(',
    'private registerSongHit('
  );

  assert.match(
    createBridges,
    /if \(!this\.isBridgeAdjustmentPhase\(\)\) return/
  );
  assert.match(
    createBridges,
    /this\.phase === 'pouring'\) event\.stopPropagation\(\)/
  );
  assert.match(createBridges, /if \(this\.phase !== 'planning'\) return/);
  assert.match(
    finishGesture,
    /if \(!this\.isBridgeAdjustmentPhase\(\)\) return/
  );
  assert.match(
    adjustmentPhase,
    /this\.phase === 'planning' \|\| this\.phase === 'pouring'/
  );
  assert.match(interactivity, /draggable = enabled/);
  assert.match(interactivity, /setDraggable\(bridge\.container, draggable\)/);
  assert.match(startPour, /this\.setBridgeInteractivity\(true, false\)/);
  assert.match(startPour, /TAP BAMBOO ANYTIME/);
  assert.match(collision, /bridge\.container\.angle/);
});

test('primary controls activate on press and always clear pressed state', () => {
  const bindPressButton = methodSource(
    'private bindPressButton(',
    'private destroyOverlay()'
  );
  const actionDock = methodSource(
    'private createActionDock()',
    'private setupInput()'
  );
  const overlayButton = methodSource(
    'private createOverlayButton(',
    'private createOverlayHitZone('
  );
  const overlayHitZone = methodSource(
    'private createOverlayHitZone(',
    'private bindPressButton('
  );

  assert.match(bindPressButton, /hitTarget\.on\('pointerdown'/);
  assert.match(bindPressButton, /onPress\(\)/);
  assert.match(bindPressButton, /hitTarget\.on\('pointerupoutside', reset\)/);
  assert.match(bindPressButton, /hitTarget\.on\('pointerout', reset\)/);
  assert.match(actionDock, /new Phaser\.Geom\.Rectangle\(0, 0, 244, 64\)/);
  assert.match(actionDock, /this\.bindPressButton\(this\.actionButton/);
  assert.match(overlayButton, /this\.createOverlayHitZone\(/);
  assert.match(overlayHitZone, /WIDTH \/ 2 \+ x, HEIGHT \/ 2 \+ y/);
  assert.match(overlayHitZone, /\.setInteractive\(\{ useHandCursor: true \}\)/);
  assert.match(
    overlayHitZone,
    /this\.bindPressButton\(visual, onPress, pressedScale, hitZone\)/
  );
});

test('hamburger opens a real pause menu without consuming the pour timer', () => {
  const hud = methodSource('private createHud()', 'private createBoard()');
  const update = methodSource(
    'override update(time: number, delta: number)',
    'private createEnvironment()'
  );
  const menu = methodSource(
    'private showGameMenu()',
    'private showHowToPlayMenu()'
  );
  const closeMenu = methodSource(
    'private closeGameMenu(',
    'private restartExpedition()'
  );

  assert.match(hud, /this\.showGameMenu\(\)/);
  assert.match(hud, /lineBetween\(-6, -5, 6, -5\)/);
  assert.match(update, /if \(this\.menuOverlay\) return/);
  assert.match(menu, /RESUME EXPEDITION/);
  assert.match(menu, /HOW TO PLAY/);
  assert.match(menu, /SOUND \$\{this\.soundEnabled \? 'ON' : 'OFF'\}/);
  assert.match(menu, /RESTART DAILY QUEST/);
  assert.match(closeMenu, /this\.pourStartedAt \+= pausedFor/);
});

test('four-room win and loss rules and generated song are explicit', () => {
  const hud = methodSource('private createHud()', 'private createBoard()');
  const updateHud = methodSource(
    'private updateHud()',
    'private updateSongPreviewButton()'
  );
  const songPreview = methodSource(
    'private updateSongPreviewButton()',
    'private getTarget()'
  );
  const gameOver = methodSource(
    'private showGameOver(',
    'private showFinale()'
  );
  const finale = methodSource(
    'private showFinale()',
    'private drawConstellation('
  );
  const intro = methodSource(
    'private showIntro()',
    'private createCeremonyOverlay('
  );

  assert.match(scene, /const ROOM_COUNT = 4/);
  assert.match(scene, /'MOON GARDEN'/);
  assert.match(scene, /'BAMBOO RAPIDS'/);
  assert.match(scene, /'SHADOW CAVE'/);
  assert.match(scene, /'SHRINE GUARDIAN'/);
  assert.match(hud, /ROOM 1\/4/);
  assert.match(updateHud, /ROOM \$\{this\.verse \+ 1\}\/\$\{ROOM_COUNT\}/);
  assert.match(updateHud, /NOTE_SHARDS_PER_ROOM/);
  assert.match(updateHud, /♥ \$\{this\.lanterns\}/);
  assert.match(songPreview, /HEAR RESTORED SONG/);
  assert.match(gameOver, /YOU LOST/);
  assert.match(finale, /EXPEDITION\\nCOMPLETE/);
  assert.match(finale, /ALL 4 ROOMS RESTORED/);
  assert.match(finale, /HEAR MY 14s OCEAN/);
  assert.match(intro, /4 ROOMS/);
  assert.match(intro, /3 LIVES/);
  assert.match(intro, /ROOM 1 IS PRACTICE/);
  assert.match(intro, /PLAY TODAY'S SONG/);
});

test('community contribution feedback explains the player impact', () => {
  const finale = methodSource(
    'private showFinale()',
    'private drawConstellation('
  );
  const submit = methodSource(
    'private async submitScore(',
    'private playTypewriterTick('
  );

  assert.match(finale, /ADD MY 8 NOTES TO TODAY'S SONG/);
  assert.match(finale, /YOUR 8 NOTES ARE READY TO JOIN/);
  assert.match(submit, /YOUR 8 NOTES JOINED TODAY'S SONG/);
  assert.match(submit, /YOUR NOTES CHANGED/);
  assert.match(submit, /YOUR NOTES STRENGTHENED/);
  assert.match(submit, /data\.changedBeats\.length/);
});

test('adventure rooms support sensor tilt, touch gravity, notes, and hazards', () => {
  const setupInput = methodSource(
    'private setupInput()',
    'private setupVerse('
  );
  const finishRoom = methodSource(
    'private finishVerse()',
    'private buildPattern()'
  );
  const permission = methodSource(
    'private async requestTiltPermission()',
    'private beginExpedition()'
  );
  const beginExpedition = methodSource(
    'private beginExpedition()',
    'private showIntro()'
  );
  const roomMotion = methodSource(
    'private updateRoomMotion(',
    'private updateParticles('
  );
  const noteCollection = methodSource(
    'private collectNoteRunes(',
    'private applyShadowVortices('
  );
  const vortices = methodSource(
    'private applyShadowVortices(',
    'private consumeParticle('
  );

  assert.match(permission, /DeviceOrientationEvent/);
  assert.match(permission, /requestPermission/);
  assert.match(permission, /addEventListener\('deviceorientation'/);
  assert.match(beginExpedition, /void this\.requestTiltPermission\(\)/);
  assert.doesNotMatch(beginExpedition, /await this\.requestTiltPermission\(\)/);
  assert.ok(
    beginExpedition.indexOf('void this.requestTiltPermission()') <
      beginExpedition.indexOf("this.phase = 'planning'"),
    'sensor permission should start from the user gesture without blocking the menu transition'
  );
  assert.match(setupInput, /touchTiltActive = true/);
  assert.match(setupInput, /\(x - this\.touchStartX\) \/ 88/);
  assert.match(setupInput, /\(y - this\.touchStartY\) \/ 120/);
  assert.match(finishRoom, /score >= target && foundEveryNote/);
  assert.match(noteCollection, /this\.notesCollected \+= 1/);
  assert.match(vortices, /this\.consumeParticle/);
  assert.match(roomMotion, /this\.verse === 1/);
  assert.match(roomMotion, /this\.verse === 3/);
  assert.match(roomMotion, /GUST MOVED/);
});

test('pouring uses dry granular Foley while rewards use ocean audio', () => {
  const startPour = methodSource('private startPour()', 'private spawnRow()');
  const registerSongHit = methodSource(
    'private registerSongHit(',
    'private landParticle('
  );
  const loadSand = methodSource(
    'private async loadSandPourSample(',
    'private playSandPour('
  );
  const sandPour = methodSource(
    'private playSandPour(',
    'private playOceanWave('
  );
  const oceanWave = methodSource(
    'private playOceanWave(',
    'private playSeaGlass('
  );
  const seaGlass = methodSource(
    'private playSeaGlass(',
    'private stopSongPlayback()'
  );
  const playPattern = methodSource('private playPattern(', '\n  }\n}');

  assert.doesNotMatch(startPour, /playOceanWave|playSeaGlass/);
  assert.match(startPour, /this\.playSandPour\(\)/);
  assert.doesNotMatch(registerSongHit, /playSand|playOcean|playSeaGlass/);
  assert.match(loadSand, /fetch\(SAND_POUR_SAMPLE_URL\)/);
  assert.match(loadSand, /context\.decodeAudioData/);
  assert.match(sandPour, /source\.loop = false/);
  assert.match(sandPour, /highpass\.frequency\.value = 110/);
  assert.match(sandPour, /gain\.gain\.exponentialRampToValueAtTime\(0\.22/);
  assert.doesNotMatch(sandPour, /lowpass/);
  assert.doesNotMatch(sandPour, /Math\.random|context\.createBuffer\(/);
  assert.match(oceanWave, /context\.createBuffer/);
  assert.match(oceanWave, /brown = \(brown \+ white \* 0\.018\)/);
  assert.match(oceanWave, /lowpass\.frequency\.value = 820/);
  assert.match(seaGlass, /SEA_GLASS_FREQUENCIES/);
  assert.match(seaGlass, /primary\.type = 'sine'/);
  assert.match(playPattern, /this\.playOceanWave/);
  assert.match(playPattern, /this\.playSeaGlass/);
  assert.match(scene, /KOTO_SAMPLE_URLS/);
  assert.match(scene, /private playKotoPluck\(/);
  assert.doesNotMatch(playPattern, /playKotoPluck/);
  assert.doesNotMatch(scene, /playWaterDrop/);
  assert.doesNotMatch(scene, /playSandGrain/);
});
