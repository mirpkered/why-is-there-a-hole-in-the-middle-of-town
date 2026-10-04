import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};

const { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_RECOVERY_KEY, SAVE_VERSION, freshState, generateFloorMap, validateFloorMap, analyzeFloorMap, saveState, loadState } = await import('../js/state.js?preflight');
const { items, monsters, lootTables, floorEncounterTable, innEvents, shopStock } = await import('../js/data.js?preflight');
const { makeMarketCycle, currentSellValue, simulateMarkets, simulateInnEvents } = await import('../js/town-economy.js?preflight');
const { roomProps: props } = await import('../js/room-visuals.js?preflight');
const { validateContent } = await import('../js/content-validation.js?preflight');
const { validateQuestTemplate, questObjectiveTemplates } = await import('../js/quest-templates.js?preflight');
const { validWeightedRows, weightedChoice } = await import('../js/random-utils.js?preflight');
const { applyStatus, tickStatuses } = await import('../js/status-effects.js?preflight');
const { scaleEnemy } = await import('../js/enemy-scaling.js?preflight');
const { selectWithHistory, paceEncounterChance, chooseEnemyAttack, monsterFamilies } = await import('../js/encounter-director.js?preflight');
const game = await import('../js/game.js?preflight');

let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`✓ ${name}`); }

check('content definitions have no critical validation errors', () => {
  const report = validateContent();
  assert.equal(report.errorCount, 0, JSON.stringify(report.errors));
  assert.equal(report.warningCount, 0, JSON.stringify(report.warnings));
});

