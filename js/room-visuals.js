/* Lightweight room-prop registry and deterministic placement for the faux-3D scene. */
export const ROOM_PROP_ZONES=['far-left','far-center','far-right','mid-left','mid-right','foreground-left','foreground-right','floor-center','wall-center'];

export const roomProps={
  'mushroom-cluster':{id:'mushroom-cluster',label:'Mushroom cluster',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:3,rooms:['mushroom-room'],layer:'background',collisionRelevant:false,placeholder:'mushrooms'},
  'tall-mushrooms':{id:'tall-mushrooms',label:'Tall mushrooms',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:1,rooms:['mushroom-room'],layer:'background',collisionRelevant:false,placeholder:'mushrooms tall'},
  'water-debris':{id:'water-debris',label:'Floating debris',zones:['floor-center','foreground-left','foreground-right'],flipAllowed:true,weight:2,rooms:['flooded-chamber'],layer:'background',collisionRelevant:false,placeholder:'water-debris'},
  'floating-plank':{id:'floating-plank',label:'Floating plank',zones:['floor-center','foreground-left','foreground-right'],flipAllowed:true,weight:1,rooms:['flooded-chamber'],layer:'background',collisionRelevant:false,placeholder:'plank'},
  'small-altar':{id:'small-altar',label:'Small altar',zones:['far-center','wall-center'],flipAllowed:false,weight:2,rooms:['shrine'],layer:'background',collisionRelevant:false,placeholder:'altar'},
  candle:{id:'candle',label:'Candle',zones:['far-center','wall-center','floor-center'],flipAllowed:false,weight:1,rooms:['shrine'],layer:'foreground',collisionRelevant:false,placeholder:'candle'},
  'wooden-crate':{id:'wooden-crate',label:'Wooden crate',zones:['far-left','far-right','mid-left','mid-right','foreground-left','foreground-right'],flipAllowed:true,weight:3,rooms:['storage'],layer:'background',collisionRelevant:false,placeholder:'crate',ink:'assets/images/room-props/wooden-crate-ink.png',colored:'assets/images/room-props/wooden-crate-colored.png',scale:{min:.85,max:1.05}},
  barrel:{id:'barrel',label:'Barrel',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:2,rooms:['storage'],layer:'background',collisionRelevant:false,placeholder:'barrel'},
  'labeled-box':{id:'labeled-box',label:'Labeled box',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:1,rooms:['storage'],layer:'background',collisionRelevant:false,placeholder:'box'},
  'campfire-kettle':{id:'campfire-kettle',label:'Cold fire and kettle',zones:['floor-center','far-center'],flipAllowed:false,weight:3,rooms:['camp'],layer:'foreground',collisionRelevant:false,placeholder:'campfire-kettle'},
  campfire:{id:'campfire',label:'Campfire',zones:['floor-center'],flipAllowed:false,weight:4,rooms:['camp'],layer:'foreground',collisionRelevant:false,placeholder:'campfire',ink:'assets/images/room-props/campfire-ink.png',colored:'assets/images/room-props/campfire-colored.png',scale:{min:.9,max:1.08}},
  bedroll:{id:'bedroll',label:'Bedroll',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:2,rooms:['camp'],layer:'background',collisionRelevant:false,placeholder:'bedroll'},
  'small-pack':{id:'small-pack',label:'Abandoned pack',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:1,rooms:['camp'],layer:'background',collisionRelevant:false,placeholder:'pack'},
  'market-stall':{id:'market-stall',label:'Improvised market table',zones:['far-center','mid-left','mid-right'],flipAllowed:true,weight:3,rooms:['market'],layer:'background',collisionRelevant:false,placeholder:'stall'},
  'market-basket':{id:'market-basket',label:'Market basket',zones:['far-left','far-right','mid-left','mid-right'],flipAllowed:true,weight:2,rooms:['market'],layer:'foreground',collisionRelevant:false,placeholder:'basket'},
  'market-sign':{id:'market-sign',label:'Market sign',zones:['far-left','far-center','far-right','wall-center'],flipAllowed:true,weight:2,rooms:['market'],layer:'foreground',collisionRelevant:false,placeholder:'sign'},
  bookshelf:{id:'bookshelf',label:'Bookshelf',zones:['far-left','far-right','wall-center'],flipAllowed:true,weight:3,rooms:['library'],layer:'background',collisionRelevant:false,placeholder:'shelf'},
  'book-stack':{id:'book-stack',label:'Book stack',zones:['floor-center','mid-left','mid-right'],flipAllowed:true,weight:2,rooms:['library'],layer:'foreground',collisionRelevant:false,placeholder:'books'},
  'labeled-stone':{id:'labeled-stone',label:'Labeled stone',zones:['far-center','wall-center'],flipAllowed:false,weight:1,rooms:['library'],layer:'foreground',collisionRelevant:false,placeholder:'labeled-stone'},
  'filing-cabinet':{id:'filing-cabinet',label:'Filing cabinet',zones:['far-left','far-right','mid-left','mid-right','wall-center'],flipAllowed:true,weight:3,rooms:['records'],layer:'background',collisionRelevant:false,placeholder:'cabinet'},
  'archive-box':{id:'archive-box',label:'Archive box',zones:['far-left','far-right','mid-left','mid-right','floor-center'],flipAllowed:true,weight:2,rooms:['records'],layer:'foreground',collisionRelevant:false,placeholder:'box'},
  'paper-stack':{id:'paper-stack',label:'Paper stack',zones:['far-center','floor-center','mid-left','mid-right'],flipAllowed:true,weight:2,rooms:['records'],layer:'foreground',collisionRelevant:false,placeholder:'papers'},
  'spoon-pile':{id:'spoon-pile',label:'Pile of spoons',zones:['floor-center','foreground-left','foreground-right','mid-left','mid-right'],flipAllowed:true,weight:3,rooms:['spoons'],layer:'foreground',collisionRelevant:false,placeholder:'spoons'},
  'single-spoon':{id:'single-spoon',label:'Spoon',zones:['floor-center','foreground-left','foreground-right','mid-left','mid-right'],flipAllowed:true,weight:1,rooms:['spoons'],layer:'foreground',collisionRelevant:false,placeholder:'spoon'},
  'stone-debris':{id:'stone-debris',label:'Stone debris',zones:['far-left','far-right'],flipAllowed:true,weight:1,rooms:['ordinary'],layer:'background',collisionRelevant:false,placeholder:'debris'}
};
for(const prop of Object.values(roomProps)){prop.colored=prop.colored||null;prop.ink=prop.ink||null;prop.scale=prop.scale||{min:.72,max:1.2};prop.anchorZones=prop.anchorZones||prop.zones;prop.rarity=prop.rarity||'common';prop.minCount=prop.minCount??1;prop.maxCount=prop.maxCount??1}
roomProps['mushroom-cluster'].maxCount=2;roomProps['spoon-pile'].maxCount=2;

