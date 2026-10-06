// Static Town navigation metadata and shared art-led tile renderer.
export const TOWN_DESTINATIONS=Object.freeze([
  {id:'the-hole',slot:'the-hole',route:'dungeon',ariaLabel:'Enter the Hole',fallback:'↓',className:'location-hole'},
  {id:'general-store',slot:'general-store',route:'store',ariaLabel:'General Store',fallback:'▤',className:'location-store'},
  {id:'inn',slot:'inn',route:'inn',ariaLabel:'The Inn',fallback:'⌂',className:'location-inn'},
  {id:'quest-board',slot:'quest-board',route:'quests',ariaLabel:'Quest Board',fallback:'▧',className:'location-quests'},
  {id:'character',slot:'character',route:'character',ariaLabel:'Character',fallback:'◉',className:'location-character'},
  {id:'statistics',slot:'statistics',route:'statistics',ariaLabel:'Statistics',fallback:'▤',className:'location-records'},
  {id:'achievements',slot:'achievements',route:'achievements',ariaLabel:'Achievements',fallback:'★',className:'location-achievements'},
  {id:'settings',slot:'settings',action:'settings',ariaLabel:'Settings',fallback:'⚙',className:'location-settings'}
]);

export function renderTownDestinations({artMarkup}={}){
  return TOWN_DESTINATIONS.map(destination=>`<button class="location ${destination.className} location--art-destination" data-art-slot="${destination.slot}" ${destination.route?`data-go="${destination.route}"`:`data-action="${destination.action}"`} aria-label="${destination.ariaLabel}">${artMarkup(destination.slot,destination.fallback)}</button>`).join('');
}
