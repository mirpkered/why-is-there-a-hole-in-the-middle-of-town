# Why Is There a Hole in the Middle of Town?

An original, mobile-first, turn-based dungeon crawler by Mirpworks. The town treats the hole as a civic and economic matter. The things below remain dangerous.

**Status:** single-player mechanics pass. **Hosting:** static GitHub Pages project site.

## Run locally

Serve this folder with any static HTTP server and open its address in a browser. ES modules require HTTP; opening `index.html` directly as a file is not supported. No build step or third-party runtime dependency is needed.

## Current play loop

New Game → town → accept jobs → explore three floors of combat and strange events → find and equip gear → meet recurring dungeon merchants → decide whether to descend or return. Four starting classes use distinct MP abilities, with new actions at levels 3 and 5. Five short quest chains link landmarks, objects, and recurring characters. Local career statistics and 15 achievements keep a record of each character’s odd decisions. Saves are automatic in browser local storage.

The town also provides a compact quest journal, statistics and achievement screens, shop/inn services, and presentation settings for Large text, high-contrast automapping, and reduced motion. Defeat triggers an Office rescue: the character keeps their gear and discoveries, returns at 1 HP, and loses 10% of carried gold.

## Architecture

- `index.html`: static entry point; all asset paths are relative for project-site hosting.
- `css/styles.css`: responsive dark stone and civic-paper presentation.
- `js/app.js`: screen rendering, accessible controls, keyboard input, and QA tools.
- `js/game.js`: combat, weighted event resolution, temporary effects, equipment, trade, loot, retreat, floors, and save-backed progression.
- `js/state.js`: authoritative state shape, map helpers, inventory limits, and versioned save migration.
- `js/data.js`: monster, gear, quest, NPC, trade, loot-table, room, and dungeon-event definitions.
- `js/progression.js`: class ability kits, local achievements, and future depth-band guidance.
- `assets/images/` and `assets/icons/`: source home-screen artwork and resized browser/mobile app icons; `site.webmanifest` defines the install experience.
- `docs/`: state, architecture, and content conventions.

The app has no server API, account, or cloud save. See [ROADMAP.md](ROADMAP.md). The named canonical roadmap was not included in the supplied project files; its absence is recorded there.

## Development preflight

Run `node tests/run.mjs` before publishing. It validates content and local asset references, checks save migrations and backup recovery, stress-generates 3,000 deterministic floors, samples encounter/loot selection across five depth bands, and exercises status, shop, save/load, and new-character flows. GitHub Pages runs the same bounded preflight before deployment.

## Controls

Use the dungeon directional pad to move north, east, south, or west one cell at a time; each successful step faces that direction. W/Up, D/Right, S/Down, and A/Left match the compass directions on a keyboard. A blocked move says “There's a wall there.” and does not consume a turn or advance encounters. During combat, open Abilities to see the current class kit. Inventory, Statistics, Achievements, and accessibility preferences are available from town.

Append `?qa=1` to the URL to show isolated development controls. QA options do not appear in ordinary play.

## Deployment

The repository publishes the static site through GitHub Pages. All links and assets are relative; there is no client-side URL router. Live URL: https://mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town/.


Town is a compact destination hub. Juniper's guaranteed essentials sit beside four seeded rotating items; selling eligible dungeon goods uses bounded, saved market demand. Sal's 5g full rest can rarely produce a modest temporary benefit, including Well Rested combat XP for three victories. These town systems are covered by the deployment preflight and save migration tests.

Town services now share a sticky compact resource/navigation bar. The store uses separate Buy and Sell modes, while character creation opens with a ready-to-start name, class, and stat roll; its name pools are in js/name-generator.js.