function floorFingerprint(map){const walls=(map?.walls||[]).map(p=>Array.isArray(p)?`${p[0]},${p[1]}`:String(p)).sort().join(';');return `${map?.width||0}x${map?.height||0}|${walls}|u:${(map?.upStairs||[]).join(',')}|d:${(map?.downStairs||[]).join(',')}`}
export function roomVisualSeed(map,floor,x,y,roomId,variation=0){const text=`${floorFingerprint(map)}|${floor}|${x},${y}|${roomId}|${variation}`;let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return hash>>>0}
function randomFrom(seed){let value=seed>>>0;return()=>{value=(value+0x6D2B79F5)>>>0;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296}}
export function createRoomDecoration(room,map,floor,x,y,variation=0){
  if(!room?.visual)return {seed:roomVisualSeed(map,floor,x,y,room?.id||'ordinary',variation),props:[]};
  const seed=roomVisualSeed(map,floor,x,y,room.id,variation),rand=randomFrom(seed),pool=room.visual.propPool.map(id=>roomProps[id]).filter(Boolean),rules=room.visual.placementRules||ROOM_PROP_ZONES,desired=Math.max(1,room.visual.density||1),usedZones=new Set(),props=[];
  let available=[...pool];
  for(let i=0;i<desired&&pool.length;i++){
    if(!available.length)available=[...pool];
    let total=available.reduce((sum,prop)=>sum+prop.weight,0),roll=rand()*total;
    const prop=available.find(candidate=>(roll-=candidate.weight)<0)||available[0];
    available=available.filter(candidate=>candidate.id!==prop.id);
    const compatibleZones=prop.zones.filter(zone=>rules.includes(zone));
    if(!compatibleZones.length)continue;
    const copies=prop.minCount+Math.floor(rand()*(prop.maxCount-prop.minCount+1));
    for(let copy=0;copy<copies;copy++){
      const unusedZones=compatibleZones.filter(zone=>!usedZones.has(zone)),choices=unusedZones.length?unusedZones:compatibleZones;
      const zone=choices[Math.floor(rand()*choices.length)];
      usedZones.add(zone);
      props.push({...prop,zone,scale:Number((prop.scale.min+rand()*(prop.scale.max-prop.scale.min)).toFixed(2)),flip:prop.flipAllowed&&rand()>.5,depth:zone.startsWith('foreground')?3:zone.startsWith('mid')?2:1});
    }
  }
  return {seed,props};
}

