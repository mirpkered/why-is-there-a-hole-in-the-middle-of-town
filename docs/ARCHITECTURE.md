# Architecture

## Screen and state flow

The title screen starts a new character or resumes the saved model. The town links to the board, store, inn, character sheet, and dungeon. Dungeon actions update game state, then render the screen from that state. No gameplay value is inferred from the DOM.

## Modules

- `app.js` owns screen templates, event delegation, keyboard controls, and QA-only actions.
- `game.js` owns character creation, quest progression, movement, combat, event resolution, items, and rewards.
- `enemy-scaling.js` builds fixed, saveable encounter snapshots and estimates threat against the current player.
- `state.js` defines the save key/version, starter state, map helpers, sequential migrations, save validation, backup recovery, and serialization.
- `data.js` contains stable IDs and definitions for quests, monsters, items, NPCs, room types, and weighted dungeon events.
- `progression.js` defines the small class ability kits, local achievements, and the intended future depth bands.
- `random-utils.js`, `encounter-director.js`, `status-effects.js`, `quest-templates.js`, and `content-validation.js` provide shared selection, encounter history/pacing, reusable combat status definitions, safe objective-template validation, and content checks.
- `audio.js` owns reusable background playback, dungeon/battle context switching, and one-shot location themes. `location-music.js` defines the empty-by-default service pools and validates/selects registered tracks.

## Persistence

Meaningful actions call `persist()`, which writes one JSON snapshot to local storage and keeps the previous valid primary as a fallback. Loading validates required structures, repairs missing optional containers, preserves an invalid primary in a recovery slot, and tries the backup. Migration logic is sequential and centralized in `state.js`; unknown versions are safely declined rather than partially loaded. `node tests/run.mjs` exercises migrations, round trips, active combat, settings, map persistence, and backup recovery.

Save version 6 adds career counters, achievement unlock timestamps, NPC visit counts, and accessibility preferences. These values are character-local. Ability availability is derived from the player’s class and level, while encounter effects and temporary defenses stay in the active combat snapshot. Defeat recovery keeps the map, inventory, equipped gear, and quest items; it returns the player to town at 1 HP and 0 MP, and deducts 10% of carried gold (rounded up, capped by the current balance).

## Dungeon

Coordinates are integer grid positions. Facing is north/east/south/west as 0–3. The old v3 implementation used one fixed 7×7 layout and checked only listed wall cells, so missing outer-edge walls allowed coordinates outside the floor. In v4, directional input is absolute, every coordinate outside the persisted map dimensions is blocked, and movement into a wall leaves position/facing/turn timing unchanged. New runs generate three connected 11×11 floors once from the run seed and persist each map (including its stairs); returning, descending, saving, and reloading reuse those maps. The layout uses a randomized depth-first carved corridor maze, then adds loops and small widened chambers. Each generated stair pair is checked for reachability before acceptance. New floor NPCs and Floor 1 quest markers are placed only on valid open cells.

Version 3 saves keep their existing 7×7 geometry and coordinates for every floor already reached; floors not yet reached by those saves retain the same legacy layout on first entry. New runs use procedural layouts. Multi-floor return pathfinding reads the saved map for each floor. QA mode reports map seed, dimensions, walkable/connected counts, and stair connectivity; it can teleport to an edge, reveal a floor, or explicitly regenerate the current floor.

Each combat encounter stores its level, optional rare variant, scaled HP/attacks/defense/behavior, and reward multipliers at spawn. Combat and reward resolution use these stored values, so a save/reload cannot reroll an enemy. v4 active fights migrate into a floor-appropriate snapshot while retaining their remaining-health percentage. Base tiers keep strong monsters above weak ones at equal depth; small per-monster attack-weight/effect changes preserve identity, and scaling has diminishing returns after ten depth steps. The current floor count is three; QA can preview and spawn encounters through synthetic depth 10. Settings store the threat display preference separately for use before character creation and also copy it into saves.

Newly visited cells receive a saved room tag and may roll a weighted event or monster encounter; revisiting an event cell does not reroll it. Event definitions and choices are data-driven, with a small outcome resolver in `game.js`. Event state, landmarks, temporary effects, and town reaction notes are saved.

