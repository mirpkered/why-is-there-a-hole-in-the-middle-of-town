export const LOCATION_MUSIC_POOLS = Object.freeze({
  inn: [],
  store: [],
  questBoard: [],
  statistics: [],
  achievements: [],
  character: []
});

export const LOCATION_MUSIC_CONTEXTS = Object.freeze(Object.keys(LOCATION_MUSIC_POOLS));

export function locationTracksFor(context, pools=LOCATION_MUSIC_POOLS){
  const tracks=pools?.[context];
  if(!Array.isArray(tracks))return [];
  return tracks.filter(track=>track&&track.enabled!==false&&typeof track.id==='string'&&track.id&&typeof track.src==='string'&&track.src&&track.pool===context&&track.loop===false&&Number.isFinite(track.gain)&&track.gain>=0&&track.gain<=1&&Number.isFinite(track.weight??1)&&(track.weight??1)>0);
}

export function chooseLocationTrack(context,previousId=null,pools=LOCATION_MUSIC_POOLS,random=Math.random){
  const tracks=locationTracksFor(context,pools);
  if(!tracks.length)return null;
  const candidates=tracks.length>1&&tracks.some(track=>track.id!==previousId)?tracks.filter(track=>track.id!==previousId):tracks;
  const total=candidates.reduce((sum,track)=>sum+(track.weight??1),0);
  const sample=Math.max(0,Math.min(.999999999,Number(random())||0))*total;
  let accumulated=0;
  for(const track of candidates){accumulated+=track.weight??1;if(sample<accumulated)return track}
  return candidates.at(-1)||null;
}

export function validateLocationMusic(pools=LOCATION_MUSIC_POOLS){
  const errors=[],ids=new Set();
  for(const context of LOCATION_MUSIC_CONTEXTS){
    const tracks=pools?.[context];
    if(!Array.isArray(tracks)){errors.push(`${context} pool must be an array.`);continue}
    for(const track of tracks){
      if(!track||typeof track!=='object'){errors.push(`${context} has a malformed track.`);continue}
      if(!track.id||ids.has(track.id))errors.push(`Location music ID is missing or duplicated: ${track.id||'(empty)'}.`);else ids.add(track.id);
      if(track.pool!==context)errors.push(`${track.id||context} is registered in the wrong pool.`);
      if(typeof track.src!=='string'||!track.src.startsWith('assets/audio/music/'))errors.push(`${track.id||context} has a non-local audio path.`);
      if(!Number.isFinite(track.gain)||track.gain<0||track.gain>1)errors.push(`${track.id||context} has an invalid gain.`);
      if(!Number.isFinite(track.weight??1)||(track.weight??1)<=0)errors.push(`${track.id||context} has an invalid selection weight.`);
      if(track.loop!==false)errors.push(`${track.id||context} must be one-shot (loop: false).`);
      if(track.preloadPriority!==undefined&&!['high','normal','low'].includes(track.preloadPriority))errors.push(`${track.id||context} has an invalid preload priority.`);
    }
  }
  for(const context of Object.keys(pools||{}))if(!LOCATION_MUSIC_CONTEXTS.includes(context))errors.push(`Unknown location music pool: ${context}.`);
  return {errors,errorCount:errors.length,poolCounts:Object.fromEntries(LOCATION_MUSIC_CONTEXTS.map(context=>[context,Array.isArray(pools?.[context])?pools[context].length:0]))};
}
