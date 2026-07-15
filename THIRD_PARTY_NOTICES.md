# Third-party notices

## Fraunces and Manrope typefaces

The game bundles the Fraunces variable display face and Manrope variable UI
face from the Google Fonts repository so canvas text has the same metrics and
rendering quality across Reddit webviews.

- Source: https://github.com/google/fonts
- License: SIL Open Font License 1.1
- License copies:
  `src/client/assets/fonts/OFL-Fraunces.txt` and
  `src/client/assets/fonts/OFL-Manrope.txt`

## Real sand-pour recording

`src/client/assets/sand-pour-real.wav` is a 12.1-second excerpt from
`pouring sand and salt 2.mp3` by Freesound user `mariethompson`. The recording
captures a dry, continuous stream of real sand and salt with distinct grain
impacts.

- Source: https://freesound.org/people/mariethompson/sounds/516920/
- License: Creative Commons Zero (CC0)
- Original format: 44.1 kHz mono MP3
- Modification: excerpted, gently normalized, edge-faded, and converted to
  48 kHz, 16-bit mono WAV

## FluidR3_GM koto samples

The bridge-rotation plucks in `src/client/assets/koto-*.mp3` are rendered from
the FluidR3_GM soundfont and distributed by the MIDI.js Soundfonts project:

- Source: https://github.com/gleitz/midi-js-soundfonts
- Soundfont license: Creative Commons Attribution 3.0
- License: https://creativecommons.org/licenses/by/3.0/

The game decodes these four samples locally with the Web Audio API. No audio is
fetched from an external service at runtime.
