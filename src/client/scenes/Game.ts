import * as Phaser from 'phaser';
import type {
  ChorusPattern,
  ErrorResponse,
  InitResponse,
  LeaderboardEntry,
  SubmitResponse,
} from '../../shared/api';

const WIDTH = 420;
const HEIGHT = 780;
const BOARD_LEFT = 20;
const BOARD_RIGHT = 400;
const BOARD_TOP = 104;
const BOARD_BOTTOM = 590;
const CUP_Y = 510;
const CUP_CENTERS: readonly [number, number, number, number] = [
  64, 161, 259, 356,
];
const STREAM_CENTERS: readonly [number, number, number, number] = [
  64, 161, 259, 356,
];
const GRAINS_PER_COLOR = 480;
const COLOR_COUNT = 4;
const BEAT_COUNT = 8;
const WIN_SCORE = 75;
const KOTO_BEAT_MS = 420;
const KOTO_ROUNDS = 4;
const KOTO_PATTERN_PLAYBACK_MS =
  KOTO_BEAT_MS * BEAT_COUNT * KOTO_ROUNDS + 1_000;
const KOTO_NOTE_LABELS = ['D', 'E♭', 'G', 'A'] as const;
const KOTO_SAMPLE_URLS = [
  new URL('../assets/koto-d4.mp3', import.meta.url).href,
  new URL('../assets/koto-eb4.mp3', import.meta.url).href,
  new URL('../assets/koto-g4.mp3', import.meta.url).href,
  new URL('../assets/koto-a4.mp3', import.meta.url).href,
] as const;

const PALETTE = [
  {
    hex: 0xff5573,
    dark: 0xc62d50,
    css: '#ff5573',
    note: 293.66,
    label: 'CORAL',
  },
  {
    hex: 0xffb92e,
    dark: 0xd27a08,
    css: '#ffb92e',
    note: 311.13,
    label: 'GOLD',
  },
  { hex: 0x18cfc1, dark: 0x078b83, css: '#18cfc1', note: 392.0, label: 'MINT' },
  {
    hex: 0x6e79ff,
    dark: 0x3b4bc8,
    css: '#6e79ff',
    note: 440.0,
    label: 'VIOLET',
  },
] as const;

const SAND_SHADES = [
  [0xff9aab, 0xff5573, 0xe83c60, 0xffc0cb],
  [0xffd86a, 0xffb92e, 0xe99512, 0xffe9a0],
  [0x72e9df, 0x18cfc1, 0x08a99f, 0xb1f4ed],
  [0xa9b0ff, 0x6e79ff, 0x5361de, 0xd3d6ff],
] as const;

type GamePhase = 'planning' | 'pouring' | 'result';

type FourNumbers = [number, number, number, number];
type FourColorPiles = [number[], number[], number[], number[]];

type Particle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  color: number;
  active: boolean;
  seed: number;
  size: number;
  shape: number;
  lastHitAt: number;
  sprite: Phaser.GameObjects.Image;
};

type ImpactBurst = {
  x: number;
  y: number;
  color: number;
  startedAt: number;
  strength: number;
};

type MusicPulse = {
  x: number;
  y: number;
  color: number;
  startedAt: number;
  strength: number;
};

type Peg = {
  x: number;
  y: number;
  radius: number;
};

type Ramp = {
  container: Phaser.GameObjects.Container;
  x: number;
  y: number;
  angle: number;
  downX: number;
  downY: number;
};

type DayLayout = {
  order: FourNumbers;
  pegs: Peg[];
};

function getColor(index: number): (typeof PALETTE)[number] {
  return PALETTE[index] ?? PALETTE[0];
}

