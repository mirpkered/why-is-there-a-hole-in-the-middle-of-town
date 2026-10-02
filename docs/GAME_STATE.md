# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **4**.

- `player`: name, class, level, XP, HP/MP, base attributes, status effects, encounter-counted temporary effects, and turn count.
- `inventory`: item ID and quantity; stackable goods share capacity slots in groups of ten.
- `equipment`: equipped item IDs by the six equipment slots.
- `town`: currency and the most recent short dungeon-discovery reactions.
- `quests`: available IDs, active ID/progress pairs, and completed IDs.
- `dungeon`: current/deepest floor, coordinates, exploration, per-floor persisted maps and stair coordinates, run seed, NPCs, encounters, loose loot, event choices/history/flags, per-cell room tags, and discovered landmark coordinates.
- `combat`: current monster encounter or null.
- `settings`: durable player preferences, including inventory capacity.
- `meta`: creation and last-save timestamps.

Version 1 saves migrate through versions 2 and 3 to version 4. Version 2 and 3 saves also migrate to version 4. Existing version 3 characters retain their 7×7 legacy geometry and coordinates for floors already reached; later floors on those saves retain the same legacy layout. New characters receive three generated 11×11 maps, saved by floor and reused on return or reload. Migrations preserve player progress, inventory, equipment, quests, currency, and explored dungeon state. A saved event choice remains open after reload. Unknown versions are rejected rather than silently overwritten.
