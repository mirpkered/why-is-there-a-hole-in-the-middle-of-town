import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};

const { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_RECOVERY_KEY, SAVE_VERSION, freshState, generateFloorMap, validateFloorMap, analyzeFloorMap, saveState, loadState } = await import('../js/state.js?preflight');
const { items, monsters, lootTables, floorEncounterTable, innEvents, shopStock, roomTypes, dungeonEvents } = await import('../js/data.js?preflight');
const { makeMarketCycle, currentSellValue, simulateMarkets, simulateInnEvents } = await import('../js/town-economy.js?preflight');
const { generateAbsurdName, inspectNameGenerator, MAX_NAME_LENGTH } = await import('../js/name-generator.js?preflight');
const { roomProps: props, createRoomDecoration, roomPropMarkup } = await import('../js/room-visuals.js?preflight');
const { TOWN_ART_ASSETS } = await import('../js/town-art.js?preflight');
const { validateContent, validateQuestGraph } = await import('../js/content-validation.js?preflight');
const { achievements } = await import('../js/progression.js?preflight');
const { validateQuestTemplate, questObjectiveTemplates } = await import('../js/quest-templates.js?preflight');
const { validWeightedRows, weightedChoice } = await import('../js/random-utils.js?preflight');
const { applyStatus, tickStatuses } = await import('../js/status-effects.js?preflight');
const { LOCATION_MUSIC_POOLS, LOCATION_MUSIC_CONTEXTS, chooseLocationTrack, validateLocationMusic } = await import('../js/location-music.js?v=statistics-music-20261005a');
const { configureAmbientAudioSession, audioSessionDiagnostics } = await import('../js/audio-session.js?preflight');
const { scaleEnemy } = await import('../js/enemy-scaling.js?preflight');
const { selectWithHistory, paceEncounterChance, chooseEncounterCategory, chooseEnemyAttack, monsterFamilies } = await import('../js/encounter-director.js?preflight');
const game = await import('../js/game.js?preflight');

let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`✓ ${name}`); }

