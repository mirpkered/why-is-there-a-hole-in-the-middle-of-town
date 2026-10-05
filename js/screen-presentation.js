// Shared screen policy metadata; app.js retains ownership of screen markup and navigation actions.
export const SCREEN_PRESENTATION=Object.freeze({
  title:{parent:null,music:null,header:'title',townBack:false},
  town:{parent:null,music:null,header:'masthead',townBack:false},
  store:{parent:'town',music:'store',header:'service',townBack:true},
  inn:{parent:'town',music:'inn',header:'service',townBack:true},
  quests:{parent:'town',music:'questBoard',header:'service',townBack:true},
  character:{parent:'town',music:'character',header:'service',townBack:true},
  statistics:{parent:'town',music:'statistics',header:'service',townBack:true},
  achievements:{parent:'town',music:'achievements',header:'service',townBack:true},
  dungeon:{parent:'town',music:'dungeon',header:'dungeon',townBack:false},
  event:{parent:'dungeon',music:'dungeon',header:'dungeon',townBack:false},
  npc:{parent:'dungeon',music:'dungeon',header:'dungeon',townBack:false},
  inventory:{parent:'dungeon',music:'dungeon',header:'dungeon',townBack:false},
  settings:{parent:'town',music:'settings',header:'modal',townBack:true}
});
export function screenPresentation(screen){return SCREEN_PRESENTATION[screen]||{parent:null,music:null,header:'masthead',townBack:false};}