function placeholderSvg(type,ink){type=type.startsWith('mushrooms')?'mushrooms':type;const line=ink?'#171717':'#251d16',fill=ink?'#fffdf7':({'mushrooms':'#e7bd91','crate':'#b7793f','barrel':'#98613a','box':'#d0aa77','campfire-kettle':'#766f68','bedroll':'#73817a','pack':'#795a41','stall':'#b87943','basket':'#ae7741','sign':'#f0dfb2','shelf':'#6e4b37','books':'#9e633f','labeled-stone':'#aaa393','cabinet':'#777b7a','papers':'#e7dfc7','spoons':'#b9c4c5','spoon':'#c8d0d0','water-debris':'#a7c8c8','plank':'#a77a4d','altar':'#9a9285','candle':'#eee0a9','debris':'#857b6b'})[type]||'#aaa';const common=`fill="${fill}" stroke="${line}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
 const shapes={
  mushrooms:`<path ${common} d="M24 62h14V39H24zM58 64h14V30H58zM88 64h12V44H88z"/><path ${common} d="M14 42Q30 11 49 42Q34 49 14 42M47 33Q66 0 82 33Q66 41 47 33M79 47Q94 25 108 47Q95 54 79 47" fill="${ink?'none':'#d88366'}"/>`,
  crate:`<path ${common} d="M17 24h70v60H17z"/><path ${common} d="M17 40h70M17 68h70M28 24v60M76 24v60" fill="none"/>`,barrel:`<path ${common} d="M30 18Q18 51 30 84h54q12-33 0-66z"/><path ${common} d="M24 34h66M23 68h68" fill="none"/>`,box:`<path ${common} d="M20 33l32-16 39 14-34 17zM20 33v42l37 15V48M57 48v42l34-17V31"/>`,
  'campfire-kettle':`<path ${common} d="M28 75l22-38 19 38M39 75l13-22 12 22" fill="none"/><path ${common} d="M76 49h30l-4 29H80zM82 47q8-16 17 0"/><path d="M48 35q-7-10 2-18 0 9 7 13 4-8 8-13 7 13-3 20" fill="${ink?'none':'#df7242'}" stroke="${line}" stroke-width="3"/>`,
  campfire:`<path ${common} d="M12 78l95-37 5 14-94 37zM18 46l83 43-7 12-84-44z"/><circle cx="20" cy="85" r="7" fill="${ink?'none':'#8a5938'}" stroke="${line}" stroke-width="3"/><circle cx="100" cy="96" r="7" fill="${ink?'none':'#8a5938'}" stroke="${line}" stroke-width="3"/><path d="M42 63Q31 48 42 29q1 13 9 19 1-23 12-36 0 17 9 26 5-13 12-19 10 17 1 37l-13 8H49z" fill="${ink?'none':'#e98135'}" stroke="${line}" stroke-width="3"/><path d="M53 62q-4-12 4-21 2 9 8 12 4-9 8-12 6 13-2 22z" fill="${ink?'none':'#f4be4c'}" stroke="${line}" stroke-width="2"/>`,
  bedroll:`<path ${common} d="M16 62q0-23 18-23h58q18 0 18 19v12H16z"/><path ${common} d="M28 40v29M93 40v30" fill="none"/>`,pack:`<path ${common} d="M35 27q18-18 36 0l10 57H27z"/><path ${common} d="M31 54h54v19H31zM49 28v-9h11v9"/>`,
  stall:`<path ${common} d="M15 35h84v14H15zM23 49v39M90 49v39M20 30l12-17h58l12 17z"/><path ${common} d="M32 14v16M89 14v16" fill="none"/>`,basket:`<path ${common} d="M24 43h62l-8 39H32zM37 43q4-30 18-30t18 30"/><path ${common} d="M38 49l4 27M54 49v28M70 49l-3 28" fill="none"/>`,sign:`<path ${common} d="M25 17h60v40H25zM55 57v31"/><path d="M35 30h40M35 40h33" stroke="${line}" stroke-width="3"/>`,
  shelf:`<path ${common} d="M22 12h67v79H22zM22 35h67M22 61h67M34 16v16M63 16v16M29 39v18M59 39v18M77 65v22"/>`,books:`<path ${common} d="M24 63l8-39 18 4-8 39zM49 67l2-46 19 1-2 46zM72 66l10-36 17 5-9 36z"/>`,
  'labeled-stone':`<path ${common} d="M23 76l8-42 20-17 29 9 12 50-31 12z"/><path d="M43 48h34M45 57h27" stroke="${line}" stroke-width="3"/>`,cabinet:`<path ${common} d="M26 9h61v82H26zM26 35h61M26 62h61"/><path d="M49 23h16M49 49h16M49 76h16" stroke="${line}" stroke-width="3"/>`,papers:`<path ${common} d="M27 30h57v53H27zM21 22h57v53M34 14h57v53"/><path d="M41 31h36M41 40h36M41 49h36" stroke="${line}" stroke-width="3"/>`,
  spoons:`<g fill="none" stroke="${ink?'#171717':'#9eafb0'}" stroke-width="7" stroke-linecap="round"><path d="M28 72L78 24M48 82L91 40M68 86l36-39"/></g><g fill="${ink?'none':'#dbe3e1'}" stroke="${line}" stroke-width="3"><ellipse cx="82" cy="21" rx="9" ry="13"/><ellipse cx="95" cy="37" rx="9" ry="13"/><ellipse cx="108" cy="45" rx="9" ry="13"/></g>`,spoon:`<path d="M38 72l43-44" stroke="${ink?'#171717':'#9eafb0'}" stroke-width="7" stroke-linecap="round"/><ellipse cx="87" cy="22" rx="10" ry="14" ${common}/>`,'water-debris':`<path ${common} d="M18 66h91l-13 8H30zM57 62q0-10 9-10t9 10"/>`,plank:`<path ${common} d="M14 54l89-16 8 20-89 16z"/>`,altar:`<path ${common} d="M28 40h63v14H28zM35 54h49l9 34H26zM41 31h36v9H41z"/>`,candle:`<path ${common} d="M45 39h23v48H45z"/><path d="M56 37q-12-12 0-24 12 13 0 24" fill="${ink?'none':'#e7ae42'}" stroke="${line}" stroke-width="3"/>`,debris:`<path ${common} d="M20 78l18-27 17 17 19-36 23 46z"/>`};return `<svg viewBox="0 0 120 100" focusable="false" aria-hidden="true">${shapes[type]||shapes.box}</svg>`}

export function roomPropMarkup(decoration,spriteStyle='colored',showZones=false){return decoration.props.map((prop,index)=>{const source=spriteStyle==='ink'?prop.ink:prop.colored;const flip=prop.flip?'scaleX(-1)':'';const style=`--prop-scale:${prop.scale};--prop-depth:${prop.depth};transform:translate(-50%,-50%) scale(${prop.scale}) ${flip}`;const zoneClass=prop.zone.replaceAll('-','_');return `<span class="room-prop room-prop--${prop.placeholder.replaceAll(' ','-')} room-prop-zone--${zoneClass} room-prop-layer--${prop.layer}${showZones?' room-prop--show-zone':''}" data-prop-id="${prop.id}" data-prop-zone="${prop.zone}" style="${style}" aria-hidden="true">${source?`<img src="${source}" alt="">`:placeholderSvg(prop.placeholder,spriteStyle==='ink')}</span>`}).join('')}
