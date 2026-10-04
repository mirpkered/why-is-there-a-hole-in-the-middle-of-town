# Persisted game state

The local storage key is `mirpworks-hole-town-save`. Current `saveVersion` is **8**. The immediately previous valid primary snapshot is stored at a separate backup key. A malformed or structurally invalid primary is copied to a recovery key before the backup is tried. The game does not silently erase that raw recovery copy.

- `player`: name, class, level, XP, HP/MP, base attributes, status effects, encounter-counted temporary effects, and turn count.
- `inventory`: item ID and quantity; stackable goods share capacity slots in groups of ten.
- `equipment`: equipped item IDs by the six equipment slots.
- `town`: currency, short discovery reactions, recurring NPC visit counts, event-driven milestone flags, deterministic current shop rotation, optional Inn effects, and `tradeHistory` for completed trade objectives.
- `quests`: available IDs, active ID/progress pairs, and completed IDs. Chain steps use stable quest IDs and unlock their next step at turn-in.
- `career`: local counters for exploration, combat, spending/earnings, items, and unusual discoveries.
- `achievements`: earned achievement IDs and unlock timestamps.
- `dungeon`: current/deepest floor, coordinates, exploration, per-floor persisted maps and stair coordinates, run seed, NPCs, encounters, recent encounter history and pacing counters, loose loot, event choices/history/flags, per-cell room tags, and discovered landmark coordinates.
- `combat`: current monster encounter snapshot or null. A snapshot stores monster ID, encounter floor/level, optional variant, max/current HP, defense, attacks and behavior, reward multipliers, and encounter coordinates.
- `settings`: durable preferences for sprite style, enemy threat display, music, text size, high contrast automap, and reduced motion.
- `meta`: creation and last-save timestamps.

Version 1–7 saves migrate sequentially to version 8. A v4 active encounter is converted to a floor-appropriate snapshot while preserving its health percentage and using no variant. Version 5 characters gain empty career/achievement records, empty NPC visit history, and default accessibility preferences. Version 7 added status-effect migration, encounter history/pacing, town flags, and shop rotation; version 8 adds market and Inn state. Existing version 3 characters retain their 7×7 legacy geometry and coordinates for floors already reached; later floors on those saves retain that legacy layout. New characters receive three generated 11×11 maps, saved by floor and reused on return or reload. Migration preserves player progress, inventory, equipment, quests, currency, and explored dungeon state. A saved event choice, status duration, and active combat snapshot remain intact after reload. Unknown versions are rejected rather than silently overwritten. `node tests/run.mjs` exercises each supported historical version and save recovery.

The save loader repairs absent optional containers and rejects an invalid current map, out-of-bounds player position, malformed inventory row, or active encounter with no known monster. If the primary fails validation, it attempts the backup and exposes recovery details only in QA; the normal Continue flow gives a short in-world notice.

Enemy abilities are definitions keyed by class and unlock level in `js/progression.js`; they use the existing MP value and do not need per-save cooldown state. The combat save snapshot retains enemy values; level and experience remain on the player. Defeat records store the lost gold, floor, and retained equipped gear until the recovery notice is acknowledged. Career records and achievements are local to this save and have no server counterpart.

Character creation rolls each starting attribute independently from the selected class's range. HP and MP are derived from class baselines and the rolled Vitality/Mind modifiers, then starting equipment is applied before current HP/MP are filled to their maxima. The chosen base attributes and final resources are saved in the existing player fields; the latest save version does not change for this feature.


### Town market and Inn additions

Save version 8 adds town.shop.cycle, marketSeed, rotating stock IDs, demand states/multipliers, and cycle flavor, plus town.innEffects for Well Rested XP charges, fractional XP carry, and temporary Inn effect keys. Version 7 and earlier characters migrate sequentially; current stock/demand are initialized deterministically and do not reroll on reload. A successful expedition return advances the market once. Inn rest benefits persist across reloads and decrement on their documented battle/encounter completion rules.
