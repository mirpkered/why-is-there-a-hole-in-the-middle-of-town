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
let activeContext = null;
let activeTrackId = null;
let qaPlayback = false;
let combatActive = false;
let playRequestId = 0;
let dungeonChannels = null;
let activeDungeonChannel = 0;
let dungeonQueue = [];
let lastDungeonTrackId = null;
let battlePass = 0;
let lastBattleTime = 0;

function getAudioContext(){
  if(audioContext)return audioContext;
  const Type=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(Type){try{audioContext=new Type()}catch{audioContext=null}}
  return audioContext;
}

function connectElement(element){
  const context=getAudioContext();
  if(!context)return null;
  try{
    const source=context.createMediaElementSource(element),gain=context.createGain();
    source.connect(gain);gain.connect(context.destination);
    return gain;
  }catch{return null}
}

function applyGain(element,gainNode,effectiveGain){
  const level=Math.max(0,Math.min(1,effectiveGain));
  element.muted=!enabled;
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
  battleLevel();
  return battleChannel;
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
  try{
    await playElement(channel);
    if(request!==playRequestId||!enabled||activeContext!=='battle'){pauseBattle();return false}
    return true;
  }catch{if(request===playRequestId){activeTrackId=null;channel.pause()}return false}
}

export function updateMusicPreferences(preferences={}){
  enabled=preferences.musicEnabled!==false;
  const next=Number(preferences.musicVolume);
  volume=Number.isFinite(next)?Math.max(0,Math.min(1,next)):volume;
  if(!enabled)stopMusic();
  else{
    if(battleChannel&&!battleChannel.paused)battleLevel();
    if(dungeonChannels&&activeContext==='dungeon')for(const channel of dungeonChannels)if(!channel.audio.paused)dungeonLevel(channel);
  }
}

export function syncMusicContext(context,preferences={},userGesture=false){
  updateMusicPreferences(preferences);
  if(!enabled){activeContext=null;return}
  const next=['dungeon','battle'].includes(context)?context:null;
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
    }
    return;
  }
  activeContext=next;playRequestId++;
  if(next==='battle'){
    qaPlayback=false;combatActive=true;
    if(dungeonChannels)for(const channel of dungeonChannels){channel.audio.pause();dungeonLevel(channel)}
    startBattle(true,userGesture);
  }else if(next==='dungeon'){
    combatActive=false;qaPlayback=false;pauseBattle();
    const channels=ensureDungeonChannels();if(!channels)return;
    const current=channels[activeDungeonChannel];
    if(current.track&&current.audio.currentTime>0.08&&current.audio.currentTime<current.audio.duration-0.08){
      dungeonLevel(current);current.audio.play().then(()=>{if(activeContext==='dungeon')activeTrackId=current.track.id}).catch(()=>{if(userGesture)startNextDungeonTrack()});
    }else if(userGesture)startNextDungeonTrack();
  }else{
    combatActive=false;qaPlayback=false;pauseBattle();stopDungeon();activeTrackId=null;
  }
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
  qaPlayback=false;combatActive=false;activeContext=null;playRequestId++;activeTrackId=null;
  pauseBattle();stopDungeon();
}

export function currentMusicTrack(){
  if(activeTrackId==='battle')return 'Battle Theme';
  const track=dungeonTracks.find(entry=>entry.id===activeTrackId);
  return track?`Dungeon · ${track.name}`:'None';
}

export function musicPlaybackDiagnostics(){
  const battleActive=activeTrackId==='battle'&&battleChannel&&!battleChannel.paused;
  const dungeonActive=dungeonChannels?.[activeDungeonChannel];
  const configuredGain=battleActive?trackGain.battle:trackGain.dungeon;
  const playing=!!battleActive||!!(dungeonActive&&!dungeonActive.audio.paused);
  const effectiveGain=volume*configuredGain;
  return {track:currentMusicTrack(),masterVolume:volume,configuredTrackGain:configuredGain,effectiveGain:enabled&&playing?effectiveGain:0,pass:battleActive?battlePass:null,playing};
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!enabled)return;
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
});
