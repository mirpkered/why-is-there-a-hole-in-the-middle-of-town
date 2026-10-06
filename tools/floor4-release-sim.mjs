import { items, monsters, lootTables, floorEncounterTable } from '../js/data.js';
import { selectWithHistory, paceEncounterChance, chooseEncounterCategory, chooseEnemyAttack } from '../js/encounter-director.js';
import { weightedChoice } from '../js/random-utils.js';
import { encounterWeightForDepth, lootRarityWeightForDepth } from '../js/depth-config.js';
globalThis.localStorage={getItem(){return null},setItem(){},removeItem(){}};
const {generateFloorMap,freshState}=await import('../js/state.js');
const game=await import('../js/game.js');

let seed=890421;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const count=50000;
const rows=floorEncounterTable[4].filter(row=>monsters[row.id]?.minDepth<=4).map(row=>({...row,weight:encounterWeightForDepth(row,monsters[row.id],4)}));
const categories={combat:0,event:0,quiet:0,npc:0},monsterCounts=new Map(),history=[];
let emptySteps=0,streak=0,previous='',immediateRepeats=0,threeInRow=0,run=0,prior='';
for(let i=0;i<count;i++){
  const chance=paceEncounterChance({combat:.27,event:.20,emptySteps,encounterStreak:streak});
  if(random()<.035){categories.npc++;emptySteps=0;streak++;continue}
  const kind=chooseEncounterCategory(chance,random);categories[kind]++;
  if(kind==='combat'){
    const id=selectWithHistory(rows,history,row=>monsters[row.id].id,random,.55).id;
    monsterCounts.set(id,(monsterCounts.get(id)||0)+1);if(id===previous)immediateRepeats++;if(id===prior){run++;if(run===2)threeInRow++}else run=0;prior=previous;previous=id;
    history.push({type:'monster',id});if(history.length>12)history.shift();emptySteps=0;streak++;
  }else if(kind==='event'){emptySteps=0;streak++}else{emptySteps++;streak=0}
}
const lootRarity={common:0,uncommon:0,rare:0,strange:0},lootCategory={equipment:0,consumable:0,'trade-good':0,other:0},itemCounts=new Map();
for(let i=0;i<count;i++){
  const monster=monsters[selectWithHistory(rows,[],row=>monsters[row.id].id,random,.55).id];
  const table=lootTables[monster.lootTable]||[];
  const adjusted=table.map(entry=>{const rarity=items[entry.item]?.rarity||'common',factor=({common:62,uncommon:25,rare:10,strange:3}[rarity]||62)/62,multiplier=Math.min(2,1+3*.06);return {...entry,weight:entry.weight*factor*lootRarityWeightForDepth(rarity,4)*(rarity==='rare'||rarity==='strange'?multiplier:1)}});
  const drop=weightedChoice(adjusted,random);if(!drop)continue;const item=items[drop.item],rarity=item?.rarity||'common';lootRarity[rarity]++;lootCategory[item?.category==='equipment'?'equipment':item?.category==='consumable'?'consumable':item?.category==='trade-good'?'trade-good':'other']++;itemCounts.set(drop.item,(itemCounts.get(drop.item)||0)+1);
}
const observedRouteSteps=[];
for(let sample=1;sample<=1000;sample++){
  game.setState(freshState());game.startGame('Route sampler','Fighter');const d=game.state.dungeon,routeSeed=(sample*839+9871)>>>0;
  d.seed=routeSeed;d.maps=Object.fromEntries(Array.from({length:4},(_,i)=>[i+1,generateFloorMap(routeSeed,i+1)]));d.map=d.maps['1'];game.qaSetFloor(4);const plan=game.returnPlan();if(plan.ok)observedRouteSteps.push(plan.steps);
}
const sortedRouteSteps=[...observedRouteSteps].sort((a,b)=>a-b),routeStepStats={min:sortedRouteSteps[0],max:sortedRouteSteps.at(-1),mean:+(sortedRouteSteps.reduce((s,n)=>s+n,0)/sortedRouteSteps.length).toFixed(1),samples:sortedRouteSteps.length,p50:sortedRouteSteps[Math.floor(sortedRouteSteps.length*.5)],p90:sortedRouteSteps[Math.floor(sortedRouteSteps.length*.9)]};
const returnModels={
  A_current:(floor,steps,agi,bonus,hazard)=>Math.max(.20,Math.min(.95,.96-(floor-1)*.12-steps*.025+(agi-5)*.01+bonus-hazard)),
  B_25pct_floor:(floor,steps,agi,bonus,hazard)=>Math.max(.25,Math.min(.95,.96-(floor-1)*.12-steps*.025+(agi-5)*.01+bonus-hazard)),
  C_lower_floor_penalty:(floor,steps,agi,bonus,hazard)=>Math.max(.20,Math.min(.95,.96-(floor-1)*.04-steps*.025+(agi-5)*.01+bonus-hazard)),
  D_lower_route_penalty:(floor,steps,agi,bonus,hazard)=>Math.max(.20,Math.min(.95,.96-(floor-1)*.12-steps*.012+(agi-5)*.01+bonus-hazard)),
  E_known_stair_credit:(floor,steps,agi,bonus,hazard)=>Math.max(.20,Math.min(.95,.96-(floor-1)*.12-steps*.025+(agi-5)*.01+bonus-hazard+Math.min(.12,(floor-1)*.04))),
  F_combined_restrained:(floor,steps,agi,bonus,hazard)=>Math.max(.20,Math.min(.95,.96-(floor-1)*.04-steps*.012+(agi-5)*.015+bonus-hazard))
};
const returnReport={};
for(const [name,formula] of Object.entries(returnModels)){
  const outcomes={clean:0,oneInterrupt:0,multipleInterrupts:0,defeat:0,attempts:0,encounters:0,hpDrain:0,probabilitySum:0};
  for(let i=0;i<25000;i++){
    const steps=observedRouteSteps[Math.floor(random()*observedRouteSteps.length)],agi=2+Math.floor(random()*7),gear=random()<.2?.10:0,hazard=random()<.12?.08:0,p=formula(4,steps,agi,gear,hazard);
    outcomes.probabilitySum+=p;
    let interruptions=0,dead=false;
    while(random()>=p&&interruptions<30){interruptions++;if(random()<.06){dead=true;break}}
    if(dead)outcomes.defeat++;else if(interruptions===0)outcomes.clean++;else if(interruptions===1)outcomes.oneInterrupt++;else outcomes.multipleInterrupts++;
    outcomes.encounters+=interruptions;outcomes.attempts+=interruptions+1;outcomes.hpDrain+=interruptions*4.5;
  }
  returnReport[name]={meanChance:`${(100*outcomes.probabilitySum/25000).toFixed(1)}%`,clean:`${(100*outcomes.clean/25000).toFixed(1)}%`,oneInterrupt:`${(100*outcomes.oneInterrupt/25000).toFixed(1)}%`,multiple:`${(100*outcomes.multipleInterrupts/25000).toFixed(1)}%`,defeat:`${(100*outcomes.defeat/25000).toFixed(1)}%`,encountersBeforeTown:+(outcomes.encounters/25000).toFixed(2),estimatedHpDrain:+(outcomes.hpDrain/25000).toFixed(1)};
}
const attacks={};
for(const id of new Set(rows.map(row=>row.id))){const monster=monsters[id],profiles=monster.attacks||monster.attackPool||[];if(!profiles.length){attacks[id]={attackData:'No explicit attack array on base monster; runtime variant data owns move selection.'};continue}const seen={};for(let i=0;i<10000;i++){const attack=chooseEnemyAttack(monster.aiProfile,profiles,{hp:22,maxHp:28},random);if(attack)seen[attack.id||attack.name]=(seen[attack.id||attack.name]||0)+1}attacks[id]=seen}
console.log(JSON.stringify({seed:890421,samples:{encounters:count,loot:count,returnsPerModel:25000},encounterCategories:Object.fromEntries(Object.entries(categories).map(([k,n])=>[k,`${(100*n/count).toFixed(1)}%`])),monsters:Object.fromEntries([...monsterCounts].sort((a,b)=>b[1]-a[1]).map(([id,n])=>[monsters[id].name,`${(100*n/Math.max(1,categories.combat)).toFixed(1)}% of combat`])),repeatRates:{immediate:`${(100*immediateRepeats/Math.max(1,categories.combat)).toFixed(1)}%`,threeInRow:`${(100*threeInRow/Math.max(1,categories.combat)).toFixed(2)}%`},loot:{rarity:Object.fromEntries(Object.entries(lootRarity).map(([k,n])=>[k,`${(100*n/count).toFixed(1)}%`])),category:Object.fromEntries(Object.entries(lootCategory).map(([k,n])=>[k,`${(100*n/count).toFixed(1)}%`])),topItems:[...itemCounts].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([id,n])=>({item:items[id]?.name||id,share:`${(100*n/count).toFixed(1)}%`}))},returnRouteSteps:routeStepStats,returnModels:returnReport,attackSelection:attacks},null,2));
