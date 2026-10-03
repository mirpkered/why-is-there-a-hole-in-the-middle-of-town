export function validWeightedRows(rows,weightKey='weight'){
  return Array.isArray(rows)?rows.filter(row=>row&&Number.isFinite(Number(row[weightKey]))&&Number(row[weightKey])>0):[];
}

export function weightedChoice(rows,random=Math.random,weightKey='weight'){
  const pool=validWeightedRows(rows,weightKey);
  if(!pool.length)return null;
  const total=pool.reduce((sum,row)=>sum+Number(row[weightKey]),0);
  let roll=Math.max(0,Math.min(.999999999999,Number(random())||0))*total;
  for(const row of pool){roll-=Number(row[weightKey]);if(roll<0)return row}
  return pool.at(-1);
}

export function penalizeRecent(rows,recent,idOf,weightKey='weight',penalty=.55){
  const recentIds=(recent||[]).slice(-3).map(entry=>typeof entry==='string'?entry:entry?.id);
  return validWeightedRows(rows,weightKey).map(row=>{const id=idOf(row),index=recentIds.lastIndexOf(id),factor=index===recentIds.length-1?penalty:index===recentIds.length-2?Math.sqrt(penalty):1;return {...row,[weightKey]:Number(row[weightKey])*factor}});
}
