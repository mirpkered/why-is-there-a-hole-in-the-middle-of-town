# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **6**.

- `player`: name, class, level, XP, HP/MP, base attributes, status effects, encounter-counted temporary effects, and turn count.
- `inventory`: item ID and quantity; stackable goods share capacity slots in groups of ten.
- `equipment`: equipped item IDs by the six equipment slots.
- `town`: currency, short discovery reactions, and recurring NPC visit counts.
- `quests`: available IDs, active ID/progress pairs, and completed IDs. Chain steps use stable quest IDs and unlock their next step at turn-in.
- `career`: local counters for exploration, combat, spending/earnings, items, and unusual discoveries.
- `achievements`: earned achievement IDs and unlock timestamps.
- `dungeon`: current/deepest floor, coordinates, exploration, per-floor persisted maps and stair coordinates, run seed, NPCs, encounters, loose loot, event choices/history/flags, per-cell room tags, and discovered landmark coordinates.
- `combat`: current monster encounter snapshot or null. A snapshot stores monster ID, encounter floor/level, optional variant, max/current HP, defense, attacks and behavior, reward multipliers, and encounter coordinates.
- `settings`: durable preferences for sprite style, enemy threat display, music, text size, high contrast automap, and reduced motion.
- `meta`: creation and last-save timestamps.

Version 1–5 saves migrate to version 6. A v4 active encounter is converted to a floor-appropriate snapshot while preserving its health percentage and using no variant. Version 5 characters gain empty career/achievement records, empty NPC visit history, and default accessibility preferences. Existing version 3 characters retain their 7×7 legacy geometry and coordinates for floors already reached; later floors on those saves retain that legacy layout. New characters receive three generated 11×11 maps, saved by floor and reused on return or reload. Migration preserves player progress, inventory, equipment, quests, currency, and explored dungeon state. A saved event choice and active combat snapshot remain intact after reload. Unknown versions are rejected rather than silently overwritten.

Enemy abilities are definitions keyed by class and unlock level in `js/progression.js`; they use the existing MP value and do not need per-save cooldown state. The combat save snapshot retains enemy values; level and experience remain on the player. Defeat records store the lost gold, floor, and retained equipped gear until the recovery notice is acknowledged. Career records and achievements are local to this save and have no server counterpart.
