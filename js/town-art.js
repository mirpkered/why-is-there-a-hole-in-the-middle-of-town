// Paired hand-drawn destination illustrations. Slots without assets keep their CSS emblem.
export const TOWN_ART_ASSETS={
  'the-hole':{
    ink:'assets/images/town/the-hole-ink.png',
    colored:'assets/images/town/the-hole-colored.png'
  },
  'inn':{
    ink:'assets/images/town/inn-sign-ink.png',
    colored:'assets/images/town/inn-sign-colored.png'
  },
  'general-store':{
    ink:'assets/images/town/store-sign-ink.png',
    colored:'assets/images/town/store-sign-colored.png'
  },
  'quest-board':{
    ink:'assets/images/town/quest-sign-ink.png',
    colored:'assets/images/town/quest-sign-colored.png'
  },
  'statistics':{
    ink:'assets/images/town/statistics-button-ink.png',
    colored:'assets/images/town/statistics-button-colored.png'
  },
  'achievements':{
    ink:'assets/images/town/achievements-button-ink.png',
    colored:'assets/images/town/achievements-button-colored.png'
  },
  'settings':{
    ink:'assets/images/town/settings-button-ink.png',
    colored:'assets/images/town/settings-button-colored.png'
  },
  'character':{
    ink:'assets/images/town/character-button-ink.png',
    colored:'assets/images/town/character-button-colored.png'
  }
};
for(const [id,entry] of Object.entries(TOWN_ART_ASSETS))Object.defineProperties(entry,{
  id:{value:id,enumerable:false},
  accessibilityLabel:{value:({ 'the-hole':'The Hole',inn:'The Inn','general-store':'General Store','quest-board':'Quest Board',statistics:'Statistics',achievements:'Achievements',settings:'Settings',character:'Character' })[id]||id,enumerable:false},
  sizeClass:{value:id==='the-hole'?'featured':'standard',enumerable:false},
  fallback:{value:'text',enumerable:false}
});
