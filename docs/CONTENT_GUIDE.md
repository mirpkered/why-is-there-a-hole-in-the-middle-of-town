# Content guide

Keep content original, use stable IDs, and put authored definitions in `js/data.js`. Rule resolution belongs in `js/game.js`; screen rendering belongs in `js/app.js`.

## Monsters

Add a `monsters` entry with `id`, display name, `minDepth`, HP, attack, defense, speed, XP, gold range, rarity, loot-table ID, encounter text, and behavior. Supported behavior fields include `multiStrike`, `evadeChance`, `criticalChance`, `burnChance`, and `burnTurns`. Add the monster to `floorEncounterTable` at its intended depth.

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

## Replay and state

Event resolution, one-time flags, cell visits, room tags, landmarks, and town reactions are persisted. New persisted structures need a save-version migration in `js/state.js`; never discard existing player or exploration progress during migration.
