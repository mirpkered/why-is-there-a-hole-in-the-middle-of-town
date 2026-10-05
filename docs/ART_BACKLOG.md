# Art backlog

Coverage summary from the current registries and files in `assets/images/`. This is a record of supplied user art and temporary coverage, not a request to fill every entry immediately.

## Done — custom paired art

### Enemies (9 of 12)

Deadly Rat, Killer Rabbit, Kung Fungoose, Pocket Slime, Fire-Breathing Earthworm, Heart-Attack, Porkscrew, Rotten Apple, and Poo Gas each have Original Ink and Colored runtime PNGs registered on their existing monster definition.

### Town destinations and services (7)

The Hole, General Store, The Inn, Quest Board, Statistics, Settings, and Character have paired transparent illustrations registered in `js/town-art.js`. The Hole is the featured Town button art. Statistics uses the supplied chart sign, Settings the twin-gear sign, and Character the television with two adventurers. The colored Quest Board sign uses muted wood tones. All source scans are retained under `assets/source/town/`.

### Room props (6 of 26 definitions)

Campfire, Wooden Crate, Mushroom Cluster, Tall Mushroom, Leaning Tall Mushroom, and Small Mushroom have paired Ink/Colored PNGs; original photos are retained under `assets/source/room-props/`. Other room props currently use CSS/SVG placeholder presentation.

## Needs art

- **Enemies (3):** Kobold Toll-Taker, Skeleton on Break, Permit-Office Mimic. They currently use local SVG fallback sprites.
- **NPCs (5 definitions):** town clerk, shopkeeper, innkeeper, kobold trader, and lost surveyor. No custom portraits are registered.
- **Items (48 definitions):** no item-specific custom art is registered; item presentation remains text/fallback UI.
- **Room props (20 definitions):** water debris, floating plank, small altar, candle, barrel, labeled box, campfire kettle, bedroll, abandoned pack, market stall/basket/sign, bookshelf/book stack/labeled stone, filing cabinet/archive box/paper stack, spoon pile/single spoon, and stone debris. These use CSS/SVG placeholders.
- **Interactive objects/landmarks:** discovery UI and room-compatible placeholder props have no dedicated paired object illustration set.
- **Other Town destinations:** Character, Statistics, Achievements, and Settings use simple UI emblems; custom drawings are not registered.

## Future options

- Room backgrounds may be registered separately for exploration by room ID, with independent battle backgrounds. Keep props as their own layer and preserve a CSS fallback.
- Additional location signs/portraits can use the existing flexible service-card art slots.

## Source and runtime rules

Keep original user scans and recordings under `assets/source/` or `assets/audio/source/`. Runtime paths should point only to processed assets. Preserve the original linework as the top ink layer; place simple color beneath it. Runtime pairs should be transparent PNGs with restrained padding and should be checked at phone size in both Sprite Style modes. Do not use image borders as responsive UI structure.

Current registered custom pairs are validated by `node tests/run.mjs`; the inventory above should be reviewed against `js/data.js`, `js/room-visuals.js`, `js/town-art.js`, and the filesystem when art is added.
