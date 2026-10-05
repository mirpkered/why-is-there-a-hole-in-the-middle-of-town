# Roadmap

This file records current project direction only. It does not reconstruct missing historical plans.

## Currently playable

- Static GitHub Pages game with four classes and three playable procedural dungeon floors.
- Exploration, separated battle scenes, twelve monsters, level-based attack pools, status effects, loot, equipment, quests, merchants, market cycles, Inn events, achievements, and local saves.
- Compact town services, paired hand-drawn enemy/Town/prop art, player-performed dungeon and battle music, QA mode, and automated preflight.

## Next

- Add user-drawn NPC, item, landmark, and room-prop art through the existing art registries.
- Add authored content to the existing quests, events, room, and monster systems while keeping mobile readability and deterministic QA.
- Continue device checks for iOS audio session behavior, safe-area layouts, and touch interactions as content changes.
- Consider deeper floors only after persistent fixtures, encounter/economy progression, and multi-floor return routing are intentionally designed and tested.

## Later

- Optional authored room and battle background images, registered independently from room props and enemy sprites.
- Additional location-music recordings supplied by the user; the current service pools are intentionally empty.

## Intentionally deferred

- Floors beyond Floor 3, backend/cloud saves, multiplayer, crafting, durability, pets, bosses, procedural live quests, and framework migration.
- Final town/NPC/item/landmark art not yet supplied by the user.
