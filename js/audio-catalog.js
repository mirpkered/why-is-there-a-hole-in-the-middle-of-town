// Stable source-path metadata for the shared audio manager and generated inventory report.
export const BATTLE_THEME='assets/audio/music/battle-theme.mp3';
export const DUNGEON_TRACKS=Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(number=>Object.freeze({
  id:`recording-${number}`,
  name:`Recording ${number}`,
  src:`assets/audio/music/dungeon/dungeon-${String(number).padStart(2,'0')}.mp3`
})));
