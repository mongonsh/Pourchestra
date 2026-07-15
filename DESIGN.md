# Design System — Moon Koto

## Product Context

- **What this is:** A daily tactile physics adventure where players steer colored mineral sand through four distinct rooms, collect music notes, choose relics, and contribute the restored melody to a community shrine.
- **Who it is for:** Mobile Reddit players who want a satisfying one-minute game with mastery, surprise, and a reason to return tomorrow.
- **Space:** Casual physics puzzle, musical toy, daily community game.
- **Project type:** Mobile-first Phaser game inside a Reddit interactive post.
- **Memorable thing:** “I tilted a river of magical sand through a moonlit expedition and watched it draw my song.”

## Aesthetic Direction

- **Direction:** Moonlit lacquer toy theatre.
- **Decoration level:** Expressive, but the playable field remains readable.
- **Mood:** A premium Japanese-fantasy diorama made from lacquered wood, glazed ceramic, gold leaf, moonlight, and spirit fire. Delight comes from tactile materials and responsive motion, not busy interface chrome.
- **Object strategy:** Important game pieces are rendered 3D sprites. Code-drawn geometry is reserved for physics feedback, gauges, particles, and temporary effects.
- **Scenic strategy:** A colorful Japanese spring landscape surrounds the board with sakura, temple architecture, mountains, and water. The center remains dark and low-detail so sand routes stay readable.

## Typography

- **Display:** Georgia Bold / Palatino fallback for ceremonial titles and verse results.
- **Body:** Avenir Next / Trebuchet MS fallback for compact instructions.
- **UI labels:** Avenir Next Heavy with short uppercase phrases.
- **Numbers:** Avenir Next with tabular alignment where possible.
- **Scale:** 9, 11, 13, 16, 22, 32, 48 logical pixels.

## Color

- **Approach:** Deep restrained environment with four expressive gameplay colors.
- **Night:** `#10142F`.
- **Deep indigo:** `#1B2450`.
- **Moon ivory:** `#FFF0C5`.
- **Gold leaf:** `#E9B85D`.
- **Coral sand:** `#FF526F`.
- **Amber sand:** `#FFB52E`.
- **Jade sand:** `#25CFB5`.
- **Iris sand:** `#766BFF`.
- **Success:** `#53E2B5`.
- **Danger:** `#FF6C77`.
- **Text:** `#FFF8E8` on dark surfaces, `#1B1734` on moon-ivory surfaces.

## Spacing

- **Base unit:** 4 logical pixels.
- **Density:** Comfortable in planning states, compact while sand is moving.
- **Scale:** 4, 8, 12, 16, 24, 32, 48.

## Layout

- **Approach:** A fixed ceremonial frame around one large playable field.
- **Hierarchy:** status → room name and two-part goal → board → contextual action.
- **Border radius:** 6 for controls, 14 for cards, 24 only for ceremonial overlays.
- **Rule:** Never show community metadata inside the active playfield. Community and retention information belongs in intro and result states.

## Motion

- **Approach:** Expressive and causal.
- **Micro:** 80–140 ms for taps, counters, and cup reactions.
- **Gameplay:** particles react immediately to bridges, tilt/touch gravity, hazards, and fan gusts.
- **State change:** 300–550 ms for room clears, failures, and relic choices.
- **Finale:** a 4.2-second left-to-right constellation drawing synchronized with the restored ocean notes.
- **Rule:** Finished art must be earned and visibly constructed; never reveal the complete constellation before its drawing animation.

## Game Feel Rules

- Every player action creates movement, light, and sound within 100 ms.
- The player continuously steers gravity by tilting a supported phone or dragging on the board.
- The player can intervene during the pour with limited fan gusts.
- Every room requires all three music notes and a visible saved-sand target.
- Four separated color cups are the stable destination in every room. Correct sand visibly accumulates in cups and misses visibly pile on the ground.
- Four glass-and-brass dispensers face four matching etched collection tanks; the transparent vessel silhouette makes source, destination, and accumulated sand readable without bowl-like ambiguity.
- Collection glasses begin completely empty. Correct grains pack against the inner floor in staggered rows, rise toward the rim, remain clipped behind the glass wall, and never appear above the opening.
- Planning mode draws a live dotted route forecast and summarizes predicted cups and notes. Bridge dragging and rotation update it immediately, so success comes from forming a hypothesis, testing it, and committing to the pour.
- Sand streams continuously for each 30–36 second room and stops only when the room resolves. The action dock shows the remaining time.
- Individual physics bodies use irregular photographic grain silhouettes with mineral texture. Glow and star geometry are reserved for music-note feedback, not sand.
- Each dispenser emits staggered grain pairs so the falling stream reads continuously. Settled grains reduce to sand scale and overlap in wide staggered rows, creating a compact bed instead of isolated pebbles.
- The real granular Foley layer follows live movement speed, moving density, collision force, and stereo position.
- Bamboo dragging, release settling, and sand impacts use restrained physical wood Foley. A successful tap-to-rotate instead plucks a real koto sample whose note follows bridge identity and angle, making the click musical and unmistakable.
- First-time play uses a skippable typewriter instruction card followed by a short room-reveal animation before bridge planning.
- Room identity changes the journey to those cups: open garden, moving rapids, consuming shadow wells, then automatic guardian gusts.
- Failure consumes one lantern and offers a fast retry without replaying onboarding.
- Success offers a meaningful relic choice before the next room.
- The evolving daily Reddit melody appears on the opening screen as the primary hook. A player earns the right to add their own eight-note pattern only after clearing all four rooms.