check('all runtime JavaScript modules pass Node syntax validation',()=>{
  for(const file of readdirSync(resolve('js')).filter(name=>name.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',resolve('js',file)],{encoding:'utf8'});assert.equal(result.status,0,`${file}: ${result.stderr||result.stdout}`)}
});

function inspectTransparentPng(path) {
  const bytes=readFileSync(path);assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);assert.equal(bytes[24],8);assert.equal(bytes[25],6,'Town art must be RGBA');
  const chunks=[];let offset=8;while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=12+length;if(type==='IEND')break;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4;assert.equal(raw.length,(stride+1)*height);let x0=width,y0=height,x1=-1,y1=-1;
  for(let y=0;y<height;y++){assert.equal(raw[y*(stride+1)],0,'processed Town art PNG rows use the lossless no-filter encoding');for(let x=0;x<width;x++)if(raw[y*(stride+1)+1+x*4+3]>=8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
  const alphaAt=(x,y)=>raw[y*(stride+1)+1+x*4+3];assert.equal(alphaAt(0,0),0);assert.equal(alphaAt(width-1,0),0);assert.equal(alphaAt(0,height-1),0);assert.equal(alphaAt(width-1,height-1),0);
  assert.ok(x0<=12&&y0<=12&&width-1-x1<=12&&height-1-y1<=12,`Town image should be closely cropped: ${path}`);
  return {width,height};
}

check('content definitions have no critical validation errors', () => {
  const report = validateContent();
  assert.equal(report.errorCount, 0, JSON.stringify(report.errors));
  assert.equal(report.warningCount, 0, JSON.stringify(report.warnings));
});

check('all registered local runtime assets exist', () => {
  const refs = [];
  for (const monster of Object.values(monsters)) refs.push(monster.sprite?.src, monster.sprite?.ink, monster.sprite?.colored);
  for (const prop of Object.values(props)) refs.push(prop.ink, prop.colored);
  for (const assets of Object.values(TOWN_ART_ASSETS)) refs.push(assets.ink, assets.colored);
  for (const path of ['assets/icons/favicon-16.png', 'assets/icons/favicon-32.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png']) refs.push(path);
  const manifest = JSON.parse(readFileSync(resolve('site.webmanifest'), 'utf8'));
  for (const icon of manifest.icons || []) refs.push(icon.src);
  for (const match of readFileSync(resolve('index.html'), 'utf8').matchAll(/(?:href|src)="(assets\/[^"?#]+)/g)) refs.push(match[1]);
  for (const file of ['css/styles.css', 'css/mechanics.css']) for (const match of readFileSync(resolve(file), 'utf8').matchAll(/url\(['"]?(assets\/[^)'"?#]+)/g)) refs.push(match[1]);
  const audioText = readFileSync(resolve('js/audio.js'), 'utf8');
  for (const match of audioText.matchAll(/(?:src|path):\s*['"](assets\/[^'"]+)['"]/g)) refs.push(match[1]);
  for (let number = 4; number <= 21; number++) refs.push(`assets/audio/music/dungeon/dungeon-${String(number).padStart(2, '0')}.mp3`);
  for (const track of Object.values(LOCATION_MUSIC_POOLS).flat()) refs.push(track.src);
  for (const path of new Set(refs.filter(Boolean))) assert.ok(existsSync(resolve(path)), `Missing asset: ${path}`);
});

check('shared municipal background and masthead use the local doodle sheet and responsive styles',()=>{
  const css=readFileSync(resolve('css/mechanics.css'),'utf8');
  const app=readFileSync(resolve('js/app.js'),'utf8');
  assert.ok(existsSync(resolve('assets/images/ui/municipal-doodles.svg')),'municipal doodle background should exist locally');
  assert.match(css,/url\('\.\.\/assets\/images\/ui\/municipal-doodles\.svg'\)/,'background should use the bundled SVG, not a remote image');
  assert.match(css,/\.topbar\{[^}]*background:linear-gradient[^}]*box-shadow:/,'shared masthead should use the signboard treatment');
  assert.match(app,/function gameMasthead\(/,'shared masthead markup should be reusable');
  assert.match(app,/WHY IS THERE A HOLE/,'masthead should show the main game title');
  assert.match(app,/IN THE MIDDLE OF TOWN\?/,'masthead should show the attached subtitle strip');
  assert.match(app,/gameMasthead\('h1','game-masthead--hero'\)/,'title screen should use the shared semantic h1 masthead');
  assert.match(css,/\.masthead-ribbon[^}]*clip-path:/,'subtitle should be a distinct original paper-tag treatment');
  assert.match(css,/\.game-masthead--hero/,'title screen should use the enlarged lockup');
  assert.match(css,/\.topbar\{display:grid;grid-template-columns:minmax\(0,1fr\)/,'narrow layouts should give masthead and actions separate rows');
  assert.match(css,/@media\(max-width:360px\)\{\.topbar/,'masthead must have a narrow-phone layout');
});

check('5,001 floor layouts across playable depths are valid, varied, and deterministic', () => {
  const signatures = new Set(), entrances = new Set(), exits = new Set(); let minWalkable = Infinity, maxWalkable = 0, minRoute = Infinity, maxRoute = 0;
  for (let seed = 1; seed <= 1667; seed++) for (let floor = 1; floor <= 3; floor++) {
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

check('room prop generation respects compatibility and is repeatable across all room types',()=>{
  for(const room of Object.values(roomTypes))for(const floor of [1,2,3])for(let seed=1;seed<=20;seed++){
    const map=generateFloorMap(seed*1543,floor),first=createRoomDecoration(room,map,floor,5,5),second=createRoomDecoration(room,map,floor,5,5);
    assert.deepEqual(second,first,`${room.id} decorations must be deterministic`);
    for(const prop of first.props){assert.ok((room.visual?.propPool||[]).includes(prop.id));assert.ok(prop.rooms.includes(room.id));assert.ok((room.visual?.placementRules||[]).includes(prop.zone)||!room.visual?.placementRules,`${room.id}/${prop.id} used incompatible zone ${prop.zone}`)}
  }
});

check('hand-drawn wooden crate is registered as a paired storage-room prop',()=>{
  const crate=props['wooden-crate'];assert.ok(crate);assert.ok(crate.rooms.includes('storage'));assert.equal(crate.placeholder,'crate');
  for(const [style,path] of [['ink',crate.ink],['colored',crate.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} crate must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=1600&&png.readUInt32BE(20)<=1300,'crate art dimensions remain reasonable for runtime use')}
  const sample={...crate,flip:false,zone:'far-left',scale:1,depth:1};
  assert.match(roomPropMarkup({props:[sample]},'ink'),/wooden-crate-ink\.png/);
  assert.match(roomPropMarkup({props:[sample]},'colored'),/wooden-crate-colored\.png/);
});

check('hand-drawn mushroom cluster is paired, transparent, and assigned to Mushroom Room',()=>{
  const cluster=props['mushroom-cluster'];assert.ok(cluster);assert.ok(cluster.rooms.includes('mushroom-room'));assert.equal(cluster.placeholder,'mushrooms');
  for(const [style,path] of [['ink',cluster.ink],['colored',cluster.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} mushroom art must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=1200&&png.readUInt32BE(20)<=1300,'mushroom art dimensions remain tightly cropped for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/mushroom-cluster-original.jpg')),'original drawing photo remains archived');
  const sample={...cluster,flip:false,zone:'far-left',scale:1,depth:1};
  assert.match(roomPropMarkup({props:[sample]},'ink'),/mushroom-cluster-ink\.png/);
  assert.match(roomPropMarkup({props:[sample]},'colored'),/mushroom-cluster-colored\.png/);
});

check('hand-drawn tall mushroom replaces its placeholder with paired transparent art',()=>{
  const tall=props['tall-mushrooms'];assert.ok(tall);assert.ok(tall.rooms.includes('mushroom-room'));assert.equal(tall.placeholder,'mushrooms tall');
  for(const [style,path] of [['ink',tall.ink],['colored',tall.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} tall mushroom must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=700&&png.readUInt32BE(20)<=1400,'tall mushroom dimensions remain suitable for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/tall-mushroom-original.jpg')),'original drawing photo remains archived');
  const sample={...tall,flip:false,zone:'far-left',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/tall-mushroom-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/tall-mushroom-colored\.png/);
});

check('leaning tall mushroom is a separate paired Mushroom Room prop',()=>{
  const leaning=props['leaning-tall-mushroom'];assert.ok(leaning);assert.ok(leaning.rooms.includes('mushroom-room'));assert.equal(leaning.placeholder,'mushrooms tall');
  for(const [style,path] of [['ink',leaning.ink],['colored',leaning.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} leaning mushroom must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=1200&&png.readUInt32BE(20)<=1400,'leaning mushroom dimensions remain suitable for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/leaning-tall-mushroom-original.jpg')),'original drawing photo remains archived');
  const sample={...leaning,flip:false,zone:'mid-left',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/leaning-tall-mushroom-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/leaning-tall-mushroom-colored\.png/);
});

check('small mushroom is a compact paired Mushroom Room prop',()=>{
  const small=props['small-mushroom'];assert.ok(small);assert.ok(small.rooms.includes('mushroom-room'));assert.ok(roomTypes['mushroom-room'].visual.propPool.includes('small-mushroom'));assert.equal(small.placeholder,'mushrooms');
  for(const [style,path] of [['ink',small.ink],['colored',small.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} small mushroom must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=500&&png.readUInt32BE(20)<=500,'small mushroom dimensions remain tightly cropped')}
  assert.ok(existsSync(resolve('assets/source/room-props/small-mushroom-original.jpg')),'original drawing photo remains archived');
  const sample={...small,flip:false,zone:'far-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/small-mushroom-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/small-mushroom-colored\.png/);
});

check('hand-drawn market sign is paired, transparent art for Kobold Market',()=>{
  const sign=props['market-sign'];assert.ok(sign);assert.ok(sign.rooms.includes('market'));assert.ok(roomTypes.market.visual.propPool.includes('market-sign'));assert.equal(sign.placeholder,'sign');
  for(const [style,path] of [['ink',sign.ink],['colored',sign.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} market sign must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=700&&png.readUInt32BE(20)<=750,'market sign dimensions remain reasonable for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/market-sign-original.jpg')),'original sign photo remains archived');
  const sample={...sign,flip:false,zone:'far-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/market-sign-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/market-sign-colored\.png/);
});

check('Very Small Door art appears only in its compatible room families',()=>{
  const door=props['small-door'];assert.ok(door);assert.deepEqual([...door.rooms].sort(),['library','records']);assert.deepEqual([...dungeonEvents['very-small-door'].rooms].sort(),['library','records']);
  for(const roomId of door.rooms)assert.ok(roomTypes[roomId].visual.propPool.includes('small-door'),`${roomId} can place the Very Small Door`);
  for(const [style,path] of [['ink',door.ink],['colored',door.colored]]){const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} door art must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=650&&png.readUInt32BE(20)<=700,'door dimensions remain compact for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/small-door-original.jpg')),'original door photo remains archived');
  const sample={...door,flip:false,zone:'wall-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/small-door-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/small-door-colored\.png/);
});

check('hand-drawn empty bookshelf replaces the Library placeholder',()=>{
  const shelf=props.bookshelf;assert.ok(shelf);assert.ok(shelf.rooms.includes('library'));assert.ok(roomTypes.library.visual.propPool.includes('bookshelf'));assert.equal(shelf.placeholder,'shelf');
  for(const [style,path] of [['ink',shelf.ink],['colored',shelf.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} bookshelf must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=650&&png.readUInt32BE(20)<=750,'bookshelf dimensions remain compact for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/bookshelf-original.jpg')),'original bookshelf drawing remains archived');
  const sample={...shelf,flip:false,zone:'wall-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/bookshelf-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/bookshelf-colored\.png/);
});

check('hand-drawn melted candle replaces the Shrine placeholder',()=>{
  const candle=props.candle;assert.ok(candle);assert.ok(candle.rooms.includes('shrine'));assert.ok(roomTypes.shrine.visual.propPool.includes('candle'));assert.equal(candle.placeholder,'candle');
  for(const [style,path] of [['ink',candle.ink],['colored',candle.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} candle must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=650&&png.readUInt32BE(20)<=700,'melted candle dimensions remain compact for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/melted-candle-original.jpg')),'original melted candle photo remains archived');
  const sample={...candle,flip:false,zone:'far-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/candle-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/candle-colored\.png/);
});

check('hand-drawn barrel replaces the Storage Room placeholder',()=>{
  const barrel=props.barrel;assert.ok(barrel);assert.ok(barrel.rooms.includes('storage'));assert.ok(roomTypes.storage.visual.propPool.includes('barrel'));assert.equal(barrel.placeholder,'barrel');
  for(const [style,path] of [['ink',barrel.ink],['colored',barrel.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} barrel must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=650&&png.readUInt32BE(20)<=750,'barrel dimensions remain compact for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/barrel-original.jpg')),'original barrel photo remains archived');
  const sample={...barrel,flip:false,zone:'far-left',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/barrel-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/barrel-colored\.png/);
});

check('hand-drawn paper stack replaces the Municipal Records placeholder',()=>{
  const papers=props['paper-stack'];assert.ok(papers);assert.ok(papers.rooms.includes('records'));assert.ok(roomTypes.records.visual.propPool.includes('paper-stack'));assert.equal(papers.placeholder,'papers');
  for(const [style,path] of [['ink',papers.ink],['colored',papers.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} paper stack must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=750&&png.readUInt32BE(20)<=600,'paper stack dimensions remain compact for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/paper-stack-original.jpg')),'original paper stack photo remains archived');
  const sample={...papers,flip:false,zone:'floor-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/paper-stack-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/paper-stack-colored\.png/);
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
    delete legacy.settings.sfxEnabled;delete legacy.settings.sfxVolume;
    legacy.player = {name: `Legacy ${version}`, class: 'Fighter', hp: 12, maxHp: 24, mp: 2, maxMp: 4, baseMaxHp: 24, baseMaxMp: 4, effects: {}};
    legacy.quests = {active: [], completed: [], available: []};
    legacy.saveVersion = version;
    storage.set(SAVE_KEY, JSON.stringify(legacy));
    const restored = loadState();
    assert.equal(restored?.saveVersion, SAVE_VERSION, `version ${version}`);
    assert.equal(restored.player.name, `Legacy ${version}`);
    assert.equal(restored.settings.sfxEnabled,true);assert.equal(restored.settings.sfxVolume,.8);
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

check('50,000 independent stat rolls per class cover legal ranges without violations', () => {
  const expectedStats=['str','agi','mind','vit'];
  for(const cls of Object.keys(game.STARTING_STAT_RANGES)){
    const ranges=game.STARTING_STAT_RANGES[cls],seen=Object.fromEntries(expectedStats.map(stat=>[stat,new Set()])),sums=Object.fromEntries(expectedStats.map(stat=>[stat,0]));
    for(let i=0;i<50000;i++){const roll=game.rollStartingStats(cls);for(const stat of expectedStats){const [min,max]=ranges[stat];assert.ok(roll[stat]>=min&&roll[stat]<=max,`${cls}.${stat} out of range: ${roll[stat]}`);seen[stat].add(roll[stat]);sums[stat]+=roll[stat]}}
    for(const stat of expectedStats){const [min,max]=ranges[stat];assert.equal(Math.min(...seen[stat]),min);assert.equal(Math.max(...seen[stat]),max);assert.equal(seen[stat].size,max-min+1,`${cls}.${stat} missed a legal value`)}
    assert.deepEqual(game.rollStartingStats(cls,()=>0),Object.fromEntries(expectedStats.map(stat=>[stat,ranges[stat][0]])));
    assert.deepEqual(game.rollStartingStats(cls,()=>.999999),Object.fromEntries(expectedStats.map(stat=>[stat,ranges[stat][1]])));
    console.log(`  ${cls}: ${expectedStats.map(stat=>`${stat} ${Math.min(...seen[stat])}–${Math.max(...seen[stat])}, avg ${(sums[stat]/50000).toFixed(2)}`).join('; ')}`)
  }
});

check('absurd character names stay usable and vary across 50,000 generated names', () => {
  const report=inspectNameGenerator(50000);
  assert.equal(report.generated,50000); assert.equal(report.invalidCount,0);
  assert.ok(report.lengths.min>0&&report.lengths.max<=MAX_NAME_LENGTH);
  assert.ok(report.unique>3000,`name pool repeated too heavily: ${report.unique} unique`);
  assert.ok(report.ordinaryCount>0,'ordinary names should occur sometimes');
  assert.ok(Object.keys(report.categories).length>=4,'several name patterns should be represented');
  assert.equal(generateAbsurdName(()=>0).category,'ordinary');
  console.log(`  names: ${report.unique} unique; ${report.ordinaryCount} ordinary; categories ${Object.keys(report.categories).join(', ')}; length ${report.lengths.min}–${report.lengths.max}`);
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
  const sim = simulateMarkets({ runs: 10000, seed: 7721, stockIds: shopStock, items });
  assert.ok(sim.demandCounts.low > 0 && sim.demandCounts.normal > 0 && sim.demandCounts.high > 0);
  assert.ok(sim.everyCycleChangesSomeStock);
  assert.ok(sim.coreStockAlwaysPresent);
  assert.ok(Object.values(sim.appearances).every(count=>count>0),'all rotating stock should be reachable over 10,000 cycles');
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
  const sim = simulateInnEvents(innEvents, 25000);
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


check('Inn, Store, Character, Settings, and Statistics recordings are valid one-shot tracks and avoid immediate repeats',()=>{
  const actual=LOCATION_MUSIC_POOLS.inn;
  const store=LOCATION_MUSIC_POOLS.store;
  const character=LOCATION_MUSIC_POOLS.character;
  const settings=LOCATION_MUSIC_POOLS.settings;
  const statistics=LOCATION_MUSIC_POOLS.statistics;
  assert.deepEqual(actual.map(track=>track.id),['inn-001','inn-002','inn-003']);
  assert.deepEqual(store.map(track=>track.id),['store-001','store-002','store-003','store-004','store-005']);
  assert.deepEqual(character.map(track=>track.id),['character-001','character-002','character-003','character-004','character-005']);
  assert.deepEqual(settings.map(track=>track.id),['settings-001','settings-002','settings-003','settings-004']);
  assert.deepEqual(statistics.map(track=>track.id),['statistics-001','statistics-002','statistics-003','statistics-004','statistics-005','statistics-006']);
  assert.deepEqual(validateLocationMusic().poolCounts,{inn:3,store:5,questBoard:0,statistics:6,achievements:0,character:5,settings:4});
  assert.equal(validateLocationMusic().errorCount,0);
  assert.ok([...actual,...store,...character,...settings,...statistics].every(track=>existsSync(resolve(track.src))&&track.loop===false&&track.gain===1));
  let seed=42,previous=null;const appearances=new Map(actual.map(track=>[track.id,0])),random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let visit=0;visit<30;visit++){const track=chooseLocationTrack('inn',previous,LOCATION_MUSIC_POOLS,random);assert.ok(track);assert.notEqual(track.id,previous);appearances.set(track.id,appearances.get(track.id)+1);previous=track.id}
  assert.ok([...appearances.values()].every(count=>count>0));
  previous=null;const storeAppearances=new Map(store.map(track=>[track.id,0]));
  for(let visit=0;visit<50;visit++){const track=chooseLocationTrack('store',previous,LOCATION_MUSIC_POOLS,random);assert.ok(track);assert.notEqual(track.id,previous);storeAppearances.set(track.id,storeAppearances.get(track.id)+1);previous=track.id}
  assert.ok([...storeAppearances.values()].every(count=>count>0));
  previous=null;const characterAppearances=new Map(character.map(track=>[track.id,0]));
  for(let visit=0;visit<50;visit++){const track=chooseLocationTrack('character',previous,LOCATION_MUSIC_POOLS,random);assert.ok(track);assert.notEqual(track.id,previous);characterAppearances.set(track.id,characterAppearances.get(track.id)+1);previous=track.id}
  assert.ok([...characterAppearances.values()].every(count=>count>0));
  previous=null;const settingsAppearances=new Map(settings.map(track=>[track.id,0]));
  for(let visit=0;visit<40;visit++){const track=chooseLocationTrack('settings',previous,LOCATION_MUSIC_POOLS,random);assert.ok(track);assert.notEqual(track.id,previous);settingsAppearances.set(track.id,settingsAppearances.get(track.id)+1);previous=track.id}
  assert.ok([...settingsAppearances.values()].every(count=>count>0));
  previous=null;const statisticsAppearances=new Map(statistics.map(track=>[track.id,0]));
  for(let visit=0;visit<60;visit++){const track=chooseLocationTrack('statistics',previous,LOCATION_MUSIC_POOLS,random);assert.ok(track);assert.notEqual(track.id,previous);statisticsAppearances.set(track.id,statisticsAppearances.get(track.id)+1);previous=track.id}
  assert.ok([...statisticsAppearances.values()].every(count=>count>0));
  const pools={...Object.fromEntries(LOCATION_MUSIC_CONTEXTS.map(context=>[context,[]])),inn:[{id:'inn-a',pool:'inn',src:'assets/audio/music/inn/a.mp3',gain:.4,loop:false},{id:'inn-b',pool:'inn',src:'assets/audio/music/inn/b.mp3',gain:.4,loop:false}]};
  assert.equal(chooseLocationTrack('inn','inn-a',pools,()=>0).id,'inn-b');
  assert.equal(validateLocationMusic(pools).errorCount,0);
  assert.equal(validateLocationMusic({...Object.fromEntries(LOCATION_MUSIC_CONTEXTS.map(context=>[context,[]])),inn:[{...pools.inn[0],loop:true}]}).errorCount,1);
});
check('new content chains, existing-item readiness, trade history, and Inn rewards resolve cleanly',()=>{
  storage.clear();game.setState(freshState());game.startGame('Spoon Auditor','Fighter');
  game.state.dungeon.currentEventId='room-of-spoons';assert.ok(game.resolveDungeonEvent('room-of-spoons','count').ok);
  assert.equal(game.acceptQuest('spoon-confirmation'),true);assert.equal(game.questStatus('spoon-confirmation').status,'ready');
  assert.ok(game.turnInQuest('spoon-confirmation').ok);game.addItem('bent-spoon',1);assert.equal(game.acceptQuest('spoon-sample'),true);assert.equal(game.questStatus('spoon-sample').status,'ready');
  assert.ok(game.turnInQuest('spoon-sample').ok);game.addItem('bent-spoon',1);assert.equal(game.acceptQuest('spoon-certification'),true);assert.equal(game.questStatus('spoon-certification').status,'ready');
  assert.ok(game.turnInQuest('spoon-certification').ok);assert.equal(game.countItem('official-spoon'),1);assert.ok(game.state.achievements.unlocked['spoon-certified']);

  game.setState(freshState());game.startGame('Odor Clerk','Wizard');game.state.dungeon.currentEventId='odor-survey';assert.ok(game.resolveDungeonEvent('odor-survey','collect').ok);
  assert.equal(game.countItem('condensed-stink'),1);assert.equal(game.acceptQuest('air-quality-sample'),true);assert.equal(game.questStatus('air-quality-sample').status,'ready');
  assert.ok(game.turnInQuest('air-quality-sample').ok);assert.ok(game.state.quests.available.includes('air-quality-followup'));

  game.setState(freshState());game.startGame('Pip Customer','Rogue');assert.match(game.talkNpc('kobold-trader'),/ledger|floor/i);assert.equal(game.acceptQuest('pip-inventory'),true);
  game.addItem('suspicious-mushroom',3);game.addItem('goose-feather',1);game.state.town.gold=30;
  assert.equal(game.completeTrade('mushroom-goose-deal').ok,true);assert.equal(game.questStatus('pip-inventory').status,'ready');assert.ok(game.turnInQuest('pip-inventory').ok);
  assert.ok(game.state.quests.available.includes('pip-tail'));game.addItem('curly-tail',1);assert.equal(game.acceptQuest('pip-tail'),true);assert.equal(game.questStatus('pip-tail').status,'ready');

  game.setState(freshState());game.startGame('Inn Event Tester','Cleric');game.state.player.hp--;const gold=game.state.town.gold;const rest=game.restAtInn('bed-coin');
  assert.equal(rest.ok,true);assert.equal(game.state.town.gold,gold-4);assert.equal(game.state.career.innEventsTriggered,1);
  game.state.player.hp--;const snack=game.restAtInn('mystery-snack');assert.equal(snack.ok,true);assert.ok(game.countItem('healing-tonic')>=3);
});

check('unavailable or quota-limited local storage does not throw into gameplay',()=>{
  const get=localStorage.getItem,set=localStorage.setItem;
  try{localStorage.getItem=()=>{throw new Error('storage unavailable')};assert.equal(loadState(),null);localStorage.getItem=get;localStorage.setItem=()=>{throw new Error('quota exceeded')};assert.equal(saveState(freshState()),false)}finally{localStorage.getItem=get;localStorage.setItem=set}
});

check('quest-chain graph validation catches missing links, duplicate steps, and cycles',()=>{
  assert.deepEqual(validateQuestGraph(),[],'current quest graph should be complete');
  const invalid={a:{chain:'x',step:1,next:'b'},b:{chain:'x',step:2,next:'a'},c:{chain:'x',step:2,next:'missing'}};
  const issues=validateQuestGraph(invalid).join(' ');assert.match(issues,/cycle/i);assert.match(issues,/duplicates step 2/i);assert.match(issues,/missing quest/i);
});

check('town button art has transparent cropped bounds and no rectangular image backing',()=>{
  for(const assets of Object.values(TOWN_ART_ASSETS))for(const path of Object.values(assets))inspectTransparentPng(resolve(path));
  const css=readFileSync(resolve('css/mechanics.css'),'utf8'),appSource=readFileSync(resolve('js/app.js'),'utf8');
  assert.match(css,/\.location--art-destination \.location-art--illustration\{[^}]*background:transparent/);
  assert.match(css,/\.location--art-destination \.location-art--illustration\{[^}]*box-shadow:none/);
  assert.match(css,/\.location--art-destination \.location-art--illustration\{[^}]*position:absolute/);
  assert.match(css,/\.town-hub \.location--art-destination\{[^}]*border:0[^}]*background:transparent[^}]*box-shadow:none/);
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole\{[^}]*grid-column:1\/-1[^}]*height:clamp\([^)]*\)[^}]*border:0[^}]*background:transparent[^}]*box-shadow:none/,'Hole should be a prominent transparent art hit area with no visible shell');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole \.location-art--illustration img\{object-fit:contain;object-position:center;filter:none\}/,'Hole illustration should preserve aspect ratio and avoid visual overlays');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole:active|\.town-hub \.location--art-destination:active/,'art buttons should retain a pressed-state response');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole:focus-visible\{outline:/,'Hole should keep keyboard-visible focus treatment');
  assert.match(css,/\.town-hub \.location--art-destination:focus-visible\{[^}]*outline/);
  assert.match(appSource,/assets\[style\].*town-office-skin-20261005a/);
  const townBranch=appSource.match(/if\(screen==='town'\).*?if\(screen==='quests'\)/s)?.[0]||'';
  assert.ok(townBranch,'Town hub render branch should be present');
  for(const [target,name,slot] of [['dungeon','Enter the Hole','the-hole'],['store','General Store','general-store'],['inn','The Inn','inn'],['quests','Quest Board','quest-board'],['statistics','Statistics','statistics'],['character','Character','character'],['achievements','Achievements','achievements']])assert.match(townBranch,new RegExp(`data-art-slot="${slot}" data-go="${target}" aria-label="${name}"`),`${name} art button should keep its accessible name and navigation`);
  assert.match(townBranch,/data-art-slot="settings" data-action="settings" aria-label="Settings"/,'Settings art button should keep its accessible name and action');
  assert.doesNotMatch(townBranch,/<b>|<small>/,'Town art buttons should not display overlay labels or metadata');
  assert.match(townBranch,/<button class="location location-hole location--art-destination" data-art-slot="the-hole" data-go="dungeon" aria-label="Enter the Hole">\$\{townArtMarkup\('the-hole'/,'Hole image itself should be the only visible button content and retain dungeon navigation and accessible name');
  assert.match(appSource,/const assets=TOWN_ART_ASSETS\[slot\],style=state\.settings\?\.spriteStyle==='ink'\?'ink':'colored'/,'Hole should follow existing Ink/Colored style selection');
  assert.match(appSource,/image\.parentElement\.classList\.add\('is-missing-art'\)/,'Missing Town art should fall back without losing navigation');
  assert.doesNotMatch(townBranch,/Market cycle \$\{|HP \$\{state\.player\.hp|new notices|ready to turn in/,'art-led Town destinations should omit redundant status lines');
});

check('ambient audio session uses feature detection and never selects playback mode', () => {
  const session = { type: 'auto' };
  assert.deepEqual(configureAmbientAudioSession(session), { supported: true, configuredType: 'ambient', error: null });
  assert.deepEqual(audioSessionDiagnostics(session), { supported: true, configuredType: 'ambient', requestedType: 'ambient', error: null });
  assert.equal(configureAmbientAudioSession(null).supported, false);
  const readonly = Object.freeze({ type: 'playback' });
  assert.equal(configureAmbientAudioSession(readonly).supported, false);
  assert.equal(audioSessionDiagnostics(readonly).configuredType, 'playback');
});

await (async()=>{
  const elements = [], gains = [];
  const previousGlobals={Audio:globalThis.Audio,document:globalThis.document,window:globalThis.window,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')};
  class MockAudio {
    constructor(src='') { this.src=src; this.paused=true; this.currentTime=0; this.duration=60; this.readyState=4; this.loop=false; this.listeners={}; elements.push(this); }
    addEventListener(type,fn) { this.listeners[type]=fn; }
    load() {}
    play() { this.paused=false; return Promise.resolve(); }
    pause() { this.paused=true; }
  }
  class MockAudioContext {
    constructor() { this.state='running'; this.currentTime=0; this.destination={}; }
    createMediaElementSource() { return {connect(){}}; }
    createGain() { const gain={gain:{value:0,cancelScheduledValues(){},setValueAtTime(value){this.value=value}},connect(){}};gains.push(gain);return gain; }
    resume() { return Promise.resolve(); }
  }
  globalThis.Audio=MockAudio;
  globalThis.document={addEventListener(){},visibilityState:'visible',baseURI:'http://localhost/'};
  globalThis.window={AudioContext:MockAudioContext};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{audioSession:{type:'auto'}}});
  const audio=await import('../js/audio.js?audio-preflight');
  audio.updateMusicPreferences({musicEnabled:false,musicVolume:1,sfxEnabled:true,sfxVolume:.8});
  assert.equal(await audio.playBattleTheme({musicEnabled:false,musicVolume:1}),false);
  assert.equal(elements.length,0,'Music Off must not create or play an audio channel');
  await audio.playBattleTheme({musicEnabled:true,musicVolume:.5,sfxEnabled:true,sfxVolume:.8});
  const firstCount=elements.length,diagnostics=audio.musicPlaybackDiagnostics();
  assert.ok(firstCount>0);
  assert.equal(diagnostics.audioSession.configuredType,'ambient');
  assert.match(diagnostics.implementationPath,/MediaElementAudioSourceNode/);
  assert.equal(diagnostics.audioContextState,'running');
  assert.equal(diagnostics.effectiveGain,.5);
  audio.updateMusicPreferences({musicEnabled:true,musicVolume:.25,sfxEnabled:false,sfxVolume:.4});
  assert.equal(elements.length,firstCount,'changing mix values must reuse the active channel');
  assert.equal(audio.musicPlaybackDiagnostics().effectiveGain,.25);
  assert.equal(audio.playSoundEffect('test-effect.ogg'),false,'SFX Off must suppress effects');
  audio.updateMusicPreferences({musicEnabled:true,musicVolume:0,sfxEnabled:true,sfxVolume:.4});
  assert.equal(audio.musicPlaybackDiagnostics().effectiveGain,0,'zero music volume must produce zero output gain');
  assert.equal(audio.playSoundEffect('test-effect.ogg'),true);
  assert.ok(gains.at(-1).gain.value<=.4);
  console.log(`  mock runtime: ${elements.length} media elements, ${gains.length} shared gain nodes, ambient session requested`);
  globalThis.Audio=previousGlobals.Audio;globalThis.document=previousGlobals.document;globalThis.window=previousGlobals.window;
  if(previousGlobals.navigator)Object.defineProperty(globalThis,'navigator',previousGlobals.navigator);else delete globalThis.navigator;
})();checks++;console.log('✓ music contexts share Web Audio gain routing and expose QA diagnostics');

check('tag-focused equipment, item interactions, and combat narration stay concise',()=>{
  game.setState(freshState());game.startGame('Apple Tester','Fighter');game.qaGiveItem('suspicious-apple-corer',1);game.equipItem('suspicious-apple-corer');game.qaSpawnMonster('rotten-apple',2,null,5);game.state.combat.hp=100;
  const hp=game.state.combat.hp,result=game.attack();assert.ok(hp-game.state.combat.hp>=game.state.player.attack+2);assert.match(result,/hit/i);
  const attack=monsters.rat.attacks.find(row=>row.id==='nibble');assert.ok(attack.flavors.length>=2);assert.ok(Object.values(monsters).every(monster=>monster.attacks.every(row=>row.flavors?.length>=2)));
  assert.ok(['air-quality-concern','apple-a-day','heart-health','pork-problem','spoon-certified'].every(id=>achievements.some(row=>row.id===id)));
});

check('expanded Inn event pool samples correctly across 25,000 eligible-rest attempts',()=>{
  const report=simulateInnEvents(innEvents,25000);assert.equal(report.fullRestEvents,0);assert.ok(report.observedRate>.22&&report.observedRate<.28,`Inn event chance drifted: ${report.observedRate}`);
  assert.equal(Object.keys(report.counts).length,Object.keys(innEvents).length);assert.ok(Object.values(report.counts).every(count=>count>0));
  console.log(`  Inn events: ${report.eventCount}/${report.legitimateRests} eligible rests (${(report.observedRate*100).toFixed(1)}%); all ${Object.keys(report.counts).length} events appeared`);
});

check('25,000 encounter decisions and loot rolls per representative depth stay varied',()=>{
  let seed=739391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const encounterReport={},lootReport={};
  for(const floor of [1,3,5,10]){const categories={combat:0,event:0,quiet:0,npc:0},monstersSeen=new Map(),history=[];let emptySteps=0,streak=0,repeat=0,previous='';const rows=(floorEncounterTable[floor]||floorEncounterTable[3]).filter(row=>monsters[row.id]?.minDepth<=floor);
    for(let i=0;i<25000;i++){const chance=paceEncounterChance({combat:floor===1?.13:.19,event:floor===1?.09:.13,emptySteps,encounterStreak:streak});if(random()<.035){categories.npc++;emptySteps=0;streak++}else{const category=chooseEncounterCategory(chance,random);categories[category]++;if(category==='combat'){const selected=selectWithHistory(rows,history,row=>monsters[row.id].id,random,.55);const id=selected.id;if(id===previous)repeat++;previous=id;monstersSeen.set(id,(monstersSeen.get(id)||0)+1);history.push({type:'monster',id:monsters[id].id});if(history.length>12)history.shift();emptySteps=0;streak++}else if(category==='event'){emptySteps=0;streak++}else{emptySteps++;streak=0}}}
    const repeatRate=repeat/Math.max(1,categories.combat);assert.ok(categories.combat>1500&&categories.event>1000&&categories.quiet>3750&&categories.npc>250,`starved depth ${floor}: ${JSON.stringify(categories)}`);assert.ok(repeatRate<.25,`rapid monster repeats too common at ${floor}: ${repeatRate}`);encounterReport[floor]={categories:Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,`${(100*v/25000).toFixed(1)}%`])),monsterImmediateRepeat:`${(repeatRate*100).toFixed(1)}%`,top:[...monstersSeen].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>`${monsters[id].name} ${n}`)};
    const rarityCounts={common:0,uncommon:0,rare:0,strange:0},itemCounts=new Map();for(let i=0;i<25000;i++){const row=selectWithHistory(rows,[],entry=>monsters[entry.id].id,random,.55),monster=monsters[row.id],table=lootTables[monster.lootTable]||[],rarityMultiplier=Math.min(2,1+(floor-1)*.06),adjusted=table.map(entry=>{const rarity=items[entry.item]?.rarity||'common',factor=( {common:62,uncommon:25,rare:10,strange:3}[rarity]||62)/62;return {...entry,rarity,weight:entry.weight*factor*(rarity==='rare'||rarity==='strange'?rarityMultiplier:1)}}),drop=weightedChoice(adjusted,random);if(drop){rarityCounts[drop.rarity]++;itemCounts.set(drop.item,(itemCounts.get(drop.item)||0)+1)}}
    assert.ok(rarityCounts.strange<3000,`Strange loot too common at ${floor}`);assert.ok(Math.max(...itemCounts.values())<17500,`one item dominates drops at ${floor}`);lootReport[floor]={rarity:Object.fromEntries(Object.entries(rarityCounts).map(([k,v])=>[k,`${(100*v/25000).toFixed(1)}%`])),top:[...itemCounts].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>`${items[id].name} ${n}`)};
  }
  console.log(`  encounter decisions: ${JSON.stringify(encounterReport)}`);console.log(`  loot samples: ${JSON.stringify(lootReport)}`);
});

