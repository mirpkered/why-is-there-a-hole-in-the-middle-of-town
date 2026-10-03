import {weightedChoice,penalizeRecent} from './random-utils.js';

export const monsterFamilies={beast:['rat','killer-rabbit','kung-fu-goose'],kobold:['kobold'],slime:['pocket-slime'],worm:['fire-worm'],undead:['skeleton'],construct:['paper-mimic'],mimic:['paper-mimic'],fire:['fire-worm'],goose:['kung-fu-goose'],rabbit:['killer-rabbit'],humanoid:['kobold','skeleton'],bureaucratic:['paper-mimic']};

export function selectWithHistory(rows,history,idOf,random=Math.random,penalty=.55){
  const adjusted=penalizeRecent(rows,history,idOf,'weight',penalty);
  return weightedChoice(adjusted,random,'weight');
}

export function recordEncounter(history,type,id,limit=12){return [...(history||[]),{type,id}].slice(-limit)}

export function paceEncounterChance({combat=.13,event=.09,emptySteps=0,encounterStreak=0}={}){
  const pity=Math.min(.06,Math.max(0,emptySteps)*.01),cooldown=encounterStreak>=2?.78:encounterStreak===1?.9:1;
  const combatChance=Math.min(.38,combat*cooldown+pity*.55),eventChance=Math.min(.28,event*cooldown+pity*.45);
  return {combat:combatChance,event:eventChance,quiet:Math.max(.25,1-combatChance-eventChance)};
}

export function chooseEncounterCategory(chances,random=Math.random){return weightedChoice([{id:'combat',weight:chances.combat},{id:'event',weight:chances.event},{id:'quiet',weight:chances.quiet}],random)?.id||'quiet'}

export function chooseEnemyAttack(profile,attacks,player={},random=Math.random){
  if(!Array.isArray(attacks)||!attacks.length)return null;
  const hpRatio=(Number(player.hp)||1)/Math.max(1,Number(player.maxHp)||1);
  const rows=attacks.map(attack=>{
    const damage=(attack.minDamage+attack.maxDamage)/2;
    let factor=1;
    if(profile==='aggressive')factor=1+damage*.045;
    else if(profile==='cautious')factor=attack.effect?1.35:Math.max(.6,1.1-damage*.025);
    else if(profile==='evasive')factor=1+Math.max(0,attack.maxDamage-attack.minDamage)*.07;
    else if(profile==='opportunistic')factor=hpRatio<.35?1+damage*.1:1;
    else if(profile==='erratic')factor=.65+Math.max(0,Number(random())||0)*.7;
    return {...attack,weight:Math.max(0,Number(attack.weight)||0)*factor};
  });
  return weightedChoice(rows,random);
}
