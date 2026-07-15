import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const game = await readFile(
  new URL('../src/client/game.ts', import.meta.url),
  'utf8'
);
const gameCss = await readFile(
  new URL('../src/client/game.css', import.meta.url),
  'utf8'
);
const splashCss = await readFile(
  new URL('../src/client/splash.css', import.meta.url),
  'utf8'
);
const scene = await readFile(
  new URL('../src/client/scenes/MoonKoto.ts', import.meta.url),
  'utf8'
);
const displayFont = await readFile(
  new URL('../src/client/assets/fonts/Fraunces-Variable.ttf', import.meta.url)
);
const uiFont = await readFile(
  new URL('../src/client/assets/fonts/Manrope-Variable.ttf', import.meta.url)
);
const natureBackground = await readFile(
  new URL(
    '../src/client/assets/moon-koto/moon-garden-sakura-bg.webp',
    import.meta.url
  )
);

test('the canvas always renders at 2x after the bundled fonts are ready', () => {
  assert.match(game, /const RENDER_SCALE = 2/);
  assert.match(game, /async function waitForGameFonts/);
  assert.match(game, /document\.fonts\.load\('700 24px "Moon Display"'\)/);
  assert.match(game, /document\.fonts\.load\('700 14px "Moon Sans"'\)/);
  assert.ok(
    game.indexOf('await waitForGameFonts()') <
      game.indexOf("const game = startGame('game-container')"),
    'Phaser must start after the display and UI fonts load'
  );
});

test('both game surfaces use the same bundled display and UI typefaces', () => {
  for (const css of [gameCss, splashCss]) {
    assert.match(css, /font-family: 'Moon Display'/);
    assert.match(css, /Fraunces-Variable\.ttf/);
    assert.match(css, /font-family: 'Moon Sans'/);
    assert.match(css, /Manrope-Variable\.ttf/);
  }
  assert.match(scene, /const DISPLAY_FONT = '"Moon Display"/);
  assert.match(scene, /const UI_FONT = '"Moon Sans"/);
  assert.doesNotMatch(scene, /fontSize: '[78]px'/);
});

test('the bundled font assets are valid, non-placeholder TrueType files', () => {
  assert.equal(displayFont.readUInt32BE(0), 0x00010000);
  assert.equal(uiFont.readUInt32BE(0), 0x00010000);
  assert.ok(displayFont.byteLength > 300_000);
  assert.ok(uiFont.byteLength > 150_000);
});

test('the game uses a detailed Japanese spring landscape without hiding it', () => {
  assert.match(scene, /moon-garden-sakura-bg\.webp/);
  assert.equal(natureBackground.toString('ascii', 0, 4), 'RIFF');
  assert.equal(natureBackground.toString('ascii', 8, 12), 'WEBP');
  assert.ok(
    natureBackground.byteLength > 100_000,
    'the scenic background should retain enough detail for a high-quality mobile render'
  );
  assert.match(scene, /\.fillStyle\(0x050817, 0\.76\)/);
});

test('ocean-blue overlay buttons keep readable ivory text after highlighting', () => {
  const colorMatch = scene.match(/const OVERLAY_OCEAN_BUTTON = (0x[\da-f]+);/i);
  assert.ok(colorMatch, 'expected a dedicated dark ocean button color');

  const buttonColor = Number(colorMatch[1]);
  const highlightedColor =
    Math.min(255, ((buttonColor >> 16) & 0xff) + 31) * 0x10000 +
    Math.min(255, ((buttonColor >> 8) & 0xff) + 31) * 0x100 +
    Math.min(255, (buttonColor & 0xff) + 31);
  const labelColor = 0xfff8e8;
  const luminance = (color) => {
    const channels = [
      (color >> 16) & 0xff,
      (color >> 8) & 0xff,
      color & 0xff,
    ].map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const lighter = Math.max(luminance(labelColor), luminance(highlightedColor));
  const darker = Math.min(luminance(labelColor), luminance(highlightedColor));

  assert.ok(
    (lighter + 0.05) / (darker + 0.05) >= 4.5,
    'highlighted ocean button must meet WCAG AA contrast'
  );
  assert.ok(
    (scene.match(/OVERLAY_OCEAN_BUTTON/g) ?? []).length >= 6,
    'all light-blue overlay actions should use the dark ocean surface'
  );
});
