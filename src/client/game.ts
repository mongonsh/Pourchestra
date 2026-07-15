import * as Phaser from 'phaser';
import { MoonKoto } from './scenes/MoonKoto';

const LOGICAL_WIDTH = 420;
const LOGICAL_HEIGHT = 780;
// Always render the game at 2x and scale the canvas down with CSS. Reddit
// webviews frequently report a 1x device pixel ratio, which made small Phaser
// text and thin glass details look soft on otherwise high-density screens.
const RENDER_SCALE = 2;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#f8f6f0',
  render: {
    antialias: true,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH * RENDER_SCALE,
    height: LOGICAL_HEIGHT * RENDER_SCALE,
  },
  scene: [MoonKoto],
};

function startGame(parent: string): Phaser.Game {
  return new Phaser.Game({ ...config, parent });
}

async function waitForGameFonts(): Promise<void> {
  if (!('fonts' in document)) return;
  await Promise.race([
    Promise.all([
      document.fonts.load('700 24px "Moon Display"'),
      document.fonts.load('700 14px "Moon Sans"'),
    ]),
    new Promise<void>((resolve) => globalThis.setTimeout(resolve, 2_000)),
  ]);
}

document.addEventListener('DOMContentLoaded', async () => {
  await waitForGameFonts();
  const game = startGame('game-container');
  if (new URLSearchParams(globalThis.location.search).has('debug')) {
    Object.defineProperty(globalThis, '__POURCHESTRA_GAME__', {
      value: game,
      configurable: true,
    });
  }
});
