# Why Is There a Hole in the Middle of Town?

An original, mobile-first, turn-based dungeon crawler by Mirpworks. The town treats the Hole as a civic matter. The things below remain dangerous.

**Live game:** [mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town](https://mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town/)

## Play

Create or continue a character, take work from town, then descend through three playable floors of procedural rooms, combat, events, recurring merchants, and loot. Six equipment slots, four classes, class abilities, status effects, ten short quest chains, local achievements, and an evolving town market support repeat expeditions. Floors 4–7 are Old Foundations QA previews only and are not playable through normal descent. Defeat sends the delver back to town with gear and discoveries intact, at 1 HP, after a 10% gold loss.

The game is single-player and saves automatically in browser local storage. Saves do not sync between devices.

## Controls and accessibility

Use the on-screen directional pad on touch devices. Keyboard movement is W/Up, A/Left, S/Down, and D/Right. Handedness changes touch-control placement only. Settings include sprite style, threat display, music, text size, high-contrast map, reduced motion, and handedness.

## Develop and validate

Serve the repository with any local static HTTP server; opening `index.html` as a file does not support its ES modules. No build step or runtime dependency is needed.

Run the deployment preflight before publishing:

```sh
node tests/run.mjs
```

It validates content and runtime assets, art/audio inventory freshness, historical save migrations and backup recovery, floor generation, depth-gated quests/events, return routes, and bounded gameplay simulations. Floors 1–3 are playable; Floors 4–7 remain QA previews. Floor 4 now has an Old Foundations content tranche and a provisional deep return curve, but remains locked pending the playtests listed in [docs/FLOOR_4_7_READINESS.md](docs/FLOOR_4_7_READINESS.md). Run `node tools/floor4-release-sim.mjs` and `node tools/floor4-battle-sim.mjs` for the larger local readiness samples. Refresh generated inventories after registry edits with `node tools/art-report.mjs --write` and `node tools/audio-report.mjs --write`.

Append `?qa=1` to the live or local URL for development diagnostics and controls, including explicit Floor 1–7 previews. Floors above the playable cap are labeled QA-only and do not overwrite the playable save.

## Project shape

The site is static HTML, CSS, and native JavaScript modules hosted by GitHub Pages. `js/app.js` renders screens and handles delegated input; `js/ui/town.js` owns Town destination metadata/rendering; `js/screen-presentation.js` holds shared screen policies; `js/game.js` resolves actions; `js/state.js` owns save shape, migrations, and map generation; `js/data.js` holds gameplay content; `js/depth-config.js` owns the playable cap, QA preview limit, and depth bands. `scene-backgrounds.js` separates exploration and battle background registries, and `art-assets.js` resolves paired variants consistently. See [Architecture](docs/ARCHITECTURE.md), [Game State](docs/GAME_STATE.md), [Content Guide](docs/CONTENT_GUIDE.md), [Floor 4–7 Readiness](docs/FLOOR_4_7_READINESS.md), [Art Backlog](docs/ART_BACKLOG.md), [Audio Inventory](docs/AUDIO_INVENTORY.md), and [Roadmap](ROADMAP.md).

## Adding new content

Register metadata next to its content domain, add local runtime assets, and run `node tests/run.mjs`. Room and battle backgrounds use separate registries; adding a variant does not require editing screen markup. The content guide documents the asset recipes.

Hand-drawn player artwork and performances are retained in `assets/source/`; processed paired art and runtime audio live separately. User linework and recordings remain canonical. No server, account, remote dependency, or generated artwork is required to run the game.

The visual tone pairs a dark, lightly doodled municipal-office backdrop with a code-built title lockup: “WHY IS THERE A HOLE” above an attached “IN THE MIDDLE OF TOWN?” docket strip, with the Delvers’ Office imprint below. Its crooked typography and paper tag use the project’s own wood, ink, and parchment palette. The SVG doodles stay behind the content panels, while the user-drawn town signs, monsters, and room props remain the foreground art.
