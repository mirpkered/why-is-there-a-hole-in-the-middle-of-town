export const statusEffectDefinitions={
  burn:{id:'burn',name:'Burning',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:2,damageType:'fire'},
  poison:{id:'poison',name:'Poisoned',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:1,damageType:'poison'},
  weakened:{id:'weakened',name:'Weakened',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:1,stat:'attack'},
  guarded:{id:'guarded',name:'Guarded',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:2,stat:'defense'},
  blessed:{id:'blessed',name:'Blessed',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:2,stat:'defense'},
  slowed:{id:'slowed',name:'Slowed',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:1,stat:'speed'},
  confused:{id:'confused',name:'Confused',tick:'player-turn-end',stack:'refresh-or-stronger',defaultMagnitude:1}
};

export function applyStatus(target,id,duration,magnitude,source='unknown'){
  const definition=statusEffectDefinitions[id];if(!definition||!target)return false;
  target.statusEffects=target.statusEffects||{};
  const old=target.statusEffects[id],nextDuration=Math.max(1,Math.floor(Number(duration)||1)),nextMagnitude=Math.max(0,Number(magnitude??definition.defaultMagnitude)||0);
  target.statusEffects[id]={id,duration:Math.max(old?.duration||0,nextDuration),magnitude:Math.max(old?.magnitude||0,nextMagnitude),source};
  return true;
}

export function statusModifier(target,id){return Math.max(0,Number(target?.statusEffects?.[id]?.magnitude)||0)}

export function tickStatuses(target,when='player-turn-end'){
  const result=[];if(!target?.statusEffects)return result;
  for(const [id,effect] of Object.entries(target.statusEffects)){
    const definition=statusEffectDefinitions[id];if(!definition||definition.tick!==when)continue;
    if(id==='burn'||id==='poison'){
      const damage=Math.max(0,Number(effect.magnitude)||definition.defaultMagnitude);
      target.hp=Math.max(0,(Number(target.hp)||0)-damage);result.push({id,damage,name:definition.name});
    }
    effect.duration=Math.max(0,Number(effect.duration||effect.turns||0)-1);
    if(effect.duration<=0)delete target.statusEffects[id];
  }
  return result;
}

export function normalizeLegacyBurn(player){
  const legacy=player?.effects?.burn;if(legacy&&!player.statusEffects?.burn)applyStatus(player,'burn',legacy.turns,legacy.damage,'legacy-save');
  if(player?.effects)delete player.effects.burn;
}
