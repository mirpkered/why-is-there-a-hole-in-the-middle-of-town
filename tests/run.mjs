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

const { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_RECOVERY_KEY, SAVE_VERSION, freshState, generateFloorMap, validateFloorMap, analyzeFloorMap, saveState, loadState, loadStateDetailed, wallAt } = await import('../js/state.js?preflight');
const { items, monsters, lootTables, floorEncounterTable, innEvents, shopStock, roomTypes, roomDepthPresentation, dungeonEvents, townNpcs, dungeonNpcs, quests } = await import('../js/data.js?preflight');
const { makeMarketCycle, currentSellValue, simulateMarkets, simulateInnEvents } = await import('../js/town-economy.js?preflight');
const { generateAbsurdName, inspectNameGenerator, MAX_NAME_LENGTH } = await import('../js/name-generator.js?preflight');
const { roomProps: props, createRoomDecoration, roomPropMarkup } = await import('../js/room-visuals.js?preflight');
const { TOWN_ART_ASSETS } = await import('../js/town-art.js?preflight');
const {resolveArtVariant,validateArtEntries}=await import('../js/art-assets.js?preflight');
const {ROOM_BACKGROUND_REGISTRY,BATTLE_BACKGROUND_REGISTRY,backgroundForRoom,backgroundLayerMarkup,sceneImagePresentation,selectBackgroundVariant,validateBackgroundRegistry,validateDungeonSetRegistry}=await import('../js/scene-backgrounds.js?preflight');
const {DUNGEON_SETS,DUNGEON_SET_IDS,DUNGEON_TOPOLOGIES,topologyIdForOpenings,openingsForFacing,ensureDungeonVisualSets,assignedDungeonSetId}=await import('../js/dungeon-themes.js?preflight');
const {INTERACTIVE_OBJECT_ART}=await import('../js/interactive-art.js?preflight');
const {MASCOT_ART}=await import('../js/mascots.js?preflight');
const {SCREEN_PRESENTATION}=await import('../js/screen-presentation.js?preflight');
const {TOWN_DESTINATIONS,renderTownDestinations}=await import('../js/ui/town.js?preflight');
const {renderCharacterScreen}=await import('../js/ui/character.js?preflight');
const { validateContent, validateQuestGraph } = await import('../js/content-validation.js?preflight');
const { achievements } = await import('../js/progression.js?preflight');
const { validateQuestTemplate, questObjectiveTemplates } = await import('../js/quest-templates.js?preflight');
const { validWeightedRows, weightedChoice } = await import('../js/random-utils.js?preflight');
const { applyStatus, tickStatuses } = await import('../js/status-effects.js?preflight');
const { LOCATION_MUSIC_POOLS, LOCATION_MUSIC_CONTEXTS, chooseLocationTrack, validateLocationMusic } = await import('../js/location-music.js?v=statistics-music-20261005a');
const {BATTLE_THEME,DUNGEON_TRACKS}=await import('../js/audio-catalog.js?preflight');
const { configureAmbientAudioSession, audioSessionDiagnostics } = await import('../js/audio-session.js?preflight');
const { scaleEnemy } = await import('../js/enemy-scaling.js?preflight');
const {CURRENT_PLAYABLE_MAX_FLOOR,QA_PREVIEW_MAX_FLOOR,depthBandFor,roomWeightForDepth,encounterWeightForDepth,lootRarityWeightForDepth}=await import('../js/depth-config.js?preflight');
const { selectWithHistory, paceEncounterChance, chooseEncounterCategory, chooseEnemyAttack, monsterFamilies } = await import('../js/encounter-director.js?preflight');
const game = await import('../js/game.js?preflight');

let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`✓ ${name}`); }

check('all runtime JavaScript modules pass Node syntax validation',()=>{
  const sources=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sources(resolve(dir,entry.name)):[resolve(dir,entry.name)]);
  for(const file of [...sources(resolve('js')).filter(path=>path.endsWith('.js')),...['tools/art-report.mjs','tools/audio-report.mjs','tools/process-mascot-cutout.mjs'].map(path=>resolve(path))]){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(result.status,0,`${file}: ${result.stderr||result.stdout}`)}
});

function inspectTransparentPng(path) {
  const bytes=readFileSync(path);assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);assert.equal(bytes[24],8);assert.equal(bytes[25],6,'Town art must be RGBA');
  const chunks=[];let offset=8;while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=12+length;if(type==='IEND')break;}
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4;assert.equal(raw.length,(stride+1)*height);const pixels=Buffer.alloc(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};let x0=width,y0=height,x1=-1,y1=-1;
  for(let y=0;y<height;y++){const row=y*stride,rawRow=y*(stride+1),filter=raw[rawRow];assert.ok(filter<=4,`unsupported PNG row filter ${filter}`);for(let x=0;x<stride;x++){const left=x>=4?pixels[row+x-4]:0,up=y?pixels[row-stride+x]:0,upperLeft=y&&x>=4?pixels[row-stride+x-4]:0,predictor=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,upperLeft);pixels[row+x]=(raw[rawRow+1+x]+predictor)&255;}for(let x=0;x<width;x++)if(pixels[row+x*4+3]>=8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
  const alphaAt=(x,y)=>pixels[y*stride+x*4+3];assert.equal(alphaAt(0,0),0);assert.equal(alphaAt(width-1,0),0);assert.equal(alphaAt(0,height-1),0);assert.equal(alphaAt(width-1,height-1),0);
  assert.ok(x0<=12&&y0<=12&&width-1-x1<=12&&height-1-y1<=12,`Town image should be closely cropped: ${path}`);
  return {width,height};
}

check('content definitions have no critical validation errors', () => {
  const report = validateContent();
  assert.equal(report.errorCount, 0, JSON.stringify(report.errors));
  assert.equal(report.warningCount, 0, JSON.stringify(report.warnings));
});

