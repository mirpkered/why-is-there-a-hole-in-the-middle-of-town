# Persisted game state

The character save uses local-storage key `mirpworks-hole-town-save` and current `saveVersion` **8**. Each successful save first keeps the previous valid primary under a backup key. If the primary cannot parse or validate, its raw text is retained under a recovery key before the backup is attempted. Failed storage access returns safely instead of stopping gameplay.

## Top-level fields

- `player`: name, class, level/XP, current and maximum HP/MP, base attributes, turn count, statuses, and active temporary effects.
- `inventory`: item IDs and positive quantities, with acquisition provenance on notable non-stackable instances where present.
- `equipment`: item IDs keyed by `head`, `body`, `mainHand`, `offHand`, `feet`, and `accessory`.
- `town`: gold, NPC visit/milestone state, deterministic market cycle/seed/stock/demand, Inn effects, and completed trade history.
- `quests`: available IDs, active progress records, and completed IDs. Chain follow-ups unlock when their predecessor is turned in.
- `dungeon`: current/deepest floor, coordinates/facing, run seed, saved map geometry per reached floor, explored/visited cells, room tags, landmarks, NPCs, event state/history, loose loot, recent encounter history, and return-related state.
- `combat`: null or a spawn-time enemy snapshot containing current/max HP, encounter level, variant, defense, eligible/scaled attacks, behavior, reward multipliers, and relevant combat effects.
- `career`: local counters used by statistics and achievement triggers.
- `achievements`: unlocked IDs and timestamps.
- `settings`: character-copied visual/audio/accessibility preferences. Music/SFX, threat display, and accessibility choices (text size, contrast, motion, handedness) also use separate local-storage keys; sprite style remains in the character settings.
- `meta`: creation/update time and recovery annotations.

Open tabs, active service subtabs, selected gear slot, scroll position, map-expanded state, toasts, and other temporary interface state are not persisted.

## Migration history

Migrations run one version at a time in `state.js`. A version must be recognized and validate before the loaded state is accepted.

| Version | Change recorded by migration |
| --- | --- |
| 1 | Initial legacy save shape. |
| 2 | Normalize old equipment fields, player progression defaults, dungeon coordinates, town/quest/settings containers, and the old rat-combat representation. |
| 3 | Add town reactions and saved dungeon event, room, landmark, and event-history containers. |
| 4 | Preserve the fixed 7×7 map for reached floors and mark the save as legacy geometry. |
| 5 | Convert an active enemy into a scaled encounter snapshot while retaining its remaining-health ratio; normalize threat-display setting. |
| 6 | Add career records, achievement storage, NPC visit history, and accessibility defaults. |
| 7 | Add generalized status effects (including legacy burn conversion), encounter history/pacing, town flags, and the shop container. |
| 8 | Add market demand/seed/flavor and Inn effect state, preserving the current shop cycle. |

Version 8 is the current endpoint; new features should add a new sequential migration only when they add durable character data. The touch handedness and accessibility preferences currently default through their independent global settings store rather than a character-save migration.

## Geometry and combat persistence

New characters store deterministic maps for the three currently playable floors. A generated floor is kept when revisited or loaded. Existing version 3-era 7×7 floor geometry remains intact for that character. The current playable cap is Floor 3; synthetic QA enemy levels do not unlock more floors.

An enemy is scaled once when combat begins. The saved snapshot prevents reloads from rerolling its level, variant, HP, attacks, or rewards. Status durations advance only at their explicit combat timing hook; a page reload does not count as a turn.

## Recovery and limits

Validation rejects unsupported save versions, invalid current-map geometry/coordinates, malformed inventory rows, and unknown/invalid active combat. Missing optional containers are repaired to safe defaults. A corrupt main save is copied aside and the backup is tried. Unknown versions are left unaccepted; the game offers a clean new-game path without silently replacing the recoverable raw text.

A representative synthetic long-play snapshot containing all item definitions, three explored floors, event history, quest progress, achievements, and an active fight serialized to about **25 KB** in the maintenance audit. A fresh state was about **3.5 KB**. These are fixtures, not a formal maximum; browser storage quota failures remain handled by the save API.

## Presentation registries

Content presentation registries are not part of the save. Room-background variants are selected from existing floor geometry, coordinates, and room ID with a deterministic visual seed; no asset path or variant choice is persisted. Town, prop, enemy, item, NPC, and interactive-object art metadata is also definition-only. This pass does not change save version 8 or require migration.
