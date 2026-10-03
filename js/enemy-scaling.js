// Encounter stats are a spawn-time snapshot. Keep the authored monster data as
// the floor-one baseline and apply restrained, identity-preserving deltas here.
export function scaleEnemy(monster,floor=1,variant=null,levelOverride=null){
  const baseTier=monster.baseTier||1,depthSteps=Math.max(0,Math.floor(floor)-1),variantLevel=variant?.levelBonus||0;
  const encounterLevel=Math.max(baseTier+depthSteps+variantLevel,Number.isFinite(Number(levelOverride))?Math.floor(Number(levelOverride)):0),steps=Math.max(0,encounterLevel-baseTier);
  const hpSteps=Math.min(steps,10),hpBeyond=Math.max(0,steps-10),hpFactor=1+hpSteps*.12+hpBeyond*.06;
  const rewardSteps=Math.min(steps,10),rewardBeyond=Math.max(0,steps-10),xpMultiplier=(1+rewardSteps*.16+rewardBeyond*.08)*(variant?.xpMultiplier||1),goldMultiplier=(1+rewardSteps*.1+rewardBeyond*.05)*(variant?.goldMultiplier||1);
  const behavior={...(monster.behavior||{})};
  if(behavior.burnChance)behavior.burnChance=Math.min(.6,behavior.burnChance+Math.min(.15,steps*.015));
  if(behavior.criticalChance)behavior.criticalChance=Math.min(.4,behavior.criticalChance+Math.min(.12,steps*.012));
  const allAttacks=monster.attacks||[{id:'attack',name:'Attack',minDamage:monster.attack,maxDamage:monster.attack,accuracy:.94,weight:1}],eligible=allAttacks.filter(a=>(a.unlockLevel||1)<=encounterLevel),pool=eligible.length?eligible:[allAttacks[0]],strongestBase=Math.max(...pool.map(x=>x.minDamage+x.maxDamage));
  const attacks=pool.map(a=>{
    const evolution=monster.depthEvolution||{},isStrongest=(pool.length>1)&&((a.minDamage+a.maxDamage)>(strongestBase-0.01));
    const weightFactor=Math.min(evolution.maxWeightFactor||1.65,1+steps*(a.weightPerLevel||0)+(isStrongest?steps*(evolution.attackWeightPerLevel||0):0))*(isStrongest?(variant?.attackWeightMultiplier||1):1);
    const effectChance=a.effect?Math.min(.75,(a.effectChance||0)+Math.min(.2,steps*(a.effectChancePerLevel??evolution.effectChancePerLevel??0))):a.effectChance;
    const damageBonus=Math.floor(steps*(evolution.damagePerLevel||.2))+(variant?.attackBonus||0);
    return {...a,minDamage:a.minDamage+damageBonus,maxDamage:a.maxDamage+damageBonus,weight:a.weight*weightFactor,...(effectChance===undefined?{}:{effectChance})};
  });
  const defense=monster.defense+Math.floor(steps/3)+(variant?.defenseBonus||0),maxHp=Math.max(1,Math.round(monster.hp*hpFactor*(variant?.hpMultiplier||1)));
  return {monsterId:monster.id,tags:[...(monster.tags||[])],aiProfile:monster.aiProfile||'simple',physicalResistance:Math.max(0,Math.min(.9,monster.physicalResistance||0)),floor:Math.max(1,Math.floor(floor)),baseTier,encounterLevel,variantId:variant?.id||null,variantName:variant?.name||null,displayName:`${variant?.name?`${variant.name} `:''}${monster.name}`,maxHp,hp:maxHp,attack:monster.attack+Math.floor(steps*(monster.depthEvolution?.damagePerLevel||.2))+(variant?.attackBonus||0),defense,speed:monster.speed,attacks,behavior,xp:Math.max(1,Math.floor(monster.xp*xpMultiplier)),goldMultiplier,lootMultiplier:Math.min(2,1+steps*.06+(variant?.lootBonus||0)),rewardMultipliers:{xp:xpMultiplier,gold:goldMultiplier},base:{hp:monster.hp,attack:monster.attack,defense:monster.defense,xp:monster.xp,attacks:allAttacks.map(a=>({...a}))}};
}

export function threatAssessment(enemy,player){
  const attacks=enemy?.attacks||[],total=attacks.reduce((n,a)=>n+(a.weight||1),0)||1;
  const fireResist=Math.max(0,player.fireResistance||0);
  const expectedDamage=attacks.reduce((sum,a)=>{const accuracy=a.accuracy??.94,mean=(a.minDamage+a.maxDamage)/2,crit=1+(a.criticalChance||enemy.behavior?.criticalChance||0)*.5;let status=0;if(a.effect==='burn')status=Math.max(0,(a.effectTurns||enemy.behavior.burnTurns||0)*2-fireResist)*(a.effectChance||enemy.behavior.burnChance||0)/3;return sum+(a.weight||1)*(mean*accuracy*crit+status)},0)/total*(enemy.behavior?.multiStrike||1)*Math.max(.85,Math.min(1.2,1+((enemy.speed||2)-2)*.04));
  const enemyHit=Math.max(.5,expectedDamage-Math.max(0,(player.defense||0)+(player.temporaryDefense||0))),playerHit=Math.max(1,(player.attack||1)+(player.specialAttack||0)-(enemy.defense||0));
  const playerTurns=(enemy.maxHp||enemy.hp||1)/playerHit/Math.max(.35,1-(enemy.behavior?.evadeChance||0));
  const enemyTurns=Math.max(1,player.hp||player.maxHp||1)/enemyHit;
  const lowHealth=(player.hp||player.maxHp||1)/Math.max(1,player.maxHp||1),levelEdge=Math.max(.85,Math.min(1.2,1+((enemy.encounterLevel||1)-(player.level||1))*.025));
  const score=playerTurns/Math.max(.5,enemyTurns)*levelEdge/Math.max(.55,lowHealth);
  const label=score<.32?'Manageable':score<.72?'Dangerous':score<1.15?'Severe':score<1.8?'Terrifying':'Absolutely Not';
  return {score,label,expectedDamage:Number(expectedDamage.toFixed(2)),playerTurns:Number(playerTurns.toFixed(1)),enemyTurns:Number(enemyTurns.toFixed(1))};
}
