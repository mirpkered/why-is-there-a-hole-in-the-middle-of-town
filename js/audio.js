const battleTheme = new URL('../assets/audio/music/battle-theme.mp3', import.meta.url).href;
const dungeonTracks = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(number => ({
  id: `recording-${number}`,
  name: `Recording ${number}`,
  src: new URL(`../assets/audio/music/dungeon/dungeon-${String(number).padStart(2,'0')}.mp3`, import.meta.url).href
}));
const transitionMs = 700;
let battleChannel = null;
let battleGainNode = null;
let audioContext = null;
let audioLevel = 0;
let enabled = true;
let volume = 0.28;
let activeContext = null;
let activeTrackId = null;
let qaPlayback = false;
let combatActive = false;
let fadeTimer = null;
let dungeonAdvanceTimer = null;
let dungeonFadeTimer = null;
let transitionId = 0;
let playRequestId = 0;
let dungeonChannels = null;
let activeDungeonChannel = 0;
let dungeonQueue = [];
let lastDungeonTrackId = null;

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

function ensureBattleChannel(){
  if(battleChannel)return battleChannel;
  if(typeof Audio==='undefined')return null;
  battleChannel=new Audio(battleTheme);battleChannel.preload='auto';battleChannel.loop=true;battleChannel.volume=0;
  battleGainNode=connectElement(battleChannel);
  if(battleGainNode){battleGainNode.gain.value=0;battleChannel.volume=1}
  battleChannel.addEventListener('ended',()=>{if(!battleChannel?.loop)activeTrackId=null});
  return battleChannel;
}

function ensureDungeonChannels(){
  if(dungeonChannels)return dungeonChannels;
  if(typeof Audio==='undefined')return null;
  dungeonChannels=[0,1].map(()=>{
    const audio=new Audio();audio.preload='none';audio.loop=false;audio.volume=0;
    const gain=connectElement(audio);if(gain){gain.gain.value=0;audio.volume=1}
    audio.addEventListener('ended',()=>{
      const channel=dungeonChannels?.findIndex(entry=>entry.audio===audio);
      if(channel===activeDungeonChannel&&activeContext==='dungeon')startNextDungeonTrack();
    });
    return {audio,gain,level:0,track:null};
  });
  return dungeonChannels;
}

function setBattleLevel(value){
  audioLevel=Math.max(0,Math.min(1,value));
  if(battleGainNode)battleGainNode.gain.value=audioLevel;
  else if(battleChannel)battleChannel.volume=audioLevel;
}

function setDungeonLevel(channel,value){
  if(!channel)return;
  channel.level=Math.max(0,Math.min(1,value));
  if(channel.gain)channel.gain.gain.value=channel.level;
  else channel.audio.volume=channel.level;
}

function fadeBattleTo(target,duration=220,finish){
  if(!battleChannel){finish?.();return}
  if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
  const id=++transitionId,start=audioLevel,started=performance.now();
  fadeTimer=setInterval(()=>{
    if(id!==transitionId||!battleChannel){clearInterval(fadeTimer);fadeTimer=null;return}
    const progress=Math.min(1,(performance.now()-started)/duration);
    setBattleLevel(start+(target-start)*progress);
    if(progress===1){clearInterval(fadeTimer);fadeTimer=null;finish?.()}
  },32);
}

function stopBattle(reset=true){
  if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
  if(!battleChannel){audioLevel=0;return}
  const channel=battleChannel;
  if(channel.paused){setBattleLevel(0);if(reset)channel.currentTime=0;return}
  fadeBattleTo(0,220,()=>{channel.pause();if(reset)channel.currentTime=0});
}

function clearDungeonTimers(){
  if(dungeonAdvanceTimer){clearTimeout(dungeonAdvanceTimer);dungeonAdvanceTimer=null}
  if(dungeonFadeTimer){clearInterval(dungeonFadeTimer);dungeonFadeTimer=null}
}

