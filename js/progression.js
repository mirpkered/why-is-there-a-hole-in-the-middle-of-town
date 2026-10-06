// Small, data-driven kits. MP is the shared resource for every class.
export const classAbilities={
  Fighter:[
    {id:'power-strike',name:'Power Strike',level:1,cost:1,kind:'damage',scale:1.7,description:'A heavy physical blow.'},
    {id:'brace',name:'Brace',level:3,cost:1,kind:'brace',description:'Take 3 less damage from the next enemy hit.'},
    {id:'second-wind',name:'Second Wind',level:5,cost:2,kind:'heal',scale:.24,description:'Recover a little health.'}
  ],
  Wizard:[
    {id:'arcane-bolt',name:'Arcane Bolt',level:1,cost:2,kind:'magic',scale:1.15,description:'Reliable damage drawn from Mind.'},
    {id:'ember-spark',name:'Ember Spark',level:3,cost:3,kind:'fire',scale:1.65,description:'A stronger fire attack.'},
    {id:'ward',name:'Ward',level:5,cost:3,kind:'ward',description:'Reduce the next two hits by 2.'}
  ],
  Rogue:[
    {id:'quick-strike',name:'Quick Strike',level:1,cost:1,kind:'quick',scale:.85,description:'A fast strike with a better critical chance.'},
    {id:'cheap-shot',name:'Cheap Shot',level:3,cost:2,kind:'cheap',scale:1.15,description:'Hits harder against a weakened enemy.'},
    {id:'slip-away',name:'Slip Away',level:5,cost:2,kind:'slip',description:'Make a better combat escape attempt.'}
  ],
  Cleric:[
    {id:'smite',name:'Smite',level:1,cost:2,kind:'holy',scale:1.05,description:'Steady holy damage.'},
    {id:'mend',name:'Mend',level:3,cost:2,kind:'heal',scale:.3,description:'Restore health without an item.'},
    {id:'blessing',name:'Blessing',level:5,cost:3,kind:'blessing',description:'Reduce the next two hits by 2 and prevent the next burn.'}
  ]
};

export const achievements=[
  ['first-descent','First Descent','Enter the Hole.'],
  ['made-it-back','Made It Back','Return safely from an expedition.'],
  ['rat-problem','Municipal Pest Control','Defeat a Deadly Rat.'],
  ['goose-problem','Goose Problem','Defeat a Kung Fungoose.'],
  ['pocket-inspector','Pocket Inspector','Defeat a Pocket Slime.'],
  ['earthworm-proof','Warm Evidence','Defeat a Fire-Breathing Earthworm.'],
  ['not-a-shortcut','Not a Shortcut','Have a return attempt interrupted.'],
  ['paper-trail','A Complete File','Turn in five quests.'],
  ['deep-works','Still Going Down','Reach level 3.'],
  ['rescued','Recovered by the Office','Be rescued after defeat.'],
  ['strange-find','A Strange Find','Find a Strange item.'],
  ['duck-report','Waterfowl Witness','Encounter the duck.'],
  ['spoon-collection','Soup Logistics','Collect five spoons.'],
  ['mushroom-collection','Fungus Among Us','Collect five mushrooms.'],
  ['wealthy-on-paper','Liquid Assets','Hold 100 gold at once.'],
  ['air-quality-concern','Air Quality Concern','Defeat a Poo Gas.'],
  ['apple-a-day','An Apple a Day','Defeat three Rotten Apples.'],
  ['heart-health','Heart Health','Defeat Heart-Attack.'],
  ['pork-problem','Pork Problem','Defeat Porkscrew.'],
  ['spoon-certified','Spoon Certified','Acquire the Officially Sanctioned Spoon.']
].map(([id,name,description])=>({id,name,description}));

export {depthBands,CURRENT_PLAYABLE_MAX_FLOOR,QA_PREVIEW_MAX_FLOOR,depthBandFor} from './depth-config.js';
