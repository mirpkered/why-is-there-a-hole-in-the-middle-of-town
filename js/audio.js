import {LOCATION_MUSIC_POOLS,LOCATION_MUSIC_CONTEXTS,chooseLocationTrack} from './location-music.js?v=location-music-20261004a';
import {configureAmbientAudioSession,audioSessionDiagnostics} from './audio-session.js?v=ambient-audio-20261005a';
const battleTheme = new URL('../assets/audio/music/battle-theme.mp3', import.meta.url).href;
const dungeonTracks = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(number => ({
  id: `recording-${number}`,
  name: `Recording ${number}`,
  src: new URL(`../assets/audio/music/dungeon/dungeon-${String(number).padStart(2,'0')}.mp3`, import.meta.url).href
}));
const trackGain = { battle: 1, dungeon: 1 };
let battleChannel = null;
let battleGainNode = null;
let audioContext = null;
let enabled = true;
let volume = 0.28;
let sfxEnabled = true;
let sfxVolume = 0.8;
const sfxChannels = new Map();
let activeContext = null;
let activeTrackId = null;
let qaPlayback = false;
let combatActive = false;
let playRequestId = 0;
let dungeonChannels = null;
let locationChannel = null;
let locationGainNode = null;
let locationTrack = null;
let locationAttempted = false;
const lastLocationTrackByPool = new Map();
let activeDungeonChannel = 0;
let dungeonQueue = [];
let lastDungeonTrackId = null;
let battlePass = 0;
let lastBattleTime = 0;
let battlePreparedAt = null;
let battleStartRequestedAt = null;
let battleStartLatencyMs = null;
let battleAudioError = null;
let outputPath = 'not initialized';

// Declare this before creating media elements or the Web Audio graph. iOS may
// otherwise treat HTML media as primary playback and let it ignore Ring/Silent.
configureAmbientAudioSession();

function getAudioContext(){
  if(audioContext)return audioContext;
  const Type=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(Type){try{audioContext=new Type()}catch{audioContext=null}}
  return audioContext;
}

function connectElement(element){
  const context=getAudioContext();
  if(!context){outputPath='HTMLAudioElement volume fallback';return null}
  try{
    const source=context.createMediaElementSource(element),gain=context.createGain();
    source.connect(gain);gain.connect(context.destination);
    outputPath='HTMLAudioElement → MediaElementAudioSourceNode → GainNode → AudioContext.destination';
    return gain;
  }catch{outputPath='HTMLAudioElement volume fallback';return null}
}

function applyGain(element,gainNode,effectiveGain,channelEnabled=enabled){
  const level=Math.max(0,Math.min(1,effectiveGain));
  element.muted=!channelEnabled;
  element.playbackRate=1;
  if(gainNode){
    const param=gainNode.gain,now=audioContext?.currentTime||0;
    param.cancelScheduledValues(now);
    param.setValueAtTime(level,now);
    element.volume=1;
  }else element.volume=level;
  return level;
}

function battleLevel(){return applyGain(battleChannel,battleGainNode,volume*trackGain.battle)}

function ensureBattleChannel(){
  if(battleChannel)return battleChannel;
  if(typeof Audio==='undefined')return null;
  battleChannel=new Audio(battleTheme);battleChannel.preload='auto';battleChannel.loop=true;
  battleGainNode=connectElement(battleChannel);
  battleChannel.addEventListener('timeupdate',()=>{
    const current=battleChannel?.currentTime||0;
    if(current+1<lastBattleTime)battlePass++;
    lastBattleTime=current;
  });
  battleChannel.addEventListener('ended',()=>{if(!battleChannel?.loop)activeTrackId=null});
  battleChannel.addEventListener('playing',()=>{if(battleStartRequestedAt!==null){battleStartLatencyMs=Math.round(performance.now()-battleStartRequestedAt);battleStartRequestedAt=null}});
  battleChannel.addEventListener('error',()=>{battleAudioError=battleChannel.error?.message||`audio error ${battleChannel.error?.code||'unknown'}`});
  battleLevel();
  return battleChannel;
}

