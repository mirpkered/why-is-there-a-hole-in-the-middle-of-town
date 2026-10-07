// Image file numbering is an import detail. Gameplay selects by the semantic
// front/left/right topology below so art can never influence map geometry.
export const DUNGEON_TOPOLOGIES=Object.freeze([
  {id:'front-wall-left-open-right-wall',file:'01-dead-end-left-opening.png',front:false,left:true,right:false},
  {id:'front-wall-left-wall-right-open',file:'02-dead-end-right-opening.png',front:false,left:false,right:true},
  {id:'front-wall-left-open-right-open',file:'03-dead-end-both-side-openings.png',front:false,left:true,right:true},
  {id:'front-open-left-open-right-wall',file:'04-forward-left-open-right-wall.png',front:true,left:true,right:false},
  {id:'front-open-left-wall-right-open',file:'05-forward-right-open-left-wall.png',front:true,left:false,right:true},
  {id:'front-open-left-open-right-open',file:'06-forward-left-right-openings.png',front:true,left:true,right:true},
  {id:'front-open-left-wall-right-wall',file:'07-forward-open-variant.png',front:true,left:false,right:false},
  {id:'front-wall-left-wall-right-wall',file:'08-true-dead-end.png',front:false,left:false,right:false}
]);

const setNames=['Wet Stone Dungeon','Ancient Catacombs','Natural Cave','Derelict Basement','Impossible Dungeon'];
export const DUNGEON_SETS=Object.freeze(Object.fromEntries(setNames.map((name,index)=>{
  const id=`dungeon-set-${index+1}`;
  return [id,Object.freeze({id,name,backgrounds:Object.freeze(Object.fromEntries(DUNGEON_TOPOLOGIES.map(topology=>[topology.id,Object.freeze({id:`${id}:${topology.id}`,topologyId:topology.id,path:`assets/images/dungeon-sets/${id}/${topology.file}`,weight:1,enabled:true,focal:'50% 50%',mobileFocal:'50% 50%',scale:1,overlay:.04})])))})];
})));
export const DUNGEON_SET_IDS=Object.freeze(Object.keys(DUNGEON_SETS));
const topologyKey=(front,left,right)=>`${front?'front-open':'front-wall'}-${left?'left-open':'left-wall'}-${right?'right-open':'right-wall'}`;
export function topologyIdForOpenings(front,left,right){return topologyKey(!!front,!!left,!!right)}

const DIRECTIONS=Object.freeze([[0,-1],[1,0],[0,1],[-1,0]]);
export function openingsForFacing(map,x,y,facing,isOpen){
  const direction=((Math.floor(Number(facing)||0)%4)+4)%4,[fx,fy]=DIRECTIONS[direction],[lx,ly]=DIRECTIONS[(direction+3)%4],[rx,ry]=DIRECTIONS[(direction+1)%4];
  const open=typeof isOpen==='function'?isOpen:(cx,cy)=>cx>=0&&cy>=0&&cx<map.width&&cy<map.height&&!map.walls.some(([wx,wy])=>wx===cx&&wy===cy);
  const front=open(x+fx,y+fy),left=open(x+lx,y+ly),right=open(x+rx,y+ry);
  return {front,left,right,topologyId:topologyIdForOpenings(front,left,right)};
}

function hash32(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
export function assignedDungeonSetId(runSeed,floor){return DUNGEON_SET_IDS[hash32(`${Number(runSeed)||1}:floor-theme:${Math.max(1,Math.floor(Number(floor)||1))}`)%DUNGEON_SET_IDS.length]}
export function ensureDungeonVisualSets(dungeon,maxFloor=7){
  if(!dungeon||typeof dungeon!=='object')return {};
  const existing=dungeon.visualSets&&typeof dungeon.visualSets==='object'&&!Array.isArray(dungeon.visualSets)?dungeon.visualSets:{};
  dungeon.visualSets=existing;
  const last=Math.max(1,Math.floor(Number(maxFloor)||7));
  for(let floor=1;floor<=last;floor++)if(!DUNGEON_SETS[existing[String(floor)]])existing[String(floor)]=assignedDungeonSetId(dungeon.seed,floor);
  return existing;
}
export function getFloorVisualSet(dungeon,floor){
  const assignments=ensureDungeonVisualSets(dungeon,Math.max(7,Number(floor)||1));
  return DUNGEON_SETS[assignments[String(floor)]]||DUNGEON_SETS[DUNGEON_SET_IDS[0]];
}
