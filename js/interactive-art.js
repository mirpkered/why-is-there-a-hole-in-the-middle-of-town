import {dungeonEvents} from './data.js?v=floor4-release-prep-20261006a';
// Optional paired art for stable event/landmark IDs. CSS remains the reliable fallback.
export const INTERACTIVE_OBJECT_ART=Object.freeze({
  'landmark:warm-wall':{id:'landmark:warm-wall',contentId:'warm-wall',kind:'landmark',ink:null,colored:null,fallback:'css'},
  'landmark:giant-stone-face':{id:'landmark:giant-stone-face',contentId:'giant-stone-face',kind:'landmark',ink:null,colored:null,fallback:'css'},
  ...Object.fromEntries(Object.keys(dungeonEvents).map(id=>['event:'+id,{id:'event:'+id,contentId:id,kind:'event',ink:null,colored:null,fallback:'css'}])),
  'event:apple-anomaly':{id:'event:apple-anomaly',contentId:'apple-anomaly',kind:'event',src:'assets/images/interactive-objects/apple-anomaly.png',fallback:'css'},
  'event:vending-machine':{id:'event:vending-machine',contentId:'vending-machine',kind:'event',creator:'Mirpyems',src:'assets/images/interactive-objects/vending-machine.png',fallback:'css'},
  'event:comfortable-chair':{id:'event:comfortable-chair',contentId:'comfortable-chair',kind:'event',creator:'Mirpkered',src:'assets/images/interactive-objects/comfortable-chair.png',fallback:'css'},
  'event:the-duck':{id:'event:the-duck',contentId:'the-duck',kind:'event',creator:'Mirpyems',version:2,src:'assets/images/interactive-objects/the-duck-v2.png',fallback:'css'},
  'event:wishing-well':{id:'event:wishing-well',contentId:'wishing-well',kind:'event',creator:'Mirpyems',src:'assets/images/interactive-objects/wishing-well.png',fallback:'css'},
  'event:snack-stand':{id:'event:snack-stand',contentId:'snack-stand',kind:'event',creator:'Mirpyems',src:'assets/images/interactive-objects/snack-table.png',fallback:'css'}
});
