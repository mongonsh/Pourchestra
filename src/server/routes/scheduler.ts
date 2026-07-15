import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { getOrCreateDailyPost } from '../core/post';

export const schedulerRoutes = new Hono();

schedulerRoutes.post('/daily-pour', async (c) => {
  await c.req.json<TaskRequest>();

  try {
    const result = await getOrCreateDailyPost();
    return c.json<TaskResponse>(
      {
        status: 'ok',
        message: result.created
          ? `Created daily Pourchestra post ${result.id}`
          : `Daily Pourchestra post ${result.id} already exists`,
      },
      200
    );
  } catch (error) {
    console.error('Failed to create daily Pourchestra post', error);
    return c.json<TaskResponse>(
      {
        status: 'error',
        message: 'Failed to create the daily Pourchestra post',
      },
      500
    );
  }
});
