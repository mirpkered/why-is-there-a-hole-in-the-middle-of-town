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

Normal play is capped at Floor 3 by `CURRENT_PLAYABLE_MAX_FLOOR` in `js/depth-config.js`. `floorEncounterTable` and event depth fields control current content eligibility. The same config describes Old Foundations (Floors 4–7) and weights its rooms, current monster pool, and loot rarity for explicit QA previews; none of that opens normal descent. `?qa=1` has a Floor 1–7 preview selector. Floors 4+ are marked preview-only, and game persistence deliberately ignores preview state. See [Floor 4–7 readiness](FLOOR_4_7_READINESS.md) before adding deeper content. The generator stores per-floor geometry and uses its own seeded random stream. Room type is saved on a cell. `createRoomDecoration()` derives a stable decoration seed from geometry, floor/cell, room ID, and optional QA variation; decoration randomness does not consume combat/game RNG.

Each `roomProps` entry declares stable ID, placeholder, compatible rooms, zones, layer, weight, count, scale, CSS fallback, and optional paired assets. Add artwork without changing selection rules. `roomPropMarkup()` uses the shared art resolver for Original Ink/Colored. Exploration and battle backgrounds are separate registries in `scene-backgrounds.js`; register variants by room ID with `id`, local `path`, optional positive `weight`, focal positions, and overlay hint. Empty variants or a missing image retain the CSS scene. Background choice is stable for a given saved floor/cell/type and does not advance gameplay RNG.

## Hand-drawn art

Preserve user source art under `assets/source/` and put processed runtime pairs under `assets/images/`. Use transparent PNGs with modest padding, keeping the original black linework intact. Colored variants use flat fill below the protected ink. Register stable local asset paths in monster metadata, `roomProps`, or `js/town-art.js`. Town destination buttons remain flexible CSS controls; illustrations do not define card dimensions. Sprite Style selects Ink or Colored for enemies, town art, and props where a pair exists. Room props use `roomProps.rooms` and their room’s `visual.propPool`; paired artwork replaces the existing placeholder automatically.

Optional mascot art is registered by stable ID in `js/mascots.js`; it does not create a new gameplay screen or appear until a presentation uses it. DJ Penguin is the trivia-generator mascot and currently has a Colored asset. To process a white-paper mascot scan while preserving enclosed white details, run `node tools/process-mascot-cutout.mjs assets/source/mascots/<name>.jpg assets/images/mascots/<name>.png` (requires FFmpeg/ffprobe), then add its metadata to `MASCOT_ART` and run the preflight.

Do not use raw scans/source photos in runtime markup. See [Art Backlog](ART_BACKLOG.md) for generated coverage and missing drawings. Items may declare optional `art: { ink, colored, scale }`; NPCs may declare the same metadata. Event and landmark IDs use `interactive-art.js`. Missing optional art stays on the existing text/CSS treatment.

The shared UI backdrop uses a low-contrast local SVG doodle tile (`assets/images/ui/municipal-doodles.svg`) beneath the dark gradients and content panels. The shared `.topbar` is styled as a hand-made municipal signboard; keep its text and controls legible at narrow widths and leave the dungeon scene itself unobstructed.

## Economy and Inn

`town-economy.js` uses the run seed and market cycle to choose four rotating store items and saved demand states. The current cycle advances once on successful return to town; visiting or switching Buy/Sell does not reroll it. Core tonic, basic weapon, and basic armor remain guaranteed. Ordinary trade-good/junk demand multipliers remain within 0.75–1.30. Final buyback value is capped below the applicable purchase price to prevent immediate resale profit.

Sal's legitimate paid partial rest costs 5g, restores HP/MP, and rolls a weighted event with 25% chance. A full-rest attempt charges nothing and rolls nothing. Well Rested adds 10% to XP from the next three victories that award combat XP; it does not affect quest or exploration XP. Same-key Inn effects refresh without unlimited stacking; compatible different effects coexist. Inn state is saved.

