import {items,monsters,monsterForId,quests,lootTables,dungeonEvents,roomTypes,dungeonNpcs,trades,floorEncounterTable,shopStock,merchantProfiles,innEvents} from './data.js?v=content-expansion-20261005a';
import {roomProps,ROOM_PROP_ZONES} from './room-visuals.js?v=market-sign-20261005a';
import {classAbilities,achievements,depthBands} from './progression.js?v=content-expansion-20261005a';
import {questObjectiveTemplates} from './quest-templates.js?v=systems-20261002a';
import {statusEffectDefinitions} from './status-effects.js?v=systems-20261002a';
import {validateLocationMusic} from './location-music.js?v=statistics-music-20261005a';
import {TOWN_ART_ASSETS} from './town-art.js?v=town-service-signs-20261005a';

const slots=new Set(['head','body','mainHand','offHand','feet','accessory']);
const issue=(severity,code,message)=>({severity,code,message});
const duplicates=values=>values.filter((value,index)=>values.indexOf(value)!==index);

export function validateQuestGraph(definitions=quests){
  const errors=[],byChain=new Map(),visiting=new Set(),visited=new Set();
  for(const [id,quest] of Object.entries(definitions)){
    if(quest.chain){const steps=byChain.get(quest.chain)||new Map();if(!Number.isInteger(quest.step)||quest.step<1)errors.push(`${id} has an invalid chain step.`);else if(steps.has(quest.step))errors.push(`${quest.chain} duplicates step ${quest.step} (${steps.get(quest.step)}, ${id}).`);else steps.set(quest.step,id);byChain.set(quest.chain,steps)}
    if(quest.next&&!definitions[quest.next])errors.push(`${id} follows missing quest ${quest.next}.`);
  }
  for(const [chain,steps] of byChain){const ordered=[...steps].sort((a,b)=>a[0]-b[0]);for(let index=0;index<ordered.length;index++){const [step,id]=ordered[index];if(step!==index+1)errors.push(`${chain} is missing step ${index+1}.`);const next=ordered[index+1];if(next&&definitions[id]?.next!==next[1])errors.push(`${chain} step ${step} does not lead to step ${next[0]}.`)}}
  function visit(id){if(visiting.has(id)){errors.push(`Quest follow-up cycle reaches ${id}.`);return}if(visited.has(id))return;visiting.add(id);const next=definitions[id]?.next;if(next&&definitions[next])visit(next);visiting.delete(id);visited.add(id)}
  for(const id of Object.keys(definitions))visit(id);
  return errors;
}

