# Floor 4–7 Readiness

## Decision

**Do not unlock Floor 4 yet.** Core generation, deterministic rooms, scaling, QA access, and return paths work. Floor 4 is the better first release than opening all four floors at once, but it still needs a small authored content tranche and a playtest of the real progression path. Floors 5–7 should remain staged behind later reviews.

Current normal play remains **Floors 1–3**. `CURRENT_PLAYABLE_MAX_FLOOR` in `js/depth-config.js` is the single normal-play cap. `descend()` seals Floor 3, the stair control observes the same setting, and deeper QA previews are explicitly marked. QA preview state is kept in memory and `persist()` skips it, so preview progress cannot overwrite a playable save. If an older or externally edited save points beyond the cap, normal Continue safely resumes in Town while retaining the saved record.

## Readiness checklist

| Area | State | Finding / action before release |
|---|---|---|
| Code and cap | READY | One configured playable cap; normal descent remains sealed at 3. No save migration required. |
| Generation | READY | 2,500 deterministic 11×11 layouts per floor, Floors 4–7, all passed bounds/connectivity/stair checks. |
| QA preview | READY | Direct Floor 1–7 selector; deep preview save writes are suppressed. |
| Rooms | READY | Old Foundations weights all ten current room types without excluding any. Storage, Flooded Chamber, Records, Library, and Camp are emphasized. |
| Room/battle backgrounds | PARTIAL | Existing registry and CSS fallback apply. No Old Foundations-specific background art or deeper variants are registered. |
| Enemies | PARTIAL | No Floor 4+ monster definitions exist. Deep floors reuse the Floor 3 pool with small weight changes and open-ended stat/attack scaling. Add at least one authored deep encounter identity before release. |
| Combat | PARTIAL | Higher attack unlocks work, but generated player-level expectations and skill/item use are not represented by the baseline fight model. Recheck through a real expedition. |
| Loot | PARTIAL | Rarity weighting is configured and sampled. There are no Old Foundations-exclusive drops or material identities. |
| Economy | PARTIAL | Existing reward and market logic scales without invalid values; no deep-only goods or price/demand hooks are authored. Validate a multi-floor expedition once content exists. |
| Return routes | READY for route correctness; BLOCKED for odds | All tested preview routes reach Floor 1 and interrupted returns resume on-route. Current return odds hit the 20% clamp on every sampled Floor 4–7 route. Review this before public release; it may make deep excursions feel excessively punishing. |
| Quests | PARTIAL | Current quests remain compatible with Floors 1–3; the Floor 3 return quest is intentional. No gated Old Foundations quest is active. Add and validate a release quest if deeper floors need a purpose. |
| Events | PARTIAL | Existing events are depth-agnostic or have lower minimum depths; no new deep event content is authored. Weighting raises event pressure at depth. |
| NPCs | BLOCKED for authored progression | Pip and Nell can appear, but their deeper dialogue repeats current generic lines. No new survey/report progression is registered. |
| Status and counter items | PARTIAL | Existing status attacks and counter items continue to function; no counter item is required by the generator. Deep encounter variety remains limited to current monsters. |
| Save | READY | No schema or migration change. Synthetic state with seven 11×11 maps, visited route cells, and related run state serialized to about 9 KB. QA previews do not write into the player save. |
| Art | PARTIAL | Current monsters, props, and fallback CSS remain usable. Helpful next art: damaged archive/storage props and deeper enemy variants. Room and battle backgrounds are future work, not release prerequisites. |
| Audio | READY with optional future work | Current dungeon pool can be reused. A depth-specific pool is optional and not required for correctness. |
| Mobile | PARTIAL | No layout changes were made for normal screens. Automated viewport-specific/browser checks were unavailable in this pass; verify the QA selector on target mobile devices before using it there. |

## Depth assumptions found

- **Intentional current-game rules:** Floor 3 descent seal, the `depth-three` quest/return target, the Floor 3 milestone achievement, and Pip's current “deeper” trade/dialogue are all tied to the released content.
- **Made scalable:** current cap, future band membership, QA preview max, depth room weights, enemy weights, and loot rarity weights now live in `js/depth-config.js`. Return routing no longer assumes the third floor is deepest.
- **Future-facing:** Old Foundations is configured for Floors 4–7. Later band metadata remains descriptive and does not make floors eligible for normal play.
- **Remaining risk:** `floorEncounterTable` currently ends at Floor 3, so Floors 4–7 intentionally fall back to that table. There are 12 current monsters total, and no additional monsters are introduced by this pass. Several event and quest behaviors intentionally reference the current Floor 3 milestone.

