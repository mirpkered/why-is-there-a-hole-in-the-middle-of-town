# Architecture

## Screen and state flow

The title screen starts a new character or resumes the saved model. The town links to the board, store, inn, character sheet, and dungeon. Dungeon actions update game state, then render the screen from that state. No gameplay value is inferred from the DOM.

## Modules

- `app.js` owns screen templates, event delegation, keyboard controls, and QA-only actions.
- `game.js` owns character creation, quest progression, movement, combat, event resolution, items, and rewards.
- `state.js` defines the save key/version, starter state, map helpers, migrations, and serialization.
- `data.js` contains stable IDs and definitions for quests, monsters, items, NPCs, room types, and weighted dungeon events.

## Persistence

Meaningful actions call `persist()`, which writes one JSON snapshot to local storage. The save carries `saveVersion` and timestamps. Migration logic is centralized in `state.js`; unknown versions are safely declined rather than partially loaded.

## Dungeon

Coordinates are integer grid positions. Facing is north/east/south/west as 0–3. Forward, left, right, and backward movement each attempt one adjacent cell relative to current facing; successful movement updates facing to the travel direction. A wall bump leaves position and facing unchanged and does not advance turns or encounter timing. Successful steps increment timing exactly once. Newly visited cells receive a saved room tag and may roll a weighted event or monster encounter; revisiting an event cell does not reroll it. Event definitions and choices are data-driven, with a small outcome resolver in `game.js`. Event state, landmarks, temporary effects, and town reaction notes are saved.

On narrow screens, the dungeon uses a compact HUD with minimap, character status, first-person scene, movement pad, and context actions. Movement controls are replaced by combat actions during a fight; events continue to use their own choice screen. The QA state inspector includes the most recent movement direction, result, coordinates, and facing.

## Content model

Quests use stable IDs, source/giver, type, target, count, and reward. Active entries store progress. Items use stable IDs, categories, rarity, prices, quantity rules, equipment modifiers, and optional effects. Content definitions stay separate from player inventory instances. See `docs/CONTENT_GUIDE.md` for event and room conventions.
