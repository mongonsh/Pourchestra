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

test('glass dispensers and matching collection tanks have distinct roles', () => {
  const preload = methodSource('preload(): void', 'create(): void');
  const vessels = methodSource(
    'private createCupsAndSources()',
    'private createActionDock()'
  );
  const sourceOrder = methodSource(
    'private updateSourceOrder()',
    'private drawRouteForecast()'
  );

  assert.match(scene, /moon-tap-0\.webp/);
  assert.match(preload, /this\.load\.image\(`moon-tap-\$\{index\}`/);
  assert.match(vessels, /`moon-tap-\$\{index\}`/);
  assert.match(vessels, /`moon-bowl-\$\{index\}`/);
  assert.doesNotMatch(vessels, /setFlipY/);
  assert.match(sourceOrder, /setTexture\(`moon-tap-\$\{color\}`\)/);
});

test('planning forecast updates while bridges move and predicts both goals', () => {
  const bridges = methodSource(
    'private createBridges()',
    'private restoreBridgeScale('
  );
  const forecast = methodSource(
    'private drawRouteForecast()',
    'private simulateForecastRoute('
  );
  const simulation = methodSource(
    'private simulateForecastRoute(',
    'private updateHud()'
  );
  const startPour = methodSource('private startPour()', 'private spawnRow()');

  assert.match(bridges, /this\.drawRouteForecast\(\)/);
  assert.match(forecast, /this\.simulateForecastRoute\(stream\)/);
  assert.match(forecast, /colorsHome === COLOR_COUNT/);
  assert.match(forecast, /predictedNotes\.size === NOTE_SHARDS_PER_ROOM/);
  assert.match(forecast, /POUR PERFECT PATH  ▶/);
  assert.match(forecast, /TAP BAMBOO TO ROTATE/);
  assert.match(simulation, /this\.getDestinationX\(color\)/);
  assert.match(simulation, /for \(const peg of this\.pegs\)/);
  assert.match(simulation, /for \(const bridge of this\.bridges\)/);
  assert.match(simulation, /Math\.hypot\(x - rune\.x, y - rune\.y\) <= 30/);
  assert.match(startPour, /this\.forecastLayer\.clear\(\)/);
});