On narrow screens, the dungeon uses a compact HUD with minimap, character status, first-person scene, movement pad, and context actions. During exploration, the minimap can be tapped to open a read-only full-floor view using the same discovery-filtered cells and wall edges; tapping its map again closes it. It is temporary interface state, never saved, and keyboard movement is suspended while it is open. Expansion is disabled during combat so the map cannot cover combat choices; events use their own choice screen. The QA state inspector includes the most recent movement direction, result, coordinates, and facing.

Dungeon presentation has two explicit scene modes. Exploration uses the room-tagged `.scene` with procedural architecture, atmosphere, landmarks, and stable decorative props. Active combat uses a separate `.battle-scene` backdrop with a room label and the enemy sprite; it does not build or show exploration props. After combat, rendering returns to the same saved cell and room tag, so its room dressing remains stable. CSS layers provide the moody stone, water, timber, and room-specific light treatments without adding background image dependencies. This presentation change does not alter the save format.

## Content model

Quests use stable IDs, source/giver, type, target, count, and reward. Active entries store progress. Items use stable IDs, categories, rarity, prices, quantity rules, equipment modifiers, and optional effects. Content definitions stay separate from player inventory instances. See `docs/CONTENT_GUIDE.md` for event and room conventions.

## Class progression and career

Each class has three abilities at levels 1, 3, and 5. They spend the shared MP pool; Attack, Defend, Item, and Retreat remain available without MP. Fighter gets a small armor defense bonus, Wizard abilities scale from Mind, Rogue has improved loot/escape odds, and Cleric has better shrine recovery and burn protection. Class skill checks receive a small relevant-stat bonus. Abilities are data-driven in `progression.js`; resolution stays in `game.js`.

Quest chains reuse event flags, discoveries, kill progress, inventory requirements, NPC visits, and safe returns. A chain’s next quest ID is posted only after the current step is turned in. Five chains cover the depth markers, very small door, warm wall, survey crew, and duck. New quest progress is derived from saved flags/items where practical. Career counters update at gameplay mutation points; achievements unlock from those milestones and are shown in a compact town screen.

Merchant prices and rewards remain integer gold values. Juniper’s ordinary purchases use the equipped `buyDiscount` effect and sales use `sellBonus`; barter consumes reserved-safe inventory and its stated gold cost. The inn is a modest 5g full refill and rejects a purchase at full HP/MP. Deeper reward multipliers continue to use the existing enemy depth scaler. Current playable floors remain capped at three because multi-floor stair/return routing and generated floor fixtures are authored for that range. Future depth bands are documented in `progression.js` but not opened in gameplay.

Accessibility preferences are saved with the character: Normal/Large text, optional high-contrast map colors, and Reduced Motion. The motion preference reduces transitions and animations; the global `prefers-reduced-motion` media rule provides the same respect when the system preference is active. Settings that change only presentation do not alter map discovery or gameplay state.

New characters independently roll Strength, Agility, Mind, and Vitality inside the selected class's `STARTING_STAT_RANGES`; there is no shared point budget. The creation preview keeps that temporary roll until the player changes class, randomizes, rerolls, or starts the character. Starting HP and MP are derived from the class baseline plus twice the rolled Vitality/Mind offset from that baseline, then starting equipment modifiers are applied. Current HP/MP are set to the resulting maxima. The rolled base attributes and resulting resources use the existing player save fields, so this does not require a save-version migration.

The 11×11 dungeon generator uses an immutable per-floor seed and its own local PRNG, so generating/revisiting floors does not consume the mutable gameplay RNG. The no-dependency preflight validates 1,000 seeds at each playable depth, map bounds/connectivity/stairs, deterministic output, and runtime asset paths. Current metrics span 52–66 walkable cells and 9–38 steps between stairs across the tested layouts.

Monster definitions carry family tags and a lightweight AI profile. The encounter director applies soft penalties to the three most recent matching IDs, while allowing repeats; it also nudges encounter odds after quiet streaks and eases them after consecutive encounters. A spawn-time combat snapshot retains AI profile, family tags, scaled attacks, variant, and AI turn state. Status definitions use refresh-duration/keep-stronger-magnitude stacking; damage-over-time ticks only at the explicit player-turn-end hook, so reloads do not advance duration.

The store guarantees tonic, basic weapon, and basic armor stock. Four rotating items are selected deterministically from the run seed and saved market cycle; successful return to town is the restock trigger. Merchant profiles provide per-merchant price multipliers and preference metadata. Meaningful gameplay mutations emit small internal hooks for future statistics/quest integrations. Town milestones are event-driven flags. Quest objective templates are validation-only foundations; no live procedural quest generation uses them.