## Simulation summary

Canonical command: `node tests/run.mjs`.

- 10,000 generated Old Foundations floors: 2,500 at each depth. All were deterministic, connected, bounded, and had reachable stairs. All were 11×11 with 51–66 walkable cells; mean walkable cells were about 57.9 per floor. Longest sampled shortest stair path was 36 cells.
- Rooms: 25,000 weighted selections per depth. All ten room types appeared at every floor. Typical shares were Storage 16.6–17.4%, Flooded Chamber 10.0–10.5%, Records 6.6–6.7%, Library 7.8–8.4%, and Camp 8.4–9.2%. Ordinary Passage remained the largest single type at about 27%.
- Returns: 100 generated routes per floor (400 total), with 360 safe returns and 40 forced interruptions followed by successful route resumption and return. Every route reached Floor 1. Sampled return chance was 20% throughout Floors 4–7 because the existing formula reached its lower clamp.
- Combat: 360 no-counter, basic-attack-only fights per floor across Fighter, Wizard, Rogue, and Cleric (player level set to floor + 1; starting gear; no ability use). Win rates: Floor 4 93.9%, Floor 5 94.2%, Floor 6 91.9%, Floor 7 85.6%. Mean rounds rose from 6.6 to 10.9 and mean damage taken from 8.0 to 15.1. These are diagnostic baselines, not a claim of class balance; they omit skills and player healing decisions.
- Encounter choices: 25,000 decisions at each Floor 4–7. Combat was 24.1–24.7%, events 18.3–18.7%, NPC 3.4–3.7%; immediate monster repeats stayed below 8.5%. The model uses current pacing defaults and current monsters.
- Loot: 25,000 rolls per floor from weighted current monster loot tables. Rarity was Common 59.6–59.9%, Uncommon 34.7–35.1%, Rare 4.0–4.3%, Strange 1.0–1.3%. The encounter-economy sampler (1,000 encounters/floor) independently estimated 37.2% Uncommon, 3.0–3.1% Rare, and 0.7–1.0% Strange. No Strange inflation or single-item monopoly appeared.
- Economy: the 1,000 encounter samples/floor averaged 8.10–10.08 gold, 22.67–30.07 XP, and 2.54–3.42 incoming damage per enemy action. Gold and XP rose smoothly. This does not model a full multi-floor player's rest frequency or inventory turnover; perform that run-level balance pass when authored content and target player levels are settled.
- Save size: the seven-floor synthetic state measured 8,955 bytes. No migration was added.

## Floor shape and level expectations

Keep the 11×11 grid. Across 10,000 samples the walkable area and stair path remained comparable to current floors. The weighted rooms, encounter pool, event content, and landmarks can make Old Foundations distinct without changing navigation dimensions.

For an initial test, use player levels **5–8** at first arrival to Floors 4–7 (roughly floor + 1). This is an explicit QA scenario, not a measured live progression distribution: there is no released content beyond Floor 3 from which to derive actual arrival levels. Validate XP, returns, and Inn use through a complete playtest before setting unlock timing.

## Unlock checklist

Before opening Floor 4:

1. Add at least one enemy or encounter identity intended for Old Foundations, with tested attacks, counterplay, loot, and the existing art fallback.
2. Add a small, completable event/quest/Nell follow-up that gives the first floor a concrete purpose.
3. Review the return-risk curve; floor-level preview routes currently bottom out at 20% success.
4. Run a real expedition at player levels 5–6 with ordinary gear, consumables, market transactions, save/reload, defeat recovery, and a successful return.
5. Verify QA preview and released screens on 320×740, 390×844, and 430×932 browser viewports.
6. Repeat a content eligibility audit to prove new enemy, loot, quest, and event definitions remain hidden from Floors 1–3.

Unlock one floor at a time. Floor 4 should be a release gate; review combat, return odds, and economy before opening Floor 5, then repeat for 6 and 7. Do not enable the entire band from one readiness result.