export function validateContent(){
  const errors=[],warnings=[],push=(severity,code,message)=>(severity==='error'?errors:warnings).push(issue(severity,code,message));
  const itemIds=Object.keys(items),monsterRows=Object.entries(monsters),eventIds=Object.keys(dungeonEvents),roomIds=Object.values(roomTypes).map(r=>r.id),npcIds=Object.keys(dungeonNpcs);
  for(const [kind,ids] of [['item',itemIds],['monster',monsterRows.map(([,m])=>m.id)],['quest',Object.keys(quests)],['event',eventIds],['room',roomIds],['NPC',npcIds]])for(const id of duplicates(ids))push('error','duplicate-id',`Duplicate ${kind} ID: ${id}.`);
  for(const [key,monster] of monsterRows){
    if(!Array.isArray(monster.tags)||!monster.tags.length)push('error','monster-tags',`${key} has no family tags.`);
    if(!['aggressive','cautious','evasive','opportunistic','erratic','simple'].includes(monster.aiProfile))push('error','monster-ai',`${key} has an unsupported AI profile.`);
    if(!lootTables[monster.lootTable])push('error','monster-loot',`${key} references missing loot table ${monster.lootTable}.`);
    if(!Number.isFinite(monster.minDepth)||monster.minDepth<1)push('error','monster-depth',`${key} has invalid minimum depth.`);
    if(monster.physicalResistance!==undefined&&(!Number.isFinite(monster.physicalResistance)||monster.physicalResistance<0||monster.physicalResistance>.9))push('error','monster-resistance',`${key} has invalid physical resistance.`);
    for(const attack of monster.attacks||[]){if(!Number.isFinite(attack.minDamage)||!Number.isFinite(attack.maxDamage)||attack.minDamage<0||attack.maxDamage<attack.minDamage||!Number.isFinite(attack.weight)||attack.weight<=0||attack.accuracy!==undefined&&(attack.accuracy<0||attack.accuracy>1)||attack.unlockLevel!==undefined&&(!Number.isInteger(attack.unlockLevel)||attack.unlockLevel<1)||attack.weightPerLevel!==undefined&&(!Number.isFinite(attack.weightPerLevel)||attack.weightPerLevel<0)||attack.effectChance!==undefined&&(attack.effectChance<0||attack.effectChance>1))push('error','monster-attack',`${key}/${attack.id} has invalid damage, weight, unlock level, or accuracy.`);if(attack.effect&&!statusEffectDefinitions[attack.effect])push('error','attack-effect',`${key}/${attack.id} references unknown status ${attack.effect}.`);if(attack.tags!==undefined&&(!Array.isArray(attack.tags)||attack.tags.some(tag=>typeof tag!=='string')))push('error','attack-tags',`${key}/${attack.id} has invalid damage tags.`)}
    for(const path of [monster.sprite?.src,monster.sprite?.ink,monster.sprite?.colored].filter(Boolean))if(!path.startsWith('assets/'))push('error','sprite-path',`${key} has a non-local sprite path: ${path}.`);
  }
  for(const [table,entries] of Object.entries(lootTables))for(const entry of entries){if(!items[entry.item])push('error','loot-item',`${table} references missing item ${entry.item}.`);if(!Number.isFinite(entry.weight)||entry.weight<=0)push('error','loot-weight',`${table}/${entry.item} has invalid weight.`)}
  for(const [id,item] of Object.entries(items)){
    if(item.slot&&!slots.has(item.slot))push('error','item-slot',`${id} uses invalid equipment slot ${item.slot}.`);
    if(!Number.isFinite(item.buyValue)||!Number.isFinite(item.sellValue)||item.buyValue<0||item.sellValue<0||item.sellValue>item.buyValue)push('error','item-price',`${id} has invalid buy/sell values.`);
    if(item.classes&&!Array.isArray(item.classes))push('error','item-classes',`${id} class restrictions must be an array.`);
    if(item.modifiers&&Object.values(item.modifiers).some(value=>!Number.isFinite(value)))push('error','item-modifier',`${id} has a nonnumeric modifier.`);
    if(item.effects?.vsTags&&Object.entries(item.effects.vsTags).some(([tag,value])=>typeof tag!=='string'||!Number.isFinite(value)||value<0))push('error','item-tag-effect',`${id} has an invalid tag damage bonus.`);
    if(item.effect&&!['heal','buff','combat-tool'].includes(item.effect.type))push('error','item-effect',`${id} has an unsupported consumable effect.`);
    if(item.effect?.type==='combat-tool'&&(!Number.isFinite(item.effect.damage)||item.effect.damage<1||!Array.isArray(item.effect.targetTags)||!item.effect.targetTags.length||item.effect.targetTags.some(tag=>!Object.values(monsters).some(monster=>monster.tags?.includes(tag)))))push('error','item-combat-tool',`${id} has an invalid combat-tool target or damage.`);
    if(item.eventHooks!==undefined&&(!Array.isArray(item.eventHooks)||item.eventHooks.some(hook=>typeof hook!=='string'||!hook)))push('error','item-event-hook',`${id} has invalid event-use hooks.`);
    if(item.questItem&&(item.sellValue>0||item.category!=='quest'))push('warning','quest-item-economy',`${id} is marked as a quest item but has ordinary sell/category values.`);
  }
  for(const [id,quest] of Object.entries(quests)){
    if(!Number.isFinite(quest.reward?.gold)||quest.reward.gold<0||!Number.isFinite(quest.reward?.xp)||quest.reward.xp<0)push('error','quest-reward',`${id} has an invalid reward.`);
    if(quest.reward?.item&&!items[quest.reward.item])push('error','quest-reward-item',`${id} rewards missing item ${quest.reward.item}.`);
    if(quest.next&&!quests[quest.next])push('error','quest-next',`${id} follows missing quest ${quest.next}.`);
    if(quest.type==='trade'&&!trades[quest.target])push('error','quest-trade',`${id} targets missing trade ${quest.target}.`);
    for(const item of quest.turnInItems||[])if(!items[item.id]||!Number.isInteger(item.quantity)||item.quantity<1)push('error','quest-item',`${id} has an invalid turn-in item.`);
    if(quest.type==='kill'&&quest.target!=='any'&&!monsterForId(quest.target))push('error','quest-monster',`${id} targets unknown monster ${quest.target}.`);
    if(quest.type==='discover'&&!eventIds.includes(quest.target)&&!['warm-wall','giant-stone-face'].includes(quest.target))push('warning','quest-discovery',`${id} discovery target ${quest.target} is not a registered event or landmark.`);
  }
  for(const message of validateQuestGraph())push('error','quest-graph',message);
  const inspectOutcome=(eventId,outcome)=>{
    if(!outcome||typeof outcome!=='object')return;
    if(!['message','gold','item','removeItem','heal','damage','effect','flag','townReaction','unlockQuest','questProgress','discover','room','encounter','random','skillCheck'].includes(outcome.type))push('error','event-outcome',`${eventId} has unsupported outcome type ${outcome.type}.`);
    if(outcome.type==='item'||outcome.type==='removeItem'){if(!items[outcome.item])push('error','event-item',`${eventId} references missing item ${outcome.item}.`)}
    if(outcome.type==='encounter'&&!monsterForId(outcome.monster))push('error','event-monster',`${eventId} references missing monster ${outcome.monster}.`);
    if(outcome.type==='room'&&!roomIds.includes(outcome.room))push('error','event-room',`${eventId} references missing room ${outcome.room}.`);
    if(outcome.type==='unlockQuest'&&!quests[outcome.quest])push('error','event-quest',`${eventId} unlocks missing quest ${outcome.quest}.`);
    if(outcome.type==='random')for(const row of outcome.outcomes||[])for(const nested of row.outcomes||[])inspectOutcome(eventId,nested);
    if(outcome.type==='skillCheck')for(const branch of [outcome.success,outcome.failure])for(const nested of branch||[])inspectOutcome(eventId,nested);
    if(outcome.type==='gold'&&!Number.isFinite(outcome.amount))push('error','event-gold',`${eventId} has an invalid gold outcome.`);
  };
  for(const [id,event] of Object.entries(dungeonEvents)){
    if(!Number.isFinite(event.weight)||event.weight<=0||!Number.isFinite(event.minDepth||1)||(event.maxDepth!==undefined&&event.maxDepth<(event.minDepth||1)))push('error','event-range',`${id} has an invalid weight or depth range.`);
    if(!Array.isArray(event.choices)||!event.choices.length)push('error','event-choices',`${id} has no available choices.`);
    for(const choice of event.choices||[]){if(!choice.id||!Array.isArray(choice.outcomes))push('error','event-choice',`${id} has a malformed choice.`);if(choice.requiresItem&&!items[choice.requiresItem.item])push('error','event-requirement',`${id}/${choice.id} requires missing item ${choice.requiresItem.item}.`);if(choice.requiresQuest&&!quests[choice.requiresQuest])push('error','event-requirement',`${id}/${choice.id} requires missing quest ${choice.requiresQuest}.`);for(const outcome of choice.outcomes||[])inspectOutcome(id,outcome)}
  }
  for(const [id,npc] of Object.entries(dungeonNpcs)){
    for(const tradeId of npc.tradeIds||[])if(!trades[tradeId])push('error','npc-trade',`${id} references missing trade ${tradeId}.`);
    for(const itemId of npc.stock||[])if(!items[itemId])push('error','npc-stock',`${id} offers missing item ${itemId}.`);
    if(npc.priceMultiplier!==undefined&&(!Number.isFinite(npc.priceMultiplier)||npc.priceMultiplier<0))push('error','npc-price',`${id} has an invalid price multiplier.`);
  }
  for(const [id,trade] of Object.entries(trades)){if(!dungeonNpcs[trade.npcId])push('error','trade-npc',`${id} references missing NPC.`);if(!Number.isFinite(trade.gold)||trade.gold<0)push('error','trade-gold',`${id} has invalid gold cost.`);for(const row of [...(trade.gives||[]),...(trade.requires||[])])if(!items[row.item]||!Number.isInteger(row.quantity)||row.quantity<1)push('error','trade-item',`${id} has invalid item quantity/reference.`)}
  for(const [id,prop] of Object.entries(roomProps)){for(const room of prop.rooms||[])if(!roomIds.includes(room))push('error','prop-room',`${id} is assigned to missing room ${room}.`);for(const zone of prop.zones||[])if(!ROOM_PROP_ZONES.includes(zone))push('error','prop-zone',`${id} uses unknown placement zone ${zone}.`);if((prop.ink&&!prop.colored)||(prop.colored&&!prop.ink))push('warning','prop-pair',`${id} has only one sprite-style asset.`)}
  for(const [slot,assets] of Object.entries(TOWN_ART_ASSETS)){if(!assets.ink||!assets.colored)push('error','town-art-pair',`${slot} must have both Ink and Colored assets.`);for(const path of Object.values(assets))if(typeof path!=='string'||!path.startsWith('assets/'))push('error','town-art-path',`${slot} has an invalid local asset path.`)}
  for(const [floor,rows] of Object.entries(floorEncounterTable)){if(!Number(rows.length))push('error','encounter-table',`Floor ${floor} has no encounter rows.`);for(const row of rows){if(!monsters[row.id]||!Number.isFinite(row.weight)||row.weight<=0)push('error','encounter-row',`Floor ${floor} has an invalid monster/weight row.`);else if(monsters[row.id].minDepth>Number(floor))push('error','encounter-depth',`Floor ${floor} includes unavailable monster ${row.id}.`)}}
  for(const id of shopStock)if(!items[id])push('error','shop-item',`Store stock references missing item ${id}.`);
  for(const [id,event] of Object.entries(innEvents)){if(!Number.isFinite(event.weight)||event.weight<=0||!event.effect)push('error','inn-event',`${id} has invalid event weight/effect.`);else if(event.effect.type==='xp-bonus'&&(!Number.isFinite(event.effect.percent)||event.effect.percent<=0||event.effect.percent>30||!Number.isInteger(event.effect.battles)||event.effect.battles<1))push('error','inn-xp-effect',`${id} has invalid XP benefit.`);else if(event.effect.type==='temporary'&&(!Number.isFinite(event.effect.value)||!Number.isInteger(event.effect.encounters)||event.effect.encounters<1))push('error','inn-temporary-effect',`${id} has invalid temporary benefit.`);else if(event.effect.type==='item'&&!items[event.effect.item])push('error','inn-item-effect',`${id} rewards missing item ${event.effect.item}.`);else if(!['xp-bonus','temporary','flavor','item','gold'].includes(event.effect.type))push('error','inn-effect-type',`${id} uses an unsupported effect.`)}
  for(const [id,profile] of Object.entries(merchantProfiles))if(!Number.isFinite(profile.buyMultiplier)||profile.buyMultiplier<0||!Array.isArray(profile.likes))push('error','merchant-profile',`${id} has invalid price or preference data.`);
  for(const [id,room] of Object.entries(roomTypes))if(!room.id||!Number.isFinite(room.weight)||room.weight<=0)push('error','room-definition',`${id} has an invalid ID or selection weight.`);
  for(const [cls,abilities] of Object.entries(classAbilities))for(const ability of abilities)if(!ability.id||!Number.isInteger(ability.level)||ability.level<1||!Number.isFinite(ability.cost)||ability.cost<0)push('error','ability',`${cls} has an invalid ability.`);
  for(const achievement of achievements)if(!achievement.id||!achievement.name)push('error','achievement',`Achievement definition is incomplete.`);
  for(const band of depthBands)if(!band.range||!band.name||!Number.isFinite(band.content?.rareLootMultiplier)||!Number.isFinite(band.content?.eventWeirdness))push('error','depth-band',`Depth band ${band.name||'(unnamed)'} has incomplete content weighting.`);
  if(Object.keys(questObjectiveTemplates).length<7)push('error','quest-template',`Quest objective template set is incomplete.`);
  for(const error of validateLocationMusic().errors)push('error','location-music',error);
  return {errors,warnings,errorCount:errors.length,warningCount:warnings.length};
}
