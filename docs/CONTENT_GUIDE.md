# Content guide

Keep content original, use stable IDs, and put authored definitions in `js/data.js`. Rule resolution belongs in `js/game.js`; screen rendering belongs in `js/app.js`.

## Monsters

Add a `monsters` entry with `id`, display name, `minDepth`, HP, attack, defense, speed, XP, gold range, rarity, loot-table ID, encounter text, and behavior. Supported behavior fields include `multiStrike`, `evadeChance`, `criticalChance`, `burnChance`, and `burnTurns`. Add the monster to `floorEncounterTable` at its intended depth. A shared question-mark fallback sprite is available until canonical hand-drawn art is supplied.

Attack definitions support `unlockLevel` (defaults to 1), `weightPerLevel`, `minDamage`, `maxDamage`, `accuracy`, optional `effect` / `effectChance` / duration and magnitude, tags, flavor, and `multiStrike`. `scaleEnemy()` filters locked moves once at spawn, snapshots the eligible list, and applies bounded depth damage/weight/effect adjustments. Keep at least one ordinary attack unlocked at all levels. Level bands are open-ended: typical special unlocks sit around levels 4–8, while level 12 and beyond continue using the same weight formula. Unlocking a move does not add an extra damage multiplier. Use `qaAttackPoolReport()` to inspect eligible/locked moves and sample AI-weighted selection.

Enemy progression is data-driven. Give each monster a `baseTier` and optional `depthEvolution` fields (`damagePerLevel`, `attackWeightPerLevel`, `maxWeightFactor`, `effectChancePerLevel`). An encounter's internal level is `baseTier + (floor - 1) + variant level bonus`; `minDepth` controls availability, not its baseline tier. HP gains 12% of base HP per level step for the first ten steps, then 6% per step. Damage adds a small integer increment from the monster's `damagePerLevel`; defense adds one every three steps. XP gains 16% per step through ten, then 8%; gold gains 10% through ten, then 5%. Rare/strange loot weighting gets a modest capped depth and variant bonus while using the monster's existing loot table. These soft caps keep future deep floors from growing without bound.

Current base tiers are: Deadly Rat and Pocket Slime 1; Kobold Toll-Taker, Killer Rabbit, Kung Fungoose, Porkscrew, and Rotten Apple 2; Fire-Breathing Earthworm, Skeleton on Break, and Heart-Attack 3; Permit-Office Mimic and Poo Gas 4. Porkscrew, Rotten Apple, and Heart-Attack start at depth 2; Poo Gas starts at depth 3. Encounter tables retain low weights for the new entries so they do not dominate. The three uncommon variants are `Large`, `Veteran`, and `Very Angry`, with a combined 6.5% spawn chance. Their level, HP, damage, defense, rewards, loot, and attack-weight adjustments live in `enemyVariants`. `scaleEnemy()` creates one persisted combat snapshot at spawn; combat, rewards, and reloads use that snapshot rather than re-rolling. Keep each monster's low-level role intact with its own tier and optional evolution rates. Enemy threat is a relative estimate: expected weighted attack damage (including hit chance, critical/status effects, enemy speed and multi-strikes) after player defense is compared with the turns each combatant needs to defeat the other, adjusted for current HP and a small level edge. It is a guide, not a guaranteed outcome. The score is `player turns to defeat enemy / enemy turns to defeat player`, adjusted for current-health fraction and a small level edge. Labels use score bands: below 0.32 Manageable, 0.32–0.72 Dangerous, 0.72–1.15 Severe, 1.15–1.8 Terrifying, and 1.8 or above Absolutely Not. Settings offer Descriptive (default), Numeric, or Hidden display; only QA shows full calculations.

### Hand-drawn enemy sprites

Use one creature per source image, with a strong dark outline, plain background, entire body visible, and modest space around the extremities. Exaggerated poses are welcome; avoid details too small to read on a phone. Portrait and landscape drawings both work.

Processing workflow: photograph or scan the drawing; crop it; remove the paper/background and camera artifacts; export a transparent black-ink PNG that preserves the original pen lines; derive a matching colored transparent PNG from that same source; add the pair to the monster's `sprite` metadata (`ink`, `colored`, optional `scale`, and optional `offsetY`); then check both modes at mobile combat size. The original ink is canonical: keep its linework as a protected top layer over flat color clipped to a silhouette mask. Do not rely on flood fills through imperfect open pen lines. The global Sprite Style setting selects the variant. Keep source/reference files separate from runtime sprites when retaining them.