function getSandShade(color: number, shade: number): number {
  const shades = SAND_SHADES[color] ?? SAND_SHADES[0];
  return shades[shade % shades.length] ?? shades[0];
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

function makePattern(values: number[]): ChorusPattern {
  const normalized = Array.from({ length: BEAT_COUNT }, (_, index) => {
    const value = values[index] ?? index % COLOR_COUNT;
    return Phaser.Math.Clamp(Math.round(value), 0, COLOR_COUNT - 1);
  });
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

export class Game extends Phaser.Scene {
  private phase: GamePhase = 'planning';
  private state: InitResponse = getFallbackState();
  private daySeed = this.state.seed;
  private dayLayout: DayLayout = { order: [2, 0, 3, 1], pegs: [] };
  private random = mulberry32(this.daySeed);
  private particles: Particle[] = [];
  private ramps: Ramp[] = [];
  private glowGraphics!: Phaser.GameObjects.Graphics;
  private particlesGraphics!: Phaser.GameObjects.Graphics;
  private effectsGraphics!: Phaser.GameObjects.Graphics;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private fillGraphics!: Phaser.GameObjects.Graphics;
  private beatGraphics!: Phaser.GameObjects.Graphics;
  private communityGraphics!: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Container | undefined;
  private harmonyText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private melodyLabelText!: Phaser.GameObjects.Text;
  private pourButton!: Phaser.GameObjects.Container;
  private pourButtonText!: Phaser.GameObjects.Text;
  private playerCountText!: Phaser.GameObjects.Text;
  private communityLabelText!: Phaser.GameObjects.Text;
  private communityPlayText!: Phaser.GameObjects.Text;
  private soundText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private soundEnabled = true;
  private audioContext?: AudioContext;
  private kotoBuffers = new Map<string, AudioBuffer>();
  private kotoSamples: Array<AudioBuffer | undefined> = [];
  private kotoSamplesLoading?: Promise<void>;
  private kotoSampleLoadFailed = false;
  private streamLabelTexts: Phaser.GameObjects.Text[] = [];
  private cupStatusTexts: Phaser.GameObjects.Text[] = [];
  private pourStartedAt = 0;
  private nextSpawnAt = 0;
  private spawnedRows = 0;
  private landed = 0;
  private correct = 0;
  private combo = 0;
  private bestCombo = 0;
  private cupTotals: FourNumbers = [0, 0, 0, 0];
  private cupCorrect: FourNumbers = [0, 0, 0, 0];
  private cupSand: FourColorPiles = [[], [], [], []];
  private cupPulse: FourNumbers = [0, 0, 0, 0];
  private impactBursts: ImpactBurst[] = [];
  private musicPulses: MusicPulse[] = [];
  private cupFillDirty = false;
  private beatWeights: FourNumbers[] = Array.from(
    { length: BEAT_COUNT },
    (): FourNumbers => [0, 0, 0, 0]
  );
  private currentPattern: ChorusPattern = [0, 1, 2, 3, 0, 1, 2, 3];
  private lastLandingNoteAt = 0;
  private lastCollisionNoteAt = 0;
  private attempt = 0;
  private submitting = false;

  constructor() {
    super('Pourchestra');
  }

  create(): void {
    const renderScale = this.scale.width / WIDTH;
    this.cameras.main.setZoom(renderScale).centerOn(WIDTH / 2, HEIGHT / 2);
    this.cameras.main.setBackgroundColor('#f8f6f0');
    this.createBackdrop();
    this.createSandTextures();
    this.boardGraphics = this.add.graphics();
    this.fillGraphics = this.add.graphics();
    this.glowGraphics = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.particlesGraphics = this.add.graphics();
    this.effectsGraphics = this.add.graphics();
    this.beatGraphics = this.add.graphics();
    this.communityGraphics = this.add.graphics();
    this.createHeader();
    this.applyDaySeed(this.daySeed);
    this.createRamps();
    this.createControls();
    this.drawBoard();
    this.beatGraphics.clear();
    this.drawCommunity();
    this.time.addEvent({
      delay: 60_000,
      loop: true,
      callback: () => this.updateDailyMeta(),
    });
    void this.loadState();

    const previewParams = new URLSearchParams(window.location.search);
    if (previewParams.has('mute')) this.soundEnabled = false;
    if (previewParams.has('preview-result')) {
      this.phase = 'result';
      this.pourButton.setVisible(false);
      this.hintText.setText('YOUR POUR DREW A 4-PHRASE KOTO CONSTELLATION');
      this.showResult(84, previewParams.has('animate'));
    } else if (previewParams.has('autoplay')) {
      this.startPour();
    }
  }

  override update(time: number, delta: number): void {
    if (this.phase !== 'pouring') return;

    const elapsed = time - this.pourStartedAt;
    while (this.spawnedRows < GRAINS_PER_COLOR && elapsed >= this.nextSpawnAt) {
      this.spawnRow();
      this.spawnedRows += 1;
      this.nextSpawnAt += 7;
    }

    const step = Math.min(delta / 1000, 0.025);
    this.updateParticles(step, time);
    this.drawParticles();
    if (this.cupFillDirty) {
      this.drawCupFill();
      this.cupFillDirty = false;
    }
    this.drawImpactEffects(time);
    this.cupPulse = [
      Math.max(0, (this.cupPulse[0] ?? 0) - step * 4.5),
      Math.max(0, (this.cupPulse[1] ?? 0) - step * 4.5),
      Math.max(0, (this.cupPulse[2] ?? 0) - step * 4.5),
      Math.max(0, (this.cupPulse[3] ?? 0) - step * 4.5),
    ];

    const activeCount = this.particles.reduce(
      (total, particle) => total + (particle.active ? 1 : 0),
      0
    );
    if (
      (this.spawnedRows === GRAINS_PER_COLOR &&
        activeCount === 0 &&
        elapsed > 2_200) ||
      elapsed > 9_000
    ) {
      this.finishRun();
    }
  }

  private createBackdrop(): void {
    const graphics = this.add.graphics();
    graphics
      .fillGradientStyle(0xfff6e6, 0xfffbf4, 0xe9fbff, 0xf1efff, 1)
      .fillRect(0, 0, WIDTH, HEIGHT)
      .fillStyle(0xffffff, 0.62)
      .fillRect(0, 72, WIDTH, 1)
      .fillStyle(0xffffff, 0.42)
      .fillRect(0, 688, WIDTH, 92)
      .lineStyle(1, 0x8eaab5, 0.1)
      .lineBetween(0, 688, WIDTH, 688);

    const random = mulberry32(9927);
    for (let index = 0; index < 110; index += 1) {
      const x = random() * WIDTH;
      const y = random() * HEIGHT;
      const radius = 0.25 + random() * 0.55;
      graphics.fillStyle(
        index % 7 === 0 ? 0x5fbac7 : 0x8f8a9d,
        0.05 + random() * 0.1
      );
      graphics.fillCircle(x, y, radius);
    }
  }

  private createSandTextures(): void {
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      for (let variant = 0; variant < 6; variant += 1) {
        const key = `sand-grain-${color}-${variant}`;
        if (!this.textures.exists(key)) {
          const texture = this.textures.createCanvas(key, 28, 28)!;
          const context = texture.getContext();
          const random = mulberry32(8_117 + color * 977 + variant * 151);
          context.clearRect(0, 0, 28, 28);
          for (let grain = 0; grain < 32; grain += 1) {
            const angle = random() * Math.PI * 2;
            const distance = Math.sqrt(random()) * 9.1;
            const grainX = 14 + Math.cos(angle) * distance;
            const grainY = 14 + Math.sin(angle) * distance * 0.78;
            const size = 1.28 + random() * 1.08;
            const shade = getSandShade(color, Math.floor(random() * 4));
            context.save();
            context.translate(grainX, grainY);
            context.rotate(random() * Math.PI);
            context.globalAlpha = 0.9 + random() * 0.1;
            context.fillStyle = `#${shade.toString(16).padStart(6, '0')}`;
            context.beginPath();
            if (grain % 3 === 0) {
              const points = 5;
              for (let point = 0; point < points; point += 1) {
                const pointAngle = (point / points) * Math.PI * 2;
                const radius = size * (0.72 + random() * 0.4);
                const pointX = Math.cos(pointAngle) * radius;
                const pointY = Math.sin(pointAngle) * radius * 0.76;
                if (point === 0) context.moveTo(pointX, pointY);
                else context.lineTo(pointX, pointY);
              }
              context.closePath();
            } else {
              context.ellipse(
                0,
                0,
                size,
                size * (0.68 + random() * 0.22),
                0,
                0,
                Math.PI * 2
              );
            }
            context.fill();
            context.restore();
          }
          if (variant === 4) {
            context.globalAlpha = 0.72;
            context.fillStyle = '#fff9e9';
            context.beginPath();
            context.arc(12.4, 10.8, 0.88, 0, Math.PI * 2);
            context.fill();
          }
          context.globalAlpha = 1;
          texture.refresh();
        }

        const settledKey = `sand-settled-${color}-${variant}`;
        if (!this.textures.exists(settledKey)) {
          const texture = this.textures.createCanvas(settledKey, 10, 10)!;
          const context = texture.getContext();
          const random = mulberry32(19_331 + color * 613 + variant * 83);
          const shade = getSandShade(color, Math.floor(random() * 4));
          context.clearRect(0, 0, 10, 10);
          context.globalAlpha = 0.96;
          context.fillStyle = `#${shade.toString(16).padStart(6, '0')}`;
          context.beginPath();
          context.ellipse(
            4.7,
            5,
            2.05 + random() * 0.62,
            1.8,
            0.2,
            0,
            Math.PI * 2
          );
          context.fill();
          context.globalAlpha = 0.9;
          context.fillStyle = `#${getSandShade(color, variant + 1)
            .toString(16)
            .padStart(6, '0')}`;
          context.beginPath();
          context.arc(6.6, 4.05, 1.02 + random() * 0.42, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 0.42;
          context.fillStyle = '#fff8dd';
          context.beginPath();
          context.arc(4, 3.8, 0.55, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = 1;
          texture.refresh();
        }
      }
    }
  }

  private createHeader(): void {
    this.add
      .text(18, 14, 'POURCHESTRA', {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#26223b',
        letterSpacing: -0.4,
      })
      .setShadow(0, 2, '#ffffff', 0, false, true);

    this.dayText = this.add.text(
      20,
      50,
      'TODAY’S SONG #1  ·  KOTO · HIRAJŌSHI',
      {
        fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#626276',
        letterSpacing: 0.72,
      }
    );

    const scoreRule = this.add.graphics();
    scoreRule
      .fillStyle(0xa4a1b3, 0.36)
      .fillRect(290, 16, 1, 39)
      .fillStyle(0x7b7a91, 0.12)
      .fillRoundedRect(301, 14, 65, 49, 14)
      .fillStyle(0xffffff, 0.96)
      .fillRoundedRect(298, 10, 65, 49, 14)
      .lineStyle(1, 0xc9c9d8, 0.72)
      .strokeRoundedRect(298, 10, 65, 49, 14);
    this.harmonyText = this.add
      .text(330.5, 27, '0%', {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#29253d',
      })
      .setOrigin(0.5);
    this.add
      .text(330.5, 48, `TARGET ${WIN_SCORE}%`, {
        fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#777488',
        letterSpacing: 1.2,
      })
      .setOrigin(0.5);

    const soundButton = this.add
      .circle(393, 35, 20, 0xffffff, 1)
      .setStrokeStyle(1.5, 0xb7b4ca, 0.88)
      .setInteractive({ useHandCursor: true });
    this.soundText = this.add
      .text(393, 35, '♪', {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#302c45',
      })
      .setOrigin(0.5);
    soundButton.on('pointerdown', () => {
      this.soundEnabled = !this.soundEnabled;
      this.soundText.setText(this.soundEnabled ? '♪' : '×');
      if (this.soundEnabled) this.playTone(1, 0.08, 0.05);
    });
  }

  private createControls(): void {
    this.hintText = this.add
      .text(
        WIDTH / 2,
        87,
        `DRAG BRIDGES  ·  MATCH COLOR → CUP  ·  WIN AT ${WIN_SCORE}%`,
        {
          fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#4d4962',
          letterSpacing: 0.72,
        }
      )
      .setOrigin(0.5);

    this.melodyLabelText = this.add
      .text(
        WIDTH / 2,
        603,
        'AFTER THE POUR · WATCH YOUR SAND DRAW A KOTO SONG',
        {
          fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#656277',
          letterSpacing: 0.5,
        }
      )
      .setOrigin(0.5);

    this.pourButton = this.createButton(
      WIDTH / 2,
      649,
      260,
      58,
      'START THE SAND POUR  ▶',
      () => {
        if (this.phase === 'planning') this.startPour();
      }
    );
    this.pourButtonText = this.pourButton.getByName('label');

    this.communityLabelText = this.add.text(
      21,
      697,
      'TODAY’S SONG  ·  TAP TO LISTEN',
      {
        fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#5f5d72',
        letterSpacing: 0.8,
      }
    );
    this.communityPlayText = this.add
      .text(202, 697, '▶', {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#0fa99f',
      })
      .setOrigin(0.5, 0);
    this.playerCountText = this.add
      .text(399, 698, 'BE THE FIRST', {
        fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#737084',
      })
      .setOrigin(1, 0);

    this.streamLabelTexts = STREAM_CENTERS.map((x) =>
      this.add
        .text(x, 128, '', {
          fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
          fontSize: '7px',
          fontStyle: 'bold',
          color: '#343047',
          letterSpacing: 0.4,
        })
        .setOrigin(0.5)
        .setDepth(10)
    );
    CUP_CENTERS.forEach((x, color) =>
      this.add
        .text(x, CUP_Y + 6, KOTO_NOTE_LABELS[color] ?? '', {
          fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: getColor(color).css,
        })
        .setOrigin(0.5)
        .setDepth(10)
    );
    this.cupStatusTexts = CUP_CENTERS.map((x) =>
      this.add
        .text(x, CUP_Y + 34, '', {
          fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
          fontSize: '7px',
          fontStyle: 'bold',
          color: '#5f5b70',
          letterSpacing: 0.4,
        })
        .setOrigin(0.5)
        .setDepth(10)
    );
    this.updateTargetLabels();

    const communityTapZone = this.add
      .rectangle(210, 741, 386, 60, 0xffffff, 0.001)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    communityTapZone.on('pointerdown', () => {
      if (this.phase === 'pouring') return;
      this.communityPlayText.setText('♪');
      this.playPattern(this.state.chorus, 742, 48, 40, true);
      this.time.delayedCall(1_300, () => this.communityPlayText.setText('▶'));
    });
  }

  private updateTargetLabels(): void {
    this.streamLabelTexts.forEach((text, slot) => {
      const color = this.dayLayout.order[slot] ?? slot;
      text
        .setText(`${KOTO_NOTE_LABELS[color] ?? ''} · ${getColor(color).label}`)
        .setColor(getColor(color).css);
    });

    this.cupStatusTexts.forEach((text, cup) => {
      const total = this.cupTotals[cup] ?? 0;
      const matched = this.cupCorrect[cup] ?? 0;
      if (this.phase === 'planning' || total === 0) {
        text.setText(`${getColor(cup).label} CUP`).setColor('#5f5b70');
        return;
      }
      const match = Math.round((matched / total) * 100);
      text
        .setText(`${match}% MATCH`)
        .setColor(match >= WIN_SCORE ? '#078b83' : '#8a5261');
    });
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onPress: () => void
  ): Phaser.GameObjects.Container {
    const shadow = this.add.graphics();
    shadow
      .fillStyle(0x7f5371, 0.22)
      .fillRoundedRect(-width / 2, -height / 2 + 8, width, height, 18);
    const plate = this.add.graphics();
    const drawPlate = (hovered: boolean): void => {
      plate
        .clear()
        .fillStyle(hovered ? 0xff6685 : 0xff456b, 1)
        .fillRoundedRect(-width / 2, -height / 2, width, height, 18)
        .fillStyle(0xd92d56, 0.34)
        .fillRoundedRect(-width / 2 + 5, height / 2 - 11, width - 10, 5, 3)
        .lineStyle(2, 0xffffff, 0.92)
        .strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
    };
    drawPlate(false);
    plate.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    if (plate.input) plate.input.cursor = 'pointer';
    const shine = this.add.graphics();
    shine
      .fillStyle(0xffffff, 0.38)
      .fillRoundedRect(-width / 2 + 13, -height / 2 + 8, width - 26, 3, 2);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        letterSpacing: 0.55,
      })
      .setOrigin(0.5)
      .setName('label');
    const container = this.add.container(x, y, [shadow, plate, shine, text]);

    plate.on('pointerover', () => drawPlate(true));
    plate.on('pointerout', () => drawPlate(false));
    plate.on('pointerdown', () => {
      container.setScale(0.98);
      onPress();
    });
    plate.on('pointerup', () => container.setScale(1));
    return container;
  }

  private createRamps(): void {
    const starts = [
      { x: 284, y: 265, angle: -0.28 },
      { x: 151, y: 352, angle: 0.24 },
      { x: 275, y: 433, angle: -0.16 },
    ];

    this.ramps = starts.map((start) => {
      const shadow = this.add.rectangle(0, 6, 138, 20, 0x8a6038, 0.18);
      const aura = this.add.rectangle(0, 0, 140, 20, 0xfff2cc, 0.42);
      const glass = this.add
        .rectangle(0, 0, 134, 16, 0xffecc1, 0.98)
        .setStrokeStyle(2, 0xc58b42, 0.92);
      const refraction = this.add.rectangle(0, 1, 124, 8, 0xfffbef, 0.62);
      const core = this.add.rectangle(0, -4, 118, 2, 0xe0a14e, 0.88);
      const leftCap = this.add
        .circle(-67, 0, 10, 0xfff9e8, 1)
        .setStrokeStyle(2, 0x9b7042, 0.94);
      const rightCap = this.add
        .circle(67, 0, 10, 0xfff9e8, 1)
        .setStrokeStyle(2, 0x9b7042, 0.94);
      const leftGrip = this.add.circle(-67, 0, 3.5, 0xff5573, 1);
      const rightGrip = this.add.circle(67, 0, 3.5, 0xff5573, 1);
      const container = this.add
        .container(start.x, start.y, [
          shadow,
          aura,
          glass,
          refraction,
          core,
          leftCap,
          rightCap,
          leftGrip,
          rightGrip,
        ])
        .setRotation(start.angle)
        .setSize(156, 50)
        .setDepth(6)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(container);

      const ramp: Ramp = {
        container,
        x: start.x,
        y: start.y,
        angle: start.angle,
        downX: start.x,
        downY: start.y,
      };

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        ramp.downX = pointer.x;
        ramp.downY = pointer.y;
        container.setScale(1.04);
        container.setDepth(20);
      });
      container.on(
        'drag',
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          if (this.phase !== 'planning') return;
          ramp.x = Phaser.Math.Clamp(dragX, 88, 332);
          ramp.y = Phaser.Math.Clamp(dragY, 215, 450);
          container.setPosition(ramp.x, ramp.y);
        }
      );
      container.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        container.setScale(1);
        container.setDepth(5);
        if (this.phase !== 'planning') return;
        const movement = Phaser.Math.Distance.Between(
          ramp.downX,
          ramp.downY,
          pointer.x,
          pointer.y
        );
        if (movement < 9) {
          const angles: readonly [number, number, number, number, number] = [
            -0.62, -0.32, 0, 0.32, 0.62,
          ];
          const closest = angles.reduce((bestIndex, angle, index) => {
            return Math.abs(angle - ramp.angle) <
              Math.abs((angles[bestIndex] ?? 0) - ramp.angle)
              ? index
              : bestIndex;
          }, 0);
          ramp.angle = angles[(closest + 1) % angles.length] ?? 0;
          this.tweens.add({
            targets: container,
            rotation: ramp.angle,
            duration: 130,
            ease: 'Sine.Out',
          });
          this.playTone(this.ramps.indexOf(ramp), 0.06, 0.025);
        }
      });

      return ramp;
    });
  }

  private applyDaySeed(seed: number): void {
    this.daySeed = seed;
    const random = mulberry32(seed);
    const puzzleOrders: readonly FourNumbers[] = [
      [1, 0, 3, 2],
      [0, 2, 1, 3],
      [1, 0, 2, 3],
      [0, 1, 3, 2],
    ];
    const template =
      puzzleOrders[Math.floor(random() * puzzleOrders.length)] ??
      puzzleOrders[0];
    const order: FourNumbers = [
      template?.[0] ?? 1,
      template?.[1] ?? 0,
      template?.[2] ?? 3,
      template?.[3] ?? 2,
    ];

    const pegs: Peg[] = [];
    for (let row = 0; row < 7; row += 1) {
      const columns = row % 2 === 0 ? 5 : 4;
      const spacing = columns === 5 ? 70 : 78;
      const startX = columns === 5 ? 70 : 92;
      for (let column = 0; column < columns; column += 1) {
        pegs.push({
          x: startX + column * spacing + (random() - 0.5) * 13,
          y: 198 + row * 38 + (random() - 0.5) * 6,
          radius: 5,
        });
      }
    }
    this.dayLayout = { order, pegs };
    this.random = mulberry32(seed ^ 0x92d68ca2);
  }

  private drawBoard(): void {
    this.boardGraphics.clear();
    this.boardGraphics
      .fillStyle(0x667188, 0.18)
      .fillRoundedRect(11, BOARD_TOP + 8, 398, BOARD_BOTTOM - BOARD_TOP, 25)
      .fillStyle(0xf8fdff, 0.99)
      .fillRoundedRect(11, BOARD_TOP, 398, BOARD_BOTTOM - BOARD_TOP, 25)
      .lineStyle(2, 0x9fc2cc, 0.9)
      .strokeRoundedRect(11, BOARD_TOP, 398, BOARD_BOTTOM - BOARD_TOP, 25)
      .lineStyle(1, 0xffffff, 0.95)
      .strokeRoundedRect(
        17,
        BOARD_TOP + 5,
        386,
        BOARD_BOTTOM - BOARD_TOP - 10,
        20
      );

    this.boardGraphics
      .fillStyle(0xcceff2, 0.34)
      .fillRoundedRect(22, 181, 376, 307, 18)
      .fillStyle(0xffffff, 0.72)
      .fillRect(27, 184, 1, 296)
      .fillRect(392, 184, 1, 296);

    this.dayLayout.order.forEach((color, slot) => {
      const x = STREAM_CENTERS[slot] ?? STREAM_CENTERS[0];
      this.boardGraphics
        .fillStyle(0x68768d, 0.14)
        .fillRoundedRect(x - 39, 119, 78, 64, 15)
        .fillStyle(0xffffff, 1)
        .fillRoundedRect(x - 39, 115, 78, 64, 15)
        .lineStyle(1.5, 0xb8cbd1, 0.92)
        .strokeRoundedRect(x - 39, 115, 78, 64, 15)
        .fillStyle(getColor(color).dark, 0.88)
        .fillRoundedRect(x - 32, 139, 64, 30, 8)
        .fillStyle(getColor(color).hex, 0.98)
        .fillEllipse(x, 142, 62, 14)
        .fillStyle(0xffffff, 0.62)
        .fillRoundedRect(x - 24, 135, 38, 3, 2)
        .fillStyle(0xf6fafb, 1)
        .fillRoundedRect(x - 11, 174, 22, 8, 3)
        .fillStyle(getColor(color).hex, 0.9)
        .fillTriangle(x - 8, 181, x + 8, 181, x, 193);
      this.drawSandBed(this.boardGraphics, x, 155, color, slot);
    });

    this.dayLayout.pegs.forEach((peg) => {
      this.boardGraphics
        .fillStyle(0x66788a, 0.18)
        .fillCircle(peg.x + 1.5, peg.y + 2.5, peg.radius + 1.6)
        .fillStyle(0xaac3ca, 1)
        .fillCircle(peg.x, peg.y, peg.radius)
        .fillStyle(0xffffff, 1)
        .fillCircle(peg.x - 1.35, peg.y - 1.5, peg.radius * 0.4)
        .fillStyle(0x66818a, 0.72)
        .fillCircle(peg.x + 1.2, peg.y + 1.4, peg.radius * 0.33);
    });

    CUP_CENTERS.forEach((x, color) => {
      this.drawTargetCup(this.boardGraphics, x, color);
    });
  }

  private drawTargetCup(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    color: number
  ): void {
    const top = CUP_Y - 14;
    const body: Phaser.Math.Vector2[] = [
      new Phaser.Math.Vector2(x - 40, top),
      new Phaser.Math.Vector2(x + 40, top),
      new Phaser.Math.Vector2(x + 38, top + 20),
      new Phaser.Math.Vector2(x + 34, top + 45),
      new Phaser.Math.Vector2(x + 27, top + 72),
      new Phaser.Math.Vector2(x + 18, top + 78),
      new Phaser.Math.Vector2(x - 18, top + 78),
      new Phaser.Math.Vector2(x - 27, top + 72),
      new Phaser.Math.Vector2(x - 34, top + 45),
      new Phaser.Math.Vector2(x - 38, top + 20),
    ];
    const shadow = body.map(
      (point) => new Phaser.Math.Vector2(point.x + 1.5, point.y + 6)
    );
    const inner = body.map(
      (point) =>
        new Phaser.Math.Vector2(
          x + (point.x - x) * 0.84,
          top + 7 + (point.y - top) * 0.83
        )
    );

    graphics
      .fillStyle(getColor(color).hex, 0.13)
      .fillEllipse(x, CUP_Y + 63, 88, 20)
      .fillStyle(0x67738b, 0.16)
      .fillPoints(shadow, true)
      .fillStyle(0xffffff, 0.97)
      .fillPoints(body, true)
      .lineStyle(3, getColor(color).hex, 0.94)
      .strokePoints(body, true)
      .fillStyle(getColor(color).hex, 0.075)
      .fillPoints(inner, true)
      .lineStyle(1, 0xcad7dc, 0.82)
      .strokePoints(inner, true)
      .fillStyle(getColor(color).dark, 0.24)
      .fillEllipse(x, top, 80, 18)
      .fillStyle(getColor(color).hex, 0.22)
      .fillEllipse(x, top + 2, 68, 11)
      .fillStyle(0xffffff, 0.82)
      .fillRoundedRect(x - 29, top + 12, 3, 39, 2);
  }

  private drawIrregularGrain(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    color: number,
    alpha: number,
    shape: number,
    skew: number
  ): void {
    graphics.fillStyle(color, alpha);
    if (shape % 3 === 0) {
      graphics.fillTriangle(
        x - size,
        y + size * 0.55,
        x + size * 0.82,
        y + size * 0.34,
        x + skew * size,
        y - size
      );
    } else if (shape % 3 === 1) {
      graphics
        .fillTriangle(x, y - size, x - size * 0.8, y, x + size, y)
        .fillTriangle(
          x + skew * size,
          y + size * 0.8,
          x - size * 0.8,
          y,
          x + size,
          y
        );
    } else {
      graphics.fillEllipse(x, y, size * 1.85, size * 1.25);
    }
  }

  private drawSandBed(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    slot: number
  ): void {
    const random = mulberry32(this.daySeed + color * 97 + slot * 401);
    for (let grain = 0; grain < 132; grain += 1) {
      const grainX = x - 29 + random() * 58;
      const grainY = y - 10 + random() * 23;
      const size = 1.05 + random() * 1.2;
      this.drawIrregularGrain(
        graphics,
        grainX,
        grainY,
        size,
        getSandShade(color, Math.floor(random() * 4)),
        0.78 + random() * 0.2,
        grain,
        random() - 0.5
      );
      if (grain % 19 === 0) {
        graphics
          .fillStyle(0xfffae9, 0.48)
          .fillCircle(grainX - 0.2, grainY - 0.3, 0.28);
      }
    }
  }

  private drawCupFill(): void {
    this.fillGraphics.clear();
    CUP_CENTERS.forEach((x, cup) => {
      const pile = this.cupSand[cup] ?? [];
      const total = pile.length;
      if (total === 0) return;
      const height = Math.min(58, 7 + total * 0.18);
      const bottom = CUP_Y + 51;
      const pulse = this.cupPulse[cup] ?? 0;
      this.fillGraphics
        .fillStyle(getColor(cup).hex, 0.07 + pulse * 0.04)
        .fillRoundedRect(x - 33, bottom - height - 2, 66, height + 5, 10)
        .fillStyle(getColor(cup).hex, 0.16)
        .fillRoundedRect(x - 31, bottom - height, 62, height, 9)
        .fillStyle(getColor(cup).dark, 0.22)
        .fillEllipse(x, bottom - height + 1, 59, 9);
    });
  }

  private drawBeatStrip(pattern: ChorusPattern, alpha: number): void {
    this.beatGraphics.clear();
    this.addBeatCells(this.beatGraphics, 51, 604, pattern, alpha, 39, 7);
  }

  private drawCommunity(): void {
    this.communityGraphics.clear();
    this.communityGraphics
      .fillStyle(0x68738a, 0.12)
      .fillRoundedRect(17, 718, 386, 57, 15)
      .fillStyle(0xffffff, 0.9)
      .fillRoundedRect(17, 714, 386, 57, 15)
      .lineStyle(1, 0xb9cbd1, 0.82)
      .strokeRoundedRect(17, 714, 386, 57, 15);
    this.addBeatCells(
      this.communityGraphics,
      48,
      742,
      this.state.chorus,
      0.95,
      40,
      7
    );
    const milestoneProgress = Phaser.Math.Clamp(
      this.state.playerCount / Math.max(1, this.state.milestone.target),
      0,
      1
    );
    this.communityGraphics
      .fillStyle(0xdde8eb, 1)
      .fillRoundedRect(30, 764, 360, 3, 2)
      .fillStyle(0x18b8ae, 0.92)
      .fillRoundedRect(30, 764, 360 * milestoneProgress, 3, 2);
    this.playerCountText?.setText(
      this.state.playerCount > 0
        ? `${this.state.playerCount} ${this.state.playerCount === 1 ? 'VOICE' : 'VOICES'}  ·  ${this.state.milestone.remaining} TO ${this.state.milestone.reward}`
        : `${this.state.milestone.target} TO ${this.state.milestone.reward}`
    );
    this.updateDailyMeta();
  }

  private updateDailyMeta(): void {
    const streak =
      this.state.streak > 0 ? `  ·  STREAK ${this.state.streak}` : '';
    this.dayText?.setText(
      `TODAY’S SONG #${this.state.dayNumber}  ·  KOTO · HIRAJŌSHI${streak}`
    );

    const remaining = Math.max(0, Date.parse(this.state.resetAt) - Date.now());
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const countdown = hours > 0 ? `${hours}H ${minutes}M` : `${minutes}M`;
    this.communityLabelText?.setText(`TODAY’S SONG  ·  ${countdown} LEFT`);
  }

  private addBeatCells(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    y: number,
    pattern: ChorusPattern,
    alpha: number,
    spacing: number,
    _radius: number,
    revealProgress = 1
  ): void {
    const reveal = Phaser.Math.Clamp(revealProgress, 0, 1);
    const pathProgress = reveal * Math.max(1, pattern.length - 1);
    const points = pattern.map((color, index) =>
      this.getMelodyPoint(startX, y, spacing, color, index)
    );

    // A faint silk thread keeps the melody legible while the colored grains
    // make it feel hand-drawn rather than like a row of interface buttons.
    points.slice(0, -1).forEach((point, index) => {
      const next = points[index + 1];
      if (!next) return;
      const segmentProgress = Phaser.Math.Clamp(pathProgress - index, 0, 1);
      if (segmentProgress <= 0) return;
      const color = pattern[index] ?? 0;
      const nextColor = pattern[index + 1] ?? color;
      const bend =
        (index % 2 === 0 ? -1 : 1) * (2.6 + Math.abs(next.y - point.y) * 0.08);
      let previousX = point.x;
      let previousY = point.y;

      const visibleSteps = Math.max(1, Math.ceil(18 * segmentProgress));
      for (let step = 1; step <= visibleSteps; step += 1) {
        const progress = step / 18;
        const x = Phaser.Math.Linear(point.x, next.x, progress);
        const curveY =
          Phaser.Math.Linear(point.y, next.y, progress) +
          Math.sin(progress * Math.PI) * bend;
        graphics
          .lineStyle(0.55, 0xb8915d, 0.22 * alpha)
          .lineBetween(previousX, previousY, x, curveY);

        if (step < 18) {
          const dotColor =
            progress < 0.48 ? getColor(color).hex : getColor(nextColor).hex;
          const dotSize = step % 4 === 0 ? 1.12 : 0.62;
          graphics
            .fillStyle(
              dotColor,
              (0.34 + Math.sin(progress * Math.PI) * 0.42) * alpha
            )
            .fillCircle(x, curveY, dotSize)
            .fillStyle(0xffd792, 0.3 * alpha)
            .fillCircle(x + 1.6, curveY - 1.2, step % 5 === 0 ? 0.7 : 0.34);
        }
        previousX = x;
        previousY = curveY;
      }
    });

    pattern.forEach((color, index) => {
      const point = points[index];
      if (!point) return;
      const palette = getColor(color);
      const nodeAt = index / Math.max(1, pattern.length - 1);
      const nodeAlpha =
        Phaser.Math.Clamp((reveal - nodeAt) * (pattern.length + 2), 0, 1) *
        alpha;
      if (nodeAlpha <= 0) return;

      // Deterministic star dust: it looks alive but remains identical every
      // time the daily melody is rendered.
      for (let dust = 0; dust < 5; dust += 1) {
        const angle = index * 1.73 + dust * 2.17 + color * 0.61;
        const distance = 11 + ((index * 7 + dust * 5) % 9);
        const dustX = point.x + Math.cos(angle) * distance;
        const dustY = point.y + Math.sin(angle) * distance * 0.58;
        graphics
          .fillStyle(
            dust % 3 === 0 ? 0xd7a65b : palette.hex,
            (0.2 + dust * 0.055) * nodeAlpha
          )
          .fillCircle(dustX, dustY, dust % 2 === 0 ? 0.72 : 0.42);
      }

      graphics
        .fillStyle(palette.hex, 0.045 * nodeAlpha)
        .fillCircle(point.x, point.y, 13.5)
        .fillStyle(palette.hex, 0.075 * nodeAlpha)
        .fillCircle(point.x, point.y, 9.5)
        .lineStyle(0.7, 0xd6ad71, 0.38 * nodeAlpha)
        .strokeCircle(point.x, point.y, 8.2)
        .fillStyle(0xfffbf1, 0.94 * nodeAlpha)
        .fillCircle(point.x, point.y, 6.9);

      this.drawMusicNote(
        graphics,
        point.x,
        point.y - 4,
        color,
        nodeAlpha,
        0.72
      );

      if (index % 2 === 1) {
        const sparkleX = point.x + 11;
        const sparkleY = point.y - 9;
        graphics
          .lineStyle(0.75, 0xd59e4a, 0.55 * nodeAlpha)
          .lineBetween(sparkleX - 2.7, sparkleY, sparkleX + 2.7, sparkleY)
          .lineBetween(sparkleX, sparkleY - 2.7, sparkleX, sparkleY + 2.7)
          .fillStyle(0xfff4ce, 0.9 * nodeAlpha)
          .fillCircle(sparkleX, sparkleY, 0.8);
      }
    });
  }

  private getMelodyPoint(
    startX: number,
    y: number,
    spacing: number,
    color: number,
    index: number
  ): { x: number; y: number } {
    const pitchHeight = [8, 3, -4, -10][color] ?? 0;
    const handDrawnDrift = Math.sin(index * 1.31 + color * 0.67) * 2.8;
    return {
      x: startX + index * spacing,
      y: y + pitchHeight + handDrawnDrift,
    };
  }

  private drawMusicNote(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    alpha: number,
    scale = 1
  ): void {
    const noteY = y;
    graphics
      .fillStyle(getColor(color).dark, 0.14 * alpha)
      .fillEllipse(x - 2 * scale, noteY + 6 * scale, 9 * scale, 6 * scale)
      .fillStyle(getColor(color).dark, 0.98 * alpha)
      .fillEllipse(x - 3 * scale, noteY + 4.5 * scale, 9 * scale, 6.5 * scale)
      .fillRoundedRect(
        x + 0.5 * scale,
        noteY - 9 * scale,
        2.7 * scale,
        14.5 * scale,
        1.2 * scale
      )
      .fillTriangle(
        x + 2.7 * scale,
        noteY - 9 * scale,
        x + 9 * scale,
        noteY - 6 * scale,
        x + 2.7 * scale,
        noteY - 2 * scale
      )
      .fillStyle(0xffffff, 0.42 * alpha)
      .fillEllipse(
        x - 4.5 * scale,
        noteY + 3.5 * scale,
        2.3 * scale,
        1.5 * scale
      );
  }

  private startPour(): void {
    this.phase = 'pouring';
    this.attempt += 1;
    this.particles.forEach((particle) => particle.sprite.destroy());
    this.particles = [];
    this.spawnedRows = 0;
    this.nextSpawnAt = 0;
    this.landed = 0;
    this.correct = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.cupTotals = [0, 0, 0, 0];
    this.cupCorrect = [0, 0, 0, 0];
    this.cupSand = [[], [], [], []];
    this.cupFillDirty = false;
    this.cupPulse = [0, 0, 0, 0];
    this.impactBursts = [];
    this.musicPulses = [];
    this.beatWeights = Array.from({ length: BEAT_COUNT }, (): FourNumbers => [
      0, 0, 0, 0,
    ]);
    this.random = mulberry32(this.daySeed ^ 0x92d68ca2);
    this.lastCollisionNoteAt = -1_000;
    this.lastLandingNoteAt = -1_000;
    this.pourStartedAt = this.time.now;
    this.pourButtonText.setText('SAND IS POURING…');
    this.pourButton.setAlpha(0.72);
    this.hintText.setText(
      `SAME COLOR → SAME CUP  ·  REACH ${WIN_SCORE}% TO WIN`
    );
    this.melodyLabelText.setText(
      'YOUR 4 CUP NOTES WILL BECOME AN 8-BEAT KOTO SONG'
    );
    this.beatGraphics.clear();
    this.updateTargetLabels();
    this.ramps.forEach((ramp) => ramp.container.disableInteractive());
    this.ensureAudio();
    this.playTone(0, 0.14, 0.06);
    this.tweens.add({
      targets: this.ramps.map((ramp) => ramp.container),
      alpha: { from: 0.78, to: 1 },
      duration: 300,
      ease: 'Sine.Out',
    });
  }

  private spawnRow(): void {
    STREAM_CENTERS.forEach((x, slot) => {
      const color = this.dayLayout.order[slot] ?? slot;
      const particleX = x + (this.random() - 0.5) * 11;
      const particleY = 184 + this.random() * 3;
      const seed = this.random();
      const size = 0.58 + this.random() * 0.54;
      const shape = Math.floor(this.random() * 6);
      const sprite = this.add
        .image(particleX, particleY, `sand-grain-${color}-${shape}`)
        .setScale(0.96 + size * 0.16)
        .setAlpha(1)
        .setRotation(seed * Math.PI * 2)
        .setDepth(4);
      this.particles.push({
        x: particleX,
        y: particleY,
        previousX: x,
        previousY: 184,
        vx: (this.random() - 0.5) * 22,
        vy: 24 + this.random() * 24,
        color,
        active: true,
        seed,
        size,
        shape,
        lastHitAt: -1_000,
        sprite,
      });
    });
  }

  private updateParticles(step: number, time: number): void {
    this.particles.forEach((particle) => {
      if (!particle.active) return;

      particle.previousX = particle.x;
      particle.previousY = particle.y;
      particle.vy += 540 * step;
      particle.vx *= 0.996;

      if (particle.y > 300) {
        const targetX = CUP_CENTERS[particle.color] ?? CUP_CENTERS[0];
        const progress = Phaser.Math.Clamp((particle.y - 300) / 195, 0, 1);
        const attraction = 1 + progress * 3;
        particle.vx +=
          Phaser.Math.Clamp((targetX - particle.x) * attraction, -880, 880) *
          step;
      }

      particle.x += particle.vx * step;
      particle.y += particle.vy * step;

      if (particle.x < BOARD_LEFT + 8) {
        particle.x = BOARD_LEFT + 8;
        particle.vx = Math.abs(particle.vx) * 0.62;
      } else if (particle.x > BOARD_RIGHT - 8) {
        particle.x = BOARD_RIGHT - 8;
        particle.vx = -Math.abs(particle.vx) * 0.62;
      }

      this.dayLayout.pegs.forEach((peg) =>
        this.collideCircle(particle, peg, time)
      );
      this.ramps.forEach((ramp) => this.collideRamp(particle, ramp, time));

      if (particle.y >= CUP_Y - 16) this.landParticle(particle, time);
      if (particle.y > BOARD_BOTTOM + 20) {
        particle.active = false;
        particle.sprite.destroy();
      }
    });
  }

  private collideCircle(particle: Particle, peg: Peg, time: number): void {
    const dx = particle.x - peg.x;
    const dy = particle.y - peg.y;
    const minDistance = peg.radius + 4.2;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minDistance * minDistance || distanceSquared === 0)
      return;

    const distance = Math.sqrt(distanceSquared);
    const nx = dx / distance;
    const ny = dy / distance;
    particle.x = peg.x + nx * minDistance;
    particle.y = peg.y + ny * minDistance;
    const velocityAlongNormal = particle.vx * nx + particle.vy * ny;
    if (velocityAlongNormal < 0) {
      const impactSpeed = Math.abs(velocityAlongNormal);
      particle.vx -= 1.58 * velocityAlongNormal * nx;
      particle.vy -= 1.58 * velocityAlongNormal * ny;
      particle.vx += (this.random() - 0.5) * 8;
      if (impactSpeed > 52) {
        this.registerMusicHit(particle, peg.x, peg.y, time, impactSpeed / 260);
      }
    }
  }

  private collideRamp(particle: Particle, ramp: Ramp, time: number): void {
    const halfLength = 67;
    const cosine = Math.cos(ramp.angle);
    const sine = Math.sin(ramp.angle);
    const startX = ramp.x - cosine * halfLength;
    const startY = ramp.y - sine * halfLength;
    const endX = ramp.x + cosine * halfLength;
    const endY = ramp.y + sine * halfLength;
    const lineX = endX - startX;
    const lineY = endY - startY;
    const lengthSquared = lineX * lineX + lineY * lineY;
    const projection = Phaser.Math.Clamp(
      ((particle.x - startX) * lineX + (particle.y - startY) * lineY) /
        lengthSquared,
      0,
      1
    );
    const closestX = startX + projection * lineX;
    const closestY = startY + projection * lineY;
    const dx = particle.x - closestX;
    const dy = particle.y - closestY;
    const minDistance = 12.5;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minDistance * minDistance) return;

    const distance = Math.sqrt(Math.max(distanceSquared, 0.001));
    let nx = dx / distance;
    let ny = dy / distance;
    if (distanceSquared < 0.01) {
      nx = -sine;
      ny = cosine;
      if (particle.vx * nx + particle.vy * ny > 0) {
        nx *= -1;
        ny *= -1;
      }
    }
    particle.x = closestX + nx * minDistance;
    particle.y = closestY + ny * minDistance;
    const velocityAlongNormal = particle.vx * nx + particle.vy * ny;
    if (velocityAlongNormal < 0) {
      const impactSpeed = Math.abs(velocityAlongNormal);
      particle.vx -= 1.46 * velocityAlongNormal * nx;
      particle.vy -= 1.46 * velocityAlongNormal * ny;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      if (impactSpeed > 42) {
        this.registerMusicHit(
          particle,
          closestX,
          closestY,
          time,
          impactSpeed / 220
        );
      }
    }
  }

  private registerMusicHit(
    particle: Particle,
    x: number,
    y: number,
    time: number,
    strength: number
  ): void {
    if (
      time - particle.lastHitAt < 145 ||
      time - this.lastCollisionNoteAt < 125
    ) {
      return;
    }

    particle.lastHitAt = time;
    this.lastCollisionNoteAt = time;
    const pitchStep = Phaser.Math.Clamp(Math.floor((y - 175) / 82), 0, 4);
    const pitch = [1.5, 1.25, 1, 0.84, 0.72][pitchStep] ?? 1;
    this.playTone(
      particle.color,
      0.045,
      0.012 + Math.min(strength, 1) * 0.012,
      pitch
    );
    this.musicPulses.push({
      x,
      y,
      color: particle.color,
      startedAt: time,
      strength: Phaser.Math.Clamp(strength, 0.35, 1),
    });
  }

  private landParticle(particle: Particle, time: number): void {
    particle.active = false;
    const cup = CUP_CENTERS.reduce((best, center, index) => {
      return Math.abs(center - particle.x) <
        Math.abs((CUP_CENTERS[best] ?? CUP_CENTERS[0]) - particle.x)
        ? index
        : best;
    }, 0);
    this.landed += 1;
    this.cupTotals[cup] = (this.cupTotals[cup] ?? 0) + 1;
    this.cupSand[cup]?.push(particle.color);
    this.settleParticle(particle, cup, this.cupSand[cup]?.length ?? 1);

    const beat = Phaser.Math.Clamp(
      Math.floor(
        ((this.landed - 1) / (GRAINS_PER_COLOR * COLOR_COUNT)) * BEAT_COUNT
      ),
      0,
      BEAT_COUNT - 1
    );
    const beatRow = this.beatWeights[beat];
    if (beatRow) beatRow[cup] = (beatRow[cup] ?? 0) + 1;
    if (this.landed % 72 === 0) {
      this.currentPattern = this.buildCurrentPattern();
    }

    if (cup === particle.color) {
      this.correct += 1;
      this.cupCorrect[cup] = (this.cupCorrect[cup] ?? 0) + 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    } else {
      this.combo = 0;
    }

    if (time - this.lastLandingNoteAt > 155) {
      const correctLanding = cup === particle.color;
      this.playTone(
        cup,
        correctLanding ? 0.07 : 0.045,
        correctLanding ? 0.019 + Math.min(this.combo, 12) * 0.0015 : 0.009,
        correctLanding ? 1 : 0.84
      );
      this.lastLandingNoteAt = time;
    }

    this.cupPulse[cup] = cup === particle.color ? 1 : 0.52;
    this.cupFillDirty = true;
    if (this.landed % 10 === 0) {
      this.impactBursts.push({
        x: particle.x,
        y: CUP_Y + 2,
        color: particle.color,
        startedAt: time,
        strength: cup === particle.color ? 1 : 0.55,
      });
    }

    this.updateHarmony();
    if (this.landed % 12 === 0) this.updateTargetLabels();
  }

  private settleParticle(particle: Particle, cup: number, count: number): void {
    let remaining = Math.max(0, count - 1);
    let row = 0;
    let capacity = 15;
    while (remaining >= capacity) {
      remaining -= capacity;
      row += 1;
      capacity = Math.max(11, 15 - Math.floor(row / 5));
    }

    const center = CUP_CENTERS[cup] ?? CUP_CENTERS[0];
    const spacing = 60 / capacity;
    const jitterX = (((particle.seed * 31.7) % 1) - 0.5) * 1.1;
    const jitterY = ((particle.seed * 47.3) % 1) * 0.8;
    const targetX =
      center + (remaining - (capacity - 1) * 0.5) * spacing + jitterX;
    const targetY = CUP_Y + 50 - row * 2.25 - jitterY;

    particle.sprite
      .setTexture(`sand-settled-${particle.color}-${particle.shape}`)
      .setDepth(3);
    this.tweens.add({
      targets: particle.sprite,
      x: targetX,
      y: targetY,
      scaleX: 1.05,
      scaleY: 1.05,
      rotation: 0,
      duration: 95,
      ease: 'Quad.Out',
    });
  }

  private drawParticles(): void {
    this.particles.forEach((particle) => {
      if (!particle.active) return;
      const rotation =
        Math.atan2(particle.vy, particle.vx) * 0.08 +
        particle.seed * Math.PI * 2;
      particle.sprite
        .setPosition(particle.x, particle.y)
        .setRotation(rotation)
        .setAlpha(0.9 + particle.seed * 0.09);
    });
  }

  private drawImpactEffects(time: number): void {
    this.effectsGraphics.clear();
    this.musicPulses = this.musicPulses.filter(
      (pulse) => time - pulse.startedAt < 360
    );
    this.musicPulses.forEach((pulse) => {
      const progress = Phaser.Math.Clamp((time - pulse.startedAt) / 360, 0, 1);
      const alpha = (1 - progress) * pulse.strength;
      this.effectsGraphics
        .lineStyle(1.2, getColor(pulse.color).hex, alpha * 0.72)
        .strokeCircle(pulse.x, pulse.y, 5 + progress * 13)
        .fillStyle(getColor(pulse.color).hex, alpha * 0.22)
        .fillCircle(pulse.x, pulse.y, 2.2 + progress * 1.5);
    });
    this.impactBursts = this.impactBursts.filter(
      (burst) => time - burst.startedAt < 420
    );
    this.impactBursts.forEach((burst) => {
      const progress = Phaser.Math.Clamp((time - burst.startedAt) / 420, 0, 1);
      const random = mulberry32(
        Math.floor(burst.startedAt) + burst.color * 401 + this.attempt * 997
      );
      const alpha = (1 - progress) * burst.strength;
      this.effectsGraphics
        .fillStyle(getColor(burst.color).hex, alpha * 0.035)
        .fillCircle(burst.x, burst.y - 1, 3 + progress * 8);

      for (let grain = 0; grain < 11; grain += 1) {
        const angle = 0.16 + random() * (Math.PI - 0.32);
        const distance = progress * (4 + random() * 15);
        const grainX = burst.x + Math.cos(angle) * distance;
        const grainY =
          burst.y - Math.sin(angle) * distance + progress * progress * 9;
        this.drawIrregularGrain(
          this.effectsGraphics,
          grainX,
          grainY,
          0.35 + random() * 0.58 * (1 - progress * 0.45),
          getSandShade(burst.color, Math.floor(random() * 4)),
          alpha * 0.74,
          grain,
          random() - 0.5
        );
      }
    });
  }

  private updateHarmony(): void {
    const score =
      this.landed === 0 ? 0 : Math.round((this.correct / this.landed) * 100);
    this.harmonyText.setText(`${score}%`);
    const color = score >= 80 ? '#0a9f96' : score >= 55 ? '#c87908' : '#28243c';
    this.harmonyText.setColor(color);
  }

  private buildCurrentPattern(): ChorusPattern {
    return makePattern(
      this.beatWeights.map((weights, beat) => {
        const total = weights.reduce((sum, value) => sum + value, 0);
        if (total === 0) return beat % COLOR_COUNT;
        return weights.reduce(
          (best, value, index) => (value > (weights[best] ?? 0) ? index : best),
          0
        );
      })
    );
  }

  private finishRun(): void {
    if (this.phase !== 'pouring') return;
    this.phase = 'result';
    this.particles.forEach((particle) => {
      if (!particle.active) return;
      particle.active = false;
      particle.sprite.destroy();
    });
    const score =
      this.landed === 0 ? 0 : Math.round((this.correct / this.landed) * 100);
    this.currentPattern = this.buildCurrentPattern();
    this.state.bestScore = Math.max(this.state.bestScore, score);
    this.beatGraphics.clear();
    this.pourButton.setVisible(false);
    this.hintText.setText('WATCH YOUR FOUR CUP NOTES DRAW THE FINISHED SONG');
    this.melodyLabelText.setText('DRAWING YOUR KOTO SONG…');
    this.updateTargetLabels();
    this.time.delayedCall(240, () => this.showResult(score, true));
  }

  private showResult(score: number, animateDrawing = false): void {
    this.overlay?.destroy(true);
    const won = score >= WIN_SCORE;
    const scrim = this.add.graphics();
    scrim
      .fillStyle(0x59627a, 0.22)
      .fillRoundedRect(-191, -238, 382, 500, 27)
      .fillStyle(0xffffff, 0.995)
      .fillRoundedRect(-191, -246, 382, 500, 27)
      .lineStyle(2, 0xa8c8d0, 0.9)
      .strokeRoundedRect(-191, -246, 382, 500, 27)
      .lineStyle(1, 0xffffff, 0.96)
      .strokeRoundedRect(-184, -239, 368, 486, 22)
      .fillGradientStyle(0xff5573, 0xffb92e, 0x18cfc1, 0x6e79ff, 1)
      .fillRoundedRect(-62, -233, 124, 5, 3);
    const title = this.add
      .text(0, -210, won ? 'YOU WON THE POUR!' : 'NOT YET — TRY AGAIN', {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#28243c',
      })
      .setOrigin(0.5);
    const scoreText = this.add
      .text(0, -164, `${score}%`, {
        fontFamily: 'Avenir Next, Avenir, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: won ? '#0a9f96' : '#d13f5e',
      })
      .setOrigin(0.5);
    const harmony = this.add
      .text(
        0,
        -130,
        `SAND MATCHED  ·  TARGET ${WIN_SCORE}%  ·  BEST COMBO ${this.bestCombo}`,
        {
          fontFamily: 'Avenir Next, Avenir, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#706d82',
          letterSpacing: 0.55,
        }
      )
      .setOrigin(0.5);

    const yourLabel = this.add.text(
      -144,
      -101,
      animateDrawing
        ? 'YOUR SAND IS DRAWING THE SONG…'
        : 'YOUR 4-NOTE KOTO SONG',
      {
        fontFamily: 'Avenir Next, Avenir, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#343047',
        letterSpacing: 0.7,
      }
    );
    const yourBeatLayer = this.add.graphics();
    this.addBeatCells(
      yourBeatLayer,
      -140,
      -69,
      this.currentPattern,
      1,
      40,
      7,
      animateDrawing ? 0 : 1
    );
    const yourPlay = this.createOverlayButton(
      132,
      -100,
      62,
      25,
      'PLAY 14s',
      () => {
        this.playPattern(this.currentPattern, 287, 70, 40);
      }
    );

    const communityLabel = this.add.text(
      -144,
      -31,
      'TODAY’S REDDIT CONSTELLATION',
      {
        fontFamily: 'Avenir Next, Avenir, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#716e81',
        letterSpacing: 0.8,
      }
    );
    const communityBeatLayer = this.add.graphics().setName('result-community');
    this.addBeatCells(
      communityBeatLayer,
      -140,
      1,
      this.state.chorus,
      0.98,
      40,
      7
    );
    const communityPlay = this.createOverlayButton(
      132,
      -30,
      62,
      25,
      'PLAY 14s',
      () => {
        this.playPattern(this.state.chorus, 357, 70, 40, true);
      }
    );

    const contributionStatus = this.add
      .text(
        0,
        37,
        this.state.loggedIn
          ? this.state.submitted
            ? 'TODAY’S VOTE IS IN · BEAT YOUR BEST'
            : 'ADD YOUR MELODY AND CHANGE TODAY’S SONG'
          : 'SIGN IN ON REDDIT TO SHAPE TODAY’S SONG',
        {
          fontFamily: 'Avenir Next, Avenir, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#c87908',
          align: 'center',
          letterSpacing: 0.45,
        }
      )
      .setOrigin(0.5)
      .setName('result-status');

    const submitLabel = this.state.loggedIn
      ? this.state.submitted
        ? 'SAVE MY BEST HARMONY'
        : 'ADD MY 8 BEATS TO TODAY’S SONG'
      : 'SIGN IN ON REDDIT';
    const submitButton = this.createOverlayButton(
      0,
      78,
      this.state.loggedIn ? 292 : 190,
      this.state.loggedIn ? 50 : 38,
      submitLabel,
      () => {
        if (this.state.loggedIn) void this.submitScore(score, submitButton);
      }
    );
    if (!this.state.loggedIn) submitButton.setAlpha(0.55);

    const retryButton = this.createOverlayButton(
      0,
      139,
      190,
      42,
      won ? 'PLAY AGAIN' : 'MOVE BRIDGES & RETRY',
      () => {
        this.resetForRetry();
      }
    );
    const milestone = this.add
      .text(0, 181, this.formatMilestone(), {
        fontFamily: 'Avenir Next, Avenir, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#0b9f96',
        align: 'center',
        letterSpacing: 0.55,
      })
      .setOrigin(0.5)
      .setName('result-milestone');
    const leaderboard = this.add
      .text(0, 222, this.formatLeaderboard(this.state.leaderboard), {
        fontFamily: 'Avenir Next, Avenir, sans-serif',
        fontSize: '9px',
        color: '#706d82',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5);
    leaderboard.setName('leaderboard');

    this.overlay = this.add
      .container(WIDTH / 2, 356, [
        scrim,
        title,
        scoreText,
        harmony,
        yourLabel,
        yourBeatLayer,
        yourPlay,
        communityLabel,
        communityBeatLayer,
        communityPlay,
        contributionStatus,
        submitButton,
        retryButton,
        milestone,
        leaderboard,
      ])
      .setDepth(100);
    if (new URLSearchParams(window.location.search).has('preview-result')) {
      this.overlay.setScale(1).setAlpha(1);
    } else {
      this.overlay.setScale(0.92).setAlpha(0);
      this.tweens.add({
        targets: this.overlay,
        scale: 1,
        alpha: 1,
        duration: 240,
        ease: 'Back.Out',
      });
    }

    if (animateDrawing) {
      let lastRevealedNote = -1;
      this.tweens.addCounter({
        from: 0,
        to: 1,
        delay: 280,
        duration: 4_200,
        ease: 'Sine.InOut',
        onUpdate: (tween) => {
          const progress = tween.getValue() ?? 0;
          yourBeatLayer.clear();
          this.addBeatCells(
            yourBeatLayer,
            -140,
            -69,
            this.currentPattern,
            1,
            40,
            7,
            progress
          );

          const revealedNote = Math.min(
            BEAT_COUNT - 1,
            Math.floor(progress * BEAT_COUNT)
          );
          if (revealedNote <= lastRevealedNote) return;
          for (
            let note = lastRevealedNote + 1;
            note <= revealedNote;
            note += 1
          ) {
            const color = this.currentPattern[note] ?? 0;
            const point = this.getMelodyPoint(70, 287, 40, color, note);
            this.playTone(color, 0.22, 0.035, 1);
            this.pulsePlaybackBeat(point.x, point.y, color);
          }
          lastRevealedNote = revealedNote;
        },
        onComplete: () => {
          yourLabel.setText('YOUR 4-NOTE KOTO SONG');
          this.melodyLabelText.setText(
            won
              ? 'YOU WON · YOUR KOTO SONG IS COMPLETE'
              : `YOU NEED ${WIN_SCORE}% TO WIN · MOVE THE BRIDGES AND RETRY`
          );
          this.drawBeatStrip(this.currentPattern, 1);
          this.time.delayedCall(420, () =>
            this.playPattern(this.currentPattern, 287, 70, 40)
          );
        },
      });
    }
  }

  private createOverlayButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onPress: () => void
  ): Phaser.GameObjects.Container {
    const primary = width > 220;
    const shadow = this.add.graphics();
    shadow
      .fillStyle(primary ? 0x8f4f68 : 0x68778a, primary ? 0.2 : 0.13)
      .fillRoundedRect(-width / 2, -height / 2 + 5, width, height, 14);
    const plate = this.add.graphics();
    const drawPlate = (hovered: boolean): void => {
      plate.clear();
      if (primary) {
        plate
          .fillStyle(hovered ? 0xff6685 : 0xff456b, 1)
          .fillRoundedRect(-width / 2, -height / 2, width, height, 14)
          .fillStyle(0xd92d56, 0.32)
          .fillRoundedRect(-width / 2 + 5, height / 2 - 9, width - 10, 4, 2)
          .lineStyle(1.5, 0xffffff, 0.9)
          .strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
      } else {
        plate
          .fillStyle(hovered ? 0xf1fbfc : 0xffffff, 1)
          .fillRoundedRect(-width / 2, -height / 2, width, height, 12)
          .lineStyle(1.5, 0x9abfc7, 0.95)
          .strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      }
    };
    drawPlate(false);
    plate.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    if (plate.input) plate.input.cursor = 'pointer';
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial Rounded MT Bold, Avenir Next, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: primary ? '#ffffff' : '#343047',
        letterSpacing: 0.45,
      })
      .setOrigin(0.5)
      .setName('label');
    const button = this.add.container(x, y, [shadow, plate, text]);
    plate.on('pointerdown', onPress);
    plate.on('pointerover', () => drawPlate(true));
    plate.on('pointerout', () => drawPlate(false));
    return button;
  }

  private resetForRetry(): void {
    this.overlay?.destroy(true);
    this.overlay = undefined;
    this.phase = 'planning';
    this.particles.forEach((particle) => particle.sprite.destroy());
    this.particles = [];
    this.glowGraphics.clear();
    this.particlesGraphics.clear();
    this.effectsGraphics.clear();
    this.fillGraphics.clear();
    this.pourButton.setVisible(true).setAlpha(1);
    this.pourButtonText.setText('START THE SAND POUR  ▶');
    this.hintText.setText(
      `DRAG BRIDGES  ·  MATCH COLOR → CUP  ·  WIN AT ${WIN_SCORE}%`
    );
    this.melodyLabelText.setText(
      'AFTER THE POUR · WATCH YOUR SAND DRAW A KOTO SONG'
    );
    this.harmonyText.setText('0%').setColor('#28243c');
    this.cupTotals = [0, 0, 0, 0];
    this.cupCorrect = [0, 0, 0, 0];
    this.cupSand = [[], [], [], []];
    this.cupFillDirty = false;
    this.cupPulse = [0, 0, 0, 0];
    this.impactBursts = [];
    this.musicPulses = [];
    this.currentPattern = [0, 1, 2, 3, 0, 1, 2, 3];
    this.beatGraphics.clear();
    this.updateTargetLabels();
    this.ramps.forEach((ramp) => {
      ramp.container.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(ramp.container);
    });
  }

  private async loadState(): Promise<void> {
    try {
      const response = await fetch('/api/init');
      if (!response.ok)
        throw new Error(`Init failed with status ${response.status}`);
      const state: InitResponse = await response.json();
      this.state = state;
      this.updateDailyMeta();
      if (this.phase === 'planning' && state.seed !== this.daySeed) {
        this.applyDaySeed(state.seed);
        this.drawBoard();
        this.updateTargetLabels();
      }
      this.drawCommunity();
    } catch (error) {
      console.warn('Playing in local guest mode', error);
      this.dayText.setText('TODAY’S KOTO · HIRAJŌSHI  ·  GUEST PREVIEW');
    }
  }

  private async submitScore(
    score: number,
    button: Phaser.GameObjects.Container
  ): Promise<void> {
    const label = button.getByName('label');
    if (!(label instanceof Phaser.GameObjects.Text)) return;
    if (this.submitting) return;
    this.submitting = true;
    label.setText('ADDING…');
    button.setAlpha(0.65);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score, pattern: this.currentPattern }),
      });
      const data: SubmitResponse | ErrorResponse = await response.json();
      if (!response.ok || 'status' in data) {
        const message =
          'status' in data ? data.message : 'Could not join the chorus.';
        throw new Error(message);
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
          ? 'YOUR 8 BEATS ARE IN TODAY’S SONG ✓'
          : 'BEST HARMONY SAVED ✓'
      );
      this.drawCommunity();
      const communityLayer = this.overlay?.getByName('result-community');
      if (communityLayer instanceof Phaser.GameObjects.Graphics) {
        communityLayer.clear();
        this.addBeatCells(communityLayer, -140, 1, data.chorus, 1, 40, 7);
      }
      const status = this.overlay?.getByName('result-status');
      if (status instanceof Phaser.GameObjects.Text) {
        const changed = data.changedBeats.map((beat) => beat + 1);
        status.setText(
          data.accepted
            ? changed.length > 0
              ? `YOU CHANGED BEAT${changed.length === 1 ? '' : 'S'} ${changed.join(' · ')} · HEAR THE NEW SONG`
              : 'YOUR VOTE IS NOW SHAPING WHAT PLAYS NEXT'
            : 'TODAY’S VOTE WAS ALREADY IN · YOUR BEST SCORE UPDATED'
        );
        status.setColor(data.accepted ? '#0a9f96' : '#c87908');
      }
      const milestone = this.overlay?.getByName('result-milestone');
      if (milestone instanceof Phaser.GameObjects.Text) {
        milestone.setText(this.formatMilestone());
      }
      const leaderboard = this.overlay?.getByName('leaderboard');
      if (leaderboard instanceof Phaser.GameObjects.Text) {
        leaderboard.setText(this.formatLeaderboard(data.leaderboard));
      }
      this.playPattern(this.currentPattern, 287, 70, 40);
      this.time.delayedCall(KOTO_PATTERN_PLAYBACK_MS, () =>
        this.playPattern(data.chorus, 357, 70, 40, true)
      );
      button.setAlpha(1);
    } catch (error) {
      label.setText(
        error instanceof Error ? error.message.toUpperCase() : 'TRY AGAIN'
      );
      this.time.delayedCall(1_400, () => {
        label.setText(
          this.state.submitted
            ? 'SAVE MY BEST HARMONY'
            : 'ADD MY 8 BEATS TO TODAY’S SONG'
        );
        button.setAlpha(1);
      });
    } finally {
      this.submitting = false;
    }
  }

  private formatLeaderboard(entries: LeaderboardEntry[]): string {
    if (entries.length === 0)
      return 'TODAY’S LEADERBOARD · YOUR SCORE CAN BE FIRST';
    const top = entries.slice(0, 3).map((entry, index) => {
      const name =
        entry.username.length > 13
          ? `${entry.username.slice(0, 12)}…`
          : entry.username;
      return `${index + 1}. ${name}  ${entry.score}%`;
    });
    return `TODAY’S TOP HARMONIES\n${top.join('     ')}`;
  }

  private formatMilestone(): string {
    const streak =
      this.state.streak > 0 ? `STREAK ${this.state.streak}  ·  ` : '';
    const joined =
      this.state.totalContributions > 0
        ? `${this.state.totalContributions} SONG${this.state.totalContributions === 1 ? '' : 'S'} JOINED  ·  `
        : '';
    return `${streak}${joined}${this.state.milestone.remaining} MORE VOICES UNLOCK ${this.state.milestone.reward}`;
  }

  private ensureAudio(): void {
    if (!this.soundEnabled) return;
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (!this.kotoSamplesLoading) {
      this.kotoSamplesLoading = this.loadKotoSamples(this.audioContext);
    }
  }

  private async loadKotoSamples(context: AudioContext): Promise<void> {
    try {
      const samples = await Promise.all(
        KOTO_SAMPLE_URLS.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              `Koto sample failed with status ${response.status}`
            );
          }
          return context.decodeAudioData(await response.arrayBuffer());
        })
      );
      this.kotoSamples = samples;
    } catch (error) {
      this.kotoSampleLoadFailed = true;
      console.warn(
        'Real koto samples unavailable; using physical model',
        error
      );
    }
  }

  private getKotoBuffer(context: AudioContext, frequency: number): AudioBuffer {
    const key = `${context.sampleRate}:${frequency.toFixed(2)}`;
    const cached = this.kotoBuffers.get(key);
    if (cached) return cached;

    const frameCount = Math.ceil(context.sampleRate * 0.76);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(context.sampleRate / frequency));
    const pickPosition = Math.max(2, Math.floor(period * 0.22));
    const random = mulberry32(Math.round(frequency * 1_000) ^ 0x6b6f746f);

    for (let index = 0; index < period && index < frameCount; index += 1) {
      const noise = random() * 2 - 1;
      const comb =
        index >= pickPosition ? (samples[index - pickPosition] ?? 0) * 0.58 : 0;
      samples[index] = (noise - comb) * 0.82;
    }

    const damping = Phaser.Math.Clamp(
      0.9972 - frequency / 180_000,
      0.992,
      0.997
    );
    for (let index = period; index < frameCount; index += 1) {
      const delayed = samples[index - period] ?? 0;
      const adjacent = samples[index - period + 1] ?? delayed;
      samples[index] = (delayed + adjacent) * 0.5 * damping;
    }

    let peak = 0;
    for (let index = 0; index < samples.length; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index] ?? 0));
    }
    const normalization = peak > 0 ? 0.92 / peak : 1;
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = (samples[index] ?? 0) * normalization;
    }

    this.kotoBuffers.set(key, buffer);
    return buffer;
  }

  private playTone(
    color: number,
    duration: number,
    volume: number,
    pitch = 1
  ): void {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    const context = this.audioContext;
    if (!context) return;
    if (context.state === 'suspended') void context.resume();

    const now = context.currentTime;
    const normalizedColor = color % COLOR_COUNT;
    const frequency = getColor(normalizedColor).note * pitch;
    const sampledKoto = this.kotoSamples[normalizedColor];
    if (!sampledKoto && this.kotoSamplesLoading && !this.kotoSampleLoadFailed) {
      return;
    }
    const tail = sampledKoto
      ? Phaser.Math.Clamp(duration * 5.2, 0.78, 1.45)
      : Phaser.Math.Clamp(duration * 3.4, 0.42, 0.72);
    const string = context.createBufferSource();
    string.buffer = sampledKoto ?? this.getKotoBuffer(context, frequency);
    string.playbackRate.setValueAtTime(
      sampledKoto ? pitch * 1.006 : 1.012,
      now
    );
    string.playbackRate.exponentialRampToValueAtTime(
      sampledKoto ? pitch : 1,
      now + 0.032
    );

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(74, now);
    highpass.Q.setValueAtTime(0.7, now);

    const tone = context.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.setValueAtTime(0.82, now);
    tone.frequency.setValueAtTime(
      Math.min(context.sampleRate * 0.42, Math.max(8_500, frequency * 24)),
      now
    );
    tone.frequency.exponentialRampToValueAtTime(
      Math.max(3_600, frequency * 8.4),
      now + tail
    );

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(
      Math.max(Math.min(volume * 2.2, 0.15), 0.0002),
      now + 0.0015
    );
    master.gain.exponentialRampToValueAtTime(
      Math.max(volume * 0.5, 0.0002),
      now + 0.052
    );
    master.gain.exponentialRampToValueAtTime(0.0001, now + tail);
    string.connect(highpass);
    highpass.connect(tone);
    tone.connect(master);
    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime((normalizedColor - 1.5) * 0.08, now);
    master.connect(panner);
    panner.connect(context.destination);

    const resonator = context.createBiquadFilter();
    const resonatorGain = context.createGain();
    resonator.type = 'bandpass';
    resonator.frequency.setValueAtTime(690 + normalizedColor * 64, now);
    resonator.Q.setValueAtTime(2.7, now);
    resonatorGain.gain.setValueAtTime(0.14, now);
    highpass.connect(resonator);
    resonator.connect(resonatorGain);
    resonatorGain.connect(master);

    const bridge = context.createBiquadFilter();
    const bridgeGain = context.createGain();
    bridge.type = 'bandpass';
    bridge.frequency.setValueAtTime(1_760 + normalizedColor * 105, now);
    bridge.Q.setValueAtTime(4.2, now);
    bridgeGain.gain.setValueAtTime(0.055, now);
    highpass.connect(bridge);
    bridge.connect(bridgeGain);
    bridgeGain.connect(master);

    string.start(now);
    string.stop(now + tail + 0.025);
  }

  private playPattern(
    pattern: ChorusPattern,
    y = 742,
    startX = 48,
    spacing = 40,
    communityLayers = false
  ): void {
    for (let round = 0; round < KOTO_ROUNDS; round += 1) {
      pattern.forEach((color, beat) => {
        const sequenceBeat = round * BEAT_COUNT + beat;
        this.time.delayedCall(sequenceBeat * KOTO_BEAT_MS, () => {
          const accent = beat % 4 === 0 ? 0.008 : 0;
          const mainPitch =
            (round === 1 && beat >= 4) || (round === 2 && beat % 2 === 1)
              ? 2
              : 1;
          this.playTone(color, 0.2, 0.04 + accent, mainPitch);
          if (round === 1 && beat % 4 === 0) {
            this.playTone(color, 0.16, 0.011, 2);
          }
          if (round === 2 && beat % 4 === 0) {
            this.playTone(color, 0.24, 0.013, 0.5);
          }
          if (round === 3 && (beat === 0 || beat === 4)) {
            this.playTone(color, 0.26, 0.016, 0.5);
          }
          if (round === 3 && beat === BEAT_COUNT - 1) {
            this.playTone(color, 0.3, 0.016, 2);
          }
          if (
            communityLayers &&
            this.state.playerCount >= 5 &&
            beat % 4 === 0
          ) {
            this.playTone(color, 0.22, 0.022, 0.5);
          }
          if (
            communityLayers &&
            this.state.playerCount >= 15 &&
            beat % 2 === 1
          ) {
            this.playTone((color + 1) % COLOR_COUNT, 0.16, 0.012, 2);
          }
          if (communityLayers && this.state.playerCount >= 30) {
            this.playTone((color + 2) % COLOR_COUNT, 0.2, 0.014, 0.75);
          }
          const point = this.getMelodyPoint(startX, y, spacing, color, beat);
          this.pulsePlaybackBeat(point.x, point.y, color);
        });
      });
    }
  }

  private pulsePlaybackBeat(x: number, y: number, color: number): void {
    const palette = getColor(color);
    const pulse = this.add.graphics().setPosition(x, y).setDepth(120);
    pulse
      .fillStyle(palette.hex, 0.18)
      .fillCircle(0, 0, 13)
      .lineStyle(1.4, palette.hex, 0.88)
      .strokeCircle(0, 0, 10)
      .lineStyle(0.8, 0xd7a65b, 0.72)
      .strokeCircle(0, 0, 15);

    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (ray / 8) * Math.PI * 2;
      const inner = 11 + (ray % 2) * 2;
      const outer = inner + 5;
      pulse
        .lineStyle(0.75, ray % 2 === 0 ? palette.hex : 0xd7a65b, 0.75)
        .lineBetween(
          Math.cos(angle) * inner,
          Math.sin(angle) * inner,
          Math.cos(angle) * outer,
          Math.sin(angle) * outer
        )
        .fillStyle(ray % 2 === 0 ? palette.hex : 0xffe3a7, 0.8)
        .fillCircle(
          Math.cos(angle) * (outer + 2),
          Math.sin(angle) * (outer + 2),
          0.8
        );
    }
    pulse.setScale(0.62);
    this.tweens.add({
      targets: pulse,
      scale: 1.62,
      alpha: 0,
      angle: 9,
      duration: 410,
      ease: 'Cubic.Out',
      onComplete: () => pulse.destroy(),
    });
  }
}
