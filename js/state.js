export const SAVE_KEY='mirpworks-hole-town-save';
export const SAVE_VERSION=2;
export const INVENTORY_CAPACITY=16;
export const EQUIPMENT_SLOTS=['head','body','mainHand','offHand','feet','accessory'];

const walls=[[0,0],[1,0],[2,0],[4,0],[5,0],[6,0],[0,1],[6,1],[0,2],[3,2],[6,2],[0,3],[6,3],[0,4],[2,4],[6,4],[0,5],[6,5],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6]];
export function createFloorMap(){return {width:7,height:7,walls:walls.map(([x,y])=>[x,y]),upStairs:[5,1],downStairs:[5,5]}}
export function freshState(){return {saveVersion:SAVE_VERSION,player:null,inventory:[],equipment:{},town:{gold:25},quests:{active:[],completed:[],available:['rat-problem','lost-lunchbox','stone-sample','goose-feather','earthworm-ember','depth-three']},dungeon:{floor:1,deepestFloor:1,x:1,y:5,facing:0,explored:['1,5'],visited:{'1':['1,5']},map:createFloorMap(),seed:Math.floor(Math.random()*2147483646)+1,encounterStep:0,encounters:[],npcs:[],groundLoot:[],currentNpcId:null,finds:[],lootTaken:false,rat:{x:4,y:3,hp:8,alive:true}},combat:null,settings:{inventoryCapacity:INVENTORY_CAPACITY},meta:{createdAt:Date.now(),updatedAt:Date.now()}}}

function migrateV1(s){
  const oldEquipment=s.equipment||{};
  s.equipment={mainHand:oldEquipment.mainHand||oldEquipment.weapon||'rusty-sword',body:oldEquipment.body||oldEquipment.armor||'patched-coat'};
  if(s.player){s.player.baseMaxHp=s.player.baseMaxHp??s.player.maxHp??s.player.hp??20;s.player.baseMaxMp=s.player.baseMaxMp??s.player.maxMp??s.player.mp??0;s.player.effects=s.player.effects||{};s.player.level=s.player.level||1;s.player.xp=s.player.xp||0;}
  s.dungeon=s.dungeon||{};s.dungeon.floor=Math.max(1,s.dungeon.floor||1);s.dungeon.deepestFloor=Math.max(s.dungeon.floor,s.dungeon.deepestFloor||1);s.dungeon.map={...createFloorMap(),...(s.dungeon.map||{}),upStairs:s.dungeon.map?.upStairs||s.dungeon.map?.stairs||[5,1],downStairs:s.dungeon.map?.downStairs||[5,5]};s.dungeon.explored=(s.dungeon.explored||[]).map(cell=>cell.includes(':')?cell:`${s.dungeon.floor}:${cell}`);s.dungeon.seed=s.dungeon.seed||Math.floor(Math.random()*2147483646)+1;s.dungeon.encounterStep=s.dungeon.encounterStep||0;s.dungeon.encounters=s.dungeon.encounters||[];s.dungeon.npcs=s.dungeon.npcs||[];s.dungeon.groundLoot=s.dungeon.groundLoot||[];s.dungeon.currentNpcId=null;s.dungeon.finds=s.dungeon.finds||[];if(s.dungeon.lootTaken&&!s.dungeon.finds.includes('cache-1-first'))s.dungeon.finds.push('cache-1-first');s.player&&(s.player.turns=s.player.turns||0);if(s.combat?.enemy)s.combat={monsterId:'rat',hp:s.combat.hp||4,maxHp:8,x:s.dungeon.x,y:s.dungeon.y,guard:false,burnTurns:0};else s.combat=null;s.settings=s.settings||{};s.town=s.town||{gold:0};s.quests=s.quests||{active:[],completed:[],available:[]};s.quests.active=s.quests.active||[];s.quests.completed=s.quests.completed||[];s.quests.available=s.quests.available||[];const known=[...s.quests.active.map(q=>q.id),...s.quests.completed,...s.quests.available];for(const id of ['goose-feather','earthworm-ember','depth-three'])if(!known.includes(id))s.quests.available.push(id);s.meta=s.meta||{createdAt:Date.now(),updatedAt:Date.now()};s.saveVersion=2;return s;
}
function migrate(s){
  if(s.saveVersion===1)return migrateV1(s);
  if(s.saveVersion!==SAVE_VERSION)return null;
  s.equipment=s.equipment||{};s.inventory=s.inventory||[];s.dungeon=s.dungeon||{};s.dungeon.deepestFloor=Math.max(s.dungeon.floor||1,s.dungeon.deepestFloor||1);s.dungeon.map={...createFloorMap(),...(s.dungeon.map||{})};s.dungeon.encounters=s.dungeon.encounters||[];s.dungeon.npcs=s.dungeon.npcs||[];s.dungeon.groundLoot=s.dungeon.groundLoot||[];s.dungeon.finds=s.dungeon.finds||[];s.settings=s.settings||{};s.meta=s.meta||{createdAt:Date.now(),updatedAt:Date.now()};return s;
}
export function loadState(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(!parsed||!parsed.saveVersion)return null;return migrate(parsed)}catch{return null}}
export function saveState(s){s.meta=s.meta||{};s.meta.updatedAt=Date.now();s.saveVersion=SAVE_VERSION;try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true}catch{return false}}
export function hasSave(){return !!loadState()}
export function wallAt(d,x,y){return d.map.walls.some(([wx,wy])=>wx===x&&wy===y)}
