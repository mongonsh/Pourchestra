# Pourchestra: Moon Tide

Pourchestra: Moon Tide is a daily Japanese-fantasy physics adventure built for Reddit with Devvit Web and Phaser. Every player receives the same seeded four-room expedition. Players drag and rotate rendered bamboo bridges, then steer a river of colored mineral sand by tilting their phone or dragging across the board. A kimono-wearing Snoo guide carries a koto and offers a limited fan gust to rescue sand in danger.

The expedition travels through Moon Garden, Bamboo Rapids, Shadow Cave, and Shrine Guardian. Moon Garden is a forgiving practice room: all four sources begin above their matching cups, the bridges start as gentle vertical guides, and saving 35% clears the sand goal. Later rooms introduce shuffled sources and hazards. Every room uses the same readable rule: collect three glowing music notes and guide each sand color into one of four matching cups. Saved sand remains visibly piled inside its cup; a wrong direction spills onto the ground between the cups. A failed room costs one of three lives; reaching zero lives loses the run. Clearing a room offers a persistent relic such as more wind, rescued lost sand, or a lower target. Collisions record an eight-note ocean song that gains one layer per room. Clearing the guardian wins the run and reveals a fourteen-second ocean soundscape whose constellation is drawn from the player’s journey. The resulting pattern can then be added to Reddit’s daily community shrine.

## Player instructions

1. Open the interactive post and choose **Begin Daily Expedition**. A short typewriter tutorial explains the three rules, followed by an animated room reveal; the tutorial can be skipped immediately.
2. Drag the three bamboo bridges to redirect the colored streams.
3. Tap a bridge to rotate it.
4. Press **Enter Room**.
5. Mineral sand keeps pouring for the full 30–36 second room, with a visible countdown. Tilt a supported phone or drag across the board to continuously steer gravity until the room resolves.
6. Tap Snoo's fan to spend a limited rescue gust.
7. Collect all three glowing notes and guide enough sand into its matching color cup. Correct sand visibly fills the cup; wrong sand visibly spills onto the ground. A failed room consumes one life and can be retried immediately.
8. After each cleared room, preview the growing song and choose one of two persistent relics.
9. Clear all four rooms to win, hear the full fourteen-second ocean song, reveal the player-drawn constellation, and optionally join today’s Reddit community shrine.

Device orientation is optional. If a phone, browser, or Reddit webview blocks sensor access, drag steering provides the complete control scheme without changing the rules.

Sound can be disabled with the wave control in the upper-right corner. While sand is moving, a dry CC0 Foley recording of real sand and salt is modulated by the simulation’s live grain speed, moving density, collision force, and horizontal impact position. Peg, bridge, cup, and ground contacts also trigger quiet, rate-limited micro-slices of the same recording at the collision’s exact pan and force. Faster or denser motion becomes fuller; a quiet or stopped board becomes nearly silent. Slow ocean swells and soft sea-glass tones are reserved for room rewards and the finished composition. Permanent game objects are transparent 3D sprites authored by the project’s Blender render script in `tools/render_moon_koto_assets.py`. Individual sand bodies use a generated sixteen-frame transparent, color-authored macro-grain atlas rather than procedural star shapes or flat tinting.

## Community and retention loop

- A deterministic UTC daily seed gives everyone the same four-room expedition.
- The opening screen shows the evolving eight-note community song, its next unlock, and the daily reset before the player starts.
- Different exits, moving bridges, shadow wells, guardian gusts, limited lives, and relic choices create escalation and replay variation.
- The community shrine visibly aims for 100 daily explorers, with musical layers unlocking along the way.
- A daily leaderboard records each player’s best harmony score.
- Each user contributes only once to the daily chorus, preventing repeat-play spam; later runs can improve the leaderboard score.
- Daily contribution streaks and lifetime songs joined create a visible reason to return.
- Community milestones tell players how many more voices unlock the next musical layer.
- The earned finale identifies the exact musical pattern being contributed.
- The Community Chorus aggregates eight bounded color choices, avoiding free-text moderation risk.
- A scheduler creates one idempotent daily interactive post at 00:05 UTC.
- The game works in guest mode, but Reddit sign-in is required to contribute or enter the leaderboard.

## Data and privacy

Pourchestra stores the Reddit username, best daily score, eight-number color pattern, contribution streak, last contribution date, and total number of daily songs joined for signed-in players. It does not request email addresses, location, external accounts, or private Reddit data. Data is stored only in the installation-scoped Devvit Redis database. Daily user, leaderboard, chorus, participant-count, and post records expire automatically after 14 days; streak profiles expire after 180 days. The app performs no external HTTP requests.

Submitting a pattern is always a separate, clearly labeled action after gameplay. Pourchestra does not automatically post, comment, subscribe, or act as the user.

## Moderator operation

Installing the app creates today’s interactive post. Moderators can also select **Create a new post** from the subreddit menu; this returns the existing daily post if one was already created. The daily scheduler uses the same idempotent path, so installation, manual creation, and the scheduled task cannot intentionally create duplicate posts for the same UTC date.

## Development

Requirements:

- Node.js 22.2 or later
- A Reddit account connected to Reddit for Developers
- Devvit CLI authentication

Install and verify:

```bash
npm install
npm run type-check
npm run lint
npm run build
```

Run inside a Reddit playtest community:

```bash
npm run login
npm run dev
```

The Devvit CLI builds both entry points:

- `splash.html`: lightweight animated inline feed card
- `game.html`: expanded Phaser game

Server endpoints:

- `GET /api/init`: daily seed, current player state, streak, reset time, milestone, leaderboard, and aggregate chorus
- `POST /api/submit`: validates and stores a bounded score/pattern submission, then returns the before/after chorus and changed beats
- `/internal/menu/post-create`: moderator daily-post action
- `/internal/triggers/on-app-install`: initial daily post
- `/internal/scheduler/daily-pour`: recurring daily post

## Deployment

Before publishing, test the game on mobile and desktop with moderator, regular, signed-in, and logged-out sessions. Confirm that touch dragging does not interfere with the surrounding Reddit feed and that sound begins only after user interaction.

Upload a playtest-ready build:

```bash
npm run deploy
```

Publish for app review:

```bash
npm run launch
```

The `pourchestra` Devvit app name must be available to the authenticated developer. If it is already reserved, replace the `name` field in `devvit.json` with an available 3–16 character identifier and keep the public display name “Pourchestra.”

## Technology

- Devvit Web 0.13
- Phaser 4
- TypeScript and Vite
- Hono server routes
- Devvit Redis and Scheduler

The particle simulation, tilt/touch gravity field, wind field, room hazards, circular peg collisions, bridge collisions, daily expedition generation, relic progression, live score, constellation drawing, and procedural ocean audio are implemented directly in the Phaser client. Blender is used only to render authored object sprites; gameplay remains responsive Phaser code.
