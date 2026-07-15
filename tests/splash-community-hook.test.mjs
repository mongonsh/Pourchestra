import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const htmlUrl = new URL('../src/client/splash.html', import.meta.url);
const scriptUrl = new URL('../src/client/splash.ts', import.meta.url);
const cssUrl = new URL('../src/client/splash.css', import.meta.url);

const [html, script, css] = await Promise.all([
  readFile(htmlUrl, 'utf8'),
  readFile(scriptUrl, 'utf8'),
  readFile(cssUrl, 'utf8'),
]);

test('the Reddit feed card leads with the collective song hook', () => {
  assert.match(html, /LIVE · ONE DAILY REDDIT SONG/);
  assert.match(html, /Every winner adds an eight-note/);
  assert.match(html, /ADD YOUR 8 NOTES/);
  assert.match(html, /TODAY'S COMMUNITY SONG/);
  assert.match(html, /id="community-count"/);
  assert.match(html, /id="reset-label"/);
});

test('the feed card loads live community progress and uses mineral grains', () => {
  assert.match(script, /fetch\('\/api\/init'\)/);
  assert.match(script, /state\.playerCount/);
  assert.match(script, /formatReset\(state\.resetAt\)/);
  assert.match(css, /sand-grains-atlas\.png/);
  assert.match(css, /\.mineral-sand i/);
  assert.doesNotMatch(html, /3 LEVELS|star-sand|musical bowls/);
});

test('the feed thumbnail previews four high-resolution half-filled glasses', () => {
  for (let glass = 0; glass < 4; glass += 1) {
    assert.match(html, new RegExp(`preview-glass-${glass}\\.webp`));
  }

  assert.equal((html.match(/data-fill="half"/g) ?? []).length, 4);
  assert.equal((html.match(/class="preview-glass [^"]+"/g) ?? []).length, 4);
  assert.equal((html.match(/class="preview-sand"/g) ?? []).length, 4);
  assert.match(css, /\.glasses \.preview-glass/);
  assert.match(css, /height: 39%/);
  assert.doesNotMatch(html, /moon-bowl-[0-3]\.webp/);
});