export function prepareBattleAudio(){
  configureAmbientAudioSession();
  if(typeof Audio==='undefined')return {available:false,ready:false,state:'unsupported'};
  const channel=ensureBattleChannel();if(!channel)return {available:false,ready:false,state:'unavailable'};
  if(channel.preload!=='auto')channel.preload='auto';
  if(channel.readyState===0){try{channel.load();battlePreparedAt=performance.now()}catch(error){console.warn('Battle music preload failed',error)}}
  const context=getAudioContext();
  if(context?.state==='suspended')context.resume().catch(()=>{});
  return {available:true,ready:channel.readyState>=2,state:channel.readyState,context:context?.state||'media-element'};
}

function ensureDungeonChannels(){
  if(dungeonChannels)return dungeonChannels;
  if(typeof Audio==='undefined')return null;
  dungeonChannels=[0,1].map(()=>{
    const audio=new Audio();audio.preload='none';audio.loop=false;
    const gain=connectElement(audio),entry={audio,gain,track:null};
    audio.addEventListener('ended',()=>{
      const index=dungeonChannels?.findIndex(channel=>channel===entry);
      if(index===activeDungeonChannel&&activeContext==='dungeon')startNextDungeonTrack();
    });
    return entry;
  });
  return dungeonChannels;
}

function ensureLocationChannel(){
  if(locationChannel)return locationChannel;
  if(typeof Audio==='undefined')return null;
  locationChannel=new Audio();locationChannel.preload='none';locationChannel.loop=false;
  locationGainNode=connectElement(locationChannel);
  locationChannel.addEventListener('ended',()=>{if(locationTrack&&activeContext===locationTrack.pool){activeTrackId=null}});
  locationChannel.addEventListener('error',()=>{if(locationTrack&&activeContext===locationTrack.pool){console.warn(`Location music failed to load: ${locationTrack.id}`,locationChannel.error||'audio error')}});
  return locationChannel;
}

function locationLevel(){
  if(!locationChannel||!locationTrack)return 0;
  return applyGain(locationChannel,locationGainNode,volume*locationTrack.gain);
}

function stopLocation(clearTrack=true){
  if(locationChannel){locationChannel.pause();try{locationChannel.currentTime=0}catch{}locationLevel()}
  activeTrackId=null;
  if(clearTrack)locationTrack=null;
}

async function startLocationTrack(context,track=null,allowFallback=true){
  if(!enabled||!LOCATION_MUSIC_CONTEXTS.includes(context))return false;
  locationAttempted=true;
  const chosen=track||chooseLocationTrack(context,lastLocationTrackByPool.get(context));
  if(!chosen)return false;
  const channel=ensureLocationChannel();
  if(!channel)return false;
  const request=playRequestId;
  locationTrack=chosen;channel.loop=false;channel.src=new URL(chosen.src,document.baseURI).href;channel.preload=chosen.preloadPriority==='low'?'metadata':'auto';
  locationLevel();channel.load();locationLevel();
  try{
    await playElement(channel);
    if(request!==playRequestId||!enabled||activeContext!==context||locationTrack?.id!==chosen.id){channel.pause();return false}
    activeTrackId=chosen.id;lastLocationTrackByPool.set(context,chosen.id);return true;
  }catch(error){channel.pause();activeTrackId=null;console.warn(`Location music could not start (${chosen.id}); the service remains available.`,error);if(allowFallback){const alternative=chooseLocationTrack(context,chosen.id);if(alternative&&alternative.id!==chosen.id)return startLocationTrack(context,alternative,false)}return false}
}

function dungeonLevel(channel){
  if(!channel)return 0;
  const level=applyGain(channel.audio,channel.gain,volume*trackGain.dungeon);
  return level;
}

function pauseBattle(reset=true){
  if(!battleChannel)return;
  battleChannel.pause();
  if(reset){try{battleChannel.currentTime=0}catch{}}
  battleLevel();
  lastBattleTime=0;
}

function stopDungeon(reset=true){
  if(!dungeonChannels)return;
  for(const channel of dungeonChannels){
    channel.audio.pause();
    if(reset){try{channel.audio.currentTime=0}catch{}}
    dungeonLevel(channel);
  }
  if(reset)activeTrackId=null;
}

