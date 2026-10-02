# Why Is There a Hole in the Middle of Town?

An original, mobile-first, turn-based dungeon crawler by Mirpworks. The town treats the hole as a civic and economic matter. The things below remain dangerous.

**Status:** single-player mechanics pass. **Hosting:** static GitHub Pages project site.

## Run locally

Serve this folder with any static HTTP server and open its address in a browser. ES modules require HTTP; opening `index.html` directly as a file is not supported. No build step or third-party runtime dependency is needed.

## Current play loop

New Game → town → accept quests → explore three floors of combat and strange events → find gear and trade goods → trade, buy, or sell → decide whether to descend or retreat. Seventeen handcrafted events add choices, hazards, treasure, merchants, room identities, and landmarks alongside eight monsters. Named town residents provide services and react to a few discoveries. Saves are automatic in browser local storage.

## Architecture

- `index.html`: static entry point; all asset paths are relative for project-site hosting.
- `css/styles.css`: responsive dark stone and civic-paper presentation.
- `js/app.js`: screen rendering, accessible controls, keyboard input, and QA tools.
- `js/game.js`: combat, weighted event resolution, temporary effects, equipment, trade, loot, retreat, floors, and save-backed progression.
- `js/state.js`: authoritative state shape, map helpers, inventory limits, and versioned save migration.
- `js/data.js`: monster, gear, quest, NPC, trade, loot-table, room, and dungeon-event definitions.
- `assets/images/` and `assets/icons/`: source home-screen artwork and resized browser/mobile app icons; `site.webmanifest` defines the install experience.
- `docs/`: state, architecture, and content conventions.

The app has no server API, account, or cloud save. See [ROADMAP.md](ROADMAP.md). The named canonical roadmap was not included in the supplied project files; its absence is recorded there.

## Controls

Use the dungeon directional pad to move forward, left, right, or backward in one step; each successful step turns to face its travel direction. W/Up, A/Left, D/Right, and S/Down match those actions on a keyboard. A blocked move says “There's a wall there.” and does not consume a turn or advance encounters.

Append `?qa=1` to the URL to show isolated development controls. QA options do not appear in ordinary play.

## Deployment

The repository publishes the static site through GitHub Pages. All links and assets are relative; there is no client-side URL router. Live URL: https://mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town/.
