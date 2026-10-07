import {roomTypes} from './data.js?v=floor4-release-prep-20261006a';
import {roomVisualSeed} from './room-visuals.js?v=scene-calibration-20261007a';
import {DUNGEON_SETS,DUNGEON_SET_IDS,DUNGEON_TOPOLOGIES,getFloorVisualSet} from './dungeon-themes.js?v=scene-calibration-20261007a';

// Empty variant lists intentionally use the existing CSS scene. Visual choice is derived from
// saved room identity and never consumes gameplay, combat, encounter, or loot randomness.
export const ROOM_BACKGROUND_REGISTRY=Object.freeze(Object.fromEntries(Object.keys(roomTypes).map(id=>[id,{id,roomType:id,variants:[],fallback:'css'}])));
export const BATTLE_BACKGROUND_REGISTRY=Object.freeze({
  default:{id:'default',variants:[],fallback:'battle-css'},
  ...Object.fromEntries(Object.keys(roomTypes).map(id=>[id,{id,roomType:id,variants:[],fallback:'battle-css'}]))
});

export function selectBackgroundVariant(entry,seed=0){
  const variants=(entry?.variants||[]).filter(v=>v&&v.enabled!==false&&typeof v.path==='string'&&Number(v.weight??1)>0);
  if(!variants.length)return null;
  const total=variants.reduce((sum,v)=>sum+Number(v.weight??1),0);
  let n=(seed>>>0)/4294967296*total;
  return variants.find(v=>(n-=Number(v.weight??1))<0)||variants.at(-1);
}

export function backgroundForRoom({roomType='ordinary',map,floor=1,x=0,y=0,kind='exploration',registry,setId,topologyId}={}){
  const source=registry||(kind==='battle'?BATTLE_BACKGROUND_REGISTRY:ROOM_BACKGROUND_REGISTRY);
  const specific=source[roomType],generic=kind==='battle'?source.default:null;
  const entry=kind==='battle'?(specific?.variants?.length?specific:generic?.variants?.length?generic:specific||generic):(specific||source.ordinary);
  const seed=roomVisualSeed(map,floor,x,y,roomType,kind==='battle'?9173:0);
  const roomVariant=selectBackgroundVariant(entry,seed);
  if(kind==='exploration'&&!roomVariant&&topologyId){
    const selectedSet=DUNGEON_SETS[setId]||getFloorVisualSet({seed:map?.seed,visualSets:{}},floor);
    const variant=selectedSet.backgrounds[topologyId]||null;
    if(variant)return {kind,roomType,entry,variant,seed,fallback:'css',setId:selectedSet.id,topologyId};
  }
  return {kind,roomType,entry,variant:roomVariant,seed,fallback:entry?.fallback||(kind==='battle'?'battle-css':'css'),setId:null,topologyId:topologyId||null};
}

let previewSetOverride=null;
export function setDungeonSetPreviewOverride(id=null){previewSetOverride=DUNGEON_SETS[id]?id:null;return previewSetOverride}
export function dungeonSetPreviewOverride(){return previewSetOverride}
export function activeDungeonSet(dungeon,floor){return DUNGEON_SETS[previewSetOverride]||getFloorVisualSet(dungeon,floor)}