Notable non-stackable equipment can keep acquisition source/floor provenance on its inventory instance. Common stackable items remain aggregate stacks. `tests/run.mjs` is the deployment preflight for content references, local app/audio assets, save migrations/recovery, procedural maps, weighted encounter/loot selection, status behavior, and basic game flows. QA reports content validation counts and a compact current-state summary.

## Audio

The user-performed battle theme at `assets/audio/music/battle-theme.mp3` is the default combat track. Combat starts it from a player action; battle actions reuse the active track, and leaving combat stops it without an audible ramp. Ordinary dungeon clips play sequentially at their configured gain without crossfading. One `HTMLAudioElement` and one optional Web Audio gain stage are reused through visibility changes so returning from a suspended mobile tab cannot stack another copy. The music slider remains the single user volume source and uses the saved setting multiplied by fixed track gain. Music on/off and volume preferences are stored separately in local storage and copied into character saves when available. Browsers that require a user gesture receive playback only from a game action, Continue, a settings interaction, or the QA music controls. QA mode includes battle/dungeon tests and location-pool diagnostics. Service pools (`inn`, `store`, `questBoard`, `statistics`, `achievements`, `character`) are content metadata: a location chooses one weighted eligible track on entry, never loops/chains it, and stays silent after it ends. The last service track is remembered only in memory to avoid immediate repetition when alternatives exist. Subviews share their parent location context; leaving stops an unfinished track. Empty pools are valid until user recordings are supplied.

After the first valid user interaction, the app prepares the battle audio channel and preloads the current-style combat sprites without autoplaying music. It later prepares the alternate sprite style during idle time. A small cache keyed by monster and style decodes images once; when an asset is still pending at encounter time, the ready fallback is shown and replaced atomically after decode. A failed or slow image/audio request never blocks combat. QA reports cache state, decode time, combat DOM render time, audio readiness, and playback-start latency.


## Town market and Inn state

Town destinations use a compact two-column hub with a prominent Hole action. Destination cards expose stable data-art-slot IDs and use CSS presentation. Paired location art may later use <slot>-ink.png and <slot>-colored.png inside the responsive illustration area. The frame remains CSS. The Sprite Style preference selects the appropriate future asset. Town service screens keep HP, MP, and gold in a compact persistent status strip.

Juniper's market state is stored under town.shop: cycle, immutable market seed, four rotating item IDs, per-good demand multipliers, and one short flavor line. A deterministic market snapshot is generated from the run seed and cycle. It stays fixed over reloads and changes once after a successful return to town. Defeat recovery does not count as a completed expedition. Three core necessities remain guaranteed. Trade goods and junk vary from 75–130% of base resale value; final resale is capped at the discounted Juniper purchase price to prevent positive buyback arbitrage. Equipment and essentials retain stable market demand.

A paid partial Inn rest restores HP/MP for 5g and has a 25% chance to select one weighted Inn event. Full-rest attempts are rejected before charging or rolling. Well Rested adds 10% combat XP for three victorious battles, carrying fractional XP between those kills; the count is spent only when combat XP is awarded. Other Inn effects use the existing temporary-effect store: repeated effects refresh duration and keep the stronger value, while different effect keys coexist. Inn state and durations migrate from save version 7 to 8.

## Content expansion hooks

Quest chains remain data in `js/data.js`: `next` opens the following stage after turn-in, while collect readiness is derived from the player's current inventory. Completed Pip trades are stored in optional `town.tradeHistory`, allowing a trade objective to recognize a deal completed before accepting the quest. New stages are opened from event choices and first encounters rather than added to every new character's initial bulletin board.

Equipment interactions use the existing item effect path. `vsTags` adds a small shared physical damage bonus for matching monster tags; `statusResistance` scales incoming status-application chance; `hazardReduction` reduces event hazard damage. Event `requiresItem` choices provide optional interactions without consuming the equipment. These are additive hooks and do not alter the encounter's base attack/stat snapshot.

Inn outcomes are registered by ID and support flavor, temporary benefit, item, gold, and combat-XP reward types. Inn event counters use the career helper. Attack flavor arrays are selected using the persisted combat turn count rather than gameplay RNG, keeping copy variation from perturbing damage or loot rolls. Depth-band content metadata describes future table direction; playable floor availability and encounter tables remain unchanged beyond restrained existing-roster weighting updates.