The five shipped user drawings have paired ink/color files: `kung-fungoose-*`, `deadly-rat-*`, `fire-breathing-earthworm-*`, `killer-rabbit-*`, and `pocket-slime-*` in `assets/images/enemies/`. Preserve the Pocket Slime's established color treatment unless a visible mask defect is found.

Current custom runtime sprites use paired `*-ink.png` and `*-colored.png` files for Kung Fungoose, Deadly Rat, Fire-Breathing Earthworm, Killer Rabbit, and Pocket Slime. Their display scale and vertical offset are set per monster in `js/data.js`; all other monsters retain their SVG fallback sprites.

### Handmade audio

Treat user performances and recordings as the composition. Preserve their timing and character; do not replace them with MIDI or a newly composed track. Light cleanup, restrained EQ/compression, and layers made from the same recording are appropriate when they help it sit in the game. Keep runtime formats compact, prevent playback before a user gesture where browsers require one, and test loop points over consecutive plays. The first battle theme is `assets/audio/music/battle-theme.mp3`, arranged from the supplied vocal performance as a clean pass followed by an octave-down pass. Both passes are level-matched in the runtime file; its 24-bit lossless processed master is `assets/audio/source/battle-theme-master.flac`, and the game does not load the archive copy. The playback manager uses the saved music volume multiplied by a fixed track gain, resets that value before each start/resume, and switches between ordinary dungeon clips without crossfading. The theme is one looping audio element, so its pass level comes from the encoded arrangement rather than alternating playback sources.

The 18 later recordings are preserved unchanged in `assets/audio/source/dungeon-music/`. Their cleaned runtime copies are `assets/audio/music/dungeon/dungeon-04.mp3` through `dungeon-21.mp3`. They are short clips, so the dungeon music manager plays them in a shuffled bag, avoids an immediate repeat, and starts each next clip at its configured level after the previous clip ends; it loads only the current and next clip. The battle theme takes over during combat and the dungeon clip resumes afterward. The current source batch is reserved for dungeon exploration; events and dungeon visitors keep that pool, town remains quiet, and no separate event stingers are assigned. Runtime clips are mono MP3 at 96 kb/s, high-pass filtered at 55 Hz, normalized toward -17 LUFS with a -1 dBTP ceiling, and given short edge fades. Recording 18 had 2.28 seconds of measured leading silence trimmed; the remaining original timing is retained.

The reported alternating battle level came from the asset arrangement: its second 14.86-second pass was about 19 dB quieter than the first, while the player looped the same file unchanged. The runtime MP3 now applies a short gain ramp into that second pass and level-matches it to the first (approximately -19.9 and -20.0 dB mean respectively). The track remains at about -16.5 LUFS integrated with a -2.2 dBFS true peak. No separate pass files or runtime gain alternation are used.

For future recordings: keep the original in the source folder; inspect its duration, loudness, peak, and silence; trim only clear dead air; apply light cleanup and consistent loudness; decide whether it is a loop, layer, stinger, battle clip, or dungeon clip; export a compact MP3; register it in the audio library; then check its transitions and level on mobile. Do not assume handmade recordings need conventional instrumentation or polish.

## Equipment and items

Add an `items` entry with `id`, `name`, `category`, `rarity`, `buyValue`, `sellValue`, and optional `slot`, `modifiers`, `effects`, `classes`, `effect`, `questItem`, `stackable`, and `flavor`. Equipment uses Head, Body, Main Hand, Off Hand, Feet, and Accessory slots. Item effects currently support healing and short encounter-counted buffs.

## Loot

Add rows to `lootTables` with an item ID, weight, and optional quantity. Reference the table from a monster's `lootTable`. Rarity and depth adjust drop likelihood. Loot includes equipment, consumables, quest objects, trade goods, and junk.

## Quests

Define `id`, `title`, `description`, `giver`, `type`, `target`, `count`, and `reward`. Progress is stored on each save. Event discoveries can post quests with `unlockQuest`; accepting a loot quest recognizes an already-carried matching quest item.

## Events and choices