function shuffleTracks(){
  dungeonQueue=dungeonTracks.slice();
  for(let i=dungeonQueue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[dungeonQueue[i],dungeonQueue[j]]=[dungeonQueue[j],dungeonQueue[i]]}
  if(dungeonQueue.length>1&&dungeonQueue[dungeonQueue.length-1].id===lastDungeonTrackId){
    [dungeonQueue[0],dungeonQueue[dungeonQueue.length-1]]=[dungeonQueue[dungeonQueue.length-1],dungeonQueue[0]];
  }
}

function takeNextTrack(){if(!dungeonQueue.length)shuffleTracks();return dungeonQueue.pop()}

function prepareDungeonChannel(channel,track){
  if(!channel||!track)return;
  channel.track=track;channel.audio.src=track.src;channel.audio.preload='auto';channel.audio.load();dungeonLevel(channel);
}

async function playElement(element){
  configureAmbientAudioSession();
  const promises=[element.play()],context=getAudioContext();
  if(context?.state==='suspended')promises.push(context.resume());
  await Promise.all(promises);
}

async function startDungeonTrack(track,channel){
  if(!channel||!track||!enabled)return false;
  const request=playRequestId;
  prepareDungeonChannel(channel,track);
  dungeonLevel(channel);
  try{
    await playElement(channel.audio);
    if(request!==playRequestId||!enabled||activeContext!=='dungeon'){channel.audio.pause();return false}
    activeDungeonChannel=dungeonChannels.indexOf(channel);
    lastDungeonTrackId=track.id;activeTrackId=track.id;
    const other=dungeonChannels[1-activeDungeonChannel];
    prepareDungeonChannel(other,takeNextTrack());
    return true;
  }catch{return false}
}

async function startNextDungeonTrack(){
  if(!enabled||activeContext!=='dungeon')return;
  const channels=ensureDungeonChannels();if(!channels)return;
  const nextIndex=1-activeDungeonChannel,incoming=channels[nextIndex];
  const outgoing=channels[activeDungeonChannel];
  const track=incoming.track||takeNextTrack();
  if(!incoming.track)prepareDungeonChannel(incoming,track);
  dungeonLevel(incoming);
  try{
    await playElement(incoming.audio);
    if(!enabled||activeContext!=='dungeon'){incoming.audio.pause();return}
    outgoing.audio.pause();
    activeDungeonChannel=nextIndex;lastDungeonTrackId=track.id;activeTrackId=track.id;
    prepareDungeonChannel(outgoing,takeNextTrack());
  }catch{
    window.setTimeout(()=>startNextDungeonTrack(),300);
  }
}

async function startBattle(loop=true,userGesture=false){
  const channel=ensureBattleChannel();if(!channel||!enabled)return false;
  channel.loop=loop;
  if(activeTrackId==='battle'&&!channel.paused){const context=getAudioContext();if(context?.state==='suspended')context.resume().catch(()=>{});battleLevel();return true}
  if(!userGesture)return false;
  const request=++playRequestId;
  activeTrackId='battle';battlePass=1;lastBattleTime=channel.currentTime||0;battleLevel();
  battleStartRequestedAt=performance.now();battleStartLatencyMs=null;
  try{
    await playElement(channel);
    if(battleStartRequestedAt!==null){battleStartLatencyMs=Math.round(performance.now()-battleStartRequestedAt);battleStartRequestedAt=null}
    if(request!==playRequestId||!enabled||activeContext!=='battle'){pauseBattle();return false}
    return true;
  }catch(error){battleAudioError=error?.message||'playback unavailable';if(typeof console!=='undefined')console.warn('Battle music could not start; combat continues',error);if(request===playRequestId){activeTrackId=null;channel.pause()}return false}
}

export function updateMusicPreferences(preferences={}){
  enabled=preferences.musicEnabled!==false;
  const next=Number(preferences.musicVolume);
  volume=Number.isFinite(next)?Math.max(0,Math.min(1,next)):volume;
  sfxEnabled=preferences.sfxEnabled!==false;
  const nextSfx=Number(preferences.sfxVolume);
  sfxVolume=Number.isFinite(nextSfx)?Math.max(0,Math.min(1,nextSfx)):sfxVolume;
  if(!enabled){const context=activeContext,track=locationTrack,attempted=locationAttempted;stopMusic();activeContext=context;locationTrack=track;locationAttempted=attempted}
  else{
    if(battleChannel&&!battleChannel.paused)battleLevel();
    if(dungeonChannels&&activeContext==='dungeon')for(const channel of dungeonChannels)if(!channel.audio.paused)dungeonLevel(channel);
    if(locationChannel&&!locationChannel.paused)locationLevel();
  }
}

