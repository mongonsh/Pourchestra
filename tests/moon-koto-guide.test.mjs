import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scene = await readFile(
  new URL('../src/client/scenes/MoonKoto.ts', import.meta.url),
  'utf8'
);
const splash = await readFile(
  new URL('../src/client/splash.html', import.meta.url),
  'utf8'
);
const renderScript = await readFile(
  new URL('../tools/render_moon_koto_assets.py', import.meta.url),
  'utf8'
);
const guidePng = await readFile(
  new URL(
    '../src/client/assets/moon-koto/reddit-koto-guide.png',
    import.meta.url
  )
);
const guideWebp = await readFile(
  new URL(
    '../src/client/assets/moon-koto/reddit-koto-guide.webp',
    import.meta.url
  )
);

test('the fox is replaced everywhere by a kimono Snoo holding a koto', () => {
  assert.match(scene, /reddit-koto-guide/);
  assert.match(scene, /5-SECOND PRACTICE DROP/);
  assert.doesNotMatch(scene, /moon-fox|FOX FIELD NOTES|FOX WIND/);
  assert.match(splash, /reddit-koto-guide\.webp/);
  assert.match(splash, /Reddit robot in a kimono holding a koto/);
  assert.doesNotMatch(splash, /moon-fox|Moon fox/);
  assert.match(renderScript, /Snoo antenna/);
  assert.match(renderScript, /Kimono robe/);
  assert.match(renderScript, /Koto silk string/);
  assert.match(renderScript, /Koto movable bridge/);
});

test('the new guide is a high-resolution transparent game sprite', () => {
  assert.equal(guidePng.toString('ascii', 1, 4), 'PNG');
  assert.equal(guidePng.readUInt32BE(16), 768);
  assert.equal(guidePng.readUInt32BE(20), 768);
  assert.equal(guidePng[25], 6, 'PNG color type 6 must preserve RGBA alpha');
  assert.equal(guideWebp.toString('ascii', 0, 4), 'RIFF');
  assert.equal(guideWebp.toString('ascii', 8, 12), 'WEBP');
});
