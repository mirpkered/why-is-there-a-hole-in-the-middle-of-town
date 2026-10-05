# Architecture

## Runtime and rendering

The project is static HTML, CSS, and native browser ES modules. GitHub Pages publishes a runtime-only package assembled from the repository after preflight; there is no bundler, server API, account, or cloud save. Paths remain relative for a project-site URL. The `game-build` meta value in `index.html` is displayed in the QA summary; deployment asset query strings are updated with the entry bundle.

`js/app.js` owns screen templates, event delegation, keyboard/touch input, screen-local state, and QA tools. It renders from the game state rather than storing gameplay values in DOM nodes. Re-rendering replaces the app contents while one delegated listener set remains attached to the app or document. `js/game.js` owns action resolution and mutation. Rules/data do not depend on screen layout.

## Modules

- `state.js`: fresh state, save integrity checks, sequential version migrations, backup/recovery, map generation, and bounds helpers.
- `data.js`: stable definitions for monsters, attacks, items, quests, NPCs, trades, events, rooms, encounter tables, and Inn events.
- `progression.js`: class abilities, achievements, and future depth-band metadata.
- `enemy-scaling.js`, `encounter-director.js`, and `status-effects.js`: spawn snapshots/threat estimates, weighted encounter and attack choices, and shared status timing/stacking.
- `room-visuals.js`: deterministic room-prop selection, compatibility, placement zones, layers, paired asset rendering, and placeholders.
- `town-art.js`: paired Ink/Colored destination-art registry. Town tiles and service layout stay CSS-driven.
- `town-economy.js`: deterministic market cycles, bounded buyback demand, and simulation helpers.
- `quest-templates.js` and `content-validation.js`: validation-only quest templates and reusable content/quest-graph checks. Live quests remain authored data.
- `audio.js`, `audio-session.js`, and `location-music.js`: one shared music manager, iOS ambient-session feature detection, and one-shot location pools.

## State and saves

Gameplay changes are made through `game.js`; `persist()` writes a versioned JSON snapshot. The save loader validates essential shape and coordinates, repairs safe omissions, preserves a broken primary in a recovery key, and attempts the last valid backup. Settings that are global presentation preferences (music, threat display, accessibility, and handedness) also use separate local-storage keys so they are available before a character is loaded. Screen tabs, scroll positions, open modals, and transient messages are held in app variables and are not saved.

The current save version is 8. See [GAME_STATE.md](GAME_STATE.md) for top-level state and the migration table. The player save includes an active combat snapshot, generated maps, room and event discoveries, quest and NPC progress, market state, temporary effects, career counters, and earned achievements.

## Dungeon and scenes

New runs create three deterministic 11×11 floors from per-floor seeds using a local generator stream. Geometry is persisted by floor. Floor 1–3 is the current play cap, not a restriction of the map data format. Version 3 legacy saves retain their old 7×7 maps. Movement checks dimensions as well as wall cells. Return routing uses saved stairs on each floor.

Room assignment and decoration derive from saved cell/room data. `room-visuals.js` selects compatible props from a stable room seed; that stream does not advance gameplay RNG. To add image-based rooms later, add an optional exploration background by room ID and an independent battle background mapping. Missing backgrounds should keep the current CSS atmosphere. Props remain separate layered objects, and battle scenes intentionally omit exploration props.

## Content and systems

Definitions are data; a combat instance receives scaled attacks, HP, defense, tags, variant, AI profile, and rewards once at spawn and saves that snapshot. Current monsters have open-ended level-based attack eligibility and weights. Content validation checks IDs/references/ranges and quest follow-up graph structure. Loot, market, encounter, and audio-selection random streams remain separate from floor geometry and room dressing.

Equipment rules use the canonical six slots in `state.js`; `game.js` performs compatibility, inventory, equip/unequip, and effect resolution. Town screens provide slot-driven gear selection without adding UI state to saves. Quest turn-in reserves required inventory amounts. The market is seeded by run and cycle, persists current demand/stock, and advances once on a successful expedition return.

## Audio

All music contexts use the same manager and output controls. Dungeon tracks sequence; the battle track loops consistently during combat; service tracks (when registered) play once per location entry and remain silent after ending. Service subviews share their parent context. Leaving stops the current track. Audio pools do not consume gameplay RNG.

The manager requests the `ambient` `navigator.audioSession` type when available so supported iOS browsers can apply Ring/Silent behavior. Unsupported browsers retain the Web Audio gain graph or HTML media-volume fallback; JavaScript does not inspect the physical switch. System volume/output routing remains with the operating system. See [Audio and content workflows](CONTENT_GUIDE.md#location-music-and-audio).

## QA and validation

Append `?qa=1` for local game diagnostics, content validation, save details, market/Inn controls, attack inspection, audio diagnostics, and map controls. The regular preflight is:

```sh
node tests/run.mjs
```

GitHub Pages runs it before publishing. Current coverage includes all save versions and recovery, 5,001 generated floors, all current room prop catalogs, 50,000 stat rolls per class, 50,000 generated names, 10,000 market cycles, 25,000 Inn rest attempts, and 25,000 encounter/loot samples at each representative depth. Browser/device checks are supplemental and are not simulated by the Node preflight.