## Decisions Log

| Date       | Decision                                                                                        | Rationale                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-15 | Replace the passive single-pour score with three verses, lantern lives, active wind, and charms | The original experience lacked agency, escalation, stakes, and replay value                                                                             |
| 2026-07-15 | Use rendered 3D sprites for permanent objects                                                   | The user explicitly rejected cheap procedural game pieces and asked for authored image or Blender assets                                                |
| 2026-07-15 | Keep the existing daily community melody backend                                                | It already supports the hackathon’s retention and contribution goals and can become the reward after a stronger game loop                               |
| 2026-07-15 | Rebuild the run as a four-room tilt-or-touch expedition                                         | A short sort-and-pour loop did not provide enough adventure, discovery, escalation, or player agency                                                    |
| 2026-07-15 | Require three notes plus a saved-sand goal in every room                                        | The two-part objective makes winning, losing, exploration, and mastery legible                                                                          |
| 2026-07-15 | Treat device orientation as an optional enhancement                                             | Reddit webviews can block sensors, so drag steering must remain a complete, equivalent control path                                                     |
| 2026-07-15 | Keep four matching cups visible in every room                                                   | A stable sorting rule makes success, mistakes, and level-to-level escalation understandable at a glance                                                 |
| 2026-07-15 | Preserve landed sand in cups and show misses as ground piles                                    | Persistent physical evidence makes the player’s steering result legible without relying only on score text                                              |
| 2026-07-15 | Replace procedural star clusters with a photographic sixteen-grain atlas                        | Each physics unit must read as tangible sand instead of a magical UI particle                                                                           |
| 2026-07-15 | Modulate real sand Foley and trigger restrained micro-slices from physical collisions           | Sound should communicate actual grain movement and impact position rather than playing as an unrelated background track                                 |
| 2026-07-15 | Add a typed three-rule tutorial and animated room reveal                                        | The core interaction becomes understandable before play while keeping the onboarding short and skippable                                                |
| 2026-07-15 | Make Moon Garden a 45% practice room with aligned sources and vertical guide bridges            | The first room should teach the controls through an early success while strong incorrect steering can still lose                                        |
| 2026-07-15 | Replace ceramic bowls with glass dispensers and etched collection tanks                         | The vessel roles become immediately legible, while clear glass lets accumulated sand remain the visual reward                                           |
| 2026-07-15 | Add a bridge-responsive dotted route forecast in planning mode                                  | Predicting, adjusting, and verifying four routes makes the first room a logic puzzle instead of blind trial-and-error                                   |
| 2026-07-15 | Make glass fill a bottom-up physical packing system                                             | Empty vessels and a constrained rising sand line communicate progress truthfully and prevent floating or overflowing fill                               |
| 2026-07-15 | Put the shared Reddit song on the opening screen                                                | Judges and first-time players must experience the unique community hook before committing to a four-room run                                            |
| 2026-07-15 | Give Moon Garden a forecast-verified 4/4, 3-note starting path and a 35% goal                   | The first room should deliver an early clear while teaching steering and sorting before harder planning                                                 |
| 2026-07-16 | Give bridge manipulation dedicated movement-driven bamboo Foley                                 | Dragging was silent and rotation reused a musical tone; tactile wood feedback must follow speed, angle, position, and impacts without muddying the song |
| 2026-07-16 | Pair falling grains and compact the collection-glass packing                                    | Sparse single grains and narrow rows looked like scattered pebbles; denser emission and overlapping bottom-up rows make the material read as sand       |
| 2026-07-16 | Make bridge rotation play a sampled koto pluck                                                  | A procedural wood knock sounded wrong on a tap; rotation should reward the player with an authentic musical response while dragging remains physical    |
| 2026-07-16 | Put ivory labels on a deep ocean surface for teal overlay actions                               | Brightening the jade accent produced only 1.38:1 text contrast; the darker surface keeps teal identity while its highlighted state remains above 4.5:1  |
| 2026-07-16 | Show four visibly half-filled collection glasses in the Reddit feed thumbnail                   | Colored sand inside the destination vessels makes the sorting objective readable before launch and avoids presenting the game as an empty static scene  |
| 2026-07-16 | Place the expedition over a colorful Japanese spring landscape                                  | Sakura, temple architecture, mountains, and water make the world inviting, while a dark low-detail center and translucent board preserve puzzle clarity |
