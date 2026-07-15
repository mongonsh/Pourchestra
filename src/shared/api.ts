export type ChorusPattern = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type CommunityMilestone = {
  target: number;
  remaining: number;
  reward: string;
};

export type InitResponse = {
  type: 'init';
  date: string;
  dayNumber: number;
  seed: number;
  username: string;
  loggedIn: boolean;
  bestScore: number;
  submitted: boolean;
  streak: number;
  totalContributions: number;
  playerCount: number;
  resetAt: string;
  milestone: CommunityMilestone;
  chorus: ChorusPattern;
  leaderboard: LeaderboardEntry[];
};

export type SubmitRequest = {
  score: number;
  pattern: number[];
};

export type SubmitResponse = {
  type: 'submit';
  accepted: boolean;
  bestScore: number;
  streak: number;
  totalContributions: number;
  playerCount: number;
  previousChorus: ChorusPattern;
  changedBeats: number[];
  milestone: CommunityMilestone;
  chorus: ChorusPattern;
  leaderboard: LeaderboardEntry[];
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