function shuffleTracks(){
  dungeonQueue=dungeonTracks.slice();
  for(let i=dungeonQueue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[dungeonQueue[i],dungeonQueue[j]]=[dungeonQueue[j],dungeonQueue[i]]}
  if(dungeonQueue.length>1&&dungeonQueue[dungeonQueue.length-1].id===lastDungeonTrackId){
    [dungeonQueue[0],dungeonQueue[dungeonQueue.length-1]]=[dungeonQueue[dungeonQueue.length-1],dungeonQueue[0]];
  }
}

function takeNextTrack(){
  if(!dungeonQueue.length)shuffleTracks();
  return dungeonQueue.pop();
}

function prepareDungeonChannel(channel,track){
  if(!channel||!track)return;
  channel.track=track;channel.audio.src=track.src;channel.audio.preload='auto';channel.audio.load();
}

function rampDungeonChannels(outgoing,incoming,duration,finish){
  if(dungeonFadeTimer)clearInterval(dungeonFadeTimer);
  const outStart=outgoing?.level||0,inStart=incoming?.level||0,started=performance.now();
  dungeonFadeTimer=setInterval(()=>{
    const progress=Math.min(1,(performance.now()-started)/duration);
    setDungeonLevel(outgoing,outStart*(1-progress));
    setDungeonLevel(incoming,inStart+(volume-inStart)*progress);
    if(progress>=1){clearInterval(dungeonFadeTimer);dungeonFadeTimer=null;if(outgoing){outgoing.audio.pause();setDungeonLevel(outgoing,0)}finish?.()}
  },32);
}

function scheduleDungeonTransition(channel){
  if(dungeonAdvanceTimer){clearTimeout(dungeonAdvanceTimer);dungeonAdvanceTimer=null}
  const duration=channel?.audio.duration;
  if(!Number.isFinite(duration)||duration<=0)return;
  const remaining=Math.max(50,(duration-channel.audio.currentTime-transitionMs/1000)*1000);
  dungeonAdvanceTimer=setTimeout(()=>startNextDungeonTrack(),remaining);
}

async function startDungeonTrack(track,channel,fadeIn=true){
  if(!channel||!track||!enabled)return false;
  const request=playRequestId;
  prepareDungeonChannel(channel,track);
  setDungeonLevel(channel,fadeIn?0:volume);
  try{
    const promises=[channel.audio.play()];
    const context=getAudioContext();if(context?.state==='suspended')promises.push(context.resume());
    await Promise.all(promises);
    if(request!==playRequestId||!enabled||activeContext!=='dungeon'){channel.audio.pause();setDungeonLevel(channel,0);return false}
    lastDungeonTrackId=track.id;activeTrackId=track.id;
    if(fadeIn)rampDungeonChannels(null,channel,450);
    scheduleDungeonTransition(channel);
    // Only the current and next clips are prepared, keeping mobile memory use low.
    const next=takeNextTrack(),other=dungeonChannels[1-activeDungeonChannel];
    prepareDungeonChannel(other,next);
    return true;
  }catch{return false}
}

async function startNextDungeonTrack(){
  if(!enabled||activeContext!=='dungeon')return;
  clearDungeonTimers();
  const channels=ensureDungeonChannels();if(!channels)return;
  const outgoing=channels[activeDungeonChannel],nextIndex=1-activeDungeonChannel,incoming=channels[nextIndex];
  const track=incoming.track||takeNextTrack();
  const request=playRequestId;
  if(!incoming.track)prepareDungeonChannel(incoming,track);
  setDungeonLevel(incoming,0);
  try{
    const promises=[incoming.audio.play()];const context=getAudioContext();if(context?.state==='suspended')promises.push(context.resume());
    await Promise.all(promises);
    if(request!==playRequestId||!enabled||activeContext!=='dungeon'){incoming.audio.pause();return}
    activeDungeonChannel=nextIndex;lastDungeonTrackId=track.id;activeTrackId=track.id;
    rampDungeonChannels(outgoing,incoming,transitionMs,()=>prepareDungeonChannel(outgoing,takeNextTrack()));
    scheduleDungeonTransition(incoming);
  }catch{
    // If a clip could not be started, try the next shuffled clip after a brief gap.
    dungeonAdvanceTimer=setTimeout(()=>startNextDungeonTrack(),300);
  }
}

