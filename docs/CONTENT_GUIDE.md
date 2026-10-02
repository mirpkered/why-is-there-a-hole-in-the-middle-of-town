# Content guide

Keep content original, use stable IDs, and put authored definitions in `js/data.js`. Rule resolution belongs in `js/game.js`; screen rendering belongs in `js/app.js`.

## Monsters

Add a `monsters` entry with `id`, display name, `minDepth`, HP, attack, defense, speed, XP, gold range, rarity, loot-table ID, encounter text, and behavior. Supported behavior fields include `multiStrike`, `evadeChance`, `criticalChance`, `burnChance`, and `burnTurns`. Add the monster to `floorEncounterTable` at its intended depth.

### Hand-drawn enemy sprites

Use one creature per source image, with a strong dark outline, plain background, entire body visible, and modest space around the extremities. Exaggerated poses are welcome; avoid details too small to read on a phone. Portrait and landscape drawings both work.

Processing workflow: photograph or scan the drawing; crop it; remove the paper/background and camera artifacts; export a transparent black-ink PNG that preserves the original pen lines; derive a matching colored transparent PNG from that same source; add the pair to the monster's `sprite` metadata (`ink`, `colored`, optional `scale`, and optional `offsetY`); then check both modes at mobile combat size. The original ink is canonical: keep its linework as a protected top layer over flat color clipped to a silhouette mask. Do not rely on flood fills through imperfect open pen lines. The global Sprite Style setting selects the variant. Keep source/reference files separate from runtime sprites when retaining them.

The five shipped user drawings have paired ink/color files: `kung-fungoose-*`, `deadly-rat-*`, `fire-breathing-earthworm-*`, `killer-rabbit-*`, and `pocket-slime-*` in `assets/images/enemies/`. Preserve the Pocket Slime's established color treatment unless a visible mask defect is found.

Current custom runtime sprites use paired `*-ink.png` and `*-colored.png` files for Kung Fungoose, Deadly Rat, Fire-Breathing Earthworm, Killer Rabbit, and Pocket Slime. Their display scale and vertical offset are set per monster in `js/data.js`; all other monsters retain their SVG fallback sprites.

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
