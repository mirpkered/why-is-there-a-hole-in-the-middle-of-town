# Floor 4–7 Readiness

## Release state

**Normal play remains capped at Floors 1–3. Floor 4 is not unlocked.** `CURRENT_PLAYABLE_MAX_FLOOR` in `js/depth-config.js` is still 3; Floors 4–7 remain QA previews. Preview state does not overwrite a normal save, and an over-cap save resumes in Town while retaining its deeper exploration record. No save migration was added.

**Floor 4 verdict: B — Nearly Ready.** Floor 4 now has a distinct encounter table, authored events, gated quest chains, room flavor, Nell follow-ups, town return reaction, and a less punishing deep return curve. The remaining release blocker is an end-to-end playtest of this authored progression at realistic player levels, including quest completion, economy/inventory, interruption/recovery, save/Continue, and mobile browser flows. **Floors 5–7 are not release-ready**; this pass did not author them.

## Floor 4 release checklist

| Area | State | Finding / remaining work |
|---|---|---|
| Playable cap and save safety | READY | Cap remains 3; QA preview range remains 1–7; preview state is not persisted. No migration. |
| Generation and map | READY | Existing generation checks cover 2,500 layouts per depth on 11×11 maps. Geometry and routes remain valid. |
| Room identity | READY | Old Foundations weighting favors Storage, Flooded Chamber, Records, Library, and Camp while retaining all familiar room types. Five room types have depth-specific descriptions; image art remains optional. |
| Events | PARTIAL | Six concise Floor 4-only events are authored: Old Survey Marker, Flooded Records, Collapsed Storage, Abandoned Crew Camp, Old Warning Sign, and The Second Small Door. Event flags reuse existing state. Run the full quest/event path in a real expedition before unlock. |
| Quests | PARTIAL | Two short chains (four stages) use `minDepth: 4` and stay hidden/unavailable below Floor 4. Board/accept/outcome gating has regression coverage. Validate the complete return-and-reward loop in a playtest. |
| Nell and Town | PARTIAL | Nell has Floor 4 reactions and the first return from depth 4+ records one Town reaction. Verify the scene sequence in browser; currently QA-only. |
| Enemies and pacing | READY for preview | Dedicated 12-monster Floor 4 weights reduce ordinary early-floor encounters and emphasize deeper fits. No new monster is required for this tranche. |
| Combat | PARTIAL | Engine simulation covers four classes, low/average/high starting rolls, and four action policies at level 5. It is a controlled fight model, not a full expedition or final balance certification. |
| Loot | READY for preview | Floor 4 uses current item identities with the Old Foundations rarity weights. Uncommon is more available, Rare remains occasional, Strange stays rare. No new exclusive drop was added. |
| Return risk | PARTIAL | Floor 4+ uses gentler depth, route, and agility coefficients; Floors 1–3 keep their existing curve. Modeled chance improves, but the actual route interruption, healing, and defeat loop needs playtesting. |
| Economy and inventory | PARTIAL | Loot and encounter simulations are sampled. No complete player expedition currently models shop/Inn spending, capacity, quest rewards, and return frequency together. |
| Room/battle backgrounds | OPTIONAL | Current registries and CSS fallback are usable. No Old Foundations-specific background image is needed for release. |
| Art and audio | OPTIONAL | Existing art, fallback renderers, and dungeon music are serviceable. See wishlists below; neither needs to block a first Floor 4 release. |
| Mobile/browser | BLOCKED for release | Automated preflight passes, but viewport interaction and QA preview were not visually exercised in a browser/device during this pass. Check 320×740, 390×844, and 430×932 before unlock. |

## Floor 4 content

The new encounter weights are: Permit-Office Mimic 12.4%, Fire-Breathing Earthworm 11.0%, Skeleton on Break 10.5%, Rotten Apple 10.1%, Heart-Attack 10.0%, Porkscrew 9.5%, Poo Gas 8.9%, Killer Rabbit 7.6%, Kung Fungoose 7.4%, Pocket Slime 5.0%, Kobold Toll-Taker 4.6%, and Deadly Rat 3.0% of combat choices in the 50,000-decision sample. Event/NPC/quiet/combat decisions were 18.4%/3.5%/53.4%/24.6%. Immediate monster repeats were 8.3% and three identical encounters in a row were 0.54%. The pool keeps all 12 current monsters and does not make the Permit Mimic dominant.

The Old Foundations Survey and Wrong Map chains are data-gated at depth 4. Nell can react to reaching the old records and conflicting markers; returning from Floor 4 sets a one-time civic reaction. Those states reuse existing flags, quests, and Town reactions, so they need no schema change.

