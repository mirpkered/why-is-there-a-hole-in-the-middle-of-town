# Content guide

Keep content original, define stable IDs, and keep authored content in `js/data.js`. Turn resolution belongs in `js/game.js`; screen rendering belongs in `js/app.js`.

## Monsters

Add a `monsters` entry with `id`, display name, `minDepth`, HP, attack, defense, speed, XP, gold range, rarity, loot-table ID, encounter text, and behavior. Supported behavior fields currently include `multiStrike`, `evadeChance`, `criticalChance`, `burnChance`, and `burnTurns`. Resolve behavior in `js/game.js`. Add its ID and weight to `floorEncounterTable` for the desired floors.

## Equipment and items

Add an `items` entry with `id`, `name`, `category`, `rarity`, `buyValue`, `sellValue`, and optional `slot`, `modifiers`, `effects`, `classes`, `effect`, `questItem`, `stackable`, and `flavor`. Equipment slots are Head, Body, Main Hand, Off Hand, Feet, and Accessory. Modifiers affect derived stats; small effects currently cover fire resistance, retreat chance, loot chance, goose damage, and sale value. Save ownership and equipment references, not item definitions.

## Loot

Add reusable rows to `lootTables`; each row names an item and weight and may include a minimum quantity. Reference the table from a monster's `lootTable`. Rarity weights and depth adjust uncommon, rare, and strange drop likelihood. Include trade goods and consumables alongside equipment. Quest items cannot be sold.

## Quests

Include `id`, `title`, `description`, `giver`, `type`, `target`, `count`, and `reward`; add floor or location requirements as needed. Keep progress per player save rather than mutating the shared definition.

## Merchants and barter

Add gold-shop inventory IDs to `shopStock`. Barter offers belong in `trades` and use `id`, `npcId`, `title`, `requires` and `gives` arrays of `{item, quantity}`, plus a gold amount. Attach trade IDs to an NPC's `tradeIds`. Keep trade validation in game rules rather than UI code.

## Dungeon NPC encounters

Define a visitor in `dungeonNpcs`. Add its ID to `npcEncounterIds` for seeded placement on each floor. Placement avoids the entrance, stairs, cache, and fixed rat cell. Visitors can offer `tradeIds` or `stock` with a `priceMultiplier`. Keep NPC encounters single-player and turn-safe.

## Town NPCs

Add named service characters to `townNpcs`; keep dialogue brief. Current roles cover the notice board, general store, and inn.

## Dungeon events

Use deterministic authored data or the dungeon seed. Keep geometry and discovery state in dungeon state. Event resolution should be turn-based and must not bypass the return/extraction loop.
