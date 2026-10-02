# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **1**.

- `player`: name, class, level, XP, HP/MP, base attributes, derived attack/defense, and turn count.
- `inventory`: item ID and owned quantity entries.
- `equipment`: currently equipped item IDs by slot.
- `town`: carried currency.
- `quests`: available IDs, active ID/progress pairs, and completed IDs.
- `dungeon`: floor, coordinates, facing, explored coordinates, floor visit history, map definition, rat state, and find state.
- `combat`: current enemy encounter or null.
- `settings`: reserved for durable player preferences.
- `meta`: creation and last-save timestamps.

Transient screen selection and modal visibility are not saved. New save versions should be migrated centrally before the state is used. The current migration function accepts version 1 and safely rejects unrecognized versions.