check('character renderer preserves gear, pack, stats, slot, and accessible controls',()=>{
  const characterState={player:{name:'<Mira>',class:'Fighter',level:2,xp:12,str:4,agi:2,mind:1,vit:4,attack:6,defense:3,hp:14,maxHp:18,mp:5,maxMp:6},inventory:[{id:'rusty-sword',quantity:1},{id:'apprentice-staff',quantity:1},{id:'healing-tonic',quantity:2}],equipment:{head:null,body:null,mainHand:'rusty-sword',offHand:null,feet:null,accessory:null},combat:null};
  const inventory=characterState.inventory.map(entry=>({id:entry.id,item:items[entry.id],quantity:entry.quantity,provenance:[]}));
  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const render=(overrides={})=>renderCharacterScreen({state:characterState,header:()=>'<header></header>',townStatus:()=>'<nav></nav>',esc,stats:()=>'<div>Stat summary</div>',groupedInventory:()=>inventory,items,equipmentSlots:['head','body','mainHand','offHand','feet','accessory'],canEquipItem:(id,slot)=>items[id]?.slot===slot,itemMods:()=> 'No stat change',compareMarkup:()=>'<div>Comparison</div>',compareEquipment:()=>({deltas:{attack:2}}),inventoryUsed:()=>4,inventoryCapacity:()=>16,questReservedQuantity:()=>0,innEffectSummary:()=>['Well Rested · 2 fights'],...overrides});
  const gear=render();assert.match(gear,/aria-label="Choose Main Hand gear"/);assert.match(gear,/data-gear-slot="mainHand"/);assert.match(gear,/1 alternative/);assert.match(gear,/data-character-mode="pack"/);
  const pack=render({characterMode:'pack'});assert.match(pack,/Pack · 4\/16 slots/);assert.match(pack,/data-inspect="healing-tonic"/);assert.match(pack,/data-use="healing-tonic"/);
  const stats=render({characterMode:'stats'});assert.match(stats,/&lt;Mira&gt; · Level 2 Fighter/);assert.match(stats,/Well Rested · 2 fights/);
  const slot=render({gearSlot:'mainHand'});assert.match(slot,/aria-label="Back to Gear"/);assert.match(slot,/data-unequip="mainHand"/);assert.match(slot,/data-equip="apprentice-staff"/);
  const appSource=readFileSync(resolve('js/app.js'),'utf8');assert.equal((appSource.match(/renderCharacterPanel\(/g)||[]).length,1);assert.doesNotMatch(appSource,/inventoryViewMarkup|function renderCharacterScreen/,'the superseded character renderer must not stay in the app module');
});

check('all registered local runtime assets exist', () => {
  const refs = [];
  for (const monster of Object.values(monsters)) refs.push(monster.sprite?.src, monster.sprite?.ink, monster.sprite?.colored);
  for (const prop of Object.values(props)) refs.push(prop.ink, prop.colored);
  for (const assets of Object.values(TOWN_ART_ASSETS)) refs.push(assets.ink, assets.colored);
  for(const item of Object.values(items))refs.push(item.art?.ink,item.art?.colored);
  for(const registry of [ROOM_BACKGROUND_REGISTRY,BATTLE_BACKGROUND_REGISTRY])for(const entry of Object.values(registry))for(const variant of entry.variants||[])refs.push(variant.path);
  for(const entry of Object.values(INTERACTIVE_OBJECT_ART))refs.push(entry.ink,entry.colored);
  for(const entry of Object.values(MASCOT_ART))refs.push(entry.src,entry.ink,entry.colored);
  for(const npc of [...Object.values(townNpcs),...Object.values(dungeonNpcs)])refs.push(npc.art?.ink,npc.art?.colored);
  for (const path of ['assets/icons/favicon-16.png', 'assets/icons/favicon-32.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png']) refs.push(path);
  const manifest = JSON.parse(readFileSync(resolve('site.webmanifest'), 'utf8'));
  for (const icon of manifest.icons || []) refs.push(icon.src);
  for (const match of readFileSync(resolve('index.html'), 'utf8').matchAll(/(?:href|src)="(assets\/[^"?#]+)/g)) refs.push(match[1]);
  for (const file of ['css/styles.css', 'css/mechanics.css']) for (const match of readFileSync(resolve(file), 'utf8').matchAll(/url\(['"]?(assets\/[^)'"?#]+)/g)) refs.push(match[1]);
  const audioText = readFileSync(resolve('js/audio.js'), 'utf8');
  for (const match of audioText.matchAll(/(?:src|path):\s*['"](assets\/[^'"]+)['"]/g)) refs.push(match[1]);
  refs.push(BATTLE_THEME,...DUNGEON_TRACKS.map(track=>track.src));
  for (const track of Object.values(LOCATION_MUSIC_POOLS).flat()) refs.push(track.src);
  for (const path of new Set(refs.filter(Boolean))) assert.ok(existsSync(resolve(path)), `Missing asset: ${path}`);
});

check('DJ Penguin mascot registration and cutout preserve source art and transparent crop',()=>{
  const mascot=MASCOT_ART['dj-penguin'];assert.ok(mascot);assert.equal(mascot.id,'dj-penguin');assert.equal(mascot.role,'trivia-generator');assert.equal(mascot.src,'assets/images/mascots/dj-penguin.png');assert.equal(resolveArtVariant(mascot,'ink').src,mascot.src);
  assert.ok(existsSync(resolve('assets/source/mascots/dj-penguin.jpg')),'original mascot source should remain archived');
  const {width,height}=inspectTransparentPng(mascot.src);assert.ok(width<753&&height<1280,'runtime art should be cropped from the original scan');
});

check('background registries support empty, single, weighted, stable variants and CSS fallback',()=>{
  assert.equal(Object.keys(ROOM_BACKGROUND_REGISTRY).length,Object.keys(roomTypes).length);
  assert.equal(Object.keys(BATTLE_BACKGROUND_REGISTRY).length,Object.keys(roomTypes).length+1);
  assert.equal(selectBackgroundVariant({variants:[]},42),null);
  const one={id:'one',path:'assets/images/rooms/one.webp'};
  assert.equal(selectBackgroundVariant({variants:[one]},123),one);
  const weighted={variants:[{id:'a',path:'assets/images/rooms/a.webp',weight:1},{id:'b',path:'assets/images/rooms/b.webp',weight:2}]};
  assert.equal(selectBackgroundVariant(weighted,987),selectBackgroundVariant(weighted,987));
  const map={width:11,height:11,walls:[[0,0]],upStairs:[1,1],downStairs:[9,9]};
  assert.deepEqual(backgroundForRoom({roomType:'ordinary',map,floor:2,x:4,y:5}),backgroundForRoom({roomType:'ordinary',map,floor:2,x:4,y:5}));
  assert.equal(backgroundForRoom({roomType:'ordinary',map,floor:2,x:4,y:5}).fallback,'css');
  assert.equal(backgroundForRoom({roomType:'ordinary',map,floor:2,x:4,y:5,kind:'battle'}).fallback,'battle-css');
  const topology='front-wall-left-wall-right-wall',theme=backgroundForRoom({roomType:'ordinary',map,floor:2,x:4,y:5,setId:'dungeon-set-3',topologyId:topology});assert.equal(theme.variant.path,DUNGEON_SETS['dungeon-set-3'].backgrounds[topology].path);assert.equal(theme.variant.topologyId,topology);assert.equal(theme.setId,'dungeon-set-3');
  const battleRegistry={default:{id:'default',variants:[{id:'generic',path:'assets/images/rooms/battle.webp'}]},ordinary:{id:'ordinary',variants:[]}};
  assert.equal(backgroundForRoom({roomType:'ordinary',map,floor:2,x:4,y:5,kind:'battle',registry:battleRegistry}).variant.id,'generic');
  assert.equal(backgroundLayerMarkup({variant:null}),'');
  assert.match(backgroundLayerMarkup({roomType:'ordinary',variant:{id:'room',path:'assets/images/rooms/room.webp',focal:'left center',mobileFocal:'bad'}}),/<img class="scene-image-layer"/);
  assert.match(backgroundLayerMarkup({roomType:'ordinary',variant:{id:'room',path:'assets/images/rooms/room.webp',focal:'left center',mobileFocal:'bad'}}),/--scene-focal:left center/);
  assert.match(backgroundLayerMarkup({roomType:'ordinary',variant:{id:'room',path:'assets/images/rooms/room.webp',mobileFocal:'bad'}}),/--scene-mobile-focal:50% 50%/);
  assert.doesNotMatch(backgroundLayerMarkup({roomType:'ordinary',variant:{id:'room',path:'assets/images/rooms/room.webp'}}),/is-loaded/,'an unconfirmed image must leave the CSS scene visible');
  assert.match(backgroundLayerMarkup({roomType:'ordinary',variant:{id:'room',path:'assets/images/rooms/room.webp'}},{loaded:true}),/is-loaded/);
  assert.deepEqual(sceneImagePresentation('loaded'),{imageVisible:true,fallbackVisible:false,imageClass:'is-loaded',viewClass:'scene-view--image'});
  for(const status of ['loading','failed','missing'])assert.deepEqual(sceneImagePresentation(status),{imageVisible:false,fallbackVisible:true,imageClass:'',viewClass:''});
  assert.equal(validateBackgroundRegistry({ordinary:{id:'ordinary',variants:[],fallback:'css'}},['ordinary']).valid,true);
  assert.equal(validateBackgroundRegistry({ordinary:{id:'ordinary',variants:[{id:'bad',path:'https://example.invalid/bg.webp'}]}},['ordinary']).valid,false);
});

check('five dungeon sets include all forty registered topology backgrounds',()=>{
  assert.equal(DUNGEON_SET_IDS.length,5);assert.equal(DUNGEON_TOPOLOGIES.length,8);
  const validation=validateDungeonSetRegistry(DUNGEON_SETS,{exists:path=>existsSync(resolve(path))});assert.equal(validation.valid,true,validation.errors.join('\n'));
  const paths=DUNGEON_SET_IDS.flatMap(id=>DUNGEON_TOPOLOGIES.map(topology=>DUNGEON_SETS[id].backgrounds[topology.id].path));assert.equal(new Set(paths).size,40);assert.equal(paths.length,40);
  for(const path of paths){const bytes=readFileSync(resolve(path));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',path);assert.ok(bytes.length>1_000_000,path)}
  assert.equal(DUNGEON_SETS['dungeon-set-1'].name,'Wet Stone Dungeon');assert.equal(DUNGEON_SETS['dungeon-set-5'].name,'Impossible Dungeon');
});

check('all eight semantic openings map correctly for all four facings, including a back-only exit',()=>{
  const center=[3,3],directions=[[0,-1],[1,0],[0,1],[-1,0]];
  for(const topology of DUNGEON_TOPOLOGIES)for(let facing=0;facing<4;facing++){
    const [fx,fy]=directions[facing],[lx,ly]=directions[(facing+3)%4],[rx,ry]=directions[(facing+1)%4],[bx,by]=directions[(facing+2)%4],allowed=new Set([`${center[0]},${center[1]}`]);
    if(topology.front)allowed.add(`${center[0]+fx},${center[1]+fy}`);if(topology.left)allowed.add(`${center[0]+lx},${center[1]+ly}`);if(topology.right)allowed.add(`${center[0]+rx},${center[1]+ry}`);
    if(topology.id==='front-wall-left-wall-right-wall')allowed.add(`${center[0]+bx},${center[1]+by}`);
    const result=openingsForFacing({width:7,height:7,walls:[]},...center,facing,(x,y)=>allowed.has(`${x},${y}`));
    assert.equal(result.topologyId,topology.id,`facing ${facing}, ${topology.id}`);assert.equal(result.front,topology.front);assert.equal(result.left,topology.left);assert.equal(result.right,topology.right);
  }
  assert.equal(topologyIdForOpenings(false,false,false),'front-wall-left-wall-right-wall');
});

check('generated map openings select matching topology from assigned set for every cell and facing',()=>{
  for(let seed=1;seed<=24;seed++)for(let floor=1;floor<=7;floor++){
    const map=generateFloorMap(seed,floor),setId=assignedDungeonSetId(seed,floor);assert.ok(DUNGEON_SETS[setId]);
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)if(!wallAt({map},x,y))for(let facing=0;facing<4;facing++){
      const view=openingsForFacing(map,x,y,facing),asset=DUNGEON_SETS[setId].backgrounds[view.topologyId];assert.equal(asset.topologyId,view.topologyId);
    }
  }
});

check('per-floor visual themes stay deterministic, independent, and backward-compatible',()=>{
  const first=freshState(),assignments=first.dungeon.visualSets;assert.equal(Object.keys(assignments).length,7);for(const id of Object.values(assignments))assert.ok(DUNGEON_SETS[id]);
  const previous=assignments['1'];ensureDungeonVisualSets(first.dungeon,7);assert.equal(assignments['1'],previous);assert.deepEqual(ensureDungeonVisualSets({seed:first.dungeon.seed},7),assignments);
  assert.notEqual(assignedDungeonSetId(first.dungeon.seed,1),assignedDungeonSetId(first.dungeon.seed,2),'floor choices are keyed independently');
  const used=new Set(Array.from({length:250},(_,index)=>assignedDungeonSetId(index+1,1)));assert.equal(used.size,5,'all registered sets can be assigned');
  assert.equal(ensureDungeonVisualSets({seed:55,visualSets:{'1':'invalid'}},1)['1'],assignedDungeonSetId(55,1));
  const prior={...first.dungeon};delete prior.visualSets;const saved={...first,dungeon:prior};saveState(saved);const restored=loadState();assert.deepEqual(restored.dungeon.visualSets,assignments);assert.deepEqual(restored.dungeon.maps,first.dungeon.maps);
});

check('exploration and combat render distinct background and prop layers',()=>{
  const source=readFileSync(resolve('js/app.js'),'utf8'),css=readFileSync(resolve('css/mechanics.css'),'utf8');
  const battle=source.match(/const scene=combat\?`([\s\S]*?)`:`<div class="scene/s)?.[1]||'';
  assert.match(battle,/battle-scene--\$\{esc\(room\?\.id/);
  assert.match(battle,/\$\{sceneFocus\}/);
  assert.doesNotMatch(battle,/room-props|landmarkOverlay|npcLayer/);
  assert.match(source,/propMarkup=combat\?'':roomPropMarkup/);
  assert.match(source,/kind:combat\?'battle':'exploration'/);
  assert.match(css,/\.scene-view--image>\.scene-ceiling[^}]*display:none/);
  assert.match(css,/\.scene-image-layer\.is-loaded\{opacity:1\}/);
  assert.match(css,/\.battle-scene--image:before\{opacity:\.18\}/);
  assert.match(source,/app\.addEventListener\('load',e=>[\s\S]*scene-image-layer/);
  assert.match(source,/data-qa-bg-metrics/);
  assert.match(source,/data-qa-props/);
  assert.match(source,/toggle-css-fallback/);
  assert.match(source,/openingsForFacing\(d\.map,d\.x,d\.y,facing,open\)/,'scene topology must come from the actual map and facing');
  assert.match(source,/data-qa="set-visual-set"/);assert.match(source,/Preview all eight views/);assert.match(source,/dungeonBackgroundAssetStatus/);
});

check('large room props avoid open passages and use anchored perspective coordinates',()=>{
  const room=roomTypes.storage,map={width:11,height:11,walls:[[0,0]],upStairs:[1,1],downStairs:[9,9]};
  for(const topology of DUNGEON_TOPOLOGIES){
    const openings={front:topology.front,leftOpen:topology.left,rightOpen:topology.right};
    for(let variation=0;variation<30;variation++){
      const decoration=createRoomDecoration(room,map,4,5,5,variation,openings);
      for(const prop of decoration.props.filter(candidate=>candidate.footprint==='large')){
        assert.equal(topology.front&&(prop.zone==='far-center'||prop.zone==='wall-center'),false,`${topology.id} blocks front prop ${prop.id}`);
        assert.equal(topology.left&&(prop.zone==='far-left'||prop.zone==='mid-left'),false,`${topology.id} blocks left prop ${prop.id}`);
        assert.equal(topology.right&&(prop.zone==='far-right'||prop.zone==='mid-right'),false,`${topology.id} blocks right prop ${prop.id}`);
        assert.ok(Number.isFinite(prop.x)&&Number.isFinite(prop.y)&&prop.x>=0&&prop.x<=100&&prop.y>=0&&prop.y<=100);
        assert.ok(prop.perspectiveScale>0&&prop.depth>=1&&['floor','wall'].includes(prop.anchor));
        if(prop.anchor==='floor')assert.ok(prop.y>=60,`${prop.id} floor anchor is above the visible ground plane`);
      }
    }
  }
  const sample=createRoomDecoration(room,map,4,5,5,3,{front:true,leftOpen:true,rightOpen:false}).props[0];
  if(sample){const markup=roomPropMarkup({props:[sample]});assert.match(markup,/data-prop-x=/);assert.match(markup,/data-prop-depth=/);assert.match(markup,/data-prop-depth-scale=/);assert.match(markup,/data-prop-scale=/);assert.match(markup,/data-prop-final-scale=/);assert.match(markup,/translate\(-50%,-100%\)|translate\(-50%,-50%\)/)}
  const floorProp=createRoomDecoration(roomTypes.storage,map,4,5,5,0,{front:false,leftOpen:false,rightOpen:false}).props.find(prop=>prop.anchor==='floor');
  if(floorProp)assert.match(roomPropMarkup({props:[floorProp]}),/translate\(-50%,-100%\)/,'floor objects are bottom anchored');
  const wallProp={...props.bookshelf,zone:'wall-center',x:50,y:69,width:18,height:37,anchor:'wall',scale:1,perspectiveScale:.78,depth:1,flip:false};
  assert.match(roomPropMarkup({props:[wallProp]}),/translate\(-50%,-50%\)/,'wall objects use their wall anchor');
});

check('shared art resolver handles Colored, Ink, alternate style and fallback',()=>{
  const pair={ink:'assets/ink.png',colored:'assets/color.png'};
  assert.equal(resolveArtVariant(pair,'colored').src,pair.colored);
  assert.equal(resolveArtVariant(pair,'ink').src,pair.ink);
  assert.equal(resolveArtVariant({ink:pair.ink},'colored').src,pair.ink);
  assert.equal(resolveArtVariant({},'colored','assets/fallback.svg').src,'assets/fallback.svg');
  assert.equal(resolveArtVariant({},'colored').src,null);
  assert.equal(validateArtEntries({a:{id:'same'},b:{id:'same'}}).valid,false);
  assert.equal(validateArtEntries({x:{ink:'../outside.png',colored:'assets/color.png'}}).valid,false);
  assert.equal(validateArtEntries({optional:{}}).valid,true);
  assert.ok(Object.values(INTERACTIVE_OBJECT_ART).some(entry=>entry.kind==='landmark'));
  assert.equal(SCREEN_PRESENTATION.store.parent,'town');
  assert.equal(SCREEN_PRESENTATION.character.townBack,true);
});

check('generated art and audio inventories are current and valid',()=>{
  for(const script of ['tools/art-report.mjs','tools/audio-report.mjs']){
    const result=spawnSync(process.execPath,[script,'--check'],{encoding:'utf8'});
    assert.equal(result.status,0,`${script}: ${result.stderr||result.stdout}`);
  }
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

check('hand-drawn spoon replaces the single-spoon fallback and preserves its source',()=>{
  const spoon=props['single-spoon'];assert.ok(spoon);assert.ok(spoon.rooms.includes('spoons'));assert.ok(roomTypes.spoons.visual.propPool.includes('single-spoon'));assert.equal(spoon.placeholder,'spoon');
  for(const [style,path] of [['ink',spoon.ink],['colored',spoon.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} spoon must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=900&&png.readUInt32BE(20)<=900,'spoon image dimensions remain suitable for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/spoon-original.jpg')),'original spoon drawing remains archived');
  const sample={...spoon,flip:false,zone:'floor-center',scale:1,depth:3};assert.match(roomPropMarkup({props:[sample]},'ink'),/spoon-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/spoon-colored\.png/);
});

check('hand-drawn empty box is registered as a paired storage-room prop',()=>{
  const box=props['empty-box'];assert.ok(box);assert.ok(box.rooms.includes('storage'));assert.ok(roomTypes.storage.visual.propPool.includes('empty-box'));assert.equal(box.placeholder,'box');
  for(const [style,path] of [['ink',box.ink],['colored',box.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} box must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=1400&&png.readUInt32BE(20)<=1100,'empty box art dimensions remain suitable for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/empty-box-original.jpg')),'original empty-box drawing remains archived');
  const sample={...box,flip:false,zone:'far-left',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/empty-box-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/empty-box-colored\.png/);
});

check('Arcon record is registered as paired Municipal Records Room art',()=>{
  const record=props['arcon-record'];assert.ok(record);assert.ok(record.rooms.includes('records'));assert.ok(roomTypes.records.visual.propPool.includes('arcon-record'));assert.equal(record.placeholder,'papers');
  for(const [style,path] of [['ink',record.ink],['colored',record.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} record art must preserve PNG alpha`);assert.ok(png.readUInt32BE(16)<=1100&&png.readUInt32BE(20)<=900,'record art dimensions remain suitable for runtime use')}
  assert.ok(existsSync(resolve('assets/source/room-props/arcon-record-ink-cutout.png')),'cleaned line-art source reference remains archived');
  const sample={...record,flip:false,zone:'far-left',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/arcon-record-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/arcon-record-colored\.png/);
});

check('hand-drawn warning sign is paired transparent art across compatible room types',()=>{
  const sign=props['warning-sign'];assert.ok(sign);assert.equal(sign.placeholder,'sign');
  for(const room of sign.rooms)assert.ok(roomTypes[room].visual.propPool.includes('warning-sign'),`${room} includes warning sign`);
  for(const [style,path] of [['ink',sign.ink],['colored',sign.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} warning sign preserves PNG alpha`);assert.ok(png.readUInt32BE(16)<=800&&png.readUInt32BE(20)<=1000,'warning sign remains mobile-friendly size')}
  assert.ok(existsSync(resolve('assets/source/room-props/warning-sign-ink-cutout.png')),'cleaned line-art source reference remains archived');
  const sample={...sign,flip:false,zone:'far-left',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/warning-sign-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/warning-sign-colored\.png/);
});

check('second small door is registered as a distinct Library and Records prop',()=>{
  const door=props['arched-small-door'];assert.ok(door);assert.ok(door.rooms.includes('library')&&door.rooms.includes('records'));assert.equal(door.placeholder,'door');
  for(const room of door.rooms)assert.ok(roomTypes[room].visual.propPool.includes('arched-small-door'),`${room} includes arched door`);
  for(const [style,path] of [['ink',door.ink],['colored',door.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} arched door preserves PNG alpha`);assert.ok(png.readUInt32BE(16)<=850&&png.readUInt32BE(20)<=700,'arched door remains mobile-friendly size')}
  assert.ok(existsSync(resolve('assets/source/room-props/arched-small-door-ink-cutout.png')),'cleaned line-art source reference remains archived');
  const sample={...door,flip:false,zone:'wall-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/arched-small-door-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/arched-small-door-colored\.png/);
});

check('partially filled bookshelf is paired transparent Library art',()=>{
  const shelf=props['bookshelf-books'];assert.ok(shelf);assert.ok(shelf.rooms.includes('library'));assert.ok(roomTypes.library.visual.propPool.includes('bookshelf-books'));assert.equal(shelf.placeholder,'shelf');
  for(const [style,path] of [['ink',shelf.ink],['colored',shelf.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} bookshelf preserves PNG alpha`);assert.ok(png.readUInt32BE(16)<=750&&png.readUInt32BE(20)<=900,'bookshelf art remains mobile-friendly size')}
  assert.ok(existsSync(resolve('assets/source/room-props/bookshelf-books-ink-cutout.png')),'cleaned line-art source reference remains archived');
  const sample={...shelf,flip:false,zone:'wall-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/bookshelf-books-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/bookshelf-books-colored\.png/);
});

check('full bookshelf is a separate paired transparent Library variant',()=>{
  const shelf=props['bookshelf-full'];assert.ok(shelf);assert.ok(shelf.rooms.includes('library'));assert.ok(roomTypes.library.visual.propPool.includes('bookshelf-full'));assert.equal(shelf.placeholder,'shelf');
  for(const [style,path] of [['ink',shelf.ink],['colored',shelf.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} full bookshelf preserves PNG alpha`);assert.ok(png.readUInt32BE(16)<=750&&png.readUInt32BE(20)<=1000,'full bookshelf art remains mobile-friendly size')}
  assert.ok(existsSync(resolve('assets/source/room-props/bookshelf-full-ink-cutout.png')),'cleaned line-art source reference remains archived');
  const sample={...shelf,flip:false,zone:'wall-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/bookshelf-full-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/bookshelf-full-colored\.png/);
});

check('packed bookshelf is a separate paired transparent Library variant',()=>{
  const shelf=props['bookshelf-packed'];assert.ok(shelf);assert.ok(shelf.rooms.includes('library'));assert.ok(roomTypes.library.visual.propPool.includes('bookshelf-packed'));assert.equal(shelf.placeholder,'shelf');
  for(const [style,path] of [['ink',shelf.ink],['colored',shelf.colored]]){assert.ok(path);const png=readFileSync(resolve(path));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(png[25],6,`${style} packed bookshelf preserves PNG alpha`);assert.ok(png.readUInt32BE(16)<=750&&png.readUInt32BE(20)<=1000,'packed bookshelf art remains mobile-friendly size')}
  assert.ok(existsSync(resolve('assets/source/room-props/bookshelf-packed-ink-cutout.png')),'cleaned line-art source reference remains archived');
  const sample={...shelf,flip:false,zone:'wall-center',scale:1,depth:1};assert.match(roomPropMarkup({props:[sample]},'ink'),/bookshelf-packed-ink\.png/);assert.match(roomPropMarkup({props:[sample]},'colored'),/bookshelf-packed-colored\.png/);
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

check('Continue candidate loading falls back when primary storage read fails and reports its source',()=>{
  storage.clear();const backup=freshState();backup.player={name:'Backup After Read Error',class:'Fighter',hp:12,maxHp:20,mp:0,maxMp:0,effects:{}};storage.set(SAVE_BACKUP_KEY,JSON.stringify(backup));const get=localStorage.getItem;
  try{localStorage.getItem=key=>{if(key===SAVE_KEY)throw new Error('temporary primary read failure');return get(key)};const result=loadStateDetailed();assert.equal(result.state.player.name,'Backup After Read Error');assert.equal(result.diagnostics.source,'backup');assert.ok(result.diagnostics.errors.some(error=>error.includes('temporary primary read failure')));assert.equal(result.state.meta.recoveredFromBackup,true)}finally{localStorage.getItem=get}
});

check('missing primary with valid backup and no recoverable save are distinguished',()=>{
  storage.clear();let result=loadStateDetailed();assert.equal(result.state,null);assert.equal(result.diagnostics.lastError,'no recoverable save');const backup=freshState();backup.player={name:'Backup Only',class:'Rogue',hp:9,maxHp:19,mp:2,maxMp:6,effects:{}};storage.set(SAVE_BACKUP_KEY,JSON.stringify(backup));result=loadStateDetailed();assert.equal(result.state.player.name,'Backup Only');assert.equal(result.diagnostics.source,'backup');assert.equal(result.diagnostics.primaryPresent,false);assert.equal(result.diagnostics.backupPresent,true)
});

check('a newer malformed primary does not overwrite an existing raw recovery copy',()=>{
  storage.clear();const prior='{older raw save}';storage.set(SAVE_RECOVERY_KEY,prior);storage.set(SAVE_KEY,'{newer raw save}');const result=loadStateDetailed();assert.equal(result.state,null);assert.equal(storage.get(SAVE_RECOVERY_KEY),prior);assert.ok([...storage.entries()].some(([key,value])=>key.startsWith(`${SAVE_RECOVERY_KEY}-`)&&value==='{newer raw save}'));assert.equal(result.diagnostics.recoveryCopyPreserved,true)
});

check('repeated valid Continue candidate reads are side-effect free and consistently recover',()=>{
  storage.clear();const valid=freshState();valid.player={name:'Repeat Candidate',class:'Wizard',hp:8,maxHp:18,mp:5,maxMp:12,effects:{}};storage.set(SAVE_KEY,JSON.stringify(valid));for(let i=0;i<300;i++){const result=loadStateDetailed();assert.equal(result.state.player.name,'Repeat Candidate');assert.equal(result.diagnostics.source,'primary')}assert.equal(JSON.parse(storage.get(SAVE_KEY)).player.name,'Repeat Candidate')
});

check('Continue UI remains delegated, idempotent, reports load failure, and isolates audio errors',()=>{
  const appSource=readFileSync(resolve('js/app.js'),'utf8');assert.match(appSource,/app\.addEventListener\('click'/);assert.match(appSource,/function continueGame\(button\)\{if\(continueLoadBusy\|\|screen!=='title'\)return/);assert.match(appSource,/continueError='Couldn’t load that save\.'/);assert.match(appSource,/if\(!qa&&\(saved\.dungeon\?\.floor\|\|1\)>CURRENT_PLAYABLE_MAX_FLOOR\)/,'normal Continue must route over-cap saves safely to Town');assert.match(appSource,/dungeon\.maps\?\.\['1'\]/,'over-cap save records remain available when clamping the active session');assert.match(appSource,/try\{syncMusic\(\)\}catch\(error\)/)
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
  assert.match(css,/\.town-hub \.location--art-destination::before\{display:none;content:none\}/,'Town art buttons should suppress UI-generated backplates');
  assert.doesNotMatch(css,/\.town-hub \.location--art-destination(?:\.location-[\w-]+)?::before\{[^}]*radial-gradient/,'Town art buttons should not have pale radial backplates');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole\{[^}]*grid-column:1\/-1[^}]*height:clamp\([^)]*\)[^}]*border:0[^}]*background:transparent[^}]*box-shadow:none/,'Hole should be a prominent transparent art hit area with no visible shell');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole \.location-art--illustration img\{filter:drop-shadow/,'Hole illustration should preserve aspect ratio and high-contrast edge separation');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole:active|\.town-hub \.location--art-destination:active/,'art buttons should retain a pressed-state response');
  assert.match(css,/\.town-hub \.location--art-destination\.location-hole:focus-visible\{outline:/,'Hole should keep keyboard-visible focus treatment');
  assert.match(css,/\.town-hub \.location--art-destination:focus-visible\{[^}]*outline/);
  assert.match(appSource,/resolveArtVariant\(assets,style\)/,'Town art should share the unified Ink/Colored resolver');
  const townBranch=appSource.match(/if\(screen==='town'\).*?if\(screen==='quests'\)/s)?.[0]||'';
  assert.ok(townBranch,'Town hub render branch should be present');
  assert.match(townBranch,/renderTownDestinations\(\{artMarkup:townArtMarkup/,'Town destinations are rendered from the shared registry');
  const townMarkup=renderTownDestinations({artMarkup:(slot,fallback)=>`<art data-slot="${slot}">${fallback}</art>`});
  assert.equal(TOWN_DESTINATIONS.length,8);
  for(const [target,name,slot] of [['dungeon','Enter the Hole','the-hole'],['store','General Store','general-store'],['inn','The Inn','inn'],['quests','Quest Board','quest-board'],['statistics','Statistics','statistics'],['character','Character','character'],['achievements','Achievements','achievements']])assert.match(townMarkup,new RegExp(`data-art-slot="${slot}" data-go="${target}" aria-label="${name}"`),`${name} art button should keep its accessible name and navigation`);
  assert.match(townMarkup,/data-art-slot="settings" data-action="settings" aria-label="Settings"/,'Settings art button should keep its accessible name and action');
  assert.match(townMarkup,/<button class="location location-hole location--art-destination" data-art-slot="the-hole" data-go="dungeon" aria-label="Enter the Hole"><art/,'Hole drawing should remain inside its full-tile dungeon navigation button');
  assert.doesNotMatch(townMarkup,/town-destination-label|ENTER THE HOLE|GENERAL STORE|THE INN|QUEST BOARD|CHARACTER|STATISTICS|ACHIEVEMENTS|SETTINGS|Deepest:/,'art-backed destinations should not render visible caption bubbles');
  assert.match(townBranch,/town-deepest-note[^<]*Deepest recorded: Floor/,'deepest-floor information stays in a separate Town note, outside the Hole button');
  assert.match(appSource,/function townArtMarkup\(slot,fallback,service=false\)/,'Town artwork keeps its single shared renderer');
  assert.match(appSource,/image\.parentElement\.classList\.add\('is-missing-art'\)/,'Missing Town art should fall back without losing navigation');
  assert.doesNotMatch(townMarkup,/Market cycle|HP \d|new notices|ready to turn in/,'art-led Town destinations should omit redundant status lines');
});

check('Old Foundations configuration keeps the release cap sealed and preserves all room types',()=>{
  assert.equal(CURRENT_PLAYABLE_MAX_FLOOR,3);assert.equal(QA_PREVIEW_MAX_FLOOR,7);
  for(let floor=4;floor<=7;floor++)assert.equal(depthBandFor(floor).id,'old-foundations');
  for(const room of Object.values(roomTypes))assert.ok(roomWeightForDepth(room,4)>0,`${room.id} remains eligible`);
  assert.ok(lootRarityWeightForDepth('uncommon',4)>1);assert.equal(lootRarityWeightForDepth('strange',7),1);
  assert.ok(encounterWeightForDepth({weight:1},monsters.heartAttack,4)>1);
  assert.ok(floorEncounterTable[4]);assert.equal(new Set(floorEncounterTable[4].map(row=>row.id)).size,12);
  for(const id of ['foundations-entry','foundations-records','wrong-map-marker','wrong-map-return'])assert.equal(quests[id].minDepth,4,`${id} stays locked until Floor 4`);
  assert.equal(Object.keys(roomDepthPresentation).length,5);
});

check('Floor 4 event and quest content stays unavailable below its depth gate',()=>{
  game.setState(freshState());game.startGame('Depth gate','Fighter');
  for(const id of ['old-survey-marker','flooded-records','collapsed-storage','abandoned-crew-camp','old-warning-sign','second-small-door']){assert.equal(dungeonEvents[id].minDepth,4);assert.equal(dungeonEvents[id].maxDepth,4);assert.equal(game.triggerEvent(id),false)}
  game.state.quests.available.push('foundations-entry');assert.equal(game.questStatus('foundations-entry').status,'unavailable');assert.equal(game.acceptQuest('foundations-entry'),false);
  assert.equal(game.qaSetFloor(4),true);assert.equal(game.questDepthEligible('foundations-entry'),true);assert.equal(game.triggerEvent('flooded-records'),true);
  const resolved=game.resolveDungeonEvent('flooded-records','inspect');assert.equal(resolved.ok,true);assert.equal(game.state.dungeon.eventFlags['old-records-inspected'],true);
  game.talkNpc('lost-surveyor');assert.equal(game.questStatus('foundations-records').status,'available');assert.equal(game.acceptQuest('foundations-records'),true);
  assert.equal(game.state.dungeon.qaPreviewOnly,true);
});

check('QA preview controls are opt-in, visibly marked and bounded by configured preview depth',()=>{
  const app=readFileSync(resolve('js/app.js'),'utf8');assert.match(app,/qaPanel=qa\?`/);assert.match(app,/name="previewFloor"/);assert.match(app,/PREVIEW \/ QA ONLY/);assert.match(app,/d\.floor>CURRENT_PLAYABLE_MAX_FLOOR/);assert.match(app,/descend\(\{qaPreview:qa\}\)/);assert.match(app,/qa\?QA_PREVIEW_MAX_FLOOR:CURRENT_PLAYABLE_MAX_FLOOR/);
});

check('10,000 Old Foundations floor generations are connected, deterministic and within bounds',()=>{
  const totals={};
  for(let floor=4;floor<=7;floor++){let minWalkable=Infinity,maxPath=0,totalWalkable=0;
    for(let sample=0;sample<2500;sample++){const seed=(sample*7919+floor*104729)>>>0,map=generateFloorMap(seed,floor),again=generateFloorMap(seed,floor),report=validateFloorMap(map);
      assert.ok(report.valid,`floor ${floor}, sample ${sample}: ${report.errors.join(', ')}`);
      assert.deepEqual(map,again,`floor ${floor} seed ${seed} is deterministic`);assert.equal(map.width,11);assert.equal(map.height,11);
      minWalkable=Math.min(minWalkable,report.metrics.walkable);maxPath=Math.max(maxPath,report.metrics.shortestStairPath);totalWalkable+=report.metrics.walkable;
    }
    totals[floor]={samples:2500,minWalkable,meanWalkable:Number((totalWalkable/2500).toFixed(1)),maxStairPath:maxPath};
  }
  console.log(`  Floors 4–7 generation: ${JSON.stringify(totals)}`);
});

check('400 deep-floor return routes, safe returns, and interrupted-route resumptions work; Floor 3 remains sealed',()=>{
  let safeReturns=0,interrupted=0,resumed=0;const chances={4:[],5:[],6:[],7:[]};let deepSaveBytes=0;
  for(let floor=4;floor<=7;floor++)for(let sample=1;sample<=100;sample++){
    game.setState(freshState());game.startGame('Deep QA','Fighter');const d=game.state.dungeon,seed=(sample*3571+floor*104729)>>>0;
    d.seed=seed;d.maps=Object.fromEntries(Array.from({length:floor},(_,i)=>i+1).map(n=>[n,generateFloorMap(seed,n)]));d.map=d.maps['1'];
    assert.equal(game.qaSetFloor(floor),true,`QA Floor ${floor} should load`);assert.equal(d.floor,floor);assert.equal(validateFloorMap(d.map).valid,true);
    const plan=game.returnPlan();assert.ok(plan.ok,`Floor ${floor}, seed ${seed} return route`);assert.equal(plan.route.at(-1).floor,1);chances[floor].push(plan.chancePercent);
    if(sample%10===0){const result=game.attemptReturn('interrupt');assert.equal(result.interrupted,true);assert.ok(game.state.combat);interrupted++;
      game.state.combat=null;const resumedPlan=game.returnPlan();assert.ok(resumedPlan.ok,`Floor ${floor} seed ${seed} resumes a known route after interruption`);const returned=game.attemptReturn('safe');assert.equal(returned.ok,true);assert.equal(d.inDungeon,false);resumed++;
    }else{const returned=game.attemptReturn('safe');assert.equal(returned.ok,true);assert.equal(d.inDungeon,false);safeReturns++}
  }
  assert.equal(safeReturns,360);assert.equal(interrupted,40);assert.equal(resumed,40);
  deepSaveBytes=Buffer.byteLength(JSON.stringify(game.state));
  console.log(`  return odds by floor (min/mean/max): ${JSON.stringify(Object.fromEntries(Object.entries(chances).map(([floor,values])=>[floor,[Math.min(...values),Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(1)),Math.max(...values)]])))}; synthetic Floors 1–7 state ${deepSaveBytes} bytes`);
  game.setState(freshState());game.startGame('Cap Check','Fighter');assert.equal(game.qaSetFloor(3),true);
  const map=game.state.dungeon.map,d=game.state.dungeon;d.x=map.downStairs[0];d.y=map.downStairs[1];
  assert.match(game.descend(),/sealed municipal door/);assert.equal(d.floor,3);
  assert.equal(game.qaSetFloor(4),true);d.x=d.map.downStairs[0];d.y=d.map.downStairs[1];assert.match(game.descend(),/sealed municipal door/);assert.equal(d.floor,4);
  assert.match(game.descend({qaPreview:true}),/level 5/i);assert.equal(d.floor,5);
  assert.equal(game.qaSetFloor(7),true);d.x=d.map.downStairs[0];d.y=d.map.downStairs[1];assert.match(game.descend({qaPreview:true}),/QA preview ends/);assert.equal(d.floor,7);
  assert.equal(game.state.dungeon.qaPreviewOnly,true,'preview state is clearly marked in memory');
  const savedBeforePreview=storage.get(SAVE_KEY);assert.equal(game.qaSetFloor(3),true);assert.equal(game.state.dungeon.qaPreviewOnly,true,'returning the selector to a playable-depth map does not clear the preview-session save guard');game.persist();assert.equal(storage.get(SAVE_KEY),savedBeforePreview,'preview-only state must not overwrite the playable save');
  assert.equal(game.qaSetFloor(8),false);
});

check('art-backed Town buttons are label-free, accessible, and keep full-tile navigation',()=>{
  const appSource=readFileSync(resolve('js/app.js'),'utf8'),css=readFileSync(resolve('css/mechanics.css'),'utf8'),townMarkup=renderTownDestinations({artMarkup:(slot)=>`<img data-slot="${slot}">`});
  assert.equal(TOWN_DESTINATIONS.length,8);
  for(const destination of TOWN_DESTINATIONS){assert.match(townMarkup,new RegExp(`aria-label="${destination.ariaLabel}"`),`${destination.id} keeps its semantic name`);assert.match(townMarkup,new RegExp(`data-art-slot="${destination.slot}"`),`${destination.id} keeps its art registration`);if(destination.route)assert.match(townMarkup,new RegExp(`data-go="${destination.route}"`),`${destination.id} keeps navigation`);else assert.match(townMarkup,new RegExp(`data-action="${destination.action}"`),`${destination.id} keeps its action`)}
  assert.doesNotMatch(townMarkup,/town-destination-label|ENTER THE HOLE|GENERAL STORE|THE INN|QUEST BOARD|CHARACTER|STATISTICS|ACHIEVEMENTS|SETTINGS|Deepest:/);
  assert.match(appSource,/renderTownDestinations/);assert.match(css,/town-hub \.location--art-destination::before\{display:none;content:none\}/);assert.doesNotMatch(css,/town-destination-label/);assert.match(css,/\.town-hub \.location--art-destination:not\(\.location-hole\) \.location-art--illustration\{inset:0\}/);assert.match(css,/\.town-hub \.location--art-destination\.location-hole \.location-art--illustration\{inset:0\}/);assert.match(css,/town-art-image--ink/)
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

check('25,000 room-weight choices per Old Foundations floor retain full room variety',()=>{
  let seed=28201;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},report={};
  for(let floor=4;floor<=7;floor++){const counts=new Map(),rows=Object.values(roomTypes).filter(room=>(room.minDepth||1)<=floor).map(room=>({...room,weight:roomWeightForDepth(room,floor)}));
    for(let i=0;i<25000;i++){const room=weightedChoice(rows,random);assert.ok(room);counts.set(room.id,(counts.get(room.id)||0)+1)}
    for(const room of rows)assert.ok(counts.get(room.id)>0,`${room.id} appeared at floor ${floor}`);
    report[floor]=Object.fromEntries([...counts].map(([id,count])=>[id,`${(100*count/25000).toFixed(1)}%`]));
  }
  console.log(`  deep room selection: ${JSON.stringify(report)}`);
});

check('1,000 encounter economy samples per Old Foundations floor stay within the existing reward curve',()=>{
  const report={};for(let floor=4;floor<=7;floor++){const estimate=game.qaEconomySimulation(1000,floor);assert.equal(estimate.runs,1000);assert.ok(estimate.averageGold>0&&estimate.averageGold<80);assert.ok(estimate.averageXp>0&&estimate.averageXp<100);assert.ok(estimate.averageIncomingDamagePerEnemyAction>0);report[floor]=estimate}
  console.log(`  deep encounter economy: ${JSON.stringify(report)}`);
});

check('four-class no-counter combat sample stays winnable across every Old Foundations depth',()=>{
  const summary={},classes=['Fighter','Wizard','Rogue','Cleric'];
  for(let floor=4;floor<=7;floor++){let fights=0,wins=0,losses=0,roundTotal=0,damageTotal=0,maxRounds=0;
    const rows=(floorEncounterTable[3]||[]).filter(row=>monsters[row.id]?.minDepth<=floor);
    for(let classIndex=0;classIndex<classes.length;classIndex++)for(const row of rows)for(let sample=0;sample<10;sample++){
      game.setState(freshState());game.startGame('Combat sample',classes[classIndex]);const d=game.state.dungeon;d.seed=(floor*1000003+classIndex*10007+sample*97+rows.indexOf(row))>>>0;
      assert.equal(game.qaSetFloor(floor),true);game.qaSetLevel(floor+1);assert.equal(game.qaSpawnMonster(row.id,floor),true);
      let rounds=0,damage=0;while(game.state.combat&&game.state.player.hp>0&&rounds<60){const before=game.state.player.hp;game.attack();damage+=before-game.state.player.hp;rounds++}
      fights++;roundTotal+=rounds;damageTotal+=damage;maxRounds=Math.max(maxRounds,rounds);
      if(game.state.dungeon.lastDefeat?.pending)losses++;else wins++;
    }
    assert.equal(fights,classes.length*rows.length*10);assert.ok(wins>0,`no-counter combat produced no wins at floor ${floor}`);assert.ok(maxRounds<60);
    summary[floor]={fights,wins,losses,winRate:`${(wins/fights*100).toFixed(1)}%`,meanRounds:Number((roundTotal/fights).toFixed(1)),meanDamageTaken:Number((damageTotal/fights).toFixed(1)),maxRounds};
  }
  console.log(`  deep combat baseline: ${JSON.stringify(summary)}`);
});

check('25,000 encounter decisions and loot rolls per representative depth stay varied, including each Old Foundations floor',()=>{
  let seed=739391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const encounterReport={},lootReport={};
  for(const floor of [1,3,4,5,6,7,10]){const categories={combat:0,event:0,quiet:0,npc:0},monstersSeen=new Map(),history=[];let emptySteps=0,streak=0,repeat=0,previous='';const rows=(floorEncounterTable[floor]||floorEncounterTable[3]).filter(row=>monsters[row.id]?.minDepth<=floor).map(row=>({...row,weight:encounterWeightForDepth(row,monsters[row.id],floor)}));
    for(let i=0;i<25000;i++){const chance=paceEncounterChance({combat:({1:.13,2:.19,3:.25})[floor]||.27,event:({1:.09,2:.13,3:.18})[floor]||.2,emptySteps,encounterStreak:streak});if(random()<.035){categories.npc++;emptySteps=0;streak++}else{const category=chooseEncounterCategory(chance,random);categories[category]++;if(category==='combat'){const selected=selectWithHistory(rows,history,row=>monsters[row.id].id,random,.55);const id=selected.id;if(id===previous)repeat++;previous=id;monstersSeen.set(id,(monstersSeen.get(id)||0)+1);history.push({type:'monster',id:monsters[id].id});if(history.length>12)history.shift();emptySteps=0;streak++}else if(category==='event'){emptySteps=0;streak++}else{emptySteps++;streak=0}}}
    const repeatRate=repeat/Math.max(1,categories.combat);assert.ok(categories.combat>1500&&categories.event>1000&&categories.quiet>3750&&categories.npc>250,`starved depth ${floor}: ${JSON.stringify(categories)}`);assert.ok(repeatRate<.25,`rapid monster repeats too common at ${floor}: ${repeatRate}`);encounterReport[floor]={categories:Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,`${(100*v/25000).toFixed(1)}%`])),monsterImmediateRepeat:`${(repeatRate*100).toFixed(1)}%`,top:[...monstersSeen].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>`${monsters[id].name} ${n}`)};
    const rarityCounts={common:0,uncommon:0,rare:0,strange:0},itemCounts=new Map();for(let i=0;i<25000;i++){const row=selectWithHistory(rows,[],entry=>monsters[entry.id].id,random,.55),monster=monsters[row.id],table=lootTables[monster.lootTable]||[],rarityMultiplier=Math.min(2,1+(floor-1)*.06),adjusted=table.map(entry=>{const rarity=items[entry.item]?.rarity||'common',factor=({common:62,uncommon:25,rare:10,strange:3}[rarity]||62)/62;return {...entry,rarity,weight:entry.weight*factor*lootRarityWeightForDepth(rarity,floor)*(rarity==='rare'||rarity==='strange'?rarityMultiplier:1)}}),drop=weightedChoice(adjusted,random);if(drop){rarityCounts[drop.rarity]++;itemCounts.set(drop.item,(itemCounts.get(drop.item)||0)+1)}}
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
