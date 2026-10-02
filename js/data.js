export const rarities={common:{label:'Common',weight:62},uncommon:{label:'Uncommon',weight:25},rare:{label:'Rare',weight:10},strange:{label:'Strange',weight:3}};

export const quests={
  'rat-problem':{id:'rat-problem',title:'Basement-level vermin',description:'Defeat the rat that has been chewing on the municipal depth markers.',giver:'Office of Subterranean Sanitation',type:'kill',target:'rat',count:1,reward:{gold:18,xp:8}},
  'lost-lunchbox':{id:'lost-lunchbox',title:'A lunchbox, technically public property',description:'Find the blue lunchbox left near the old stair.',giver:'Mara, Drainage Clerk',type:'loot',target:'lunchbox',count:1,reward:{gold:12,xp:6}},
  'stone-sample':{id:'stone-sample',title:'One representative rock',description:'Bring back a piece of anything that looks expensive to test.',giver:'Town Works Committee',type:'loot',target:'stone',count:1,reward:{gold:10,xp:5}},
  'goose-feather':{id:'goose-feather',title:'Feather, for the records',description:'Recover one feather from the goose population. Do not ask why.',giver:'Juniper Dunn',type:'loot',target:'goose-feather',count:1,reward:{gold:16,xp:8}},
  'earthworm-ember':{id:'earthworm-ember',title:'Warm sample',description:'Bring back an ember sac from a fire-breathing earthworm.',giver:'Town Works Committee',type:'loot',target:'earthworm-ember',count:1,reward:{gold:22,xp:12}},
  'depth-three':{id:'depth-three',title:'Confirm the lower stair exists',description:'Reach level 3, then make it back with your report.',giver:'Linna Venn, Notice-board clerk',type:'return',target:'3',count:1,reward:{gold:35,xp:20}}
};

export const monsters={
  rat:{id:'rat',name:'Dungeon Rat',minDepth:1,hp:8,attack:4,defense:0,speed:2,xp:4,gold:[2,4],rarity:'common',lootTable:'rat-drops',encounterText:'A municipal depth marker has fresh tooth marks.',behavior:{type:'plain',description:'Bites once.'}},
  kobold:{id:'kobold',name:'Kobold Toll-Taker',minDepth:1,hp:12,attack:4,defense:1,speed:2,xp:7,gold:[2,7],rarity:'common',lootTable:'kobold-drops',encounterText:'It has set up a toll booth with no road attached.',behavior:{type:'guard',description:'Ordinary attack; carries trade goods.'}},
  killerRabbit:{id:'killer-rabbit',name:'Killer Rabbit',minDepth:1,hp:11,attack:6,defense:1,speed:4,xp:8,gold:[1,4],rarity:'uncommon',lootTable:'rabbit-drops',encounterText:'It looks harmless. It is not waiting for you to decide.',behavior:{type:'critical',criticalChance:.22,description:'Sometimes lands a hard bite.'}},
  kungFuGoose:{id:'kung-fu-goose',name:'Kung Fu Goose',minDepth:1,hp:10,attack:3,defense:1,speed:5,xp:9,gold:[0,3],rarity:'uncommon',lootTable:'goose-drops',encounterText:'The goose bows. The bow appears tactical.',behavior:{type:'quick',multiStrike:2,evadeChance:.12,description:'Two light strikes; may evade.'}},
  pocketSlime:{id:'pocket-slime',name:'Pocket Slime',minDepth:1,hp:13,attack:3,defense:1,speed:1,xp:7,gold:[0,2],rarity:'common',lootTable:'slime-drops',encounterText:'A blob attempts to fit inside your boot.',behavior:{type:'plain',description:'Slow, steady attacks.'}},
  fireWorm:{id:'fire-worm',name:'Fire-Breathing Earthworm',minDepth:2,hp:18,attack:5,defense:2,speed:1,xp:15,gold:[4,9],rarity:'uncommon',lootTable:'worm-drops',encounterText:'A length of earthworm inhales. The earth glows.',behavior:{type:'burn',burnChance:.35,burnTurns:2,description:'May leave a brief burn.'}},
  skeleton:{id:'skeleton',name:'Skeleton on Break',minDepth:2,hp:18,attack:6,defense:2,speed:2,xp:16,gold:[4,10],rarity:'common',lootTable:'skeleton-drops',encounterText:'A skeleton checks a pocket watch. It has no pockets.',behavior:{type:'plain',description:'A sturdy, ordinary fighter.'}},
  paperMimic:{id:'paper-mimic',name:'Permit-Office Mimic',minDepth:3,hp:25,attack:7,defense:3,speed:2,xp:26,gold:[8,16],rarity:'rare',lootTable:'mimic-drops',encounterText:'The filing cabinet has too many teeth.',behavior:{type:'critical',criticalChance:.15,description:'Heavy strikes from a convincing cabinet.'}}
};