Room flavor is registered by room ID in `roomDepthPresentation`; it adds older municipal shelving, water-stained records, persistent water and survey debris, expedition traces, and leaning archive shelves to the scene description. It requires no room-specific renderer or new art.

## Simulations

Extended local runs:

- `node tools/floor4-release-sim.mjs`: 50,000 encounter decisions, 50,000 loot selections, 10,000 attack selections across move profiles, 1,000 actual generated return routes, and 25,000 modeled attempts for each of six candidate return formulas.
- `node tools/floor4-battle-sim.mjs`: 2,400 engine-driven fights (50 for each of four classes × three starting-stat profiles × four policies). Player level 5, class-valid starting equipment, and tonic/counter usage are represented. These controlled fights are a diagnostic model and do not simulate expedition attrition.
- `node tests/run.mjs`: bounded canonical preflight, including content gates, 10,000 deep-floor layouts, room weighting, return-route coverage, save/migration checks, and other gameplay regressions.

Loot selection was Common 61.9%, Uncommon 29.6%, Rare 7.8%, Strange 0.8%; categories were Equipment 28.4%, consumables 3.9%, trade goods 67.3%, and other 0.4%. The heaviest single selected item was Extremely Heavy Spoon at 12.0%, followed by Suspicious Mushroom at 10.9%; these are spread across different monsters and are not a single-table monopoly. These figures describe the current weighted loot selection model, not the chance per complete expedition.

Return routes sampled from generated Floor 4 preview states were 30–69 known steps (mean 41.7; median 41; 90th percentile 50). Under the prior formula, the chance hit the 20% minimum. Candidate F combines a 4 percentage-point per-floor penalty, 1.2 points per known route step, 1.5 points per AGI above/below 5, equipment bonus, and current hazard penalty, clamped to 20–95%. Candidate simulations estimated: current formula 20.3% clean return, 45.6% multiple interruptions, 19.2% defeat; 25% minimum 24.8%, 42.4%, 15.3%; combined restrained formula 34.6%, 33.7%, 10.8%. Each candidate used 25,000 modeled attempts, the same sampled routes, random AGI 2–8, 20% chance of a +10-point retreat item, 12% flooded hazard, and assumed 6% defeat per interruption. The combined model is now used for Floor 4+, while the Floor 1–3 formula is unchanged. This is a provisional safer curve, not field-tested balance; the full return loop remains a release gate.

Attack selection was sampled 10,000 times per current monster profile at a representative mid-health state. Basic attacks remained common, while special/status moves appeared often enough to test the deeper attack pool; no move occupied 95% of selections. Some high-cost/situational moves remained uncommon. Floor 4 combat policies should be checked against real resource decisions before release.

In the level-5 battle harness, all 2,400 fights were won across Fighter, Wizard, Rogue, and Cleric, low/average/high starting rolls, and basic/ability/tonic/ability-plus-counter policies. Mean fight length ranged from 2.6 to 10.3 player turns by class/profile/policy; low-roll Wizard and Rogue basic-only fights took the longest (8.5 and 9.3 turns) and retained about 16 HP on average. Tonic policies consumed 0–0.78 tonics per fight in the sampled setups; counter items were available only for matching Poo Gas encounters. This is a level-5 controlled sample; the canonical preflight's separate 1,440 basic-only fights across Floors 4–7 had Floor 4 win rate 93.6%, showing why the richer harness does not replace full-expedition playtesting.

The canonical preflight also reports 10,000 generated layouts across Floors 4–7 (2,500 each), all connected, deterministic, bounded, and with reachable stairs. Keep the 11×11 map: content and weighting create identity without a navigation-size change.

## Floor 4 art and audio wishlists

Highest-impact future drawings: survey marker, damaged warning sign, archive box or filing cabinet, flooded debris/plank, and abandoned expedition supplies. Existing props and fallback CSS keep every room usable. No new monster drawing is a release prerequisite.

The current dungeon music pool can serve Old Foundations. A separate depth pool or one damp, low-key track could strengthen the transition later, but no new recording is needed for unlock. Existing audio routing provides the fallback.

## Unlock recommendation

Open one floor at a time. **Floor 4 is nearly ready (B)** after a focused manual expedition and mobile pass. Exact remaining blockers:

1. Exercise both quest chains and all six event outcomes through the real QA progression, including return, reward, and reload.
2. Run a complete Floor 4 expedition with low/average/high builds and ordinary gear; record healing, Inn cost, inventory capacity, return interruptions, and defeat recovery.
3. Verify the Floor 4 QA route, readable flavor, controls, and save safety in browser viewports 320×740, 390×844, and 430×932.

Floors 5–7 remain **not ready for release**: they have QA generation and shared scaling, but no authored depth-specific event/quest progression or floor-by-floor expedition validation. Do not unlock them based on this Floor 4 pass.
