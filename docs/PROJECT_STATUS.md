# Project Health Status

Audit date: 2026-10-06  
Audited baseline: `0ce795a4dcb010bf1a395968f07869f64898388d` (`main` and `origin/main` refs matched at audit start).  
Live game: [GitHub Pages](https://mirpkered.github.io/why-is-there-a-hole-in-the-middle-of-town/)

## Executive summary

**Overall grade: A — Stable Early Build.** Floors 1–3 are backed by broad deterministic preflight coverage, save recovery and migration checks, and a successful last-confirmed Pages deployment. No critical gameplay, save, or content-validation failure was found in this audit. This rating describes the checked-in implementation and automated coverage; it is not a physical-device certification.

The canonical preflight passed **69 check groups**, with zero reported content errors, missing registered runtime assets, or stale generated inventories. The game remains a static, single-player GitHub Pages project. Normal play is capped at Floor 3. Floor 4 is still QA-only and is rated **B — Nearly Ready** in its dedicated readiness report; Floors 5–7 are previews, not release content.

The largest unresolved risks are real iPhone/browser verification, remaining large image payloads, the size of the central app module, and unplayed end-to-end Floor 4 progression. These do not currently block normal Floors 1–3 play based on automated evidence.

## Live game scope

- Playable: Floors 1–3, four classes, turn-based combat and exploration, Town services, equipment and inventory, quests, NPCs, events, market, Inn, achievements, statistics, and settings.
- QA-only: Floors 1–7 generation and preview controls. The normal playable cap is `CURRENT_PLAYABLE_MAX_FLOOR = 3` in `js/depth-config.js`; Floor 3’s lower stair is sealed.
- Saves: local browser storage only; saves do not sync between devices. Current save version is 8.
- Hosting/runtime: static HTML, CSS, and native JavaScript modules on GitHub Pages. No backend, bundler, or runtime framework.

## Stable systems

| Area | Current status and evidence |
|---|---|
| Content and local assets | The validator reports no critical errors; every registered runtime asset exists. Generated art/audio reports are fresh. |
| Dungeon generation | 5,001 playable-depth layouts and 10,000 QA layouts (2,500 each on Floors 4–7) passed deterministic, connectivity, bounds, room, and stair checks. |
| Save/Continue | Sequential migrations v1–v8, round trips, optional-field repair, corrupt-primary backup recovery, raw-save preservation, storage exceptions, repeated candidate reads, active combat, and Continue error/audio isolation are covered. |
| Content systems | Regression coverage includes quests and chain graphs, items/equipment, attack eligibility, statuses, market cycles, Inn events, encounter pacing, loot, Town art, and full-tile accessible Town navigation. |
| Background/art architecture | Exploration and battle registries are separate, variant selection is stable, failed/missing images retain CSS rendering, and Colored/Ink selection shares a resolver. |
| Normal depth gate | Explicit regression keeps normal descent capped at Floor 3 while QA previews remain bounded and opt-in. |

## Live but needs device verification

- **Mobile layout and touch:** Settings provide large text, reduced motion, high-contrast map, and handedness controls. The viewport includes safe-area support and Town tiles remain full-button targets. The live title screen was inspected at 320×740, 390×844, and 430×932: document width matched viewport width and all primary buttons were 48 px tall. Other screens and physical iPhone behavior were not tested in this browser pass.
- **iOS audio session:** `audio-session.js` requests the ambient session type when supported and falls back to the existing Web Audio/HTML media paths. Automated tests verify feature detection and routing. Physical Silent-switch behavior, background/foreground resume, and Home Screen standalone behavior still need device checks.
- **Live deployment:** The live URL loaded to completion in the in-app browser and exposed build tag `town-art-buttons-20261006a`. No browser console errors or warnings appeared during the title-screen check. The latest Pages workflow run could not be freshly queried in this audit.

## Implemented / not yet exposed

- Old Foundations content and scaling support exists for QA Floors 4–7. It does not raise the normal cap.
- Floor 4 has a distinct room weight profile, six authored events, two depth-gated quest chains, Nell reactions, one-time Town return reaction, a differentiated 12-monster encounter table, deeper loot weights, and a provisional return-risk curve.
- Floor 4 remains **B — Nearly Ready** pending a real QA expedition through both quest chains and event outcomes, economy/inventory/return/recovery checks, and mobile/browser verification. Release Floors one at a time; Floors 5–7 lack authored release progression.
- Exploration registry currently has 10 room entries with zero image variants; all use CSS fallbacks. Battle registry has 11 entries including `default`, also with zero image variants and CSS fallback. The receiving architecture is ready; final scene backgrounds are not present.
- DJ Penguin is registered as a single custom mascot asset for the trivia-generator role. It is not currently part of the game’s playable screens.

## Partial systems and technical debt

- `js/app.js` is still the main screen-routing and event module at roughly 109 KB, down 7.3 KB from the audited baseline. Character/Inventory rendering now lives in `js/ui/character.js`; service, dungeon, and QA rendering remain coupled in the app module.
- Screen policy metadata is centralized, while the actual render/action dispatch still uses nested branches in `app.js`; a single full route registry does not exist.
- Image-background registries are ready but empty. Pip Underledger now has an illustrated portrait; other NPC portraits, item illustrations, most interactive-landmark illustrations, and 16 room props use text/CSS fallbacks.
- Saves are local to one browser/device. No cloud sync or cross-device recovery is implemented.
- There is no interactive browser/device regression in the canonical Node preflight. Those checks remain a manual release task for mobile-specific changes.
- Static scan found no `TODO`, `FIXME`, or `HACK` markers in tracked project files and no `eval()`/`new Function()` use in the runtime modules. `app.js` uses `innerHTML` for templates; player/content strings in audited dynamic templates are escaped, while remaining template inputs are controlled definitions/state. Keep this boundary in future UI work.

## Known issues

1. No physical iPhone verification was performed in this audit, including Silent mode, Home Screen launch, background/foreground resume, orientation changes, and service/dungeon touch hit-testing. Browser sizing covered only the live title screen.
2. Several user-drawn runtime PNGs remain large for mobile delivery. The largest current files include `home-screen-art.png` (about 2.6 MiB; no runtime reference found), `wooden-crate-colored.png` (about 1.7 MiB), `settings-button-colored.png` (about 1.7 MiB after compression), `character-button-colored.png` (about 1.4 MiB), and `statistics-button-colored.png` (about 1.2 MiB). The unreferenced home-screen file is only an orphan candidate; source/user artwork was not deleted.
3. Floor 4 content has not had a full browser-played expedition. Its automated combat/economy models do not replace playtesting with ordinary gear and realistic resource decisions.
4. Town character/NPC and item art coverage is intentionally incomplete; fallback presentation remains usable.

## Floor status

| Floors | Status | Notes |
|---|---|---|
| 1–3 | Playable | Normal cap remains 3. Existing rooms, events, encounters, saves, and return paths are covered by preflight. |
| 4 | QA preview; not unlocked | **B — Nearly Ready.** Six events and two gated chains exist; manual progression, economy/inventory, return/recovery, and device checks are remaining release gates. |
| 5–7 | QA preview; not authored for release | Generation and shared scaling are verified. No floor-specific event/quest progression or expedition validation. |

Floor 4 readiness details and exact release checklist: [FLOOR_4_7_READINESS.md](FLOOR_4_7_READINESS.md).

## Content coverage

| Content | Current count |
|---|---:|
| Monsters | 12 |
| Items | 48: 32 equipment, 3 consumables, 9 trade goods, 3 quest items, 1 junk item |
| Quests | 35 definitions across 12 named chains plus standalone quests |
| Rooms | 10 |
| Dungeon events | 26 |
| NPCs | 5: 3 Town, 2 dungeon |
| Achievements | 20 |
| Room props | 28 |

## Art coverage

The generated inventory is [ART_BACKLOG.md](ART_BACKLOG.md); refresh it with `node tools/art-report.mjs --write`.

- Enemies: all 12 have registered custom art; some use paired Ink/Colored assets and some have a single style asset.
- Town: all 8 art-led destinations have paired custom assets and accessible labels.
- Room props: 12 paired custom illustrations; 16 CSS/text fallbacks.
- NPCs: five registered NPCs use fallback presentation; portraits are optional and absent.
- Items: all 48 remain playable without item-specific art; item art is optional and absent.
- DJ Penguin: one custom single-style mascot asset, registered but not presented in gameplay.
- Exploration/battle backgrounds: registries exist, no image variants are registered; CSS fallback is active.
- Interactive landmarks: metadata/fallback presentation exists; no final custom illustration set is registered.

## Audio coverage

The generated inventory is [AUDIO_INVENTORY.md](AUDIO_INVENTORY.md); refresh with `node tools/audio-report.mjs --write`.

- 42 runtime tracks are registered and present: one battle theme, 18 dungeon tracks, Inn 3, Store 5, Statistics 6, Character 5, and Settings 4.
- Quest Board and Achievements pools are intentionally empty; silence is supported. There are 40 source/master records, all mapped to runtime files. No standalone runtime SFX tracks are registered; SFX routing/settings infrastructure exists.
- Location tracks are one-shot and stop on context exit. Dungeon tracks sequence; battle music loops. Pools do not consume gameplay RNG.
- Ambient iOS audio-session behavior is feature-detected; physical device/Silent-switch behavior still needs verification.

## Save and Continue

- Current schema: v8; no migration is required for the current presentation registries or QA floor support.
- The loader validates/migrates a candidate before accepting it, attempts the last valid backup when needed, and preserves raw malformed primary data in a recovery key.
- Continue reports a player-facing failure instead of silently ignoring load errors, is guarded against repeat activation, and does not wait for audio or optional asset preparation.
- Over-cap normal saves resume safely in Town while retaining deeper maps/history.
- The current preflight synthetic Floors 1–7 fixture serialized to 9,069 bytes; a separate fresh-state sample was about 3.5 KB. These fixtures are not a formal save-size maximum.
- Saves are device-local. See [GAME_STATE.md](GAME_STATE.md) for the actual field groups and migration table.

## Mobile and accessibility

Implemented settings include large text, reduced motion, high-contrast map, sprite style, threat-display mode, music/SFX toggles and levels, and touch handedness. Keyboard movement remains W/Up, A/Left, S/Down, D/Right; handedness affects touch controls only. Town art buttons preserve accessible names and full-tile interaction. The live title screen had no horizontal overflow at 320×740, 390×844, or 430×932, and its buttons measured 48 px tall. Service, dungeon, combat, text-large, focus, orientation, and safe-area behavior still need browser/device checks.

## Tests and validation

Command: `node tests/run.mjs`  
Result: **69 check groups passed.**

Coverage includes syntax, content/assets and generated inventories, save migrations/recovery/Continue, 5,001 playable maps, 10,000 deep maps, 400 deep return/resume routes, 1,440 basic-only deep combat samples, 25,000 encounter decisions and loot selections per representative depth, 25,000 room-weight selections per Old Foundations floor, status and attack pools, four-class stat generation (50,000 each), 50,000 generated names, 10,000 market cycles, 25,000 Inn rest attempts, and UI/audio regressions. These are deterministic/model-based checks; they do not simulate a full expedition or certify browser rendering.

## Deployment

- Baseline: `0ce795a4dcb010bf1a395968f07869f64898388d`; `main` and `origin/main` refs matched when inspected.
- Live check: URL loaded successfully in the in-app browser, document reached `complete`, and build tag was `town-art-buttons-20261006a`; title-screen console showed no errors or warnings. Prior confirmed Pages workflow for this baseline completed validation and deployment.
- A fresh GitHub Actions query and fetch could not be completed in this project mirror: `.git` is read-only and outbound Git/network checks were unavailable. No deployment was initiated by this audit.

## Top five priorities

1. **Run a real iPhone/Safari and Home Screen pass.** Verify Continue, orientation, foreground/background resume, touch/focus, 320×740 / 390×844 / 430×932 layouts, and supported Silent-mode behavior.
2. **Playtest Floor 4 end to end in QA.** Exercise both quest chains, all six events, ordinary gear, healing/Inn costs, inventory capacity, return interruptions, defeat recovery, and save/Continue before considering release.
3. **Measure the remaining mobile art cost on device.** The targeted lossless pass is complete: 24 of 59 registered PNG derivatives were re-encoded after verifying identical RGBA pixels and dimensions. It saved 1,797,246 bytes (9.5% across the optimized files; about 5.9% of the 29.0 MiB image PNG set). Source files were untouched. No resize was made; decoded pixel counts are unchanged. Browser performance-trace tools and a local preview were unavailable, so real-device transfer/decode timing remains open.
4. **Continue reducing `app.js` responsibility in bounded slices.** Character/Inventory rendering is the first extracted UI boundary. The app now has one render call for this screen instead of generating and discarding a second legacy view. Service and dungeon boundaries remain candidates for separately tested follow-up slices.
5. **Close art gaps where they improve play readability.** Highest-impact next illustrations are NPC portraits, item icons, survey/landmark art, and fallback props; none are required for current playability.

## Risk matrix

| Risk | Likelihood | Impact | Current handling |
|---|---|---|---|
| iOS/browser-specific Continue, audio, or viewport issue | Medium | High | Automated regressions cover data and routing, but no physical-device run was performed here. |
| Large runtime image payloads cause slow mobile transfer/decode | Medium | Medium | 24 lossless derivatives saved 1.80 MB; the largest remaining images exceed 1.4 MiB and device timing is unmeasured. |
| Future refactor causes regressions in central app rendering/routing | Medium | Medium | Character output has focused regression coverage and the full preflight passes; app.js remains a large integration point. |
| Floor 4 is released before its quest/return/economy loop is field-tested | Medium | High | Cap remains 3; dedicated checklist marks manual QA and mobile verification as release gates. |
| Local-storage loss or browser/device change loses access to a save | Low–Medium | High | Backup and raw recovery preserve same-browser failures; saves do not sync across devices. |

## Final status

The current Floors 1–3 game is in **A — Stable Early Build** condition by the stated automated and repository evidence. The release cap is intact, the canonical preflight is green, and the deployed title screen loaded at all three checked mobile viewport sizes. Treat physical iPhone behavior and non-title screens as unverified until a real device/browser pass is recorded. Floor 4 remains QA-only and is **B — Nearly Ready**; it must not be unlocked until its authored progression and mobile release checklist are completed.