## Audio and location tracks

The user performance is canonical. Keep source/master recordings in `assets/audio/source/` and compact browser playback files under `assets/audio/music/`. Existing playback targets approximately -16 LUFS integrated and peaks no higher than -1 dBTP where track length allows; do not remix during asset registration. Dungeon/battle playback, one-shot service pools, volume gain, unlock behavior, and iOS ambient-session preference are managed by `audio.js` and `audio-session.js`.

Register service music in `js/location-music.js` under `inn`, `store`, `questBoard`, `statistics`, `achievements`, `character`, or `settings`. Empty arrays are valid and intentional. Each track needs a unique ID, local `src`, matching `pool`, gain in 0–1, positive weight, and `loop: false`. Re-entry selects again and avoids the immediately previous track where alternatives exist; subviews share the same visit. Register source provenance in `js/audio-sources.js` when adding a source/master mapping. Refresh `docs/AUDIO_INVENTORY.md` with `node tools/audio-report.mjs --write`.

The Inn currently has three one-shot clips from the supplied snoring performance (`inn-001` through `inn-003`), the Store has five one-shot intro clips (`store-001` through `store-005`), Character has five one-shot screen-opening clips (`character-001` through `character-005`), Settings has four one-shot opening clips (`settings-001` through `settings-004`), and Statistics has six one-shot opening clips (`statistics-001` through `statistics-006`). Untouched M4A masters live under `assets/audio/source/{inn,store,character,settings,statistics}/`; loudness-matched MP3 runtime clips are under `assets/audio/music/{inn,store,character,settings,statistics}/`. Preserve the masters when adding future edits or alternate takes.

| User recording | Pool |
| --- | --- |
| Inn / hotel | `inn` |
| Shop / General Store | `store` |
| Quest Board | `questBoard` |
| Statistics | `statistics` |
| Achievements | `achievements` |
| Character / Gear / Pack / Inventory | `character` |
| Settings | `settings` |

After a legitimate gesture, playback uses the shared audio manager. It requests `navigator.audioSession.type = 'ambient'` when supported, allowing iOS to apply Ring/Silent behavior. Unsupported browsers keep normal in-game volume controls but may not honor the physical switch. The OS retains final volume and device routing.

## Validation

Run `node tests/run.mjs`. It checks content references and local asset paths, historical save migrations/recovery, procedural floors, room props, quest graph, statuses, attack unlocks, market and Inn simulation, encounter/loot distributions, location audio behavior, and core game actions. Add tests for new reusable rules, not just one specific screen string. GitHub Pages runs the same preflight before upload.

## Adding new content

- **Enemy art:** keep the source in `assets/source/`, add processed Ink and Colored paths to that monster’s `sprite`, then validate.
- **Room prop:** preserve its source, register a stable ID in `roomProps`, set compatible room IDs/zones/layer/scale and fallback, then add its ID to the room’s prop pool.
- **NPC portrait:** add optional `art.ink` / `art.colored` metadata to the NPC definition. The portrait slot resolves automatically where the NPC screen renders.
- **Item art:** add optional art metadata to the item; inventory item pills retain their text if no art exists.
- **Room background:** add an image under `assets/images/rooms/` and a weighted variant in that room’s exploration entry. Use `focal`/`mobileFocal` when its crop needs guidance. No room-specific renderer or CSS rule is needed.
- **Battle background:** register it independently under `BATTLE_BACKGROUND_REGISTRY`, either for one room type or as a default. Exploration props are never part of the battle layer.
- **Location audio:** add a local processed clip and pool entry in `location-music.js`, then record its master mapping in `audio-sources.js`. No audio-manager branch is needed.

After registry changes, run `node tools/art-report.mjs --write` and/or `node tools/audio-report.mjs --write`, then run the canonical `node tests/run.mjs` preflight. Both reports are checked for staleness by preflight.