check('equipment slot availability uses the canonical slot and current class rules',()=>{
  const slots=Object.values(game.state.equipment);game.setState(freshState());game.startGame('Gear Tester','Fighter');
  for(const slot of Object.keys(game.state.equipment)){
    const item=Object.values(items).find(candidate=>candidate.slot===slot&&(!candidate.classes||candidate.classes.includes(game.state.player.class)));
    assert.ok(item,`fixture missing compatible gear for ${slot}`);const before=game.countItem(item.id);game.qaGiveItem(item.id,1);
    assert.equal(game.canEquipItem(item.id,slot),true);assert.equal(game.canEquipItem(item.id,'not-a-slot'),false);
    const result=game.equipItem(item.id);assert.equal(result.ok,true);assert.equal(game.state.equipment[slot],item.id);
    assert.equal(game.countItem(item.id),before+1);
  }
  assert.equal(slots.length,Object.keys(game.state.equipment).length);
});
await (async()=>{
  const previousDocument=globalThis.document,PreviousAudio=globalThis.Audio,audios=[];
  class MockAudio{
    constructor(src=''){audios.push(this);this.src=src;this.listeners={};this.preload='none';this.loop=false;this.volume=1;this.muted=false;this.playbackRate=1;this.paused=true;this.currentTime=0;this.duration=1;this.readyState=0;this.playCount=0;this.ended=false;this.error=null}
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)} dispatch(name){for(const fn of this.listeners[name]||[])fn()} load(){this.readyState=4} pause(){this.paused=true} play(){this.playCount++;this.paused=false;this.ended=false;return Promise.resolve()}
  }
  globalThis.document={baseURI:'https://game.test/',visibilityState:'visible',addEventListener(){}};globalThis.Audio=MockAudio;
  try{
    const {syncMusicContext,stopMusic,musicPlaybackDiagnostics,updateMusicPreferences}=await import('../js/audio.js?v=statistics-music-20261005a');
    const pool=LOCATION_MUSIC_POOLS.inn;
    updateMusicPreferences({musicEnabled:true,musicVolume:.4});await syncMusicContext('inn',{musicEnabled:true,musicVolume:.4},true);
    const firstTrack=musicPlaybackDiagnostics().selectedLocationTrack;assert.ok(pool.some(track=>track.id===firstTrack));assert.equal(musicPlaybackDiagnostics().loop,false);assert.equal(musicPlaybackDiagnostics().effectiveGain,.4);
    const channel=audios.find(audio=>audio.src.includes('/assets/audio/music/inn/'));assert.ok(channel,'location music channel should be created');const firstPlayCount=channel.playCount;
    await syncMusicContext('inn',{musicEnabled:true,musicVolume:.4},true);assert.equal(channel.playCount,firstPlayCount);assert.equal(musicPlaybackDiagnostics().playing,true);
    // Ending a one-shot service track must not trigger another play on the same visit.
    channel.paused=true;channel.ended=true;channel.dispatch('ended');await syncMusicContext('inn',{musicEnabled:true,musicVolume:.4},true);assert.equal(channel.playCount,firstPlayCount);assert.equal(musicPlaybackDiagnostics().playbackState,'ended');
    await syncMusicContext('town',{musicEnabled:true,musicVolume:.4},true);assert.equal(musicPlaybackDiagnostics().playing,false);
    await syncMusicContext('inn',{musicEnabled:true,musicVolume:.4},true);assert.notEqual(musicPlaybackDiagnostics().selectedLocationTrack,firstTrack);assert.ok(channel.playCount>firstPlayCount);
    await syncMusicContext('settings',{musicEnabled:true,musicVolume:.4},true);assert.ok(LOCATION_MUSIC_POOLS.settings.some(track=>track.id===musicPlaybackDiagnostics().selectedLocationTrack));assert.equal(musicPlaybackDiagnostics().loop,false);
    await syncMusicContext('statistics',{musicEnabled:true,musicVolume:.4},true);assert.ok(LOCATION_MUSIC_POOLS.statistics.some(track=>track.id===musicPlaybackDiagnostics().selectedLocationTrack));assert.equal(musicPlaybackDiagnostics().loop,false);
    updateMusicPreferences({musicEnabled:false,musicVolume:.4});assert.equal(musicPlaybackDiagnostics().playing,false);
    stopMusic();
  }finally{globalThis.document=previousDocument;globalThis.Audio=PreviousAudio}
})();checks++;console.log('✓ location audio plays service recordings once, stays silent when ended, and cleans up on exit');

console.log(`Preflight passed: ${checks} check groups.`);
