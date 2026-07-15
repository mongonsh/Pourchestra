import { redis, reddit } from '@devvit/web/server';

type DailyPostResult = {
  id: string;
  created: boolean;
};

function getDayId(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDayNumber(dayId: string): number {
  const epoch = Date.parse('2026-06-17T00:00:00.000Z');
  const current = Date.parse(`${dayId}T00:00:00.000Z`);
  return Math.max(1, Math.floor((current - epoch) / 86_400_000) + 1);
}

export async function getOrCreateDailyPost(): Promise<DailyPostResult> {
  const dayId = getDayId();
  const postKey = `pourchestra:${dayId}:post`;
  const existingId = await redis.get(postKey);
  if (existingId) return { id: existingId, created: false };

  const post = await reddit.submitCustomPost({
    title: `Pourchestra Daily #${getDayNumber(dayId)} — one pour, eight beats. Can you find harmony?`,
  });
  await redis.set(postKey, post.id);
  await redis.expire(postKey, 60 * 60 * 24 * 14);
  return { id: post.id, created: true };
}
