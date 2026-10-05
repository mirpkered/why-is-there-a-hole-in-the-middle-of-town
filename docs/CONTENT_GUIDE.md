# Content and asset guide

Keep stable content IDs in definitions and keep runtime state on the player/dungeon/encounter instance. Current definitions are primarily in `js/data.js`; class abilities and achievements are in `js/progression.js`; room prop metadata is in `js/room-visuals.js`; town art and service music have dedicated registries. Action rules belong in `js/game.js`, presentation in `js/app.js` and CSS.

## Monsters and attacks

Each monster has a stable `id`, name, minimum depth, base tier/stats, family `tags`, AI profile, loot-table ID, attack list, and fallback or paired sprite metadata. `monsterForId()` provides the stable lookup. Attack rows include a stable ID, damage range, base weight, accuracy, tags, and optional unlock/effect/flavor metadata. Keep at least one attack eligible at the lowest level. `unlockLevel` controls availability; level weight fields change selection chance only and do not silently multiply damage.

Available AI profiles are `aggressive`, `cautious`, `evasive`, `opportunistic`, `erratic`, and `simple`. The enemy scaler copies the eligible attacks and behavior into a saveable combat snapshot. Do not mutate the canonical monster or attack definitions during combat. The encounter director uses soft recent-history penalties; content should stay possible to repeat.

## Items and equipment

Items use stable IDs, categories, rarity, buy/sell values, quantity rules, optional equipment slot/class restrictions, modifiers/effects, and flavor. Canonical equipment slots are `head`, `body`, `mainHand`, `offHand`, `feet`, and `accessory`. Add effects only when a shared rules path applies them; currently reusable hooks include tag damage, hazard reduction, status resistance, retreat/loot/merchant adjustments, and combat-item target tags. Counter-items are helpful but must not become required to win.

Trade goods and junk may receive persisted market demand. Keep their base `sellValue` authoritative; the cycle supplies a bounded multiplier. Quest turn-in quantities are protected from selling and barter. Provenance is informational and does not normally change market value.

## Quests, events, and NPCs

Quests are authored in `quests` with stable IDs, giver, objective type/target/count, reward, optional chain/step, turn-in items, and `next`. A follow-up becomes available only after its predecessor is turned in. Use existing objective mechanisms such as kills, loot/discoveries, return, depth, flags, and completed trades. The validator checks references and `validateQuestGraph()` checks duplicate/missing steps and cycles. New objectives must be achievable within the current three playable floors.

Dungeon events are data rows with room/depth compatibility, weight, repeat/cooldown policy, choices, requirements, and supported outcome objects. The resolver validates items, quests, monsters, rooms, and outcome types. Inn events are separate weighted data rows; current effects are flavor, item/gold rewards, temporary encounter effects, or combat-XP bonuses. Full-rest attempts do not trigger an event.

Town and dungeon NPC identity/dialogue currently lives in `js/app.js`; dungeon merchant stock/trades live in `data.js`. Keep lines short for phone screens and guard optional saved progress with defaults. Current town NPC dialogue may use player health, milestones, market demand, visit counts, depth, and Inn effects. Dungeon NPC memory and trade history belong in the saved state.

## Dungeon depth and room visuals

The playable cap is Floor 3. `floorEncounterTable` and event rows are authoritative for current availability; `depthBands` documents future direction only. The generator stores per-floor geometry and uses its own seeded random stream. Room type is saved on a cell. `createRoomDecoration()` derives a stable decoration seed from geometry, floor/cell, room ID, and optional QA variation; decoration randomness does not consume combat/game RNG.

Each `roomProps` entry declares stable ID, placeholder, compatible rooms, zones, layer, weight, count, scale, and optional paired assets. Add artwork without changing selection rules. `roomPropMarkup()` chooses Original Ink or Colored through the existing Sprite Style setting. Exploration room backgrounds and battle backgrounds are separate presentation layers; future authored backgrounds can be registered by room ID with CSS fallback retained.

## Hand-drawn art

Preserve user source art under `assets/source/` and put processed runtime pairs under `assets/images/`. Use transparent PNGs with modest padding, keeping the original black linework intact. Colored variants use flat fill below the protected ink. Register stable local asset paths in monster metadata, `roomProps`, or `js/town-art.js`. Town destination buttons remain flexible CSS controls; illustrations do not define card dimensions. Sprite Style selects Ink or Colored for enemies, town art, and props where a pair exists.

Do not use raw scans/source photos in runtime markup. See [Art Backlog](ART_BACKLOG.md) for current coverage and missing drawings.

## Economy and Inn

`town-economy.js` uses the run seed and market cycle to choose four rotating store items and saved demand states. The current cycle advances once on successful return to town; visiting or switching Buy/Sell does not reroll it. Core tonic, basic weapon, and basic armor remain guaranteed. Ordinary trade-good/junk demand multipliers remain within 0.75–1.30. Final buyback value is capped below the applicable purchase price to prevent immediate resale profit.

Sal's legitimate paid partial rest costs 5g, restores HP/MP, and rolls a weighted event with 25% chance. A full-rest attempt charges nothing and rolls nothing. Well Rested adds 10% to XP from the next three victories that award combat XP; it does not affect quest or exploration XP. Same-key Inn effects refresh without unlimited stacking; compatible different effects coexist. Inn state is saved.

## Audio and location tracks

The user performance is canonical. Keep source/master recordings in `assets/audio/source/` and compact browser playback files under `assets/audio/music/`. Existing playback targets approximately -16 LUFS integrated and peaks no higher than -1 dBTP where track length allows; do not remix during asset registration. Dungeon/battle playback, one-shot service pools, volume gain, unlock behavior, and iOS ambient-session preference are managed by `audio.js` and `audio-session.js`.

Register service music in `js/location-music.js` under `inn`, `store`, `questBoard`, `statistics`, `achievements`, or `character`. Empty arrays are valid and intentional. Each track needs a unique ID, local `src`, matching `pool`, gain in 0–1, positive weight, and `loop: false`. Re-entry selects again and avoids the immediately previous track where alternatives exist; subviews share the same visit. A user can say “Here is another Inn track”; add a new stable entry without replacing earlier tracks.

The Inn currently has three one-shot clips from the supplied snoring performance (`inn-001` through `inn-003`), the Store has five one-shot intro clips (`store-001` through `store-005`), and Character has five one-shot screen-opening clips (`character-001` through `character-005`). Untouched M4A masters live under `assets/audio/source/{inn,store,character}/`; loudness-matched MP3 runtime clips are under `assets/audio/music/{inn,store,character}/`. Preserve the masters when adding future edits or alternate takes.

| User recording | Pool |
| --- | --- |
| Inn / hotel | `inn` |
| Shop / General Store | `store` |
| Quest Board | `questBoard` |
| Statistics | `statistics` |
| Achievements | `achievements` |
| Character / Gear / Pack / Inventory | `character` |

After a legitimate gesture, playback uses the shared audio manager. It requests `navigator.audioSession.type = 'ambient'` when supported, allowing iOS to apply Ring/Silent behavior. Unsupported browsers keep normal in-game volume controls but may not honor the physical switch. The OS retains final volume and device routing.

## Validation

Run `node tests/run.mjs`. It checks content references and local asset paths, historical save migrations/recovery, procedural floors, room props, quest graph, statuses, attack unlocks, market and Inn simulation, encounter/loot distributions, location audio behavior, and core game actions. Add tests for new reusable rules, not just one specific screen string. GitHub Pages runs the same preflight before upload.