Add a `dungeonEvents` entry with `id`, `title`, `type`, `minDepth`/`maxDepth`, `weight`, `description`, `choices`, and `repeatable`; optional `rooms` increase its chance in matching room tags, `weirdness` increases its relative weight with depth, and `cooldown` spaces repeatable events. Each choice has an `id`, readable `label`, optional warning and prerequisites (`requiresGold`, `requiresItem`, `requiresFlag`, or `requiresQuest`), and an `outcomes` array. Available outcome primitives are `message`, `gold`, `item`, `removeItem`, `heal`, `damage`, `effect`, `flag`, `townReaction`, `unlockQuest`, `questProgress`, `discover`, `room`, `encounter`, `random`, and `skillCheck`. Keep consequences small and understandable; the engine in `game.js` resolves these primitives.

## Hazards and temporary effects

Express hazards through choices and outcomes so a meaningful risk has a warning, a stat check, or a safer alternative. Damage from standalone events cannot reduce the player below one HP. Temporary effects use `{type:'effect', name, value, encounters}` and currently support attack, defense, retreat chance, fire resistance, and loot chance. They replace the prior value and expire after the stated number of resolved monster encounters.

## Room tags and landmarks

`roomTypes` defines lightweight names, weights, and descriptions. Newly explored cells receive one saved room ID; an event's `rooms` list can favor matching cells. A `discover` outcome records a stable landmark ID, label, icon, floor, and coordinates. Keep landmarks readable on the small automap and avoid routing behavior.

## Merchants and NPCs

Add shop IDs to `shopStock`. Barter offers belong in `trades` with `requires` and `gives` arrays of `{item, quantity}` and a gold amount. Dungeon visitors live in `dungeonNpcs`; seeded placement uses `npcEncounterIds`. Town service dialogue belongs in `townNpcs`.

Monsters may define `tags` from shared creature/family categories and an `aiProfile` (`aggressive`, `cautious`, `evasive`, `opportunistic`, `erratic`, or `simple`). These are inputs to encounter targeting and lightweight attack weighting, not custom per-monster scripts. Attacks may carry tags such as `physical` or `fire`. Add status behavior through `status-effects.js`; current stack policy refreshes duration and keeps the stronger magnitude, with damage effects ticking only at the declared combat turn boundary. Poo Gas demonstrates `physicalResistance` (60%): physical attacks remain capable of dealing damage, while magical attacks bypass the resistance. Dungeon-Grade Air Freshener is a focused gas-tag combat tool that damages gas enemies and weakens their resistance for the next physical hit; it is not consumed against other monsters. Its `eventHooks` metadata reserves odor/gas event use for future content.

## Shops, quest templates, and validation

Juniper’s core essentials are guaranteed. Three additional items rotate on a successful expedition return; the selected IDs are saved and are generated from the run seed plus a saved rotation counter. Add merchant pricing/preference data to `merchantProfiles`; avoid putting required progression behind a random stock roll. Quest-objective templates are definitions only: validate every candidate against registered monsters/items/rooms/events/NPCs/trades and the currently playable depth before a future generator uses it. Current generated quests are intentionally disabled.

Notable non-stackable gear can keep a small `provenance` object on its inventory entry (`sourceType`, `sourceName`, `acquiredFloor`). Stackable goods stay aggregated and do not retain per-unit histories. New town milestones should be stable event-driven flags under `town.flags`.

Run `node tests/run.mjs` to validate content references and runtime assets. Add authored IDs before referencing them; fix critical validation failures before deployment. Current baseline reports zero errors and zero warnings. The Pages workflow runs this check before uploading the static site.

## Replay and state

Event resolution, one-time flags, cell visits, room tags, landmarks, and town reactions are persisted. New persisted structures need a save-version migration in `js/state.js`; never discard existing player or exploration progress during migration.

## Class abilities and leveling

Class kits live in `js/progression.js`. Add short ability definitions with a stable ID, unlock level, MP cost, effect kind, and concise description. Resolution belongs in the shared combat code; do not add class-specific meters. Current unlocks are level 1, 3, and 5. Level-up notices report the level, +2 max HP, +1 max MP, +1 Vitality, and any newly unlocked action. Basic Attack, Defend, Item, and Retreat remain usable without MP.

## Quest chains and discovery

