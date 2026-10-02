# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **2**.

- `player`: name, class, level, XP, HP/MP, base attributes, derived attack/defense, status effects, and turn count.
- `inventory`: item ID and owned quantity entries; stackable trade goods share capacity slots in groups of ten.
- `equipment`: currently equipped item IDs by the six equipment slots.
- `town`: carried currency.
- `quests`: available IDs, active ID/progress pairs, and completed IDs.
- `dungeon`: current/deepest floor, coordinates, facing, per-floor exploration, map definition, encounter/NPC records, loose loot, and find state.
- `combat`: current monster encounter or null.
- `settings`: durable player preferences, including inventory capacity.
- `meta`: creation and last-save timestamps.

Transient screen selection and modal visibility are not saved. Version 1 saves migrate centrally to version 2 without resetting the player, class, attributes, health, currency, inventory, quest progress, or explored/visited dungeon state. Legacy weapon and armor slots become Main Hand and Body equipment; an active rat fight is normalized into the current combat record. New floor, encounter, visitor, and loose-loot fields are initialized. Unknown save versions are rejected rather than silently overwritten.