function pauseDungeonForBattle(){
  clearDungeonTimers();
  if(!dungeonChannels)return;
  if(dungeonFadeTimer)clearInterval(dungeonFadeTimer);
  const running=dungeonChannels.filter(channel=>!channel.audio.paused),levels=dungeonChannels.map(channel=>channel.level),started=performance.now();
  if(!running.length){for(const channel of dungeonChannels)setDungeonLevel(channel,0);return}
  dungeonFadeTimer=setInterval(()=>{
    const progress=Math.min(1,(performance.now()-started)/220);
    dungeonChannels.forEach((channel,index)=>setDungeonLevel(channel,levels[index]*(1-progress)));
    if(progress>=1){clearInterval(dungeonFadeTimer);dungeonFadeTimer=null;for(const channel of running){channel.audio.pause();setDungeonLevel(channel,0)}}
  },32);
}

function stopDungeon(reset=true){
  clearDungeonTimers();
  if(!dungeonChannels)return;
  if(dungeonFadeTimer)clearInterval(dungeonFadeTimer);
  const levels=dungeonChannels.map(channel=>channel.level),started=performance.now();
  if(dungeonChannels.every(channel=>channel.audio.paused)){
    for(const channel of dungeonChannels){setDungeonLevel(channel,0);if(reset)channel.audio.currentTime=0}
    activeTrackId=null;return;
  }
  dungeonFadeTimer=setInterval(()=>{
    const progress=Math.min(1,(performance.now()-started)/220);
    dungeonChannels.forEach((channel,index)=>setDungeonLevel(channel,levels[index]*(1-progress)));
    if(progress>=1){clearInterval(dungeonFadeTimer);dungeonFadeTimer=null;for(const channel of dungeonChannels){channel.audio.pause();if(reset)channel.audio.currentTime=0;setDungeonLevel(channel,0)}activeTrackId=null}
  },32);
}

async function startBattle(loop=true,userGesture=false){
  const channel=ensureBattleChannel();if(!channel||!enabled)return false;
  channel.loop=loop;
  if(activeTrackId==='battle'&&!channel.paused){const context=getAudioContext();if(context?.state==='suspended')context.resume().catch(()=>{});fadeBattleTo(volume,140);return true}
  if(!userGesture)return false;
  const request=++playRequestId;activeTrackId='battle';setBattleLevel(0);
  try{
    const promises=[channel.play()];const context=getAudioContext();if(context?.state==='suspended')promises.push(context.resume());await Promise.all(promises);
    if(request!==playRequestId||!enabled||activeContext!=='battle'){stopBattle();return false}
    fadeBattleTo(volume,500);return true;
  }catch{if(request===playRequestId){activeTrackId=null;channel.pause()}return false}
}

export function updateMusicPreferences(preferences={}){
  enabled=preferences.musicEnabled!==false;
  const next=Number(preferences.musicVolume),nextVolume=Number.isFinite(next)?Math.max(0,Math.min(1,next)):volume,volumeChanged=nextVolume!==volume;volume=nextVolume;
  if(!enabled)stopMusic();
  else if(volumeChanged&&battleChannel&&!battleChannel.paused&&activeTrackId==='battle')fadeBattleTo(volume,120);
  else if(volumeChanged&&dungeonChannels&&activeContext==='dungeon')for(const channel of dungeonChannels)if(!channel.audio.paused)setDungeonLevel(channel,volume);
}

