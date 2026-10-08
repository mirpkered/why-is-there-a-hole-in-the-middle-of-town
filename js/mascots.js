// Optional mascot art is registered by stable ID and never required for normal play.
export const MASCOT_ART=Object.freeze({
  'dj-penguin':Object.freeze({
    id:'dj-penguin',
    name:'DJ Penguin',
    role:'trivia-generator',
    accessibilityLabel:'DJ Penguin, trivia generator mascot',
    src:'assets/images/mascots/dj-penguin.png',
    ink:null,
    fallback:'text'
  }),
  'bowser':Object.freeze({
    id:'bowser',
    name:'Bowser',
    role:'town-companion',
    accessibilityLabel:'Bowser, carrying a stick',
    src:'assets/images/mascots/bowser.png',
    ink:null,
    fallback:'hidden'
  })
});
