export const quests={
 'rat-problem':{id:'rat-problem',title:'Basement-level vermin',description:'Defeat the rat that has been chewing on the municipal depth markers.',giver:'Office of Subterranean Sanitation',type:'kill',target:'rat',count:1,reward:{gold:18,xp:8}},
 'lost-lunchbox':{id:'lost-lunchbox',title:'A lunchbox, technically public property',description:'Find the blue lunchbox left near the old stair.',giver:'Mara, Drainage Clerk',type:'loot',target:'lunchbox',count:1,reward:{gold:12,xp:6}},
 'stone-sample':{id:'stone-sample',title:'One representative rock',description:'Bring back a piece of anything that looks expensive to test.',giver:'Town Works Committee',type:'loot',target:'stone',count:1,reward:{gold:10,xp:5}}
};
export const items={
 'rusty-sword':{id:'rusty-sword',name:'Serviceable sword',category:'weapon',quantity:1,value:8,slot:'weapon',attack:2},
 'patched-coat':{id:'patched-coat',name:'Patched coat',category:'armor',quantity:1,value:5,slot:'armor',defense:1},
 'healing-tonic':{id:'healing-tonic',name:'Healing tonic',category:'consumable',quantity:2,value:6,effect:{type:'heal',amount:8}},
 'cave-salt':{id:'cave-salt',name:'Cave salt',category:'loot',quantity:0,value:3},
 'blue-lunchbox':{id:'blue-lunchbox',name:'Blue lunchbox',category:'quest',quantity:0,value:0,questItem:true},
 'stone-chip':{id:'stone-chip',name:'Unremarkable stone chip',category:'quest',quantity:0,value:0,questItem:true}
};