export function syncMusicContext(context,preferences={},userGesture=false){
  updateMusicPreferences(preferences);
  const next=['dungeon','battle'].includes(context)||LOCATION_MUSIC_CONTEXTS.includes(context)?context:null;
  if(!enabled){if(next!==activeContext){playRequestId++;pauseBattle();stopDungeon();stopLocation();activeContext=next;locationAttempted=LOCATION_MUSIC_CONTEXTS.includes(next)}return}
  if(next===activeContext){
    if(next==='battle'){combatActive=true;if(!battleChannel||battleChannel.paused)startBattle(true,userGesture)}
    else if(next==='dungeon'){
      combatActive=false;
      if(battleChannel&&!battleChannel.paused)pauseBattle();
      const channels=ensureDungeonChannels();
      if(channels&&channels[activeDungeonChannel].audio.paused){
        const current=channels[activeDungeonChannel];
        if(current.track&&current.audio.currentTime>0.08&&current.audio.currentTime<current.audio.duration-0.08){
          dungeonLevel(current);current.audio.play().then(()=>{if(activeContext==='dungeon')activeTrackId=current.track.id}).catch(()=>{});
        }else if(userGesture)startNextDungeonTrack();
      }
    }else if(LOCATION_MUSIC_CONTEXTS.includes(next)&&!locationAttempted&&userGesture)startLocationTrack(next);
    return;
  }
  activeContext=next;playRequestId++;
  if(next==='battle'){
    qaPlayback=false;combatActive=true;
    if(dungeonChannels)for(const channel of dungeonChannels){channel.audio.pause();dungeonLevel(channel)}
    stopLocation();
    startBattle(true,userGesture);
  }else if(next==='dungeon'){
    combatActive=false;qaPlayback=false;pauseBattle();stopLocation();
    const channels=ensureDungeonChannels();if(!channels)return;
    const current=channels[activeDungeonChannel];
    if(current.track&&current.audio.currentTime>0.08&&current.audio.currentTime<current.audio.duration-0.08){
      dungeonLevel(current);current.audio.play().then(()=>{if(activeContext==='dungeon')activeTrackId=current.track.id}).catch(()=>{if(userGesture)startNextDungeonTrack()});
    }else if(userGesture)startNextDungeonTrack();
  }else if(LOCATION_MUSIC_CONTEXTS.includes(next)){
    combatActive=false;qaPlayback=false;pauseBattle();stopDungeon();stopLocation();locationAttempted=false;
    if(userGesture)startLocationTrack(next);
  }else{
    combatActive=false;qaPlayback=false;pauseBattle();stopDungeon();stopLocation();activeTrackId=null;locationAttempted=false;
  }
}

export function playLocationTrack(trackId,preferences={}){
  updateMusicPreferences(preferences);if(!enabled)return false;
  for(const pool of LOCATION_MUSIC_CONTEXTS){const track=LOCATION_MUSIC_POOLS[pool].find(entry=>entry.id===trackId&&entry.enabled!==false);if(!track)continue;
    playRequestId++;qaPlayback=true;combatActive=false;activeContext=pool;pauseBattle();stopDungeon();stopLocation();locationAttempted=false;return startLocationTrack(pool,track,false);
  }
  return false;
}

export function playBattleTheme(preferences={},loop=true){
  updateMusicPreferences(preferences);if(!enabled)return false;
  qaPlayback=true;combatActive=false;activeContext='battle';
  if(dungeonChannels)for(const channel of dungeonChannels){channel.audio.pause();dungeonLevel(channel)}
  return startBattle(loop,true);
}

export function playDungeonPool(preferences={}){
  updateMusicPreferences(preferences);if(!enabled)return false;
  qaPlayback=true;combatActive=false;activeContext='dungeon';pauseBattle();
  const channels=ensureDungeonChannels();if(!channels)return false;
  if(dungeonChannels.some(channel=>!channel.audio.paused))return true;
  activeDungeonChannel=0;dungeonQueue=[];return startDungeonTrack(takeNextTrack(),channels[0]);
}