export const items={
  'rusty-sword':{id:'rusty-sword',name:'Rusty Sword',category:'equipment',slot:'mainHand',rarity:'common',buyValue:12,sellValue:5,modifiers:{attack:2},flavor:'The rust is mostly decorative. Probably.',stackable:false},
  'patched-coat':{id:'patched-coat',name:'Patched Coat',category:'equipment',slot:'body',rarity:'common',buyValue:10,sellValue:4,modifiers:{defense:1,hp:2},flavor:'One patch is an official town map.',stackable:false},
  'wooden-shield':{id:'wooden-shield',name:'Wooden Shield',category:'equipment',slot:'offHand',rarity:'common',buyValue:18,sellValue:8,modifiers:{defense:2},flavor:'It has been tested against doors.',stackable:false},
  'leather-armor':{id:'leather-armor',name:'Leather Armor',category:'equipment',slot:'body',rarity:'common',buyValue:28,sellValue:12,modifiers:{defense:2,hp:3},flavor:'Practical, if a little damp.',stackable:false},
  'reinforced-boots':{id:'reinforced-boots',name:'Reinforced Boots',category:'equipment',slot:'feet',rarity:'common',buyValue:20,sellValue:8,modifiers:{defense:1,agility:1},flavor:'The stairs have opinions about footwear.',stackable:false},
  'apprentice-staff':{id:'apprentice-staff',name:'Apprentice Staff',category:'equipment',slot:'mainHand',rarity:'uncommon',buyValue:38,sellValue:16,modifiers:{attack:1,mind:1,mp:3},classes:['Wizard','Cleric'],flavor:'It knows three spells and one of them is a knock.',stackable:false},
  'goose-proof-helmet':{id:'goose-proof-helmet',name:'Goose-Proof Helmet',category:'equipment',slot:'head',rarity:'uncommon',buyValue:32,sellValue:14,modifiers:{defense:1,agility:1},effects:{vsGoose:2},flavor:'The warranty is very specific.',stackable:false},
  'questionable-luck':{id:'questionable-luck',name:'Ring of Questionable Luck',category:'equipment',slot:'accessory',rarity:'strange',buyValue:48,sellValue:20,modifiers:{agility:1},effects:{lootBonus:.08},flavor:'The ring insists that the odds are excellent.',stackable:false},
  'heavy-spoon':{id:'heavy-spoon',name:'Extremely Heavy Spoon',category:'equipment',slot:'mainHand',rarity:'common',buyValue:14,sellValue:5,modifiers:{attack:3,agility:-1},flavor:'Designed for soup of unusual density.',stackable:false},
  'fireproof-trousers':{id:'fireproof-trousers',name:'Pants of Minor Fire Resistance',category:'equipment',slot:'body',rarity:'uncommon',buyValue:36,sellValue:15,modifiers:{defense:1},effects:{fireResistance:2},flavor:'Minor resistance. Major tailoring.',stackable:false},
  'kobold-buckler':{id:'kobold-buckler',name:'Kobold-Chewed Buckler',category:'equipment',slot:'offHand',rarity:'uncommon',buyValue:30,sellValue:13,modifiers:{defense:1},effects:{retreatBonus:10},flavor:'The bite marks are now considered reinforcement.',stackable:false},
  'squeaky-boots':{id:'squeaky-boots',name:'Boots That Squeak Near Treasure',category:'equipment',slot:'feet',rarity:'strange',buyValue:42,sellValue:17,modifiers:{agility:1},effects:{lootBonus:.12},flavor:'They squeak only when you would prefer they did not.',stackable:false},
  'healing-tonic':{id:'healing-tonic',name:'Healing Tonic',category:'consumable',rarity:'common',buyValue:8,sellValue:3,effect:{type:'heal',amount:8},flavor:'Tastes faintly of mint and paperwork.',stackable:true},
  'cave-salt':{id:'cave-salt',name:'Cave Salt',category:'trade-good',rarity:'common',buyValue:4,sellValue:2,flavor:'Useful to someone, apparently.',stackable:true},
  'suspicious-mushroom':{id:'suspicious-mushroom',name:'Suspicious Mushroom',category:'trade-good',rarity:'common',buyValue:5,sellValue:2,flavor:'The mushroom is being cagey.',stackable:true},
  'goose-feather':{id:'goose-feather',name:'Goose Feather',category:'trade-good',rarity:'uncommon',buyValue:7,sellValue:3,flavor:'It has a remarkably stern quill.',stackable:true},
  'earthworm-ember':{id:'earthworm-ember',name:'Earthworm Ember Sac',category:'trade-good',rarity:'uncommon',buyValue:10,sellValue:4,flavor:'Warm. Do not squeeze.',stackable:true},
  'kobold-trinket':{id:'kobold-trinket',name:'Kobold Trinket',category:'trade-good',rarity:'common',buyValue:6,sellValue:3,flavor:'The exchange rate is known only to kobolds.',stackable:true},
  'blue-lunchbox':{id:'blue-lunchbox',name:'Blue Lunchbox',category:'quest',rarity:'common',buyValue:0,sellValue:0,questItem:true,stackable:false,flavor:'Name scratched underneath: “Mara.”'},
  'stone-chip':{id:'stone-chip',name:'Unremarkable Stone Chip',category:'quest',rarity:'common',buyValue:0,sellValue:0,questItem:true,stackable:false,flavor:'The committee will be thrilled.'},
  'bent-spoon':{id:'bent-spoon',name:'Bent Spoon',category:'junk',rarity:'common',buyValue:2,sellValue:1,flavor:'No longer suitable for formal soup.',stackable:true}
};

