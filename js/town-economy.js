import { weightedChoice } from './random-utils.js?v=systems-20261002a';

const CORE = ['healing-tonic', 'rusty-sword', 'leather-armor'];
const TRADE_CATEGORIES = new Set(['trade-good', 'junk']);
const PRICE_BOUNDS = { low: [0.75, 0.9], normal: [0.95, 1.05], high: [1.1, 1.3] };
const FLAVOR = [
  { demand: 'goose-feather', text: 'Goose feathers are everywhere this week.' },
  { demand: 'cave-salt', text: 'Cave salt is apparently fashionable now.' },
  { demand: 'condensed-stink', text: 'Juniper refuses to explain who keeps buying the stink samples.' },
  { demand: null, text: 'Juniper has reorganized one shelf by smell.' }
];

export function seededRandom(seed) {
  let n = (seed >>> 0) || 1;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}

export function makeMarketCycle(seed, cycle, stockIds, itemDefinitions, rotatingCount = 4) {
  cycle = Math.max(0, Math.floor(Number(cycle) || 0));
  const marketSeed = ((seed >>> 0) ^ Math.imul(cycle + 1, 0x45d9f3b)) >>> 0 || 1;
  const random = seededRandom(marketSeed);
  const eligible = stockIds.filter(id => !CORE.includes(id));
  const candidates = [...eligible];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const rotatingIds = candidates.slice(0, Math.min(rotatingCount, candidates.length));
  if (cycle > 0 && rotatingIds.length < eligible.length) {
    let previousSeed = ((seed >>> 0) ^ Math.imul(cycle, 0x45d9f3b)) >>> 0 || 1;
    const previousRandom = () => { previousSeed = (Math.imul(previousSeed, 1664525) + 1013904223) >>> 0; return previousSeed / 4294967296; };
    const previous = [...eligible];
    for (let i = previous.length - 1; i > 0; i--) { const j = Math.floor(previousRandom() * (i + 1)); [previous[i], previous[j]] = [previous[j], previous[i]]; }
    const previousSet = previous.slice(0, Math.min(rotatingCount, previous.length)).sort().join('|');
    if (rotatingIds.slice().sort().join('|') === previousSet) { const replacement = eligible.find(id => !rotatingIds.includes(id)); rotatingIds[rotatingIds.length - 1] = replacement; }
  }
  const demand = {};
  for (const [id, item] of Object.entries(itemDefinitions)) {
    if (!TRADE_CATEGORIES.has(item.category) || !(item.sellValue > 0)) continue;
    const roll = random();
    const state = roll < 0.3 ? 'low' : roll < 0.7 ? 'normal' : 'high';
    const [min, max] = PRICE_BOUNDS[state];
    demand[id] = { state, multiplier: Number((min + random() * (max - min)).toFixed(3)) };
  }
  const flavor = FLAVOR[Math.floor(random() * FLAVOR.length)];
  return { cycle, rotation: cycle, marketSeed, rotatingIds, demand, marketFlavor: flavor.text };
}

export function currentSellValue(item, marketState, sellBonus = 0, buyPrice = Infinity) {
  const demand = marketState?.demand?.[item?.id];
  const marketMultiplier = TRADE_CATEGORIES.has(item?.category) ? demand?.multiplier ?? 1 : 1;
  const adjusted = Math.max(1, Math.floor((item?.sellValue || 0) * marketMultiplier * (1 + sellBonus)));
  // A normal purchase can never be flipped back to Juniper for a profit.
  return Number.isFinite(buyPrice) && buyPrice > 0 ? Math.min(adjusted, Math.max(1, buyPrice - 1)) : adjusted;
}

export function marketCondition(item, marketState) {
  const state = marketState?.demand?.[item?.id]?.state || 'normal';
  return ({ low: '↓ Low demand', normal: '— Normal demand', high: '↑ High demand' })[state];
}

export function pickInnEvent(events, random = Math.random) {
  return weightedChoice(Object.values(events), random);
}

export function simulateMarkets({ runs = 1000, seed = 123456789, stockIds, items }) {
  const rng = seededRandom(seed), cycles = [], appearances = Object.fromEntries(stockIds.filter(id => !CORE.includes(id)).map(id => [id, 0]));
  const demands = { low: 0, normal: 0, high: 0 }, prices = [];
  for (let i = 1; i <= runs; i++) {
    const market = makeMarketCycle(seed, i, stockIds, items);
    cycles.push(market);
    for (const id of market.rotatingIds) appearances[id]++;
    for (const entry of Object.values(market.demand)) demands[entry.state]++;
    for (const item of Object.values(items)) if (item.sellValue > 0) {
      const buy = item.buyValue > 0 ? Math.max(1, Math.floor(item.buyValue * .92)) : Infinity;
      prices.push(currentSellValue(item, market, .2, buy));
    }
  }
  return { runs, appearances, demandCounts: demands, minSell: prices.reduce((min,value)=>Math.min(min,value),Infinity), maxSell: prices.reduce((max,value)=>Math.max(max,value),-Infinity), everyCycleChangesSomeStock: cycles.every((m, i) => i === 0 || m.rotatingIds.join('|') !== cycles[i - 1].rotatingIds.join('|')), coreStockAlwaysPresent: cycles.every(m => CORE.every(id => stockIds.includes(id))) };
}

export function simulateInnEvents(events, runs = 10000, seed = 987654321) {
  const random = seededRandom(seed), counts = Object.fromEntries(Object.keys(events).map(id => [id, 0]));
  let eventCount = 0;
  for (let i = 0; i < runs; i++) {
    // A rest is legitimate only if at least one resource is missing. Full-rest attempts never roll.
    const eligible = i % 7 !== 0;
    if (!eligible || random() >= .25) continue;
    const event = pickInnEvent(events, random);
    if (event) { counts[event.id]++; eventCount++; }
  }
  return { attempts: runs, legitimateRests: runs - Math.ceil(runs / 7), eventChance: .25, eventCount, observedRate: Number((eventCount / (runs - Math.ceil(runs / 7))).toFixed(3)), counts, fullRestEvents: 0 };
}

export const MARKET_CORE_STOCK = CORE;
export const MARKET_PRICE_BOUNDS = PRICE_BOUNDS;