Quest definitions may set `chain`, `step`, and `next`. Turn-in posts the next step only after granting the current reward. Use saved landmark IDs, event flags, inventory items, kills, and return actions as objectives. Item turn-ins list `{id, quantity, consume}` explicitly; the last required quantity is reserved from sales and barter. Quest board cards show the giver, objective, reward, chain step, and explicit Available/Active/Ready/Completed status. Current chains are Municipal Depth Markers (2 steps), The Very Small Door (2), The Warm Wall (3), Missing Survey Crew (3), and The Duck (2). Keep repeatable clues on a cooldown when later chain steps need a second interaction.

## Equipment effects and economy

Item effects remain shallow data fields rather than scripts. Current shared effects include defense/retreat/loot bonuses, fire resistance, shop discount/sale bonus, a chance to recover 1 HP after combat, and `duckSense`, which exposes one optional clue while the ring is equipped. A class passive or room-specific rule should live in the common rules path and apply only to its intended action. Nine text-only equipment items were added as sidegrades; their values range from 32g to 58g, and rare drops are deliberately low-weight. The inn costs 5g for one full refill and does not charge when both resources are full. Keep quest rewards useful, shop prices legible, and Strange items distinct rather than uniformly stronger.

## Recurring people, defeat, and local records

NPC visit counts live under `town.npcProgress`. Add concise state-aware dialogue rather than a relationship score. Pip offers a different ledger line at greater depth and a depth-3 trade; Nell remembers a deeper-floor meeting for the survey chain. Town dialogue may react to a few milestones but should not fire after every small action.

Defeat is a rescue, not permadeath: return to town at 1 HP and 0 MP, lose 10% of carried gold (rounded up), retain equipment, quest items, and discoveries, and show a recovery report. Career counters and 15 local achievements are stored in the character save. New counters should be incremented alongside the gameplay mutation they describe; achievement unlocks use stable IDs and should not interrupt combat.

## Future depth bands

The current playable cap remains Floor 3. Future intent is Upper Works (1–3), Old Foundations (4–7), Forgotten Works (8–12), Things Stop Making Sense (13–20), and Deep Hole (21+). Later bands should improve reward choice, event weirdness, variant likelihood, and threat while keeping enemy identity and return risk. These are design bands only until stair generation, persistent fixtures, NPC placement, and multi-floor routing are validated for deeper layouts.

## Accessibility and QA

Presentation preferences are saved in `settings`: Normal/Large text, High-Contrast Automap, and Reduced Motion. High contrast changes discovered map contrast only; it does not reveal geometry. Reduced Motion shortens/disables decorative transitions while retaining state feedback. QA-only controls for class/level, quest steps, achievements, economy estimates, synthetic enemy depths, and map inspection must stay behind `?qa=1`.
## Room Art / Prop Workflow

User drawings define the canonical design of room props. Draw individual objects rather than complete perspective scenes; the game places each prop into its procedural room geometry.

1. Draw one prop per page or image, with the full silhouette visible and some space around it.
2. Photograph or scan the drawing in even light.
3. Crop it and clean the paper background while retaining the original line character.
4. Save a transparent **Original Ink** asset that preserves the cleaned linework.
5. Create a paired **Colored** asset with simple color masked beneath the protected ink layer.
6. Register a stable prop ID and both asset paths in the room-prop catalog.
7. Assign compatible room types, placement zones, weights, and a background or foreground layer.
8. Set a modest display scale and allow horizontal flipping only when the drawing still reads correctly.
9. Validate placement and readability at 320px and 390px screen widths.
10. Check both existing Sprite Style modes: Colored and Original Ink.

The first planned prop tests are a mushroom cluster, wooden crate, campfire with kettle, and pile of spoons. Current CSS/SVG props are temporary placement placeholders, not final artwork. Room prop definitions are data-driven in `js/data.js`; the shared prop metadata, stable placement, and placeholder renderer live in `js/room-visuals.js`. Decorations derive their seed from persisted floor geometry and cell coordinates, so revisiting a room does not reroll it and scenery does not consume gameplay RNG. Props are decorative and do not block movement unless a future definition explicitly opts into collision.

For future hand-drawn props, provide paired transparent Colored and Original Ink files. The renderer selects the matching asset through the existing Sprite Style preference; no separate room-art setting is needed.