export const lootTables={
  'rat-drops':[{item:'cave-salt',weight:4},{item:'suspicious-mushroom',weight:2},{item:'bent-spoon',weight:1}],
  'kobold-drops':[{item:'kobold-trinket',weight:4},{item:'cave-salt',weight:2},{item:'wooden-shield',weight:1}],
  'rabbit-drops':[{item:'suspicious-mushroom',weight:3},{item:'reinforced-boots',weight:1},{item:'goose-proof-helmet',weight:1}],
  'goose-drops':[{item:'goose-feather',weight:5},{item:'goose-proof-helmet',weight:1},{item:'questionable-luck',weight:1}],
  'slime-drops':[{item:'cave-salt',weight:3},{item:'suspicious-mushroom',weight:3},{item:'healing-tonic',weight:1}],
  'worm-drops':[{item:'earthworm-ember',weight:5},{item:'fireproof-trousers',weight:1},{item:'heavy-spoon',weight:1}],
  'skeleton-drops':[{item:'kobold-trinket',weight:2},{item:'wooden-shield',weight:2},{item:'leather-armor',weight:1}],
  'mimic-drops':[{item:'heavy-spoon',weight:2},{item:'squeaky-boots',weight:2},{item:'apprentice-staff',weight:1}]
};

export const townNpcs={
  clerk:{name:'Linna Venn',role:'Notice-board clerk',line:'I file the quests by depth. The hole files nothing.'},
  shopkeeper:{name:'Juniper Dunn',role:'General-store keeper',line:'If it came up from below, I can probably price it.'},
  innkeeper:{name:'Sal Morrow',role:'Innkeeper',line:'Rooms are quiet. The ground floor is quietest.'}
};

export const dungeonNpcs={
  'kobold-trader':{id:'kobold-trader',name:'Pip Underledger',role:'Wandering kobold merchant',line:'Gold is fine. Odd things are better. I have a ledger for both.',tradeIds:['salt-for-buckler','mushroom-goose-deal']},
  'lost-surveyor':{id:'lost-surveyor',name:'Nell from Municipal Survey',role:'Lost adventurer',line:'I came to measure the stairs. I have been measuring for three days.',stock:['healing-tonic'],priceMultiplier:2}
};

export const trades={
  'salt-for-buckler':{id:'salt-for-buckler',npcId:'kobold-trader',title:'Trade cave salt for a buckler',gives:[{item:'kobold-buckler',quantity:1}],requires:[{item:'cave-salt',quantity:2}],gold:4},
  'mushroom-goose-deal':{id:'mushroom-goose-deal',npcId:'kobold-trader',title:'Three mushrooms and one goose feather for a heavy spoon',gives:[{item:'heavy-spoon',quantity:1}],requires:[{item:'suspicious-mushroom',quantity:3},{item:'goose-feather',quantity:1}],gold:20}
};

export const shopStock=['healing-tonic','rusty-sword','wooden-shield','leather-armor','reinforced-boots','apprentice-staff','goose-proof-helmet','fireproof-trousers'];
export const npcEncounterIds=['kobold-trader','lost-surveyor'];
export const floorEncounterTable={
  1:[{id:'rat',weight:3},{id:'kobold',weight:2},{id:'killerRabbit',weight:2},{id:'kungFuGoose',weight:2},{id:'pocketSlime',weight:3}],
  2:[{id:'rat',weight:1},{id:'kobold',weight:2},{id:'killerRabbit',weight:2},{id:'kungFuGoose',weight:2},{id:'pocketSlime',weight:2},{id:'fireWorm',weight:3},{id:'skeleton',weight:3}],
  3:[{id:'killerRabbit',weight:2},{id:'kungFuGoose',weight:2},{id:'fireWorm',weight:3},{id:'skeleton',weight:3},{id:'paperMimic',weight:2}]
};
