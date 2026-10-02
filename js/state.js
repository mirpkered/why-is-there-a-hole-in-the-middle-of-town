export const SAVE_KEY='mirpworks-hole-town-save';
export const SAVE_VERSION=1;
const floorMap={width:7,height:7,walls:[[0,0],[1,0],[2,0],[4,0],[5,0],[6,0],[0,1],[6,1],[0,2],[3,2],[6,2],[0,3],[6,3],[0,4],[2,4],[6,4],[0,5],[6,5],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6]],stairs:[5,1]};
export function freshState(){return {saveVersion:SAVE_VERSION,player:null,inventory:[],equipment:{weapon:'rusty-sword',armor:'patched-coat'},town:{gold:25},quests:{active:[],completed:[],available:['rat-problem','lost-lunchbox','stone-sample']},dungeon:{floor:1,x:1,y:5,facing:0,explored:['1,5'],visited:{'1':['1,5']},map:floorMap,rat:{x:4,y:3,hp:8,alive:true},lootTaken:false},combat:null,settings:{},meta:{createdAt:Date.now(),updatedAt:Date.now()}}}
export function loadState(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(!parsed||!parsed.saveVersion)return null;return migrate(parsed)}catch{return null}}
function migrate(s){if(s.saveVersion===1)return s;return null}
export function saveState(s){s.meta.updatedAt=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true}catch{return false}}
export function hasSave(){return !!loadState()}
export function wallAt(d,x,y){return d.map.walls.some(([wx,wy])=>wx===x&&wy===y)}
