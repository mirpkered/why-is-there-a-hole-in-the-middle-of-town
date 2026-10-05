// Static Town navigation metadata and shared art-led tile renderer.
export const TOWN_DESTINATIONS=Object.freeze([
  {id:'the-hole',slot:'the-hole',route:'dungeon',ariaLabel:'Enter the Hole',label:'ENTER THE HOLE',fallback:'↓',className:'location-hole',featured:true},
  {id:'general-store',slot:'general-store',route:'store',ariaLabel:'General Store',label:'GENERAL STORE',fallback:'▤',className:'location-store'},
  {id:'inn',slot:'inn',route:'inn',ariaLabel:'The Inn',label:'THE INN',fallback:'⌂',className:'location-inn'},
  {id:'quest-board',slot:'quest-board',route:'quests',ariaLabel:'Quest Board',label:'QUEST BOARD',fallback:'▧',className:'location-quests'},
  {id:'character',slot:'character',route:'character',ariaLabel:'Character',label:'CHARACTER',fallback:'◉',className:'location-character'},
  {id:'statistics',slot:'statistics',route:'statistics',ariaLabel:'Statistics',label:'STATISTICS',fallback:'▤',className:'location-records'},
  {id:'achievements',slot:'achievements',route:'achievements',ariaLabel:'Achievements',label:'ACHIEVEMENTS',fallback:'★',className:'location-achievements'},
  {id:'settings',slot:'settings',action:'settings',ariaLabel:'Settings',label:'SETTINGS',fallback:'⚙',className:'location-settings'}
]);

export function renderTownDestinations({artMarkup,deepestFloor=1}={}){
  return TOWN_DESTINATIONS.map(destination=>`<button class="location ${destination.className} location--art-destination" data-art-slot="${destination.slot}" ${destination.route?`data-go="${destination.route}"`:`data-action="${destination.action}"`} aria-label="${destination.ariaLabel}">${artMarkup(destination.slot,destination.fallback)}<span class="town-destination-label${destination.featured?' town-destination-label--featured':''}">${destination.featured?`<b>${destination.label}</b><small>Deepest: Floor ${deepestFloor}</small>`:destination.label}</span></button>`).join('');
}
