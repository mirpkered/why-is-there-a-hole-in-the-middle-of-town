# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **3**.

- `player`: name, class, level, XP, HP/MP, base attributes, status effects, encounter-counted temporary effects, and turn count.
- `inventory`: item ID and quantity; stackable goods share capacity slots in groups of ten.
- `equipment`: equipped item IDs by the six equipment slots.
- `town`: currency and the most recent short dungeon-discovery reactions.
- `quests`: available IDs, active ID/progress pairs, and completed IDs.
- `dungeon`: current/deepest floor, coordinates, exploration, NPCs, encounters, loose loot, event choices/history/flags, per-cell room tags, and discovered landmark coordinates.
- `combat`: current monster encounter or null.
- `settings`: durable player preferences, including inventory capacity.
- `meta`: creation and last-save timestamps.

Version 1 saves migrate through version 2 to version 3. Version 2 saves migrate directly. Both migrations preserve player progress, inventory, equipment, quests, currency, and explored dungeon state, then initialize event, room, landmark, reaction, and temporary-effect fields. A saved event choice remains open after reload. Unknown versions are rejected rather than silently overwritten.
