import * as Phaser from 'phaser';
import type {
  ChorusPattern,
  ErrorResponse,
  InitResponse,
  SubmitResponse,
} from '../../shared/api';

const WIDTH = 420;
const HEIGHT = 780;
const BOARD_LEFT = 18;
const BOARD_RIGHT = 402;
const BOARD_TOP = 126;
const BOARD_BOTTOM = 594;
const CUP_Y = 531;
const CUP_CENTERS: FourNumbers = [65, 162, 258, 355];
const CUP_DISPLAY_SIZE = 108;
const CUP_INNER_FLOOR_Y = CUP_Y + 34;
const CUP_INNER_RIM_Y = CUP_Y - 35;
const CUP_GRAIN_ROW_HEIGHT = 3.15;
const SOURCE_DISPLAY_SIZE = 108;
const SPILL_CENTERS = [113, 210, 307] as const;
const SAND_GRAIN_FRAME_SIZE = 313;
const CUP_SETTLED_GRAIN_SCALE = 0.024;
const CUP_INNER_HALF_WIDTH = 22;
const CUP_PACKING_HALF_WIDTH =
  CUP_INNER_HALF_WIDTH - (SAND_GRAIN_FRAME_SIZE * CUP_SETTLED_GRAIN_SCALE) / 2;
const GRAINS_PER_STREAM_TICK = 2;
const STREAM_CENTERS: FourNumbers = [61, 160, 260, 359];
const ROOM_COUNT = 4;
const NOTE_SHARDS_PER_ROOM = 3;
const VERSE_TARGETS = [35, 62, 66, 70] as const;
const VERSE_GRAINS = [168, 180, 192, 204] as const;
const ROOM_DURATIONS = [30_000, 32_000, 34_000, 36_000] as const;
const ROOM_NAMES = [
  'MOON GARDEN',
  'BAMBOO RAPIDS',
  'SHADOW CAVE',
  'SHRINE GUARDIAN',
] as const;
const ROOM_OBJECTIVES = [
  'PRACTICE · FIND 3 NOTES · GUIDE COLORS HOME',
  'FIND 3 NOTES · SORT THROUGH THE RAPIDS',
  'FIND 3 NOTES · SORT PAST SHADOW WELLS',
  'FIND 3 NOTES · MATCH 4 SHRINE GLASSES',
] as const;
const ROOM_NOTE_POSITIONS = [
  [
    { x: 116, y: 257 },
    { x: 304, y: 334 },
    { x: 208, y: 425 },
  ],
  [
    { x: 83, y: 286 },
    { x: 335, y: 316 },
    { x: 210, y: 438 },
  ],
  [
    { x: 104, y: 235 },
    { x: 318, y: 350 },
    { x: 126, y: 446 },
  ],
  [
    { x: 210, y: 248 },
    { x: 92, y: 380 },
    { x: 330, y: 426 },
  ],
] as const;
const ROOM_BRIDGES = [
  [
    { x: 159, y: 359, angle: 75 },
    { x: 281, y: 334, angle: 45 },
    { x: 236, y: 247, angle: -45 },
  ],
  [
    { x: 118, y: 288, angle: -18 },
    { x: 300, y: 330, angle: 21 },
    { x: 210, y: 420, angle: 0 },
  ],
  [
    { x: 113, y: 326, angle: 28 },
    { x: 304, y: 278, angle: -32 },
    { x: 235, y: 440, angle: 14 },
  ],
  [
    { x: 120, y: 287, angle: 35 },
    { x: 300, y: 287, angle: -35 },
    { x: 210, y: 420, angle: 0 },
  ],
] as const;
const NOTE_LABELS = ['D', 'E♭', 'G', 'A'] as const;
const BEAT_COUNT = 8;
const COLOR_COUNT = 4;
const OCEAN_BEAT_MS = 430;
const SEA_GLASS_FREQUENCIES = [261.63, 293.66, 392, 440] as const;
const SAND_POUR_SAMPLE_URL = new URL(
  '../assets/sand-pour-real.wav',
  import.meta.url
).href;
const KOTO_SAMPLE_URLS = [
  new URL('../assets/koto-d4.mp3', import.meta.url).href,
  new URL('../assets/koto-eb4.mp3', import.meta.url).href,
  new URL('../assets/koto-g4.mp3', import.meta.url).href,
  new URL('../assets/koto-a4.mp3', import.meta.url).href,
] as const;
const DISPLAY_FONT = '"Moon Display", Georgia, serif';
const UI_FONT = '"Moon Sans", "Avenir Next", sans-serif';

const ASSETS = {
  background: new URL(
    '../assets/moon-koto/moon-garden-sakura-bg.webp',
    import.meta.url
  ).href,
  bowls: [
    new URL('../assets/moon-koto/moon-bowl-0.webp', import.meta.url).href,
    new URL('../assets/moon-koto/moon-bowl-1.webp', import.meta.url).href,
    new URL('../assets/moon-koto/moon-bowl-2.webp', import.meta.url).href,
    new URL('../assets/moon-koto/moon-bowl-3.webp', import.meta.url).href,
  ],
  taps: [
    new URL('../assets/moon-koto/moon-tap-0.webp', import.meta.url).href,
    new URL('../assets/moon-koto/moon-tap-1.webp', import.meta.url).href,
    new URL('../assets/moon-koto/moon-tap-2.webp', import.meta.url).href,
    new URL('../assets/moon-koto/moon-tap-3.webp', import.meta.url).href,
  ],
  bridge: new URL('../assets/moon-koto/bamboo-bridge.webp', import.meta.url)
    .href,
  fan: new URL('../assets/moon-koto/wind-fan.webp', import.meta.url).href,
  guide: new URL('../assets/moon-koto/reddit-koto-guide.webp', import.meta.url)
    .href,
  sandGrains: new URL(
    '../assets/moon-koto/sand-grains-atlas.png',
    import.meta.url
  ).href,
} as const;

const PALETTE = [
  { hex: 0xff526f, css: '#ff526f', dark: 0xa9183d, name: 'CORAL' },
  { hex: 0xffb52e, css: '#ffb52e', dark: 0xa85b08, name: 'AMBER' },
  { hex: 0x25cfb5, css: '#25cfb5', dark: 0x087f75, name: 'JADE' },
  { hex: 0x766bff, css: '#766bff', dark: 0x4036b9, name: 'IRIS' },
] as const;
const OVERLAY_OCEAN_BUTTON = 0x07505c;

type GamePhase =
  | 'intro'
  | 'tutorial'
  | 'room-start'
  | 'planning'
  | 'pouring'
  | 'verse-result'
  | 'charm'
  | 'final'
  | 'game-over';

type FourNumbers = [number, number, number, number];
type Charm = 'wind' | 'guard' | 'echo';

type Particle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  color: number;
  active: boolean;
  size: number;
  sprite: Phaser.GameObjects.Image;
  lastHitAt: number;
};

type Bridge = {
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  baseScaleX: number;
  baseScaleY: number;
  angle: number;
  downX: number;
  downY: number;
  lastSparkAt: number;
  lastWoodSoundAt: number;
  lastDragAudioAt: number;
  lastDragAudioX: number;
  lastDragAudioY: number;
  dragAudioDistance: number;
  dragAudioActive: boolean;
};

type BambooSoundKind = 'friction' | 'settle' | 'impact';

type Peg = {
  x: number;
  y: number;
  radius: number;
};

type Gust = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  startedAt: number;
};

type Spark = {
  x: number;
  y: number;
  color: number;
  startedAt: number;
  strength: number;
};

type NoteRune = {
  x: number;
  y: number;
  collected: boolean;
  container: Phaser.GameObjects.Container;
};

type ShadowVortex = {
  x: number;
  y: number;
  radius: number;
  direction: number;
};

type ForecastPoint = {
  x: number;
  y: number;
};

type RouteForecast = {
  color: number;
  points: ForecastPoint[];
  notes: number[];
  correct: boolean;
};

type TiltPermission = 'unknown' | 'granted' | 'denied' | 'unsupported';

type PermissionAwareOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

