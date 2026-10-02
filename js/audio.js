const battleTheme = new URL('../assets/audio/music/battle-theme.mp3', import.meta.url).href;
let channel = null;
let audioContext = null;
let gainNode = null;
let sourceNode = null;
let audioLevel = 0;
let trackId = null;
let enabled = true;
let volume = 0.28;
let combatActive = false;
let qaPlayback = false;
let fadeTimer = null;
let transitionId = 0;
let playRequestId = 0;

function cancelFade(){
  if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
  transitionId++;
}

function ensureChannel(){
  if(channel)return channel;
  if(typeof Audio==='undefined')return null;
  channel=new Audio(battleTheme);
  channel.preload='auto';
  channel.loop=true;
  channel.volume=0;
  // iOS Safari may ignore HTMLMediaElement.volume. A single gain stage keeps
  // the in-game volume slider and fades effective while reusing the same track.
  const AudioContextType=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(AudioContextType){
    try{
      audioContext=new AudioContextType();
      sourceNode=audioContext.createMediaElementSource(channel);
      gainNode=audioContext.createGain();
      gainNode.gain.value=0;
      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      channel.volume=1;
    }catch{
      gainNode=null;
      sourceNode=null;
      audioContext?.close?.();
      audioContext=null;
    }
  }
  channel.addEventListener('ended',()=>{
    if(!channel?.loop){trackId=null;qaPlayback=false}
  });
  return channel;
}

function setAudioLevel(value){
  audioLevel=Math.max(0,Math.min(1,value));
  if(gainNode)gainNode.gain.value=audioLevel;
  else if(channel)channel.volume=audioLevel;
}

function fadeTo(target,duration=220,finish){
  if(!channel)return;
  cancelFade();
  const id=++transitionId,start=audioLevel,started=performance.now();
  fadeTimer=setInterval(()=>{
    if(id!==transitionId||!channel){clearInterval(fadeTimer);fadeTimer=null;return}
    const progress=Math.min(1,(performance.now()-started)/duration);
    setAudioLevel(start+(target-start)*progress);
    if(progress===1){clearInterval(fadeTimer);fadeTimer=null;finish?.()}
  },32);
}

async function start(loop=true,userGesture=false){
  const el=ensureChannel();
  if(!el||!enabled)return false;
  el.loop=loop;
  if(trackId==='battle'&&!el.paused){audioContext?.resume?.().catch(()=>{});fadeTo(volume,140);return true}
  if(!userGesture)return false;
  const requestId=++playRequestId;
  trackId='battle';
  setAudioLevel(0);
  try{
    const playPromise=el.play();
    const resumePromise=audioContext?.resume?.()||Promise.resolve();
    await Promise.all([playPromise,resumePromise]);
    if(requestId!==playRequestId||!enabled||(!combatActive&&!qaPlayback)){stopMusic();return false}
    fadeTo(volume,500);
    return true;
  }catch{
    if(requestId===playRequestId){trackId=null;el.pause()}
    return false;
  }
}

export function updateMusicPreferences(preferences={}){
  enabled=preferences.musicEnabled!==false;
  const next=Number(preferences.musicVolume);
  if(Number.isFinite(next))volume=Math.max(0,Math.min(1,next));
  if(!enabled)stopMusic();
  else if(channel&&!channel.paused&&trackId==='battle')fadeTo(volume,120);
}

export function syncCombatMusic(inCombat,preferences={},userGesture=false){
  updateMusicPreferences(preferences);
  combatActive=!!inCombat;
  if(!combatActive)qaPlayback=false;
  if(!enabled||(!combatActive&&!qaPlayback)){stopMusic();return}
  start(true,userGesture);
}

export function playBattleTheme(preferences={},loop=true){
  updateMusicPreferences(preferences);
  if(!enabled)return false;
  qaPlayback=true;
  return start(loop,true);
}

export function stopMusic(){
  qaPlayback=false;
  combatActive=false;
  playRequestId++;
  cancelFade();
  if(!channel){trackId=null;return}
  if(channel.paused){trackId=null;channel.currentTime=0;return}
  const el=channel;
  fadeTo(0,220,()=>{el.pause();el.currentTime=0;trackId=null});
}

export function currentMusicTrack(){return trackId==='battle'?'Battle Theme':'None'}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&enabled&&(combatActive||qaPlayback)&&channel){
    // Reuse the single existing element after iOS suspends a background tab.
    const resumePromise=audioContext?.resume?.()||Promise.resolve();
    const playbackPromise=channel.paused?channel.play():Promise.resolve();
    Promise.all([playbackPromise,resumePromise]).then(()=>{if(enabled&&(combatActive||qaPlayback))fadeTo(volume,240)}).catch(()=>{});
  }
});
