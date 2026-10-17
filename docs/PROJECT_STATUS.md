# Project Health Status

Audit date: 2026-10-17
Audit baseline: bd1a2b45c1894130c5aabc6cc1b6a511c605ac88 (main matched origin/main; working tree clean before this pass).
Live game: [GitHub Pages](https://mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town/)

## Current status

**Floors 1–3: STABLE by automated checks. Floor 4: QA ONLY (B — Nearly Ready). Floors 5–7: QA ONLY / not release-authored.** No normal floor-cap or save-schema change was made. The only code fix in this audit reuses the existing arched small-door illustration for the distinct Floor 4 “Second Small Door” event.

The final canonical preflight passed 107 check groups, including the Second Small Door registration regression. The existing suite covers content validation, all five Dungeon Sets and eight topology IDs, 5,001 playable layouts, 10,000 deep layouts, combat/background continuity, props, save migrations/recovery, Continue, quests, market, Inn, audio routing, and bounded simulations. Extended Floor 4 checks also completed: 50,000 encounter choices, 50,000 loot choices, 10,000 attack choices, 25,000 samples per return model, and 2,400 engine-driven fights.

## System status

| System | Status | Evidence and limits |
|---|---|---|
| Dungeon backgrounds | STABLE / needs visual verification | All 40 registered PNGs exist across five sets × eight topology states. Facing-to-openings mapping and generated-cell selection are regression-tested. All 40 PNGs decoded into a contact sheet, and the active set loaded in Chrome at all three requested portrait widths. Physical-device visibility remains unverified. Visual review flagged the Set 5 true-dead-end face/mouth as a possible passage look; its art was left unchanged pending user review. |
| Floor set assignments | STABLE | Run-seed/floor assignments are deterministic and independent from gameplay RNG; persistence and backward-compatible state are tested. |
| Combat transition | STABLE by regression | Exploration/combat share the frozen set/topology background; props hide for battle and return after it. Enemy and environment fallback paths are separate in renderer tests. Real image decode timing still needs device verification. |
| Prop placement | STABLE by deterministic checks | Compatibility, stable layouts, floor anchors, depth scales, viewport bounds, and passage clearance are covered. This is algorithmic validation, not a visual review of every randomized scene. |
| Quests and events | STABLE by content validator/model tests | IDs, quest graph links/cycles, depth gates, outcomes, rewards, and pre-owned quest-item readiness have coverage. Floor 4 chains/events still need one real expedition through return and reload. |
| NPCs and art | PARTIAL / fallback allowed | Current NPC registry has five entries: Pip Underledger has custom Mirpyems portrait; Linna Venn, Juniper Dunn, Sal Morrow, and Nell use text/CSS fallbacks. Bowser and DJ Penguin are separately registered mascots. |
| Loot/equipment/status | STABLE by data and simulation tests | Item references, slots/class rules, stat/effect data, special-item interactions, status ticking/refresh, and loot distributions are checked. Models do not establish subjective balance. |
| Market and Inn | STABLE by bounded simulation | 10,000 market cycles and 25,000 eligible Inn rests are covered; core stock/buyback limits and all 14 Inn events were observed. |
| Save / Continue | STABLE by regression | Sequential historical migrations, round trips, active combat, malformed-primary backup recovery, raw recovery retention, storage exceptions, repeated Continue candidates, and over-cap resume are tested. Browser storage behavior remains device-specific. |
| Audio | STABLE by registry and mock routing | 42 processed tracks are registered and present; all 40 source/master records map to runtime assets. Inn, Store, Statistics, Character, Settings and dungeon pools are present; Quest Board/Achievements are intentionally silent; no runtime SFX tracks are registered. Mock routing and context exit are tested; iOS playback needs device verification. |
| Main/Town presentation | NO REDESIGN | This pass made no subjective CSS/UI edits. Chrome browser emulation at 320×740, 390×844, and 430×932 found no horizontal overflow, clipped main/Town/dungeon text, or undersized primary movement targets. |
| Floor 4 readiness | QA ONLY — B, Nearly Ready | Normal cap stays at 3. Six Floor 4 events, two quest chains/four stages, Nell follow-ups, encounter/loot weighting, and the provisional return curve exist. The manual expedition, economy/inventory/return/recovery, and browser/device gates remain. |
| Floors 5–7 | QA ONLY | Generation and shared scaling are supported; floor-specific release progression and expedition checks are absent. |

## Art and asset inventory

The generated [art inventory](ART_BACKLOG.md) is refreshed from current registries. It separates custom paired/single assets from CSS/text fallbacks and optional missing art.

- All 40 Dungeon Set background paths are registered; their combined PNG payload is about 108.3 MB (largest file about 3.12 MiB). No recompression was done.
- All currently registered local runtime asset paths pass the validator.
- Custom room art includes mushroom variants, doors, candle, storage props, camp props, market sign, bookshelves/book stack, paper/record props, warning sign, spoon(s), flowers, and floating water debris. Remaining CSS/text props include altar, abandoned pack, market stall/basket, archive box, and stone debris.
- Interactive art includes the vending machine, chair/ottoman, chest, snack stand, statue, wishing well, Duck v2, apple core, and the newly wired Second Small Door, which reuses the arched-door pair.
- Optional equipment/item art remains mostly unillustrated; missing optional art does not block play.
- Mirpyems credit remains attached to the Pip portrait and Duck v2 and their registered user art.

The generated [audio inventory](AUDIO_INVENTORY.md) distinguishes source records, processed runtime files, and registered playback pools. The runtime report currently has no missing files, unmapped sources, or unregistered processed tracks.

## Needs device/browser verification

- iPhone Safari and installed-PWA behavior: launch, Silent switch, background/foreground audio, orientation, save/Continue, touch movement, and service/dungeon controls.
- Viewports 320×740, 390×844, and 430×932 for main/Town/dungeon/combat, including text-large mode, safe areas, overflow, and clipped content.
- Floor 4 QA expedition through both quest chains, all six events, Town return, economy, defeat/retreat, save/reload, and Continue.
- Browser image decode/preload cost and image-memory lifecycle. Current dungeon background set assets total about 108.3 MB before browser caching; preloading and device transfer/decode timing merit separate measurement. PNG compression was intentionally left untouched.

## Performance and technical debt

The preflight and Floor 4 simulations completed successfully, but no controlled startup/Continue/render/movement/combat/save timing benchmark was captured. js/app.js remains a large integration module. No broad refactor or aggressive optimization was made. Continue and combat are designed not to wait for optional audio/enemy asset readiness; test coverage guards their fail-open behavior.

## Known content/release gaps

1. Floor 4 remains locked until an actual full expedition and mobile/browser pass confirm the authored path and practical economy/return loop.
2. Floors 5–7 do not have release-ready authored progression.
3. Four of five NPC portraits are fallback-only; item illustrations, many interactive object illustrations, and several prop drawings remain optional/fallback content.
4. Physical iPhone and iOS audio behavior remain unverified.
5. The 40 photorealistic Dungeon Set PNGs total 103.2 MiB on disk; each floor set is 18.7–22.5 MiB and the largest single image is 3.12 MiB. Compression is deferred until framing is approved.

## Validation references

- Canonical preflight: node tests/run.mjs.
- Generated asset inventories: node tools/art-report.mjs --check, node tools/audio-report.mjs --check.
- Extended local Floor 4 diagnostics: node tools/floor4-release-sim.mjs, node tools/floor4-battle-sim.mjs.
- Deployment workflow: GitHub Actions “Deploy static site to GitHub Pages”. The last verified run before this audit corresponds to the audit baseline and completed successfully.
- No claim of subjective visual acceptance is made from automated tests.

## Top five recommended next steps

1. Complete a real iPhone Safari/PWA pass for launch, audio, touch, save/Continue, and the three target portrait sizes.
2. Play Floor 4 end to end in QA with ordinary gear, including both quest chains, all six events, return interruptions, defeat recovery, and reload.
3. Measure Dungeon Set transfer, decode, and memory use on a phone before deciding whether to compress the 40 PNGs.
4. Capture and review the eight topology types across all five sets in browser screenshots; confirm openings remain visually readable.
5. Add portraits for Linna Venn, Juniper Dunn, Sal Morrow, and Nell only when user-supplied art is available; maintain fallback behavior meanwhile.