export function syncMusicContext(context,preferences={},userGesture=false){
  updateMusicPreferences(preferences);
  if(!enabled){activeContext=null;return}
  const next=['dungeon','battle'].includes(context)?context:null;
  if(next===activeContext){
    if(next==='battle'){combatActive=true;if(!battleChannel||battleChannel.paused)startBattle(true,userGesture)}
    else if(next==='dungeon'){
      combatActive=false;
      if(battleChannel&&!battleChannel.paused)stopBattle();
      const channels=ensureDungeonChannels();
      if(channels&&channels[activeDungeonChannel].audio.paused){
        const current=channels[activeDungeonChannel];
        if(current.track&&current.audio.currentTime>0.08&&current.audio.currentTime<current.audio.duration-0.08){
          const request=playRequestId;current.audio.play().then(()=>{if(request===playRequestId&&activeContext==='dungeon'){activeTrackId=current.track.id;rampDungeonChannels(null,current,240);scheduleDungeonTransition(current)}}).catch(()=>{});
        }else if(userGesture)startNextDungeonTrack();
      }
    }
    return;
  }
  activeContext=next;playRequestId++;clearDungeonTimers();
  if(next==='battle'){
    qaPlayback=false;combatActive=true;pauseDungeonForBattle();startBattle(true,userGesture);
  }else if(next==='dungeon'){
    combatActive=false;qaPlayback=false;stopBattle();
    const channels=ensureDungeonChannels();if(!channels)return;
    const current=channels[activeDungeonChannel];
    if(current.track&&current.audio.currentTime>0.08&&current.audio.currentTime<current.audio.duration-0.08){
      current.audio.play().then(()=>{if(activeContext==='dungeon'){activeTrackId=current.track.id;rampDungeonChannels(null,current,360);scheduleDungeonTransition(current)}}).catch(()=>{if(userGesture)startNextDungeonTrack()});
    }else if(userGesture)startNextDungeonTrack();
  }else{
    combatActive=false;qaPlayback=false;stopBattle();stopDungeon();activeTrackId=null;
  }
}

export function playBattleTheme(preferences={},loop=true){
  updateMusicPreferences(preferences);if(!enabled)return false;
  qaPlayback=true;combatActive=false;activeContext='battle';pauseDungeonForBattle();return startBattle(loop,true);
}

export function playDungeonPool(preferences={}){
  updateMusicPreferences(preferences);if(!enabled)return false;
  qaPlayback=true;combatActive=false;activeContext='dungeon';stopBattle();
  const channels=ensureDungeonChannels();if(!channels)return false;
  if(dungeonChannels.some(channel=>!channel.audio.paused))return true;
  activeDungeonChannel=0;dungeonQueue=[];return startDungeonTrack(takeNextTrack(),channels[0],true);
}

export function stopMusic(){
  qaPlayback=false;combatActive=false;activeContext=null;playRequestId++;activeTrackId=null;
  stopBattle();stopDungeon();
}

export function currentMusicTrack(){
  if(activeTrackId==='battle')return 'Battle Theme';
  const track=dungeonTracks.find(entry=>entry.id===activeTrackId);
  return track?`Dungeon · ${track.name}`:'None';
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!enabled)return;
  const context=getAudioContext();if(context?.state==='suspended')context.resume().catch(()=>{});
  if(activeContext==='battle'&&battleChannel?.paused&&(combatActive||qaPlayback))battleChannel.play().then(()=>fadeBattleTo(volume,240)).catch(()=>{});
  if(activeContext==='dungeon'&&dungeonChannels){const channel=dungeonChannels[activeDungeonChannel];if(channel.audio.paused&&channel.track&&(combatActive===false||qaPlayback)){channel.audio.play().then(()=>{if(activeContext==='dungeon'){setDungeonLevel(channel,volume);scheduleDungeonTransition(channel)}}).catch(()=>{})}}
});
