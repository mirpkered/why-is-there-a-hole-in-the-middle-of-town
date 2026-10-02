# Architecture

## Screen and state flow

The title screen starts a new character or resumes the saved model. The town links to the board, store, inn, character sheet, and dungeon. Dungeon actions update game state, then render the screen from that state. No gameplay value is inferred from the DOM.

## Modules

- `app.js` owns screen templates, event delegation, keyboard controls, and QA-only actions.
- `game.js` owns character creation, quest progression, movement, encounters, items, and rewards.
- `state.js` defines the save key and version, starter state, map collision lookup, and serialization.
- `data.js` contains stable IDs and definitions for starter quests and items.

## Persistence

Meaningful actions call `persist()`, which writes one JSON snapshot to local storage. The save carries `saveVersion` and timestamps. Migration logic is centralized in `state.js`; unknown versions are safely declined rather than partially loaded.

## Dungeon

Coordinates are integer grid positions. Facing is north/east/south/west as 0–3. Movement checks wall cells before updating coordinates. Each visited location is recorded in the explored list and the floor-indexed visited map. The initial authored map is deterministic. Rendering is a placeholder layered corridor, separate from game rules.

## Content model

Quests use stable IDs, source/giver, type, target, count, and reward. Active entries store progress. Items use stable IDs, category, quantity, value, and optional slot/effect/quest-item fields. Content definitions stay separate from player inventory instances.
