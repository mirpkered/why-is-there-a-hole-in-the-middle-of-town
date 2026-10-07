export const NORMAL_SPLASH_TIMING=Object.freeze({holdingMs:750,fadeToBlackMs:1950,blackHoldMs:2800,revealOverlayMs:3000,revealAppMs:3150,completeMs:3750,failOpenMs:4550});
export const REDUCED_MOTION_SPLASH_TIMING=Object.freeze({holdingMs:100,fadeToBlackMs:150,blackHoldMs:270,revealOverlayMs:320,revealAppMs:340,completeMs:440,failOpenMs:640});

export function initializeLaunchSplash(documentRef=document,windowRef=window){
  const splash=documentRef.querySelector('.launch-splash');
  if(!splash||splash.dataset.launchInitialized==='true')return undefined;
  const app=documentRef.querySelector('#app'),root=documentRef.documentElement,body=documentRef.body;
  const removePending=()=>{app?.removeAttribute('data-launch-pending');app?.removeAttribute('data-launch-revealing');body.removeAttribute('data-launch-pending');root.removeAttribute('data-launch-pending')};
  const timers=[];
  const complete=()=>{
    if(!splash.isConnected)return;
    splash.remove();removePending();
    for(const timer of timers)try{windowRef.clearTimeout?.(timer)}catch{}
  };
  try{
    splash.dataset.launchInitialized='true';
    splash.dataset.launchPhase='entering';
    root.setAttribute('data-launch-pending','');body.setAttribute('data-launch-pending','');app?.setAttribute('data-launch-pending','');
    const logo=splash.querySelector('.launch-splash-logo');
    if(logo){logo.classList.add('is-entering');logo.addEventListener('error',complete,{once:true})}
    let reducedMotion=false;
    try{reducedMotion=windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}catch{}
    try{const preference=JSON.parse(windowRef.localStorage?.getItem('mirpworks-accessibility-preferences')||'null');reducedMotion=reducedMotion||preference?.reducedMotion===true}catch{}
    const timing=reducedMotion?REDUCED_MOTION_SPLASH_TIMING:NORMAL_SPLASH_TIMING;
    if(reducedMotion)splash.dataset.reducedMotion='true';
    windowRef.__mirpworksSplashFailOpen=complete;
    const schedule=(callback,delay)=>timers.push(windowRef.setTimeout(callback,delay));
    schedule(()=>{if(splash.isConnected)splash.dataset.launchPhase='holding'},timing.holdingMs);
    schedule(()=>{if(splash.isConnected){splash.classList.add('is-fading-to-black');splash.dataset.launchPhase='fading-to-black'}},timing.fadeToBlackMs);
    schedule(()=>{if(splash.isConnected){splash.classList.add('is-black');splash.dataset.launchPhase='black-hold'}},timing.blackHoldMs);
    schedule(()=>{if(splash.isConnected){splash.classList.add('is-revealing-app');splash.dataset.launchPhase='revealing-app'}},timing.revealOverlayMs);
    schedule(()=>{if(splash.isConnected){app?.removeAttribute('data-launch-pending');app?.setAttribute('data-launch-revealing','');body.removeAttribute('data-launch-pending');root.removeAttribute('data-launch-pending')}},timing.revealAppMs);
    schedule(complete,timing.completeMs);
    schedule(complete,timing.failOpenMs);
    return splash;
  }catch{
    complete();
    return undefined;
  }
}
