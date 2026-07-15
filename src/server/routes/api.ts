import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';
import type {
  ChorusPattern,
  CommunityMilestone,
  ErrorResponse,
  InitResponse,
  LeaderboardEntry,
  SubmitResponse,
} from '../../shared/api';

type StoredSubmission = {
  score: number;
  pattern: ChorusPattern;
};

type StoredProfile = {
  lastContributionDate: string;
  streak: number;
  totalContributions: number;
};

const RETENTION_SECONDS = 60 * 60 * 24 * 14;
const PROFILE_RETENTION_SECONDS = 60 * 60 * 24 * 180;
const CHORUS_LENGTH = 8;
const COLOR_COUNT = 4;

export const api = new Hono();

function getDayId(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextResetAt(dayId: string): string {
  const reset = new Date(`${dayId}T00:00:00.000Z`);
  reset.setUTCDate(reset.getUTCDate() + 1);
  return reset.toISOString();
}

function getPreviousDayId(dayId: string): string {
  const previous = new Date(`${dayId}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDayNumber(dayId: string): number {
  const epoch = Date.parse('2026-06-17T00:00:00.000Z');
  const current = Date.parse(`${dayId}T00:00:00.000Z`);
  return Math.max(1, Math.floor((current - epoch) / 86_400_000) + 1);
}

function getBaseKey(dayId: string): string {
  return `pourchestra:${dayId}`;
}

function getChorusKeys(baseKey: string): string[] {
  const keys: string[] = [];
  for (let beat = 0; beat < CHORUS_LENGTH; beat += 1) {
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      keys.push(`${baseKey}:chorus:${beat}:${color}`);
    }
  }
  return keys;
}

function isPattern(value: number[]): value is ChorusPattern {
  return (
    value.length === CHORUS_LENGTH &&
    value.every(
      (color) => Number.isInteger(color) && color >= 0 && color < COLOR_COUNT
    )
  );
}

function readStoredSubmission(
  raw: string | undefined
): StoredSubmission | undefined {
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'score' in parsed &&
      'pattern' in parsed &&
      typeof parsed.score === 'number' &&
      Array.isArray(parsed.pattern) &&
      isPattern(parsed.pattern)
    ) {
      return { score: parsed.score, pattern: parsed.pattern };
    }
  } catch (error) {
    console.error('Failed to parse stored submission', error);
  }

  return undefined;
}

function readStoredProfile(raw: string | undefined): StoredProfile | undefined {
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'lastContributionDate' in parsed &&
      'streak' in parsed &&
      'totalContributions' in parsed &&
      typeof parsed.lastContributionDate === 'string' &&
      typeof parsed.streak === 'number' &&
      Number.isInteger(parsed.streak) &&
      parsed.streak >= 0 &&
      typeof parsed.totalContributions === 'number' &&
      Number.isInteger(parsed.totalContributions) &&
      parsed.totalContributions >= 0
    ) {
      return {
        lastContributionDate: parsed.lastContributionDate,
        streak: parsed.streak,
        totalContributions: parsed.totalContributions,
      };
    }
  } catch (error) {
    console.error('Failed to parse stored profile', error);
  }

  return undefined;
}

function getVisibleProfile(
  profile: StoredProfile | undefined,
  dayId: string
): Pick<StoredProfile, 'streak' | 'totalContributions'> {
  if (!profile) return { streak: 0, totalContributions: 0 };
  const streakIsAlive =
    profile.lastContributionDate === dayId ||
    profile.lastContributionDate === getPreviousDayId(dayId);
  return {
    streak: streakIsAlive ? profile.streak : 0,
    totalContributions: profile.totalContributions,
  };
}

function getCommunityMilestone(playerCount: number): CommunityMilestone {
  const milestones = [
    { target: 5, reward: 'BASS LINE' },
    { target: 15, reward: 'HANDCLAPS' },
    { target: 30, reward: 'HARMONY' },
    { target: 60, reward: 'FINALE' },
    { target: 100, reward: 'ENCORE' },
  ];
  const next = milestones.find(
    (milestone) => playerCount < milestone.target
  ) ?? {
    target: Math.ceil((playerCount + 1) / 100) * 100,
    reward: 'ENCORE',
  };
  return {
    target: next.target,
    remaining: Math.max(0, next.target - playerCount),
    reward: next.reward,
  };
}

async function getCommunityState(baseKey: string): Promise<{
  playerCount: number;
  chorus: ChorusPattern;
  leaderboard: LeaderboardEntry[];
}> {
  const chorusKeys = getChorusKeys(baseKey);
  const [playerCountRaw, chorusValues, leaders] = await Promise.all([
    redis.get(`${baseKey}:players`),
    redis.mGet(chorusKeys),
    redis.zRange(`${baseKey}:leaderboard`, 0, 4, {
      by: 'rank',
      reverse: true,
    }),
  ]);

  const chorus = Array.from({ length: CHORUS_LENGTH }, (_, beat) => {
    let winningColor = beat % COLOR_COUNT;
    let winningCount = 0;
    for (let color = 0; color < COLOR_COUNT; color += 1) {
      const raw = chorusValues[beat * COLOR_COUNT + color];
      const count = raw ? Number.parseInt(raw, 10) : 0;
      if (count > winningCount) {
        winningColor = color;
        winningCount = count;
      }
    }
    return winningColor;
  });

  if (!isPattern(chorus)) {
    throw new Error('Generated chorus has an invalid shape');
  }

  return {
    playerCount: playerCountRaw ? Number.parseInt(playerCountRaw, 10) : 0,
    chorus,
    leaderboard: leaders.map((entry) => ({
      username: entry.member,
      score: entry.score,
    })),
  };
}

api.get('/init', async (c) => {
  try {
    const dayId = getDayId();
    const baseKey = getBaseKey(dayId);
    const username = await reddit.getCurrentUsername();
    const userKey = username ? `${baseKey}:user:${username}` : undefined;
    const profileKey = username ? `pourchestra:profile:${username}` : undefined;
    const [storedRaw, profileRaw, community] = await Promise.all([
      userKey ? redis.get(userKey) : Promise.resolve(undefined),
      profileKey ? redis.get(profileKey) : Promise.resolve(undefined),
      getCommunityState(baseKey),
    ]);
    const stored = readStoredSubmission(storedRaw);
    const profile = getVisibleProfile(readStoredProfile(profileRaw), dayId);

    return c.json<InitResponse>({
      type: 'init',
      date: dayId,
      dayNumber: getDayNumber(dayId),
      seed: hashString(dayId),
      username: username ?? 'guest',
      loggedIn: Boolean(username),
      bestScore: stored?.score ?? 0,
      submitted: Boolean(stored),
      streak: profile.streak,
      totalContributions: profile.totalContributions,
      playerCount: community.playerCount,
      resetAt: getNextResetAt(dayId),
      milestone: getCommunityMilestone(community.playerCount),
      chorus: community.chorus,
      leaderboard: community.leaderboard,
    });
  } catch (error) {
    console.error('Pourchestra init failed', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unable to load today’s chorus.' },
      500
    );
  }
});

api.post('/submit', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Sign in to add your pattern to the chorus.',
        },
        401
      );
    }

    let input: unknown;
    try {
      input = await c.req.json();
    } catch (error) {
      console.warn('Rejected malformed Pourchestra submission JSON', error);
      return c.json<ErrorResponse>(
        { status: 'error', message: 'That submission could not be read.' },
        400
      );
    }

    if (
      typeof input !== 'object' ||
      input === null ||
      !('score' in input) ||
      !('pattern' in input) ||
      typeof input.score !== 'number' ||
      !Array.isArray(input.pattern) ||
      !isPattern(input.pattern)
    ) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'That score pattern is invalid.' },
        400
      );
    }

    const score = Math.round(input.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'That score pattern is invalid.' },
        400
      );
    }

    const dayId = getDayId();
    const baseKey = getBaseKey(dayId);
    const userKey = `${baseKey}:user:${username}`;
    const profileKey = `pourchestra:profile:${username}`;
    const [previousRaw, profileRaw, previousCommunity] = await Promise.all([
      redis.get(userKey),
      redis.get(profileKey),
      getCommunityState(baseKey),
    ]);
    const previous = readStoredSubmission(previousRaw);
    const previousProfile = readStoredProfile(profileRaw);
    const accepted = !previous;
    const bestScore = Math.max(previous?.score ?? 0, score);
    let profile = getVisibleProfile(previousProfile, dayId);

    if (accepted) {
      const continuedStreak =
        previousProfile?.lastContributionDate === getPreviousDayId(dayId);
      const nextProfile: StoredProfile = {
        lastContributionDate: dayId,
        streak: continuedStreak ? previousProfile.streak + 1 : 1,
        totalContributions: (previousProfile?.totalContributions ?? 0) + 1,
      };
      profile = nextProfile;
      await Promise.all([
        redis.incrBy(`${baseKey}:players`, 1),
        ...input.pattern.map((color, beat) =>
          redis.incrBy(`${baseKey}:chorus:${beat}:${color}`, 1)
        ),
        redis.set(profileKey, JSON.stringify(nextProfile)),
        redis.expire(profileKey, PROFILE_RETENTION_SECONDS),
      ]);
    }

    if (!previous || score > previous.score) {
      const stored: StoredSubmission = {
        score,
        pattern: previous?.pattern ?? input.pattern,
      };
      await Promise.all([
        redis.set(userKey, JSON.stringify(stored)),
        redis.zAdd(`${baseKey}:leaderboard`, { member: username, score }),
      ]);
    }

    const keysToExpire = [
      `${baseKey}:players`,
      `${baseKey}:leaderboard`,
      userKey,
      ...getChorusKeys(baseKey),
    ];
    await Promise.all(
      keysToExpire.map((key) => redis.expire(key, RETENTION_SECONDS))
    );

    const community = await getCommunityState(baseKey);
    const changedBeats = community.chorus.reduce<number[]>(
      (beats, color, beat) => {
        if (color !== previousCommunity.chorus[beat]) beats.push(beat);
        return beats;
      },
      []
    );
    return c.json<SubmitResponse>({
      type: 'submit',
      accepted,
      bestScore,
      streak: profile.streak,
      totalContributions: profile.totalContributions,
      playerCount: community.playerCount,
      previousChorus: previousCommunity.chorus,
      changedBeats,
      milestone: getCommunityMilestone(community.playerCount),
      chorus: community.chorus,
      leaderboard: community.leaderboard,
    });
  } catch (error) {
    console.error('Pourchestra submission failed', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Your pattern could not be added. Try again.',
      },
      500
    );
  }
});
