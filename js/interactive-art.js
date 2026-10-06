import {dungeonEvents} from './data.js?v=floor4-release-prep-20261006a';
// Optional paired art for stable event/landmark IDs. CSS remains the reliable fallback.
export const INTERACTIVE_OBJECT_ART=Object.freeze({
  'landmark:warm-wall':{id:'landmark:warm-wall',contentId:'warm-wall',kind:'landmark',ink:null,colored:null,fallback:'css'},
  'landmark:giant-stone-face':{id:'landmark:giant-stone-face',contentId:'giant-stone-face',kind:'landmark',ink:null,colored:null,fallback:'css'},
  ...Object.fromEntries(Object.keys(dungeonEvents).map(id=>['event:'+id,{id:'event:'+id,contentId:id,kind:'event',ink:null,colored:null,fallback:'css'}]))
});
