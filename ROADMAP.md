# Roadmap

This file records current project direction only. It does not reconstruct missing historical plans.

## Currently playable

- Static GitHub Pages game with four classes and three playable procedural dungeon floors.
- Exploration, separated battle scenes, twelve monsters, level-based attack pools, status effects, loot, equipment, quests, merchants, market cycles, Inn events, achievements, and local saves.
- Compact town services, paired hand-drawn enemy/Town/prop art, player-performed dungeon and battle music, QA mode, and automated preflight.
- Separate, data-driven exploration/battle background registries with deterministic room variant selection and CSS fallback.
- Shared art resolution, screen presentation metadata, and generated art/audio inventories.

## Next

- Add user-drawn NPC, item, landmark, and room-prop art through the existing art registries.
- Add authored exploration and battle background variants independently as images become available.
- Add authored content to the existing quests, events, room, and monster systems while keeping mobile readability and deterministic QA.
- Continue device checks for iOS audio session behavior, safe-area layouts, and touch interactions as content changes.
- Floors 4–7 have a QA-only Old Foundations readiness configuration; normal play remains capped at Floor 3. See [Floor 4–7 Readiness](docs/FLOOR_4_7_READINESS.md) for release gates and current simulation results.

## Later

- Additional location-music recordings supplied by the user; some service pools remain intentionally empty.

## Intentionally deferred

- Public Floors 4–7 release until each floor has authored content and passes its staged release checks; backend/cloud saves, multiplayer, crafting, durability, pets, bosses, procedural live quests, and framework migration.
- Final town/NPC/item/landmark art not yet supplied by the user.
