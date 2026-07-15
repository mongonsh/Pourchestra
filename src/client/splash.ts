import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse } from '../shared/api';

const startButton = document.getElementById('start-button');
const communityCount = document.getElementById('community-count');
const resetLabel = document.getElementById('reset-label');

function formatReset(resetAt: string): string {
  const remaining = Math.max(0, Date.parse(resetAt) - Date.now());
  const totalMinutes = Math.max(1, Math.ceil(remaining / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `NEW SONG IN ${hours}H ${minutes}M`
    : `NEW SONG IN ${minutes}M`;
}

async function loadCommunityHook(): Promise<void> {
  try {
    const response = await fetch('/api/init');
    if (!response.ok) return;
    const state: InitResponse = await response.json();
    if (communityCount)
      communityCount.innerHTML = `${state.playerCount}/100 <small>VOICES</small>`;
    if (resetLabel) resetLabel.textContent = formatReset(state.resetAt);
  } catch {
    // The static local preview intentionally falls back to the zero-state copy.
  }
}

if (startButton instanceof HTMLButtonElement) {
  startButton.addEventListener('click', (event) => {
    requestExpandedMode(event, 'game');
  });
}

void loadCommunityHook();