check('all registered local runtime assets exist', () => {
  const refs = [];
  for (const monster of Object.values(monsters)) refs.push(monster.sprite?.src, monster.sprite?.ink, monster.sprite?.colored);
  for (const prop of Object.values(props)) refs.push(prop.ink, prop.colored);
  for (const path of ['assets/icons/favicon-16.png', 'assets/icons/favicon-32.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png']) refs.push(path);
  const manifest = JSON.parse(readFileSync(resolve('site.webmanifest'), 'utf8'));
  for (const icon of manifest.icons || []) refs.push(icon.src);
  for (const match of readFileSync(resolve('index.html'), 'utf8').matchAll(/(?:href|src)="(assets\/[^"?#]+)/g)) refs.push(match[1]);
  for (const file of ['css/styles.css', 'css/mechanics.css']) for (const match of readFileSync(resolve(file), 'utf8').matchAll(/url\(['"]?(assets\/[^)'"?#]+)/g)) refs.push(match[1]);
  const audioText = readFileSync(resolve('js/audio.js'), 'utf8');
  for (const match of audioText.matchAll(/(?:src|path):\s*['"](assets\/[^'"]+)['"]/g)) refs.push(match[1]);
  for (let number = 4; number <= 21; number++) refs.push(`assets/audio/music/dungeon/dungeon-${String(number).padStart(2, '0')}.mp3`);
  for (const path of new Set(refs.filter(Boolean))) assert.ok(existsSync(resolve(path)), `Missing asset: ${path}`);
});

check('1,000 seeds at each playable depth generate valid, varied bounded floors', () => {
  const signatures = new Set(), entrances = new Set(), exits = new Set(); let minWalkable = Infinity, maxWalkable = 0, minRoute = Infinity, maxRoute = 0;
  for (let seed = 1; seed <= 1000; seed++) for (let floor = 1; floor <= 3; floor++) {
    const map = generateFloorMap(seed * 7919, floor), report = validateFloorMap(map), repeated = generateFloorMap(seed * 7919, floor);
    assert.ok(report.valid, `seed ${seed}, floor ${floor}: ${report.errors.join(', ')}`);
    assert.deepEqual(repeated, map, 'same seed/floor must reproduce the layout');
    assert.ok(map.upStairs[0] > 0 && map.upStairs[1] > 0 && map.upStairs[0] < map.width - 1 && map.upStairs[1] < map.height - 1);
    assert.ok(map.downStairs[0] > 0 && map.downStairs[1] > 0 && map.downStairs[0] < map.width - 1 && map.downStairs[1] < map.height - 1);
    assert.ok(map.walls.some(([x, y]) => x === 0 && y === map.upStairs[1]), 'west boundary remains closed');
    const metrics = analyzeFloorMap(map); minWalkable = Math.min(minWalkable, metrics.walkable); maxWalkable = Math.max(maxWalkable, metrics.walkable); minRoute = Math.min(minRoute, metrics.shortestStairPath); maxRoute = Math.max(maxRoute, metrics.shortestStairPath);
    entrances.add(`${floor}:${map.upStairs.join(',')}`); exits.add(`${floor}:${map.downStairs.join(',')}`);
    signatures.add(`${floor}:${map.walls.map(cell => cell.join(',')).join(';')}:${map.downStairs.join(',')}`);
  }
  assert.ok(signatures.size > 2900, `expected per-run layout variation, got ${signatures.size}`); assert.ok(entrances.size > 30, 'entrance stairs should vary between floors');
  console.log(`  metrics: ${signatures.size} distinct maps; ${entrances.size} entrance and ${exits.size} exit positions; walkable ${minWalkable}–${maxWalkable}; stair path ${minRoute}–${maxRoute}`);
});

check('weighted selection handles invalid rows and samples eligible entries', () => {
  assert.equal(validWeightedRows([{weight: 0}, {weight: -1}, {weight: 2}]).length, 1);
  assert.equal(weightedChoice([], () => 0), null);
  const counts = new Map([['a', 0], ['b', 0], ['c', 0]]), rows = [...counts.keys()].map(id => ({id, weight: 1}));
  for (let i = 0; i < 1000; i++) { const id = weightedChoice(rows, Math.random).id; counts.set(id, counts.get(id) + 1); }
  assert.ok([...counts.values()].every(count => count > 250 && count < 420), `unexpected uniform distribution: ${JSON.stringify([...counts])}`);
  // Exercise deterministic boundaries.
  assert.equal(weightedChoice(rows, () => 0).id, 'a');
  assert.equal(weightedChoice(rows, () => .999).id, 'c');
});

check('encounter and loot selectors complete 1,000 valid selections at each depth band', () => {
  let seed = 27491; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (const floor of [1, 2, 3, 5, 10]) {
    const encounterRows = (floorEncounterTable[floor] || floorEncounterTable[3]).filter(row => monsters[row.id]?.minDepth <= floor);
    const encounters = new Map(), drops = new Map();
    for (let i = 0; i < 1000; i++) {
      const row = selectWithHistory(encounterRows, i ? [{type: 'monster', id: [...encounters.keys()].at(-1)}] : [], entry => monsters[entry.id].id, random, .55);
      assert.ok(row && monsters[row.id]); encounters.set(row.id, (encounters.get(row.id) || 0) + 1);
      const table = lootTables[monsters[row.id].lootTable], drop = weightedChoice(table, random);
      assert.ok(drop && items[drop.item]); drops.set(drop.item, (drops.get(drop.item) || 0) + 1);
    }
    assert.ok(encounters.size > 1, `floor ${floor} encounter pool collapsed`);
    assert.ok(drops.size > 1, `floor ${floor} loot pool collapsed`);
  }
});

check('encounter pacing is bounded, repeats remain possible, and AI chooses valid attacks', () => {
  const chances = paceEncounterChance({combat: .2, event: .1, emptySteps: 100, encounterStreak: 10});
  assert.ok(chances.combat > 0 && chances.event > 0 && chances.quiet > 0);
  assert.ok(Math.abs(chances.combat + chances.event + chances.quiet - 1) < 1e-9);
  const rows = [{id: 'rat', weight: 1}, {id: 'goose', weight: 1}], history = [{type: 'monster', id: 'rat'}];
  assert.ok(['rat', 'goose'].includes(selectWithHistory(rows, history, row => row.id, () => .01).id));
  const attacks = monsters.kungFuGoose.attacks;
  assert.ok(attacks.some(row => row.id === chooseEnemyAttack('evasive', attacks, {hp: 3, maxHp: 20}, () => .4).id));
});

check('quest templates accept possible targets and reject impossible ones', () => {
  assert.ok(Object.keys(questObjectiveTemplates).length >= 7);
  assert.deepEqual(validateQuestTemplate({type: 'kill', monsterId: 'rat', quantity: 1}, {monsters, maxPlayableDepth: 3}), []);
  assert.deepEqual(validateQuestTemplate({type: 'kill', family: 'gas', quantity: 1, minDepth: 3, maxDepth: 3}, {monsters, families: monsterFamilies, maxPlayableDepth: 3}), []);
  assert.deepEqual(validateQuestTemplate({type: 'reach', floor: 3}, {monsters, maxPlayableDepth: 3}), []);
  assert.ok(validateQuestTemplate({type: 'kill', monsterId: 'fire-worm', quantity: 1, maxDepth: 1}, {monsters, maxPlayableDepth: 3}).length);
  assert.ok(validateQuestTemplate({type: 'reach', floor: 10, quantity: 1}, {monsters, maxPlayableDepth: 3}).length);
});

check('status effects refresh duration, preserve stronger magnitude, and tick once', () => {
  const player = {hp: 10, statusEffects: {}};
  assert.ok(applyStatus(player, 'burn', 2, 3, 'earthworm'));
  applyStatus(player, 'burn', 1, 1, 'weak-source');
  assert.equal(player.statusEffects.burn.duration, 2);
  assert.equal(player.statusEffects.burn.magnitude, 3);
  assert.equal(tickStatuses(player).at(0).damage, 3);
  assert.equal(player.hp, 7);
  assert.equal(player.statusEffects.burn.duration, 1);
  tickStatuses(player);
  assert.equal(player.statusEffects.burn, undefined);
});

check('enemy scaling preserves base values and increases by depth with a spawn snapshot', () => {
  for (const key of Object.keys(monsters)) {
    const base = scaleEnemy(monsters[key], 1), deep = scaleEnemy(monsters[key], 10);
    assert.equal(base.monsterId, monsters[key].id);
    assert.ok(deep.maxHp >= base.maxHp);
    assert.ok(deep.encounterLevel > base.encounterLevel);
    assert.ok(deep.attacks.every(a => a.maxDamage >= 0 && a.maxDamage >= a.minDamage));
  }
});

check('level-based enemy attack pools unlock valid moves and preserve weighted identity', () => {
  const levels=[1,3,5,8,12];let seed=49271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(const monster of Object.values(monsters))for(const level of levels){
    const instance=scaleEnemy(monster,monster.minDepth,null,level),counts=new Map(instance.attacks.map(attack=>[attack.id,0]));
    assert.ok(instance.attacks.length>0,`${monster.id} has no eligible attacks at ${level}`);
    assert.ok(instance.attacks.every(attack=>(attack.unlockLevel||1)<=instance.encounterLevel),`${monster.id} selected a locked attack at ${level}`);
    assert.ok((monster.attacks||[]).filter(attack=>(attack.unlockLevel||1)>instance.encounterLevel).every(attack=>!instance.attacks.some(open=>open.id===attack.id)));
    for(let i=0;i<1000;i++){const chosen=chooseEnemyAttack(instance.aiProfile,instance.attacks,{hp:14,maxHp:24},random);assert.ok(chosen);counts.set(chosen.id,counts.get(chosen.id)+1)}
    for(const attack of instance.attacks)assert.ok(counts.get(attack.id)>0,`${monster.id}/${attack.id} unlocked at ${level} but never selected`);
  }
  for(const key of ['heartAttack','porkscrew','rottenApple','pooGas'])assert.ok(monsters[key].attacks.length>=3);
  assert.ok(scaleEnemy(monsters.heartAttack,2,null,8).attacks.some(a=>a.id==='cardiac-arrest'));
  assert.ok(scaleEnemy(monsters.rottenApple,2,null,3).attacks.every(a=>a.effect!=='poison'));
  assert.ok(scaleEnemy(monsters.rottenApple,2,null,4).attacks.some(a=>a.effect==='poison'));
  const ratEarly=game.qaAttackPoolReport('rat',[1],1000)[0],ratMid=game.qaAttackPoolReport('rat',[5],1000)[0],gasHigh=game.qaAttackPoolReport('poo-gas',[8],1000)[0];
  const pct=(report,id)=>Number.parseFloat(report.selected[id]);
  assert.ok(pct(ratEarly,'nibble')>=60&&pct(ratEarly,'nibble')<=73,`rat basic attack weight drifted: ${JSON.stringify(ratEarly.selected)}`);
  assert.ok(pct(ratMid,'cornered-bite')>=15&&pct(ratMid,'cornered-bite')<=30,`rat mid-level attack weight drifted: ${JSON.stringify(ratMid.selected)}`);
  assert.ok(pct(gasHigh,'room-clearer')>=5&&pct(gasHigh,'room-clearer')<=20,`Poo Gas signature attack weight drifted: ${JSON.stringify(gasHigh.selected)}`);
  console.log(`  attack pools: ${Object.keys(monsters).length} monsters × ${levels.length} levels × 1,000 choices; locked moves absent and eligible pools sampled`);
});

check('Poo Gas resists physical damage and Air Freshener has focused combat behavior', () => {
  storage.clear();game.setState(freshState());game.startGame('Fresh Air Tester','Fighter');game.qaSpawnMonster('poo-gas',3,null,6);
  const cloud=game.state.combat,initialHp=cloud.hp,normalAttack=game.state.player.attack-cloud.defense;
  const result=game.attack();assert.match(result,/passes through most of the cloud/);assert.ok(initialHp-cloud.hp>0&&initialHp-cloud.hp<normalAttack);
  game.addItem('air-freshener',1);const hpBeforeSpray=cloud.hp;const spray=game.useItem('air-freshener');
  assert.match(spray,/thins the gas cloud/);assert.ok(cloud.hp<hpBeforeSpray);assert.equal(game.countItem('air-freshener'),0);assert.equal(cloud.physicalResistanceReductionTurns,1);
  game.setState(freshState());game.startGame('Wrong Target Tester','Fighter');game.qaSpawnMonster('rat',1,null,1);game.addItem('air-freshener',1);
  const rat=game.state.combat,ratHp=rat.hp,playerHp=game.state.player.hp,unused=game.useItem('air-freshener');
  assert.match(unused,/no special effect/);assert.equal(rat.hp,ratHp);assert.equal(game.state.player.hp,playerHp);assert.equal(game.countItem('air-freshener'),1);
});

check('all supported historical save versions migrate sequentially and preserve player progress', () => {
  for (let version = 1; version < SAVE_VERSION; version++) {
    storage.clear();
    const legacy = freshState();
    legacy.player = {name: `Legacy ${version}`, class: 'Fighter', hp: 12, maxHp: 24, mp: 2, maxMp: 4, baseMaxHp: 24, baseMaxMp: 4, effects: {}};
    legacy.quests = {active: [], completed: [], available: []};
    legacy.saveVersion = version;
    storage.set(SAVE_KEY, JSON.stringify(legacy));
    const restored = loadState();
    assert.equal(restored?.saveVersion, SAVE_VERSION, `version ${version}`);
    assert.equal(restored.player.name, `Legacy ${version}`);
    assert.ok(restored.town.flags && Array.isArray(restored.dungeon.encounterHistory));
  }
});

check('legacy v4 active combat migrates with its health percentage intact', () => {
  storage.clear(); const legacy = freshState(); legacy.player = {name: 'Fight Migrant', class: 'Fighter', hp: 12, maxHp: 24, mp: 2, maxMp: 4, effects: {}};
  legacy.dungeon.floor = 3; legacy.combat = {monsterId: 'rat', hp: 4, maxHp: 8, x: legacy.dungeon.x, y: legacy.dungeon.y, guard: false, burnTurns: 0}; legacy.saveVersion = 4;
  storage.set(SAVE_KEY, JSON.stringify(legacy)); const restored = loadState();
  assert.equal(restored.saveVersion, SAVE_VERSION); assert.equal(restored.combat.monsterId, 'rat');
  assert.equal(restored.combat.hp / restored.combat.maxHp, .5); assert.equal(restored.combat.variantId, null);
});

check('save/load round trips preserve generated maps, settings, quests, and active combat', () => {
  storage.clear(); const state = freshState();
  state.player = {name: 'Snapshot', class: 'Wizard', hp: 7, maxHp: 17, mp: 3, maxMp: 12, effects: {}, statusEffects: {burn: {id: 'burn', duration: 2, magnitude: 2, source: 'worm'}}};
  state.settings.musicVolume = .41; state.dungeon.floor = 2; state.dungeon.map = state.dungeon.maps[2]; state.dungeon.x = state.dungeon.map.upStairs[0]; state.dungeon.y = state.dungeon.map.upStairs[1];
  state.combat = scaleEnemy(monsters.rat, 2); state.combat.hp = Math.max(1, state.combat.maxHp - 2); state.combat.aiState = {turns: 3};
  assert.ok(saveState(state)); const restored = loadState();
  assert.deepEqual(restored.dungeon.maps, state.dungeon.maps); assert.equal(restored.settings.musicVolume, .41);
  assert.equal(restored.combat.encounterLevel, state.combat.encounterLevel); assert.equal(restored.combat.hp, state.combat.hp);
  assert.deepEqual(restored.combat.aiState, {turns: 3}); assert.deepEqual(restored.player.statusEffects, state.player.statusEffects);
  for (let i = 0; i < 100; i++) { restored.meta.roundTrip = i; assert.ok(saveState(restored)); assert.equal(loadState().meta.roundTrip, i); }
});

check('invalid primary save recovers from the last valid backup without discarding raw data', () => {
  storage.clear(); const first = freshState(); first.player = {name: 'Backup', class: 'Rogue', hp: 10, maxHp: 19, mp: 4, maxMp: 6, effects: {}};
  saveState(first); const second = structuredClone(first); second.town.gold = 99; saveState(second);
  storage.set(SAVE_KEY, '{broken json'); const restored = loadState();
  assert.equal(restored.player.name, 'Backup'); assert.equal(restored.meta.recoveredFromBackup, true);
  assert.equal(storage.get(SAVE_RECOVERY_KEY), '{broken json'); assert.ok(storage.has(SAVE_BACKUP_KEY));
});

check('missing optional save containers are repaired without losing core progress', () => {
  storage.clear(); const partial = freshState(); partial.player = {name: 'Partial', class: 'Cleric', hp: 8, maxHp: 22, mp: 2, maxMp: 9, effects: {}};
  delete partial.quests; delete partial.dungeon.explored; delete partial.dungeon.visited; delete partial.dungeon.rooms; delete partial.dungeon.encounterHistory; delete partial.town.flags; delete partial.town.shop;
  storage.set(SAVE_KEY, JSON.stringify(partial)); const restored = loadState();
  assert.equal(restored.player.name, 'Partial'); assert.deepEqual(restored.quests.active, []);
  assert.ok(Array.isArray(restored.dungeon.explored)); assert.ok(restored.dungeon.visited && restored.town.shop && restored.town.flags);
});

check('10,000 independent stat rolls per class cover legal ranges without violations', () => {
  const expectedStats=['str','agi','mind','vit'];
  for(const cls of Object.keys(game.STARTING_STAT_RANGES)){
    const ranges=game.STARTING_STAT_RANGES[cls],seen=Object.fromEntries(expectedStats.map(stat=>[stat,new Set()])),sums=Object.fromEntries(expectedStats.map(stat=>[stat,0]));
    for(let i=0;i<10000;i++){const roll=game.rollStartingStats(cls);for(const stat of expectedStats){const [min,max]=ranges[stat];assert.ok(roll[stat]>=min&&roll[stat]<=max,`${cls}.${stat} out of range: ${roll[stat]}`);seen[stat].add(roll[stat]);sums[stat]+=roll[stat]}}
    for(const stat of expectedStats){const [min,max]=ranges[stat];assert.equal(Math.min(...seen[stat]),min);assert.equal(Math.max(...seen[stat]),max);assert.equal(seen[stat].size,max-min+1,`${cls}.${stat} missed a legal value`)}
    assert.deepEqual(game.rollStartingStats(cls,()=>0),Object.fromEntries(expectedStats.map(stat=>[stat,ranges[stat][0]])));
    assert.deepEqual(game.rollStartingStats(cls,()=>.999999),Object.fromEntries(expectedStats.map(stat=>[stat,ranges[stat][1]])));
    console.log(`  ${cls}: ${expectedStats.map(stat=>`${stat} ${Math.min(...seen[stat])}–${Math.max(...seen[stat])}, avg ${(sums[stat]/10000).toFixed(2)}`).join('; ')}`)
  }
});

check('new character full-resource initialization and key game flows remain callable', () => {
  for (const cls of Object.keys(game.STARTING_CLASSES)) {
    const stats=game.rollStartingStats(cls);game.setState(freshState()); game.startGame('Tester', cls,stats);
    assert.deepEqual([game.state.player.baseStr,game.state.player.baseAgi,game.state.player.baseMind,game.state.player.baseVit],[stats.str,stats.agi,stats.mind,stats.vit]);
    assert.equal(game.state.player.hp, game.state.player.maxHp, cls);
    assert.equal(game.state.player.mp, game.state.player.maxMp, cls);
    const resources=game.deriveStartingResources(cls,stats);
    assert.equal(game.state.player.maxHp,resources.hp+2,'Patched Coat HP modifier included after derived maximum');
    assert.equal(game.state.player.maxMp,resources.mp);
    game.enterDungeon(); const start = [game.state.dungeon.x, game.state.dungeon.y, game.state.player.turns];
    game.move('left');
    if (game.state.dungeon.x !== start[0]) assert.equal(game.state.player.turns, start[2] + 1);
    else assert.equal(game.state.player.turns, start[2]);
  }
  game.setState(freshState()); game.startGame('Shop Tester', 'Fighter');
  const before = game.storeStock().map(item => item.id); game.persist(); const reloaded = loadState();
  game.setState(reloaded); assert.deepEqual(game.storeStock().map(item => item.id), before);
  assert.ok(['healing-tonic', 'rusty-sword', 'leather-armor'].every(id => before.includes(id)));
  const rotation = game.state.town.shop.rotation; game.enterDungeon(); game.returnTown(); assert.equal(game.state.town.shop.rotation, rotation + 1);
  game.returnTown(); assert.equal(game.state.town.shop.rotation, rotation + 1, 'town visits cannot advance the market');
  assert.ok(['healing-tonic', 'rusty-sword', 'leather-armor'].every(id => game.storeStock().some(item => item.id === id)));
  for (let i = 0; i < 30; i++) {
    game.enterDungeon(); game.returnTown(); const stock = game.storeStock().map(item => item.id);
    assert.equal(new Set(stock).size, stock.length); assert.ok(['healing-tonic', 'rusty-sword', 'leather-armor'].every(id => stock.includes(id)));
    for (const id of stock) assert.ok(game.buyPrice(id) >= 1);
  }
  const goldBefore = game.state.town.gold, purchase = game.buyItem('healing-tonic');
  assert.ok(purchase.ok); assert.ok(game.state.town.gold < goldBefore);
  game.state.dungeon.map = generateFloorMap(game.state.dungeon.seed, 1); game.state.dungeon.x = -1;
  assert.ok(game.returnPlan() && typeof game.returnPlan().ok === 'boolean');
});

check('notable gear provenance persists while ordinary stackables remain aggregate stacks', () => {
  storage.clear(); game.setState(freshState()); game.startGame('History Tester', 'Cleric');
  let acquired = null; const unsubscribe = game.onGameEvent('itemAcquired', event => { acquired = event; });
  const source = {sourceType: 'monster', sourceName: 'Very Angry Kung Fungoose', acquiredFloor: 3};
  assert.ok(game.addItem('goose-proof-helmet', 1, source)); assert.equal(acquired.id, 'goose-proof-helmet');
  assert.deepEqual(game.state.inventory.find(entry => entry.id === 'goose-proof-helmet').provenance, source);
  assert.ok(game.addItem('cave-salt', 1, source)); assert.equal(game.state.inventory.find(entry => entry.id === 'cave-salt').provenance, undefined);
  game.persist(); assert.deepEqual(loadState().inventory.find(entry => entry.id === 'goose-proof-helmet').provenance, source);
  unsubscribe();
});


check('town market cycles persist stock and bounded sell demand without buyback profit', () => {
  const first = makeMarketCycle(99123, 7, shopStock, items), same = makeMarketCycle(99123, 7, shopStock, items);
  assert.deepEqual(first, same, 'same seed and cycle must restore identical stock/prices');
  assert.equal(first.rotatingIds.length, 4);
  const sim = simulateMarkets({ runs: 1000, seed: 7721, stockIds: shopStock, items });
  assert.ok(Object.values(sim.appearances).every(count => count > 0), 'all rotating items should appear');
  assert.ok(sim.demandCounts.low > 0 && sim.demandCounts.normal > 0 && sim.demandCounts.high > 0);
  assert.ok(sim.everyCycleChangesSomeStock);
  assert.ok(sim.coreStockAlwaysPresent);
  assert.ok(sim.minSell >= 1 && sim.maxSell > sim.minSell);
  for (const item of Object.values(items).filter(item => item.sellValue > 0 && item.buyValue > 0)) {
    for (const state of ['low','normal','high']) {
      const market = { demand: { [item.id]: { state, multiplier: {low:.82,normal:1,high:1.2}[state] } } };
      const current = currentSellValue(item, market, .2, Math.max(1, Math.floor(item.buyValue * .92)));
      assert.ok(current <= Math.max(1, Math.floor(item.buyValue * .92)), `${item.id} resale must not exceed its discounted purchase price`);
    }
  }
  game.setState(freshState()); game.startGame('Market Tester','Fighter');
  const stockBefore = game.storeStock().map(item => item.id), demandBefore = structuredClone(game.marketState().demand);
  game.persist(); game.setState(loadState());
  assert.deepEqual(game.storeStock().map(item => item.id), stockBefore);
  assert.deepEqual(game.marketState().demand, demandBefore);
  const cycle = game.marketState().cycle;
  game.enterDungeon(); game.returnTown();
  assert.equal(game.marketState().cycle, cycle + 1);
  for (let i=0;i<1000;i++) game.qaRestockMarket();
  const thousand = game.qaMarketSimulation(1000);
  assert.ok(thousand.coreStockAlwaysPresent && thousand.everyCycleChangesSomeStock);
});

check('inn events require a paid partial rest; Well Rested boosts and consumes combat XP charges', () => {
  const sim = simulateInnEvents(innEvents, 10000);
  assert.ok(sim.observedRate > .23 && sim.observedRate < .27, `unexpected event rate ${sim.observedRate}`);
  assert.equal(sim.fullRestEvents, 0);
  assert.ok(Object.values(sim.counts).every(count => count > 0));

  game.setState(freshState()); game.startGame('Inn Tester','Fighter');
  const originalGold = game.state.town.gold;
  game.qaSetWellRestedBattles(2);
  const full = game.restAtInn('well-rested');
  assert.equal(full.ok,false); assert.match(full.message,/fully rested/i);
  assert.equal(game.state.town.gold,originalGold); assert.equal(game.state.town.innEffects.wellRestedBattles,2);

  game.state.player.hp--;
  const rested = game.restAtInn('well-rested');
  assert.equal(rested.ok,true); assert.equal(game.state.town.gold,originalGold-5);
  assert.equal(game.state.player.hp,game.state.player.maxHp); assert.equal(game.state.town.innEffects.wellRestedBattles,3);
  game.state.player.attack=100; game.qaSpawnMonster('rat',1,null,1); game.state.combat.hp=1;
  const result=game.attack();
  assert.match(result,/defeated/i); assert.equal(game.state.town.innEffects.wellRestedBattles,2);

  game.state.player.hp--; game.qaForceInnEvent('good-breakfast');
  const defense=game.state.player.temporaryEffects.defense;
  game.state.player.hp--; game.qaForceInnEvent('good-breakfast');
  assert.equal(game.state.player.temporaryEffects.defense.value,defense.value);
  assert.equal(game.state.player.temporaryEffects.defense.remaining,2);
  game.persist(); game.setState(loadState());
  assert.equal(game.state.town.innEffects.wellRestedBattles,2);
  assert.equal(game.state.player.temporaryEffects.defense.remaining,2);
  game.qaClearInnEffects();
});

check('100 generated three-floor maps route safely to town and interrupted returns stay on-route', () => {
  let interrupted = 0;
  for (let seed = 1; seed <= 100; seed++) {
    game.setState(freshState()); game.startGame('Route Tester', 'Rogue'); const d = game.state.dungeon;
    d.maps = Object.fromEntries([1, 2, 3].map(floor => [floor, generateFloorMap(seed * 3571, floor)]));
    d.deepestFloor = 3; d.floor = 3; d.map = d.maps[3]; d.x = d.map.upStairs[0]; d.y = d.map.upStairs[1];
    d.explored = [1, 2, 3].flatMap(floor => { const map = d.maps[floor], walls = new Set(map.walls.map(([x, y]) => `${x},${y}`)); const cells = []; for (let y = 1; y < map.height - 1; y++) for (let x = 1; x < map.width - 1; x++) if (!walls.has(`${x},${y}`)) cells.push(`${floor}:${x},${y}`); return cells; });
    const plan = game.returnPlan(); assert.ok(plan.ok, `return path failed for seed ${seed}`); assert.ok(plan.route.some(cell => cell.floor === 2) && plan.route.some(cell => cell.floor === 1));
    if (seed <= 20) {
      const result = game.attemptReturn('interrupt'); assert.ok(result.interrupted); assert.ok(game.state.combat);
      assert.ok(plan.route.some(cell => cell.floor === d.floor && cell.x === d.x && cell.y === d.y), `interruption left route on seed ${seed}`);
      const map = d.map; assert.ok(d.x > 0 && d.y > 0 && d.x < map.width - 1 && d.y < map.height - 1 && !map.walls.some(([x, y]) => x === d.x && y === d.y)); interrupted++;
    }
  }
  assert.equal(interrupted, 20);
});

console.log(`Preflight passed: ${checks} check groups.`);
