# Why Is There a Hole in the Middle of Town?

An original, mobile-first, turn-based dungeon crawler by Mirpworks. The town treats the hole as a civic and economic matter. The things below remain dangerous.

**Status:** single-player mechanics pass. **Hosting:** static GitHub Pages project site.

## Run locally

Serve this folder with any static HTTP server and open its address in a browser. ES modules require HTTP; opening `index.html` directly as a file is not supported. No build step or third-party runtime dependency is needed.

## Current play loop

New Game → name and class → town → accept quests → enter the hole → fight across three floors → find gear and trade goods → trade, buy, or sell → decide whether to descend or retreat. Eight monsters populate the first three floors; named town residents provide quests, shopping, and rest. Dungeon visitors include a barter trader and a lost surveyor with emergency supplies. Saves are automatic in browser local storage.

## Architecture

- `index.html`: static entry point; all asset paths are relative for project-site hosting.
- `css/styles.css`: responsive dark stone and civic-paper presentation.
- `js/app.js`: screen rendering, accessible controls, keyboard input, and QA tools.
- `js/game.js`: combat, equipment, shops, trades, loot, retreat, floors, and save-backed progression.
- `js/state.js`: authoritative state shape, map helpers, inventory limits, and versioned save migration.
- `js/data.js`: monster, gear, quest, NPC, trade, and loot-table definitions.
- `assets/images/` and `assets/icons/`: source home-screen artwork and resized browser/mobile app icons; `site.webmanifest` defines the install experience.
- `docs/`: state, architecture, and content conventions.

The app has no server API, account, or cloud save. See [ROADMAP.md](ROADMAP.md). The named canonical roadmap was not included in the supplied project files; its absence is recorded there.

## Controls

On touch devices use the large dungeon buttons. On desktop, W/Up moves forward, S/Down moves backward, and A/Left or D/Right turns. Buttons remain available to keyboard and assistive technology users.

Append `?qa=1` to the URL to show isolated development controls. QA options do not appear in ordinary play.

## Deployment

The repository publishes the static site through GitHub Pages. All links and assets are relative; there is no client-side URL router. Live URL: https://mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town/.
