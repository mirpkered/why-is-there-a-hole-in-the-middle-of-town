# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **5**.

- `player`: name, class, level, XP, HP/MP, base attributes, status effects, encounter-counted temporary effects, and turn count.
- `inventory`: item ID and quantity; stackable goods share capacity slots in groups of ten.
- `equipment`: equipped item IDs by the six equipment slots.
- `town`: currency and the most recent short dungeon-discovery reactions.
- `quests`: available IDs, active ID/progress pairs, and completed IDs.
- `dungeon`: current/deepest floor, coordinates, exploration, per-floor persisted maps and stair coordinates, run seed, NPCs, encounters, loose loot, event choices/history/flags, per-cell room tags, and discovered landmark coordinates.
- `combat`: current monster encounter snapshot or null. A snapshot stores monster ID, encounter floor/level, optional variant, max/current HP, defense, attacks and behavior, reward multipliers, and encounter coordinates.
- `settings`: durable player preferences, including inventory capacity and enemy threat display (`descriptive`, `numeric`, or `hidden`; default `descriptive`).
- `meta`: creation and last-save timestamps.

Version 1–4 saves migrate to version 5. A v4 active encounter is converted to the current floor’s baseline scaled snapshot with its health percentage preserved and no variant assigned. Existing version 3 characters retain their 7×7 legacy geometry and coordinates for floors already reached; later floors on those saves retain the same legacy layout. New characters receive three generated 11×11 maps, saved by floor and reused on return or reload. Migrations preserve player progress, inventory, equipment, quests, currency, and explored dungeon state. A saved event choice and active combat snapshot remain intact after reload. Unknown versions are rejected rather than silently overwritten.
