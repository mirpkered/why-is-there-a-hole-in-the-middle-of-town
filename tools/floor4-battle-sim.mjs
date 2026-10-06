import { items, floorEncounterTable, monsters } from '../js/data.js';
import { freshState } from '../js/state.js';
import { STARTING_CLASSES, STARTING_STAT_RANGES } from '../js/game.js';
import { weightedChoice } from '../js/random-utils.js';

globalThis.localStorage={getItem(){return null},setItem(){},removeItem(){}};
const game=await import('../js/game.js');
let seed=31052026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const policies=['basic','abilities','tonics','abilities-tonics-counters'],classes=Object.keys(STARTING_CLASSES),rolls=['low','average','high'],runsPerCell=50;
const candidates=floorEncounterTable[4].filter(row=>monsters[row.id]?.minDepth<=4),counterByMonster={pooGas:'air-freshener'};
const results={};
for(const cls of classes)for(const roll of rolls)for(const policy of policies){
  const report={wins:0,defeats:0,escapes:0,rounds:0,hpRemaining:0,mpSpent:0,tonics:0,counters:0,retreats:0};
  for(let run=0;run<runsPerCell;run++){
    game.setState(freshState());const range=STARTING_STAT_RANGES[cls],base=STARTING_CLASSES[cls],stats=Object.fromEntries(Object.entries(range).map(([key,[min,max]])=>[key,roll==='low'?min:roll==='high'?max:base[{str:'str',agi:'agi',mind:'mind',vit:'vit'}[key]]??Math.round((min+max)/2)]));
    game.startGame('Floor 4 sample',cls,stats);game.qaSetFloor(4);game.qaSetLevel(5);let d=game.state.dungeon;d.seed=++seed;
    if(policy==='tonics'||policy==='abilities-tonics-counters')game.addItem('healing-tonic',2);
    const monsterId=weightedChoice(candidates,random).id;
    if(policy==='abilities-tonics-counters'&&counterByMonster[monsterId])game.addItem(counterByMonster[monsterId],1);
    game.qaSpawnMonster(monsterId,4,null,5);let turns=0,spentBefore=game.state.player.mp;
    while(game.state.combat&&game.state.player.hp>0&&turns<50){turns++;const p=game.state.player,c=game.state.combat;
      if(policy==='abilities-tonics-counters'&&counterByMonster[monsterId]&&items[counterByMonster[monsterId]]?.effect?.type==='combat-tool'&&items[counterByMonster[monsterId]].effect.targetTags.some(tag=>monsters[monsterId].tags?.includes(tag))&&game.countItem(counterByMonster[monsterId])){const itemId=counterByMonster[monsterId],before=game.countItem(itemId);game.useItem(itemId);if(game.countItem(itemId)<before)report.counters++;continue}
      if((policy==='tonics'||policy==='abilities-tonics-counters')&&p.hp<=Math.ceil(p.maxHp*.45)&&game.countItem('healing-tonic')){game.useTonic();report.tonics++;continue}
      if((policy==='abilities'||policy==='abilities-tonics-counters')&&turns%2===1){const abilities=game.availableAbilities(),heal=p.hp<=p.maxHp*.45?abilities.find(a=>a.kind==='heal'&&p.mp>=a.cost):null,attack=abilities.filter(a=>!['heal','brace','ward','blessing','slip'].includes(a.kind)&&p.mp>=a.cost).sort((a,b)=>(b.scale||1)-(a.scale||1))[0];if(heal||attack){game.useAbility((heal||attack).id);continue}}
      game.attack();
    }
    report.rounds+=turns;report.hpRemaining+=Math.max(0,game.state.player.hp);report.mpSpent+=Math.max(0,spentBefore-game.state.player.mp);
    if(!game.state.combat&&game.state.player.hp>0)report.wins++;else if(game.state.player.hp<=0)report.defeats++;else report.escapes++;
  }
  const key=`${cls}/${roll}/${policy}`;results[key]={n:runsPerCell,winRate:`${(100*resultsCount(report.wins,runsPerCell)).toFixed(1)}%`,defeats:report.defeats,escapes:report.escapes,meanRounds:+(report.rounds/runsPerCell).toFixed(1),meanHpLeft:+(report.hpRemaining/runsPerCell).toFixed(1),meanMpSpent:+(report.mpSpent/runsPerCell).toFixed(1),tonicsPerFight:+(report.tonics/runsPerCell).toFixed(2),counterUses:report.counters};
}
function resultsCount(wins,total){return wins/total}
console.log(JSON.stringify({floor:4,playerLevel:5,gear:'class-valid starting weapon and patched coat',startingTonicCount:2,runsPerClassRollPolicy:runsPerCell,caveat:'Turn-based policy simulation using the game combat engine; outcomes are QA previews, not a public unlock recommendation.',results},null,2));
