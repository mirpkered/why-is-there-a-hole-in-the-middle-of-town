import {roomTypes} from './data.js?v=floor4-release-prep-20261006a';
import {roomVisualSeed} from './room-visuals.js?v=paper-stack-20261005a';

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

export function backgroundForRoom({roomType='ordinary',map,floor=1,x=0,y=0,kind='exploration',registry}={}){
  const source=registry||(kind==='battle'?BATTLE_BACKGROUND_REGISTRY:ROOM_BACKGROUND_REGISTRY);
  const specific=source[roomType],generic=kind==='battle'?source.default:null;
  const entry=kind==='battle'?(specific?.variants?.length?specific:generic?.variants?.length?generic:specific||generic):(specific||source.ordinary);
  const seed=roomVisualSeed(map,floor,x,y,roomType,kind==='battle'?9173:0);
  return {kind,roomType,entry,variant:selectBackgroundVariant(entry,seed),seed,fallback:entry?.fallback||(kind==='battle'?'battle-css':'css')};
}

// A missing image simply leaves the CSS scene below it visible. Paths are local validated asset paths.
export function backgroundLayerMarkup(selection){
  const variant=selection?.variant;
  if(!variant?.path||!/^assets\/[\w./-]+\.(?:png|webp|jpe?g|avif)$/i.test(variant.path)||variant.path.includes('..'))return '';
  const safeFocal=value=>/^(?:(?:\d{1,3}%|left|center|right)\s+(?:\d{1,3}%|top|center|bottom))$/i.test(value||'')?value:'50% 50%';
  const focal=safeFocal(variant.focal),mobile=safeFocal(variant.mobileFocal||focal);
  const overlay=Number.isFinite(variant.overlay)?Math.max(0,Math.min(1,variant.overlay)):.12;
  return `<span class="scene-image-layer" aria-hidden="true" data-background-id="${variant.id||selection.roomType}" style="--scene-image:url('${variant.path}');--scene-focal:${focal};--scene-mobile-focal:${mobile};--scene-overlay:${overlay}"></span>`;
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