const preloadCache=new Map();
export function dungeonBackgroundAssetStatus(path){return preloadCache.get(path)?.status||'not-preloaded'}
export function sceneImagePresentation(status){const loaded=status==='loaded';return {imageVisible:loaded,fallbackVisible:!loaded,imageClass:loaded?'is-loaded':'',viewClass:loaded?'scene-view--image':''}}
export function preloadDungeonSet(setId){
  const set=DUNGEON_SETS[setId];if(!set||typeof Image==='undefined')return Promise.resolve([]);
  const paths=Object.values(set.backgrounds).map(background=>background.path);
  return Promise.all(paths.map(path=>{
    if(preloadCache.has(path))return preloadCache.get(path).promise;
    const image=new Image();image.decoding='async';
    const entry={status:'loading',promise:null};
    entry.promise=new Promise(resolve=>{let settled=false;const finish=status=>{if(settled)return;settled=true;entry.status=status;resolve({path,status})};image.onload=async()=>{try{if(image.decode)await image.decode();finish(image.naturalWidth>0?'loaded':'failed')}catch{finish(image.naturalWidth>0?'loaded':'failed')}};image.onerror=()=>finish('failed');image.src=path;if(image.complete&&image.naturalWidth)image.onload()});
    preloadCache.set(path,entry);return entry.promise;
  }));
}
export function validateDungeonSetRegistry(registry=DUNGEON_SETS,{exists=()=>true}={}){
  const errors=[],seen=new Set();
  for(const [key,set] of Object.entries(registry||{})){
    if(!set?.id||set.id!==key)errors.push(`${key} has an unstable or mismatched set id`);
    if(seen.has(set?.id))errors.push(`duplicate dungeon set id: ${set?.id}`);seen.add(set?.id);
    if(!set?.name)errors.push(`${key} is missing a display name`);
    for(const topology of DUNGEON_TOPOLOGIES){const variant=set?.backgrounds?.[topology.id];if(!variant){errors.push(`${key} is missing topology ${topology.id}`);continue}if(variant.topologyId!==topology.id)errors.push(`${key}/${topology.id} has mismatched topology metadata`);if(!/^assets\/images\/dungeon-sets\/[\w-]+\/0[1-8]-[\w-]+\.png$/.test(variant.path||''))errors.push(`${key}/${topology.id} has an invalid asset path`);else if(!exists(variant.path))errors.push(`${key}/${topology.id} asset does not exist: ${variant.path}`)}
    for(const topologyId of Object.keys(set?.backgrounds||{}))if(!DUNGEON_TOPOLOGIES.some(topology=>topology.id===topologyId))errors.push(`${key} has unknown topology ${topologyId}`);
  }
  for(const id of DUNGEON_SET_IDS)if(!registry?.[id])errors.push(`missing dungeon set ${id}`);
  return {valid:errors.length===0,errors};
}

// A missing image simply leaves the CSS scene below it visible. Paths are local validated asset paths.
export function backgroundLayerMarkup(selection,{loaded=false}={}){
  const variant=selection?.variant;
  if(!variant?.path||!/^assets\/[\w./-]+\.(?:png|webp|jpe?g|avif)$/i.test(variant.path)||variant.path.includes('..'))return '';
  const safeFocal=value=>/^(?:(?:\d{1,3}%|left|center|right)\s+(?:\d{1,3}%|top|center|bottom))$/i.test(value||'')?value:'50% 50%';
  const focal=safeFocal(variant.focal),mobile=safeFocal(variant.mobileFocal||focal);
  const scale=Number.isFinite(variant.scale)?Math.max(.85,Math.min(1.15,variant.scale)):1;
  const overlay=Number.isFinite(variant.overlay)?Math.max(0,Math.min(1,variant.overlay)):.12;
  const presentation=sceneImagePresentation(loaded?'loaded':'loading');
  return `<img class="scene-image-layer${presentation.imageClass?' '+presentation.imageClass:''}" aria-hidden="true" alt="" decoding="async" fetchpriority="high" data-background-id="${variant.id||selection.roomType}" data-background-path="${variant.path}" data-image-state="${loaded?'loaded':'loading'}" style="--scene-focal:${focal};--scene-mobile-focal:${mobile};--scene-scale:${scale};--scene-overlay:${overlay}" src="${variant.path}">`;
}

export function validateBackgroundRegistry(registry,roomIds=Object.keys(roomTypes)){
  const errors=[],seen=new Set();
  for(const [key,entry] of Object.entries(registry||{})){
    if(seen.has(entry?.id||key))errors.push(`duplicate background id: ${entry?.id||key}`);seen.add(entry?.id||key);
    if(!Array.isArray(entry?.variants))errors.push(`${key} variants must be an array`);
    for(const variant of entry?.variants||[]){
      if(!variant?.id)errors.push(`${key} has a variant without an id`);
      if(!/^assets\/[\w./-]+\.(?:png|webp|jpe?g|avif)$/i.test(variant?.path||'')||(variant?.path||'').includes('..'))errors.push(`${key} has an invalid image path`);
      if(!(Number(variant?.weight??1)>0))errors.push(`${key}/${variant?.id||'?'} weight must be positive`);
    }
  }
  for(const id of roomIds)if(!registry?.[id])errors.push(`missing background entry for room ${id}`);
  return {valid:errors.length===0,errors};
}
