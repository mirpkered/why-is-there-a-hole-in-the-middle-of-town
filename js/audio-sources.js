// Source-to-runtime provenance for the inventory report; playback still uses location-music.js/audio.js.
const numbered=(folder,prefix,count,makeSource=n=>`${prefix}-${String(n).padStart(3,'0')}-source.m4a`)=>Array.from({length:count},(_,i)=>{const n=i+1;return {source:`assets/audio/source/${folder}/${makeSource(n)}`,runtime:`assets/audio/music/${folder}/${prefix}-${String(n).padStart(3,'0')}.mp3`}});
export const AUDIO_SOURCE_REGISTRY=Object.freeze([
  {source:'assets/audio/source/battle-theme-master.flac',runtime:'assets/audio/music/battle-theme.mp3'},
  ...Array.from({length:18},(_,i)=>{const n=i+4;return {source:`assets/audio/source/dungeon-music/New Recording ${n}.m4a`,runtime:`assets/audio/music/dungeon/dungeon-${String(n).padStart(2,'0')}.mp3`}}),
  {source:'assets/audio/source/inn/inn-original.m4a',runtime:['inn-001','inn-002','inn-003'].map(id=>`assets/audio/music/inn/${id}.mp3`)},
  ...numbered('store','store',5,n=>`store-source-${String(n).padStart(2,'0')}-${({1:'new-recording-7',2:'new-recording-4',3:'new-recording-8',4:'new-recording-5',5:'new-recording-6'})[n]}.m4a`),
  ...numbered('character','character',5),
  ...numbered('settings','settings',4),
  ...numbered('statistics','statistics',6)
]);
