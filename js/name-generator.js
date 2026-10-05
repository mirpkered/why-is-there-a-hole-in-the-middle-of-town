const FIRST = ['Ada','Agnes','Bungo','Beatrice','Clancy','Crinkle','Deborah','Edwin','Gertrude','Gumbo','Horace','Marmaduke','Mildred','Nora','Reginald','Susan','Todd','Wendell','Wilbur','Zelda','Pudding','Doris','Bartholomew','Mabel','Fergus','Clementine','Inez','Lester','Myrtle','Orville','Ethel','Gideon','Hortense','Cecil','Bernice','Rufus','Lavender','Otis','Maude','Wallace','Pearl','Morris','Beryl','Franklin','Tansy','Chester','Eunice','Elmer','Violet','Archibald','June','Gordon','Mavis','Percival','Rita','Stanley','Floyd','Constance','Basil','Louise','Mervin'];
const SURNAMES = ['Beefwhistle','Bucket','Crumb','Gravyboat','Hamwallet','Johnson','McScrapple','Mudbucket','Noodleman','Porkchop','Spleen','Thundersocks','von Bucket','Wiggins','Spoonworth','Crankle','Bottom','Puddleworth','Turnip','Marmalade','Oatcake','Bellweather','Biscuit','Clatterbuck','Dunn','Mudlark','Pickles','Waffleton','Tumbleweed','Pumpernickel','Fizzleby','Porridge','Snodgrass','Underfoot','Bumbershoot','Dingle','Muddle','Butterworth','Cabbage','Flapjack','Tater','Womble','Crackle','Bramble','Hobnob','Shovelton','Fumble','Biscuitworth','Dapple','Hardscrabble','Rutabaga','Bramblewick','Dawdle','Kettle','Lumps','Muckworth','Pockets','Scribble','Twitch','Wobble'];
const TITLES = ['Professor','Doctor','Captain','Deputy','Reverend','Mister','Ms.'];
const INITIALS = ['P.','J.','Q.','B.','R.','T.'];
const SHORT_SURNAMES = ['Crumb','Todd','Dunn','Bell','Pike','Wells','Moss','Kett','Pip','Lake','Reed','Gale','Holt','Fenn','Banks','Frost'];
const MAX_NAME_LENGTH = 24;

function roll(random){return Math.max(0,Math.min(.999999999,Number(random())||0))}
function pick(pool,random){return pool[Math.floor(roll(random)*pool.length)]}
export function generateAbsurdName(random=Math.random){
  const pattern=roll(random);
  let name,category;
  if(pattern<.1){name=pick(['Todd','Susan','Deborah','Inez','Mabel','Edwin','Nora','Lester','Rita','Frank','June','Gordon','Louise','Stanley','Mavis','Cecil'],random);category='ordinary'}
  else if(pattern<.18){name=`${pick(TITLES,random)} ${pick(SHORT_SURNAMES,random)}`;category='title'}
  else if(pattern<.29){name=`${pick(FIRST,random)} ${pick(INITIALS,random)} ${pick(SURNAMES,random)}`;category='initial'}
  else if(pattern<.38){name=`${pick(FIRST,random)} Mc${pick(['Scrapple','Crumb','Bucket','Puddle','Turnip'],random)}`;category='mc-compound'}
  else{name=`${pick(FIRST,random)} ${pick(SURNAMES,random)}`;category='full-name'}
  if(name.length>MAX_NAME_LENGTH){name=`${pick(FIRST,random)} ${pick(SHORT_SURNAMES,random)}`;category='short-fallback'}
  return {name,category};
}

export function inspectNameGenerator(count=100,random=Math.random){
  count=Math.max(1,Math.min(50000,Math.floor(count)||100));
  const names=[],categories={},lengths={min:Infinity,max:0},seen=new Set();let duplicateCount=0,invalidCount=0,ordinaryCount=0;
  for(let i=0;i<count;i++){
    const result=generateAbsurdName(random);names.push(result.name);categories[result.category]=(categories[result.category]||0)+1;
    lengths.min=Math.min(lengths.min,result.name.length);lengths.max=Math.max(lengths.max,result.name.length);
    if(seen.has(result.name))duplicateCount++;else seen.add(result.name);
    if(result.category==='ordinary')ordinaryCount++;
    if(!result.name.trim()||result.name.length>MAX_NAME_LENGTH||!/^[A-Za-z. ]+$/.test(result.name))invalidCount++;
  }
  return {generated:count,unique:seen.size,duplicateCount,invalidCount,ordinaryCount,categories,lengths,examples:names.slice(0,Math.min(12,count))};
}
export { MAX_NAME_LENGTH };
