# Content guide

Keep content original and define it with stable IDs. Names, visuals, and writing should support a legitimately dangerous dungeon and a town that handles the impossible hole as ordinary civic business.

## Monsters

Give each monster an ID, display name, health, attack/defense values, and any future behavior/action definitions. Keep turn resolution in game rules, not display code.

## Items

Follow `data.js`: `id`, `name`, `category`, `quantity` for owned stacks, `value`, and optional `slot`, `effect`, and `questItem`. Put shared definitions in content data; save only ownership and equipment references.

## Quests

Include `id`, `title`, `description`, `giver`, `type`, `target`, `count`, and `reward`; add optional floor/location constraints as needed. Keep progress per player save rather than mutating the shared definition.

## Dungeon events

Use deterministic authored data or a documented seed. Keep geometry and discovery state in dungeon state. Event resolution should be turn-based and must not bypass the return/extraction loop.