function canRequestOrientationPermission(
  value: typeof DeviceOrientationEvent
): value is PermissionAwareOrientationEvent & {
  requestPermission: () => Promise<'granted' | 'denied'>;
} {
  return 'requestPermission' in value;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function getLocalDayId(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextUtcReset(): string {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  return reset.toISOString();
}

function getFallbackState(): InitResponse {
  const date = getLocalDayId();
  return {
    type: 'init',
    date,
    dayNumber: 1,
    seed: hashString(date),
    username: 'guest',
    loggedIn: false,
    bestScore: 0,
    submitted: false,
    streak: 0,
    totalContributions: 0,
    playerCount: 0,
    resetAt: getNextUtcReset(),
    milestone: { target: 5, remaining: 5, reward: 'BASS LINE' },
    chorus: [0, 1, 2, 3, 0, 1, 2, 3],
    leaderboard: [],
  };
}

function getResetLabel(resetAt: string): string {
  const remaining = Math.max(0, Date.parse(resetAt) - Date.now());
  const totalMinutes = Math.max(1, Math.ceil(remaining / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `NEW SONG IN ${hours}H ${minutes}M`
    : `NEW SONG IN ${minutes}M`;
}

function getColor(index: number): (typeof PALETTE)[number] {
  return PALETTE[index] ?? PALETTE[0];
}

function makePattern(values: number[]): ChorusPattern {
  const normalized = Array.from({ length: BEAT_COUNT }, (_, index) =>
    Phaser.Math.Clamp(Math.round(values[index] ?? index % COLOR_COUNT), 0, 3)
  );
  return [
    normalized[0] ?? 0,
    normalized[1] ?? 1,
    normalized[2] ?? 2,
    normalized[3] ?? 3,
    normalized[4] ?? 0,
    normalized[5] ?? 1,
    normalized[6] ?? 2,
    normalized[7] ?? 3,
  ];
}

export class MoonKoto extends Phaser.Scene {
  private phase: GamePhase = 'intro';
  private state: InitResponse = getFallbackState();
  private daySeed = this.state.seed;
  private random = mulberry32(this.daySeed);
  private verse = 0;
  private lanterns = 3;
  private verseScores: number[] = [];
  private charms = new Set<Charm>();
  private windBonus = 0;
  private echoBonus = 0;
  private guardGrains = 0;
  private windCharges = 3;
  private notesCollected = 0;
  private noteRunes: NoteRune[] = [];
  private shadowVortices: ShadowVortex[] = [];
  private guardianGustCount = 0;
  private nextGuardianGustAt = 0;
  private tiltPermission: TiltPermission = 'unknown';
  private sensorTiltX = 0;
  private sensorTiltY = 0;
  private sensorBaseBeta: number | undefined;
  private sensorBaseGamma: number | undefined;
  private touchTiltX = 0;
  private touchTiltY = 0;
  private touchTiltActive = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private sourceOrder: FourNumbers = [1, 0, 3, 2];
  private pegs: Peg[] = [];
  private bridges: Bridge[] = [];
  private particles: Particle[] = [];
  private gusts: Gust[] = [];
  private sparks: Spark[] = [];
  private songWeights: FourNumbers[] = Array.from(
    { length: BEAT_COUNT },
    (): FourNumbers => [0, 0, 0, 0]
  );
  private currentPattern: ChorusPattern = [0, 1, 2, 3, 0, 1, 2, 3];
  private spawnedRows = 0;
  private nextSpawnAt = 0;
  private pourStartedAt = 0;
  private landed = 0;
  private correct = 0;
  private wrong = 0;
  private combo = 0;
  private bestCombo = 0;
  private cupTotals: FourNumbers = [0, 0, 0, 0];
  private cupCorrect: FourNumbers = [0, 0, 0, 0];
  private spillPileCounts: [number, number, number] = [0, 0, 0];
  private lastCupSparkAt: FourNumbers = [-1_000, -1_000, -1_000, -1_000];
  private submitting = false;
  private soundEnabled = true;
  private songPlaybackEvents: Phaser.Time.TimerEvent[] = [];
  private audioContext?: AudioContext;
  private sandPourSample: AudioBuffer | undefined;
  private sandPourSampleLoading: Promise<void> | undefined;
  private kotoSamples: Array<AudioBuffer | undefined> = [];
  private kotoSamplesLoading: Promise<void> | undefined;
  private kotoAudioBus:
    | {
        context: AudioContext;
        input: GainNode;
      }
    | undefined;
  private activeSandPour:
    | {
        source: AudioBufferSourceNode;
        gain: GainNode;
        panner: StereoPannerNode;
      }
    | undefined;
  private sandImpactEnergy = 0;
  private sandImpactPan = 0;
  private lastSandImpactSoundAt = -1_000;
  private activeOceanWave:
    | {
        source: AudioBufferSourceNode;
        gain: GainNode;
      }
    | undefined;
  private boardLayer!: Phaser.GameObjects.Graphics;
  private forecastLayer!: Phaser.GameObjects.Graphics;
  private effectsLayer!: Phaser.GameObjects.Graphics;
  private hudLayer!: Phaser.GameObjects.Graphics;
  private verseText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private lanternText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private windButton!: Phaser.GameObjects.Image;
  private windText!: Phaser.GameObjects.Text;
  private windLabel!: Phaser.GameObjects.Text;
  private actionButton!: Phaser.GameObjects.Container;
  private actionLabel!: Phaser.GameObjects.Text;
  private songPreviewButton!: Phaser.GameObjects.Container;
  private songPreviewLabel!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private sourceImages: Phaser.GameObjects.Image[] = [];
  private sourceLabels: Phaser.GameObjects.Text[] = [];
  private cupImages: Phaser.GameObjects.Image[] = [];
  private cupLabels: Phaser.GameObjects.Text[] = [];
  private cupStatus: Phaser.GameObjects.Text[] = [];
  private overlay: Phaser.GameObjects.Container | undefined;
  private menuOverlay: Phaser.GameObjects.Container | undefined;
  private menuOpenedAt = 0;
  private typewriterEvent: Phaser.Time.TimerEvent | undefined;
  private typewriterClickBuffer: AudioBuffer | undefined;
  private bambooNoiseBuffer: AudioBuffer | undefined;
  private roomNameText!: Phaser.GameObjects.Text;
  private noteText!: Phaser.GameObjects.Text;

  private readonly onDeviceOrientation = (
    event: DeviceOrientationEvent
  ): void => {
    if (event.beta === null || event.gamma === null) return;
    if (
      this.sensorBaseBeta === undefined ||
      this.sensorBaseGamma === undefined
    ) {
      this.sensorBaseBeta = event.beta;
      this.sensorBaseGamma = event.gamma;
      return;
    }
    const targetX = Phaser.Math.Clamp(
      (event.gamma - this.sensorBaseGamma) / 22,
      -1,
      1
    );
    const targetY = Phaser.Math.Clamp(
      (event.beta - this.sensorBaseBeta) / 28,
      -1,
      1
    );
    this.sensorTiltX = Phaser.Math.Linear(this.sensorTiltX, targetX, 0.16);
    this.sensorTiltY = Phaser.Math.Linear(this.sensorTiltY, targetY, 0.12);
  };

  constructor() {
    super('MoonKoto');
  }

  preload(): void {
    this.load.image('moon-garden-bg', ASSETS.background);
    ASSETS.bowls.forEach((url, index) =>
      this.load.image(`moon-bowl-${index}`, url)
    );
    ASSETS.taps.forEach((url, index) =>
      this.load.image(`moon-tap-${index}`, url)
    );
    this.load.image('bamboo-bridge', ASSETS.bridge);
    this.load.image('wind-fan', ASSETS.fan);
    this.load.image('reddit-koto-guide', ASSETS.guide);
    this.load.spritesheet('sand-grain', ASSETS.sandGrains, {
      frameWidth: SAND_GRAIN_FRAME_SIZE,
      frameHeight: SAND_GRAIN_FRAME_SIZE,
    });
  }

  create(): void {
    const renderScale = this.scale.width / WIDTH;
    this.cameras.main.setZoom(renderScale).centerOn(WIDTH / 2, HEIGHT / 2);
    this.cameras.main.setBackgroundColor('#10142f');
    this.createEnvironment();
    this.createHud();
    this.createBoard();
    this.createBridges();
    this.createCupsAndSources();
    this.createActionDock();
    this.setupInput();
    this.setupVerse(false);
    void this.loadState();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.has('mute')) this.soundEnabled = false;
    if (params.has('preview-charm')) {
      this.verseScores = [72];
      this.currentPattern = this.buildPattern();
      this.phase = 'verse-result';
      this.actionButton.setVisible(false);
      this.showVerseClear(72);
    } else if (params.has('preview-fail')) {
      this.lanterns = 2;
      this.phase = 'verse-result';
      this.actionButton.setVisible(false);
      this.updateHud();
      this.showVerseFailed(22, this.getTarget());
    } else if (params.has('preview-game-over')) {
      this.lanterns = 0;
      this.phase = 'verse-result';
      this.actionButton.setVisible(false);
      this.updateHud();
      this.showGameOver(24, this.getTarget());
    } else if (params.has('preview-finale')) {
      this.verse = 3;
      this.verseScores = [64, 73, 78, 82];
      this.phase = 'verse-result';
      this.actionButton.setVisible(false);
      this.updateHud();
      this.showFinale();
    } else if (params.has('autoplay-verse')) {
      this.verse = Phaser.Math.Clamp(
        Number.parseInt(params.get('autoplay-verse') ?? '1', 10) - 1,
        0,
        ROOM_COUNT - 1
      );
      const previewCharms = (params.get('charms') ?? '').split(',');
      if (previewCharms.includes('wind')) {
        this.charms.add('wind');
        this.windBonus = 2;
      }
      if (previewCharms.includes('guard')) this.charms.add('guard');
      if (previewCharms.includes('echo')) {
        this.charms.add('echo');
        this.echoBonus = 8;
      }
      this.setupVerse(false);
      this.startPour();
    } else if (params.has('skip-intro') || params.has('autoplay')) {
      this.phase = 'planning';
      this.updateHud();
      if (params.has('autoplay')) this.startPour();
    } else {
      this.showIntro();
    }
  }

  override update(time: number, delta: number): void {
    if (this.menuOverlay) return;
    this.drawEffects(time);
    if (this.phase !== 'pouring') return;

    const elapsed = time - this.pourStartedAt;
    const grainRows = VERSE_GRAINS[this.verse] ?? VERSE_GRAINS[0];
    const roomDuration = ROOM_DURATIONS[this.verse] ?? ROOM_DURATIONS[0];
    const secondsLeft = Math.max(0, Math.ceil((roomDuration - elapsed) / 1000));
    this.actionLabel.setText(`${secondsLeft}s · DRAG TO STEER`);
    while (this.spawnedRows < grainRows && elapsed >= this.nextSpawnAt) {
      this.spawnRow();
      this.spawnedRows += 1;
      this.nextSpawnAt += this.getSpawnInterval();
    }

    const step = Math.min(delta / 1000, 0.026);
    this.updateRoomMotion(elapsed, time);
    this.updateParticles(step, time);
    this.updateSandPhysicsAudio(delta);
    const active = this.particles.reduce(
      (sum, particle) => sum + (particle.active ? 1 : 0),
      0
    );
    if (
      (this.spawnedRows >= grainRows && active === 0 && elapsed > 2_400) ||
      elapsed > roomDuration
    ) {
      this.finishVerse();
    }
  }

  private createEnvironment(): void {
    this.add
      .image(WIDTH / 2, HEIGHT / 2, 'moon-garden-bg')
      .setDisplaySize(WIDTH, HEIGHT)
      .setDepth(-20);

    const shade = this.add.graphics().setDepth(-19);
    shade
      .fillGradientStyle(
        0x111939,
        0x111939,
        0x182e4f,
        0x182e4f,
        0.05,
        0.05,
        0.38,
        0.38
      )
      .fillRect(0, 0, WIDTH, HEIGHT)
      .fillStyle(0x070a1c, 0.68)
      .fillRect(0, 0, WIDTH, 122)
      .fillStyle(0x07091b, 0.58)
      .fillRect(0, 605, WIDTH, 175);

    const aurora = this.add.graphics().setDepth(-18);
    aurora
      .fillGradientStyle(
        0x35dbc5,
        0x766bff,
        0xff526f,
        0xffb52e,
        0.14,
        0.12,
        0.04,
        0.05
      )
      .fillRect(0, 78, WIDTH, 520)
      .fillStyle(0x35dbc5, 0.055)
      .fillEllipse(32, 330, 168, 420)
      .fillStyle(0x766bff, 0.06)
      .fillEllipse(396, 298, 180, 390)
      .fillStyle(0xff526f, 0.04)
      .fillEllipse(212, 592, 330, 106);

    for (let index = 0; index < 18; index += 1) {
      const x = 18 + ((index * 79) % 389);
      const y = 86 + ((index * 113) % 640);
      const star = this.add
        .circle(x, y, index % 4 === 0 ? 1.4 : 0.75, 0xffedb4, 0.62)
        .setDepth(-17);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.86 },
        scale: { from: 0.7, to: 1.3 },
        duration: 1_300 + (index % 5) * 270,
        yoyo: true,
        repeat: -1,
        delay: index * 90,
        ease: 'Sine.InOut',
      });
    }
  }

  private createHud(): void {
    this.hudLayer = this.add.graphics().setDepth(40);
    this.hudLayer
      .fillGradientStyle(
        0x090d22,
        0x090d22,
        0x151d42,
        0x151d42,
        0.98,
        0.98,
        0.94,
        0.94
      )
      .fillRect(0, 0, WIDTH, 80)
      .fillGradientStyle(
        0x37dfc8,
        0x766bff,
        0xff526f,
        0xffb52e,
        0.9,
        0.9,
        0.9,
        0.9
      )
      .fillRect(16, 78, WIDTH - 32, 2)
      .lineStyle(1, 0xffe1a3, 0.28)
      .lineBetween(16, 79, WIDTH - 16, 79)
      .fillStyle(0x111936, 0.94)
      .fillRoundedRect(123, 88, 174, 29, 14)
      .lineStyle(1, 0x62e1d1, 0.42)
      .strokeRoundedRect(123, 88, 174, 29, 14);

    this.add
      .text(17, 11, 'POURCHESTRA', {
        fontFamily: DISPLAY_FONT,
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#fff0c5',
        letterSpacing: 0.2,
      })
      .setDepth(42)
      .setShadow(0, 2, '#050712', 2, true, false);

    this.dayText = this.add
      .text(0, 0, 'DAILY EXPEDITION', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#c8d1ee',
      })
      .setDepth(42)
      .setVisible(false);

    this.verseText = this.add
      .text(178, 16, 'ROOM 1/4', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e9b85d',
        letterSpacing: 0.35,
      })
      .setDepth(42);

    this.scoreText = this.add
      .text(18, 49, 'FILL 0 / 35%', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff8e8',
        letterSpacing: 0.12,
      })
      .setDepth(42);

    this.noteText = this.add
      .text(161, 49, 'NOTES  ♪ 0/3', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffcc68',
        letterSpacing: 0.12,
      })
      .setDepth(42);

    this.lanternText = this.add
      .text(361, 16, '♥ 3', {
        fontFamily: UI_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffcc68',
        letterSpacing: 0.15,
      })
      .setOrigin(1, 0)
      .setDepth(42)
      .setShadow(0, 1, '#6d3d0a', 2, true, false);

    this.roomNameText = this.add
      .text(WIDTH / 2, 102, 'MOON GARDEN', {
        fontFamily: DISPLAY_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fff0c5',
        letterSpacing: 0.3,
      })
      .setOrigin(0.5)
      .setDepth(42);

    this.goalText = this.add
      .text(0, 0, ROOM_OBJECTIVES[0], {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: '600',
        color: '#dbe2f7',
      })
      .setDepth(42)
      .setVisible(false);

    const menuShape = this.add.graphics();
    menuShape
      .fillStyle(0x35dbc5, 0.12)
      .fillCircle(0, 0, 21)
      .fillStyle(0x202b59, 1)
      .fillCircle(0, 0, 17)
      .lineStyle(1.4, 0xf2c66d, 0.82)
      .strokeCircle(0, 0, 17)
      .lineStyle(2, 0xfff0c5, 1)
      .lineBetween(-6, -5, 6, -5)
      .lineBetween(-6, 0, 6, 0)
      .lineBetween(-6, 5, 6, 5);
    const menuButton = this.add
      .container(392, 43, [menuShape])
      .setDepth(45)
      .setSize(44, 44)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 44, 44),
        Phaser.Geom.Rectangle.Contains
      );
    this.bindPressButton(menuButton, () => this.showGameMenu(), 0.9);
  }

  private createGameMenuOverlay(): Phaser.GameObjects.Container {
    this.menuOverlay?.destroy(true);
    const blocker = this.add
      .zone(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)
      .setDepth(162)
      .setInteractive();
    const overlay = this.createCeremonyOverlay(0x090d25, 0.99).setDepth(160);
    overlay.once('destroy', () => {
      if (blocker.active) blocker.destroy();
    });
    this.menuOverlay = overlay;
    this.animateOverlayIn(overlay);
    return overlay;
  }

  private showGameMenu(): void {
    if (this.menuOverlay) return;
    if (this.menuOpenedAt <= 0) this.menuOpenedAt = this.time.now;
    const overlay = this.createGameMenuOverlay();
    const guideHalo = this.createGuideHalo(-215);
    const guide = this.add
      .image(0, -215, 'reddit-koto-guide')
      .setDisplaySize(116, 116);
    const eyebrow = this.add
      .text(0, -164, 'DAILY EXPEDITION PAUSED', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#68eadb',
        letterSpacing: 0.55,
      })
      .setOrigin(0.5);
    const title = this.add
      .text(0, -129, 'POURCHESTRA MENU', {
        fontFamily: DISPLAY_FONT,
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#fff0c5',
      })
      .setOrigin(0.5);
    const progress = this.add
      .text(
        0,
        -96,
        `ROOM ${this.verse + 1}/${ROOM_COUNT}  ·  ${this.lanterns} LIVES  ·  ${this.notesCollected}/3 NOTES`,
        {
          fontFamily: UI_FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#ffcc68',
          letterSpacing: 0.12,
        }
      )
      .setOrigin(0.5);
    const resume = this.createOverlayButton(
      0,
      -49,
      'RESUME EXPEDITION  ▶',
      0xff526f,
      () => this.closeGameMenu(),
      164
    );
    const howTo = this.createOverlayButton(
      0,
      19,
      'HOW TO PLAY',
      OVERLAY_OCEAN_BUTTON,
      () => this.showHowToPlayMenu(),
      164
    );
    const sound = this.createOverlayButton(
      0,
      87,
      `SOUND ${this.soundEnabled ? 'ON' : 'OFF'}`,
      0x34407b,
      () => {
        this.toggleSound();
        const label = sound.getByName('label');
        if (label instanceof Phaser.GameObjects.Text) {
          label.setText(`SOUND ${this.soundEnabled ? 'ON' : 'OFF'}`);
        }
      },
      164
    );
    let restartArmed = false;
    const restart = this.createOverlayButton(
      0,
      155,
      'RESTART DAILY QUEST',
      0x7d3151,
      () => {
        if (!restartArmed) {
          restartArmed = true;
          const label = restart.getByName('label');
          if (label instanceof Phaser.GameObjects.Text) {
            label.setText('TAP AGAIN TO RESTART');
          }
          return;
        }
        this.restartExpedition();
      },
      164
    );
    const hint = this.add
      .text(0, 209, 'THE ROOM CLOCK STOPS WHILE THIS MENU IS OPEN', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#c0cbe6',
        letterSpacing: 0.15,
      })
      .setOrigin(0.5);
    overlay.add([
      guideHalo,
      guide,
      eyebrow,
      title,
      progress,
      resume,
      howTo,
      sound,
      restart,
      hint,
    ]);
  }

  private showHowToPlayMenu(): void {
    if (this.menuOpenedAt <= 0) this.menuOpenedAt = this.time.now;
    const overlay = this.createGameMenuOverlay();
    const title = this.add
      .text(0, -218, 'HOW TO PLAY\nRESTORE THE SONG', {
        fontFamily: DISPLAY_FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#fff0c5',
        align: 'center',
        lineSpacing: -3,
      })
      .setOrigin(0.5);
    const rulesPanel = this.add.graphics();
    rulesPanel
      .fillStyle(0x111735, 0.98)
      .fillRoundedRect(-152, -173, 304, 295, 18)
      .lineStyle(1, 0x62e1d1, 0.54)
      .strokeRoundedRect(-152, -173, 304, 295, 18)
      .lineStyle(1, 0x62e1d1, 0.16)
      .lineBetween(-126, -92, 126, -92)
      .lineBetween(-126, -26, 126, -26)
      .lineBetween(-126, 40, 126, 40);
    const ruleRows = [
      {
        y: -150,
        title: '01 · PLAN THE FALL',
        body: 'Drag bamboo bridges. Tap to rotate.\nDotted lines predict each landing.',
        color: '#ff7188',
      },
      {
        y: -84,
        title: '02 · GUIDE THE POUR',
        body: 'Tilt your phone or drag the board.\nMatch each color to its glass.',
        color: '#52dec9',
      },
      {
        y: -18,
        title: '03 · CLEAR THE ROOM',
        body: 'Collect 3 notes and reach the sand target.\nWrong colors spill. A miss costs 1 life.',
        color: '#968cff',
      },
      {
        y: 48,
        title: 'WIN · RESTORE THE SONG',
        body: 'Clear all 4 rooms to compose your ocean song.',
        color: '#ffcc68',
      },
    ] as const;
    const rules = ruleRows.flatMap((rule) => {
      const heading = this.add.text(-126, rule.y, rule.title, {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: rule.color,
        letterSpacing: 0.12,
      });
      const body = this.add.text(-126, rule.y + 18, rule.body, {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: '500',
        color: '#e7ecfa',
        lineSpacing: 3,
        wordWrap: { width: 252 },
      });
      return [heading, body];
    });
    const back = this.createOverlayButton(
      0,
      178,
      'BACK TO MENU',
      OVERLAY_OCEAN_BUTTON,
      () => {
        this.menuOverlay?.destroy(true);
        this.menuOverlay = undefined;
        this.showGameMenu();
      },
      164
    );
    overlay.add([title, rulesPanel, ...rules, back]);
  }

  private closeGameMenu(resumeClock = true): void {
    if (!this.menuOverlay) return;
    const pausedFor = Math.max(0, this.time.now - this.menuOpenedAt);
    if (resumeClock && this.phase === 'pouring') {
      this.pourStartedAt += pausedFor;
    }
    this.menuOverlay.destroy(true);
    this.menuOverlay = undefined;
    this.menuOpenedAt = 0;
  }

  private restartExpedition(): void {
    this.closeGameMenu(false);
    this.stopSongPlayback();
    this.fadeSandPour();
    this.clearParticles();
    this.verse = 0;
    this.lanterns = 3;
    this.verseScores = [];
    this.charms.clear();
    this.windBonus = 0;
    this.echoBonus = 0;
    this.currentPattern = [0, 1, 2, 3, 0, 1, 2, 3];
    this.setupVerse(true);
    this.showIntro();
  }

  private toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.ensureAudio();
      if (this.phase === 'pouring') this.playSandPour();
    } else {
      this.stopSongPlayback();
      this.fadeSandPour();
    }
  }

  private createBoard(): void {
    this.boardLayer = this.add.graphics().setDepth(1);
    this.forecastLayer = this.add.graphics().setDepth(10);
    this.effectsLayer = this.add.graphics().setDepth(34);
    this.drawBoard();
  }

  private drawBoard(): void {
    const roomColors = [0x16204b, 0x123844, 0x24183e, 0x3a1829] as const;
    const roomLines = [0x7de4dc, 0x64e7d8, 0x9a82ff, 0xff9f75] as const;
    const roomColor = roomColors[this.verse] ?? roomColors[0];
    const roomLine = roomLines[this.verse] ?? roomLines[0];
    this.boardLayer.clear();
    this.boardLayer
      .fillStyle(roomLine, 0.08)
      .fillRoundedRect(
        BOARD_LEFT - 4,
        BOARD_TOP - 4,
        BOARD_RIGHT - BOARD_LEFT + 8,
        BOARD_BOTTOM - BOARD_TOP + 8,
        26
      )
      .fillStyle(0x050817, 0.76)
      .fillRoundedRect(
        BOARD_LEFT,
        BOARD_TOP,
        BOARD_RIGHT - BOARD_LEFT,
        BOARD_BOTTOM - BOARD_TOP,
        22
      )
      .fillGradientStyle(
        roomColor,
        roomColor,
        0x0b1230,
        0x0b1230,
        0.74,
        0.74,
        0.86,
        0.86
      )
      .fillRoundedRect(
        BOARD_LEFT + 4,
        BOARD_TOP + 4,
        BOARD_RIGHT - BOARD_LEFT - 8,
        BOARD_BOTTOM - BOARD_TOP - 8,
        19
      )
      .lineStyle(2, 0xf0c86f, 0.72)
      .strokeRoundedRect(
        BOARD_LEFT + 1,
        BOARD_TOP + 1,
        BOARD_RIGHT - BOARD_LEFT - 2,
        BOARD_BOTTOM - BOARD_TOP - 2,
        22
      )
      .lineStyle(1.25, roomLine, 0.5)
      .strokeRoundedRect(
        BOARD_LEFT + 7,
        BOARD_TOP + 7,
        BOARD_RIGHT - BOARD_LEFT - 14,
        BOARD_BOTTOM - BOARD_TOP - 14,
        16
      );

    this.boardLayer
      .fillGradientStyle(
        0x0a0d24,
        0x0a0d24,
        roomColor,
        roomColor,
        0.7,
        0.7,
        0.52,
        0.52
      )
      .fillRoundedRect(29, 502, WIDTH - 58, 80, 17)
      .lineStyle(1, roomLine, 0.34)
      .lineBetween(35, 562, WIDTH - 35, 562);

    for (let lane = 0; lane < COLOR_COUNT; lane += 1) {
      const color = getColor(lane);
      const center = STREAM_CENTERS[lane] ?? WIDTH / 2;
      this.boardLayer
        .fillStyle(color.hex, 0.032)
        .fillRoundedRect(center - 38, 139, 76, 417, 22)
        .fillStyle(color.hex, 0.11)
        .fillRoundedRect(center - 32, 505, 64, 52, 18)
        .lineStyle(1, color.hex, 0.22)
        .lineBetween(center - 27, 558, center + 27, 558);
    }

    for (const peg of this.pegs) {
      this.boardLayer
        .fillStyle(0x02040c, 0.42)
        .fillCircle(peg.x + 2, peg.y + 4, peg.radius + 2)
        .fillStyle(0xe7e5d9, 1)
        .fillCircle(peg.x, peg.y, peg.radius)
        .fillStyle(0xffffff, 0.9)
        .fillCircle(peg.x - 1.6, peg.y - 1.8, peg.radius * 0.32)
        .lineStyle(1, 0x6dd3d0, 0.52)
        .strokeCircle(peg.x, peg.y, peg.radius + 1.5);
    }
  }

  private createBridges(): void {
    const initial = ROOM_BRIDGES[0];
    this.bridges = initial.map((entry) => {
      const image = this.add
        .image(0, 0, 'bamboo-bridge')
        .setDisplaySize(144, 60);
      const baseScaleX = image.scaleX;
      const baseScaleY = image.scaleY;
      const container = this.add
        .container(entry.x, entry.y, [image])
        .setDepth(24)
        .setAngle(entry.angle)
        .setSize(144, 54)
        .setInteractive(
          new Phaser.Geom.Rectangle(0, 0, 144, 54),
          Phaser.Geom.Rectangle.Contains
        );
      this.input.setDraggable(container);
      const bridge: Bridge = {
        container,
        image,
        baseScaleX,
        baseScaleY,
        angle: entry.angle,
        downX: entry.x,
        downY: entry.y,
        lastSparkAt: -1_000,
        lastWoodSoundAt: -1_000,
        lastDragAudioAt: -1_000,
        lastDragAudioX: entry.x,
        lastDragAudioY: entry.y,
        dragAudioDistance: 0,
        dragAudioActive: false,
      };

      container.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData
        ) => {
          if (!this.isBridgeAdjustmentPhase()) return;
          if (this.phase === 'pouring') event.stopPropagation();
          bridge.downX = container.x;
          bridge.downY = container.y;
          bridge.lastDragAudioAt = this.time.now;
          bridge.lastDragAudioX = container.x;
          bridge.lastDragAudioY = container.y;
          bridge.dragAudioDistance = 0;
          bridge.dragAudioActive = true;
          bridge.lastWoodSoundAt = this.time.now;
          this.tweens.killTweensOf(image);
          this.tweens.add({
            targets: image,
            scaleX: baseScaleX * 1.035,
            scaleY: baseScaleY * 1.035,
            duration: 90,
          });
        }
      );
      container.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          if (this.phase !== 'planning') return;
          const nextX = Phaser.Math.Clamp(
            dragX,
            BOARD_LEFT + 64,
            BOARD_RIGHT - 64
          );
          const nextY = Phaser.Math.Clamp(dragY, 226, 452);
          const now = this.time.now;
          const distance = Phaser.Math.Distance.Between(
            bridge.lastDragAudioX,
            bridge.lastDragAudioY,
            nextX,
            nextY
          );
          const elapsed = Math.max(16, now - bridge.lastDragAudioAt);
          const speed = (distance / elapsed) * 1_000;
          bridge.dragAudioDistance += distance;
          container.setPosition(nextX, nextY);
          if (distance > 0.4 && now - bridge.lastWoodSoundAt >= 72) {
            bridge.lastWoodSoundAt = now;
            this.playBambooSound(
              'friction',
              this.bridges.indexOf(bridge),
              nextX,
              Phaser.Math.Clamp(speed / 520, 0.08, 1),
              bridge.angle
            );
          }
          bridge.lastDragAudioAt = now;
          bridge.lastDragAudioX = nextX;
          bridge.lastDragAudioY = nextY;
          this.drawRouteForecast();
        }
      );
      container.on('pointerup', () => {
        this.finishBridgeGesture(bridge, true);
      });
      container.on('pointerupoutside', () => {
        this.finishBridgeGesture(bridge, false);
      });
      container.on('dragend', () => {
        // Phaser dispatches dragend before pointerup. Defer this fallback so
        // pointerup can still classify a short gesture as a rotation.
        this.time.delayedCall(0, () => {
          this.finishBridgeGesture(bridge, false);
        });
      });
      return bridge;
    });
  }

  private finishBridgeGesture(bridge: Bridge, allowRotation: boolean): void {
    if (!bridge.dragAudioActive) return;
    bridge.dragAudioActive = false;
    this.restoreBridgeScale(bridge);
    if (!this.isBridgeAdjustmentPhase()) return;
    const moved = Phaser.Math.Distance.Between(
      bridge.downX,
      bridge.downY,
      bridge.container.x,
      bridge.container.y
    );
    const bridgeIndex = this.bridges.indexOf(bridge);
    if (allowRotation && moved < 7) {
      bridge.angle += 30;
      if (bridge.angle > 75) bridge.angle = -75;
      this.tweens.add({
        targets: bridge.container,
        angle: bridge.angle,
        duration: 180,
        ease: 'Back.Out',
      });
      this.playKotoPluck(bridgeIndex, bridge.container.x, 0.72, bridge.angle);
    } else if (moved >= 7 || bridge.dragAudioDistance >= 7) {
      this.playBambooSound(
        'settle',
        bridgeIndex,
        bridge.container.x,
        Phaser.Math.Clamp(moved / 130, 0.2, 0.82),
        bridge.angle
      );
    }
    this.drawRouteForecast();
  }

  private isBridgeAdjustmentPhase(): boolean {
    return this.phase === 'planning' || this.phase === 'pouring';
  }

  private restoreBridgeScale(bridge: Bridge, animate = true): void {
    this.tweens.killTweensOf(bridge.image);
    if (!animate) {
      bridge.image.setScale(bridge.baseScaleX, bridge.baseScaleY);
      return;
    }
    this.tweens.add({
      targets: bridge.image,
      scaleX: bridge.baseScaleX,
      scaleY: bridge.baseScaleY,
      duration: 110,
      ease: 'Sine.Out',
    });
  }

  private createCupsAndSources(): void {
    for (let index = 0; index < COLOR_COUNT; index += 1) {
      const sourceX = STREAM_CENTERS[index] ?? 60;
      const cupX = CUP_CENTERS[index] ?? 60;
      this.add
        .ellipse(sourceX, 157, 84, 62, getColor(index).hex, 0.1)
        .setDepth(11);
      const source = this.add
        .image(sourceX, 150, `moon-tap-${index}`)
        .setDisplaySize(SOURCE_DISPLAY_SIZE, SOURCE_DISPLAY_SIZE)
        .setDepth(12);
      this.sourceImages.push(source);
      const sourceLabel = this.add
        .text(sourceX, 129, '', {
          fontFamily: UI_FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#fff8e8',
          backgroundColor: '#090d22dd',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(15);
      this.sourceLabels.push(sourceLabel);

      this.add
        .ellipse(cupX, CUP_Y + 24, 72, 32, getColor(index).hex, 0.06)
        .setDepth(15);
      const cup = this.add
        .image(cupX, CUP_Y, `moon-bowl-${index}`)
        .setDisplaySize(CUP_DISPLAY_SIZE, CUP_DISPLAY_SIZE)
        .setDepth(16);
      this.cupImages.push(cup);
      const cupLabel = this.add
        .text(cupX, CUP_Y + 12, NOTE_LABELS[index] ?? 'D', {
          fontFamily: DISPLAY_FONT,
          fontSize: '23px',
          fontStyle: 'bold',
          color: getColor(index).css,
        })
        .setOrigin(0.5)
        .setAlpha(0.24)
        .setDepth(18);
      this.cupLabels.push(cupLabel);
      const status = this.add
        .text(cupX, 582, getColor(index).name, {
          fontFamily: UI_FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: getColor(index).css,
          letterSpacing: 0.15,
        })
        .setOrigin(0.5)
        .setDepth(18);
      this.cupStatus.push(status);
    }
  }

  private createActionDock(): void {
    const dock = this.add.graphics().setDepth(38);
    dock
      .fillStyle(0x35dbc5, 0.07)
      .fillRoundedRect(9, 606, WIDTH - 18, 167, 23)
      .fillGradientStyle(
        0x0d112b,
        0x0d112b,
        0x080a1c,
        0x080a1c,
        0.98,
        0.98,
        0.98,
        0.98
      )
      .fillRoundedRect(13, 610, WIDTH - 26, 159, 20)
      .lineStyle(1.25, 0xf1c76f, 0.56)
      .strokeRoundedRect(13, 610, WIDTH - 26, 159, 20)
      .fillGradientStyle(
        0x35dbc5,
        0x766bff,
        0xff526f,
        0xffb52e,
        0.82,
        0.82,
        0.82,
        0.82
      )
      .fillRoundedRect(29, 612, WIDTH - 58, 2, 1);

    this.windButton = this.add
      .image(43, 651, 'wind-fan')
      .setDisplaySize(52, 52)
      .setDepth(40)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.windButton.on('pointerdown', () => {
      if (this.phase !== 'pouring') return;
      const tilt = this.getActiveTilt();
      this.useWind(
        WIDTH / 2,
        390,
        Math.abs(tilt.x) > 0.08 ? tilt.x * 100 : 0,
        -100 + tilt.y * 25
      );
      this.windButton.setScale(
        this.windButton.scaleX * 0.92,
        this.windButton.scaleY * 0.92
      );
      this.time.delayedCall(90, () => {
        if (this.windButton.active) this.windButton.setDisplaySize(52, 52);
      });
    });
    this.windText = this.add
      .text(70, 645, '×3', {
        fontFamily: UI_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#68eadb',
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setVisible(false);
    this.windLabel = this.add
      .text(61, 676, 'WIND', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#dce6fa',
        letterSpacing: 0.45,
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setVisible(false);

    this.instructionText = this.add
      .text(WIDTH / 2, 644, 'TAP BAMBOO TO ROTATE · DRAG TO MOVE', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff4d5',
        align: 'center',
        wordWrap: { width: 300 },
      })
      .setOrigin(0.5)
      .setDepth(41);

    const buttonShape = this.add.graphics();
    buttonShape
      .fillStyle(0xff526f, 0.13)
      .fillRoundedRect(-119, -32, 238, 63, 20)
      .fillStyle(0x03050f, 0.52)
      .fillRoundedRect(-111, -19, 222, 49, 15)
      .fillStyle(0xff526f, 1)
      .fillRoundedRect(-111, -26, 222, 49, 14)
      .fillStyle(0xff8a68, 0.5)
      .fillRoundedRect(-98, -22, 196, 3, 1.5)
      .lineStyle(1.4, 0xffe3c2, 0.9)
      .strokeRoundedRect(-110, -25, 220, 47, 13);
    this.actionLabel = this.add
      .text(0, -2, 'POUR SAND  ▶', {
        fontFamily: UI_FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fff8e8',
        letterSpacing: 0.15,
      })
      .setOrigin(0.5);
    this.actionButton = this.add
      .container(210, 731, [buttonShape, this.actionLabel])
      .setDepth(45)
      .setSize(244, 64)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 244, 64),
        Phaser.Geom.Rectangle.Contains
      );
    this.bindPressButton(this.actionButton, () => {
      if (this.phase === 'planning') this.startPour();
    });

    const songShape = this.add.graphics();
    songShape
      .fillGradientStyle(
        0x162647,
        0x162647,
        0x111633,
        0x111633,
        0.98,
        0.98,
        0.98,
        0.98
      )
      .fillRoundedRect(-82, -20, 164, 40, 12)
      .lineStyle(1, 0x55e8d8, 0.68)
      .strokeRoundedRect(-82, -20, 164, 40, 12);
    this.songPreviewLabel = this.add
      .text(0, 0, 'SONG LOCKED · CLEAR ROOM 1', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#aeb8d5',
        letterSpacing: 0.05,
      })
      .setOrigin(0.5);
    this.songPreviewButton = this.add
      .container(304, 682, [songShape, this.songPreviewLabel])
      .setDepth(45)
      .setSize(176, 48)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 176, 48),
        Phaser.Geom.Rectangle.Contains
      )
      .setVisible(false);
    this.bindPressButton(this.songPreviewButton, () => {
      if (this.phase !== 'planning' || this.verseScores.length === 0) return;
      this.currentPattern = this.buildPattern();
      this.playPattern(this.currentPattern, 2);
    });
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'pouring') return;
      const x = pointer.x / (this.scale.width / WIDTH);
      const y = pointer.y / (this.scale.height / HEIGHT);
      if (
        x < BOARD_LEFT ||
        x > BOARD_RIGHT ||
        y < BOARD_TOP ||
        y > BOARD_BOTTOM
      ) {
        return;
      }
      this.touchTiltActive = true;
      this.touchStartX = x;
      this.touchStartY = y;
      this.touchTiltX = 0;
      this.touchTiltY = 0;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (
        this.phase !== 'pouring' ||
        !pointer.isDown ||
        !this.touchTiltActive
      ) {
        return;
      }
      const scaleX = this.scale.width / WIDTH;
      const scaleY = this.scale.height / HEIGHT;
      const x = pointer.x / scaleX;
      const y = pointer.y / scaleY;
      this.touchTiltX = Phaser.Math.Clamp((x - this.touchStartX) / 88, -1, 1);
      this.touchTiltY = Phaser.Math.Clamp((y - this.touchStartY) / 120, -1, 1);
    });
    const releaseTouchTilt = (): void => {
      this.touchTiltActive = false;
      this.touchTiltX = 0;
      this.touchTiltY = 0;
    };
    this.input.on('pointerup', releaseTouchTilt);
    this.input.on('pointerupoutside', releaseTouchTilt);
  }

  private setupVerse(resetBridges: boolean): void {
    this.clearParticles();
    this.clearRoomObjects();
    this.phase = 'planning';
    this.random = mulberry32(this.daySeed ^ ((this.verse + 1) * 0x9e3779b9));
    const safeOrders: FourNumbers[] = [
      [1, 0, 3, 2],
      [0, 2, 1, 3],
      [1, 0, 2, 3],
      [0, 1, 3, 2],
    ];
    this.sourceOrder =
      this.verse === 0
        ? [0, 1, 2, 3]
        : (safeOrders[(this.daySeed + this.verse) % safeOrders.length] ??
          safeOrders[0]!);
    this.windCharges = 3 + this.windBonus;
    this.guardGrains = this.charms.has('guard') ? 18 : 0;
    this.notesCollected = 0;
    this.guardianGustCount = 0;
    this.nextGuardianGustAt = 2_200;
    this.spawnedRows = 0;
    this.nextSpawnAt = 0;
    this.landed = 0;
    this.correct = 0;
    this.wrong = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.cupTotals = [0, 0, 0, 0];
    this.cupCorrect = [0, 0, 0, 0];
    this.spillPileCounts = [0, 0, 0];
    this.lastCupSparkAt = [-1_000, -1_000, -1_000, -1_000];
    this.lastSandImpactSoundAt = -1_000;
    this.shadowVortices = this.createShadowVortices();
    this.pegs = this.createPegLayout();
    this.drawBoard();
    if (resetBridges) this.resetBridgePositions();
    this.configureRoomExits();
    this.createNoteRunes();
    this.updateSourceOrder();
    this.updateHud();
    this.updateSongPreviewButton();
    this.updateCupStatus();
    this.setBridgeInteractivity(true);
    this.windButton.setVisible(false);
    this.windText.setVisible(false);
    this.windLabel.setVisible(false);
    this.instructionText
      .setPosition(WIDTH / 2, 644)
      .setText('TAP BAMBOO TO ROTATE · DRAG TO MOVE');
    this.actionButton.setVisible(true).setAlpha(1);
    this.actionLabel.setText('POUR SAND  ▶');
    this.drawRouteForecast();
  }

  private createPegLayout(): Peg[] {
    const rows = [3, 4, 3, 5][this.verse] ?? 4;
    const pegs: Peg[] = [];
    for (let row = 0; row < rows; row += 1) {
      const count = row % 2 === 0 ? 5 : 4;
      for (let index = 0; index < count; index += 1) {
        const baseX = count === 5 ? 57 : 91;
        const spacing = count === 5 ? 76 : 79;
        const jitter = (this.random() - 0.5) * (this.verse * 6 + 2);
        pegs.push({
          x: baseX + index * spacing + jitter,
          y: 221 + row * 58 + (this.random() - 0.5) * 7,
          radius: 5.2 + this.verse * 0.35,
        });
      }
    }
    return pegs;
  }

  private resetBridgePositions(): void {
    const positions = ROOM_BRIDGES[this.verse] ?? ROOM_BRIDGES[0];
    this.bridges.forEach((bridge, index) => {
      const position = positions[index] ?? positions[0]!;
      bridge.angle = position.angle;
      bridge.container
        .setPosition(position.x, position.y)
        .setAngle(position.angle);
    });
  }

  private clearRoomObjects(): void {
    for (const rune of this.noteRunes) rune.container.destroy(true);
    this.noteRunes = [];
    this.shadowVortices = [];
  }

  private createShadowVortices(): ShadowVortex[] {
    if (this.verse === 2) {
      return [
        { x: 168, y: 332, radius: 56, direction: 1 },
        { x: 306, y: 412, radius: 50, direction: -1 },
      ];
    }
    if (this.verse === 3) {
      return [{ x: 210, y: 354, radius: 48, direction: 1 }];
    }
    return [];
  }

  private createNoteRunes(): void {
    const positions = ROOM_NOTE_POSITIONS[this.verse] ?? ROOM_NOTE_POSITIONS[0];
    this.noteRunes = positions.map((position, index) => {
      const color = getColor((index + this.verse) % COLOR_COUNT);
      const glow = this.add.graphics();
      glow
        .fillStyle(color.hex, 0.14)
        .fillCircle(0, 0, 26)
        .lineStyle(2, color.hex, 0.8)
        .strokeCircle(0, 0, 17)
        .lineStyle(1, 0xfff0c5, 0.72)
        .strokeCircle(0, 0, 11);
      const note = this.add
        .text(0, -1, '♪', {
          fontFamily: DISPLAY_FONT,
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#fff8e8',
        })
        .setOrigin(0.5);
      const container = this.add
        .container(position.x, position.y, [glow, note])
        .setDepth(17);
      this.tweens.add({
        targets: container,
        scale: { from: 0.92, to: 1.08 },
        alpha: { from: 0.72, to: 1 },
        duration: 760 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      return {
        x: position.x,
        y: position.y,
        collected: false,
        container,
      };
    });
  }

  private configureRoomExits(): void {
    for (let cup = 0; cup < COLOR_COUNT; cup += 1) {
      const x = CUP_CENTERS[cup] ?? WIDTH / 2;
      const image = this.cupImages[cup];
      image
        ?.setVisible(true)
        .setTexture(`moon-bowl-${cup}`)
        .setPosition(x, CUP_Y)
        .setDisplaySize(CUP_DISPLAY_SIZE, CUP_DISPLAY_SIZE);
      this.cupLabels[cup]
        ?.setVisible(true)
        .setPosition(x, CUP_Y + 12)
        .setText(NOTE_LABELS[cup] ?? '♪');
      this.cupStatus[cup]?.setVisible(true).setPosition(x, 582);
    }
  }

  private updateSourceOrder(): void {
    for (let stream = 0; stream < COLOR_COUNT; stream += 1) {
      const color = this.sourceOrder[stream] ?? 0;
      this.sourceImages[stream]?.setTexture(`moon-tap-${color}`).setAlpha(1);
      this.sourceLabels[stream]
        ?.setText(getColor(color).name)
        .setColor(getColor(color).css);
    }
  }

  private drawRouteForecast(): void {
    this.forecastLayer.clear();
    if (this.phase !== 'planning') return;

    const forecasts = Array.from({ length: COLOR_COUNT }, (_, stream) =>
      this.simulateForecastRoute(stream)
    );
    const predictedNotes = new Set<number>();
    let colorsHome = 0;

    for (const forecast of forecasts) {
      const color = getColor(forecast.color);
      if (forecast.correct) colorsHome += 1;
      for (const note of forecast.notes) predictedNotes.add(note);

      for (let index = 1; index < forecast.points.length; index += 1) {
        const previous = forecast.points[index - 1];
        const point = forecast.points[index];
        if (!previous || !point) continue;
        this.forecastLayer
          .lineStyle(1, color.hex, 0.12)
          .lineBetween(previous.x, previous.y, point.x, point.y);
        if (index % 2 === 0) {
          this.forecastLayer
            .fillStyle(color.hex, 0.58)
            .fillCircle(point.x, point.y, index % 4 === 0 ? 1.8 : 1.25);
        }
      }

      const last = forecast.points.at(-1);
      if (!last) continue;
      if (forecast.correct) {
        this.forecastLayer
          .lineStyle(1.5, color.hex, 0.72)
          .strokeCircle(last.x, Math.min(last.y, 498), 6);
      } else {
        this.forecastLayer
          .lineStyle(1.5, 0xff6c77, 0.78)
          .lineBetween(
            last.x - 4,
            Math.min(last.y, 498) - 4,
            last.x + 4,
            Math.min(last.y, 498) + 4
          )
          .lineBetween(
            last.x + 4,
            Math.min(last.y, 498) - 4,
            last.x - 4,
            Math.min(last.y, 498) + 4
          );
      }
    }

    for (const noteIndex of predictedNotes) {
      const rune = this.noteRunes[noteIndex];
      if (!rune) continue;
      this.forecastLayer
        .lineStyle(1.5, 0xfff0c5, 0.58)
        .strokeCircle(rune.x, rune.y, 21);
    }

    const allPlanned =
      colorsHome === COLOR_COUNT &&
      predictedNotes.size === NOTE_SHARDS_PER_ROOM;
    this.actionLabel.setText(
      allPlanned ? 'POUR PERFECT PATH  ▶' : 'POUR SAND  ▶'
    );
    this.instructionText.setText(
      allPlanned
        ? 'PATH READY · ALL 4 COLORS · ALL 3 NOTES'
        : 'TAP BAMBOO TO ROTATE · DRAG TO MOVE'
    );
  }

  private simulateForecastRoute(stream: number): RouteForecast {
    const color = this.sourceOrder[stream] ?? 0;
    let x = STREAM_CENTERS[stream] ?? WIDTH / 2;
    let y = 199;
    let previousY: number;
    let vx = 0;
    let vy = 24;
    const points: ForecastPoint[] = [{ x, y }];
    const notes = new Set<number>();
    const step = 1 / 60;

    for (let tick = 0; tick < 420 && y < 501; tick += 1) {
      previousY = y;
      vy += 650 * step;

      if (y > 300) {
        const target = this.getDestinationX(color);
        const progress = Phaser.Math.Clamp((y - 300) / 200, 0, 1);
        const attraction = 0.65 + progress * 2.8;
        vx +=
          Phaser.Math.Clamp((target - x) * attraction, -1_200, 1_200) * step;
      }

      x += vx * step;
      y += vy * step;
      vx *= 0.997;
      vy *= 0.999;

      if (x < BOARD_LEFT + 8) {
        x = BOARD_LEFT + 8;
        vx = Math.abs(vx) * 0.62;
      } else if (x > BOARD_RIGHT - 8) {
        x = BOARD_RIGHT - 8;
        vx = -Math.abs(vx) * 0.62;
      }

      for (const peg of this.pegs) {
        const dx = x - peg.x;
        const dy = y - peg.y;
        const radius = peg.radius + 5.4;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radius * radius || distanceSquared < 0.01) {
          continue;
        }
        const distance = Math.sqrt(distanceSquared);
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = radius - distance;
        x += nx * overlap;
        y += ny * overlap;
        const velocity = vx * nx + vy * ny;
        if (velocity < 0) {
          vx -= 1.62 * velocity * nx;
          vy -= 1.62 * velocity * ny;
        }
        vx += stream % 2 === 0 ? 2.5 : -2.5;
      }

      for (const bridge of this.bridges) {
        const angle = Phaser.Math.DegToRad(bridge.angle);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const relativeX = x - bridge.container.x;
        const relativeY = y - bridge.container.y;
        const localX = relativeX * cos + relativeY * sin;
        const localY = -relativeX * sin + relativeY * cos;
        if (
          Math.abs(localX) > 68 ||
          Math.abs(localY) > 9 ||
          previousY > bridge.container.y + 15
        ) {
          continue;
        }
        const normalX = -sin;
        const normalY = cos;
        const push = localY < 0 ? -(9 + localY) : 9 - localY;
        x += normalX * push;
        y += normalY * push;
        const tangentVelocity = vx * cos + vy * sin;
        vx = tangentVelocity * cos + normalX * -42;
        vy = tangentVelocity * sin + normalY * -42;
        vy = Math.min(vy, 120);
      }

      for (const [noteIndex, rune] of this.noteRunes.entries()) {
        if (Math.hypot(x - rune.x, y - rune.y) <= 30) notes.add(noteIndex);
      }

      for (const vortex of this.shadowVortices) {
        const dx = vortex.x - x;
        const dy = vortex.y - y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));
        if (distance > vortex.radius) continue;
        const pull = (1 - distance / vortex.radius) * 520;
        vx +=
          (dx / distance) * pull * step +
          (-dy / distance) * vortex.direction * pull * 0.7 * step;
        vy +=
          (dy / distance) * pull * step +
          (dx / distance) * vortex.direction * pull * 0.7 * step;
        if (distance < 12) {
          points.push({ x, y });
          return { color, points, notes: [...notes], correct: false };
        }
      }

      if (tick % 5 === 0 || y >= 501) points.push({ x, y });
    }

    const exits = this.getRoomExitSlots();
    const exit = exits.reduce((best, candidate) =>
      Math.abs(candidate.x - x) < Math.abs(best.x - x) ? candidate : best
    );
    return {
      color,
      points,
      notes: [...notes],
      correct: y >= 501 && Math.abs(exit.x - x) <= 43 && exit.accepts(color),
    };
  }

  private updateHud(): void {
    const target = this.getTarget();
    const score =
      this.landed > 0 ? Math.round((this.correct / this.landed) * 100) : 0;
    this.verseText.setText(`ROOM ${this.verse + 1}/${ROOM_COUNT}`);
    this.scoreText
      .setText(`FILL ${score} / ${target}%`)
      .setColor(score >= target ? '#53e2b5' : '#fff8e8');
    this.noteText
      .setText(`NOTES  ♪ ${this.notesCollected}/${NOTE_SHARDS_PER_ROOM}`)
      .setColor(
        this.notesCollected >= NOTE_SHARDS_PER_ROOM ? '#53e2b5' : '#ffcc68'
      );
    this.roomNameText.setText(ROOM_NAMES[this.verse] ?? 'MOON TRAIL');
    this.goalText.setText(ROOM_OBJECTIVES[this.verse] ?? ROOM_OBJECTIVES[0]);
    this.lanternText
      .setText(`♥ ${this.lanterns}`)
      .setColor(this.lanterns === 1 ? '#ff6c77' : '#ffcc68');
    this.windText.setText(`×${this.windCharges}`);
  }

  private updateSongPreviewButton(): void {
    this.songPreviewButton.setVisible(false);
    if (this.verseScores.length === 0) {
      this.songPreviewButton.setAlpha(0.52);
      this.songPreviewLabel
        .setText('SONG LOCKED · CLEAR ROOM 1')
        .setColor('#aeb8d5');
      return;
    }
    if (this.phase === 'pouring') {
      this.songPreviewButton.setAlpha(0.58);
      this.songPreviewLabel
        .setText('≈ OCEAN SONG RECORDING…')
        .setColor('#aeb8d5');
      return;
    }
    this.songPreviewButton.setAlpha(1);
    this.songPreviewLabel
      .setText(
        `≈ HEAR RESTORED SONG · ${this.verseScores.length}/${ROOM_COUNT} LAYERS`
      )
      .setColor('#fff4d5');
  }

  private getTarget(): number {
    const base = VERSE_TARGETS[this.verse] ?? VERSE_TARGETS[0];
    return Math.max(30, base - (this.charms.has('echo') ? 4 : 0));
  }

  private getSpawnInterval(): number {
    const grainRows = VERSE_GRAINS[this.verse] ?? VERSE_GRAINS[0];
    const roomDuration = ROOM_DURATIONS[this.verse] ?? ROOM_DURATIONS[0];
    const continuousPourWindow = roomDuration - 1_800;
    return continuousPourWindow / Math.max(1, grainRows - 1);
  }

  private setBridgeInteractivity(enabled: boolean, draggable = enabled): void {
    for (const bridge of this.bridges) {
      this.restoreBridgeScale(bridge, false);
      if (enabled) {
        bridge.container.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, 144, 54),
          Phaser.Geom.Rectangle.Contains
        );
        this.input.setDraggable(bridge.container, draggable);
        bridge.image.setAlpha(1);
      } else {
        this.input.setDraggable(bridge.container, false);
        bridge.container.disableInteractive();
        bridge.image.setAlpha(0.92);
      }
    }
  }

  private startPour(): void {
    this.stopSongPlayback();
    this.phase = 'pouring';
    this.forecastLayer.clear();
    this.spawnedRows = 0;
    this.nextSpawnAt = 0;
    this.pourStartedAt = this.time.now;
    this.sensorBaseBeta = undefined;
    this.sensorBaseGamma = undefined;
    this.sensorTiltX = 0;
    this.sensorTiltY = 0;
    this.touchTiltActive = false;
    this.touchTiltX = 0;
    this.touchTiltY = 0;
    this.setBridgeInteractivity(true, false);
    this.windButton.setVisible(true);
    this.windText.setVisible(true);
    this.windLabel.setVisible(true);
    this.actionButton.setAlpha(0.7);
    this.actionLabel.setText(
      `${Math.round((ROOM_DURATIONS[this.verse] ?? ROOM_DURATIONS[0]) / 1000)}s · DRAG TO STEER`
    );
    this.instructionText
      .setPosition(238, 644)
      .setText(
        this.tiltPermission === 'granted'
          ? 'TILT OR DRAG · TAP BAMBOO ANYTIME'
          : 'DRAG TO STEER · TAP BAMBOO ANYTIME'
      );
    this.updateSongPreviewButton();
    this.ensureAudio();
    this.playSandPour();
    for (const source of this.sourceImages) {
      const baseScaleX = source.scaleX;
      const baseScaleY = source.scaleY;
      source.setScale(baseScaleX * 1.1, baseScaleY * 1.1);
      this.tweens.add({
        targets: source,
        scaleX: baseScaleX,
        scaleY: baseScaleY,
        duration: 340,
        ease: 'Back.Out',
      });
    }
  }

  private spawnRow(): void {
    for (let stream = 0; stream < COLOR_COUNT; stream += 1) {
      const color = this.sourceOrder[stream] ?? 0;
      for (let grain = 0; grain < GRAINS_PER_STREAM_TICK; grain += 1) {
        const x = (STREAM_CENTERS[stream] ?? 60) + (this.random() - 0.5) * 26;
        const y = 197 + this.random() * 10 + grain * 1.8;
        const variant = color * 4 + Math.floor(this.random() * 4);
        const size = 0.032 + this.random() * 0.011;
        const sprite = this.add
          .image(x, y, 'sand-grain', variant)
          .setScale(size)
          .setAlpha(0.97)
          .setDepth(20)
          .setBlendMode(Phaser.BlendModes.NORMAL);
        this.particles.push({
          x,
          y,
          previousX: x,
          previousY: y,
          vx: (this.random() - 0.5) * 28,
          vy: 18 + this.random() * 24,
          color,
          active: true,
          size,
          sprite,
          lastHitAt: -1_000,
        });
      }
    }
  }

  private getRoomExitSlots(): Array<{
    cup: number;
    x: number;
    accepts: (color: number) => boolean;
  }> {
    return CUP_CENTERS.map((x, cup) => ({
      cup,
      x,
      accepts: (color: number) => color === cup,
    }));
  }

  private getDestinationX(color: number): number {
    return (
      this.getRoomExitSlots().find((slot) => slot.accepts(color))?.x ??
      WIDTH / 2
    );
  }

  private getActiveTilt(): Phaser.Math.Vector2 {
    if (this.touchTiltActive) {
      return new Phaser.Math.Vector2(this.touchTiltX, this.touchTiltY);
    }
    return new Phaser.Math.Vector2(this.sensorTiltX, this.sensorTiltY);
  }

  private updateRoomMotion(elapsed: number, time: number): void {
    if (this.verse === 1) {
      const first = this.bridges[0];
      const second = this.bridges[1];
      if (first) {
        first.container.setAngle(first.angle + Math.sin(elapsed * 0.0018) * 17);
      }
      if (second) {
        second.container.setAngle(
          second.angle - Math.sin(elapsed * 0.00145 + 1.2) * 19
        );
      }
    }
    if (this.verse === 3 && elapsed >= this.nextGuardianGustAt) {
      this.nextGuardianGustAt += 1_850;
      this.guardianGustCount += 1;
      const direction = this.guardianGustCount % 2 === 0 ? -1 : 1;
      let affected = 0;
      for (const particle of this.particles) {
        if (!particle.active) continue;
        particle.vx += direction * (185 + this.random() * 65);
        particle.vy -= 42 + this.random() * 38;
        affected += 1;
      }
      this.gusts.push({
        x: direction > 0 ? BOARD_LEFT + 18 : BOARD_RIGHT - 18,
        y: 330,
        dx: direction,
        dy: -0.08,
        startedAt: time,
      });
      this.instructionText.setText(
        `GUST MOVED ${affected} · STEER BACK OR TAP WIND`
      );
    }
  }

  private updateParticles(step: number, time: number): void {
    const tilt = this.getActiveTilt();
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.vx += tilt.x * 690 * step;
      particle.vy += (650 + tilt.y * 210) * step;

      if (particle.y > 300) {
        const target = this.getDestinationX(particle.color);
        const progress = Phaser.Math.Clamp((particle.y - 300) / 200, 0, 1);
        const attraction = 0.65 + progress * 2.8;
        particle.vx +=
          Phaser.Math.Clamp((target - particle.x) * attraction, -1_200, 1_200) *
          step;
      }

      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.vx *= 0.997;
      particle.vy *= 0.999;

      if (particle.x < BOARD_LEFT + 8) {
        particle.x = BOARD_LEFT + 8;
        particle.vx = Math.abs(particle.vx) * 0.62;
      } else if (particle.x > BOARD_RIGHT - 8) {
        particle.x = BOARD_RIGHT - 8;
        particle.vx = -Math.abs(particle.vx) * 0.62;
      }

      for (const peg of this.pegs) this.collidePeg(particle, peg, time);
      for (const bridge of this.bridges)
        this.collideBridge(particle, bridge, time);
      this.collectNoteRunes(particle, time);
      this.applyShadowVortices(particle, step, time);

      if (!particle.active) continue;

      if (particle.y >= 501) this.landParticle(particle, time);
      if (particle.active) {
        particle.sprite.setPosition(particle.x, particle.y);
        const speed = Math.min(1.25, Math.abs(particle.vy) / 460);
        particle.sprite.setRotation(
          particle.sprite.rotation + step * (1.6 + speed * 3)
        );
      }
    }
  }

  private collidePeg(particle: Particle, peg: Peg, time: number): void {
    const dx = particle.x - peg.x;
    const dy = particle.y - peg.y;
    const distanceSquared = dx * dx + dy * dy;
    const radius = peg.radius + 5.4;
    if (distanceSquared >= radius * radius || distanceSquared < 0.01) return;
    const distance = Math.sqrt(distanceSquared);
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = radius - distance;
    particle.x += nx * overlap;
    particle.y += ny * overlap;
    const velocity = particle.vx * nx + particle.vy * ny;
    if (velocity < 0) {
      this.registerSandImpact(-velocity, particle.x);
      particle.vx -= 1.62 * velocity * nx;
      particle.vy -= 1.62 * velocity * ny;
    }
    particle.vx += (this.random() - 0.5) * 18;
    if (time - particle.lastHitAt > 130) {
      particle.lastHitAt = time;
      this.registerSongHit(particle.color, time, 0.35);
      this.sparks.push({
        x: particle.x,
        y: particle.y,
        color: particle.color,
        startedAt: time,
        strength: 0.55,
      });
    }
  }

  private collideBridge(
    particle: Particle,
    bridge: Bridge,
    time: number
  ): void {
    const angle = Phaser.Math.DegToRad(bridge.container.angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const relativeX = particle.x - bridge.container.x;
    const relativeY = particle.y - bridge.container.y;
    const localX = relativeX * cos + relativeY * sin;
    const localY = -relativeX * sin + relativeY * cos;
    if (
      Math.abs(localX) > 68 ||
      Math.abs(localY) > 9 ||
      particle.previousY > bridge.container.y + 15
    ) {
      return;
    }
    const normalX = -sin;
    const normalY = cos;
    const impactSpeed = Math.abs(particle.vx * normalX + particle.vy * normalY);
    this.registerSandImpact(impactSpeed, particle.x);
    const push = localY < 0 ? -(9 + localY) : 9 - localY;
    particle.x += normalX * push;
    particle.y += normalY * push;
    const tangentVelocity = particle.vx * cos + particle.vy * sin;
    particle.vx = tangentVelocity * cos + normalX * -42;
    particle.vy = tangentVelocity * sin + normalY * -42;
    particle.vy = Math.min(particle.vy, 120);
    if (time - particle.lastHitAt > 95) {
      particle.lastHitAt = time;
      this.registerSongHit(particle.color, time, 0.8);
      if (time - bridge.lastSparkAt > 90) {
        bridge.lastSparkAt = time;
        if (impactSpeed > 72 && time - bridge.lastWoodSoundAt > 145) {
          bridge.lastWoodSoundAt = time;
          this.playBambooSound(
            'impact',
            this.bridges.indexOf(bridge),
            particle.x,
            Phaser.Math.Clamp(impactSpeed / 520, 0.12, 0.86),
            bridge.angle
          );
        }
        this.sparks.push({
          x: particle.x,
          y: particle.y,
          color: particle.color,
          startedAt: time,
          strength: 1,
        });
        bridge.image.setTint(getColor(particle.color).hex);
        this.time.delayedCall(100, () => bridge.image.clearTint());
      }
    }
  }

  private registerSongHit(color: number, time: number, weight: number): void {
    const elapsed = Math.max(0, time - this.pourStartedAt);
    const duration = ROOM_DURATIONS[this.verse] ?? ROOM_DURATIONS[0];
    const beat = Math.min(
      BEAT_COUNT - 1,
      Math.floor((elapsed / duration) * BEAT_COUNT)
    );
    const beatWeights = this.songWeights[beat];
    if (beatWeights) beatWeights[color] = (beatWeights[color] ?? 0) + weight;
  }

  private registerSandImpact(speed: number, x: number): void {
    const energy = Phaser.Math.Clamp(speed / 620, 0.04, 1);
    this.sandImpactEnergy = Phaser.Math.Clamp(
      this.sandImpactEnergy + energy * 0.24,
      0,
      1
    );
    const pan = Phaser.Math.Clamp((x - WIDTH / 2) / (WIDTH * 0.46), -1, 1);
    this.sandImpactPan = Phaser.Math.Linear(this.sandImpactPan, pan, 0.42);
    this.emitImpactFoley(speed, x, pan);
  }

  private emitImpactFoley(speed: number, x: number, pan: number): void {
    const context = this.audioContext;
    const sample = this.sandPourSample;
    const nowMs = this.time.now;
    if (
      !this.soundEnabled ||
      !context ||
      context.state === 'suspended' ||
      !sample ||
      speed < 86 ||
      nowMs - this.lastSandImpactSoundAt < 32
    ) {
      return;
    }
    this.lastSandImpactSoundAt = nowMs;

    const force = Phaser.Math.Clamp((speed - 86) / 470, 0, 1);
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const now = context.currentTime;
    const duration = Math.min(0.064, Math.max(0.035, sample.duration - 0.01));
    const maxOffset = Math.max(0, sample.duration - duration - 0.005);
    const offsetPhase = (x * 0.013 + nowMs * 0.00023) % 1;
    const offset = offsetPhase * maxOffset;

    source.buffer = sample;
    source.playbackRate.value = 0.88 + force * 0.2;
    highpass.type = 'highpass';
    highpass.frequency.value = 280;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4_600 + force * 900;
    panner.pan.value = pan * 0.58;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.0014 + force * 0.0052, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(panner);
    panner.connect(context.destination);
    source.start(now, offset, duration);
  }

  private collectNoteRunes(particle: Particle, time: number): void {
    for (const rune of this.noteRunes) {
      if (rune.collected) continue;
      if (
        Phaser.Math.Distance.Between(particle.x, particle.y, rune.x, rune.y) >
        30
      ) {
        continue;
      }
      rune.collected = true;
      this.notesCollected += 1;
      this.registerSongHit(particle.color, time, 2.4);
      this.sparks.push({
        x: rune.x,
        y: rune.y,
        color: particle.color,
        startedAt: time,
        strength: 1.8,
      });
      this.tweens.killTweensOf(rune.container);
      this.tweens.add({
        targets: rune.container,
        scale: 1.8,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.Out',
        onComplete: () => rune.container.destroy(true),
      });
      this.instructionText.setText(
        this.notesCollected >= NOTE_SHARDS_PER_ROOM
          ? 'ALL NOTES FOUND\nMATCH EACH COLOR TO ITS GLASS'
          : `NOTE FOUND · ${this.notesCollected}/${NOTE_SHARDS_PER_ROOM}\nKEEP THE TIDE MOVING`
      );
      this.updateHud();
    }
  }

  private applyShadowVortices(
    particle: Particle,
    step: number,
    time: number
  ): void {
    for (const vortex of this.shadowVortices) {
      const dx = vortex.x - particle.x;
      const dy = vortex.y - particle.y;
      const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
      if (distance > vortex.radius) continue;
      const pull = (1 - distance / vortex.radius) * 520;
      particle.vx +=
        (dx / distance) * pull * step +
        (-dy / distance) * vortex.direction * pull * 0.7 * step;
      particle.vy +=
        (dy / distance) * pull * step +
        (dx / distance) * vortex.direction * pull * 0.7 * step;
      if (distance < 12) {
        this.consumeParticle(particle, time, vortex.x, vortex.y);
        return;
      }
    }
  }

  private consumeParticle(
    particle: Particle,
    time: number,
    x: number,
    y: number
  ): void {
    if (!particle.active) return;
    this.registerSandImpact(Math.hypot(particle.vx, particle.vy), x);
    particle.active = false;
    particle.sprite.destroy();
    this.landed += 1;
    this.wrong += 1;
    this.combo = 0;
    this.sparks.push({
      x,
      y,
      color: particle.color,
      startedAt: time,
      strength: 0.5,
    });
    this.updateHud();
  }

  private landParticle(particle: Particle, time: number): void {
    this.registerSandImpact(Math.abs(particle.vy), particle.x);
    const exits = this.getRoomExitSlots();
    const exit = exits.reduce((best, candidate) =>
      Math.abs(candidate.x - particle.x) < Math.abs(best.x - particle.x)
        ? candidate
        : best
    );
    let cup = exit.cup;
    const actuallyCorrect =
      Math.abs(exit.x - particle.x) <= 43 && exit.accepts(particle.color);
    const rescued = !actuallyCorrect && this.guardGrains > 0;
    if (rescued) this.guardGrains -= 1;
    const correct = actuallyCorrect || rescued;
    particle.active = false;
    this.landed += 1;
    if (correct) {
      if (rescued) cup = particle.color;
      this.cupTotals[cup] = (this.cupTotals[cup] ?? 0) + 1;
      this.correct += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.cupCorrect[cup] = (this.cupCorrect[cup] ?? 0) + 1;
      this.settleParticleInCup(particle, cup, rescued);
      this.registerSongHit(particle.color, time, 1.1);
    } else {
      this.wrong += 1;
      this.combo = 0;
      this.spillParticleToGround(particle);
    }
    if (correct && time - (this.lastCupSparkAt[cup] ?? -1_000) > 70) {
      this.lastCupSparkAt[cup] = time;
      this.sparks.push({
        x: CUP_CENTERS[cup] ?? exit.x,
        y: CUP_Y - 7,
        color: particle.color,
        startedAt: time,
        strength: 1.25,
      });
    }
    const cupImage = correct ? this.cupImages[cup] : undefined;
    if (cupImage) {
      this.tweens.killTweensOf(cupImage);
      const baseScaleX = CUP_DISPLAY_SIZE / cupImage.width;
      const baseScaleY = CUP_DISPLAY_SIZE / cupImage.height;
      cupImage.setScale(baseScaleX * 1.07, baseScaleY * 1.07);
      this.tweens.add({
        targets: cupImage,
        scaleX: baseScaleX,
        scaleY: baseScaleY,
        duration: 150,
        ease: 'Back.Out',
      });
    }
    this.updateCupStatus();
    this.updateHud();
  }

  private settleParticleInCup(
    particle: Particle,
    cup: number,
    rescued: boolean
  ): void {
    const count = this.cupCorrect[cup] ?? 1;
    const target = this.getCupPackingPosition(cup, count);
    particle.sprite
      .setPosition(particle.x, particle.y)
      .setDepth(15)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(0.96);
    this.tweens.add({
      targets: particle.sprite,
      x: target.x,
      y: target.y,
      scale: CUP_SETTLED_GRAIN_SCALE,
      angle: Phaser.Math.Wrap(count * 47, -180, 180),
      duration: rescued ? 420 : 190,
      ease: rescued ? 'Back.Out' : 'Quad.In',
    });
  }

  private getCupPackingPosition(
    cup: number,
    count: number
  ): Phaser.Math.Vector2 {
    let remaining = Math.max(0, count - 1);
    let row = 0;
    const rowCapacity = 9;
    while (remaining >= rowCapacity) {
      remaining -= rowCapacity;
      row += 1;
    }

    const spacing = 4;
    const centeredSlot = remaining - (rowCapacity - 1) / 2;
    const rowShift = row % 2 === 0 ? -0.55 : 0.55;
    const jitterX = (((count * 17 + cup * 13) % 11) - 5) * 0.12;
    const jitterY = (((count * 11 + cup * 5) % 7) - 3) * 0.22;
    const cupCenter = CUP_CENTERS[cup] ?? WIDTH / 2;
    const unpackedX = cupCenter + centeredSlot * spacing + rowShift + jitterX;
    const targetX = Phaser.Math.Clamp(
      unpackedX,
      cupCenter - CUP_PACKING_HALF_WIDTH,
      cupCenter + CUP_PACKING_HALF_WIDTH
    );
    const packedY = CUP_INNER_FLOOR_Y - row * CUP_GRAIN_ROW_HEIGHT + jitterY;
    const targetY = Math.max(CUP_INNER_RIM_Y + 6, packedY);
    return new Phaser.Math.Vector2(targetX, targetY);
  }

  private spillParticleToGround(particle: Particle): void {
    const gap = SPILL_CENTERS.reduce(
      (best, center, index) =>
        Math.abs(center - particle.x) <
        Math.abs((SPILL_CENTERS[best] ?? center) - particle.x)
          ? index
          : best,
      0
    );
    const count = (this.spillPileCounts[gap] ?? 0) + 1;
    this.spillPileCounts[gap] = count;
    const jitter = (((count * 37 + particle.color * 13) % 23) - 11) * 1.65;
    const row = Math.floor((count - 1) / 10);
    const targetX = (SPILL_CENTERS[gap] ?? WIDTH / 2) + jitter;
    const targetY = 572 - Math.min(20, row * 2.8) - Math.abs(jitter) * 0.08;
    particle.sprite
      .setPosition(particle.x, particle.y)
      .setDepth(20)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(0.88);
    this.tweens.add({
      targets: particle.sprite,
      x: targetX,
      y: targetY,
      scale: 0.034,
      angle: Phaser.Math.Wrap(count * 71, -180, 180),
      duration: 360,
      ease: 'Quad.In',
      onComplete: () => particle.sprite.setDepth(13),
    });
  }

  private updateCupStatus(): void {
    for (let cup = 0; cup < COLOR_COUNT; cup += 1) {
      const correct = this.cupCorrect[cup] ?? 0;
      this.cupStatus[cup]
        ?.setText(
          correct > 0
            ? `${getColor(cup).name} · ${correct}`
            : getColor(cup).name
        )
        .setColor(getColor(cup).css);
    }
  }

  private useWind(x: number, y: number, dx: number, dy: number): void {
    if (this.windCharges <= 0) {
      this.windText.setColor('#ff6c77');
      this.time.delayedCall(220, () => this.windText.setColor('#68eadb'));
      return;
    }
    this.windCharges -= 1;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / length;
    const ny = dy / length;
    let affected = 0;
    for (const particle of this.particles) {
      if (!particle.active) continue;
      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        particle.x,
        particle.y
      );
      if (distance > 170) continue;
      const power = (1 - distance / 170) * 330;
      particle.vx += nx * power;
      particle.vy += ny * power * 0.34 - 28;
      affected += 1;
    }
    this.gusts.push({ x, y, dx: nx, dy: ny, startedAt: this.time.now });
    this.windText.setText(`×${this.windCharges}`);
    this.instructionText.setText(
      this.windCharges > 0
        ? `WIND SAVED ${affected} · ${this.windCharges} LEFT`
        : 'NO WIND LEFT · DRAG OR TILT TO STEER'
    );
  }

  private drawEffects(time: number): void {
    this.effectsLayer.clear();
    for (const vortex of this.shadowVortices) {
      const pulse = 0.5 + Math.sin(time * 0.006 * vortex.direction) * 0.5;
      for (let ring = 0; ring < 3; ring += 1) {
        const radius = 14 + ring * 9 + pulse * 5;
        this.effectsLayer
          .lineStyle(2 - ring * 0.35, 0x9b79ff, 0.52 - ring * 0.1)
          .strokeCircle(vortex.x, vortex.y, radius);
      }
      this.effectsLayer
        .fillStyle(0x03020b, 0.76)
        .fillCircle(vortex.x, vortex.y, 11)
        .fillStyle(0xff6c77, 0.82)
        .fillCircle(vortex.x + Math.cos(time * 0.008) * 5, vortex.y, 2.2);
    }

    if (this.phase === 'pouring') {
      const tilt = this.getActiveTilt();
      const magnitude = Math.min(1, Math.sqrt(tilt.x ** 2 + tilt.y ** 2));
      const startX = WIDTH / 2;
      const startY = 198;
      const endX = startX + tilt.x * 34;
      const endY = startY + tilt.y * 20;
      this.effectsLayer
        .fillStyle(0x071025, 0.72)
        .fillCircle(startX, startY, 14)
        .lineStyle(2.4, 0x7ff5e5, 0.45 + magnitude * 0.45)
        .lineBetween(startX, startY, endX, endY)
        .fillStyle(0xfff0c5, 0.65 + magnitude * 0.35)
        .fillCircle(endX, endY, 3.6);
    }

    this.gusts = this.gusts.filter((gust) => time - gust.startedAt < 620);
    for (const gust of this.gusts) {
      const progress = (time - gust.startedAt) / 620;
      for (let line = -2; line <= 2; line += 1) {
        const offsetX = -gust.dy * line * 11;
        const offsetY = gust.dx * line * 11;
        const length = 72 + progress * 90;
        this.effectsLayer
          .lineStyle(2.2 - progress * 1.4, 0x7ff5e5, (1 - progress) * 0.75)
          .beginPath()
          .moveTo(
            gust.x + offsetX - gust.dx * 35,
            gust.y + offsetY - gust.dy * 35
          )
          .lineTo(
            gust.x + offsetX + gust.dx * length,
            gust.y + offsetY + gust.dy * length
          )
          .strokePath();
      }
    }

    this.sparks = this.sparks.filter((spark) => time - spark.startedAt < 520);
    for (const spark of this.sparks) {
      const progress = (time - spark.startedAt) / 520;
      const radius = 5 + progress * 25 * spark.strength;
      this.effectsLayer
        .lineStyle(1.6, getColor(spark.color).hex, (1 - progress) * 0.8)
        .strokeCircle(spark.x, spark.y, radius)
        .fillStyle(0xfff4d0, (1 - progress) * 0.85)
        .fillCircle(spark.x, spark.y, Math.max(0.5, 3.2 - progress * 2.5));
    }
  }

  private finishVerse(): void {
    if (this.phase !== 'pouring') return;
    this.fadeSandPour();
    this.phase = 'verse-result';
    const stranded = this.particles.reduce(
      (count, particle) => count + (particle.active ? 1 : 0),
      0
    );
    this.landed += stranded;
    this.wrong += stranded;
    this.clearActiveParticles();
    const score =
      this.landed > 0 ? Math.round((this.correct / this.landed) * 100) : 0;
    const target = this.getTarget();
    const foundEveryNote = this.notesCollected >= NOTE_SHARDS_PER_ROOM;
    this.scoreText.setText(`FILL ${score} / ${target}%`);
    this.windButton.setVisible(false);
    this.windText.setVisible(false);
    this.windLabel.setVisible(false);
    this.actionButton.setVisible(false);
    if (score >= target && foundEveryNote) {
      this.verseScores[this.verse] = score;
      this.currentPattern = this.buildPattern();
      if (this.verse >= ROOM_COUNT - 1) {
        this.time.delayedCall(350, () => this.showFinale());
      } else {
        this.time.delayedCall(350, () => this.showVerseClear(score));
      }
    } else {
      this.lanterns -= 1;
      this.updateHud();
      if (this.lanterns <= 0) this.showGameOver(score, target);
      else this.showVerseFailed(score, target);
    }
  }

  private buildPattern(): ChorusPattern {
    return makePattern(
      this.songWeights.map((weights, beat) => {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        if (totalWeight <= 0) return beat % COLOR_COUNT;
        let best = beat % COLOR_COUNT;
        let bestWeight = -1;
        for (let color = 0; color < COLOR_COUNT; color += 1) {
          const weight = weights[color] ?? 0;
          if (weight > bestWeight) {
            best = color;
            bestWeight = weight;
          }
        }
        return best;
      })
    );
  }

  private showVerseClear(score: number): void {
    this.destroyOverlay();
    const overlay = this.createCeremonyOverlay(0x081025, 0.9);
    this.overlay = overlay;
    const guide = this.add
      .image(0, -157, 'reddit-koto-guide')
      .setDisplaySize(124, 124);
    const title = this.add
      .text(0, -100, `${ROOM_NAMES[this.verse]} CLEARED`, {
        fontFamily: DISPLAY_FONT,
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#fff0c5',
      })
      .setOrigin(0.5);
    const result = this.add
      .text(
        0,
        -64,
        `${score}% SAND SAVED  ·  ${this.notesCollected}/${NOTE_SHARDS_PER_ROOM} NOTES`,
        {
          fontFamily: UI_FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#55e4c1',
          letterSpacing: 0.65,
        }
      )
      .setOrigin(0.5);
    const choice = this.add
      .text(
        0,
        -16,
        `YOUR SONG  ·  ${this.verseScores.length}/${ROOM_COUNT} FRAGMENTS RESTORED`,
        {
          fontFamily: UI_FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#b9c2de',
          letterSpacing: 0.55,
        }
      )
      .setOrigin(0.5);
    const hearSong = this.createOverlayButton(
      0,
      25,
      '≈ HEAR OCEAN SONG · 7s PREVIEW',
      OVERLAY_OCEAN_BUTTON,
      () => this.playPattern(this.currentPattern, 2)
    );
    const choose = this.add
      .text(0, 61, "CLEAR ALL 4 → ADD YOUR SONG TO TODAY'S REDDIT CHORUS", {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#fff4d5',
        letterSpacing: 0.45,
      })
      .setOrigin(0.5);
    overlay.add([guide, title, result, choice, hearSong, choose]);

    const options: [Charm, Charm] =
      this.verse === 0 ? ['wind', 'guard'] : ['echo', 'wind'];
    overlay.add(this.createCharmCard(-88, 163, options[0]));
    overlay.add(this.createCharmCard(88, 163, options[1]));
    this.animateOverlayIn(overlay);
    this.playOceanWave(3.2, 0.034);
  }

  private createCharmCard(
    x: number,
    y: number,
    charm: Charm
  ): Phaser.GameObjects.Container {
    const definitions = {
      wind: {
        title: 'SNOO WIND',
        body: '+2 FAN BURSTS\nEVERY ROOM',
        texture: 'wind-fan',
        color: 0x25cfb5,
      },
      guard: {
        title: 'MOON RIM',
        body: 'RESCUE FIRST 18\nLOST SAND STARS',
        texture: 'moon-bowl-1',
        color: 0xffb52e,
      },
      echo: {
        title: 'GOLDEN ECHO',
        body: 'SAND GOAL −4%\nFINAL HARMONY +8',
        texture: 'bamboo-bridge',
        color: 0x766bff,
      },
    } as const;
    const definition = definitions[charm];
    const shape = this.add.graphics();
    shape
      .fillStyle(0x1b2148, 0.98)
      .fillRoundedRect(-76, -93, 152, 186, 18)
      .lineStyle(2, definition.color, 0.74)
      .strokeRoundedRect(-76, -93, 152, 186, 18)
      .fillStyle(definition.color, 0.14)
      .fillCircle(0, -40, 46);
    const image = this.add
      .image(0, -40, definition.texture)
      .setDisplaySize(charm === 'echo' ? 108 : 78, charm === 'echo' ? 40 : 78);
    const title = this.add
      .text(0, 18, definition.title, {
        fontFamily: DISPLAY_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fff0c5',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(0, 53, definition.body, {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#c5cee8',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5);
    const card = this.add
      .container(x, y, [shape, image, title, body])
      .setSize(152, 186);
    const hitZone = this.createOverlayHitZone(
      card,
      x,
      y,
      164,
      198,
      () => this.chooseCharm(charm),
      0.985
    );
    hitZone.on('pointerover', () => card.setScale(1.03));
    hitZone.on('pointerout', () => card.setScale(1));
    return card;
  }

  private chooseCharm(charm: Charm): void {
    if (this.phase === 'charm') return;
    this.phase = 'charm';
    this.charms.add(charm);
    if (charm === 'wind') this.windBonus += 2;
    if (charm === 'echo') this.echoBonus += 8;
    this.playSeaGlass(charm === 'wind' ? 2 : charm === 'guard' ? 1 : 3, 0.04);
    this.destroyOverlay();
    this.verse += 1;
    this.setupVerse(true);
  }

  private showVerseFailed(score: number, target: number): void {
    this.destroyOverlay();
    const overlay = this.createCeremonyOverlay(0x170a18, 0.93);
    this.overlay = overlay;
    const guide = this.add
      .image(0, -138, 'reddit-koto-guide')
      .setDisplaySize(116, 116)
      .setTint(0xd7a8ba);
    const title = this.add
      .text(0, -65, `${ROOM_NAMES[this.verse]} CLOSED`, {
        fontFamily: DISPLAY_FONT,
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#ffd7dc',
      })
      .setOrigin(0.5);
    const result = this.add
      .text(
        0,
        -18,
        `SAND ${score}% / ${target}%  ·  NOTES ${this.notesCollected}/${NOTE_SHARDS_PER_ROOM}`,
        {
          fontFamily: UI_FONT,
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ff6c77',
        }
      )
      .setOrigin(0.5);
    const missingReason =
      score < target && this.notesCollected < NOTE_SHARDS_PER_ROOM
        ? 'SAVE MORE SAND AND FIND EVERY NOTE'
        : score < target
          ? 'MATCH MORE SAND INTO ITS COLOR GLASS'
          : 'FIND ALL 3 GLOWING MUSIC NOTES';
    const explanation = this.add
      .text(
        0,
        30,
        `${missingReason}\nLIFE LOST  ·  ${this.lanterns} ${this.lanterns === 1 ? 'LIFE' : 'LIVES'} LEFT`,
        {
          fontFamily: UI_FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#c9c1d4',
          align: 'center',
          lineSpacing: 5,
        }
      )
      .setOrigin(0.5);
    const retry = this.createOverlayButton(
      0,
      106,
      `RETRY ${ROOM_NAMES[this.verse]}`,
      0xff526f,
      () => {
        this.destroyOverlay();
        this.setupVerse(false);
      }
    );
    overlay.add([guide, title, result, explanation, retry]);
    this.animateOverlayIn(overlay);
  }

  private showGameOver(score: number, target: number): void {
    this.phase = 'game-over';
    this.destroyOverlay();
    const overlay = this.createCeremonyOverlay(0x130917, 0.95);
    this.overlay = overlay;
    const guide = this.add
      .image(0, -148, 'reddit-koto-guide')
      .setDisplaySize(132, 132)
      .setTint(0x9ba0b6);
    const title = this.add
      .text(0, -62, 'YOU LOST', {
        fontFamily: DISPLAY_FONT,
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#e9dfef',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        0,
        2,
        `0 LIVES LEFT\n${ROOM_NAMES[this.verse]}: ${score}% / ${target}% SAND\nNOTES ${this.notesCollected}/${NOTE_SHARDS_PER_ROOM}  ·  ROOM ${this.verse + 1} OF ${ROOM_COUNT}`,
        {
          fontFamily: UI_FONT,
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#b8b5c8',
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);
    const retry = this.createOverlayButton(
      0,
      92,
      'START A NEW EXPEDITION',
      0xff526f,
      () => {
        this.destroyOverlay();
        this.restartNight();
      }
    );
    overlay.add([guide, title, body, retry]);
    this.animateOverlayIn(overlay);
  }

  private showFinale(): void {
    this.phase = 'final';
    this.destroyOverlay();
    this.currentPattern = this.buildPattern();
    const average =
      this.verseScores.reduce((sum, score) => sum + score, 0) /
      Math.max(1, this.verseScores.length);
    const finalScore = Phaser.Math.Clamp(
      Math.round(average + this.echoBonus),
      0,
      100
    );
    const overlay = this.createCeremonyOverlay(0x071025, 0.96);
    this.overlay = overlay;
    const guide = this.add
      .image(126, -185, 'reddit-koto-guide')
      .setDisplaySize(102, 102);
    const eyebrow = this.add
      .text(-145, -208, 'ALL 4 ROOMS RESTORED', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#e9b85d',
        letterSpacing: 1.1,
      })
      .setOrigin(0, 0.5);
    const title = this.add
      .text(-145, -175, 'EXPEDITION\nCOMPLETE', {
        fontFamily: DISPLAY_FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fff0c5',
        lineSpacing: -2,
      })
      .setOrigin(0, 0.5);
    const score = this.add
      .text(0, -112, `${finalScore}`, {
        fontFamily: DISPLAY_FONT,
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#53e2b5',
      })
      .setOrigin(0.5);
    const scoreLabel = this.add
      .text(0, -78, 'RESTORED HARMONY', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#aeb8d5',
        letterSpacing: 1.2,
      })
      .setOrigin(0.5);
    const drawingLabel = this.add
      .text(0, -42, 'YOUR 8-NOTE SONG IS BEING DRAWN…', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fff4d5',
      })
      .setOrigin(0.5);
    const constellation = this.add.graphics();
    const noteTexts = Array.from({ length: BEAT_COUNT }, () =>
      this.add
        .text(0, 0, '♪', {
          fontFamily: DISPLAY_FONT,
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#fff8e8',
        })
        .setOrigin(0.5)
        .setVisible(false)
    );
    const community = this.add
      .text(
        0,
        76,
        `TODAY'S REDDIT SONG  ·  ${this.state.playerCount}/100 VOICES\nYOUR 8 NOTES ARE READY TO JOIN`,
        {
          fontFamily: UI_FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#aeb8d5',
          align: 'center',
          lineSpacing: 5,
        }
      )
      .setOrigin(0.5);
    const hearSong = this.createOverlayButton(
      0,
      120,
      '≈ HEAR MY 14s OCEAN',
      OVERLAY_OCEAN_BUTTON,
      () => this.playPattern(this.currentPattern)
    );
    const submit = this.createOverlayButton(
      0,
      177,
      this.state.loggedIn
        ? this.state.submitted
          ? 'UPDATE MY BEST HARMONY'
          : "ADD MY 8 NOTES TO TODAY'S SONG"
        : 'SIGN IN ON REDDIT TO ADD MY NOTES',
      this.state.loggedIn ? OVERLAY_OCEAN_BUTTON : 0x505773,
      () => {
        if (this.state.loggedIn)
          void this.submitScore(finalScore, submit, community);
      }
    );
    const replay = this.createOverlayButton(
      0,
      234,
      'EXPLORE AGAIN',
      0xff526f,
      () => {
        this.destroyOverlay();
        this.restartNight();
      }
    );
    overlay.add([
      guide,
      eyebrow,
      title,
      score,
      scoreLabel,
      drawingLabel,
      constellation,
      ...noteTexts,
      community,
      hearSong,
      submit,
      replay,
    ]);
    this.animateOverlayIn(overlay);

    let lastNote = -1;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: 420,
      duration: 4_200,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        this.drawConstellation(constellation, progress, this.currentPattern);
        const revealed = Math.min(
          BEAT_COUNT - 1,
          Math.floor(progress * BEAT_COUNT)
        );
        if (revealed > lastNote) {
          for (let note = lastNote + 1; note <= revealed; note += 1) {
            const point = this.getConstellationPoint(
              note,
              this.currentPattern[note] ?? 0
            );
            noteTexts[note]
              ?.setPosition(point.x, point.y)
              .setVisible(true)
              .setScale(0.3);
            const text = noteTexts[note];
            if (text)
              this.tweens.add({
                targets: text,
                scale: 1,
                duration: 300,
                ease: 'Back.Out',
              });
            this.playSeaGlass(this.currentPattern[note] ?? 0, 0.03);
          }
          lastNote = revealed;
        }
      },
      onComplete: () => {
        drawingLabel.setText('PLAYING YOUR 14-SECOND OCEAN SONG');
        this.playPattern(this.currentPattern);
      },
    });
  }

  private drawConstellation(
    graphics: Phaser.GameObjects.Graphics,
    progress: number,
    pattern: ChorusPattern
  ): void {
    graphics.clear();
    const clamped = Phaser.Math.Clamp(progress, 0, 1);
    const visibleSegments = clamped * (BEAT_COUNT - 1);
    for (let segment = 0; segment < BEAT_COUNT - 1; segment += 1) {
      const local = Phaser.Math.Clamp(visibleSegments - segment, 0, 1);
      if (local <= 0) continue;
      const start = this.getConstellationPoint(segment, pattern[segment] ?? 0);
      const end = this.getConstellationPoint(
        segment + 1,
        pattern[segment + 1] ?? 0
      );
      const currentX = Phaser.Math.Linear(start.x, end.x, local);
      const currentY = Phaser.Math.Linear(start.y, end.y, local);
      const color = getColor(pattern[segment] ?? 0).hex;
      graphics
        .lineStyle(7, color, 0.1)
        .lineBetween(start.x, start.y, currentX, currentY)
        .lineStyle(2, color, 0.9)
        .lineBetween(start.x, start.y, currentX, currentY);
    }
    const visibleNodes = Math.min(BEAT_COUNT, Math.ceil(clamped * BEAT_COUNT));
    for (let index = 0; index < visibleNodes; index += 1) {
      const point = this.getConstellationPoint(index, pattern[index] ?? 0);
      const color = getColor(pattern[index] ?? 0).hex;
      graphics
        .fillStyle(color, 0.22)
        .fillCircle(point.x, point.y, 12)
        .fillStyle(color, 1)
        .fillCircle(point.x, point.y, 7)
        .lineStyle(1.5, 0xfff0c5, 0.9)
        .strokeCircle(point.x, point.y, 8.5);
    }
  }

  private getConstellationPoint(
    index: number,
    color: number
  ): Phaser.Math.Vector2 {
    const x = -142 + index * 40.5;
    const levels = [22, -7, 17, -22];
    const wave = Math.sin(index * 1.7) * 9;
    return new Phaser.Math.Vector2(x, 17 + (levels[color] ?? 0) + wave);
  }

  private restartNight(): void {
    this.stopSongPlayback();
    this.verse = 0;
    this.lanterns = 3;
    this.verseScores = [];
    this.charms.clear();
    this.windBonus = 0;
    this.echoBonus = 0;
    this.notesCollected = 0;
    this.sensorTiltX = 0;
    this.sensorTiltY = 0;
    this.touchTiltActive = false;
    this.songWeights = Array.from({ length: BEAT_COUNT }, (): FourNumbers => [
      0, 0, 0, 0,
    ]);
    this.setupVerse(true);
  }

  private async requestTiltPermission(): Promise<void> {
    if (!('DeviceOrientationEvent' in window)) {
      this.tiltPermission = 'unsupported';
      return;
    }
    try {
      const OrientationEvent = window.DeviceOrientationEvent;
      const permission = canRequestOrientationPermission(OrientationEvent)
        ? await OrientationEvent.requestPermission()
        : 'granted';
      this.tiltPermission = permission;
      if (permission === 'granted') {
        window.removeEventListener(
          'deviceorientation',
          this.onDeviceOrientation
        );
        window.addEventListener('deviceorientation', this.onDeviceOrientation, {
          passive: true,
        });
      }
    } catch (error) {
      console.warn('Tilt controls unavailable; using touch gravity', error);
      this.tiltPermission = 'denied';
    }
  }

  private beginExpedition(): void {
    void this.requestTiltPermission();
    this.destroyOverlay();
    this.phase = 'planning';
    this.setupVerse(true);
    this.showInstructionPopup();
  }

  private showInstructionPopup(): void {
    this.phase = 'tutorial';
    this.actionButton.setVisible(false);
    this.setBridgeInteractivity(false);
    this.destroyOverlay();

    const overlay = this.createCeremonyOverlay(0x071025, 0.98);
    this.overlay = overlay;
    const eyebrow = this.add
      .text(0, -244, '5-SECOND PRACTICE DROP', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#e9b85d',
        letterSpacing: 0.7,
      })
      .setOrigin(0.5);
    const title = this.add
      .text(0, -216, 'PLAY KOTO WITH SAND', {
        fontFamily: DISPLAY_FONT,
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#fff0c5',
      })
      .setOrigin(0.5);
    const fullInstruction = 'TAP THE GLOWING BAMBOO TO TURN THE PATH';
    const typed = this.add
      .text(0, -180, '▌', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#68eadb',
        align: 'center',
      })
      .setOrigin(0.5);
    const panel = this.add.graphics();
    panel
      .fillGradientStyle(
        0x17234c,
        0x17234c,
        0x0c1d36,
        0x0c1d36,
        0.98,
        0.98,
        0.98,
        0.98
      )
      .fillRoundedRect(-158, -157, 316, 276, 20)
      .lineStyle(1.5, 0x62e1d1, 0.58)
      .strokeRoundedRect(-158, -157, 316, 276, 20);
    const path = this.add.graphics();
    const drawPracticePath = (isCorrect: boolean): void => {
      path.clear();
      const points = isCorrect
        ? [
            { x: -104, y: -48 },
            { x: -7, y: -6 },
            { x: 97, y: 26 },
          ]
        : [
            { x: -104, y: -48 },
            { x: -7, y: -6 },
            { x: -111, y: 82 },
          ];
      const color = isCorrect ? 0x68eadb : 0xff6c77;
      for (let segment = 1; segment < points.length; segment += 1) {
        const from = points[segment - 1];
        const to = points[segment];
        if (!from || !to) continue;
        for (let step = 0; step <= 12; step += 1) {
          const progress = step / 12;
          path
            .fillStyle(color, 0.35 + progress * 0.45)
            .fillCircle(
              Phaser.Math.Linear(from.x, to.x, progress),
              Phaser.Math.Linear(from.y, to.y, progress),
              step % 3 === 0 ? 2.1 : 1.35
            );
        }
      }
    };
    drawPracticePath(false);
    const source = this.add
      .image(-104, -91, 'moon-tap-1')
      .setDisplaySize(94, 94);
    const sourceLabel = this.add
      .text(-104, -134, 'AMBER SAND', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffcc68',
        letterSpacing: 0.35,
      })
      .setOrigin(0.5);
    const grainCount = 30;
    const practiceGrains = Array.from({ length: grainCount }, (_, index) => {
      const frame = 4 + (index % 4);
      const jitter = ((index * 17) % 13) - 6;
      return this.add
        .image(-104 + jitter * 0.35, -48, 'sand-grain', frame)
        .setScale(0.028 + (index % 3) * 0.002)
        .setAlpha(0);
    });
    const glass = this.add
      .image(97, 70, 'moon-bowl-1')
      .setDisplaySize(104, 104);
    const glassLabel = this.add
      .text(97, 112, 'MATCH AMBER', {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffcc68',
        letterSpacing: 0.35,
      })
      .setOrigin(0.5);
    const bridgeGlow = this.add.graphics();
    bridgeGlow
      .fillStyle(0xffcc68, 0.12)
      .fillEllipse(0, 0, 168, 76)
      .lineStyle(2, 0xffcc68, 0.84)
      .strokeEllipse(0, 0, 154, 64);
    const bridgeImage = this.add
      .image(0, 0, 'bamboo-bridge')
      .setDisplaySize(150, 52);
    const bridge = this.add
      .container(-7, -6, [bridgeGlow, bridgeImage])
      .setAngle(-30)
      .setSize(176, 76);
    const status = this.add
      .text(0, 136, 'TURN THE PATH TOWARD THE GLASS', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffcc68',
        align: 'center',
      })
      .setOrigin(0.5);
    const communityPanel = this.add.graphics();
    communityPanel
      .fillStyle(0x111936, 0.98)
      .fillRoundedRect(-154, -35, 308, 70, 14)
      .lineStyle(1, 0x766bff, 0.68)
      .strokeRoundedRect(-154, -35, 308, 70, 14);
    const communityTitle = this.add
      .text(0, -20, "TODAY'S REDDIT SONG", {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fff0c5',
        letterSpacing: 0.35,
      })
      .setOrigin(0.5);
    const communityNotes = this.state.chorus.map((color, index) =>
      this.add
        .text(-112 + index * 32, 1, '♪', {
          fontFamily: DISPLAY_FONT,
          fontSize: '15px',
          fontStyle: 'bold',
          color: getColor(color).css,
        })
        .setOrigin(0.5)
    );
    const communityProgress = this.add
      .text(
        0,
        23,
        `${this.state.playerCount} PLAYERS · ${this.state.milestone.remaining} MORE UNLOCK ${this.state.milestone.reward}`,
        {
          fontFamily: UI_FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#68eadb',
          letterSpacing: 0.05,
        }
      )
      .setOrigin(0.5);
    const communityCard = this.add
      .container(0, 184, [
        communityPanel,
        communityTitle,
        ...communityNotes,
        communityProgress,
      ])
      .setAlpha(0.36);
    overlay.add([
      eyebrow,
      title,
      typed,
      panel,
      path,
      source,
      sourceLabel,
      ...practiceGrains,
      glass,
      glassLabel,
      bridge,
      status,
      communityCard,
    ]);
    this.animateOverlayIn(overlay);

    let practiceStarted = false;
    const completePractice = (): void => {
      if (this.overlay !== overlay || this.phase !== 'tutorial') return;
      this.fadeSandPour();
      this.playKotoPluck(0, WIDTH / 2 + 97, 0.68, -75);
      status.setText('PERFECT · YOUR SAND PLAYED D').setColor('#68eadb');
      const flyingNote = this.add
        .text(97, 70, '♪', {
          fontFamily: DISPLAY_FONT,
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#fff0c5',
        })
        .setOrigin(0.5);
      overlay.add(flyingNote);
      this.tweens.add({
        targets: flyingNote,
        x: -112,
        y: 185,
        scale: { from: 1.35, to: 0.68 },
        duration: 620,
        ease: 'Cubic.InOut',
        onComplete: () => {
          if (this.overlay !== overlay) return;
          flyingNote.destroy();
          communityCard.setAlpha(1);
          communityTitle.setText("YOUR NOTE JOINS TODAY'S REDDIT SONG");
          const enter = this.createOverlayButton(
            0,
            246,
            `ENTER ${ROOM_NAMES[this.verse] ?? 'THE MOON GARDEN'}  ▶`,
            0xff526f,
            () => this.showRoomStartAnimation()
          );
          overlay.add(enter);
          enter.setAlpha(0).setScale(0.92);
          this.tweens.add({
            targets: enter,
            alpha: 1,
            scale: 1,
            duration: 260,
            ease: 'Back.Out',
          });
        },
      });
    };
    const releasePracticeSand = (): void => {
      this.playSandPour();
      for (const [index, grain] of practiceGrains.entries()) {
        const jitter = ((index * 17) % 13) - 6;
        this.tweens.add({
          targets: grain,
          x: -7 + jitter * 0.5,
          y: -6 + (index % 4) * 1.2,
          alpha: 0.96,
          duration: 330,
          delay: index * 34,
          ease: 'Quad.In',
          onComplete: () => {
            const row = Math.floor(index / 8);
            const slot = (index % 8) - 3.5;
            this.tweens.add({
              targets: grain,
              x: 97 + slot * 4.2,
              y: 96 - row * 4.1,
              angle: index * 37,
              duration: 430,
              ease: 'Quad.In',
              onComplete: () => {
                if (index === grainCount - 1) completePractice();
              },
            });
          },
        });
      }
    };
    const startPractice = (): void => {
      if (practiceStarted || this.overlay !== overlay) return;
      practiceStarted = true;
      bridgeHit.disableInteractive();
      this.stopTypewriter();
      typed.setText('GOOD — WATCH THE SAND FOLLOW YOUR PATH');
      drawPracticePath(true);
      status.setText('PATH AIMED · SAND RELEASING…').setColor('#68eadb');
      this.tweens.killTweensOf(bridgeGlow);
      this.tweens.add({
        targets: bridge,
        angle: 20,
        duration: 260,
        ease: 'Back.Out',
        onComplete: releasePracticeSand,
      });
    };
    const bridgeHit = this.createOverlayHitZone(
      bridge,
      -7,
      -6,
      184,
      86,
      startPractice,
      0.97,
      150
    );
    this.tweens.add({
      targets: bridgeGlow,
      alpha: { from: 0.45, to: 1 },
      scale: { from: 0.94, to: 1.06 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    let characterIndex = 0;
    this.typewriterEvent = this.time.addEvent({
      delay: 24,
      repeat: fullInstruction.length - 1,
      callback: () => {
        if (this.overlay !== overlay || this.phase !== 'tutorial') return;
        characterIndex += 1;
        const character = fullInstruction[characterIndex - 1] ?? '';
        typed.setText(
          `${fullInstruction.slice(0, characterIndex)}${characterIndex < fullInstruction.length ? '▌' : ''}`
        );
        if (character.trim() && characterIndex % 2 === 0) {
          this.playTypewriterTick(characterIndex);
        }
      },
    });
  }

  private showRoomStartAnimation(): void {
    this.stopTypewriter();
    this.destroyOverlay();
    this.phase = 'room-start';
    this.actionButton.setVisible(false);
    this.setBridgeInteractivity(false);

    const veil = this.add.graphics();
    veil
      .fillStyle(0x02040d, 0.72)
      .fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT)
      .fillStyle(0x0a1028, 0.96)
      .fillRoundedRect(-168, -104, 336, 208, 22)
      .lineStyle(2, 0xe9b85d, 0.64)
      .strokeRoundedRect(-168, -104, 336, 208, 22);
    const eyebrow = this.add
      .text(0, -63, `ROOM ${this.verse + 1} OF ${ROOM_COUNT}`, {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#e9b85d',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    const title = this.add
      .text(0, -24, ROOM_NAMES[this.verse] ?? 'MOON TRAIL', {
        fontFamily: DISPLAY_FONT,
        fontSize: '29px',
        fontStyle: 'bold',
        color: '#fff0c5',
      })
      .setOrigin(0.5);
    const mission = this.add
      .text(0, 19, 'MATCH 4 GLASSES · FIND 3 NOTES', {
        fontFamily: UI_FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#68eadb',
        letterSpacing: 0.55,
      })
      .setOrigin(0.5);
    const ready = this.add
      .text(0, 61, 'AWAKENING THE SAND…', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffcc68',
        letterSpacing: 0.7,
      })
      .setOrigin(0.5);
    const grains = PALETTE.map((color, index) =>
      this.add
        .image(-66 + index * 44, 91, 'sand-grain', index * 4)
        .setScale(0.075)
        .setTint(color.hex)
        .setAlpha(0)
    );
    const overlay = this.add
      .container(WIDTH / 2, HEIGHT / 2, [
        veil,
        eyebrow,
        title,
        mission,
        ready,
        ...grains,
      ])
      .setDepth(100)
      .setAlpha(0)
      .setScale(0.92);
    this.overlay = overlay;
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      scale: 1,
      duration: 360,
      ease: 'Back.Out',
    });
    grains.forEach((grain, index) => {
      this.tweens.add({
        targets: grain,
        alpha: 1,
        y: 78,
        scale: { from: 0.04, to: 0.082 },
        duration: 320,
        delay: 380 + index * 150,
        ease: 'Back.Out',
      });
    });
    this.time.delayedCall(1_250, () => {
      if (this.overlay !== overlay) return;
      ready.setText('PATH READY · AIM THE BRIDGES');
      ready.setColor('#55e4c1');
    });
    this.time.delayedCall(1_850, () => {
      if (this.overlay !== overlay) return;
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        scale: 1.04,
        duration: 300,
        ease: 'Cubic.In',
        onComplete: () => {
          if (this.overlay === overlay) this.destroyOverlay();
          this.phase = 'planning';
          this.setBridgeInteractivity(true);
          this.actionButton.setVisible(true).setAlpha(1);
          this.instructionText
            .setPosition(WIDTH / 2, 644)
            .setText('TAP BAMBOO TO ROTATE · DRAG TO MOVE');
          this.actionLabel.setText('POUR SAND  ▶');
          this.drawRouteForecast();
        },
      });
    });
  }

  private showIntro(): void {
    this.phase = 'intro';
    this.destroyOverlay();
    this.actionButton.setVisible(false);
    const overlay = this.createCeremonyOverlay(0x071025, 0.97);
    this.overlay = overlay;
    const guideHalo = this.createGuideHalo(-216);
    const guide = this.add
      .image(0, -216, 'reddit-koto-guide')
      .setDisplaySize(120, 120);
    const eyebrow = this.add
      .text(
        0,
        -166,
        `ONE SONG · BUILT BY REDDIT · ${getResetLabel(this.state.resetAt)}`,
        {
          fontFamily: UI_FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#e9b85d',
          letterSpacing: 0.45,
        }
      )
      .setOrigin(0.5);
    const title = this.add
      .text(0, -116, 'GUIDE SAND.\nPLAY KOTO.', {
        fontFamily: DISPLAY_FONT,
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#fff0c5',
        align: 'center',
        lineSpacing: -4,
      })
      .setOrigin(0.5);
    const hook = this.add
      .text(
        0,
        -59,
        "MATCH COLORS · COLLECT 3 NOTES\nBUILD TODAY'S REDDIT SONG",
        {
          fontFamily: UI_FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#55e4c1',
          align: 'center',
          lineSpacing: 4,
          letterSpacing: 0.08,
        }
      )
      .setOrigin(0.5);
    const communityPreview = this.createCommunitySongPreview(0, 24);
    const rules = this.add
      .text(0, 108, '4 ROOMS · 3 LIVES · ROOM 1 IS PRACTICE', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffcc68',
        letterSpacing: 0.12,
      })
      .setOrigin(0.5);
    const begin = this.createOverlayButton(
      0,
      179,
      "PLAY TODAY'S SONG  ▶",
      0xff526f,
      () => {
        this.ensureAudio();
        this.beginExpedition();
      }
    );
    overlay.add([
      guideHalo,
      guide,
      eyebrow,
      title,
      hook,
      communityPreview,
      rules,
      begin,
    ]);
    this.animateOverlayIn(overlay);
  }

  private createCommunitySongPreview(
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const panel = this.add.graphics();
    panel
      .fillGradientStyle(
        0x17234c,
        0x17234c,
        0x0c1d36,
        0x0c1d36,
        0.98,
        0.98,
        0.98,
        0.98
      )
      .fillRoundedRect(-154, -57, 308, 114, 16)
      .lineStyle(1.5, 0x62e1d1, 0.66)
      .strokeRoundedRect(-154, -57, 308, 114, 16)
      .fillGradientStyle(
        0x35dbc5,
        0x766bff,
        0xff526f,
        0xffb52e,
        0.9,
        0.9,
        0.9,
        0.9
      )
      .fillRoundedRect(-132, -56, 264, 2, 1);
    const label = this.add
      .text(0, -42, "TODAY'S COMMUNITY SONG", {
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#fff0c5',
        letterSpacing: 0.35,
      })
      .setOrigin(0.5);
    const constellation = this.add.graphics().setPosition(0, -3);
    this.drawConstellation(constellation, 1, this.state.chorus);
    constellation.setScale(0.94, 0.68);
    const notes = this.state.chorus.map((color, index) => {
      const point = this.getConstellationPoint(index, color);
      return this.add
        .text(point.x * 0.94, point.y * 0.68 - 3, '♪', {
          fontFamily: DISPLAY_FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#fff8e8',
        })
        .setOrigin(0.5);
    });
    const progress = this.add
      .text(
        0,
        43,
        `${this.state.playerCount}/100 EXPLORERS  ·  ${this.state.milestone.remaining} MORE UNLOCK ${this.state.milestone.reward}`,
        {
          fontFamily: UI_FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#55e4c1',
          letterSpacing: 0.05,
        }
      )
      .setOrigin(0.5);
    return this.add.container(x, y, [
      panel,
      label,
      constellation,
      ...notes,
      progress,
    ]);
  }

  private createCeremonyOverlay(
    color: number,
    alpha: number
  ): Phaser.GameObjects.Container {
    const veil = this.add.graphics();
    veil
      .fillStyle(0x02040d, 0.78)
      .fillRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT)
      .fillStyle(0x35dbc5, 0.065)
      .fillRoundedRect(-190, -280, 380, 560, 30)
      .fillStyle(color, alpha)
      .fillRoundedRect(-184, -274, 368, 548, 26)
      .fillStyle(0x17324d, 0.26)
      .fillRoundedRect(-176, -266, 352, 532, 20)
      .lineStyle(2, 0xf1c76f, 0.78)
      .strokeRoundedRect(-184, -274, 368, 548, 26)
      .lineStyle(1, 0x62e1d1, 0.42)
      .strokeRoundedRect(-176, -266, 352, 532, 20)
      .fillGradientStyle(
        0x35dbc5,
        0x766bff,
        0xff526f,
        0xffb52e,
        0.95,
        0.95,
        0.95,
        0.95
      )
      .fillRoundedRect(-150, -270, 300, 3, 1.5)
      .fillStyle(0xfff0c5, 0.72)
      .fillCircle(-166, -250, 2)
      .fillCircle(166, -250, 2)
      .fillCircle(-166, 250, 2)
      .fillCircle(166, 250, 2);
    return this.add.container(WIDTH / 2, HEIGHT / 2, [veil]).setDepth(100);
  }

  private createGuideHalo(y: number): Phaser.GameObjects.Graphics {
    const halo = this.add.graphics();
    halo
      .fillStyle(0x35dbc5, 0.08)
      .fillCircle(0, y, 66)
      .fillStyle(0x766bff, 0.08)
      .fillCircle(0, y, 53)
      .lineStyle(1.5, 0xf1c76f, 0.62)
      .strokeCircle(0, y, 49)
      .lineStyle(1, 0x62e1d1, 0.44)
      .strokeCircle(0, y, 58);
    return halo;
  }

  private animateOverlayIn(overlay: Phaser.GameObjects.Container): void {
    overlay.setScale(0.92).setAlpha(0);
    this.tweens.add({
      targets: overlay,
      scale: 1,
      alpha: 1,
      duration: 320,
      ease: 'Back.Out',
    });
  }

  private createOverlayButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onPress: () => void,
    hitDepth = 140
  ): Phaser.GameObjects.Container {
    const topColor =
      Phaser.Display.Color.IntegerToColor(color).brighten(12).color;
    const bottomColor =
      Phaser.Display.Color.IntegerToColor(color).darken(9).color;
    const shape = this.add.graphics();
    shape
      .fillStyle(color, 0.12)
      .fillRoundedRect(-139, -30, 278, 61, 18)
      .fillStyle(0x01030a, 0.48)
      .fillRoundedRect(-131, -17, 262, 45, 14)
      .fillStyle(topColor, 1)
      .fillRoundedRect(-131, -23, 262, 45, 13)
      .fillStyle(bottomColor, 0.22)
      .fillRoundedRect(-119, 12, 238, 5, 2.5)
      .lineStyle(1.2, 0xfff0c5, 0.72)
      .strokeRoundedRect(-130, -22, 260, 43, 12)
      .lineStyle(1, 0xffffff, 0.18)
      .lineBetween(-112, -17, 112, -17);
    const text = this.add
      .text(0, -1, label, {
        fontFamily: UI_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff8e8',
        letterSpacing: 0.08,
      })
      .setName('label')
      .setOrigin(0.5);
    const button = this.add.container(x, y, [shape, text]).setSize(288, 60);
    this.createOverlayHitZone(button, x, y, 288, 60, onPress, 0.97, hitDepth);
    return button;
  }

  private createOverlayHitZone(
    visual: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    onPress: () => void,
    pressedScale = 0.97,
    hitDepth = 140
  ): Phaser.GameObjects.Zone {
    const hitZone = this.add
      .zone(WIDTH / 2 + x, HEIGHT / 2 + y, width, height)
      .setDepth(hitDepth)
      .setInteractive({ useHandCursor: true });
    this.bindPressButton(visual, onPress, pressedScale, hitZone);
    visual.once('destroy', () => {
      if (hitZone.active) hitZone.destroy();
    });
    return hitZone;
  }

  private bindPressButton(
    button: Phaser.GameObjects.Container,
    onPress: () => void,
    pressedScale = 0.97,
    hitTarget: Phaser.GameObjects.GameObject = button
  ): void {
    let pressed = false;
    const reset = (): void => {
      if (!button.active) return;
      pressed = false;
      button.setScale(1);
    };

    hitTarget.on('pointerdown', () => {
      if (pressed || !button.active) return;
      pressed = true;
      button.setScale(pressedScale);
      onPress();
    });
    hitTarget.on('pointerup', reset);
    hitTarget.on('pointerupoutside', reset);
    hitTarget.on('pointerout', reset);
  }

  private stopTypewriter(): void {
    this.typewriterEvent?.remove(false);
    this.typewriterEvent = undefined;
  }

  private destroyOverlay(): void {
    this.stopTypewriter();
    this.overlay?.destroy(true);
    this.overlay = undefined;
  }

  private clearActiveParticles(): void {
    for (const particle of this.particles) {
      if (particle.active) particle.sprite.destroy();
      particle.active = false;
    }
  }

  private clearParticles(): void {
    for (const particle of this.particles) particle.sprite.destroy();
    this.particles = [];
    this.gusts = [];
    this.sparks = [];
    this.effectsLayer?.clear();
  }

  private async loadState(): Promise<void> {
    try {
      const response = await fetch('/api/init');
      if (!response.ok)
        throw new Error(`Init failed with status ${response.status}`);
      const state: InitResponse = await response.json();
      this.state = state;
      this.daySeed = state.seed;
      this.dayText.setText(
        `DAILY EXPEDITION #${state.dayNumber}  ·  ${state.loggedIn ? `u/${state.username}` : 'GUEST PREVIEW'}${state.streak > 0 ? `  ·  ${state.streak} DAY STREAK` : ''}`
      );
      if (this.phase === 'intro') this.showIntro();
      else if (this.phase === 'planning') this.setupVerse(false);
    } catch (error) {
      console.warn('Playing Pourchestra in local guest mode', error);
      this.dayText.setText('DAILY EXPEDITION  ·  GUEST PREVIEW');
    }
  }

  private async submitScore(
    score: number,
    button: Phaser.GameObjects.Container,
    communityText?: Phaser.GameObjects.Text
  ): Promise<void> {
    if (this.submitting) return;
    const label = button.getByName('label');
    if (!(label instanceof Phaser.GameObjects.Text)) return;
    this.submitting = true;
    label.setText('ADDING YOUR SONG…');
    button.setAlpha(0.7);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score, pattern: this.currentPattern }),
      });
      const data: SubmitResponse | ErrorResponse = await response.json();
      if (!response.ok || 'status' in data) {
        throw new Error(
          'status' in data ? data.message : 'Could not join the encore.'
        );
      }
      this.state.submitted = true;
      this.state.bestScore = data.bestScore;
      this.state.streak = data.streak;
      this.state.totalContributions = data.totalContributions;
      this.state.playerCount = data.playerCount;
      this.state.milestone = data.milestone;
      this.state.chorus = data.chorus;
      this.state.leaderboard = data.leaderboard;
      label.setText(
        data.accepted
          ? "YOUR 8 NOTES JOINED TODAY'S SONG ✓"
          : 'BEST HARMONY UPDATED ✓'
      );
      communityText?.setText(
        `TODAY'S REDDIT SONG  ·  ${data.playerCount}/100 VOICES\n${
          data.changedBeats.length > 0
            ? `YOUR NOTES CHANGED ${data.changedBeats.length} ${data.changedBeats.length === 1 ? 'BEAT' : 'BEATS'}`
            : "YOUR NOTES STRENGTHENED TODAY'S CHORUS"
        }`
      );
      button.setAlpha(1);
      this.time.delayedCall(600, () => this.playPattern(data.chorus));
    } catch (error) {
      label.setText(
        error instanceof Error ? error.message.toUpperCase() : 'TRY AGAIN'
      );
      button.setAlpha(1);
    } finally {
      this.submitting = false;
    }
  }

  private getBambooNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.bambooNoiseBuffer) return this.bambooNoiseBuffer;
    const length = Math.ceil(context.sampleRate * 0.36);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 0x42d00d;
    let softened = 0;
    for (let index = 0; index < samples.length; index += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      const white = ((seed >>> 8) / 0x00ffffff) * 2 - 1;
      softened = softened * 0.72 + white * 0.28;
      samples[index] = white * 0.28 + softened * 0.72;
    }
    this.bambooNoiseBuffer = buffer;
    return buffer;
  }

  private playKotoPluck(
    bridgeIndex: number,
    x: number,
    intensity: number,
    angle: number
  ): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    if (!context || context.state === 'closed') return;
    if (context.state === 'suspended') {
      void context
        .resume()
        .then(() => {
          if (context.state === 'running') {
            this.playKotoPluck(bridgeIndex, x, intensity, angle);
          }
        })
        .catch(() => {
          // A later user gesture will retry if the webview blocks this one.
        });
      return;
    }

    const safeBridge = Phaser.Math.Clamp(bridgeIndex, 0, 2);
    const angleStep = Math.round((angle + 75) / 30);
    const sampleIndex = (angleStep + safeBridge) % KOTO_SAMPLE_URLS.length;
    const sample = this.kotoSamples[sampleIndex];
    if (!sample) {
      const loading = this.kotoSamplesLoading;
      if (loading) {
        void loading.then(() => {
          if (
            this.soundEnabled &&
            this.audioContext === context &&
            this.kotoSamples[sampleIndex]
          ) {
            this.playKotoPluck(bridgeIndex, x, intensity, angle);
          }
        });
      }
      return;
    }

    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const kotoBus = this.getKotoAudioBus(context);
    const energy = Phaser.Math.Clamp(intensity, 0.1, 1);
    const now = context.currentTime;
    const lifetime = Math.min(2.85, sample.duration);
    const peak = 0.07 + energy * 0.03;
    const attack = 0.026;
    const tailFade = 0.55;

    source.buffer = sample;
    source.playbackRate.value = 1;
    highpass.type = 'highpass';
    highpass.frequency.value = 55;
    highpass.Q.value = 0.3;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2_800 + energy * 500;
    lowpass.Q.value = 0.38;
    panner.pan.value = Phaser.Math.Clamp((x / WIDTH) * 2 - 1, -0.45, 0.45);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.setValueAtTime(peak, now + Math.max(attack, lifetime - tailFade));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + lifetime);
    source
      .connect(highpass)
      .connect(lowpass)
      .connect(gain)
      .connect(panner)
      .connect(kotoBus);
    source.start(now);
    source.stop(now + lifetime);
  }

  private getKotoAudioBus(context: AudioContext): GainNode {
    if (this.kotoAudioBus?.context === context) {
      return this.kotoAudioBus.input;
    }

    const input = context.createGain();
    const warmth = context.createBiquadFilter();
    const softener = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const output = context.createGain();
    const roomDelay = context.createDelay(0.2);
    const roomFilter = context.createBiquadFilter();
    const roomGain = context.createGain();

    warmth.type = 'peaking';
    warmth.frequency.value = 420;
    warmth.Q.value = 0.72;
    warmth.gain.value = 2.4;
    softener.type = 'highshelf';
    softener.frequency.value = 2_600;
    softener.gain.value = -5.5;
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.28;
    output.gain.value = 0.9;
    roomDelay.delayTime.value = 0.065;
    roomFilter.type = 'lowpass';
    roomFilter.frequency.value = 2_400;
    roomFilter.Q.value = 0.3;
    roomGain.gain.value = 0.075;

    input
      .connect(warmth)
      .connect(softener)
      .connect(compressor)
      .connect(output)
      .connect(context.destination);
    compressor
      .connect(roomDelay)
      .connect(roomFilter)
      .connect(roomGain)
      .connect(context.destination);

    this.kotoAudioBus = { context, input };
    return input;
  }

  private playBambooSound(
    kind: BambooSoundKind,
    bridgeIndex: number,
    x: number,
    intensity: number,
    angle: number
  ): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    if (!context || context.state === 'closed') return;
    if (context.state === 'suspended') {
      void context
        .resume()
        .then(() => {
          if (context.state === 'running') {
            this.synthesizeBambooSound(
              context,
              kind,
              bridgeIndex,
              x,
              intensity,
              angle
            );
          }
        })
        .catch(() => {
          // A later user gesture will retry if the webview blocks this one.
        });
      return;
    }
    this.synthesizeBambooSound(context, kind, bridgeIndex, x, intensity, angle);
  }

  private synthesizeBambooSound(
    context: AudioContext,
    kind: BambooSoundKind,
    bridgeIndex: number,
    x: number,
    intensity: number,
    angle: number
  ): void {
    const safeBridge = Phaser.Math.Clamp(bridgeIndex, 0, 2);
    const energy = Phaser.Math.Clamp(intensity, 0.05, 1);
    let duration = 0.068;
    let volume = 0.004 + energy * 0.005;
    let brightness = 390 + energy * 620;
    let pitchScale = 0.9 + energy * 0.08;
    if (kind === 'settle') {
      duration = 0.16;
      volume = 0.012 + energy * 0.007;
      brightness = 760 + energy * 420;
      pitchScale = 0.94;
    } else if (kind === 'impact') {
      duration = 0.115;
      volume = 0.0035 + energy * 0.009;
      brightness = 650 + energy * 820;
      pitchScale = 0.98 + energy * 0.06;
    }

    const now = context.currentTime;
    const baseFrequency =
      (148 + safeBridge * 21 + Math.abs(angle) * 0.52) * pitchScale;
    const pan = Phaser.Math.Clamp((x / WIDTH) * 2 - 1, -0.82, 0.82);
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(context.destination);

    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const noiseBuffer = this.getBambooNoiseBuffer(context);
    noise.buffer = noiseBuffer;
    noise.playbackRate.value = 0.86 + energy * 0.3 + safeBridge * 0.035;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = brightness;
    noiseFilter.Q.value = kind === 'friction' ? 0.62 : 0.9;
    const noisePeak = volume * (kind === 'friction' ? 0.92 : 0.5);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(noisePeak, now + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noise.connect(noiseFilter).connect(noiseGain).connect(panner);
    const maxOffset = Math.max(0, noiseBuffer.duration - duration - 0.005);
    const offset =
      maxOffset > 0
        ? (safeBridge * 0.071 + Math.abs(angle) * 0.0013 + now * 0.137) %
          maxOffset
        : 0;
    noise.start(now, offset, Math.min(duration, noiseBuffer.duration - offset));

    const body = context.createOscillator();
    const overtone = context.createOscillator();
    const bodyFilter = context.createBiquadFilter();
    const bodyGain = context.createGain();
    const overtoneGain = context.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(baseFrequency * 1.035, now);
    body.frequency.exponentialRampToValueAtTime(
      baseFrequency * 0.965,
      now + duration
    );
    overtone.type = 'sine';
    overtone.frequency.value = baseFrequency * (2.31 + safeBridge * 0.04);
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.value = 1_250 + energy * 880;
    bodyFilter.Q.value = 0.7;
    const bodyPeak = volume * (kind === 'friction' ? 0.12 : 0.58);
    const overtonePeak = volume * (kind === 'friction' ? 0.035 : 0.16);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(bodyPeak, now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(overtonePeak, now + 0.003);
    overtoneGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration * 0.72
    );
    body.connect(bodyGain).connect(bodyFilter);
    overtone.connect(overtoneGain).connect(bodyFilter);
    bodyFilter.connect(panner);
    body.start(now);
    overtone.start(now);
    body.stop(now + duration);
    overtone.stop(now + duration);
  }

  private playTypewriterTick(characterIndex: number): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    if (!context || context.state === 'suspended') return;

    if (!this.typewriterClickBuffer) {
      const length = Math.ceil(context.sampleRate * 0.018);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        const mechanicalNoise = (((index * 47 + 19) % 31) / 15.5 - 1) * 0.72;
        samples[index] = mechanicalNoise * Math.exp(-index / (length * 0.2));
      }
      this.typewriterClickBuffer = buffer;
    }

    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = this.typewriterClickBuffer;
    source.playbackRate.value = 0.94 + (characterIndex % 5) * 0.025;
    highpass.type = 'highpass';
    highpass.frequency.value = 1_050;
    highpass.Q.value = 0.7;
    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    source.connect(highpass).connect(gain).connect(context.destination);
    source.start(now);
    source.stop(now + 0.024);
  }

  private ensureAudio(): void {
    if (!this.soundEnabled) return;
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.sandPourSampleLoading) {
      this.sandPourSampleLoading = this.loadSandPourSample(this.audioContext);
    }
    if (!this.kotoSamplesLoading) {
      this.kotoSamplesLoading = this.loadKotoSamples(this.audioContext);
    }
    if (this.audioContext.state === 'suspended')
      void this.audioContext.resume();
  }

  private async loadKotoSamples(context: AudioContext): Promise<void> {
    this.kotoSamples = await Promise.all(
      KOTO_SAMPLE_URLS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Koto sample failed: ${response.status}`);
          }
          return await context.decodeAudioData(await response.arrayBuffer());
        } catch (error) {
          console.warn('Koto sample unavailable', error);
          return undefined;
        }
      })
    );
  }

  private updateSandPhysicsAudio(deltaMs: number): void {
    const context = this.audioContext;
    const activeAudio = this.activeSandPour;
    this.sandImpactEnergy *= Math.exp(-deltaMs / 145);
    if (!context || !activeAudio || context.state === 'suspended') return;

    let activeCount = 0;
    let normalizedSpeedTotal = 0;
    for (const particle of this.particles) {
      if (!particle.active) continue;
      activeCount += 1;
      normalizedSpeedTotal += Phaser.Math.Clamp(
        Math.hypot(particle.vx, particle.vy) / 560,
        0,
        1
      );
    }

    const movement = activeCount > 0 ? normalizedSpeedTotal / activeCount : 0;
    const density = Phaser.Math.Clamp(activeCount / 95, 0, 1);
    const movingBed = density * (0.012 + movement * 0.034);
    const impactLift = this.sandImpactEnergy * 0.035;
    const targetGain = Phaser.Math.Clamp(
      activeCount > 0 ? 0.0015 + movingBed + impactLift : 0.0001,
      0.0001,
      0.068
    );
    const now = context.currentTime;
    activeAudio.gain.gain.setTargetAtTime(targetGain, now, 0.045);
    activeAudio.panner.pan.setTargetAtTime(
      this.sandImpactPan * 0.46,
      now,
      0.06
    );
    activeAudio.source.playbackRate.setTargetAtTime(
      0.82 + movement * 0.24 + this.sandImpactEnergy * 0.08,
      now,
      0.055
    );
  }

  private async loadSandPourSample(context: AudioContext): Promise<void> {
    try {
      const response = await fetch(SAND_POUR_SAMPLE_URL);
      if (!response.ok) {
        throw new Error(`Sand recording failed: ${response.status}`);
      }
      this.sandPourSample = await context.decodeAudioData(
        await response.arrayBuffer()
      );
    } catch (error) {
      console.warn('Real sand recording unavailable', error);
      this.sandPourSample = undefined;
    }
  }

  private playSandPour(): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    const sample = this.sandPourSample;
    if (!context || context.state === 'suspended') return;
    if (!sample) {
      const loading = this.sandPourSampleLoading;
      if (loading) {
        void loading.then(() => {
          if (this.phase === 'pouring' && !this.activeSandPour) {
            this.playSandPour();
          }
        });
      }
      return;
    }

    this.fadeSandPour();
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const now = context.currentTime;

    source.buffer = sample;
    source.loop = false;
    highpass.type = 'highpass';
    highpass.frequency.value = 110;
    highpass.Q.value = 0.3;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.11);
    gain.gain.cancelScheduledValues(now + 0.001);
    gain.gain.setValueAtTime(0.0001, now + 0.001);
    panner.pan.value = 0;

    source
      .connect(highpass)
      .connect(panner)
      .connect(gain)
      .connect(context.destination);
    source.start(now);
    this.activeSandPour = { source, gain, panner };
    source.onended = () => {
      if (this.activeSandPour?.source === source) {
        this.activeSandPour = undefined;
        if (this.phase === 'pouring' && this.soundEnabled) {
          this.playSandPour();
        }
      }
    };
  }

  private fadeSandPour(): void {
    const active = this.activeSandPour;
    const context = this.audioContext;
    if (!active || !context) return;
    const now = context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(
      Math.max(0.0001, active.gain.gain.value),
      now
    );
    active.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    try {
      active.source.stop(now + 0.17);
    } catch {
      // The source may already have completed naturally.
    }
    this.activeSandPour = undefined;
    this.sandImpactEnergy = 0;
  }

  private playOceanWave(duration = 2.6, volume = 0.03): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    if (!context || context.state === 'suspended') return;
    this.fadeOceanWave();

    const safeDuration = Phaser.Math.Clamp(duration, 0.8, 18);
    const buffer = context.createBuffer(
      2,
      Math.ceil(context.sampleRate * safeDuration),
      context.sampleRate
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const samples = buffer.getChannelData(channel);
      let brown = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + white * 0.018) / 1.018;
        const seconds = index / context.sampleRate;
        const tide = 0.68 + Math.sin(seconds * Math.PI * 0.42) * 0.32;
        samples[index] = brown * 3.4 * tide;
      }
    }

    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    highpass.type = 'highpass';
    highpass.frequency.value = 95;
    highpass.Q.value = 0.4;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 820;
    lowpass.Q.value = 0.35;
    const now = context.currentTime;
    const gentleVolume = Phaser.Math.Clamp(volume, 0.008, 0.04);
    const attack = Math.min(0.75, safeDuration * 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gentleVolume, now + attack);
    gain.gain.setValueAtTime(gentleVolume * 0.72, now + safeDuration * 0.64);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + safeDuration);
    source
      .connect(highpass)
      .connect(lowpass)
      .connect(gain)
      .connect(context.destination);
    source.start(now);
    source.stop(now + safeDuration);
    this.activeOceanWave = { source, gain };
    source.onended = () => {
      if (this.activeOceanWave?.source === source) {
        this.activeOceanWave = undefined;
      }
    };
  }

  private fadeOceanWave(): void {
    const active = this.activeOceanWave;
    const context = this.audioContext;
    if (!active || !context) return;
    const now = context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(
      Math.max(0.0001, active.gain.gain.value),
      now
    );
    active.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    try {
      active.source.stop(now + 0.13);
    } catch {
      // The source may already have completed naturally.
    }
    this.activeOceanWave = undefined;
  }

  private playSeaGlass(color: number, volume = 0.032): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    if (!context || context.state === 'suspended') return;

    const frequency = SEA_GLASS_FREQUENCIES[color] ?? SEA_GLASS_FREQUENCIES[0];
    const primary = context.createOscillator();
    const shimmer = context.createOscillator();
    const primaryGain = context.createGain();
    const shimmerGain = context.createGain();
    const filter = context.createBiquadFilter();
    const panner = context.createStereoPanner();
    const now = context.currentTime;
    const gentleVolume = Phaser.Math.Clamp(volume, 0.012, 0.045);

    primary.type = 'sine';
    primary.frequency.setValueAtTime(frequency * 1.012, now);
    primary.frequency.exponentialRampToValueAtTime(frequency, now + 0.74);
    shimmer.type = 'sine';
    shimmer.frequency.value = frequency * 2.005;
    filter.type = 'lowpass';
    filter.frequency.value = 1_450;
    filter.Q.value = 0.45;
    panner.pan.value = Phaser.Math.Clamp((color - 1.5) * 0.12, -0.24, 0.24);

    primaryGain.gain.setValueAtTime(0.0001, now);
    primaryGain.gain.exponentialRampToValueAtTime(gentleVolume, now + 0.024);
    primaryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(
      gentleVolume * 0.12,
      now + 0.012
    );
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    primary.connect(primaryGain).connect(filter);
    shimmer.connect(shimmerGain).connect(filter);
    filter.connect(panner).connect(context.destination);
    primary.start(now);
    shimmer.start(now);
    primary.stop(now + 0.88);
    shimmer.stop(now + 0.32);
  }

  private stopSongPlayback(): void {
    for (const event of this.songPlaybackEvents) event.remove(false);
    this.songPlaybackEvents = [];
    this.fadeOceanWave();
  }

  private playPattern(pattern: ChorusPattern, rounds = 4): void {
    this.stopSongPlayback();
    this.ensureAudio();
    const songDuration = (rounds * BEAT_COUNT * OCEAN_BEAT_MS) / 1000;
    this.playOceanWave(songDuration + 0.7, 0.024);
    for (let round = 0; round < rounds; round += 1) {
      for (let beat = 0; beat < BEAT_COUNT; beat += 1) {
        const delay = round * BEAT_COUNT * OCEAN_BEAT_MS + beat * OCEAN_BEAT_MS;
        this.songPlaybackEvents.push(
          this.time.delayedCall(delay, () => {
            const color = pattern[beat] ?? 0;
            const isFinalRound = round === rounds - 1;
            this.playSeaGlass(color, isFinalRound ? 0.036 : 0.026);
          })
        );
      }
    }
  }
}