export function stopMusic(){
  qaPlayback=false;combatActive=false;activeContext=null;playRequestId++;activeTrackId=null;locationAttempted=false;
  pauseBattle();stopDungeon();stopLocation();
}

export function currentMusicTrack(){
  if(activeTrackId==='battle')return 'Battle Theme';
  const track=dungeonTracks.find(entry=>entry.id===activeTrackId);
  if(track)return `Dungeon · ${track.name}`;
  if(locationTrack)return `${locationTrack.pool} · ${locationTrack.name||locationTrack.id}`;
  return 'None';
}

export function musicPlaybackDiagnostics(){
  const battleActive=activeTrackId==='battle'&&battleChannel&&!battleChannel.paused;
  const dungeonActive=dungeonChannels?.[activeDungeonChannel];
  const locationActive=!!(locationChannel&&!locationChannel.paused&&locationTrack);
  const configuredGain=battleActive?trackGain.battle:locationTrack?.gain??trackGain.dungeon;
  const playing=!!battleActive||!!(dungeonActive&&!dungeonActive.audio.paused)||locationActive;
  const effectiveGain=volume*configuredGain;
  return {implementationPath:outputPath,audioSession:audioSessionDiagnostics(),audioContextState:audioContext?.state||'not created',track:currentMusicTrack(),context:activeContext,pool:locationTrack?.pool||null,selectedLocationTrack:locationTrack?.id||null,previousLocationTrack:locationTrack?lastLocationTrackByPool.get(locationTrack.pool)||null:null,loop:locationTrack?!!locationChannel?.loop:battleActive?!!battleChannel?.loop:!!dungeonActive?.audio.loop,locationAttempted,musicEnabled:enabled,masterVolume:volume,configuredTrackGain:configuredGain,effectiveGain:enabled&&playing?effectiveGain:0,playing,playbackState:locationTrack?(locationActive?'playing':locationChannel?.ended?'ended':'stopped'):playing?'playing':'idle',pass:battleActive?battlePass:null,battleAudioReadyState:battleChannel?.readyState??0,battleAudioPrepared:!!battlePreparedAt,battleStartLatencyMs,battleAudioError,sfx:{available:sfxChannels.size>0,enabled:sfxEnabled,volume:sfxVolume,registeredChannels:sfxChannels.size}};
}

/** Shared one-shot output hook for future effects; no SFX are currently registered. */
export function playSoundEffect(src,gain=1){
  if(!sfxEnabled||sfxVolume<=0||typeof Audio==='undefined'||!src)return false;
  configureAmbientAudioSession();
  let channel=sfxChannels.get(src);
  if(!channel){
    const element=new Audio(src);element.preload='auto';element.loop=false;
    channel={element,gainNode:connectElement(element)};sfxChannels.set(src,channel);
    element.addEventListener('error',()=>console.warn(`Sound effect failed to load: ${src}`,element.error||'audio error'));
  }
  if(!channel.element.paused)return false;
  channel.element.currentTime=0;
  applyGain(channel.element,channel.gainNode,sfxVolume*Math.max(0,Math.min(1,Number(gain)||0)),sfxEnabled);
  playElement(channel.element).catch(error=>console.warn(`Sound effect could not start: ${src}`,error));
  return true;
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!enabled)return;
  configureAmbientAudioSession();
  const context=getAudioContext();if(context?.state==='suspended')context.resume().catch(()=>{});
  if(activeContext==='battle'&&battleChannel?.paused&&(combatActive||qaPlayback)){
    battleLevel();battleChannel.play().catch(()=>{});
  }
  if(activeContext==='dungeon'&&dungeonChannels){
    const channel=dungeonChannels[activeDungeonChannel];
    if(channel.audio.paused&&channel.track&&(combatActive===false||qaPlayback)){
      dungeonLevel(channel);channel.audio.play().catch(()=>{});
    }
  }
  if(LOCATION_MUSIC_CONTEXTS.includes(activeContext)&&locationTrack&&locationChannel?.paused&&locationChannel.currentTime>0.08&&locationChannel.currentTime<(locationChannel.duration-0.08)){
    locationLevel();locationChannel.play().then(()=>{if(activeContext===locationTrack.pool)activeTrackId=locationTrack.id}).catch(error=>console.warn(`Location music could not resume (${locationTrack.id}).`,error));
  }
});
