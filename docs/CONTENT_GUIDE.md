# Content guide

Keep content original, use stable IDs, and put authored definitions in `js/data.js`. Rule resolution belongs in `js/game.js`; screen rendering belongs in `js/app.js`.

## Monsters

Add a `monsters` entry with `id`, display name, `minDepth`, HP, attack, defense, speed, XP, gold range, rarity, loot-table ID, encounter text, and behavior. Supported behavior fields include `multiStrike`, `evadeChance`, `criticalChance`, `burnChance`, and `burnTurns`. Add the monster to `floorEncounterTable` at its intended depth.

### Hand-drawn enemy sprites

Use one creature per source image, with a strong dark outline, plain background, entire body visible, and modest space around the extremities. Exaggerated poses are welcome; avoid details too small to read on a phone. Portrait and landscape drawings both work.

Processing workflow: photograph or scan the drawing; crop it; remove the background; clean photographic artifacts while retaining the hand-drawn lines; add simple color; export a transparent PNG; attach it through the monster's `sprite` metadata (`src`, optional `scale`, and optional `offsetY`); then check the complete sprite at mobile combat size. Keep source/reference files separate from runtime sprites when retaining them.

Current custom runtime sprites: `assets/images/enemies/kung-fungoose.png`, `deadly-rat.png`, `fire-breathing-earthworm.png`, `killer-rabbit.png`, and `pocket-slime.png`. Their display scale and vertical offset are set per monster in `js/data.js`; all other monsters retain their SVG fallback sprites.

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

## Replay and state

Event resolution, one-time flags, cell visits, room tags, landmarks, and town reactions are persisted. New persisted structures need a save-version migration in `js/state.js`; never discard existing player or exploration progress during migration.
