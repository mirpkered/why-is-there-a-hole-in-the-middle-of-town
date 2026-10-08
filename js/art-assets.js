/** Resolve optional art without making content depend on a particular sprite style. */
export function resolveArtVariant(art, style='colored', fallback=null){
  const requested=style==='ink'?'ink':'colored';
  const chosen=art?.[requested];
  const alternate=art?.[requested==='ink'?'colored':'ink'];
  const src=chosen||alternate||art?.src||fallback||null;
  return {src,requested,variant:chosen?requested:alternate?'alternate':art?.src?'default':fallback?'fallback':'missing',usedFallback:!chosen&&!alternate&&!art?.src&&Boolean(fallback)};
}

export function validateArtEntries(entries,{requirePair=false}={}){
  const errors=[],warnings=[],seen=new Set();
  for(const [key,entry] of Object.entries(entries||{})){
    const id=entry?.id||key;
    if(seen.has(id))errors.push(`duplicate art id: ${id}`);seen.add(id);
    const single=entry?.src;
    if(single!=null&&(typeof single!=='string'||!/^assets\/[\w./-]+\.(?:png|webp|jpe?g|svg)$/i.test(single)||single.includes('..')))errors.push(`${id} has invalid src path`);
    for(const style of ['ink','colored']){
      const path=entry?.[style];
      if(path!=null&&(typeof path!=='string'||!/^assets\/[\w./-]+\.(?:png|webp|jpe?g|svg)$/i.test(path)||path.includes('..')))errors.push(`${id} has invalid ${style} path`);
    }
    if(requirePair&&(!entry?.ink||!entry?.colored))errors.push(`${id} requires Ink and Colored paths`);
    if(Boolean(entry?.ink)!==Boolean(entry?.colored))warnings.push(`${id} has only one sprite-style path`);
  }
  return {valid:errors.length===0,errors,warnings};
}
